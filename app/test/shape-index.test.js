import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import s4Entities from "../src/model/entities.js";
import s4Chapters from "../src/model/chapters.js";
import s4Projection from "../src/model/projection-fit.js";
import s4Voronoi from "../src/model/voronoi.js";
import s4Satellites from "../src/model/satellites.js";
import s4NarrativeGeometry from "../src/model/narrative-geometry.js";
import s4RadialLayout from "../src/model/radial-layout.js";
import s4NarrativeCells from "../src/model/narrative-cells.js";

// D-092: la forma delle celle e del rilievo usa un indice di forma congelato
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
  assert.throws(() => s4Entities(data), /indice di forma mancante/);
});

test("un indice di forma ripetuto produce un errore esplicito", () => {
  const data = structuredClone(gaddaReal);
  const [a, b] = data.features.filter(f => !f.geometry);
  b.properties.shapeIndex = a.properties.shapeIndex;
  assert.throws(() => s4Entities(data), /indice di forma .* ripetuto/);
});

function cellsById(data) {
  const e = s4Entities(data), c = s4Chapters(data, e), p = s4Projection(e), v = s4Voronoi(p, e);
  const s = s4Satellites(e, c, v), ng = s4NarrativeGeometry(e, v, s, c);
  const rl = s4RadialLayout(e, p, v, c, s, ng), nc = s4NarrativeCells(e, v, p, rl, s, ng);
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
