import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bandRow } from "../src/render/role-bands.js";
import s4Config from "../src/model/config.js";

// Determinazione sulle terrazze (Continuità): la classe è della riga del personaggio, mai del luogo.
const gaddaReal = JSON.parse(readFileSync(new URL("../public/data/gaddatlas.geojson", import.meta.url), "utf8"));
const sequence = [
  {pos: 0, agentId: "a", tileIndex: 0, interpretationId: "one", determination: "Relative"},
  {pos: 1, agentId: "a", tileIndex: 0, interpretationId: "two", determination: null},
  {pos: 2, agentId: "b", tileIndex: 1, interpretationId: "three", determination: "Precise"}
];
const data = {NB: 2, bandPosChrono: new Int32Array([0, 1, 2, -1]), bandPosGrouped: new Int32Array([1, 0, -1, -1])};

test("la terrazza segue la propria riga nei due ordinamenti, anche senza classe", () => {
  assert.equal(bandRow(data, sequence, "a", false, 0, 1), sequence[0]);
  assert.equal(bandRow(data, sequence, "a", true, 0, 1), sequence[1]);
  assert.equal(bandRow(data, sequence, "a", false, 0, 2).determination, null);
});

test("tutti, bande aggregate e righe di altro personaggio, tessera o posizione non danno una classe", () => {
  assert.equal(bandRow(data, sequence, null, false, 0, 1), null);
  assert.equal(bandRow(null, sequence, "a", false, 0, 1), null);
  assert.equal(bandRow(data, sequence, "a", false, 1, 2), null);
  assert.equal(bandRow(data, sequence, "b", false, 0, 1), null);
  assert.equal(bandRow(data, sequence, "a", false, 1, 1), null);
  const shifted = [{...sequence[0], pos: 5}, sequence[1], sequence[2]];
  assert.equal(bandRow(data, shifted, "a", false, 0, 1), null);
});

test("i token sono quelli del prototipo Continuità, in px CSS", () => {
  const {width, dash} = s4Config.DETERMINATION;
  assert.equal(width, 1.05);
  assert.deepEqual(dash, {Precise: [], Relative: [6, 2], Approximate: [5, 2, 0.15, 2], Indeterminate: [0.15, 2.5]});
  assert.equal(s4Config.DETERMINATION.mode, "continuita");
});

test("i dati pubblici usano solo le quattro classi o il dato mancante", () => {
  const classes = new Set(Object.keys(s4Config.DETERMINATION.dash));
  for (const row of gaddaReal.relief) assert.ok(row.determination == null || classes.has(row.determination), row.interpretationId);
  assert.ok(gaddaReal.relief.some(row => row.determination == null), "il dato mancante esiste e resta tale");
});
