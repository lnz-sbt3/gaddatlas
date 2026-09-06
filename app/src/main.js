// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

import buildModel from "./model/index.js";
import chartS4 from "./atlas.js";

let atlas;
if (import.meta.hot) import.meta.hot.dispose(() => atlas?.dispose());
window.addEventListener("pagehide", () => atlas?.dispose(), {once: true});

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

    atlas = chartS4(model, roma);
    root.replaceChildren(atlas);
  } catch (err) {
    root.innerHTML = `<p style="padding:3rem;color:var(--hue-ref)">
      Impossibile caricare i dati: ${err.message}</p>`;
    throw err;
  }
}

boot();
