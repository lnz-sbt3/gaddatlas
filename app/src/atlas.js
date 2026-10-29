import it from "./strings-it.js";
import * as d3 from "d3";
import atlasConfig from "./model/config.js";
import projection from "./model/projection.js";
import context2d, {resizeContext2d} from "./render/context2d.js";
import observeCanvasLayout from "./ui/canvas-layout.js";
import atlasRoleBands, {readRoleSnapshot, bandRow} from "./render/role-bands.js";
import {evaluateFrame,contentAlphaOf} from "./motion/evaluate.js";
import {advanceLayout} from "./motion/advance.js";
import {prepareDirectionD,evaluateDirectionD,project as projectMotion} from "./motion/direction-d.js";
import {createAxisTransport,axesKey} from "./motion/transport.js";
import {attachMotionRendering,createIsolineTracer} from "./render/motion.js";
import atlasRouteSelection from "./interaction/route-selection.js";
import atlasPageRibbon from "./render/page-ribbon.js";
import atlasRouteHoverDrawing from "./render/route-hover.js";
import atlasMapBackdrop from "./render/map-backdrop.js";
import atlasGhostSlots from "./render/ghost-slots.js";
import atlasOverlays from "./render/overlays.js";
import atlasProfileLog from "./dev/profile-log.js";
import {createFondo} from "./render/fondo.js";
import atlasFrameUi from "./ui/frame-ui.js";
import atlasShell from "./ui/shell.js";
import {createPlaceRose} from "./ui/place-index.js";
import createSheetHandle from "./ui/sheet-handle.js";
import createSheetPad from "./ui/sheet-pad.js";
import atlasHandlers from "./ui/handlers.js";

export default function createAtlas(model, roma, { historical = null, onTileSelect = () => {}, onStateChange = () => {} } = {}) {
  const { atlasEntities, atlasProjection, atlasVoronoi, atlasNarrativeCells, atlasChapters, atlasSatellites, atlasTerrain, atlasRadialLayout, atlasIsoEngine, atlasSequence, atlasAttestedRoutes, atlasPainters, atlasInteraction, atlasSupport, atlasLodPicking, atlasRouteNodes } = model;
  const listeners = new AbortController();
  const {
    BG_COLOR, HUE_RGB, FICT_HUE_RGB, ISO_ALPHA, ISO_WIDTH, ISO_FILL, ISO_FILL_A0, ISO_FILL_A1, ISO_FILL_GAMMA, GRID_COLOR, GRID_ALPHA, SHOW_GHOST_SLOTS, PROFILE,
    FOCAL_DIM_ALPHA, FOCAL_DIM_MORPH, FOCAL_HIDE,
    SEQ_FOLLOW_FOCALIZER, SEQ_PLAY_MS, SEQ_ENABLED_IN_MAP, SEQ_MORPH_SCALE, CONSTELLATION_FLOOR, CONSTELLATION_DECAY,
    GAP_MIN, SEQ_BLOCK_DELTA,
    ROUTE_HOVER_MORPH,
    ROLE_SORT_MORPH,
    RING_GUIDE_ALPHA, RING_GUIDE_WIDTH, INK_COLOR,
    K2, ZOOM_MIN, ZOOM_MAX,
    ISO_INNER, ISO_OUTER, ISO_MIN_SPACING,
    SPRING, S_STIFF, S_DAMP, STRENGTH, RADIUS,
    DOT_RADIUS, BORDER_WIDTH, GLOW_WIDTH, GLOW_BLUR, ROMA_WIDTH, LABEL_SIZE,
    N_CHAPTERS, MORPH, PULSE_R, PLAY_MS,
    CRIMP_MORPH, BIRTH_MORPH, BIRTH_EPSILON,
    LAYOUT_MORPH_SLOW, LAYOUT_MORPH_FAST,
    FICT_CRIMP_THRESHOLD, FICT_RELIEF_ALPHA,
    DIAG_SCREEN_FRAC
  } = atlasConfig;
  const METRIC_ISOLINES_KM = atlasConfig.METRIC_ISOLINES_KM;
  const INFLUENCE_RADIUS = RADIUS * 3; // usato solo da nearDrop per il bbox-test dei segmenti condivisi;
                                        // deform si annulla gia' oltre RADIUS (falloff compatto)

  const { geoData, allData, allDataById, N_INMAP, N_GEO } = atlasEntities;
  const { pts, bbox, width, height, cogCenterInit, geographicAngle, poleDistanceKm, poleIndex } = atlasProjection;
  const { segments, cellRings: baseCellRings, normalizedCellScale: baseNormalizedCellScale, cognitiveTileRadius: baseCognitiveTileRadius, areaTarget } = atlasVoronoi;
  const { narrativeCellRings, narrativeTileRadius, ghostSlots } = atlasNarrativeCells;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);
  // 'area-tutte' e 'area-equa': le tessere narrative più grandi scendono a un multiplo dell'area comune (1 o
  // TILE_NARRATIVE_CAP), così nessuna pesa molto più delle altre.
  // Le narrative si riducono soltanto: la loro collocazione è calcolata sul raggio d'origine, quindi non possono crescere.
  const narrativeCap = {"area-tutte": 1, "area-equa": atlasConfig.TILE_NARRATIVE_CAP}[atlasConfig.TILE_SIZE];
  const narrativeScale = i => narrativeCap && areaTarget ? Math.min(1, Math.sqrt(narrativeCap * areaTarget / Math.max(1e-9, Math.abs(d3.polygonArea(narrativeCellRings[i].ring))))) : 1;
  const cognitiveTileRadius = baseCognitiveTileRadius.map((r, i) => narrativeCellRings[i] ? narrativeTileRadius[i] * narrativeScale(i) : r);
  const normalizedCellScale = baseNormalizedCellScale.map((s, i) => narrativeCellRings[i] ? narrativeScale(i) : s);
  // Raggio del cerchio inscritto attorno al generatore, in unità dell'anello: limite del glifo di statuto.
  const inscribedCache = new Map();
  function inscribedRadius(i) {
    if (inscribedCache.has(i)) return inscribedCache.get(i);
    const cr = cellRings[i];let min = Infinity;
    for (let j = 0; j < cr.ring.length; j++) {
      const a = cr.ring[j], b = cr.ring[(j + 1) % cr.ring.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey);
      if (l > 1e-9) min = Math.min(min, Math.abs(ex * (a[1] - cr.gy) - (a[0] - cr.gx) * ey) / l);
    }
    inscribedCache.set(i, min);return min;
  }
  const { birthChapter, isBorn, bandsFor, BANDS_MAX } = atlasChapters;
  const { primaryHostOf } = atlasSatellites;
  // Ricalco: la traccia geografica del luogo reale a cui la tessera narrativa è ancorata, in miniatura.
  // Il filo di cella resta uguale per tutti gli statuti: la differenza la fanno i segni di statuto.
  const cellOutline = () => 1;
  const cellWidth = () => 1;
  // La miniatura occupa circa metà della tessera, non scende sotto una misura leggibile e non si allunga in una
  // scheggia: l'asse lungo è limitato a ricalcoAspect volte quello corto.
  function hostTrace(i, cx, cy, radius) {
    const hr = baseCellRings[primaryHostOf[i]];
    if (!hr?.ring || hr.ring.length < 3) return null;
    const {ricalcoScale, ricalcoMinWorld, ricalcoAspect} = atlasConfig.STATUS;
    const xs = hr.ring.map(p => p[0] - hr.gx), ys = hr.ring.map(p => p[1] - hr.gy);
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), long = Math.max(w, h);
    const squeeze = long / Math.max(1e-9, Math.min(w, h)) > ricalcoAspect ? [w > h ? ricalcoAspect * h / w : 1, h > w ? ricalcoAspect * w / h : 1] : [1, 1];
    // Sotto la misura minima, in unità del modello, la traccia degenererebbe: si ripiega sul doppio contorno.
    if (radius * 2 * ricalcoScale < ricalcoMinWorld) return null;
    const size = radius * 2 * ricalcoScale, k = size / long;
    return hr.ring.map(([x, y]) => [cx + (x - hr.gx) * k * squeeze[0], cy + (y - hr.gy) * k * squeeze[1]]);
  }
  const { agents: terrainAgents, occAt } = atlasTerrain;
  const { rankedRadialByChapter, rankedRadialFullByChapter, extentBase } = atlasRadialLayout;
  const { isoProfile, isoProfileMin, isoProfileMed, traceIsoline: traceModelIsoline } = atlasIsoEngine;
  const traceRestingIsoline=createIsolineTracer(traceModelIsoline);
  const {
    sequence, sequenceByAgent, chapterOfCursor, occUpTo, birthPos, lastPosByChapter,
    roleStack, rolePosStack, roleLen, BANDS_CAP: SEQ_BANDS_CAP
  } = atlasSequence;
  const seqAllPositions = sequence.map(d => d.pos);
  const { routeRgb } = atlasAttestedRoutes;

  const context = context2d(width, height);
  const canvas = context.canvas;
  const painters = atlasPainters.makePainters(context);
  const interaction = atlasInteraction;
  let baseTransform = context.getTransform();
  let fitScale = 1;
  // Area visibile del canvas nelle coordinate del riquadro del modello; offset del riquadro in px CSS.
  // Grana di carta: rumore di valore con hash deterministico (nessun Math.random), una tessera di 256 px.
  let paperGrain = null;
  function makePaperGrain() {
    const n = 256, c = document.createElement("canvas"); c.width = c.height = n;
    const g = c.getContext("2d"), img = g.createImageData(n, n);
    const hash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 0.6 * hash(x, y) + 0.4 * hash(x >> 2, y >> 2), k = (y * n + x) * 4;
      img.data[k] = 60; img.data[k + 1] = 45; img.data[k + 2] = 30; img.data[k + 3] = Math.round(255 * v);
    }
    g.putImageData(img, 0, 0); return c;
  }
  let viewRect = {x0: 0, y0: 0, x1: width, y1: height}, frameOffset = {x: 0, y: 0}, cssSize = [width, height];
  function bandsOfTile(i) {
    return atlasSupport.bandsOfTile({i, occEased, focalizer, BANDS_MAX, bandsFor});
  }
  const geoPath = d3.geoPath(projection, context);

  let cogCenter = cogCenterInit.slice();
  let rotPivot = cogCenter.slice();

  function baseWorldPt(i) {
    return atlasSupport.baseWorldPt({i, N_GEO, pts, cogCenter});
  }

  let displayPts = allData.map((d, i) => i < pts.length ? pts[i].slice() : cogCenterInit.slice());
  let displayCellScale = cellRings.map(() => 1);
  let profileFrame = 0;
  let profileTickMs = 0, profileHitMs = 0;
  let lastHitState = null;
  let diagramScaleBaseK = 1;    // zoom congelato all'apertura: da li' in poi il diagramma puo' ingrandirsi
  let lastCogScaleDyn = 1;
  let mapTransformBeforeDiagram = null;
  let pendingRestoreMapCamera = false;

  // Stato dello zoom.
  let transform = d3.zoomIdentity; // camera utente: k=1 e pan=0 rispetto al fit
  let rotPivotSyncing = false;

  // stato della goccia (i parametri SPRING/S_STIFF/S_DAMP/STRENGTH/RADIUS sono in atlasConfig)
  const drop = { x:-1e4, y:-1e4, tx:-1e4, ty:-1e4, s:0, ts:0, vs:0 };

  let effRadius = RADIUS, effInfluence = INFLUENCE_RADIUS;

  function deform(px, py){
    if (tiltEased > 0.01) return [px, py];
    return atlasSupport.deformPoint({px, py, drop, effRadius, transform, crimpEased});
  }

  function nearDrop(bbox){
    if (tiltEased > 0.01) return false;
    return atlasSupport.nearDropBBox({box: bbox, drop, effInfluence});
  }

  let hostIndex = -1;
  // Tessera attiva: il luogo aperto nel pannello (indice), distinto dal luogo sotto il puntatore.
  let activePlace = null, activeScreen = null, ringLabelsFrame = null;
  // Indicatore a bordo figura quando la tessera attiva è fuori campo: freccia verso di essa e nome del luogo.
  const activePointer = document.createElement("button");
  activePointer.type = "button"; activePointer.className = "active-pointer"; activePointer.hidden = true;
  activePointer.innerHTML = '<i aria-hidden="true">→</i><span></span>';
  activePointer.addEventListener("click", () => wrap.focusActive());
  function updateActivePointer(){
    if (activePlace == null || !activeScreen) { activePointer.hidden = true; return; }
    const W = cssSize[0], H = cssSize[1], m = 56, {x, y} = activeScreen, inside = x >= m && x <= W - m && y >= m && y <= H - m;
    if (inside) { activePointer.hidden = true; return; }
    const cx = Math.max(m, Math.min(W - m, x)), cy = Math.max(m, Math.min(H - m, y)), angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI;
    const name = allData[activePlace].properties.Toponym;
    activePointer.hidden = false; activePointer.style.left = `${cx}px`; activePointer.style.top = `${cy}px`;
    activePointer.firstChild.style.transform = `rotate(${angle}deg)`; activePointer.lastChild.textContent = name;
    activePointer.setAttribute("aria-label", it.findInFigure(name));
  }
  const INK_RGB_STR = d3.color(INK_COLOR).rgb().toString().replace(/rgba?\(|\)/g, '');
  let terraceCurveCache = {index: -1, curves: null, tiltNow: 1, rotSinNow: 0, rotCosNow: 1, zScale: 1, invK: 1};
  let hoverTerrace = -1;
  const logPickDiagnostics = atlasLodPicking.makePickLogger({PROFILE, painters});

  let chapter = 1;                 
  let occEased = allData.map(() => 0);
  let birthEased = allData.map(() => 0); // presenza cumulativa nel layout cognitivo
  let focalEased = allData.map(() => 1);
  let fictBirthEased = allData.map(() => 0);

  let layoutPtsEased = allData.map((d, i) => baseWorldPt(i));
  let gravRamp = allData.map(() => 1);

  const STAGES = [
    "map2d",
    "diagram2d",
    "diagram2d_fict",
    "diagram_axon",
    "map_axon"
  ];
  const STAGE_LABELS = it.stageLabels;
  let stage = "map2d";       // stato canonico della sequenza STAGES
  let diagramOpenedOnce = false;
  let crimpTarget = 0;        // 0 = geografico, 1 = cognitivo
  let crimpEased = 0;         // molla, come occEased
  const TILT_REST = 0.75;     // schiacciamento y a riposo nello stato 3
  const TILT_MORPH = 0.05;
  let tiltTarget = 0;         // 0 = pianta, TILT_REST = assonometria
  let tiltEased = 0;          // molla, stessa logica di crimpEased
  let tiltNow = 1;            // scala y effettiva del frame corrente
  let planRot = 0;            // rotazione della pianta, radianti
  let focalizer = null;       // null = vista "tutti" (misura del piano)
  let seqGrain = atlasConfig.GRAIN.initial;  // passo del cursore per pagina: 'page' (ultima riga di ogni pagina) o 'row'
  let seqMode = false;        // false = timeline capitoli; true = timeline sequenziale per riferimento
  let seqPos = 0;             // posizione ordinale globale dentro atlasSequence.sequence
  // occSeq e' il buffer riusato restituito da occUpTo: si aggiorna solo quando
  // cambiano seqPos, focalizer o seqMode, mai per frame.
  let occSeq = new Float32Array(allData.length);
  const occSeqBuf = new Float32Array(allData.length);
  let seqOccDirty = true;
  const roleBands = atlasRoleBands.create({
    allDataLength: allData.length,
    roleCap: SEQ_BANDS_CAP,
    bandsMax: BANDS_MAX,
    bandsLogBase: atlasChapters.BANDS_LOG_BASE
  });
  let roleSortTarget = 0;
  let roleSortEased = 0;
  let lodTarget = 0;
  let lodEased = 0;
  const routeSelection = atlasRouteSelection.create({
    getFocalizer: () => focalizer,
    getLodEased: () => lodEased,
    getHostIndex: () => hostIndex,
    getHoverTerrace: () => hoverTerrace,
    getRoleSortTarget: () => roleSortTarget,
    roleBands,
    sequence,
    routeIdByReferenceId: atlasAttestedRoutes.routeIdByReferenceId,
    onReferenceSelect: onTileSelect
  });
  let seqOccCalls = 0;
  let seqOccWindowT0 = performance.now();
  let seqOccCallsPerSecond = 0;
  let mapBtn = null, pasticciaccioBtn = null, reliefBtn = null;
  let shellRef = {};
  let seqModeToggle = null, seqChapterBtn = null, seqPageBtn = null, orderBtn = null, seqSlider = null, seqLabel = null, roleLegend = null, roleButtons = null;
  let legendRow = null, lodLabel = null;
  let pageRibbon = null, pageRibbonShell = null, ribbonPrevBtn = null, ribbonNextBtn = null;
  let currentRibbonTick = null;
  let routeHotSet = new Set(), routeHoverRoutes = [], routeHoverEased = 0;
  let ribbonStateKey = "";
  let stagePrevBtn = null, stageNextBtn = null, stageLabel = null;
  const frameUiCache = {lastReliefButtonKey: "", lastLodLabelText: null};
  let playing = false;
  let playTimer = null;
  let showFictitious = false;   // gate del secondo bottone "luoghi narrativi"
  const roleFilter = atlasConfig.ROLE_ORDER.map(() => true);
  let fictSpawnPt = allData.map(() => null); // punto di riposo world-space (angolo viewport piu' vicino) per i fittizi assenti
  let ghostSlotsLoggedChapter = null;
  // Layout radiale attivo: solo referenziali oppure referenziali e fittizi.
  let activeRanked = rankedRadialByChapter;
  let snapNextFrame = false;
  let pendingPageMode = false;
  let suppressUrl = false;
  let readyToPublish = false;
  let motionError = Infinity, stableFrames = 0;
  function notify(source) {
    if (import.meta.env.DEV) stableFrames = 0;
    if (readyToPublish && !suppressUrl) onStateChange(source);
  }
  const axisTransport=createAxisTransport({view:'map',axon:0,narrative:0},atlasConfig.MOTION);
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let pendingMotion=null,prepareTimer=null,lastAxesRequest='',lastPassage=null,lastReducedReading='',pendingDiagramCamera=false;
  let axisFrame=null,referenceLayout=null,layoutOffset=null,axisGeneration=0;
  const prepareChannel=new MessageChannel();
  prepareChannel.port1.onmessage=()=>{const task=prepareTimer;prepareTimer=null;if(typeof task==='function')task();};
  const schedulePreparation=task=>{prepareTimer=task;prepareChannel.port2.postMessage(0);};
  const motionStats={preparation:[],starts:[],finishes:[],interruptions:[]};
  const desiredAxes=()=>({view:crimpTarget>.5?'diagram':'map',axon:+(tiltTarget>0),narrative:+showFictitious});
  let evaluatedFrame=null,readyAxisFrame=null,lastPaintedFrame=null;
  const fondo = createFondo({projection, onReady: () => { lastPaintedFrame = null; draw(); }});
  const fondoCredit = document.createElement("p"); fondoCredit.className = "historical-credit fondo-credit"; fondoCredit.hidden = true;
  // Barra di scala della geografia in pianta: lunghezza arrotondata (1, 2, 5 × 10ⁿ m) per 70–150 px CSS.
  const scaleBar = document.createElement("div"); scaleBar.className = "scale-bar"; scaleBar.setAttribute("role", "img"); scaleBar.hidden = true;
  scaleBar.innerHTML = '<i></i><span></span>';
  let scaleKey = "";
  function updateScaleBar(show, crimp, tilt){
    const visible = show && crimp < .02 && tilt < .02 && poleIndex >= 0;
    if (!visible) { if (!scaleBar.hidden) { scaleBar.hidden = true; scaleKey = ""; } return; }
    const [lon, lat] = projection.invert(pts[poleIndex]), a = projection([lon, lat]), b = projection([lon + 0.01, lat]);
    const metresPerWorld = 0.01 * 111320 * Math.cos(lat * Math.PI / 180) / Math.hypot(b[0] - a[0], b[1] - a[1]), cssPerWorld = fitScale * transform.k;
    const target = 110 / cssPerWorld * metresPerWorld, pow = 10 ** Math.floor(Math.log10(target));
    const nice = [1, 2, 5, 10].map(f => f * pow).reduce((best, v) => Math.abs(v - target) < Math.abs(best - target) ? v : best);
    const px = nice / metresPerWorld * cssPerWorld, label = it.metricDistance(nice / 1000), key = `${label}|${px.toFixed(1)}`;
    if (key === scaleKey) return; scaleKey = key;
    scaleBar.hidden = false; scaleBar.firstChild.style.width = `${px}px`; scaleBar.lastChild.textContent = label; scaleBar.setAttribute("aria-label", it.scaleBarLabel(label));
  }
  const t0 = performance.now();          // clock monotono per la fase del pulse

  function interactionFrame() {
    if((axisTransport.active||pendingMotion)&&evaluatedFrame){const f=evaluatedFrame;return{transform:f.transform,cogCenter:f.cogCenter,rotPivot:f.rotPivot,crimpEased:f.crimpEased,tiltEased:f.tiltEased,tiltNow:f.tiltNow,planRot:f.planRot,displayPts:f.displayPts,displayCellScale:f.displayCellScale,birthEased:f.birthEased,fictBirthEased:f.fictBirthEased,rotSinNow:f.rotSinNow,rotCosNow:f.rotCosNow,zStep:atlasPainters.AXON_Z_STEP*f.zScaleDraw/Math.max(.001,f.tiltNow)};}
    const rotNow = tiltEased > 0.01 ? planRot : 0;
    return {
      transform,
      cogCenter,
      rotPivot,
      crimpEased,
      tiltEased,
      tiltNow,
      planRot,
      displayPts,
      displayCellScale,
      birthEased,
      fictBirthEased,
      rotSinNow: Math.sin(rotNow),
      rotCosNow: Math.cos(rotNow),
      // Il picking usa la quota nel piano precedente alla compressione verticale.
      zStep: atlasPainters.AXON_Z_STEP
             * (1 + (lastCogScaleDyn - 1) * crimpEased)
             * (tiltEased >= 0.999 ? 1 : tiltEased)
             / Math.max(0.001, tiltNow)
    };
  }

  function focalAlpha(i) {
    return atlasSupport.focalAlpha(focalEased, i);
  }

  function offmapPresence() {
    return atlasSupport.offmapPresence(crimpEased, FICT_CRIMP_THRESHOLD);
  }

  function routeAlphaOf(i) {
    if (routeHoverEased <= 0.01 || routeHotSet.size === 0) return 1;
    if (routeHotSet.has(i)) return 1;
    return 1 - (1 - FOCAL_DIM_ALPHA) * routeHoverEased;
  }

  function contentAlpha(i, opts = {}) {
    const offmap = i >= N_INMAP && i < N_GEO;
    const presence = opts.presence == null ? 1 : opts.presence;
    const crimp = opts.crimp ? crimpEased : 1;
    return presence * crimp * focalAlpha(i) * routeAlphaOf(i) * (offmap ? offmapPresence() : 1);
  }

  function alphaBucket(alpha) {
    return atlasSupport.alphaBucket(alpha);
  }

  function clamp01(v) {
    return atlasSupport.clamp01(v);
  }

  function seqPage(row) {
    return atlasSupport.seqPage(row);
  }

  function effRoleName(row) {
    return atlasSupport.effRoleName(row);
  }

  function effRoleIdx(row) {
    return atlasSupport.effRoleIdx(row, atlasConfig.ROLE_ORDER);
  }

  function roleMaskComplete() {
    return roleFilter.every(Boolean);
  }

  function activeRoleMask() {
    return focalizer != null && !roleMaskComplete() ? roleFilter : null;
  }

  function roleAllowed(row) {
    const mask = activeRoleMask();
    if (!mask) return true;
    const idx = effRoleIdx(row);
    return idx >= 0 && mask[idx];
  }

  function openDiagramCameraIfNeeded() {
    if(axisTransport.active||pendingMotion){pendingDiagramCamera=true;return;}
    if (crimpTarget > 0.5 || crimpEased > 0.02) return;
    prepareDiagramCamera();
  }
  function prepareDiagramCamera(){
    mapTransformBeforeDiagram = transform;
    pendingRestoreMapCamera = false;
    diagramScaleBaseK = transform.k;
    updateZoomLimits(diagramScaleBaseK);
    cogCenter = interaction.viewportCenterWorld(interactionFrame());
    setRotPivot(cogCenter.slice());
    const openInteractionFrame = interactionFrame();
    const viewportRadiusWorld = Math.min(width, height) / 2 / transform.k;
    const gravDist = allData.map((d, i) => i < N_GEO
      ? Math.hypot(pts[i][0] - cogCenter[0], pts[i][1] - cogCenter[1])
      : 0);
    gravRamp = gravDist.map(d => Math.min(1, d / viewportRadiusWorld));
    for (let i = N_INMAP; i < N_GEO; i++) {
      layoutPtsEased[i] = interaction.spawnPointAlongAzimuth(openInteractionFrame, geographicAngle[i]);
    }
  }

  function syncStageLabel() {
    stage = crimpTarget > 0.5
      ? (tiltTarget > 0 ? "diagram_axon" : (showFictitious ? "diagram2d_fict" : "diagram2d"))
      : (tiltTarget > 0 ? "map_axon" : "map2d");
  }

  function applyStage(nextStage) {
    pendingPageMode = false;
    routeSelection.clear();
    if (nextStage === "diagram2d" || nextStage === "diagram2d_fict" || nextStage === "diagram_axon") {
      diagramOpenedOnce = true;
      openDiagramCameraIfNeeded();
      crimpTarget = 1;
    } else if (nextStage === "map2d" || nextStage === "map_axon") {
      crimpTarget = 0;
      pendingRestoreMapCamera = true;
    }
    if (nextStage === "diagram_axon" || nextStage === "map_axon") tiltTarget = TILT_REST;
    else if (nextStage === "diagram2d" || nextStage === "diagram2d_fict" || nextStage === "map2d") tiltTarget = 0;
    if (nextStage === "diagram2d_fict") showFictitious = true;
    else if (nextStage === "diagram2d") showFictitious = false;
    syncStageLabel();
    updateSeqUi();
  }

  function moveStage(delta) {
    const idx = Math.max(0, STAGES.indexOf(stage));
    const next = STAGES[(idx + delta + STAGES.length) % STAGES.length];
    applyStage(next);
  }

  // Foglio: l'angolo governa il p dello stesso passaggio della regia D. Un asse per gesto:
  // orizzontale = relazioni/geografia, verticale = rilievo/pianta; i narrativi restano un comando esplicito.
  const SHEET_TARGET = {
    left: {map2d: () => showFictitious ? "diagram2d_fict" : "diagram2d", map_axon: () => "diagram_axon"},
    right: {diagram2d: () => "map2d", diagram2d_fict: () => "map2d", diagram_axon: () => "map_axon"},
    up: {map2d: () => "map_axon", diagram2d: () => "diagram_axon", diagram2d_fict: () => "diagram_axon"},
    down: {map_axon: () => "map2d", diagram_axon: () => showFictitious ? "diagram2d_fict" : "diagram2d"}
  };
  const OPPOSITE = {left: "right", right: "left", up: "down", down: "up"};
  const stageOfAxes = ax => ax.view === "diagram"
    ? (ax.axon ? "diagram_axon" : (ax.narrative ? "diagram2d_fict" : "diagram2d"))
    : (ax.axon ? "map_axon" : "map2d");
  const passageDirection = (from, to) => from.view !== to.view ? (to.view === "diagram" ? "left" : "right")
    : from.axon !== to.axon ? (to.axon ? "up" : "down") : (to.narrative ? "left" : "right");
  let sheet = null, sheetHandle = null;
  // Estremi del passaggio in corso o in preparazione; il motore può riavvolgerlo con from/to scambiati.
  const passageEnds = () => axisTransport.active ? [axisTransport.active.from, axisTransport.active.to]
    : pendingMotion ? [axisTransport.current, pendingMotion.target] : null;
  // Progresso del motore verso l'estremo indicato dalla chiave.
  const progressToward = (a, key) => axesKey(a.to) === key ? a.p : 1 - a.p;
  const sheetController = {
    // sheet.p è il progresso verso sheet.toKey, lo stato verso cui il dito tira.
    start(direction) {
      if (reducedMotion.matches) { const next = SHEET_TARGET[direction]?.[stage]; if (next) applyStage(next()); return false; }
      const ends = passageEnds();
      if (ends) {
        const [x, y] = ends, toward = passageDirection(x, y) === direction ? y : passageDirection(y, x) === direction ? x : null;
        if (!toward) return false;
        const key = axesKey(toward), p = axisTransport.active ? progressToward(axisTransport.active, key) : (key === axesKey(ends[1]) ? 0 : 1);
        sheet = {toKey: key, p0: p, p};
        return true;
      }
      const next = SHEET_TARGET[direction]?.[stage];
      if (!next) return false;
      applyStage(next());
      sheet = {toKey: axesKey(desiredAxes()), p0: 0, p: 0};
      return true;
    },
    move(fraction) { if (sheet) sheet.p = Math.max(0, Math.min(1, sheet.p0 + fraction)); },
    end(flick) {
      const s = sheet; sheet = null;
      const ends = passageEnds();
      if (!s || !ends) return;
      const toward = ends.find(e => axesKey(e) === s.toKey), away = ends.find(e => axesKey(e) !== s.toKey);
      const end = (flick ? flick > 0 : s.p >= 0.5) ? toward : away;
      if (axesKey(end) !== axesKey(desiredAxes())) applyStage(stageOfAxes(end));
      else if (axisTransport.active) axisTransport.release(axesKey(axisTransport.active.to) === axesKey(end) ? 1 : -1, performance.now());
    },
    key(key) {
      const direction = {ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down"}[key];
      if (direction) { const next = SHEET_TARGET[direction]?.[stage]; if (next) applyStage(next()); return true; }
      if (key === "Home") { if (stage !== "map2d") applyStage("map2d"); return true; }
      if (key === "Enter" || key === " ") { const next = (SHEET_TARGET.left[stage] || SHEET_TARGET.right[stage]); applyStage(next()); return true; }
      return false;
    },
    // Clic su un quadrante: transizione automatica, anche in diagonale; il diagramma ricorda i narrativi.
    goto(quadrant) {
      const next = quadrant === "diagram" ? (showFictitious ? "diagram2d_fict" : "diagram2d") : quadrant;
      if (next !== stage) applyStage(next);
    },
    // Passaggio trattenuto verso uno stato qualunque: la Frattura lo usa per seguire lo scorrimento.
    holdToward(target) {
      if (reducedMotion.matches) { if (target !== stage) applyStage(target); return false; }
      const ends = passageEnds();
      if (ends) {
        const toward = ends.find(e => stageOfAxes(e) === target);
        if (!toward) return false;
        const key = axesKey(toward), p = axisTransport.active ? progressToward(axisTransport.active, key) : (key === axesKey(ends[1]) ? 0 : 1);
        sheet = {toKey: key, p0: p, p};
        return true;
      }
      if (target === stage) return false;
      applyStage(target);
      sheet = {toKey: axesKey(desiredAxes()), p0: 0, p: 0};
      return true;
    },
    seek(p) { if (sheet) sheet.p = Math.max(0, Math.min(1, p)); },
    // I luoghi narrativi restano un asse distinto: si accendono e spengono senza cambiare quadrante.
    toggleNarrative() {
      showFictitious = !showFictitious;
      applyStage(crimpTarget > 0.5 ? (tiltTarget > 0 ? "diagram_axon" : (showFictitious ? "diagram2d_fict" : "diagram2d")) : stage);
      notify("narrative");
    }
  };
  const quadrantOf = name => name === "diagram2d_fict" ? "diagram2d" : name;
  function sheetState() {
    const a = axisTransport.active;
    if (a) {
      // La piega misura il progresso verso lo stato richiesto, anche quando il passaggio è riavvolto.
      const want = sheet ? sheet.toKey : axesKey(desiredAxes()), target = axesKey(a.to) === want ? a.to : a.from, origin = target === a.to ? a.from : a.to;
      return {p: progressToward(a, axesKey(target)), direction: passageDirection(origin, target), label: it.sheetMoving(STAGE_LABELS[stageOfAxes(target)] || ""),
        from: quadrantOf(stageOfAxes(origin)), to: quadrantOf(stageOfAxes(target)), stage: quadrantOf(stage), narrative: showFictitious, moving: true};
    }
    const horizontal = crimpTarget > 0.5 ? it.sheetGeography : it.sheetRelations, vertical = tiltTarget > 0 ? it.sheetPlan : it.sheetRelief;
    return {p: 0, direction: null, label: it.sheetHint(horizontal, vertical), from: quadrantOf(stage), to: quadrantOf(stage), stage: quadrantOf(stage), narrative: showFictitious, moving: false};
  }

  function seqTrack() {
    if (SEQ_FOLLOW_FOCALIZER && focalizer != null) return sequenceByAgent.get(focalizer) || [];
    return seqAllPositions;
  }
  // Cursore per pagina: il binario del passo scelto. Per pagina resta l'ultima riga di ogni pagina del binario.
  const grainCache = new WeakMap();
  function grainTrack(track = seqTrack()) {
    if (seqGrain === "row") return track;
    let pages = grainCache.get(track);
    if (!pages) {
      pages = track.filter((pos, j) => { const next = track[j + 1]; return next == null || seqPage(sequence[next]) !== seqPage(sequence[pos]) || chapterOfCursor(next) !== chapterOfCursor(pos); });
      grainCache.set(track, pages);
    }
    return pages;
  }
  // Indice, nel binario del passo, della pagina (o riga) che contiene il cursore.
  function grainIndex(pos = seqPos, track = grainTrack()) {
    if (!track.length) return 0;
    const j = track.findIndex(p => p >= pos);
    return j < 0 ? track.length - 1 : j;
  }

  function seqEnabledNow() {
    return SEQ_ENABLED_IN_MAP || crimpEased > 0.99;
  }

  function freezeRotPivot() {
    setRotPivot((drop.s > 0.5 && hostIndex >= 0 && displayPts[hostIndex])
      ? displayPts[hostIndex].slice()
      : interaction.viewportCenterWorld(interactionFrame()));
  }

  function setRotPivot(next) {
    if (!next) return;
    const dx = next[0] - rotPivot[0], dy = next[1] - rotPivot[1];
    if (dx || dy) {
      const rotNow = tiltEased > 0.01 ? planRot : 0;
      const tiltNow = 1 - (1 - TILT_REST) * tiltEased;
      const cos = Math.cos(rotNow), sin = Math.sin(rotNow);
      const mdx = cos * dx - sin * dy;
      const mdy = tiltNow * (sin * dx + cos * dy);
      const deltaX = dx - mdx, deltaY = dy - mdy;
      const nextTransform = d3.zoomIdentity
        .translate(transform.x - transform.k * deltaX, transform.y - transform.k * deltaY)
        .scale(transform.k);
      transform = nextTransform;
      rotPivotSyncing = true;
      try {
        d3.select(canvas).call(zoomBehavior.transform, gestureTransform(nextTransform));
      } finally {
        rotPivotSyncing = false;
      }
    }
    rotPivot = next.slice();
    lastHitState = null;
  }

  function nearestSeqPos(targetPos, track = seqTrack()) {
    if (!track.length) return Math.max(0, Math.min(sequence.length - 1, Math.floor(targetPos || 0)));
    let best = track[0], bestD = Math.abs(track[0] - targetPos);
    for (const p of track) {
      const d = Math.abs(p - targetPos);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function seqTrackIndex(pos = seqPos, track = seqTrack()) {
    if (!track.length) return 0;
    let bestJ = 0, bestD = Math.abs(track[0] - pos);
    for (let j = 1; j < track.length; j++) {
      const d = Math.abs(track[j] - pos);
      if (d < bestD) { bestD = d; bestJ = j; }
    }
    return bestJ;
  }

  function lastSeqPosOfChapter(c) {
    let best = 0;
    for (const row of sequence) {
      if ((Number(row.chapter) || 1) <= c) best = row.pos;
      else break;
    }
    return best;
  }

  function firstSeqPosOfChapter(c, track = seqAllPositions) {
    for (const pos of track) {
      const row = sequence[pos];
      if (row && (Number(row.chapter) || 1) === c && roleAllowed(row)) return pos;
    }
    return -1;
  }

  function seqChapterTarget(direction) {
    const track = seqTrack();
    if (!track.length) return -1;
    for (let c = chapter + direction; c >= 1 && c <= N_CHAPTERS; c += direction) {
      const pos = firstSeqPosOfChapter(c, track);
      if (pos >= 0) return pos;
    }
    return -1;
  }

  function moveSeqChapter(direction) {
    const pos = seqChapterTarget(direction);
    if (pos >= 0) setSeqPos(pos);
  }

  function setSeqPos(pos) {
    const next = nearestSeqPos(pos);
    if (next !== seqPos) seqOccDirty = true;
    routeSelection.clear();
    seqPos = next;
    chapter = chapterOfCursor(seqPos);
    if (slider) { slider.value = chapter; chLabel.textContent = String(chapter); }
    updateSeqUi("cursor");
  }

  function rebuildRolePermutations() {
    roleBands.rebuild({
      roleStack, rolePosStack, roleCounts: roleLen,
      roleOrder: atlasConfig.ROLE_ORDER,
      linear: focalizer != null
    });
  }

  function rebuildRoleBadges() {
    const cursorPos = seqMode ? seqPos : (lastPosByChapter[chapter] ?? -1);
    roleBands.rebuildRecency({
      focalizer,
      cursorPos,
      cursorChapter: chapter,
      track: seqTrack(),
      sequence,
      effRoleIdx,
      rowAllowed: roleAllowed
    });
  }

  function logRoleStratigraphy() {
    if (!PROFILE) return;
    console.table(
      d3.range(allData.length)
        .filter(i => roleBands.bandCountOf[i] > 0)
        .sort((a, b) => d3.descending(roleBands.bandCountOf[a], roleBands.bandCountOf[b]))
        .slice(0, 6)
        .map(i => ({
          toponimo: allData[i].properties.Toponym,
          occorrenze: roleBands.occCountOf[i],
          terrazze: roleBands.bandCountOf[i],
          stratigrafia: Array.from({length: roleBands.bandCountOf[i]}, (_, k) => {
            const r = roleBands.bandRoleChrono[i * BANDS_MAX + k];
            return r >= 0 ? atlasConfig.ROLE_ORDER[r] : "-";
          }).join(" -> ")
        }))
    );
  }

  function refreshOccSeq() {
    if (!seqMode) {
      if (focalizer == null || !seqOccDirty) return;
      occSeqBuf.set(occUpTo(lastPosByChapter[chapter], focalizer, activeRoleMask()));
      occSeq = occSeqBuf;
      rebuildRolePermutations();
      logRoleStratigraphy();
      rebuildRoleBadges();
      seqOccDirty = false;
      return;
    }
    if (!seqOccDirty) return;
    occSeqBuf.set(occUpTo(seqPos, focalizer, activeRoleMask()));
    occSeq = occSeqBuf;
    rebuildRolePermutations();
    logRoleStratigraphy();
    rebuildRoleBadges();
    seqOccDirty = false;
    seqOccCalls++;
    const now = performance.now();
    if (now - seqOccWindowT0 >= 1000) {
      seqOccCallsPerSecond = seqOccCalls * 1000 / (now - seqOccWindowT0);
      seqOccCalls = 0;
      seqOccWindowT0 = now;
    }
  }

  function toggleRoleFilter(roleIndex) {
    if (!(roleIndex >= 0 && roleIndex < roleFilter.length)) return;
    if (roleFilter[roleIndex] && roleFilter.filter(Boolean).length <= 1) return;
    roleFilter[roleIndex] = !roleFilter[roleIndex];
    seqOccDirty = true;
    ribbonStateKey = "";
    if (!roleFilter[atlasConfig.ROLE_ORDER.indexOf("Route")]) routeSelection.clear();
    refreshOccSeq();
    updateSeqUi("roles");
  }

  function refreshSeqOccRate() {
    if (!PROFILE) return;
    const now = performance.now();
    if (now - seqOccWindowT0 >= 1000) {
      seqOccCallsPerSecond = seqOccCalls * 1000 / (now - seqOccWindowT0);
      seqOccCalls = 0;
      seqOccWindowT0 = now;
    }
  }

  function updateSeqUi(source) {
    if (!seqChapterBtn || !seqPageBtn) return;
    const seqEnabled = seqEnabledNow();
    const roleModeNow = focalizer != null;
    if (!seqEnabled && seqMode) {
      seqMode = false;
      chapter = chapterOfCursor(seqPos);
      if (slider) { slider.value = chapter; chLabel.textContent = String(chapter); }
      seqOccDirty = true;
      if (playing && playTimer) { playing = false; btn.textContent = PLAY_ICON;btn.setAttribute("aria-label",it.play); clearInterval(playTimer); playTimer = null; }
    }
    slider.value = chapter;
    chLabel.textContent = String(chapter);
    seqPageBtn.disabled = !seqEnabled;
    seqChapterBtn.disabled = false;
    seqChapterBtn.setAttribute("aria-pressed", String(!seqMode));
    seqPageBtn.setAttribute("aria-pressed", String(seqMode));
    seqSlider.style.display = seqMode ? "" : "none";
    seqLabel.style.display = seqMode ? "" : "none";
    slider.style.display = seqMode ? "none" : "";
    chLabel.style.display = seqMode ? "none" : "";
    const track = grainTrack();
    seqSlider.min = 0;
    seqSlider.max = Math.max(0, track.length - 1);
    seqSlider.disabled = !seqMode || !track.length;
    seqSlider.value = grainIndex(seqPos, track);
    // Granularità: «interruttore» sotto il cursore, «tre tempi» come terzo bottone del gruppo, «modificatore» con Maiuscolo.
    const grainVariant = atlasConfig.GRAIN.variant;
    if (shellRef.rowGrain) shellRef.rowGrain.hidden = !(seqMode && grainVariant === "interruttore");
    for (const b of shellRef.grainToggle?.querySelectorAll("button") || []) b.setAttribute("aria-pressed", String(b.dataset.grain === seqGrain));
    if (shellRef.seqRowBtn) {
      shellRef.seqRowBtn.hidden = grainVariant !== "tre-tempi";
      shellRef.seqRowBtn.disabled = !seqEnabled;
      shellRef.seqRowBtn.setAttribute("aria-pressed", String(seqMode && seqGrain === "row"));
      if (grainVariant === "tre-tempi") seqPageBtn.setAttribute("aria-pressed", String(seqMode && seqGrain === "page"));
    }
    const row = sequence[seqPos];
    seqLabel.textContent = row ? it.cursorPosition(row.page,chapterOfCursor(seqPos)) : it.emptyCursor;
    if (stageLabel) {
      const pos = Math.max(0, STAGES.indexOf(stage)) + 1;
      stageLabel.textContent = it.stageLabel(pos,STAGES.length,STAGE_LABELS[stage]||stage);
    }
    if (mapBtn) {
      const hot = crimpTarget <= 0.5;
      mapBtn.style.background = hot ? INK_COLOR : BG_COLOR;
      mapBtn.style.color = hot ? BG_COLOR : INK_COLOR;
    }
    if (pasticciaccioBtn) {
      const hot = crimpTarget > 0.5;
      pasticciaccioBtn.style.background = hot ? INK_COLOR : BG_COLOR;
      pasticciaccioBtn.style.color = hot ? BG_COLOR : INK_COLOR;
    }
    const reliefOn = tiltTarget > 0;
    const rotLabel = rotSlider?.previousElementSibling;
    if (rotLabel) rotLabel.style.display = reliefOn ? "" : "none";
    if (rotSlider) { rotSlider.style.display = reliefOn ? "" : "none"; const section = rotSlider.closest("section"); if (section) section.hidden = !reliefOn; }
    if (orderBtn) {
      if (!roleModeNow) roleSortTarget = 0;
      orderBtn.style.display = reliefOn ? "" : "none";
      orderBtn.disabled = !roleModeNow || !reliefOn;
      orderBtn.textContent = roleSortTarget > 0.5 ? it.roleOrder : it.chronologicalOrder;
    }
    if (roleLegend) roleLegend.style.display = roleModeNow ? "flex" : "none";
    if (legendRow) legendRow.style.display = roleModeNow ? "flex" : "none";
    if (lodLabel) lodLabel.style.display = reliefOn ? "" : "none";
    updatePageRibbon();
    if (ribbonPrevBtn) {
      const enabled = seqMode && seqChapterTarget(-1) >= 0;
      ribbonPrevBtn.disabled = !enabled;
      ribbonPrevBtn.style.opacity = enabled ? "0.95" : "0.35";
      ribbonPrevBtn.style.cursor = enabled ? "pointer" : "default";
    }
    if (ribbonNextBtn) {
      const enabled = seqMode && seqChapterTarget(1) >= 0;
      ribbonNextBtn.disabled = !enabled;
      ribbonNextBtn.style.opacity = enabled ? "0.95" : "0.35";
      ribbonNextBtn.style.cursor = enabled ? "pointer" : "default";
    }
    if (stagePrevBtn && stageNextBtn) {
      stagePrevBtn.disabled = !diagramOpenedOnce && stage === "map2d";
      stageNextBtn.disabled = false;
    }
    notify(source);
  }

  function updatePageRibbon() {
    if (!pageRibbon) return;
    const rows = seqAllPositions
      .map(pos => sequence[pos])
      .filter(row => {
        if (!row || seqPage(row) == null) return false;
        const c = Number(row.chapter) || 1;
        return seqMode && c === chapter && roleAllowed(row);
      });
    const roleMaskKey = activeRoleMask() ? roleFilter.map(v => v ? 1 : 0).join("") : "all";
    const result = atlasPageRibbon.update({
      pageRibbon, pageRibbonWrap: pageRibbonShell, seqMode, rows, stateKey: ribbonStateKey, chapter, focalizer, seqPos,
      width, inkColor: INK_COLOR, roleColors: atlasConfig.ROLE_COLORS,
      gapMin: GAP_MIN, blockDelta: SEQ_BLOCK_DELTA,
      seqPage, effRoleName, setSeqPos, focalDimAlpha: FOCAL_DIM_ALPHA,
      allData, roleMaskKey, ...atlasConfig.RIBBON, cellRings, grain: seqGrain
    });
    if (!result.unchanged) {
      ribbonStateKey = result.stateKey;
      currentRibbonTick = result.currentRibbonTick;
    }
  }

  const evaluationModel={width,height,extentBase,N_GEO,N_INMAP,pts,cellRings,normalizedCellScale,
    isoProfileMed,axonZStep:atlasPainters.AXON_Z_STEP,terraceStep:atlasPainters.TER_STEP_FRAC,
    config:{...atlasConfig,TILT_REST,TILT_MORPH},bandsFor,BANDS_MAX,geographicAngle,
    spawnPointAlongAzimuth:interaction.spawnPointAlongAzimuth};
  function motionSnapshot(pulse=.5) {
    return {
      crimpEased,tiltEased,planRot,diagramScaleBaseK,
      transform:{x:transform.x,y:transform.y,k:transform.k},cogCenter:cogCenter.slice(),rotPivot:rotPivot.slice(),
      layoutPtsEased:layoutPtsEased.map(p=>p.slice()),previousCellScale:displayCellScale.slice(),
      occEased:occEased.slice(),birthEased:birthEased.slice(),focalEased:focalEased.slice(),fictBirthEased:fictBirthEased.slice(),
      occSeq:occSeq.slice(),drop:{...drop},roleSortEased,roleSortTarget,lodEased,
      chapter,focalizer,seqMode,seqPos,showFictitious,
      routeHoverEased,routeHotSet:new Set(routeHotSet),routeHoverRoutes:routeHoverRoutes.slice(),
      routeSelection:{id:routeSelection.id,tileIndex:routeSelection.tileIndex,terrace:routeSelection.terrace},
      hostIndex,hoverTerrace,currentRibbonTick:currentRibbonTick?{...currentRibbonTick}:null,
      roleData:focalizer==null?null:roleBands.snapshot(),activeRanked,
      pulse,baseTransform,terraceCurveCache,ghostSlotsLoggedChapter,
      profileFrame,profileTickMs,profileHitMs,seqOccCallsPerSecond
    };
  }
  function cancelPreparation(){axisGeneration++;prepareTimer=null;pendingMotion=null;}
  function resetAxisMotion(){
    cancelPreparation();axisTransport.reset(desiredAxes());axisFrame=null;readyAxisFrame=null;referenceLayout=null;layoutOffset=null;
    lastAxesRequest=axesKey(desiredAxes());lastPassage=null;pendingDiagramCamera=false;
  }
  function layoutTarget(i,state,frame){
    const ranked=(state.showFictitious?rankedRadialFullByChapter:rankedRadialByChapter)[chapter];
    const full=rankedRadialFullByChapter[chapter],born=seqMode?birthPos[i]<=seqPos:isBorn(i,chapter);
    if(i<N_GEO&&!cellRings[i]&&state.crimpEased<=.01)return interaction.spawnPointAlongAzimuth(frame,geographicAngle[i]);
    if(i>=N_GEO&&state.crimpEased<=FICT_CRIMP_THRESHOLD)return state.cogCenter.slice();
    if(i>=N_GEO&&(!state.showFictitious||!full.placedFict.has(i))&&born)return interaction.nearestViewportCorner(frame,state.cogCenter[0]+full.layoutAzimuth[i][0],state.cogCenter[1]+full.layoutAzimuth[i][1]);
    return born?[state.cogCenter[0]+ranked.layoutAzimuth[i][0],state.cogCenter[1]+ranked.layoutAzimuth[i][1]]:ranked.layoutAzimuth[i].slice();
  }
  function endpointFor(target,live,camera=transform){
    const e={...live,crimpEased:target.view==='diagram'?1:0,tiltEased:+target.axon,showFictitious:!!target.narrative,
      transform:{x:camera.x,y:camera.y,k:camera.k},cogCenter:cogCenter.slice(),rotPivot:rotPivot.slice(),diagramScaleBaseK};
    const basis=evaluateFrame(evaluationModel,e,fitScale);
    e.layoutPtsEased=allData.map((_,i)=>layoutTarget(i,e,basis));
    const full=rankedRadialFullByChapter[chapter];
    e.fictBirthEased=allData.map((_,i)=>e.crimpEased===1&&e.showFictitious&&i>=N_GEO&&full.placedFict.has(i)&&(seqMode?birthPos[i]<=seqPos:isBorn(i,chapter))?1:0);
    const f=evaluateFrame(evaluationModel,e,fitScale);e.previousCellScale=f.displayCellScale.slice();
    e.lodEased=evaluateFrame(evaluationModel,e,fitScale).lodTarget;
    return {...e,points:f.displayPts.map(p=>p.slice()),scales:f.displayCellScale.slice()};
  }
  // Dalle relazioni ingrandite alla geografia: la camera d'arrivo inquadra nella mappa i luoghi che il lettore
  // stava guardando nel diagramma, così che il passaggio li porti dentro la vista invece che fuori.
  // Senza ingrandimento resta la camera corrente (comportamento della regia D).
  function framingCamera(from,end){
    const C=atlasConfig.MOTION.framing;if(!C||transform.k<diagramScaleBaseK*C.minZoomRatio)return null;
    const m=C.margin,inside=([x,y])=>x>=width*m&&x<=width*(1-m)&&y>=height*m&&y<=height*(1-m),seen=[];
    for(let i=0;i<N_GEO;i++)if(cellRings[i]&&(birthEased[i]||0)>BIRTH_EPSILON&&inside(projectMotion(from,{projection:atlasProjection},from.displayPts[i])))seen.push(i);
    if(seen.length<C.minPlaces)return null;
    const tilt=1-(1-TILT_REST)*end.tiltEased,rot=end.tiltEased>.01?planRot:0,cos=Math.cos(rot),sin=Math.sin(rot),[px,py]=end.rotPivot;
    const q=seen.map(i=>{const dx=end.points[i][0]-px,dy=end.points[i][1]-py;return[px+cos*dx-sin*dy-bbox[0],py+(sin*dx+cos*dy)*tilt-bbox[1]];});
    const range=axis=>{const v=q.map(p=>p[axis]).sort((a,b)=>a-b),at=f=>v[Math.round(f*(v.length-1))];return[at(C.quantile),at(1-C.quantile)];};
    const [x0,x1]=range(0),[y0,y1]=range(1),pad=1-2*C.fill;
    const k=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,transform.k,width*pad/Math.max(1e-6,x1-x0),height*pad/Math.max(1e-6,y1-y0)));
    return{k,x:width/2-k*(x0+x1)/2,y:height/2-k*(y0+y1)/2};
  }
  function readingContextKey(){return[chapter,focalizer,seqMode,seqPos,roleFilter.join(','),planRot,fitScale].join('|');}
  function beginAxisPassage(target,now){
    const live=motionSnapshot(),from=evaluatedFrame||evaluateFrame(evaluationModel,live,fitScale);
    const a={...from,points:from.displayPts.map(p=>p.slice()),scales:from.displayCellScale.slice(),transform:{...from.transform}};
    // Una trasformazione completata si riavvolge sul medesimo contesto solo
    // finché lettura, fit e camera non sono cambiati.
    if(lastPassage&&lastPassage.key===readingContextKey()&&axesKey(lastPassage.from)===axesKey(target)&&axesKey(lastPassage.to)===axesKey(axisTransport.current)&&
      ['x','y','k'].every(k=>Math.abs(transform[k]-lastPassage.camera[k])<1e-9)){
      const context={...lastPassage.context,gestureCamera:{...transform}};
      referenceLayout=context.end.layoutPtsEased.map(p=>p.slice());layoutPtsEased=referenceLayout.map(p=>p.slice());
      layoutOffset=referenceLayout.map(()=>[0,0]);axisTransport.start(context,target,now,axesKey(target)===context.axisFrom);lastPassage=null;pendingDiagramCamera=false;return;
    }
    lastPassage=null;
    if(pendingDiagramCamera&&axisTransport.current.view==='map'&&target.view==='diagram')prepareDiagramCamera();
    pendingDiagramCamera=false;
    let b=endpointFor(target,live);
    const framed=target.view==='map'&&axisTransport.current.view==='diagram'?framingCamera(from,b):null;
    if(framed)b=endpointFor(target,live,framed);
    const context={start:a,end:b,model:evaluationModel,projection:atlasProjection,fit:fitScale,
      readingKey:readingContextKey(),token:atlasConfig.MOTION,narrativePlacement:rankedRadialFullByChapter,gestureCamera:{...transform},axisFrom:axesKey(axisTransport.current),
      gains:gravRamp.map(v=>LAYOUT_MORPH_SLOW+(LAYOUT_MORPH_FAST-LAYOUT_MORPH_SLOW)*v),
      ranks:atlasProjection.distanceRank.map((v,i)=>v??atlasProjection.distanceRank[primaryHostOf[i]]??0)};
    const iterator=prepareDirectionD(context),generation=++axisGeneration;
    pendingMotion={context,target,iterator,generation,key:readingContextKey()};
    referenceLayout=a.layoutPtsEased.map(p=>p.slice());layoutPtsEased=referenceLayout.map(p=>p.slice());layoutOffset=referenceLayout.map(()=>[0,0]);
    function prepareChunk(){
      if(generation!==axisGeneration)return;
      const start=performance.now();let result;
      do{result=iterator.next();}while(!result.done&&performance.now()-start<atlasConfig.MOTION.prepareBudget);
      if(import.meta.env.DEV)motionStats.preparation.push(performance.now()-start);
      if(result.done){pendingMotion=null;prepareTimer=null;axisTransport.start(result.value,target,performance.now());if(import.meta.env.DEV)motionStats.starts.push({at:performance.now(),target});}
      else schedulePreparation(prepareChunk);
    }
    schedulePreparation(prepareChunk);
  }
  function updateAxisRequest(now){
    const target=desiredAxes(),key=axesKey(target);
    if(reducedMotion.matches){if(axisTransport.active||pendingMotion||key!==axesKey(axisTransport.current)){resetAxisMotion();crimpEased=crimpTarget;tiltEased=+(tiltTarget>0);snapNextFrame=true;}return;}
    if(key!==lastAxesRequest){
      if(import.meta.env.DEV&&axisTransport.active)motionStats.interruptions.push({at:now,p:axisTransport.active.p,target});
      lastAxesRequest=key;axisTransport.request(target,now);
      if(pendingMotion&&axesKey(pendingMotion.target)!==key){cancelPreparation();referenceLayout=null;layoutOffset=null;}
    }
    if(!axisTransport.active&&!pendingMotion&&key!==axesKey(axisTransport.current))beginAxisPassage(target,now);
  }
  function advanceAxisFrame(now){
    if(sheet&&axisTransport.active)axisTransport.hold(axesKey(axisTransport.active.to)===sheet.toKey?sheet.p:1-sheet.p,now);
    const a=axisTransport.advance(now);axisFrame=a;
    if(!a)return;
    const c=a.context,live=motionSnapshot();live.layoutOffset=layoutOffset;
    const f=evaluateDirectionD(c,a.p,live);readyAxisFrame=f;crimpEased=f.crimpEased;tiltEased=f.transition.planeTilt;
    if(a.finished){
      const e=a.p===1?c.end:c.start;
      crimpEased=e.crimpEased;tiltEased=e.tiltEased;cogCenter=e.cogCenter.slice();rotPivot=e.rotPivot.slice();diagramScaleBaseK=e.diagramScaleBaseK;
      layoutPtsEased=e.layoutPtsEased.map((p,i)=>p.map((v,k)=>v+(layoutOffset?.[i]?.[k]||0)));
      fictBirthEased=allData.map((_,i)=>e.crimpEased===1&&e.showFictitious&&i>=N_GEO&&rankedRadialFullByChapter[chapter].placedFict.has(i)?(birthEased[i]||0):0);
      lodEased=e.lodEased;transform=d3.zoomIdentity.translate(f.transform.x,f.transform.y).scale(f.transform.k);
      rotPivotSyncing=true;try{d3.select(canvas).call(zoomBehavior.transform,gestureTransform(transform));}finally{rotPivotSyncing=false;}
      pendingRestoreMapCamera=false;updateZoomLimits(e.crimpEased>.5?diagramScaleBaseK:1);
      const sameGestureCamera=['x','y','k'].every(k=>Math.abs(live.transform[k]-(c.gestureCamera||c.start.transform)[k])<1e-9);
      lastPassage=sameGestureCamera?{context:c,from:a.p===1?a.from:a.to,to:a.p===1?a.to:a.from,key:c.readingKey,camera:{...transform}}:null;
      if(import.meta.env.DEV)motionStats.finishes.push({at:now,p:a.p,target:axisTransport.current});
      axisFrame=null;readyAxisFrame=null;referenceLayout=null;layoutOffset=null;
    }
  }
  function frameForMotion(snapshot){
    const a=axisTransport.active;
    if(a){snapshot.layoutOffset=layoutOffset;const f=readyAxisFrame||evaluateDirectionD(a.context,a.p,snapshot);readyAxisFrame=null;f.roleSortEased=roleSortEased;f.profileTickMs=profileTickMs;return attachMotionRendering(f,{config:atlasConfig,context,model:evaluationModel,traceIsoline:traceModelIsoline,passage:a.context});}
    if(pendingMotion){const e=pendingMotion.context.start,o=pendingMotion.context.gestureCamera,r=snapshot.transform.k/o.k,camera={k:e.transform.k*r,x:snapshot.transform.x+(e.transform.x-o.x)*r,y:snapshot.transform.y+(e.transform.y-o.y)*r};return evaluateFrame(evaluationModel,{...snapshot,transform:camera,crimpEased:e.crimpEased,tiltEased:e.tiltEased,
      layoutPtsEased:e.layoutPtsEased,fictBirthEased:e.fictBirthEased,cogCenter:e.cogCenter,rotPivot:e.rotPivot,diagramScaleBaseK:e.diagramScaleBaseK},fitScale);}
    return evaluateFrame(evaluationModel,snapshot,fitScale);
  }
  // Confronto esatto degli ingressi al raster, non una soglia di assestamento.
  // Il LOD continuo a riposo viene letto dal disegno solo come ramo < 0,5.
  function equalPaintValue(a,b){
    if(a===b)return true;
    if(a==null||b==null||typeof a!=="object"||typeof b!=="object")return false;
    if(a instanceof Set||b instanceof Set)return a instanceof Set&&b instanceof Set&&a.size===b.size&&[...a].every(v=>b.has(v));
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length&&keys.every(k=>Object.hasOwn(b,k)&&equalPaintValue(a[k],b[k]));
  }
  const paintFields=['crimpEased','tiltEased','planRot','diagramScaleBaseK','transform','cogCenter','rotPivot',
    'layoutPtsEased','occEased','occSeq','birthEased','fictBirthEased','focalEased','roleSortEased','roleSortTarget',
    'chapter','focalizer','seqMode','seqPos','showFictitious','routeHoverEased','routeHotSet','routeHoverRoutes',
    'routeSelection','hostIndex','hoverTerrace','currentRibbonTick','roleData','activeRanked'];
  function samePaintInputs(a,b){
    return a&&b&&!a.transition&&!b.transition&&a.baseTransform===b.baseTransform&&
      a.historical?.revision===b.historical?.revision&&a.lodCollapse===b.lodCollapse&&['x','y','s'].every(k=>a.drop[k]===b.drop[k])&&
      paintFields.every(k=>equalPaintValue(a[k],b[k]));
  }
  function draw(){
    const profileT0=PROFILE?performance.now():0;
    const snapshot=readyAxisFrame||motionSnapshot(.5);
    const frame=frameForMotion(snapshot);
    if(historical)frame.historical=historical.snapshot();
    frame.profileT0=profileT0;
    frame.profileEvaluationMs=PROFILE?performance.now()-profileT0:0;
    evaluatedFrame=frame;
    // Nessuna cache di strati: il bitmap già presente si conserva solo se gli
    // ingressi sono identici. In mappa il pulse resta vivo; il tick e le molle
    // continuano anche quando non occorre ridisegnare.
    if(!axisTransport.active&&(crimpEased>.01||reducedMotion.matches)&&samePaintInputs(lastPaintedFrame,frame)){
      commitFrameFeedback(frame,{terraceCurveCache,ghostSlotsLoggedChapter,profileFrame});
      return;
    }
    const pending=drawEvaluated(frame);
    // Il segnale ambientale e' campionato dopo la geometria, nella fase del disegno.
    // Anche l'overlay legge uno stato esplicito; nessun orologio nel disegno.
    frame.pulse=reducedMotion.matches?.5:.5+.5*Math.sin((performance.now()-t0)/380);
    frame.layers.pulse=frame.pulse;frame.layers.pulseAlpha=.35+.45*frame.pulse;
    commitFrameFeedback(frame,pending.finish(frame));
    lastPaintedFrame=frame;
  }
  // Feedback dell'avanzamento: nessuna memoria viene conservata dal disegno.
  function commitFrameFeedback(frame,result){
    // Memoria derivata esplicita: il calcolo la usa nel tick/LOD successivo.
    displayPts=frame.displayPts;displayCellScale=frame.displayCellScale;
    tiltNow=frame.tiltNow;lastCogScaleDyn=frame.cogScaleDyn;
    effRadius=frame.effRadius;effInfluence=frame.effInfluence;lodTarget=frame.lodTarget;
    terraceCurveCache=result.terraceCurveCache;ghostSlotsLoggedChapter=result.ghostSlotsLoggedChapter;
    profileFrame=result.profileFrame;
  }
  function drawEvaluated(evaluated){
    lastPaintedFrame=null; // Anche le catture DEV dirette invalidano il raster precedente.
    const {transform,cogCenter,rotPivot,crimpEased,tiltEased,planRot,displayPts,displayCellScale,
      birthEased,fictBirthEased,focalEased,occEased,occSeq,focalizer,chapter,seqMode,seqPos,
      roleSortEased,roleSortTarget,lodEased,routeHoverEased,routeHotSet,routeHoverRoutes,
      routeSelection,hostIndex,hoverTerrace,currentRibbonTick,activeRanked,baseTransform,
      profileTickMs,profileHitMs,seqOccCallsPerSecond,invK,tiltNow,cogScaleDyn,zScaleNow,zScaleDraw,
      rotNow,rotSinNow,rotCosNow,cognitiveBirthScale}=evaluated;
    let {terraceCurveCache,ghostSlotsLoggedChapter,profileFrame}=evaluated;
    const roleBands=evaluated.roleData?readRoleSnapshot(evaluated.roleData,painters):null;
    const drawMotion=evaluated.transition||(import.meta.env.DEV?evaluated.motionLab:null);
    const traceIsoline=drawMotion?.traceIsoline||traceRestingIsoline;
    let contentAlpha=(i,opts)=>contentAlphaOf(evaluated,i,opts);
    let drawBackdrop=atlasMapBackdrop.draw,axonRendering=tiltEased>.01;
    if(drawMotion){contentAlpha=drawMotion.alpha;drawBackdrop=drawMotion.backdrop;axonRendering=tiltEased>0;}
    const bandsOfTile=i=>evaluated.bands[i];
    const offmapPresence=()=>evaluated.offmapPresenceValue;
    const deform=(px,py)=>tiltEased>.01?[px,py]:atlasSupport.deformPoint({px,py,drop:evaluated.drop,effRadius:evaluated.effRadius,transform,crimpEased});
    const nearDrop=box=>tiltEased>.01?false:atlasSupport.nearDropBBox({box,drop:evaluated.drop,effInfluence:evaluated.effInfluence});
    const profileT0=evaluated.profileT0;
    let profileTiles=0,profileCurves=0,profileFills=0,profileStrokes=0;
    let profileDisplayMs=evaluated.profileEvaluationMs||0,profileDrawOrderMs=0,profileReliefMs=0,profileBordersMs=0,profileRulerMs=0;
    const drawDepthKey=[];
    let pickMetricsForTile = null;
    const roleMode = focalizer != null;
    const roleMarksOf = i => {
      if (!roleMode) return null;
      const r = roleBands.chapterRankByTile[i];
      const R = roleBands.chapterStepCount();
      const highlight = r < 0
        ? 0
        : CONSTELLATION_FLOOR + (1 - CONSTELLATION_FLOOR) * Math.pow(CONSTELLATION_DECAY, R - r);
      const ri = roleBands.lastRoleByTile[i];
      const routeTerrace = (!frame.lodCollapse && i === routeSelection.tileIndex) ? routeSelection.terrace : -1;
      const hoverIsolate = routeTerrace < 1 && !frame.lodCollapse && hostIndex === i && hoverTerrace >= 1;
      return {
        highlight,
        terrace: routeTerrace >= 1 ? routeTerrace : (hoverIsolate ? hoverTerrace : -1),
        isolate: hoverIsolate,
        highlightColor: ri >= 0 ? atlasConfig.ROLE_COLORS[atlasConfig.ROLE_ORDER[ri]] : INK_COLOR,
        ribbonLinked: currentRibbonTick != null && currentRibbonTick.tileIndex === i,
        isRouteHot: routeHotSet.has(i),
        routeRgb: atlasRouteNodes.routeRgb,
        // Determinazione della riga del personaggio rappresentata dalla terrazza k, mai della banda o del luogo.
        determination: k => bandRow(evaluated.roleData, sequence, focalizer, roleSortTarget > 0.5, i, k)?.determination ?? null
      };
    };
    const frame = {
      transform,
      cogCenter,
      rotPivot,
      crimpEased,
      tiltEased,
      tiltNow,
      planRot,
      displayPts,
      displayCellScale,
      birthEased,
      fictBirthEased,
      focalEased,
      offmapPresence: offmapPresence(),
      contentAlpha,
      invK,
      rotSinNow,
      rotCosNow,
      zScaleNow,
      zScaleDraw,
      painters,
      lodCollapse: lodEased < 0.5,
      pickTile: hostIndex,
      stashCurves: (i, curves) => {
        if (i !== hostIndex) return;
        const pickMetrics = pickMetricsForTile || {};
        terraceCurveCache = {
          index: i, curves,
          tiltNow, rotSinNow, rotCosNow, zScale: frame.zScaleDraw, invK,
          B: pickMetrics.B || Math.max(0, curves.length - 1),
          packing: pickMetrics.packing || 0,
          rMed: pickMetrics.rMed || 0,
          crimpEased,
          transformK: transform.k
        };
        logPickDiagnostics(terraceCurveCache);
      },
      roleMode,
      cellRings,
      profile: PROFILE ? {
        fillCalls: 0,
        strokeCalls: 0,
        reserveStrokes: 0,
        baseContourMs: 0,
        traceMs: 0,
        fillBuildMs: 0,
        fillRasterMs: 0,
        strokePtsMs: 0,
        quadCount: 0,
        ribbonCount: 0,
        nestedBandCount: 0,
        nestedFallbacks: 0,
        fillLenASum: 0,
        fillLenBSum: 0,
        fillLenCalls: 0
      } : null
    };
    function cellPoint(i, x, y, withDrop = true) {
      const cr = cellRings[i];
      if (!cr) return [x, y];
      const birthScale = 1 + (cognitiveBirthScale[i] - 1) * crimpEased;
      const s = displayCellScale[i] * birthScale;
      const px = displayPts[i][0] + (x - cr.gx) * s;
      const py = displayPts[i][1] + (y - cr.gy) * s;
      return withDrop ? deform(px, py) : [px, py];
    }

    function formatMetricIsoline(dKm) {
      return it.metricDistance(dKm);
    }

    // Catena della figura. Una lettura del canvas a metà disegno (determinazione) riparte da qui con le stesse
    // operazioni: una matrice impostata in un colpo solo cambierebbe l'antialias dei tratti successivi.
    const figureChain = () => {
      context.translate(transform.x, transform.y);
      context.scale(transform.k, transform.k);
      context.translate(-bbox[0], -bbox[1]);
      context.translate(rotPivot[0], rotPivot[1]);
      context.scale(1, tiltNow);
      context.rotate(rotNow);
      context.translate(-rotPivot[0], -rotPivot[1]);
    };
    frame.reapplyTransform = () => { context.setTransform(baseTransform); figureChain(); };
    context.setTransform(baseTransform);
    context.clearRect(viewRect.x0,viewRect.y0,viewRect.x1-viewRect.x0,viewRect.y1-viewRect.y0);
    context.fillStyle=BG_COLOR; context.fillRect(viewRect.x0,viewRect.y0,viewRect.x1-viewRect.x0,viewRect.y1-viewRect.y0);
    figureChain();

    // Fondo a carta storica spenta: orientamento o varianti di sviluppo, solo nella geografia.
    const fondoMode = atlasConfig.PAPER.mode, mapOn = !!historical && historical.opacity > 0 && !historical.failed;
    fondoCredit.textContent = !mapOn && crimpEased < .5 ? fondo.credit(fondoMode) : ""; fondoCredit.hidden = !fondoCredit.textContent;
    updateScaleBar(true, crimpEased, tiltEased);
    // Carta storica: con il ritaglio per tessera si disegna dopo le terrazze (qui sotto); altrimenti sotto la figura.
    if(historical&&!atlasConfig.HISTORICAL.perTile)historical.draw(context,evaluated,evaluated.historical||historical.snapshot(),fitScale);
    const paper=historical?.reserve();
    frame.historicalReserve=paper&&{...paper,width:atlasConfig.HISTORICAL.reserveCSS*invK/fitScale};
    // Orientamento (acque, mura, costa): sotto i bordi delle celle e le terrazze, ritagliato al riquadro della
    // tassellazione, così sfuma al bordo insieme alla figura.
    if (!mapOn && fondoMode === "orientamento" && crimpEased < .99) {
      context.save(); context.beginPath(); context.rect(bbox[0], bbox[1], bbox[2] - bbox[0], bbox[3] - bbox[1]); context.clip();
      fondo.draw(context, {mode: fondoMode, alpha: 1 - crimpEased, unit: invK / fitScale}); context.restore();
    }
    const backdrop = drawBackdrop({
      context, PROFILE, crimpEased, activeRanked, chapter, METRIC_ISOLINES_KM,
      invK, cogCenter, cogScaleDyn, GRID_COLOR, GRID_ALPHA, RING_GUIDE_ALPHA,
      RING_GUIDE_WIDTH, BORDER_WIDTH, segments, nearDrop, deform, cellRings,
      N_INMAP, N_GEO, fictBirthEased, birthEased, BIRTH_EPSILON, isBorn,
      contentAlpha, cellPoint, displayPts, cognitiveTileRadius, displayCellScale,
      offmapPresence, cellOutline, ringLevel: atlasConfig.RINGS.levels[atlasConfig.RINGS.level], cssUnit: invK / fitScale
    });
    ringLabelsFrame = backdrop.ringLabels;
    const metricTicks = backdrop.metricTicks;
    profileBordersMs = backdrop.profileBordersMs;

    let reliefFull = new Path2D();
    // i fittizi usano un hue distinto (FICT_HUE_RGB) dal rosso referenziale: path separati
    let reliefFictFull = new Path2D();
    let fillPaths     = Array.from({length: BANDS_MAX + 1}, () => new Path2D());
    let fillPathsFict = Array.from({length: BANDS_MAX + 1}, () => new Path2D());

    function isoFillAlpha(k) {
      const t = (k - 1) / (BANDS_MAX - 1);
      return ISO_FILL_A0 + (ISO_FILL_A1 - ISO_FILL_A0) * Math.pow(t, ISO_FILL_GAMMA);
    }

    function flushIsoFill() {
      if (!ISO_FILL) return;
      for (let k = 1; k <= BANDS_MAX; k++) {
        context.fillStyle = `rgba(${HUE_RGB},${isoFillAlpha(k)})`;
        context.fill(fillPaths[k]);
        if (PROFILE) profileFills++;
        context.fillStyle = `rgba(${FICT_HUE_RGB},${isoFillAlpha(k) * atlasConfig.FICT_FILL_SCALE})`;
        context.fill(fillPathsFict[k]);
        if (PROFILE) profileFills++;
      }
      fillPaths     = Array.from({length: BANDS_MAX + 1}, () => new Path2D());
      fillPathsFict = Array.from({length: BANDS_MAX + 1}, () => new Path2D());
    }

    function reliefVisibleIndex(i) {
      const cr = cellRings[i];
      const isFict = i >= N_GEO;
      const isOffmap = i >= N_INMAP && i < N_GEO;
      if(drawMotion&&!evaluated.reliefVisible[i])return false;
      if (!cr && !isFict && !isOffmap) return false;
      if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) return false;
      if (isOffmap && offmapPresence() <= BIRTH_EPSILON) return false;
      const visible = isFict ? fictBirthEased[i] : birthEased[i];
      return !(crimpEased > 0.01 && visible <= BIRTH_EPSILON);
    }

    const profileDrawOrderT0 = PROFILE ? performance.now() : 0;
    const drawOrder = axonRendering
      ? d3.range(cellRings.length).filter(reliefVisibleIndex)
      : d3.range(cellRings.length);
    if (axonRendering) {
      for (const i of drawOrder) drawDepthKey[i] = displayPts[i][0] * rotSinNow + displayPts[i][1] * rotCosNow;
      drawOrder.sort((a, b) => d3.ascending(drawDepthKey[a], drawDepthKey[b]) || d3.ascending(a, b));
    }
    if (PROFILE) profileDrawOrderMs = performance.now() - profileDrawOrderT0;

    const profileReliefT0 = PROFILE ? performance.now() : 0;
    const routePointOf = i => {
      const cr = cellRings[i];
      const point = cr ? cellPoint(i, cr.gx, cr.gy, false) : displayPts[i];
      return {point, z: painters.axonZOf(bandsOfTile(i)) * zScaleDraw};
    };
    const routeStepPoints = routeHoverEased > 0.01
      ? atlasRouteHoverDrawing.buildStepPoints({ routes: routeHoverRoutes, routePointOf, birthEased, fictBirthEased, N_GEO, BIRTH_EPSILON })
      : [];
    const haloProfile = PROFILE && profileFrame % 60 === 0 ? {calls: 0, samples: []} : null;
    if (roleMode && seqMode && crimpEased > 0.99) {
      for (const i of drawOrder) {
        const cr = cellRings[i];
        const isFict = i >= N_GEO;
        const isOffmap = i >= N_INMAP && i < N_GEO;
        if (!cr && !isFict && !isOffmap) continue;
        if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) continue;
        if (isOffmap && offmapPresence() <= BIRTH_EPSILON) continue;
        if (!isFict && !isOffmap && birthEased[i] <= BIRTH_EPSILON) continue;
        const roleMarks = roleMarksOf(i);
        const markHighlight = roleMarks?.ribbonLinked ? 1 : (roleMarks?.highlight || 0);
        if (markHighlight <= 0.01) continue;
        const birthScale = 1 + (cognitiveBirthScale[i] - 1) * crimpEased;
        const sCell = displayCellScale[i] * birthScale;
        const radius = isOffmap ? cognitiveTileRadius[i] * sCell : (isoProfileMed[i] || 0) * sCell;
        if (haloProfile) {
          haloProfile.calls++;
          if (haloProfile.samples.length < 3) {
            haloProfile.samples.push({
              i,
              Toponym: allData[i]?.properties?.Toponym || "",
              markHighlight: +markHighlight.toFixed(3),
              radius: +radius.toFixed(2),
              strength: +markHighlight.toFixed(3),
              rTilePx: +(radius * transform.k).toFixed(1),
              rHaloPx: +(radius * atlasConfig.CONSTELLATION_RADIUS_GAIN * transform.k).toFixed(1),
              offPx: +(radius * atlasConfig.HALO_POOL_OFFSET * tiltEased * transform.k).toFixed(1),
              displayPt: displayPts[i]?.slice()
            });
          }
        }
        painters.drawGroundHalo(frame, displayPts[i][0], displayPts[i][1], radius, roleMarks.highlightColor, markHighlight);
      }
    }
    if (haloProfile) {
      const lit = [];
      for (const i of drawOrder) {
        const rm = roleMarksOf(i);
        const h = rm?.ribbonLinked ? 1 : (rm?.highlight || 0);
        if (h > 0.01 && displayPts[i]) lit.push(displayPts[i]);
      }
      let nn = Infinity;
      for (let a = 0; a < lit.length; a++) {
        for (let b = a + 1; b < lit.length; b++) {
          const d = Math.hypot(lit[a][0] - lit[b][0], lit[a][1] - lit[b][1]);
          if (d < nn) nn = d;
        }
      }
      haloProfile.litCount = lit.length;
      haloProfile.nnPx = Number.isFinite(nn) ? +(nn * transform.k).toFixed(1) : null;
      haloProfile.k = +transform.k.toFixed(2);
      haloProfile.tilt = +tiltEased.toFixed(2);
    }
    if (haloProfile) atlasProfileLog.halo(haloProfile);
    for (const i of drawOrder){
      if(drawMotion&&!evaluated.reliefVisible[i])continue;
      const cr = cellRings[i];
      const isFict = i >= N_GEO;
      const isOffmap = i >= N_INMAP && i < N_GEO;
      if (!cr && !isFict && !isOffmap) continue;
      if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) continue;
      if (isOffmap && offmapPresence() <= BIRTH_EPSILON) continue;
      const visible = isFict ? fictBirthEased[i] : birthEased[i];
      if (crimpEased > 0.01 && visible <= BIRTH_EPSILON) continue;
      const occ = occEased[i];
      const B = evaluated.bands[i];
      const [px, py] = displayPts[i];
      const drawFictSummitGlyph = () => {
        const glyphB = axonRendering ? B : 0;
        const [cx, cy] = painters.zPoint(frame, px, py, painters.axonZOf(glyphB) * (drawMotion?zScaleNow*drawMotion.tileTilt[i]:zScaleDraw));
        const gr = cognitiveTileRadius[i] * displayCellScale[i] * 0.5;
        const status = allData[i].properties.reality_status;
        // Glifo inscritto: dentro la propria tessera, alla quota della cima, tratto in px CSS.
        let inscribe = null, ring = null;
        if (atlasConfig.GLYPH.mode === "inscribed" && cr?.ring) {
          const s = displayCellScale[i] * (1 + (cognitiveBirthScale[i] - 1) * crimpEased), dx = cx - px, dy = cy - py, clip = new Path2D();
          ring = cr.ring.map(([x, y]) => [px + (x - cr.gx) * s + dx, py + (y - cr.gy) * s + dy]);
          ring.forEach(([X, Y], k) => { if (k) clip.lineTo(X, Y); else clip.moveTo(X, Y); });
          clip.closePath();
          inscribe = {clip, radius: inscribedRadius(i) * s * atlasConfig.GLYPH.inscribedFraction, width: atlasConfig.GLYPH.strokeCSS * invK / fitScale};
        }
        context.save();
        context.globalAlpha = contentAlpha(i, {presence: fictBirthEased[i]});
        const statusMode = atlasConfig.STATUS.mode;
        if (statusMode === "glifo" || !ring) {
          // il glifo segue il nome dello statuto; niente ripiego su «invented»
          painters.drawFictGlyph(frame, cx, cy, gr, status, inscribe);
        } else painters.drawStatusMark(frame, statusMode, status, cx, cy, ring, inscribe, statusMode === "ricalco" ? hostTrace(i, cx, cy, inscribe.radius) : null, {...atlasConfig.STATUS, axon: axonRendering, offsetPx: atlasConfig.STATUS.offsetCSS * invK / fitScale, minInscribedPx: atlasConfig.STATUS.minInscribedCSS * invK / fitScale, lineWidth: BORDER_WIDTH * invK,
            reservePx: atlasConfig.STATUS.inventedReserveCSS * invK / fitScale, siglaMinPx: atlasConfig.STATUS.siglaMinCSS * invK / fitScale});
        context.restore();
      };
      if (B <= 0 && !axonRendering) {
        if (isFict) drawFictSummitGlyph();
        continue;
      }
      const birthScale = 1 + (cognitiveBirthScale[i] - 1) * crimpEased;
      const sCell = displayCellScale[i] * birthScale;

      if (focalizer == null && profileTiles > 0 && profileTiles % 20 === 0) {
        flushIsoFill();
        context.lineWidth = ISO_WIDTH * invK;
        context.strokeStyle = `rgba(${HUE_RGB},${ISO_ALPHA})`;
        context.stroke(reliefFull);
        if (PROFILE) profileStrokes++;
        reliefFull = new Path2D();
        context.strokeStyle = `rgba(${FICT_HUE_RGB},${FICT_RELIEF_ALPHA})`;
        context.stroke(reliefFictFull);
        if (PROFILE) profileStrokes++;
        reliefFictFull = new Path2D();
      }

      const target = isFict ? reliefFictFull : reliefFull;
      // indice di forma congelato, non la posizione in allData: una
      // feature che entra o esce non cambia il rilievo delle altre
      const shapeK = allData[i].properties.shapeIndex;
      const seed = isFict
        ? (allData[i].properties.voidSeed ?? (shapeK * 0.6180339887) % 1)
        : (shapeK * 0.6180339887) % 1;

      let radii, rMin, rMed;
      if (isOffmap) {
        const rr = cognitiveTileRadius[i] * sCell;
        radii = null;                  // profilo costante: nessun array da allocare
        rMin = rMed = rr;
      } else {
        radii = isoProfile[i];
        if (!radii) continue;
        rMin = isoProfileMin[i] * sCell;
        rMed = isoProfileMed[i] * sCell;
      }
      if (rMin <= 0) continue;

      const nL = B;
      profileTiles++;
      profileCurves += nL;
      const bandPx = Math.max(1, nL) * ISO_MIN_SPACING * invK;
      const packing = Math.min(1, bandPx / (rMed * (ISO_OUTER - ISO_INNER)));

      if (axonRendering) {
        const bandTint = roleMode
          ? (frame.lodCollapse
              ? roleBands.dominantTint({tileIndex: i, painters})
              : roleBands.bandTint({tileIndex: i, painters, sortEased: roleSortEased}))
          : null;
        if(bandTint&&drawMotion){bandTint.collapsed=roleBands.dominantTint({tileIndex:i,painters});bandTint.full=roleBands.bandTint({tileIndex:i,painters,sortEased:roleSortEased});}
        const roleMarks = roleMarksOf(i);
        pickMetricsForTile = {B, packing, rMed};
        if(drawMotion){
          drawMotion.paintRelief({i,B,px,py,radii,rMin,sCell,rMed,seed,packing,traceIsoline,isoFillAlpha},()=>painters.drawAxonReliefTile(drawMotion.tileFrame(frame,i),traceIsoline,isoFillAlpha,i,B,px,py,radii,rMin,sCell,rMed,seed,packing,isFict,bandTint,roleMarks));
        }else painters.drawAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint, roleMarks);
        if (isFict) drawFictSummitGlyph();
        continue;
      }

      if(drawMotion&&(isFict||isOffmap)){
        drawMotion.planar({i,B,px,py,radii,rMin,sCell,rMed,seed,packing,traceIsoline,isoFillAlpha});
        if(isFict)drawFictSummitGlyph();continue;
      }
      if (focalizer != null) {
        const focal = contentAlpha(i);
        const tileTarget = new Path2D();
        const tileFillPaths = ISO_FILL ? Array.from({length: BANDS_MAX + 1}, () => new Path2D()) : null;
        for (let k = 0; k < nL; k++) {
          const level = (k + 1) / nL;
          const absLevel = k + 1;
          const fillTarget = ISO_FILL ? tileFillPaths[absLevel] : null;
          const traceT0 = PROFILE ? performance.now() : 0;
          traceIsoline(tileTarget, fillTarget, px, py, radii, rMin, sCell, rMin, rMed, seed, level, packing, null, 0);
          if (PROFILE && frame.profile) frame.profile.traceMs += performance.now() - traceT0;
        }
        if (ISO_FILL) {
          for (let k = 1; k <= nL; k++) {
            context.fillStyle = `rgba(${isFict ? FICT_HUE_RGB : HUE_RGB},${isoFillAlpha(k) * focal * (isFict ? atlasConfig.FICT_FILL_SCALE : 1)})`;
            context.fill(tileFillPaths[k]);
            if (PROFILE) profileFills++;
          }
        }
        context.lineWidth=ISO_WIDTH*invK;
        context.strokeStyle = `rgba(${isFict ? FICT_HUE_RGB : HUE_RGB},${(isFict ? FICT_RELIEF_ALPHA : ISO_ALPHA) * focal})`;
        context.stroke(tileTarget);
        if (roleMode && cr && cr.ring && cr.ring.length >= 3 && routeHotSet.has(i)) {
          context.save();
          context.beginPath();
          const q0 = cellPoint(i, cr.ring[0][0], cr.ring[0][1], true);
          context.moveTo(q0[0], q0[1]);
          for (let j = 1; j < cr.ring.length; j++) {
            const q = cellPoint(i, cr.ring[j][0], cr.ring[j][1], true);
            context.lineTo(q[0], q[1]);
          }
          context.closePath();
          context.globalAlpha = 0.95 * focal;
          context.lineWidth = 3 * invK;
          context.lineJoin = "round";
          context.strokeStyle = atlasRouteNodes.routeRgb;
          context.shadowColor = atlasRouteNodes.routeRgb;
          context.shadowBlur = 14;
          context.stroke();
          context.restore();
        }
        if (PROFILE) profileStrokes++;
        if (isFict) drawFictSummitGlyph();
        continue;
      }

      for (let k = 0; k < nL; k++) {
        const level = (k + 1) / nL;
        const absLevel = k + 1;
        const fillTarget = isFict ? fillPathsFict[absLevel] : fillPaths[absLevel];
        const traceT0 = PROFILE ? performance.now() : 0;
        traceIsoline(target, fillTarget, px, py, radii, rMin, sCell, rMin, rMed, seed, level, packing, null, 0);
        if (PROFILE && frame.profile) frame.profile.traceMs += performance.now() - traceT0;
      }
      if (isFict) drawFictSummitGlyph();
    }
    if (focalizer == null) {
      flushIsoFill();
      context.lineWidth=ISO_WIDTH*invK;
      context.strokeStyle = `rgba(${HUE_RGB},${ISO_ALPHA})`;
      context.stroke(reliefFull);
      if (PROFILE) profileStrokes++;
      context.strokeStyle = `rgba(${FICT_HUE_RGB},${FICT_RELIEF_ALPHA})`;
      context.stroke(reliefFictFull);
      if (PROFILE) profileStrokes++;
    }
    if (PROFILE && frame.profile) {
      profileFills += frame.profile.fillCalls;
      profileStrokes += frame.profile.strokeCalls;
    }
    if (PROFILE) profileReliefMs = performance.now() - profileReliefT0;

    // contorno di Roma: geografico, quindi sfuma nello stato cognitivo
    if (historical && atlasConfig.HISTORICAL.perTile) {
      // Ogni tessera reale porta il ritaglio della carta: posizione e scala con cui la tessera è disegnata ora.
      const tiles = [];
      for (let i = 0; i < N_GEO; i++) {
        const cr = cellRings[i]; if (!cr) continue;
        const born = (birthEased[i] || 0) > BIRTH_EPSILON, alpha = born ? 1 : 1 - crimpEased; if (alpha <= 0.002) continue;
        const s = displayCellScale[i] * (1 + (cognitiveBirthScale[i] - 1) * crimpEased);
        tiles.push({ring: cr.ring, g: [cr.gx, cr.gy], at: displayPts[i], s, alpha});
      }
      historical.draw(context, evaluated, evaluated.historical || historical.snapshot(), fitScale, tiles);
    }
    // Carta spenta (PAPER.mode): 'corone' cerchi delle distanze del diagramma attorno al polo, nella
    // geografia; 'grana' grana di carta deterministica, fissa allo schermo; 'piana' il fondo attuale.
    const paperMode = atlasConfig.PAPER.mode, geoAlpha = 1 - crimpEased;
    if (paperMode === "corone" && geoAlpha > 0.01 && poleIndex >= 0) {
      const center = pts[poleIndex], [lon, lat] = projection.invert(center), unit = invK / fitScale;
      context.save(); context.globalAlpha = geoAlpha;
      context.strokeStyle = `rgba(${GRID_COLOR},${atlasConfig.PAPER.ringAlpha})`; context.lineWidth = 0.8 * unit; context.setLineDash([2 * unit, 4 * unit]);
      context.font = `500 ${11 * unit}px ${atlasConfig.ANNOTATION.family}`; context.fillStyle = `rgba(${GRID_COLOR},0.9)`; context.textAlign = "center"; context.textBaseline = "bottom";
      for (const km of METRIC_ISOLINES_KM) {
        const edge = projection([lon, lat + km / 110.574]), r = Math.hypot(edge[0] - center[0], edge[1] - center[1]);
        context.beginPath(); context.arc(center[0], center[1], r, 0, 2 * Math.PI); context.stroke();
        context.fillText(it.metricDistance(km), center[0], center[1] - r - 2 * unit);
      }
      context.restore();
    }
    // A tutto schermo la tassellazione sfuma verso il fondo al bordo del suo riquadro: nessun filo di cornice.
    const edgeAlpha = atlasConfig.FRAME.mode === "pieno" ? 1 - crimpEased : 0;
    if (edgeAlpha > 0.001) {
      const [x0, y0, x1, y1] = bbox, band = Math.min(x1 - x0, y1 - y0) * atlasConfig.FRAME.fadeFraction;
      const bg = d3.color(BG_COLOR), solid = `rgba(${bg.r},${bg.g},${bg.b},1)`, clear = `rgba(${bg.r},${bg.g},${bg.b},0)`;
      context.save(); context.globalAlpha = edgeAlpha;
      for (const [ax, ay, bx, by, rx, ry, rw, rh] of [[x0, 0, x0 + band, 0, x0 - 1, y0 - 1, band + 1, y1 - y0 + 2], [x1, 0, x1 - band, 0, x1 - band, y0 - 1, band + 1, y1 - y0 + 2],
        [0, y0, 0, y0 + band, x0 - 1, y0 - 1, x1 - x0 + 2, band + 1], [0, y1, 0, y1 - band, x0 - 1, y1 - band, x1 - x0 + 2, band + 1]]) {
        const g = context.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, solid); g.addColorStop(1, clear);
        context.fillStyle = g; context.fillRect(rx, ry, rw, rh);
      }
      context.restore();
    }
    // Il fondo attuale (varianti di sviluppo) sta dopo la sfumatura del bordo, fuso per moltiplica: nessuna cornice chiara.
    if (!mapOn && (fondoMode === "raster" || fondoMode === "tratti")) fondo.draw(context, {mode: fondoMode, alpha: 1 - crimpEased, unit: invK / fitScale});
    // La grana segue la sfumatura del bordo: copre in modo uniforme tutta la finestra.
    if (paperMode === "grana" || atlasConfig.PAPER.grain) {
      paperGrain ??= makePaperGrain();
      context.save(); context.setTransform(1, 0, 0, 1, 0, 0); context.globalAlpha = atlasConfig.PAPER.grainAlpha;
      context.fillStyle = context.createPattern(paperGrain, "repeat"); context.fillRect(0, 0, canvas.width, canvas.height); context.restore();
    }
    const romaAlpha = evaluated.layers.romaAlpha;
    if (romaAlpha > 0.001) {
      context.save();
      context.globalAlpha = romaAlpha;
      context.beginPath(); geoPath(roma.features[0]);
      context.lineWidth=ROMA_WIDTH*invK; context.lineJoin="round"; context.strokeStyle=INK_COLOR; context.stroke();
      context.restore();
    }

    ({ghostSlotsLoggedChapter} = atlasGhostSlots.draw({
      context, PROFILE, SHOW_GHOST_SLOTS, crimpEased, chapter,
      ghostSlotsLoggedChapter, ghostSlots, primaryHostOf, fictBirthEased, birthEased,
      contentAlpha, BIRTH_EPSILON, allData, birthChapter,
      cogCenter, cogScaleDyn, displayPts, invK, BORDER_WIDTH, GRID_COLOR,
      style: atlasConfig.GHOST.style, cssUnit: invK / fitScale, active: activePlace,
      glyph: {paths: atlasConfig.FICT_GLYPH_PATHS, box: atlasConfig.FICT_GLYPH_BOX, ink: INK_RGB_STR, statusOf: j => allData[j].properties.reality_status}
    }));

    // Etichette sulle corone (livello «marcato»): a 45° in alto a destra, diritte, con alone di carta.
    if (ringLabelsFrame && crimpEased > .01) {
      const unit = invK / fitScale; context.save(); context.globalAlpha = crimpEased;
      context.font = `500 ${12 * unit}px ${atlasConfig.ANNOTATION.family}`; context.textAlign = "left"; context.textBaseline = "middle";
      for (const [dKm, r] of ringLabelsFrame) {
        const a = -Math.PI / 4 - rotNow, x = cogCenter[0] + Math.cos(a) * r, y = cogCenter[1] + Math.sin(a) * r;
        context.save(); context.translate(x, y); context.rotate(-rotNow); context.scale(1, 1 / Math.max(.2, tiltNow));
        context.lineWidth = 3 * unit; context.strokeStyle = BG_COLOR; context.strokeText(it.metricDistance(dKm), 4 * unit, 0);
        context.fillStyle = INK_COLOR; context.fillText(it.metricDistance(dKm), 4 * unit, 0); context.restore();
      }
      context.restore();
    }
    // Tessera attiva (ACTIVE.style): resta distinguibile in ogni vista; per un luogo con più ancore si accende il gruppo.
    activeScreen = null;
    if (activePlace != null && allData[activePlace]) {
      const unit = invK / fitScale, style = atlasConfig.ACTIVE.style, i = activePlace, diag = crimpEased > .5;
      const polyOf = j => { const cr = cellRings[j]; if (!cr?.ring) return null; return cr.ring.map(([x, y]) => cellPoint(j, x, y, false)); };
      const others = [], links = [];
      let main = null, mainPt = null;
      if (i >= N_GEO) {
        // Luogo narrativo: nelle relazioni la sua tessera e i suoi spazi fantasma; in geografia i luoghi d'ancoraggio.
        if (diag && (fictBirthEased[i] || 0) > BIRTH_EPSILON) { main = polyOf(i); mainPt = displayPts[i];
          for (const slot of ghostSlots.get(i) || []) { const poly = slot.polygon.map(p => [cogCenter[0] + p[0] * cogScaleDyn, cogCenter[1] + p[1] * cogScaleDyn]); others.push(poly); links.push([mainPt, [cogCenter[0] + slot.pt[0] * cogScaleDyn, cogCenter[1] + slot.pt[1] * cogScaleDyn]]); } }
        else for (const id of allData[i].properties.refers_to_entity_ID || []) { const j = allDataById.get(id); if (j != null && j < N_GEO) { const poly = polyOf(j); if (poly) { if (!main) { main = poly; mainPt = displayPts[j]; } else { others.push(poly); links.push([mainPt, displayPts[j]]); } } } }
      } else { main = polyOf(i); mainPt = displayPts[i]; }
      const path = poly => { const p2 = new Path2D(); poly.forEach(([x, y], k) => k ? p2.lineTo(x, y) : p2.moveTo(x, y)); p2.closePath(); return p2; };
      if (main) {
        context.save(); context.lineJoin = "round";
        if (style === "attenua") {
          const veil = new Path2D(); veil.rect(viewRect.x0 * 4 - 1e5, viewRect.y0 * 4 - 1e5, 2e5 + (viewRect.x1 - viewRect.x0) * 8, 2e5 + (viewRect.y1 - viewRect.y0) * 8);
          for (const poly of [main, ...others]) veil.addPath(path(poly));
          context.fillStyle = `rgba(241,231,208,${atlasConfig.ACTIVE.veil})`; context.fill(veil, "evenodd");
        }
        if (style === "retro") { context.shadowColor = `rgba(${INK_RGB_STR},.5)`; context.shadowBlur = 16 * (window.devicePixelRatio || 1); }
        // Alone di carta sotto il filo d'inchiostro: il filo si legge anche sopra la carta storica e le terrazze.
        for (const [poly, current] of [[main, true], ...others.map(o => [o, false])]) {
          const p2 = path(poly);
          context.strokeStyle = "rgba(252,250,244,.95)"; context.lineWidth = (current ? 5 : 3.6) * unit; context.stroke(p2);
          context.shadowBlur = 0;
          context.strokeStyle = current ? INK_COLOR : `rgba(${INK_RGB_STR},.7)`; context.lineWidth = (current ? 1.9 : 1.1) * unit; context.stroke(p2);
        }
        // Cerchio di richiamo: con tessere piccole (vista intera) la tessera attiva si trova a colpo d'occhio.
        const radiusOf = poly => Math.max(...poly.map(([x, y]) => Math.hypot(x - mainPt[0], y - mainPt[1])));
        const minR = atlasConfig.ACTIVE.minRingCSS * unit, rMain = radiusOf(main);
        if (rMain < minR * 1.6) for (const [poly, current] of [[main, true], ...others.map(o => [o, false])]) {
          const c = current ? mainPt : [poly.reduce((a, p) => a + p[0], 0) / poly.length, poly.reduce((a, p) => a + p[1], 0) / poly.length];
          const r = Math.max(minR * (current ? 1 : .75), (current ? rMain : 0) * 1.25);
          context.beginPath(); context.arc(c[0], c[1], r, 0, 2 * Math.PI);
          context.strokeStyle = "rgba(252,250,244,.95)"; context.lineWidth = 4 * unit; context.stroke();
          context.strokeStyle = current ? INK_COLOR : `rgba(${INK_RGB_STR},.7)`; context.lineWidth = (current ? 1.6 : 1) * unit; context.stroke();
        }
        if (links.length) { context.setLineDash([.1 * unit, 3.4 * unit]); context.lineCap = "round"; context.strokeStyle = `rgba(${INK_RGB_STR},.75)`; context.lineWidth = 1.6 * unit;
          for (const [a, b] of links) { context.beginPath(); context.moveTo(a[0], a[1]); context.lineTo(b[0], b[1]); context.stroke(); } context.setLineDash([]); }
        context.restore();
        const [sx, sy] = projectMotion(evaluated, {projection: atlasProjection}, mainPt);
        activeScreen = {x: frameOffset.x + sx * fitScale, y: frameOffset.y + sy * fitScale};
      }
    }
    updateActivePointer();
    return {finish(environment){
    const overlayProfile = atlasOverlays.draw({
      context, PROFILE, profileRulerMs, profileT0, profileFrame, cssUnit: invK / fitScale,
      crimpEased, transform, K2, chapter, pulse:environment.pulse, N_INMAP, N_GEO,
      geoData, allData, pts, displayPts, birthEased, fictBirthEased,
      BIRTH_EPSILON, HUE_RGB, GRID_COLOR, INK_COLOR, BG_COLOR,
      PULSE_R, DOT_RADIUS, LABEL_SIZE, GLOW_WIDTH, GLOW_BLUR,
      invK, contentAlpha, alphaBucket, metricTicks, cogCenter, cogScaleDyn,
      poleIndex, routeStepPoints, routeHoverEased, rotNow, tiltNow, routeRgb,
      roleMode, occSeq, occEased, hostIndex, hoverTerrace, roleBands, roleSortTarget,
      sequence, effRoleName, cellRings, cellPoint, frame,
      profileTiles, profileCurves, profileFills, profileStrokes,
      profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
      profileTickMs, profileHitMs, seqOccCallsPerSecond,
      formatMetricIsoline
    });
    profileFrame = overlayProfile.profileFrame;
    profileRulerMs = overlayProfile.profileRulerMs;
    return {terraceCurveCache,ghostSlotsLoggedChapter,profileFrame};
    }};
  }

  // D3 lavora in pixel CSS; il renderer e il picking nel dominio canonico.
  function gestureTransform(camera) {
    return d3.zoomIdentity.translate(frameOffset.x + camera.x * fitScale, frameOffset.y + camera.y * fitScale).scale(camera.k * fitScale);
  }
  function updateZoomLimits(base) {
    zoomBehavior.scaleExtent([fitScale * base * ZOOM_MIN, fitScale * base * ZOOM_MAX]);
  }
  const zoomBehavior = d3.zoom()
    .extent(() => [[0, 0], cssSize])
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .on("zoom", ev => {
      if (rotPivotSyncing) return;
      transform = d3.zoomIdentity.translate((ev.transform.x - frameOffset.x) / fitScale, (ev.transform.y - frameOffset.y) / fitScale).scale(ev.transform.k / fitScale);
      draw();
    })
    .on("end", () => {
      if (rotPivotSyncing) return;
      freezeRotPivot();
    });
  d3.select(canvas).call(zoomBehavior);

  let raf;
  // Il caricamento diretto conserva il limite numerico della molla esistente:
  // arrotondare al target intero cambierebbe bandsFor proprio sulla soglia di 1.
  function restingCount(target, gain) {
    let value = 0;
    for (let step = 0; step < 4000; step++) {
      const next = value + (target - value) * gain;
      if (next === value) return value;
      value = next;
    }
    return value;
  }

  function advanceMotion(){
    const profileTickT0 = PROFILE ? performance.now() : 0;
    const axisNow=performance.now();
    if(reducedMotion.matches){const key=[chapter,focalizer,seqMode,seqPos,roleSortTarget,roleFilter.join(','),axesKey(desiredAxes())].join('|');if(key!==lastReducedReading){snapNextFrame=true;lastReducedReading=key;resetAxisMotion();}drop.ts=drop.s=drop.vs=0;}
    if(!snapNextFrame)updateAxisRequest(axisNow);
    const morphScale = seqMode ? SEQ_MORPH_SCALE : 1;
    let remainingMotion = 0;
    const observe = error => { if (import.meta.env.DEV) remainingMotion = Math.max(remainingMotion, Math.abs(error)); };
    drop.x+=(drop.tx-drop.x)*SPRING;
    drop.y+=(drop.ty-drop.y)*SPRING;
    // La molla sotto-smorzata produce un singolo rimbalzo all'uscita del cursore.
    const as = (drop.ts - drop.s) * S_STIFF - drop.vs * S_DAMP;
    drop.vs += as; drop.s += drop.vs;
    lodEased += (lodTarget - lodEased) * (snapNextFrame ? 1 : CRIMP_MORPH * 3);
    observe(lodTarget - lodEased);
    // ospite dell'hover: calcolato una volta per frame, condiviso da tutti i loop di draw
    const hitState = atlasSupport.hitState({drop, chapter, crimpEased, tiltEased, planRot, rotPivot, transform, showFictitious, seqMode, seqPos});
    const sameHitState = atlasSupport.sameHitState(lastHitState, hitState);
    const tickInteractionFrame = interactionFrame();
    const profileHitT0 = PROFILE ? performance.now() : 0;
    if (sameHitState) {
      hostIndex = lastHitState.hostIndex;
    } else {
      // In assonometria l'hit test comprende tutte le quote del rilievo.
      const axonHit = tickInteractionFrame.tiltEased > 0.01 && drop.s > 0.5;
      hostIndex = drop.s > 0.5
        ? (axonHit
            ? interaction.findAxonHost(tickInteractionFrame, drop.x, drop.y, bandsOfTile, {focalActive: focalizer != null})
            : interaction.findDisplayHost(tickInteractionFrame, drop.x, drop.y))
        : -1;
      // i fittizi non hanno cella Voronoi (findDisplayHost li ignora): in diagramma
      // si prova il loro hit-test circolare come ripiego, cosi' l'hover copre anche loro
      if (hostIndex === -1 && drop.s > 0.5 && tickInteractionFrame.crimpEased > 0.01 && tickInteractionFrame.tiltEased <= 0.01) {
        hostIndex = interaction.findFictHost(tickInteractionFrame, drop.x, drop.y);
      }
      lastHitState = {...hitState, hostIndex};
    }
    hoverTerrace = (tickInteractionFrame.tiltEased > 0.01 && hostIndex >= 0 && drop.s > 0.5)
      ? atlasLodPicking.pickTerrace({terraceCurveCache, hostIndex, painters, x: drop.x, y: drop.y}) : -1;
    profileHitMs = PROFILE ? performance.now() - profileHitT0 : 0;
    const routeFrameState = atlasRouteNodes.frameState({selectedRouteId: routeSelection.id, focalizer, seqMode, seqPos, chapter});
    routeHotSet = routeFrameState.hot; routeHoverRoutes = routeFrameState.routes;
    routeHoverEased += ((routeSelection.id != null ? 1 : 0) - routeHoverEased) * (snapNextFrame ? 1 : ROUTE_HOVER_MORPH);
    observe((routeSelection.id != null ? 1 : 0) - routeHoverEased);
    if (seqMode) {
      chapter = chapterOfCursor(seqPos);
    }
    if (seqMode || focalizer != null) refreshOccSeq();
    const isBornNow = i => seqMode ? birthPos[i] <= seqPos : isBorn(i, chapter);
    const passageEndpoint=axisTransport.active?.context.end||pendingMotion?.context.end;
    const visibleNarrative=passageEndpoint?passageEndpoint.showFictitious:showFictitious;
    activeRanked = visibleNarrative ? rankedRadialFullByChapter : rankedRadialByChapter;
    const stateC = activeRanked[chapter];
    const Laz = stateC.layoutAzimuth;
    const LazFull = rankedRadialFullByChapter[chapter].layoutAzimuth;
    const placedFictNow = rankedRadialFullByChapter[chapter].placedFict;
    let hitLayoutInvalidated = false;
    for (let i=0;i<layoutPtsEased.length;i++){
      let tx, ty;
      if(passageEndpoint){[tx,ty]=layoutTarget(i,passageEndpoint,tickInteractionFrame);}
      else if (i < N_GEO && !cellRings[i] && crimpEased <= 0.01) {
        const p = interaction.spawnPointAlongAzimuth(tickInteractionFrame, geographicAngle[i]);
        tx = p[0]; ty = p[1];
      } else if (i >= N_GEO && crimpEased <= FICT_CRIMP_THRESHOLD) {
        tx = cogCenter[0]; ty = cogCenter[1];
      } else if (i >= N_GEO && (!showFictitious || !placedFictNow.has(i)) && isBornNow(i)) {
        const lazFullX = cogCenter[0] + LazFull[i][0], lazFullY = cogCenter[1] + LazFull[i][1];
        fictSpawnPt[i] = interaction.nearestViewportCorner(tickInteractionFrame, lazFullX, lazFullY);
        tx = fictSpawnPt[i][0]; ty = fictSpawnPt[i][1];
      } else if (isBornNow(i)) {
        const lazX = cogCenter[0] + Laz[i][0], lazY = cogCenter[1] + Laz[i][1];
        if (i >= N_GEO) fictSpawnPt[i] = interaction.nearestViewportCorner(tickInteractionFrame, lazX, lazY);
        tx = lazX;
        ty = lazY;
      } else {
        tx = Laz[i][0];
        ty = Laz[i][1];
      }
      // molla per-tessera: vicine al centro viewport = lente, lontane = rapide
      const m = snapNextFrame ? 1 : (LAYOUT_MORPH_SLOW + (LAYOUT_MORPH_FAST - LAYOUT_MORPH_SLOW) * gravRamp[i]) * morphScale;
      const prevX = layoutPtsEased[i][0], prevY = layoutPtsEased[i][1];
      advanceLayout(layoutPtsEased[i],[tx,ty],m);
      if(referenceLayout&&passageEndpoint){advanceLayout(referenceLayout[i],passageEndpoint.layoutPtsEased[i],m);layoutOffset[i][0]=layoutPtsEased[i][0]-referenceLayout[i][0];layoutOffset[i][1]=layoutPtsEased[i][1]-referenceLayout[i][1];}
      if (isBornNow(i) && (i < N_GEO || showFictitious)) { observe(tx - layoutPtsEased[i][0]); observe(ty - layoutPtsEased[i][1]); }
      if (layoutPtsEased[i][0] !== prevX || layoutPtsEased[i][1] !== prevY) hitLayoutInvalidated = true;
    }
    let hitStateInvalidated = false;
    for (let i=0;i<allData.length;i++){
      const target = (seqMode || focalizer != null) ? (occSeq[i] || 0) : occAt(i, chapter, focalizer);
      if (snapNextFrame) occEased[i] = restingCount(target, MORPH * morphScale);
      else occEased[i] += (target - occEased[i]) * MORPH * morphScale;
      observe(target - occEased[i]);
      const focalTarget = focalizer == null
        ? 1
        : (occAt(i, N_CHAPTERS, focalizer) > 0 ? 1 : (FOCAL_HIDE ? 0 : FOCAL_DIM_ALPHA));
      focalEased[i] += (focalTarget - focalEased[i]) * (snapNextFrame ? 1 : FOCAL_DIM_MORPH);
      observe(focalTarget - focalEased[i]);
      const birthTarget = isBornNow(i) ? 1 : 0;
      const prevBirth = birthEased[i];
      birthEased[i] += (birthTarget - birthEased[i]) * (snapNextFrame ? 1 : BIRTH_MORPH * morphScale);
      // fittizi: restano a 0 finche' non nati E il diagramma non e' aperto oltre soglia
      const fictBirthTarget = (showFictitious && i >= N_GEO
        && crimpTarget === 1 && crimpEased > FICT_CRIMP_THRESHOLD
        && placedFictNow.has(i)
        && isBornNow(i)) ? 1 : 0;
      const prevFictBirth = fictBirthEased[i];
      fictBirthEased[i] += (fictBirthTarget - fictBirthEased[i]) * (snapNextFrame ? 1 : BIRTH_MORPH * morphScale);
      observe(birthTarget - birthEased[i]); observe(fictBirthTarget - fictBirthEased[i]);
      if (birthEased[i] !== prevBirth || fictBirthEased[i] !== prevFictBirth) hitStateInvalidated = true;
    }
    if (hitLayoutInvalidated || hitStateInvalidated) lastHitState = null;
    const seqWasEnabled = seqEnabledNow();
    if(snapNextFrame){tiltEased=+(tiltTarget>0);crimpEased=crimpTarget;}
    else advanceAxisFrame(axisNow);

    if (pendingPageMode && seqEnabledNow()) { pendingPageMode = false; seqMode = true; seqOccDirty = true; updateSeqUi(); }
    if (seqEnabledNow() !== seqWasEnabled) updateSeqUi();
    if (!axisTransport.active&&!pendingMotion&&pendingRestoreMapCamera && crimpTarget <= 0.5 && crimpEased < 0.02) {
      pendingRestoreMapCamera = false;
      updateZoomLimits(1);
      if (mapTransformBeforeDiagram) {
        d3.select(canvas).call(zoomBehavior.transform, gestureTransform(mapTransformBeforeDiagram));
        mapTransformBeforeDiagram = null;
      }
    }
    // Crossfade cromatico fra ordine cronologico e ordine per ruolo.
    roleSortEased += (roleSortTarget - roleSortEased) * (snapNextFrame ? 1 : ROLE_SORT_MORPH);
    atlasFrameUi.update({
      reliefBtn, lodLabel, roleButtons, roleFilter,
      roleOrder: atlasConfig.ROLE_ORDER, roleColors: atlasConfig.ROLE_COLORS,
      diagramOpenedOnce, tiltTarget, focalizer,
      inkColor: INK_COLOR, bgColor: BG_COLOR, cache: frameUiCache
    });
    refreshSeqOccRate();
    sheetHandle?.update(sheetState());
    profileTickMs = PROFILE ? performance.now() - profileTickT0 : 0;
    return remainingMotion;
  }
  function tick(){
    let remainingMotion=advanceMotion();
    const observe=error=>{if(import.meta.env.DEV)remainingMotion=Math.max(remainingMotion,Math.abs(error));};
    draw();
    if (snapNextFrame) { lodEased = lodTarget; draw(); }
    if (import.meta.env.DEV) {
      observe((crimpTarget - crimpEased) * Math.max(width, height));
      observe(((tiltTarget > 0 ? 1 : 0) - tiltEased) * Math.max(width, height));
      observe(roleSortTarget - roleSortEased); observe(drop.ts - drop.s); observe(drop.vs);
      observe(drop.s > 0.01 ? Math.hypot(drop.tx - drop.x, drop.ty - drop.y) : 0);
      motionError = remainingMotion;
      stableFrames = remainingMotion < 0.001 && !axisTransport.active && !pendingMotion && !pendingPageMode && !snapNextFrame ? stableFrames + 1 : 0;
    }
    snapNextFrame = false;
    raf=requestAnimationFrame(tick);
  }
  tick();

  canvas.addEventListener("mousemove", ev=>{
    const [x,y]=interaction.toCanvas(interactionFrame(), canvas, ev.clientX,ev.clientY); drop.tx=x; drop.ty=y; drop.ts=STRENGTH;
  }, {signal: listeners.signal});
  function hostAt(frame, x, y) {
    let host = frame.tiltEased > 0.01
      ? interaction.findAxonHost(frame, x, y, bandsOfTile, {focalActive: focalizer != null})
      : interaction.findDisplayHost(frame, x, y);
    if (host < 0 && frame.crimpEased > 0.01 && frame.tiltEased <= 0.01) host = interaction.findFictHost(frame, x, y);
    return host;
  }
  function selectHost(clickHost) {
    onTileSelect(clickHost);
    if (clickHost !== hostIndex) {
      routeSelection.clear();
      return;
    }
    if (!routeSelection.enabled()) return;
    routeSelection.selectFromTerrace();
  }
  // Al tocco: le tessere trovate dal picking nel disco di 44 px CSS attorno al dito, dal centro verso il bordo.
  function touchCandidates(frame, clientX, clientY) {
    const radius = atlasConfig.TOUCH_TARGET_CSS / 2, hosts = [];
    const add = (cx, cy) => { const [x, y] = interaction.toCanvas(frame, canvas, cx, cy), h = hostAt(frame, x, y); if (h >= 0 && !hosts.includes(h)) hosts.push(h); };
    add(clientX, clientY);
    for (const [r, n] of [[radius / 2, 8], [radius, 16]]) for (let k = 0; k < n; k++) add(clientX + r * Math.cos(2 * Math.PI * k / n), clientY + r * Math.sin(2 * Math.PI * k / n));
    return hosts;
  }
  let lastPointerType = "mouse", placeRose = null;
  canvas.addEventListener("pointerdown", ev => { lastPointerType = ev.pointerType; placeRose?.close(false); }, {signal: listeners.signal});
  canvas.addEventListener("click", ev => {
    try {
    const [x, y] = interaction.toCanvas(interactionFrame(), canvas, ev.clientX, ev.clientY);
    drop.tx = x; drop.ty = y; drop.ts = STRENGTH;
    const clickFrame = interactionFrame();
    if (lastPointerType === "touch" && placeRose) {
      const candidates = touchCandidates(clickFrame, ev.clientX, ev.clientY);
      if (candidates.length >= 2) {
        placeRose.open(candidates.map(tile => ({tile, name: allData[tile].properties.Toponym})), ev.clientX, ev.clientY, canvas);
        return;
      }
    }
    const clickHost = hostAt(clickFrame, x, y);
    if (clickHost < 0) return;
    selectHost(clickHost);
    } finally { notify("selection"); }
  }, {signal: listeners.signal});
  canvas.addEventListener("touchmove", ev=>{
    ev.preventDefault(); const t=ev.touches[0];
    const [x,y]=interaction.toCanvas(interactionFrame(), canvas, t.clientX,t.clientY); drop.tx=x; drop.ty=y; drop.ts=STRENGTH;
  }, {passive:false, signal: listeners.signal});
  canvas.addEventListener("mouseleave", ()=>{ drop.ts=0; }, {signal: listeners.signal});

  const routeKeydown = ev => {
    if (ev.key === "Escape") { routeSelection.clear(); notify("selection"); }
  };
  document.addEventListener("keydown", routeKeydown);

  const shell = atlasShell.create({
    canvas, width, nChapters: N_CHAPTERS, inkColor: INK_COLOR, bgColor: BG_COLOR,
    terrainAgents, sequenceLength: sequence.length,
    roleOrder: atlasConfig.ROLE_ORDER, roleColors: atlasConfig.ROLE_COLORS, rolePluralColor: atlasConfig.ROLE_PLURAL_COLOR
  });
  const {
    PLAY_ICON, wrap,
    slider, chLabel, btn, focalizerSelect, rotSlider
  } = shell;
  shellRef = shell;
  // Ago d'orientamento: il nord della carta ruota con il piano.
  function syncNeedle() {
    const deg = Math.round(((planRot * 180 / Math.PI) % 360 + 360) % 360);
    shell.rotNeedle.querySelector("g").style.transform = `rotate(${deg}deg)`;
    shell.rotNeedle.setAttribute("aria-label", it.rotationIndicator(deg));
    shell.rotResetBtn.disabled = deg === 0;
  }
  // Foglio: campo a quattro quadranti; l'angolo di pagina resta come variante 'angolo'.
  // Miniature del mirino: estratti della figura nelle coordinate del canvas (contorno di Roma, generatori,
  // azimut e distanza dal polo per le relazioni).
  // I limiti si leggono dai vertici proiettati: il verso degli anelli del confine non conta.
  const romaVertices = roma.features[0].geometry.coordinates.flat(2).map(c => projection(c)).filter(Boolean);
  const miniature = {width, height, outline: d3.geoPath(projection)(roma.features[0]), outlineBounds: [[d3.min(romaVertices, v => v[0]), d3.min(romaVertices, v => v[1])], [d3.max(romaVertices, v => v[0]), d3.max(romaVertices, v => v[1])]], points: pts.slice(0, N_GEO).map(p => p.slice()),
    polar: d3.range(N_GEO).map(i => [geographicAngle[i], poleDistanceKm[i]])};
  const sheetOptions = {container: shell.viewBox, canvas, obstacle: historical?.element, config: atlasConfig.SHEET, controller: sheetController, miniature};
  sheetHandle = atlasConfig.SHEET.variant === "angolo" ? createSheetHandle(sheetOptions) : createSheetPad({...sheetOptions, variant: atlasConfig.SHEET.variant});
  placeRose = createPlaceRose({container: shell.viewBox, onChoose: tile => { try { selectHost(tile); } finally { notify("selection"); } }});
  ({mapBtn, pasticciaccioBtn, reliefBtn, stagePrevBtn, stageNextBtn, stageLabel, seqModeToggle, seqChapterBtn, seqPageBtn, orderBtn, seqSlider, seqLabel, roleLegend, roleButtons, pageRibbon, ribbonWrap: pageRibbonShell, ribbonPrevBtn, ribbonNextBtn, legendRow, lodLabel} = shell);

  const disposeHandlers = atlasHandlers.install({
    shell,
    constants: {SEQ_ENABLED_IN_MAP, SEQ_PLAY_MS, PLAY_MS, N_CHAPTERS},
    state: {
      chapter: () => chapter, setChapter: v => { chapter = v; },
      focalizer: () => focalizer, setFocalizer: v => { focalizer = v; },
      seqMode: () => seqMode, setSeqMode: v => { seqMode = v; },
      seqPos: () => seqPos,
      setSeqOccDirty: v => { seqOccDirty = v; },
      roleSortTarget: () => roleSortTarget, setRoleSortTarget: v => { roleSortTarget = v; },
      setPlanRot: v => { planRot = v; syncNeedle(); notify("rotation"); },
      planRot: () => planRot,
      seqGrain: () => seqGrain, setSeqGrain: v => { seqGrain = v; },
      diagramOpenedOnce: () => diagramOpenedOnce,
      tiltTarget: () => tiltTarget,
      crimpTarget: () => crimpTarget,
      showFictitious: () => showFictitious, setShowFictitious: v => { showFictitious = v; },
      playing: () => playing, setPlaying: v => { playing = v; },
      playTimer: () => playTimer, setPlayTimer: v => { playTimer = v; }
    },
    actions: {
      setSeqPos, nearestSeqPos, seqTrack, seqTrackIndex, grainTrack, grainIndex, lastSeqPosOfChapter, firstSeqPosOfChapter,
      chapterOfCursor, seqEnabledNow, updateSeqUi, moveStage, moveSeqChapter, toggleRoleFilter, applyStage, clearSelectedRoute: () => routeSelection.clear(),
      freezeRotPivot,
      cancelFrame: () => cancelAnimationFrame(raf)
    }
  });

  const disposeLayout = observeCanvasLayout({wrap, viewBox: shell.viewBox, width, height, mode: atlasConfig.FRAME.mode, onResize(size) {
    fitScale = size.fit; frameOffset = {x: size.ox, y: size.oy}; cssSize = [size.cssWidth, size.cssHeight];
    viewRect = {x0: -size.ox / size.fit, y0: -size.oy / size.fit, x1: (size.cssWidth - size.ox) / size.fit, y1: (size.cssHeight - size.oy) / size.fit};
    interaction.setView({...viewRect, ox: size.ox, oy: size.oy, fit: size.fit});
    // Il nastro si disegna in px CSS: a ogni cambio di larghezza si ridisegna (stessa chiave, nessun lavoro).
    updatePageRibbon();
    // Il riquadro d'inquadratura è pubblicato per la cornice (didascalie e percorso si registrano su di esso).
    if (size.box) canvas.dataset.box = [size.box.left, size.box.top, size.box.width, size.box.height].join(","); else delete canvas.dataset.box;
    baseTransform = resizeContext2d(context, {cssWidth: size.cssWidth, cssHeight: size.cssHeight, width, height, dpi: size.dpr, fit: size.fit, ox: size.ox, oy: size.oy});
    updateZoomLimits(crimpTarget > 0.5 || pendingRestoreMapCamera ? diagramScaleBaseK : 1);
    rotPivotSyncing = true;
    try { d3.select(canvas).call(zoomBehavior.transform, gestureTransform(transform)); }
    finally { rotPivotSyncing = false; }
    lastHitState = null;
    if (import.meta.env.DEV) stableFrames = 0;
    sheetHandle?.place();
    draw();
  }});
  updateSeqUi();
  wrap.clearUrlRoute = () => routeSelection.clear();
  // Presa del passaggio per la Frattura che segue lo scorrimento: stessa meccanica del Foglio.
  wrap.passage = {holdToward: sheetController.holdToward, seek: sheetController.seek, end: sheetController.end, get stage() { return stage; }};
  wrap.getUrlState = () => ({
    view: crimpTarget > 0.5 ? "diagram" : "map", axon: tiltTarget > 0 ? 1 : 0,
    narrative: showFictitious ? 1 : 0, focalizer, chapter,
    mode: seqMode || pendingPageMode ? "page" : "chapter",
    cursor: sequence[seqPos]?.interpretationId,
    roles: atlasConfig.ROLE_ORDER.filter((_, i) => roleFilter[i]),
    order: roleSortTarget > 0.5 ? "role" : "time",
    rotation: Math.round(planRot * 18000 / Math.PI) / 100, route: routeSelection.id
  });
  wrap.selectReading = (tile,reference,options={}) => {
    if(!allData[tile])return;
    const row=reference?sequence.find(r=>r.tileIndex===tile&&r.referenceId===reference):null;
    const routeId=row?atlasAttestedRoutes.routeIdByReferenceId.get(String(row.referenceId)):null;
    const eligible=routeId&&roleFilter[atlasConfig.ROLE_ORDER.indexOf('Route')]&&
      atlasRouteNodes.frameState({selectedRouteId:routeId,focalizer,seqMode,seqPos,chapter}).routes.length;
    routeSelection.restore(eligible?routeId:null);
    const reading=onTileSelect(tile,row?.referenceId||null,options);
    notify('selection');return reading;
  };
  wrap.applyUrlState = (state, {immediate = false} = {}) => {
    suppressUrl = true;
    if (import.meta.env.DEV) stableFrames = 0;
    playing = false;
    if (playTimer) clearInterval(playTimer);
    playTimer = null; btn.textContent = PLAY_ICON;btn.setAttribute("aria-label",it.play);
    pendingPageMode = false;
    if (state.axon) diagramOpenedOnce = true;
    if (immediate && state.view === "map" && state.axon) {
      // Stesso polo della normale apertura e ritorno dal diagramma, senza nuovo fit.
      cogCenter = interaction.viewportCenterWorld(interactionFrame());
      setRotPivot(cogCenter.slice());
    }
    if (state.view === "diagram") {
      diagramOpenedOnce = true;
      openDiagramCameraIfNeeded();
    } else if (crimpTarget > 0.5) pendingRestoreMapCamera = true;
    crimpTarget = state.view === "diagram" ? 1 : 0;
    tiltTarget = state.axon ? TILT_REST : 0;
    showFictitious = !!state.narrative;
    focalizer = state.focalizer;
    // Il controllo riflette lo stato ripristinato dall'URL, anche per gli agenti fuori dall'elenco.
    if (focalizerSelect) focalizerSelect.value = [...focalizerSelect.options].some(o => o.value === (focalizer ?? "")) ? (focalizer ?? "") : "";
    chapter = state.chapter;
    seqPos = Math.max(0, sequence.findIndex(r => r.interpretationId === state.cursor));
    pendingPageMode = state.mode === "page" && !immediate && !seqEnabledNow();
    seqMode = state.mode === "page" && !pendingPageMode;
    roleFilter.forEach((_, i) => { roleFilter[i] = state.roles.includes(atlasConfig.ROLE_ORDER[i]); });
    roleSortTarget = state.order === "role" ? 1 : 0;
    planRot = state.rotation * Math.PI / 180;
    if (rotSlider) rotSlider.value = String(state.rotation);
    syncNeedle();
    routeSelection.restore(state.route);
    seqOccDirty = true; ribbonStateKey = ""; lastHitState = null;
    drop.ts = 0; drop.s = 0; drop.vs = 0; hostIndex = -1; hoverTerrace = -1;
    syncStageLabel();
    if (immediate) {
      if(pendingDiagramCamera&&state.view==='diagram')prepareDiagramCamera();
      resetAxisMotion();
      crimpEased = crimpTarget;
      tiltEased = tiltTarget > 0 ? 1 : 0;
      snapNextFrame = true;
      cancelAnimationFrame(raf);
      tick();
    }
    updateSeqUi();
    suppressUrl = false;
  };
  if (import.meta.env.DEV) {
    import("./dev/scrubbing.js").then(({createScrubber})=>{
      let checkpoint=null;
      const capture=()=>({...motionSnapshot(.5),
        targets:{crimpTarget,tiltTarget,stage,diagramOpenedOnce,pendingRestoreMapCamera,
          pendingPageMode,showFictitious},
        gravRamp:gravRamp.slice(),fictSpawnPt:fictSpawnPt.map(p=>p?.slice()??null),
        savedMapCamera:mapTransformBeforeDiagram?{...mapTransformBeforeDiagram}:null,
        roleFilter:roleFilter.slice()});
      const restore=()=>{
        if(!checkpoint)return;
        const s=checkpoint;
        crimpEased=s.crimpEased;tiltEased=s.tiltEased;planRot=s.planRot;
        transform=d3.zoomIdentity.translate(s.transform.x,s.transform.y).scale(s.transform.k);
        cogCenter=s.cogCenter.slice();rotPivot=s.rotPivot.slice();diagramScaleBaseK=s.diagramScaleBaseK;
        layoutPtsEased=s.layoutPtsEased.map(p=>p.slice());displayCellScale=s.previousCellScale.slice();
        occEased=s.occEased.slice();birthEased=s.birthEased.slice();focalEased=s.focalEased.slice();fictBirthEased=s.fictBirthEased.slice();
        Object.assign(drop,s.drop);roleSortEased=s.roleSortEased;roleSortTarget=s.roleSortTarget;lodEased=s.lodEased;
        crimpTarget=s.targets.crimpTarget;tiltTarget=s.targets.tiltTarget;stage=s.targets.stage;
        diagramOpenedOnce=s.targets.diagramOpenedOnce;pendingRestoreMapCamera=s.targets.pendingRestoreMapCamera;
        pendingPageMode=s.targets.pendingPageMode;showFictitious=s.targets.showFictitious;
        gravRamp=s.gravRamp.slice();fictSpawnPt=s.fictSpawnPt.map(p=>p?.slice()??null);
        mapTransformBeforeDiagram=s.savedMapCamera?d3.zoomIdentity.translate(s.savedMapCamera.x,s.savedMapCamera.y).scale(s.savedMapCamera.k):null;
        chapter=s.chapter;focalizer=s.focalizer;seqMode=s.seqMode;seqPos=s.seqPos;occSeq=s.occSeq.slice();activeRanked=s.activeRanked;
        roleFilter.forEach((_,i)=>{roleFilter[i]=s.roleFilter[i]});
        routeHoverEased=s.routeHoverEased;routeHotSet=new Set(s.routeHotSet);routeHoverRoutes=s.routeHoverRoutes.slice();
        routeSelection.restore(s.routeSelection.id,s.routeSelection);
        hostIndex=s.hostIndex;hoverTerrace=s.hoverTerrace;currentRibbonTick=s.currentRibbonTick;
        lastHitState=null;checkpoint=null;updateSeqUi();draw();raf=requestAnimationFrame(tick);
      };
      wrap.motionDev=createScrubber({snapshot:()=>evaluatedFrame,restore,
        prepare(target){
          if(checkpoint)restore();
          if(!wrap.isSettled())throw new Error('Il contesto deve partire da uno stato assestato');
          if(Object.keys(target).some(key=>!['view','axon','narrative'].includes(key)))throw new Error('Il contesto di lettura deve restare fissato');
          checkpoint=capture();cancelAnimationFrame(raf);
          const initial=wrap.getUrlState();
          wrap.applyUrlState({...initial,...target},{immediate:false});
          const start=motionSnapshot(.5),config={...atlasConfig};
          const end={...start,crimpEased:crimpTarget,tiltEased:tiltTarget>0?1:0,roleSortEased:roleSortTarget};
          const primary=initial.view!==(crimpTarget===1?'diagram':'map')?'crimp':initial.axon!==(tiltTarget>0?1:0)?'tilt':'narrative';
          const primaryGain=primary==='crimp'?CRIMP_MORPH:primary==='tilt'?TILT_MORPH:BIRTH_MORPH;
          const stateC=(showFictitious?rankedRadialFullByChapter:rankedRadialByChapter)[chapter];
          const full=rankedRadialFullByChapter[chapter];
          const born=i=>seqMode?birthPos[i]<=seqPos:isBorn(i,chapter);
          const pointsAt=c=>allData.map((_,i)=>{
            const f={...interactionFrame(),crimpEased:c};
            if(i<N_GEO&&!cellRings[i]&&c<=.01)return interaction.spawnPointAlongAzimuth(f,geographicAngle[i]);
            if(i>=N_GEO&&c<=FICT_CRIMP_THRESHOLD)return cogCenter.slice();
            if(i>=N_GEO&&(!showFictitious||!full.placedFict.has(i))&&born(i))return interaction.nearestViewportCorner(f,cogCenter[0]+full.layoutAzimuth[i][0],cogCenter[1]+full.layoutAzimuth[i][1]);
            return born(i)?[cogCenter[0]+stateC.layoutAzimuth[i][0],cogCenter[1]+stateC.layoutAzimuth[i][1]]:stateC.layoutAzimuth[i].slice();
          });
          const switches=[];
          if(primary==='crimp')for(const threshold of [.01,FICT_CRIMP_THRESHOLD]){
            const ratio=(threshold-end.crimpEased)/(start.crimpEased-end.crimpEased);
            if(ratio>0&&ratio<1)switches.push({after:Math.floor(Math.log(ratio)/Math.log(1-CRIMP_MORPH))+1,threshold});
          }
          switches.sort((a,b)=>a.after-b.after);
          const phases=[{after:0,points:pointsAt(start.crimpEased)}];
          for(const change of switches)phases.push({after:change.after,points:pointsAt(change.threshold+(end.crimpEased>start.crimpEased?1e-8:-1e-8))});
          const narrativeSwitch=switches.find(v=>v.threshold===FICT_CRIMP_THRESHOLD)?.after??Infinity;
          const present=(i,c)=>showFictitious&&i>=N_GEO&&crimpTarget===1&&c>FICT_CRIMP_THRESHOLD&&full.placedFict.has(i)&&born(i)?1:0;
          const bornNarrative=allData.map((_,i)=>({first:present(i,start.crimpEased),last:present(i,end.crimpEased),after:narrativeSwitch}));
          const endEval=evaluateFrame(evaluationModel,{...end,layoutPtsEased:pointsAt(end.crimpEased)},fitScale);
          end.lodEased=evaluateFrame(evaluationModel,{...end,previousCellScale:endEval.displayCellScale,layoutPtsEased:pointsAt(end.crimpEased)},fitScale).lodTarget;
          const narrativeIndices=new Set(allData.map((_,i)=>i).filter(i=>i>=N_GEO&&full.placedFict.has(i)&&born(i)));
          return {start,end,config,scaleAt:c=>cellRings.map((cr,i)=>cr?1+(normalizedCellScale[i]*endEval.cogScaleDyn-1)*c:endEval.cogScaleDyn),gains:gravRamp.map(v=>(LAYOUT_MORPH_SLOW+(LAYOUT_MORPH_FAST-LAYOUT_MORPH_SLOW)*v)*(seqMode?SEQ_MORPH_SCALE:1)),phases,bornNarrative,primary,primaryGain,narrativeIndices,
            narrativeStart:initial.narrative?1:0,narrativeEnd:showFictitious?1:0};
        },
        render(snapshot){
          const frame=evaluateFrame(evaluationModel,snapshot,fitScale);
          frame.profileT0=0;frame.profileEvaluationMs=0;drawEvaluated(frame).finish(frame);evaluatedFrame=frame;
          return frame;
        }
      });
    });
  }
  if(import.meta.env.DEV){
    wrap.motionLabBridge={
      canvas,context,model:evaluationModel,projection:atlasProjection,entities:atlasEntities,config:atlasConfig,primaryHostOf,
      halt:()=>cancelAnimationFrame(raf),state:()=>wrap.getUrlState(),
      endpoint(state){
        wrap.applyUrlState({...wrap.getUrlState(),...state,chapter:10,mode:'chapter'},{immediate:true});
        cancelAnimationFrame(raf);const snap=motionSnapshot(.5),frame=evaluateFrame(evaluationModel,snap,fitScale);
        // Il target legge le scale del draw precedente. Per un estremo
        // assestato servono le scale finali.
        snap.previousCellScale=frame.displayCellScale.slice();
        snap.lodEased=evaluateFrame(evaluationModel,snap,fitScale).lodTarget;
        return {...snap,points:frame.displayPts.map(p=>p.slice()),scales:frame.displayCellScale.slice()};
      },
      fit:()=>fitScale,
      gains:()=>gravRamp.map(v=>LAYOUT_MORPH_SLOW+(LAYOUT_MORPH_FAST-LAYOUT_MORPH_SLOW)*v),
      render(frame){frame.profileT0=0;frame.profileEvaluationMs=0;drawEvaluated(frame).finish(frame);evaluatedFrame=frame;},
      resize(){baseTransform=context.getTransform();return baseTransform;},
      restore(){cancelAnimationFrame(raf);tick();}
    };
  }
  if (import.meta.env.DEV) {
    wrap.isSettled = () => stableFrames >= 3 && !playing;
    wrap.motionError = () => motionError;
    wrap.motionProduction={get active(){return axisTransport.active},get preparing(){return !!pendingMotion},
      get frame(){return evaluatedFrame},get stats(){return motionStats},
      seek(p){const a=axisTransport.active;if(!a)throw Error('Passaggio non attivo');cancelAnimationFrame(raf);a.p=p;a.at=performance.now();draw();return evaluatedFrame},
      step(ms){const a=axisTransport.active;if(a)a.at-=ms;tick();cancelAnimationFrame(raf);return evaluatedFrame},
      resume(){cancelAnimationFrame(raf);tick()},setCamera(value){transform=d3.zoomIdentity.translate(value.x,value.y).scale(value.k);lastPassage=null;draw()},
      setState(state,immediate=false){wrap.applyUrlState({...wrap.getUrlState(),...state},{immediate})},halt(){cancelAnimationFrame(raf)},
      // Misura di continuità: luoghi reali nati il cui centro cade nell'area visibile del canvas.
      visible(){const f=evaluatedFrame,out=[];if(!f)return out;for(let i=0;i<N_GEO;i++){if(!cellRings[i]||(birthEased[i]||0)<=BIRTH_EPSILON)continue;const [x,y]=projectMotion(f,{projection:atlasProjection},f.displayPts[i]);if(x>=viewRect.x0&&x<=viewRect.x1&&y>=viewRect.y0&&y<=viewRect.y1)out.push(i);}return out;},
      get active(){return {place:activePlace,screen:activeScreen&&{...activeScreen},pointer:!activePointer.hidden,size:[...cssSize]}},
      get camera(){return {...transform}},get diagramBaseK(){return diagramScaleBaseK},
      // Ammasso al centro: quota di tessere reali nate il cui centro cade nel disco centrale della vista (raggio
      // frac del lato corto), sul totale delle tessere visibili; e quota di tessere sovrapposte (centri a meno di minCSS).
      crowd(frac=.08,minCSS=6){const f=evaluatedFrame;if(!f)return null;const cx=(viewRect.x0+viewRect.x1)/2,cy=(viewRect.y0+viewRect.y1)/2,R=frac*Math.min(viewRect.x1-viewRect.x0,viewRect.y1-viewRect.y0),pts2=[];
        for(let i=0;i<N_GEO;i++){if(!cellRings[i]||(birthEased[i]||0)<=BIRTH_EPSILON)continue;const [x,y]=projectMotion(f,{projection:atlasProjection},f.displayPts[i]);if(x>=viewRect.x0&&x<=viewRect.x1&&y>=viewRect.y0&&y<=viewRect.y1)pts2.push([x,y]);}
        const inC=pts2.filter(([x,y])=>Math.hypot(x-cx,y-cy)<=R).length,d=minCSS/fitScale;let close=0;
        for(let a=0;a<pts2.length;a++)for(let b=a+1;b<pts2.length;b++)if(Math.abs(pts2[a][0]-pts2[b][0])<d&&Math.hypot(pts2[a][0]-pts2[b][0],pts2[a][1]-pts2[b][1])<d){close++;}
        return{visibili:pts2.length,centro:pts2.length?inC/pts2.length:0,coppieVicine:close,altezza:f.heightPhase??1};}};
  }
  shell.viewBox.append(fondoCredit, scaleBar, activePointer);
  // Tessera attiva dal pannello; «Ritrova nella figura» centra la camera su di essa senza cambiare vista.
  wrap.setActivePlace = tile => { const next = tile == null ? null : tile; if (next === activePlace) return; activePlace = next; lastPaintedFrame = null; draw(); };
  wrap.focusActive = () => {
    if (activePlace == null || !evaluatedFrame) return;
    let j = activePlace;
    if (j >= N_GEO && !(crimpTarget > .5)) j = allDataById.get((allData[j].properties.refers_to_entity_ID || [])[0]) ?? j;
    const [sx, sy] = projectMotion(evaluatedFrame, {projection: atlasProjection}, evaluatedFrame.displayPts[j]);
    const next = d3.zoomIdentity.translate(transform.x + width / 2 - sx, transform.y + height / 2 - sy).scale(transform.k);
    const target = gestureTransform(next), sel = d3.select(canvas);
    if (reducedMotion.matches) sel.call(zoomBehavior.transform, target);
    else sel.transition().duration(atlasConfig.ACTIVE.focusMs).ease(d3.easeCubicInOut).call(zoomBehavior.transform, target);
  };
  if(historical){shell.viewBox.append(historical.element);wrap.invalidateHistorical=()=>{lastPaintedFrame=null;draw();};}
  readyToPublish = true;
  reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches){resetAxisMotion();crimpEased=crimpTarget;tiltEased=+(tiltTarget>0);snapNextFrame=true;}},{signal:listeners.signal});
  wrap.dispose = () => {
    cancelPreparation();prepareChannel.port1.close();prepareChannel.port2.close();
    disposeLayout();
    disposeHandlers();
    listeners.abort();
    placeRose.dispose();
    sheetHandle.dispose();
    document.removeEventListener("keydown", routeKeydown);
    d3.select(canvas).on(".zoom", null);
  };
  return wrap;
}
