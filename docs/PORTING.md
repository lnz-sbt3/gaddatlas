# Inventario dei moduli da portare

Ricavato da `chartD.js` con analisi statica: 34 moduli, nessun riferimento non
dichiarato, **nessun ciclo** — il grafo delle dipendenze è un DAG.

## Destinazione proposta

| # | modulo | file | note |
|---|---|---|---|
| 1 | `projection` | `src/model/projection.js` | `d3.geoMercator` condivisa |
| 2 | `s4Config` | `src/model/config.js` | costanti; la palette va in `tokens.css` |
| 3 | `s4Entities` | `src/model/entities.js` | fusione alias, indice unificato |
| 4 | `s4Satellites` | `src/model/satellites.js` | ⚠ usa 6 e 7, dichiarati dopo |
| 5 | `s4Projection` | `src/model/projection-fit.js` | bbox, azimut, rango radiale |
| 6 | `s4Voronoi` | `src/model/voronoi.js` | Delaunay, celle, raggi cognitivi |
| 7 | `s4Chapters` | `src/model/chapters.js` | `bandsFor`, `birthChapter` |
| 8 | `s4Terrain` | `src/model/terrain.js` | piano cumulativo per focalizzatore |
| 9 | `s4Sequence` | `src/model/sequence.js` | indice sequenziale per pagina |
| 10 | `s4NarrativeGeometry` | `src/model/narrative-geometry.js` | tessere a incastro |
| 11 | `s4RadialLayout` | `src/model/radial-layout.js` | bande equipopolate |
| 12 | `s4NarrativeCells` | `src/model/narrative-cells.js` | anelli, ghost slots |
| 13 | `s4RayCellDistance` | `src/model/ray-cell-distance.js` | helper geometrico |
| 14 | `s4IsoEngine` | `src/render/iso-engine.js` | isoipse |
| 15 | `s4Painters` | `src/render/painters.js` | primitive di disegno |
| 16 | `s4Interaction` | `src/interaction/hit-test.js` | hit test piano e assonometrico |
| 17 | `s4AttestedRoutes` | `src/model/attested-routes.js` | |
| 18 | `s4RouteNodes` | `src/model/route-nodes.js` | |
| 19 | `s4PageRibbon` | `src/render/page-ribbon.js` | |
| 20 | `s4RoleBands` | `src/render/role-bands.js` | |
| 21 | `s4ChartShell` | `src/ui/shell.js` | costruisce i controlli con `htl` |
| 22 | `s4ChartHandlers` | `src/ui/handlers.js` | wiring degli eventi |
| 23 | `s4RouteHoverDrawing` | `src/render/route-hover.js` | |
| 24 | `s4HoverOverlay` | `src/render/hover-overlay.js` | |
| 25 | `s4ProfileLog` | `src/dev/profile-log.js` | espone un metodo *chiamato* `chartS4` |
| 26 | `s4LodPicking` | `src/render/lod.js` | |
| 27 | `s4ChartSupport` | `src/model/chart-support.js` | helper puri |
| 28 | `s4ChartOverlays` | `src/render/overlays.js` | |
| 29 | `s4ChartRouteSelection` | `src/interaction/route-selection.js` | qui si aggancia il pannello testuale |
| 30 | `s4ChartFrameUi` | `src/ui/frame-ui.js` | |
| 31 | `s4ChartMapBackdrop` | `src/render/map-backdrop.js` | disegna `roma.geojson` |
| 32 | `s4GhostSlotsOverlay` | `src/render/ghost-slots.js` | |
| 33 | `context2d` | `src/render/context2d.js` | |
| 34 | `chartS4` | `src/atlas.js` | ⚠ ~1.100 righe: da spezzare **dopo** |

## Quattro moduli non seguono il pattern

Trenta dei 34 sono `const s4X = (() => { … })()`. Questi quattro no, e vanno
guardati prima di portarli:

| # | modulo | forma reale |
|---|---|---|
| 1 | `projection` | `d3.geoMercator()` diretto, senza prefisso `s4` |
| 2 | `s4Config` | oggetto letterale, non IIFE |
| 13 | `s4RayCellDistance` | `function` con nome, non arrow-IIFE |
| 33 | `context2d` | arrow function **non** auto-invocata: è una factory |

`context2d` è il caso che confonde di più: non va invocato all'import, va
esportato come funzione e chiamato da chi crea il canvas.

## Due avvertenze

**`s4Satellites` (4) importa `s4Voronoi` (6) e `s4Chapters` (7).** L'ordine di
dichiarazione nel file appiattito non è topologico. Con gli `import` ES non è
un problema — il grafo si risolve da sé — ma non concatenare i moduli
assumendo l'ordine del file.

**`s4ProfileLog` e `s4ChartOverlays` sembrano formare un ciclo con `chartS4`.**
Non è così: `s4ProfileLog` esporta una funzione *chiamata* `chartS4` (il logger
di profiling della cella omonima) che `s4ChartOverlays` invoca. È un nome di
metodo, non un riferimento al modulo. Nessun ciclo reale.

## Ordine di lavoro

1. `config` → `entities` → `chapters` → `projection-fit` → `voronoi` →
   `satellites`: il nucleo dati. A questo punto si può già stampare in console
   `allData.length` e confrontarlo col notebook (300 feature, 933 righe relief).
2. `terrain` → `sequence` → geometria narrativa → layout radiale → celle.
3. `context2d` → `iso-engine` → `painters`: primo pixel a schermo.
4. `hit-test` → `shell` → `handlers`: interattività.
5. Il resto degli overlay.
6. `atlas.js` per ultimo, portato fedelmente e spezzato solo dopo.

Dopo ogni gruppo: confronto visivo con lo screenshot di riferimento. Il canvas
non ha test — è l'unica rete.
