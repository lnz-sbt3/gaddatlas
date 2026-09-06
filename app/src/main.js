// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

import s4Entities from "./model/entities.js";
import s4Chapters from "./model/chapters.js";
import s4Projection from "./model/projection-fit.js";
import s4Voronoi from "./model/voronoi.js";
import s4Satellites from "./model/satellites.js";

const BASE = import.meta.env.BASE_URL;

async function loadJSON(path) {
  const res = await fetch(`${BASE}data/${path}`);
  if (!res.ok) throw new Error(`${path}: ${res.status} ${res.statusText}`);
  return res.json();
}

async function boot() {
  const root = document.getElementById("app");
  try {
    const [gaddaReal, roma] = await Promise.all([
      loadJSON("gaddatlas.geojson"),
      loadJSON("roma.geojson"),
    ]);

    // Nucleo dati: entities -> projection-fit -> voronoi -> chapters -> satellites.
    // L'ordine di chiamata segue il DAG delle dipendenze, non l'ordine del
    // notebook (s4Satellites vi appare prima di s4Voronoi e s4Chapters).
    const entities = s4Entities(gaddaReal);
    const chapters = s4Chapters(gaddaReal, entities);
    const projectionFit = s4Projection(entities);
    const voronoi = s4Voronoi(projectionFit, entities);
    const satellites = s4Satellites(entities, chapters, voronoi);
    void satellites; // non ancora consumato: verifica solo che il modulo si componga

    // Valori di controllo per il confronto con il notebook Observable.
    console.log("allData.length", entities.allData.length);
    console.log("N_INMAP", entities.N_INMAP);
    console.log("N_GEO", entities.N_GEO);
    console.log(
      "celle Voronoi non degeneri",
      voronoi.cellRings.filter(cr => cr != null).length
    );
    console.log("birthChapter (primi 5)", chapters.birthChapter.slice(0, 5));

    // Sostituisce `display(chartS4)` del notebook.
    // TODO fase 1: const atlas = createAtlas({ gaddaReal, roma });
    root.innerHTML = "";
    root.append(
      Object.assign(document.createElement("pre"), {
        style: "padding:2rem;font:13px ui-monospace,monospace",
        textContent:
          `GaddAtlas — impalcatura\n\n` +
          `feature       ${gaddaReal.features.length}\n` +
          `righe relief  ${gaddaReal.relief.length}\n` +
          `route         ${gaddaReal.paths.routes.length}\n` +
          `focalizzatori ${gaddaReal.paths.agents.length}\n` +
          `contorno Roma ${roma.features?.length ?? "?"} geometrie\n`,
      })
    );
  } catch (err) {
    root.innerHTML = `<p style="padding:3rem;color:var(--hue-ref)">
      Impossibile caricare i dati: ${err.message}</p>`;
    throw err;
  }
}

boot();
