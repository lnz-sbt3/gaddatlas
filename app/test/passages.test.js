import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

// D-073: il pannello del testo legge l'etichetta del testimone dai brani
// (skos:prefLabel), non l'id; ogni brano pubblicato e' del testimone di riferimento.
const dir = new URL("../public/data/passages/", import.meta.url);

test("ogni brano porta l'etichetta del testimone di riferimento", () => {
  for (const f of readdirSync(dir).filter(n => /^ch\d+\.json$/.test(n))) {
    const { passages } = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    for (const p of Object.values(passages)) {
      assert.equal(p.witnessLabel, "QP (Adelphi 2018)", `${f} ${p.id}`);
    }
  }
});
