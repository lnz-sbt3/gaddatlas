// Punto di ingresso. Il boot e' asincrono perche' i dati arrivano da fetch:
// in Observable il top-level await era implicito, qui va incapsulato.

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
