import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isDrawnRoute } from "../src/model/attested-routes.js";

// D-060: la carta disegna come linee solo i percorsi compiuti.
const gaddaReal = JSON.parse(
  readFileSync(new URL("../public/data/gaddatlas.geojson", import.meta.url), "utf8")
);

test("ogni percorso pubblicato ha un tipo", () => {
  for (const r of gaddaReal.paths.routes) assert.ok(r.routeType, r.id);
});

test("solo i percorsi compiuti sono linee", () => {
  const drawn = gaddaReal.paths.routes.filter(isDrawnRoute);
  assert.ok(drawn.length > 0);
  assert.ok(drawn.every(r => r.routeType === "CompletedRoute"));
  const dream = gaddaReal.paths.routes.find(r => r.id === "tragitto_sogno_casal_bruciato_campo_morto");
  assert.equal(isDrawnRoute(dream), false);
});
