import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import s4Entities from "../src/model/entities.js";

// T-87, D-040: uno statuto di realtà senza glifo deve fermare il caricamento,
// non finire in silenzio sul glifo «invented» come nel notebook.
const gaddaReal = JSON.parse(
  readFileSync(new URL("../public/data/gaddatlas.geojson", import.meta.url), "utf8")
);

test("i dati pubblicati hanno solo statuti con un glifo", () => {
  assert.doesNotThrow(() => s4Entities(gaddaReal));
});

test("uno statuto sconosciuto produce un errore esplicito", () => {
  const data = structuredClone(gaddaReal);
  const fict = data.features.find(f => !f.geometry);
  fict.properties.reality_status = "sconosciuto";
  assert.throws(() => s4Entities(data), /statuto di realtà senza glifo/);
});
