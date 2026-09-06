// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

import buildModel from "./model/index.js";
import { median, zoomIdentity } from "d3";
import context2d from "./render/context2d.js";
import s4Config from "./model/config.js";
import s4ChartShell from "./ui/shell.js";
import s4RouteHoverDrawing from "./render/route-hover.js";
import s4HoverOverlay from "./render/hover-overlay.js";
import s4ChartOverlays from "./render/overlays.js";
import s4ChartRouteSelection from "./interaction/route-selection.js";
import s4ChartMapBackdrop from "./render/map-backdrop.js";
import s4GhostSlotsOverlay from "./render/ghost-slots.js";

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
      function geometriesOf(value) {
        if (!value) return [];
        if (value.type === "FeatureCollection") return value.features.flatMap(geometriesOf);
        if (value.type === "Feature") return geometriesOf(value.geometry);
        if (value.type === "GeometryCollection") return value.geometries.flatMap(geometriesOf);
        return [value];
      }
      function vertexCount(coordinates) {
        if (!coordinates?.length) return 0;
        if (typeof coordinates[0] === "number") return 1;
        return coordinates.reduce((sum, part) => sum + vertexCount(part), 0);
      }
      const romaGeometries = geometriesOf(roma);
      console.log("geometrie roma.geojson", romaGeometries.length);
      // Conteggio delle posizioni memorizzate, incluse le chiusure degli anelli.
      console.log("vertici totali roma.geojson", romaGeometries.reduce((sum, geometry) => sum + vertexCount(geometry.coordinates), 0));
      for (const [name, module] of Object.entries({
        s4RouteHoverDrawing, s4HoverOverlay, s4ChartOverlays,
        s4ChartRouteSelection, s4ChartMapBackdrop, s4GhostSlotsOverlay,
      })) {
        console.log(`${name}: chiavi`, Object.keys(module).join(", "));
      }
      // MapBackdrop richiede lo stato di chartS4 e non legge roma:
      // il contorno amministrativo vive ancora in chartS4 (notebook, riga 5072).

      const { attestedRoutes } = model.s4AttestedRoutes;
      let segments = 0, nodes = 0;
      // Una percorrenza appartiene a un solo focalizzatore (E5).
      // I nodi sono distinti entro ogni coppia route/focalizzatore.
      for (const route of attestedRoutes) {
        for (const [focalizer, steps] of route.stepsByFocalizer) {
          segments += Math.max(0, steps.length - 1);
          const state = model.s4RouteNodes.frameState({
            selectedRouteId: route.id, focalizer, seqMode: true,
            seqPos: model.s4Sequence.sequence.length,
          });
          nodes += state.hot.size;
        }
      }
      console.log("route attestate", attestedRoutes.length);
      console.log("segmenti totali per focalizzatore", segments);
      console.log("nodi di percorso per route/focalizzatore", nodes);
      const frame = { crimpEased: 0, transform: zoomIdentity };
      const host = model.s4Interaction.findDisplayHost(frame, ...model.s4Projection.pts[100]);
      console.log("findDisplayHost (generatore 100)", host);
      console.assert(host === 100, "Corrispondenza generatore/cella non preservata", host);

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
      const shell = s4ChartShell.create({
        canvas: context.canvas, width, nChapters: s4Config.N_CHAPTERS,
        inkColor: palette.getPropertyValue("--ink").trim(),
        bgColor: palette.getPropertyValue("--bg").trim(),
        terrainAgents: model.s4Terrain.agents,
        sequenceLength: model.s4Sequence.sequence.length,
        roleOrder: s4Config.ROLE_ORDER, roleColors: s4Config.ROLE_COLORS,
        rolePluralColor: s4Config.ROLE_PLURAL_COLOR,
      });
      // La shell incorpora il canvas e dispone i controlli sotto di esso.
      // Mostriamo la legenda nel banco anche senza lo stato di chartS4.
      shell.legendRow.style.display = "flex";
      shell.roleLegend.style.display = "inline-flex";
      root.replaceChildren(shell.wrap);
      console.log("opzioni focalizerSelect", shell.focalizerSelect.options.length);
      console.log("pulsanti data-role in roleLegend", shell.roleLegend.querySelectorAll("button[data-role]").length);
    }

  } catch (err) {
    root.innerHTML = `<p style="padding:3rem;color:var(--hue-ref)">
      Impossibile caricare i dati: ${err.message}</p>`;
    throw err;
  }
}

boot();
