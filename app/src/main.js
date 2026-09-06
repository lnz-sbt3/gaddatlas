// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

import buildModel from "./model/index.js";

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

    // Nucleo dati: un'unica chiamata, l'assemblatore risolve il DAG.
    const model = buildModel(gaddaReal);

    // Valori di controllo per il confronto con il notebook Observable.
    console.log("allData.length", model.s4Entities.allData.length);
    console.log("N_INMAP", model.s4Entities.N_INMAP);
    console.log("N_GEO", model.s4Entities.N_GEO);
    console.log(
      "celle Voronoi non degeneri",
      model.s4Voronoi.cellRings.filter(cr => cr != null).length
    );
    console.log("birthChapter (primi 5)", model.s4Chapters.birthChapter.slice(0, 5));
    console.log("s4Terrain.agents.length", model.s4Terrain.agents.length);
    console.log("s4Sequence.sequence.length", model.s4Sequence.sequence.length);
    console.log(
      "tessere narrative con anello proprio (s4NarrativeCells)",
      model.s4NarrativeCells.assignments.size
    );
    {
      // Le bande vuote sono gia' filtrate da assignDistanceBands: contiamo
      // quelle effettivamente popolate all'ultimo capitolo, referenziali soli.
      const lastChapter = model.s4RadialLayout.rankedRadialByChapter.length - 1;
      console.log(
        "bande prodotte da s4RadialLayout (ultimo capitolo)",
        model.s4RadialLayout.rankedRadialByChapter[lastChapter].rings.length
      );
    }

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
