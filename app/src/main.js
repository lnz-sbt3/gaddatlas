// Punto di ingresso: il boot e' asincrono perche' i dati arrivano da fetch.

import projection from "./model/projection.js";
import buildModel from "./model/index.js";
import createAtlas from "./atlas.js";
import it from "./strings-it.js";
import createTextPanel from "./ui/text-panel.js";
import createPlaceIndex from "./ui/place-index.js";
import createGuidedPath from "./ui/guided-path.js";
import createFrattura from "./ui/frattura.js";
import createLegend from "./ui/legend.js";
import createContextLegend from "./ui/legend-context.js";
import createFrame from "./ui/frame.js";
import createHistoricalUi from "./ui/historical-ui.js";
import { html } from "htl";
import atlasConfig from "./model/config.js";
import { createUrlStateCodec } from "./ui/url-state.js";

let atlas;
let textPanel;
let placeIndex, guidedPath, legend, frame, notes, historicalUi;
let historical;
let removeHistoryListeners = () => {};
function dispose() { removeHistoryListeners(); atlas?.dispose(); historical?.dispose(); textPanel?.dispose(); placeIndex?.dispose(); guidedPath?.dispose(); historicalUi?.dispose(); legend?.dispose(); notes?.dispose(); frame?.dispose(); }
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
    if(import.meta.env.DEV){
      // Varianti di sviluppo della determinazione (tensione, appoggi): solo con ?lab=, mai nel build.
      if(['tensione','appoggi'].includes(atlasConfig.DETERMINATION.mode))atlasConfig.DETERMINATION.devPaint=(await import('./dev/determinazione/contours.js')).paintContour;
    }
    // Carte storiche: in sviluppo dalla cartella locale, nella build da carte-storiche/ se il manifest c'è.
    const {default:manifest}=await import('virtual:historical-manifest');
    if(manifest){const {createHistoricalMap}=await import('./render/historical-map.js');
      historical=createHistoricalMap({manifest,projection,cellRings:model.atlasVoronoi.cellRings,config:atlasConfig,onChange:()=>atlas?.invalidateHistorical()});}

    const codec = createUrlStateCodec(model, atlasConfig);
    let restoring = true;
    let previous = codec.parse(location.hash);
    // Il passo del percorso entra nell'indirizzo solo mentre il percorso guida la figura.
    const read = () => codec.normalize({...atlas.getUrlState(), ...textPanel.getSelection(), tour: guidedPath?.step ?? null});
    function locationState() {
      const state = codec.parse(location.hash);
      const saved = history.state?.gaddatlas;
      if (state.view === "map" && saved?.hash === location.hash &&
          !new URLSearchParams(location.hash.slice(1)).has("narrative")) state.narrative = saved.narrative === 1 ? 1 : 0;
      return state;
    }
    function writeHistory(method, state, hash) {
      history[method]({...history.state, gaddatlas: {hash, narrative: state.narrative}}, "", location.pathname + location.search + hash);
    }
    function publish(source) {
      if (restoring || !atlas) return;
      const next = read();
      atlas.setActivePlace(next.place == null ? null : model.atlasEntities.allDataById.get(next.place));
      if (!guidedPath?.holding) { legend?.update(next); notes?.update(next); }
      guidedPath?.sync?.(next);
      if (atlas.getUrlState().route !== next.route) atlas.clearUrlRoute();
      const hash = codec.serialize(next);
      if (hash === codec.serialize(previous)) {
        if (next.narrative !== previous.narrative) writeHistory("replaceState", next, hash);
        previous = next;
        return;
      }
      const pushKeys = ["view", "axon", "narrative", "focalizer", "mode", "tour"];
      const replaceSelection = ["cursor", "roles", "order", "rotation"].includes(source);
      const push = pushKeys.some(k => next[k] !== previous[k]) || (source !== "cursor" && next.chapter !== previous.chapter) ||
        (!replaceSelection && ["place", "reference", "route"].some(k => next[k] !== previous[k]));
      writeHistory(push ? "pushState" : "replaceState", next, hash);
      previous = next;
    }
    textPanel = createTextPanel({
      relief: gaddaReal.relief, entities: model.atlasEntities,
      agents: gaddaReal.paths.agents, aliasGroups: atlasConfig.ALIAS_GROUPS, loadJSON,
      onClose: () => publish("selection"), onSelect: () => publish("selection"),
      onLocate: () => atlas?.focusActive(),
    });
    atlas = createAtlas(model, roma, { historical, onTileSelect: (tile,reference,options={}) => textPanel.show(tile,reference,{focusReturn:options.focusReturn||atlas?.querySelector("canvas")}), onStateChange: publish });
    function restore(immediate) {
      restoring = true;
      const state = locationState();
      atlas.applyUrlState(state, {immediate});
      const tile = state.place == null ? null : model.atlasEntities.allDataById.get(state.place);
      if (tile == null) textPanel.close();
      else void textPanel.show(tile, state.reference,{focusReturn:atlas.querySelector("canvas")});
      previous = read();
      atlas.setActivePlace(previous.place == null ? null : model.atlasEntities.allDataById.get(previous.place));
      legend?.update(previous); notes?.update(previous);
      writeHistory("replaceState", previous, codec.serialize(previous));
      restoring = false;
      // Un indirizzo con il passo riapre il percorso a quel passo; senza, un percorso in corso si chiude.
      if (state.tour && guidedPath?.open && guidedPath.step !== state.tour) guidedPath.open(state.tour - 1);
      else if (!state.tour && guidedPath?.step) guidedPath.stop();
    }
    const onHistory = () => {
      if (location.hash !== codec.serialize(previous) || locationState().narrative !== previous.narrative) restore(false);
    };
    window.addEventListener("popstate", onHistory);
    window.addEventListener("hashchange", onHistory);
    removeHistoryListeners = () => {
      window.removeEventListener("popstate", onHistory);
      window.removeEventListener("hashchange", onHistory);
      if (import.meta.env.DEV) delete window.__GADDATLAS_TEST__;
    };
    placeIndex=createPlaceIndex({entities:model.atlasEntities,relief:gaddaReal.relief,aliasGroups:atlasConfig.ALIAS_GROUPS,
      onSelect:async(tile,reference,options)=>{await atlas.selectReading(tile,reference,options);if(!reference)textPanel.element.querySelector('button').focus();}});
    root.replaceChildren(html`<div class="atlas-layout"><div class="atlas-view">${placeIndex.trigger}${atlas}</div>${textPanel.element}</div>${placeIndex.dialog}`);
    // Frattura: percorso guidato facoltativo, sullo stesso motore e con gli stessi stati citabili.
    const canvas = atlas.querySelector("canvas");
    const tour = {container: canvas.parentElement, stepMs: atlasConfig.FRATTURA.stepMs, reducedMotion: matchMedia("(prefers-reduced-motion: reduce)"),
      go(step) {
        notes?.focus?.(step.id === "narrativi" ? "narrative" : "view");
        const current = atlas.getUrlState();
        atlas.applyUrlState({...current, ...step.state, chapter: 10, focalizer: step.keepFocalizer ? current.focalizer : (step.state.focalizer ?? null), mode: "chapter"});
        // Il passo apre il suo luogo, o chiude il pannello; ai passi che lasciano la figura al lettore il pannello resta.
        const tile = step.place == null ? null : model.atlasEntities.allDataById.get(step.place);
        if (tile != null) void textPanel.show(tile, step.reference ?? null, {focusReturn: canvas});
        else if (!step.keepFocalizer) textPanel.close();
        publish("tour");
      }};
    guidedPath = atlasConfig.FRATTURA.variant === "scatola" ? createGuidedPath(tour)
      : createFrattura({...tour, variant: atlasConfig.FRATTURA.variant, drive: atlasConfig.FRATTURA.drive, settleMs: atlasConfig.FRATTURA.settleMs, layout: root.querySelector(".atlas-layout"), passage: atlas.passage,
        onExit() { publish("tour"); }, onSuspend() { publish("tour"); },
        // La nota del margine mostra il contenuto del passo: statuti ai luoghi narrativi, la vista (bande o scala lineare) altrove.
        onMark(step) { notes?.focus?.(step.id === "narrativi" ? "narrative" : "view"); const s = codec.normalize({...read(), ...step.state}); legend?.update(s); notes?.update(s); }});
    frame = createFrame({container: canvas.parentElement, controls: atlas.querySelector(".atlas-controls"), orient: guidedPath.entry, index: placeIndex.trigger, canvas});
    historicalUi = createHistoricalUi({historical, variant: atlasConfig.HISTORICAL_UI.variant, lensCSS: atlasConfig.HISTORICAL_UI.lensCSS, container: canvas.parentElement,
      panel: frame.panel, orient: canvas.parentElement.querySelector(".frame-orient"), canvas});
    const legendVariant = atlasConfig.LEGEND.variant;
    legend = createLegend({container: canvas.parentElement, reliefBands: gaddaReal.meta.reliefBands, agents: gaddaReal.paths.agents, glyphPaths: atlasConfig.FICT_GLYPH_PATHS, variant: legendVariant});
    if (legendVariant !== "unica") notes = createContextLegend({container: canvas.parentElement, toggle: legend.toggle, variant: legendVariant, reliefBands: gaddaReal.meta.reliefBands,
      agents: gaddaReal.paths.agents, glyphPaths: atlasConfig.FICT_GLYPH_PATHS, roleOrder: atlasConfig.ROLE_ORDER, roleColors: atlasConfig.ROLE_COLORS,
      statusMode: atlasConfig.STATUS.mode, chroma: atlasConfig.CHROMA, densityColors: {reference: `rgb(${atlasConfig.HUE_RGB})`, narrative: `rgb(${atlasConfig.FICT_HUE_RGB})`},
      determination: atlasConfig.DETERMINATION.mode === "off" ? null : {...atlasConfig.DETERMINATION, edge: {top: atlasConfig.AXON_EDGE_TOP, bottom: atlasConfig.AXON_EDGE_BOT}}});
    // Una presa sulla figura sospende il percorso; al passo interattivo solo la Bussola lo sospende.
    for (const type of ["pointerdown", "wheel", "keydown"])
      atlas.addEventListener(type, event => { if (guidedPath.contains(event.target)) return; if (guidedPath.interactive && !event.target.closest?.(".sheet-pad")) return; guidedPath.interrupt(); }, {capture: true, passive: true});
    restore(true);
    if (import.meta.env.DEV) {
      window.__GADDATLAS_TEST__ = {
        get basemap() { return historical; },
        get config() { return atlasConfig; },
        get axes() { return atlas.motionDev; },
        get production() { return atlas.motionProduction; },
        get settled() { return atlas.isSettled() && !textPanel.busy; },
        get state() { return read(); },
        get motion() { return atlas.motionError(); },
        get errors() { return [...textPanel.element.querySelectorAll('[role="alert"]')].map(n => n.textContent); }
      };
    }
    if(import.meta.env.DEV&&location.pathname.endsWith('/__dev/moto/')){
      const {mountMotionLab}=await import('./dev/regie/panel.js');
      mountMotionLab({atlas,root});
    }
  } catch (err) {
    root.replaceChildren(html`<p class="boot boot-error" role="alert">${it.bootError}</p>`);
    if(import.meta.env.DEV)console.error(err);
  }
}

boot();
