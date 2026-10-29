import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import atlasEntities from "../src/model/entities.js";
import atlasChapters from "../src/model/chapters.js";
import atlasProjection from "../src/model/projection-fit.js";
import atlasVoronoi from "../src/model/voronoi.js";
import atlasSatellites from "../src/model/satellites.js";
import atlasNarrativeGeometry from "../src/model/narrative-geometry.js";
import atlasRadialLayout from "../src/model/radial-layout.js";
import atlasNarrativeCells from "../src/model/narrative-cells.js";

// La forma delle celle e del rilievo usa un indice di forma congelato
// (data/source/shape_index.json), non la posizione della tessera in allData.
const gaddaReal = JSON.parse(
  readFileSync(new URL("../public/data/gaddatlas.geojson", import.meta.url), "utf8")
);

test("ogni feature pubblicata ha un indice di forma intero e unico", () => {
  const ks = gaddaReal.features.map(f => f.properties.shapeIndex);
  assert.ok(ks.every(Number.isInteger));
  assert.equal(new Set(ks).size, ks.length);
});

test("un indice di forma mancante produce un errore esplicito", () => {
  const data = structuredClone(gaddaReal);
  delete data.features.find(f => !f.geometry).properties.shapeIndex;
  assert.throws(() => atlasEntities(data), /indice di forma mancante/);
});

test("un indice di forma ripetuto produce un errore esplicito", () => {
  const data = structuredClone(gaddaReal);
  const [a, b] = data.features.filter(f => !f.geometry);
  b.properties.shapeIndex = a.properties.shapeIndex;
  assert.throws(() => atlasEntities(data), /indice di forma .* ripetuto/);
});

function cellsById(data) {
  const e = atlasEntities(data), c = atlasChapters(data, e), p = atlasProjection(e), v = atlasVoronoi(p, e);
  const s = atlasSatellites(e, c, v), ng = atlasNarrativeGeometry(e, v, s, c);
  const rl = atlasRadialLayout(e, p, v, c, s, ng), nc = atlasNarrativeCells(e, v, p, rl, s, ng);
  const out = new Map();
  for (const [i, rec] of nc.assignments) out.set(e.allData[i].properties.GazetteerEntity_ID, rec.polygon);
  return out;
}

// L'ordine del file sposta solo l'arrotondamento delle somme (scarti ~1e-10,
// preesistenti all'indice di forma): il confronto e' a meno di 1e-6.
test("la forma delle celle non dipende dall'ordine delle feature nel file", () => {
  const reversed = structuredClone(gaddaReal);
  reversed.features.reverse();
  const a = cellsById(gaddaReal), b = cellsById(reversed);
  assert.deepEqual([...b.keys()].sort(), [...a.keys()].sort());
  for (const [id, poly] of a) {
    const other = b.get(id);
    assert.equal(other.length, poly.length, id);
    poly.forEach(([x, y], k) => {
      assert.ok(Math.abs(x - other[k][0]) < 1e-6 && Math.abs(y - other[k][1]) < 1e-6, id);
    });
  }
});
