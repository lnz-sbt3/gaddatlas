// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

import buildModel from "./model/index.js";
import chartS4 from "./atlas.js";
import createTextPanel from "./ui/text-panel.js";
import { html } from "htl";
import s4Config from "./model/config.js";

let atlas;
let textPanel;
function dispose() { atlas?.dispose(); textPanel?.dispose(); }
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener("pagehide", dispose, {once: true});

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

    textPanel = createTextPanel({
      relief: gaddaReal.relief, entities: model.s4Entities,
      agents: gaddaReal.paths.agents, aliasGroups: s4Config.ALIAS_GROUPS, loadJSON,
    });
    atlas = chartS4(model, roma, { onTileSelect: textPanel.show });
    root.replaceChildren(html`<div class="atlas-layout"><div class="atlas-view">${atlas}</div>${textPanel.element}</div>`);
  } catch (err) {
    root.innerHTML = `<p style="padding:3rem;color:var(--hue-ref)">
      Impossibile caricare i dati: ${err.message}</p>`;
    throw err;
  }
}

boot();
