import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import s4Entities from "../src/model/entities.js";
import s4Config from "../src/model/config.js";

// Uno statuto di realtà senza glifo deve fermare il caricamento,
// non ripiegare in silenzio sul glifo «invented».
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

// Imagined resta nel vocabolario senza istanze nel Pasticciaccio. Il suo
// glifo deve restare definito anche se nessun dato pubblicato lo usa, perche'
// i dati non lo verificano piu'. Imported non ha glifo: ha sempre una geometria.
test("i tre statuti senza geometria hanno un glifo, anche senza istanze", () => {
  for (const status of ["transformed", "invented", "imagined"]) {
    assert.ok(s4Config.FICT_GLYPH_PATHS[status], `glifo mancante per ${status}`);
  }
  const data = structuredClone(gaddaReal);
  const fict = data.features.find(f => !f.geometry);
  fict.properties.reality_status = "imagined";
  assert.doesNotThrow(() => s4Entities(data));
});

// L'ordine delle tessere nell'app (disegno a pari profondita', hit test)
// e' deciso da un criterio esplicito, non dalla posizione nel file.
test("l'ordine di allData non dipende dall'ordine delle feature nel file", () => {
  const ids = data => s4Entities(data).allData.map(d => d.properties.GazetteerEntity_ID);
  const reference = ids(gaddaReal);
  const shuffled = structuredClone(gaddaReal);
  shuffled.features.reverse();
  assert.deepEqual(ids(shuffled), reference);
});
