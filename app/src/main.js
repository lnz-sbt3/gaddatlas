// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

import buildModel from "./model/index.js";
import { median } from "d3";
import context2d from "./render/context2d.js";

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

    // BANCO DI PROVA — rimuovere quando arriva chartS4
    {
      const { cellRings } = model.s4Voronoi;
      const { bbox, width, height } = model.s4Projection;
      const { isoProfile, isoProfileMin, isoProfileMed } = model.s4IsoEngine;
      const rings = cellRings.filter(cr => cr != null);
      console.log("vertici totali cellRings", rings.reduce((sum, cr) => sum + cr.ring.length, 0));
      console.log("isoProfile.filter(Boolean).length", isoProfile.filter(Boolean).length);
      console.log("isoProfileMin[0]", isoProfileMin[0]);
      console.log("isoProfileMed[0]", isoProfileMed[0]);
      console.log("mediana isoProfileMed (celle non nulle)", median(isoProfileMed.filter((_, i) => isoProfile[i] != null)));

      const context = context2d(width, height);
      const palette = getComputedStyle(document.documentElement);
      context.fillStyle = palette.getPropertyValue("--bg").trim();
      context.fillRect(0, 0, width, height);
      context.strokeStyle = palette.getPropertyValue("--ink").trim();
      context.translate(-bbox[0], -bbox[1]);
      for (const { ring } of rings) {
        context.beginPath();
        ring.forEach(([x, y], i) => i === 0 ? context.moveTo(x, y) : context.lineTo(x, y));
        context.closePath();
        context.stroke();
      }
      root.replaceChildren(context.canvas);
    }

  } catch (err) {
    root.innerHTML = `<p style="padding:3rem;color:var(--hue-ref)">
      Impossibile caricare i dati: ${err.message}</p>`;
    throw err;
  }
}

boot();
