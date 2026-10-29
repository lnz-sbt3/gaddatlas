import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import buildModel from "../src/model/index.js";
import config from "../src/model/config.js";
import {createUrlStateCodec} from "../src/ui/url-state.js";
const data = JSON.parse(fs.readFileSync(new URL("../public/data/gaddatlas.geojson", import.meta.url)));
const model = buildModel(data), codec = createUrlStateCodec(model, config), rows = model.s4Sequence.sequence;

test("identificatori pubblici da IRI e cursori univoci", () => {
  const slim = JSON.parse(fs.readFileSync(new URL("../../data/dist/atlas.slim.json", import.meta.url)));
  const ids = key => new Map(slim[key].map(r => { assert.equal(r.id, r.iri.split("/").at(-1)); return [r.id, r]; }));
  const cursors = ids("interpretations"), refs = ids("references");
  const places = new Map([...ids("gazetteer"), ...ids("narrativePlaces")]), routes = ids("routes");
  assert.equal(new Set(rows.map(r => r.interpretationId)).size, rows.length);
  for (const r of rows) { assert.ok(cursors.has(r.interpretationId)); assert.ok(refs.has(r.referenceId)); }
  for (const f of data.features) assert.ok(places.has(f.properties.GazetteerEntity_ID));
  for (const r of data.paths.routes) assert.ok(routes.has(r.id));
});
test("default omessi, ordine canonico e assi indipendenti", () => {
  assert.equal(codec.serialize(codec.parse("")), "");
  assert.deepEqual(codec.parse("#zoom=5&debug=1"), codec.parse(""));
  assert.equal(codec.serialize(codec.parse("#chapter=10&narrative=1&axon=1&view=diagram")), "#view=diagram&axon=1&narrative=1&chapter=10");
  assert.equal(codec.serialize(codec.parse("#narrative=1")), "");
});
test("round trip di viste e filtri", () => {
  for (const hash of ["", "#view=diagram", "#view=diagram&narrative=1", "#view=diagram&axon=1&narrative=1", "#axon=1", "#view=diagram&axon=1&focalizer=ingravallo&chapter=4&roles=Route,Setting&order=role&rotation=45"]) {
    const state = codec.parse(hash);
    assert.deepEqual(codec.parse(codec.serialize(state)), state);
  }
});
test("narrative accettato in mappa, omesso senza mutare lo stato interno", () => {
  const state = codec.parse("#axon=1&narrative=1&chapter=10");
  assert.equal(state.narrative, 1);
  assert.equal(codec.normalize(state).narrative, 1);
  const hash = codec.serialize(state);
  assert.equal(hash, "#axon=1&chapter=10");
  assert.equal(state.narrative, 1);
  assert.equal(codec.parse(hash).narrative, 0);
  assert.equal(codec.serialize(codec.parse(hash)), hash);
  assert.equal(codec.serialize({...state, view:"diagram"}), "#view=diagram&axon=1&narrative=1&chapter=10");
});
test("errore isolato al parametro, duplicati ed encoding malformato", () => {
  const s = codec.parse("#view=diagram&axon=bad&chapter=999&focalizer=nope&narrative=1&rotation=NaN&roles=bad");
  assert.equal(s.view,"diagram"); assert.equal(s.narrative,1); assert.equal(s.axon,0); assert.equal(s.chapter,1); assert.equal(s.focalizer,null);
  assert.deepEqual(s.roles,config.ROLE_ORDER);
  assert.equal(codec.parse("#view=diagram&chapter=4&chapter=6").chapter,1);
  assert.doesNotThrow(() => codec.parse("#view=diagram&place=%E0%A4%A"));
});
test("cursore prevale sul capitolo e default del track omesso", () => {
  const first = rows[0], s = codec.parse("#view=diagram&mode=page&chapter=10&cursor="+first.interpretationId);
  assert.equal(s.chapter,Number(first.chapter)); assert.equal(s.cursor,first.interpretationId);
  const last = rows.filter(r=>Number(r.chapter)===10 && r.agentId==="ingravallo").at(-1);
  const fallback = codec.parse("#view=diagram&mode=page&chapter=10&focalizer=ingravallo&cursor=missing");
  assert.equal(fallback.cursor,last.interpretationId);
  assert.ok(!codec.serialize(fallback).includes("cursor="));
  assert.deepEqual(codec.parse(codec.serialize(fallback)),fallback);
});
test("cursore estraneo al focalizzatore e capitolo senza righe", () => {
  const other = rows.find(r=>r.agentId!=="ingravallo");
  const s = codec.parse("#view=diagram&mode=page&chapter=10&focalizer=ingravallo&cursor="+other.interpretationId);
  assert.equal(s.chapter,10); assert.equal(rows.find(r=>r.interpretationId===s.cursor).agentId,"ingravallo");
  const agent=model.s4Terrain.agents.find(a=>a.id && a.total>=10 && !rows.some(r=>r.agentId===a.id && Number(r.chapter)===1));
  assert.equal(codec.normalize({view:"diagram",mode:"page",focalizer:agent.id}).mode,"chapter");
});
test("pagina in mappa, rotazione in pianta e ordine senza agente", () => {
  const s=codec.parse("#mode=page&rotation=90&order=role&chapter=4");
  assert.equal(s.mode,"chapter"); assert.equal(s.rotation,0); assert.equal(s.order,"time"); assert.equal(s.chapter,4);
  assert.equal(codec.parse("#axon=1&rotation=360").rotation,0);
});
test("maschera canonica non vuota, conservata senza focalizzatore", () => {
  assert.equal(codec.serialize(codec.parse("#roles=Route,Setting,Route")), "#roles=Setting%2CRoute");
  assert.deepEqual(codec.parse("#roles=").roles,config.ROLE_ORDER);
});
test("pannello indipendente dal capitolo e riferimento pertinente al luogo", () => {
  const r=rows.find(r=>Number(r.chapter)===10), place=model.s4Entities.allData[r.tileIndex].properties.GazetteerEntity_ID;
  const s=codec.normalize({place,reference:r.referenceId,chapter:1});
  assert.equal(s.place,place); assert.equal(s.reference,r.referenceId); assert.equal(s.chapter,1);
  assert.equal(codec.normalize({place,reference:"missing"}).reference,null);
  assert.equal(codec.normalize({reference:r.referenceId}).reference,null);
});
test("route e place coesistono, route incompatibile ignorata", () => {
  const route=model.s4AttestedRoutes.attestedRoutes.find(r=>r.stepsByFocalizer.has("ingravallo"));
  const place=model.s4Entities.allData[0].properties.GazetteerEntity_ID;
  const s=codec.normalize({route:route.id,place,focalizer:"ingravallo",chapter:10});
  assert.equal(s.route,route.id); assert.equal(s.place,place);
  assert.equal(codec.normalize({route:route.id,chapter:10}).route,null);
  assert.equal(codec.normalize({route:"missing",place,chapter:10}).place,place);
  assert.deepEqual(codec.parse(codec.serialize(s)),s);
});
test("passo del percorso: chiave aggiunta in coda, valori non validi ignorati", () => {
  assert.equal(codec.serialize(codec.parse("#view=diagram&chapter=10&tour=2")), "#view=diagram&chapter=10&tour=2");
  assert.equal(codec.parse("#chapter=10&tour=0").tour, null);
  assert.equal(codec.parse("#chapter=10&tour=abc").tour, null);
  assert.equal(codec.parse("#chapter=10").tour, null);
  const state = codec.parse("#view=diagram&axon=1&narrative=1&focalizer=ingravallo&chapter=10&place=gaz_via_merulana&reference=ref_00143&tour=6");
  assert.deepEqual(codec.parse(codec.serialize(state)), state);
});
