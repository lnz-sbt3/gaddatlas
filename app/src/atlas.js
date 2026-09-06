import * as d3 from "d3";
import s4Config from "./model/config.js";
import projection from "./model/projection.js";
import context2d from "./render/context2d.js";
import s4RoleBands from "./render/role-bands.js";
import s4ChartRouteSelection from "./interaction/route-selection.js";
import s4PageRibbon from "./render/page-ribbon.js";
import s4RouteHoverDrawing from "./render/route-hover.js";
import s4ChartMapBackdrop from "./render/map-backdrop.js";
import s4GhostSlotsOverlay from "./render/ghost-slots.js";
import s4ChartOverlays from "./render/overlays.js";
import s4ChartFrameUi from "./ui/frame-ui.js";
import s4ChartShell from "./ui/shell.js";
import s4ChartHandlers from "./ui/handlers.js";

// ===== CELLA: chartS4 =====
  // -- CELLA FINALE: chartS4 --
export default function chartS4(model, roma) {
  const { s4Entities, s4Projection, s4Voronoi, s4NarrativeCells, s4Chapters, s4Satellites, s4Terrain, s4RadialLayout, s4IsoEngine, s4Sequence, s4AttestedRoutes, s4Painters, s4Interaction, s4ChartSupport, s4LodPicking, s4RouteNodes } = model;
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
  } = s4Config;
  const METRIC_ISOLINES_KM = s4Config.METRIC_ISOLINES_KM;
  const INFLUENCE_RADIUS = RADIUS * 3; // usato solo da nearDrop per il bbox-test dei segmenti condivisi;
                                        // deform() si annulla gia' oltre RADIUS (falloff compatto)

  const { geoData, allData, N_INMAP, N_GEO } = s4Entities;
  const { pts, bbox, width, height, cogCenterInit, geographicAngle, poleDistanceKm, poleIndex } = s4Projection;
  const { segments, cellRings: baseCellRings, normalizedCellScale: baseNormalizedCellScale, cognitiveTileRadius: baseCognitiveTileRadius } = s4Voronoi;
  const { narrativeCellRings, narrativeTileRadius, ghostSlots } = s4NarrativeCells;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);
  const cognitiveTileRadius = baseCognitiveTileRadius.map((r, i) => narrativeCellRings[i] ? narrativeTileRadius[i] : r);
  const normalizedCellScale = baseNormalizedCellScale.map((s, i) => narrativeCellRings[i] ? 1 : s);
  const { birthChapter, isBorn, bandsFor, BANDS_MAX } = s4Chapters;
  const { primaryHostOf } = s4Satellites;
  const { agents: terrainAgents, occAt } = s4Terrain;
  const { rankedRadialByChapter, rankedRadialFullByChapter, extentBase } = s4RadialLayout;
  const { isoProfile, isoProfileMin, isoProfileMed, traceIsoline } = s4IsoEngine;
  const {
    sequence, sequenceByAgent, chapterOfCursor, occUpTo, birthPos, lastPosByChapter,
    roleStack, rolePosStack, roleLen, BANDS_CAP: SEQ_BANDS_CAP
  } = s4Sequence;
  const seqAllPositions = sequence.map(d => d.pos);
  const { routeRgb } = s4AttestedRoutes;

  const context = context2d(width, height);
  const canvas = context.canvas;
  const painters = s4Painters.makePainters(context);
  const interaction = s4Interaction;
  const baseTransform = context.getTransform();
  function bandsOfTile(i) {
    return s4ChartSupport.bandsOfTile({i, occEased, focalizer, BANDS_MAX, bandsFor});
  }
  const geoPath = d3.geoPath(projection, context);

  let cogCenter = cogCenterInit.slice();
  let rotPivot = cogCenter.slice();

  function baseWorldPt(i) {
    return s4ChartSupport.baseWorldPt({i, N_GEO, pts, cogCenter});
  }

  let displayPts = allData.map((d, i) => i < pts.length ? pts[i].slice() : cogCenterInit.slice());
  let displayCellScale = cellRings.map(() => 1);
  let profileFrame = 0;
  let profileTickMs = 0, profileHitMs = 0;
  let lastHitState = null;
  const drawDepthKey = cellRings.map(() => 0);
  let diagramScaleBaseK = 1;    // zoom congelato all'apertura: da li' in poi il diagramma puo' ingrandirsi
  let lastCogScaleDyn = 1;
  let mapTransformBeforeDiagram = null;
  let pendingRestoreMapCamera = false;

  // -- stato zoom --
  let transform = d3.zoomIdentity; // k=1 = vista iniziale adattata al bbox
  let rotPivotSyncing = false;

  // stato della goccia (i parametri SPRING/S_STIFF/S_DAMP/STRENGTH/RADIUS sono in s4Config)
  const drop = { x:-1e4, y:-1e4, tx:-1e4, ty:-1e4, s:0, ts:0, vs:0 };

  let effRadius = RADIUS, effInfluence = INFLUENCE_RADIUS;

  function deform(px, py){
    if (tiltEased > 0.01) return [px, py];
    return s4ChartSupport.deformPoint({px, py, drop, effRadius, transform, crimpEased});
  }

  function nearDrop(bbox){
    if (tiltEased > 0.01) return false;
    return s4ChartSupport.nearDropBBox({box: bbox, drop, effInfluence});
  }

  let hostIndex = -1;
  let terraceCurveCache = {index: -1, curves: null, tiltNow: 1, rotSinNow: 0, rotCosNow: 1, zScale: 1, invK: 1};
  let hoverTerrace = -1;
  const logPickDiagnostics = s4LodPicking.makePickLogger({PROFILE, painters});

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
  const STAGE_LABELS = {
    map2d: "Mappa di Roma",
    diagram2d: "Mappa del Pasticciaccio",
    diagram2d_fict: "Mappa del Pasticciaccio",
    diagram_axon: "Rilievo Narrativo",
    map_axon: "Rilievo Narrativo"
  };
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
  let seqMode = false;        // false = timeline capitoli; true = timeline sequenziale per riferimento
  let seqPos = 0;             // posizione ordinale globale dentro s4Sequence.sequence
  // occSeq e' il buffer riusato restituito da occUpTo: si aggiorna solo quando
  // cambiano seqPos, focalizer o seqMode, mai per frame.
  let occSeq = new Float32Array(allData.length);
  const occSeqBuf = new Float32Array(allData.length);
  let seqOccDirty = true;
  const roleBands = s4RoleBands.create({
    allDataLength: allData.length,
    roleCap: SEQ_BANDS_CAP,
    bandsMax: BANDS_MAX,
    bandsLogBase: s4Chapters.BANDS_LOG_BASE
  });
  let roleSortTarget = 0;
  let roleSortEased = 0;
  let lodTarget = 0;
  let lodEased = 0;
  const routeSelection = s4ChartRouteSelection.create({
    getFocalizer: () => focalizer,
    getLodEased: () => lodEased,
    getHostIndex: () => hostIndex,
    getHoverTerrace: () => hoverTerrace,
    getRoleSortTarget: () => roleSortTarget,
    roleBands,
    sequence,
    routeIdByReferenceId: s4AttestedRoutes.routeIdByReferenceId
  });
  let seqOccCalls = 0;
  let seqOccWindowT0 = performance.now();
  let seqOccCallsPerSecond = 0;
  let mapBtn = null, pasticciaccioBtn = null, reliefBtn = null;
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
  const roleFilter = s4Config.ROLE_ORDER.map(() => true);
  let fictSpawnPt = allData.map(() => null); // punto di riposo world-space (angolo viewport piu' vicino) per i fittizi assenti
  let ghostSlotsLoggedChapter = null;
  // Layout radiale attivo: solo referenziali oppure referenziali e fittizi.
  let activeRanked = rankedRadialByChapter;
  const t0 = performance.now();          // clock monotono per la fase del pulse

  function interactionFrame() {
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
      zStep: s4Painters.AXON_Z_STEP
             * (1 + (lastCogScaleDyn - 1) * crimpEased)
             * (tiltEased >= 0.999 ? 1 : tiltEased)
             / Math.max(0.001, tiltNow)
    };
  }

  function focalAlpha(i) {
    return s4ChartSupport.focalAlpha(focalEased, i);
  }

  function offmapPresence() {
    return s4ChartSupport.offmapPresence(crimpEased, FICT_CRIMP_THRESHOLD);
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
    return s4ChartSupport.alphaBucket(alpha);
  }

  function clamp01(v) {
    return s4ChartSupport.clamp01(v);
  }

  function seqPage(row) {
    return s4ChartSupport.seqPage(row);
  }

  function effRoleName(row) {
    return s4ChartSupport.effRoleName(row);
  }

  function effRoleIdx(row) {
    return s4ChartSupport.effRoleIdx(row, s4Config.ROLE_ORDER);
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
    if (crimpTarget > 0.5 || crimpEased > 0.02) return;
    mapTransformBeforeDiagram = transform;
    pendingRestoreMapCamera = false;
    diagramScaleBaseK = transform.k;
    zoomBehavior.scaleExtent([diagramScaleBaseK * ZOOM_MIN, diagramScaleBaseK * ZOOM_MAX]);
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

  function seqTrack() {
    if (SEQ_FOLLOW_FOCALIZER && focalizer != null) return sequenceByAgent.get(focalizer) || [];
    return seqAllPositions;
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
        d3.select(canvas).call(zoomBehavior.transform, nextTransform);
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
    updateSeqUi();
  }

  function rebuildRolePermutations() {
    roleBands.rebuild({
      roleStack, rolePosStack, roleCounts: roleLen,
      roleOrder: s4Config.ROLE_ORDER,
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
            return r >= 0 ? s4Config.ROLE_ORDER[r] : "-";
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
    if (!roleFilter[s4Config.ROLE_ORDER.indexOf("Route")]) routeSelection.clear();
    refreshOccSeq();
    updateSeqUi();
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

  function updateSeqUi() {
    if (!seqChapterBtn || !seqPageBtn) return;
    const seqEnabled = seqEnabledNow();
    const roleModeNow = focalizer != null;
    if (!seqEnabled && seqMode) {
      seqMode = false;
      chapter = chapterOfCursor(seqPos);
      if (slider) { slider.value = chapter; chLabel.textContent = String(chapter); }
      seqOccDirty = true;
      if (playing && playTimer) { playing = false; btn.textContent = PLAY_ICON; clearInterval(playTimer); playTimer = null; }
    }
    seqModeToggle.style.opacity = seqEnabled ? "1" : "0.45";
    seqPageBtn.disabled = !seqEnabled;
    seqChapterBtn.disabled = false;
    seqChapterBtn.style.background = seqMode ? BG_COLOR : INK_COLOR;
    seqChapterBtn.style.color = seqMode ? INK_COLOR : BG_COLOR;
    seqPageBtn.style.background = seqMode ? INK_COLOR : BG_COLOR;
    seqPageBtn.style.color = seqMode ? BG_COLOR : INK_COLOR;
    seqSlider.style.display = seqMode ? "" : "none";
    seqLabel.style.display = seqMode ? "" : "none";
    slider.style.display = seqMode ? "none" : "";
    chLabel.style.display = seqMode ? "none" : "";
    const track = seqTrack();
    seqSlider.min = 0;
    seqSlider.max = Math.max(0, track.length - 1);
    seqSlider.disabled = !seqMode || !track.length;
    seqSlider.value = seqTrackIndex(seqPos, track);
    const row = sequence[seqPos];
    seqLabel.textContent = row ? `p. ${row.page} (cap. ${chapterOfCursor(seqPos)})` : "p. - (cap. -)";
    if (stageLabel) {
      const pos = Math.max(0, STAGES.indexOf(stage)) + 1;
      stageLabel.textContent = `${pos}/${STAGES.length} · ${STAGE_LABELS[stage] || stage}`;
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
    if (rotSlider) rotSlider.style.display = reliefOn ? "" : "none";
    if (orderBtn) {
      if (!roleModeNow) roleSortTarget = 0;
      orderBtn.style.display = reliefOn ? "" : "none";
      orderBtn.disabled = !roleModeNow || !reliefOn;
      orderBtn.style.opacity = roleModeNow && reliefOn ? "1" : "0.45";
      orderBtn.textContent = roleSortTarget > 0.5 ? "ordine: per ruolo" : "ordine: cronologico";
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
    const result = s4PageRibbon.update({
      pageRibbon, pageRibbonWrap: pageRibbonShell, seqMode, rows, stateKey: ribbonStateKey, chapter, focalizer, seqPos,
      width, inkColor: INK_COLOR, roleColors: s4Config.ROLE_COLORS,
      gapMin: GAP_MIN, blockDelta: SEQ_BLOCK_DELTA,
      seqPage, effRoleName, setSeqPos, focalDimAlpha: FOCAL_DIM_ALPHA,
      allData, roleMaskKey
    });
    if (!result.unchanged) {
      ribbonStateKey = result.stateKey;
      currentRibbonTick = result.currentRibbonTick;
    }
  }

  function draw(){
    const profileT0 = PROFILE ? performance.now() : 0;
    let profileTiles = 0, profileCurves = 0, profileFills = 0, profileStrokes = 0;
    let profileDisplayMs = 0, profileDrawOrderMs = 0, profileReliefMs = 0, profileBordersMs = 0, profileRulerMs = 0;
    const invK = 1 / transform.k;
    tiltNow = 1 - (1 - TILT_REST) * tiltEased;
    effRadius = RADIUS * invK;
    effInfluence = INFLUENCE_RADIUS * invK;
    const shortSide = Math.min(width, height);
    const cogScaleDyn = (DIAG_SCREEN_FRAC * shortSide) / (2 * extentBase * diagramScaleBaseK);
    lastCogScaleDyn = cogScaleDyn;
    const zScaleNow = 1 + (cogScaleDyn - 1) * crimpEased;
    const zScaleDraw = tiltEased >= 0.999 ? zScaleNow : zScaleNow * tiltEased;
    const lod = s4LodPicking.lodMetrics({
      s4Painters, tiltNow, transform, isoProfileMed, displayCellScale, N_INMAP, zScaleNow
    });
    const lodGainNow = 1 + (s4Config.LOD_DIAG_GAIN - 1) * crimpEased;
    const lodMinNow = s4Config.LOD_MIN / lodGainNow;
    const lodFullNow = s4Config.LOD_FULL / lodGainNow;
    lodTarget = clamp01((Math.min(lod.alzataPx, lod.pedataPx) - lodMinNow) /
                        Math.max(0.01, lodFullNow - lodMinNow));
    if (PROFILE && profileFrame % 60 === 0) {
      console.log("[LOD]", {
        k: +transform.k.toFixed(2),
        alzataPx: +lod.alzataPx.toFixed(2),
        pedataPx: +lod.pedataPx.toFixed(2),
        rapporto: +(lod.alzataPx / Math.max(0.01, lod.pedataPx)).toFixed(2),
        lodMinNow: +lodMinNow.toFixed(2),
        lodFullNow: +lodFullNow.toFixed(2),
        lodTarget: +lodTarget.toFixed(2)
      });
    }
    const rotNow = tiltEased > 0.01 ? planRot : 0;
    const rotSinNow = Math.sin(rotNow);
    const rotCosNow = Math.cos(rotNow);
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
        highlightColor: ri >= 0 ? s4Config.ROLE_COLORS[s4Config.ROLE_ORDER[ri]] : INK_COLOR,
        ribbonLinked: currentRibbonTick != null && currentRibbonTick.tileIndex === i,
        isRouteHot: routeHotSet.has(i),
        routeRgb: s4RouteNodes.routeRgb
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
    const profileDisplayT0 = PROFILE ? performance.now() : 0;
    for (let i = 0; i < allData.length; i++) {
      const cogX = cogCenter[0] + (layoutPtsEased[i][0] - cogCenter[0]) * cogScaleDyn;
      const cogY = cogCenter[1] + (layoutPtsEased[i][1] - cogCenter[1]) * cogScaleDyn;
      if (i >= N_GEO) {
        displayPts[i][0] = cogX;
        displayPts[i][1] = cogY;
      } else {
        const p = cellRings[i] ? pts[i] : interaction.spawnPointAlongAzimuth(frame, geographicAngle[i]);
        displayPts[i][0] = p[0] + (cogX - p[0]) * crimpEased;
        displayPts[i][1] = p[1] + (cogY - p[1]) * crimpEased;
      }
    }
    for (let i = 0; i < cellRings.length; i++) {
      const cr = cellRings[i];
      if (!cr) {
        displayCellScale[i] = cogScaleDyn;
        continue;
      }
      const target = normalizedCellScale[i] * cogScaleDyn;
      displayCellScale[i] = 1 + (target - 1) * crimpEased;
    }
    if (PROFILE) profileDisplayMs = performance.now() - profileDisplayT0;
    const cognitiveBirthScale = birthEased.map(v => 0.35 + 0.65 * v);

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
      return dKm < 1 ? `${Math.round(dKm * 1000)} m` : `${dKm} km`;
    }

    context.setTransform(baseTransform);
    context.clearRect(0,0,width,height);
    context.fillStyle=BG_COLOR; context.fillRect(0,0,width,height);
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);
    context.translate(-bbox[0], -bbox[1]);
    context.translate(rotPivot[0], rotPivot[1]);
    context.scale(1, tiltNow);
    context.rotate(rotNow);
    context.translate(-rotPivot[0], -rotPivot[1]);

    const backdrop = s4ChartMapBackdrop.draw({
      context, PROFILE, crimpEased, activeRanked, chapter, METRIC_ISOLINES_KM,
      invK, cogCenter, cogScaleDyn, GRID_COLOR, GRID_ALPHA, RING_GUIDE_ALPHA,
      RING_GUIDE_WIDTH, BORDER_WIDTH, segments, nearDrop, deform, cellRings,
      N_INMAP, N_GEO, fictBirthEased, birthEased, BIRTH_EPSILON, isBorn,
      contentAlpha, cellPoint, displayPts, cognitiveTileRadius, displayCellScale,
      offmapPresence
    });
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
        context.fillStyle = `rgba(${FICT_HUE_RGB},${isoFillAlpha(k)})`;
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
      if (!cr && !isFict && !isOffmap) return false;
      if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) return false;
      if (isOffmap && offmapPresence() <= BIRTH_EPSILON) return false;
      const visible = isFict ? fictBirthEased[i] : birthEased[i];
      return !(crimpEased > 0.01 && visible <= BIRTH_EPSILON);
    }

    const profileDrawOrderT0 = PROFILE ? performance.now() : 0;
    const drawOrder = tiltEased > 0.01
      ? d3.range(cellRings.length).filter(reliefVisibleIndex)
      : d3.range(cellRings.length);
    if (tiltEased > 0.01) {
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
      ? s4RouteHoverDrawing.buildStepPoints({ routes: routeHoverRoutes, routePointOf, birthEased, fictBirthEased, N_GEO, BIRTH_EPSILON })
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
              rHaloPx: +(radius * s4Config.CONSTELLATION_RADIUS_GAIN * transform.k).toFixed(1),
              offPx: +(radius * s4Config.HALO_POOL_OFFSET * tiltEased * transform.k).toFixed(1),
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
    if (haloProfile) console.log("[halo]", haloProfile);
    for (const i of drawOrder){
      const cr = cellRings[i];
      const isFict = i >= N_GEO;
      const isOffmap = i >= N_INMAP && i < N_GEO;
      if (!cr && !isFict && !isOffmap) continue;
      if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) continue;
      if (isOffmap && offmapPresence() <= BIRTH_EPSILON) continue;
      const visible = isFict ? fictBirthEased[i] : birthEased[i];
      if (crimpEased > 0.01 && visible <= BIRTH_EPSILON) continue;
      const occ = occEased[i];
      const B = roleMode ? Math.min(BANDS_MAX, Math.round(occ)) : bandsFor(occ);
      const [px, py] = displayPts[i];
      const drawFictSummitGlyph = () => {
        const glyphB = tiltEased > 0.01 ? B : 0;
        const [cx, cy] = painters.zPoint(frame, px, py, painters.axonZOf(glyphB) * zScaleDraw);
        const gr = cognitiveTileRadius[i] * displayCellScale[i] * 0.5;
        const status = allData[i].properties.reality_status;
        context.save();
        context.globalAlpha = contentAlpha(i, {presence: fictBirthEased[i]});
        if (status === "transformed") painters.drawFictGlyph(frame, cx, cy, gr, "transformed");
        else if (status === "imagined") painters.drawFictGlyph(frame, cx, cy, gr, "imagined");
        else painters.drawFictGlyph(frame, cx, cy, gr, "invented");
        context.restore();
      };
      if (B <= 0 && tiltEased <= 0.01) {
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
      const seed = isFict
        ? (allData[i].properties.voidSeed ?? (i * 0.6180339887) % 1)
        : (i * 0.6180339887) % 1;

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

      if (tiltEased > 0.01) {
        const bandTint = roleMode
          ? (frame.lodCollapse
              ? roleBands.dominantTint({tileIndex: i, painters})
              : roleBands.bandTint({tileIndex: i, painters, sortEased: roleSortEased}))
          : null;
        const roleMarks = roleMarksOf(i);
        pickMetricsForTile = {B, packing, rMed};
        painters.drawAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint, roleMarks);
        if (isFict) drawFictSummitGlyph();
        continue;
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
            context.fillStyle = `rgba(${isFict ? FICT_HUE_RGB : HUE_RGB},${isoFillAlpha(k) * focal})`;
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
          context.strokeStyle = s4RouteNodes.routeRgb;
          context.shadowColor = s4RouteNodes.routeRgb;
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
    const romaAlpha = 1 - crimpEased;
    if (romaAlpha > 0.001) {
      context.save();
      context.globalAlpha = romaAlpha;
      context.beginPath(); geoPath(roma.features[0]);
      context.lineWidth=ROMA_WIDTH*invK; context.lineJoin="round"; context.strokeStyle=INK_COLOR; context.stroke();
      context.restore();
    }

    ({ghostSlotsLoggedChapter} = s4GhostSlotsOverlay.draw({
      context, PROFILE, SHOW_GHOST_SLOTS, crimpEased, chapter,
      ghostSlotsLoggedChapter, ghostSlots, primaryHostOf, fictBirthEased, birthEased,
      contentAlpha, BIRTH_EPSILON, allData, birthChapter,
      cogCenter, cogScaleDyn, displayPts, invK, BORDER_WIDTH, GRID_COLOR
    }));

    const overlayProfile = s4ChartOverlays.draw({
      context, PROFILE, profileRulerMs, profileT0, profileFrame,
      crimpEased, transform, K2, chapter, t0, N_INMAP, N_GEO,
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
  }

  const zoomBehavior = d3.zoom()
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .on("zoom", ev => {
      if (rotPivotSyncing) return;
      transform = ev.transform;
      draw();
    })
    .on("end", () => {
      if (rotPivotSyncing) return;
      freezeRotPivot();
    });
  d3.select(canvas).call(zoomBehavior);

  let raf;
  function tick(){
    const profileTickT0 = PROFILE ? performance.now() : 0;
    const morphScale = seqMode ? SEQ_MORPH_SCALE : 1;
    drop.x+=(drop.tx-drop.x)*SPRING;
    drop.y+=(drop.ty-drop.y)*SPRING;
    // La molla sotto-smorzata produce un singolo rimbalzo all'uscita del cursore.
    const as = (drop.ts - drop.s) * S_STIFF - drop.vs * S_DAMP;
    drop.vs += as; drop.s += drop.vs;
    lodEased += (lodTarget - lodEased) * CRIMP_MORPH * 3;
    // ospite dell'hover: calcolato una volta per frame, condiviso da tutti i loop di draw()
    const hitState = s4ChartSupport.hitState({drop, chapter, crimpEased, tiltEased, planRot, rotPivot, transform, showFictitious, seqMode, seqPos});
    const sameHitState = s4ChartSupport.sameHitState(lastHitState, hitState);
    const tickInteractionFrame = interactionFrame();
    const profileHitT0 = PROFILE ? performance.now() : 0;
    if (sameHitState) {
      hostIndex = lastHitState.hostIndex;
    } else {
      // In assonometria l'hit test comprende tutte le quote del rilievo.
      const axonHit = tiltEased > 0.01 && drop.s > 0.5;
      hostIndex = drop.s > 0.5
        ? (axonHit
            ? interaction.findAxonHost(tickInteractionFrame, drop.x, drop.y, bandsOfTile, {focalActive: focalizer != null})
            : interaction.findDisplayHost(tickInteractionFrame, drop.x, drop.y))
        : -1;
      // i fittizi non hanno cella Voronoi (findDisplayHost li ignora): in diagramma
      // provo il loro hit-test circolare come fallback, cosi' l'hover li copre anche loro
      if (hostIndex === -1 && drop.s > 0.5 && crimpEased > 0.01 && tiltEased <= 0.01) {
        hostIndex = interaction.findFictHost(tickInteractionFrame, drop.x, drop.y);
      }
      lastHitState = {...hitState, hostIndex};
    }
    hoverTerrace = (tiltEased > 0.01 && hostIndex >= 0 && drop.s > 0.5)
      ? s4LodPicking.pickTerrace({terraceCurveCache, hostIndex, painters, x: drop.x, y: drop.y}) : -1;
    profileHitMs = PROFILE ? performance.now() - profileHitT0 : 0;
    const routeFrameState = s4RouteNodes.frameState({selectedRouteId: routeSelection.id, focalizer, seqMode, seqPos, chapter});
    routeHotSet = routeFrameState.hot; routeHoverRoutes = routeFrameState.routes;
    routeHoverEased += ((routeSelection.id != null ? 1 : 0) - routeHoverEased) * ROUTE_HOVER_MORPH;
    if (seqMode) {
      chapter = chapterOfCursor(seqPos);
    }
    if (seqMode || focalizer != null) refreshOccSeq();
    const isBornNow = i => seqMode ? birthPos[i] <= seqPos : isBorn(i, chapter);
    activeRanked = showFictitious ? rankedRadialFullByChapter : rankedRadialByChapter;
    const stateC = activeRanked[chapter];
    const Laz = stateC.layoutAzimuth;
    const LazFull = rankedRadialFullByChapter[chapter].layoutAzimuth;
    const placedFictNow = rankedRadialFullByChapter[chapter].placedFict;
    let hitLayoutInvalidated = false;
    for (let i=0;i<layoutPtsEased.length;i++){
      let tx, ty;
      if (i < N_GEO && !cellRings[i] && crimpEased <= 0.01) {
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
      const m = (LAYOUT_MORPH_SLOW + (LAYOUT_MORPH_FAST - LAYOUT_MORPH_SLOW) * gravRamp[i]) * morphScale;
      const prevX = layoutPtsEased[i][0], prevY = layoutPtsEased[i][1];
      layoutPtsEased[i][0] += (tx - layoutPtsEased[i][0]) * m;
      layoutPtsEased[i][1] += (ty - layoutPtsEased[i][1]) * m;
      if (layoutPtsEased[i][0] !== prevX || layoutPtsEased[i][1] !== prevY) hitLayoutInvalidated = true;
    }
    let hitStateInvalidated = false;
    for (let i=0;i<allData.length;i++){
      const target = (seqMode || focalizer != null) ? (occSeq[i] || 0) : occAt(i, chapter, focalizer);
      occEased[i] += (target - occEased[i]) * MORPH * morphScale;
      const focalTarget = focalizer == null
        ? 1
        : (occAt(i, N_CHAPTERS, focalizer) > 0 ? 1 : (FOCAL_HIDE ? 0 : FOCAL_DIM_ALPHA));
      focalEased[i] += (focalTarget - focalEased[i]) * FOCAL_DIM_MORPH;
      const birthTarget = isBornNow(i) ? 1 : 0;
      const prevBirth = birthEased[i];
      birthEased[i] += (birthTarget - birthEased[i]) * BIRTH_MORPH * morphScale;
      // fittizi: restano a 0 finche' non nati E il diagramma non e' aperto oltre soglia
      const fictBirthTarget = (showFictitious && i >= N_GEO
        && crimpTarget === 1 && crimpEased > FICT_CRIMP_THRESHOLD
        && placedFictNow.has(i)
        && isBornNow(i)) ? 1 : 0;
      const prevFictBirth = fictBirthEased[i];
      fictBirthEased[i] += (fictBirthTarget - fictBirthEased[i]) * BIRTH_MORPH * morphScale;
      if (birthEased[i] !== prevBirth || fictBirthEased[i] !== prevFictBirth) hitStateInvalidated = true;
    }
    if (hitLayoutInvalidated || hitStateInvalidated) lastHitState = null;
    tiltEased += ((tiltTarget > 0 ? 1 : 0) - tiltEased) * TILT_MORPH;
    crimpEased += (crimpTarget - crimpEased) * CRIMP_MORPH;
    if (pendingRestoreMapCamera && crimpTarget <= 0.5 && crimpEased < 0.02) {
      pendingRestoreMapCamera = false;
      zoomBehavior.scaleExtent([ZOOM_MIN, ZOOM_MAX]);
      if (mapTransformBeforeDiagram) {
        d3.select(canvas).call(zoomBehavior.transform, mapTransformBeforeDiagram);
        mapTransformBeforeDiagram = null;
      }
    }
    // Crossfade cromatico fra ordine cronologico e ordine per ruolo.
    roleSortEased += (roleSortTarget - roleSortEased) * ROLE_SORT_MORPH;
    s4ChartFrameUi.update({
      reliefBtn, lodLabel, roleButtons, roleFilter,
      roleOrder: s4Config.ROLE_ORDER, roleColors: s4Config.ROLE_COLORS,
      diagramOpenedOnce, tiltTarget, focalizer,
      inkColor: INK_COLOR, bgColor: BG_COLOR, cache: frameUiCache
    });
    refreshSeqOccRate();
    profileTickMs = PROFILE ? performance.now() - profileTickT0 : 0;
    draw();
    raf=requestAnimationFrame(tick);
  }
  tick();

  canvas.addEventListener("mousemove", ev=>{
    const [x,y]=interaction.toCanvas(interactionFrame(), canvas, ev.clientX,ev.clientY); drop.tx=x; drop.ty=y; drop.ts=STRENGTH;
  }, {signal: listeners.signal});
  canvas.addEventListener("click", ev => {
    const [x, y] = interaction.toCanvas(interactionFrame(), canvas, ev.clientX, ev.clientY);
    drop.tx = x; drop.ty = y; drop.ts = STRENGTH;
    const clickHost = interaction.findAxonHost(interactionFrame(), x, y, bandsOfTile, {focalActive: focalizer != null});
    if (clickHost !== hostIndex) {
      routeSelection.clear();
      return;
    }
    if (!routeSelection.enabled()) return;
    routeSelection.selectFromTerrace();
  }, {signal: listeners.signal});
  canvas.addEventListener("touchmove", ev=>{
    ev.preventDefault(); const t=ev.touches[0];
    const [x,y]=interaction.toCanvas(interactionFrame(), canvas, t.clientX,t.clientY); drop.tx=x; drop.ty=y; drop.ts=STRENGTH;
  }, {passive:false, signal: listeners.signal});
  canvas.addEventListener("mouseleave", ()=>{ drop.ts=0; }, {signal: listeners.signal});

  const routeKeydown = ev => {
    if (ev.key === "Escape") routeSelection.clear();
  };
  document.addEventListener("keydown", routeKeydown);

  const shell = s4ChartShell.create({
    canvas, width, nChapters: N_CHAPTERS, inkColor: INK_COLOR, bgColor: BG_COLOR,
    terrainAgents, sequenceLength: sequence.length,
    roleOrder: s4Config.ROLE_ORDER, roleColors: s4Config.ROLE_COLORS, rolePluralColor: s4Config.ROLE_PLURAL_COLOR
  });
  const {
    PLAY_ICON, wrap,
    slider, chLabel, btn, focalizerSelect, rotSlider
  } = shell;
  ({mapBtn, pasticciaccioBtn, reliefBtn, stagePrevBtn, stageNextBtn, stageLabel, seqModeToggle, seqChapterBtn, seqPageBtn, orderBtn, seqSlider, seqLabel, roleLegend, roleButtons, pageRibbon, ribbonWrap: pageRibbonShell, ribbonPrevBtn, ribbonNextBtn, legendRow, lodLabel} = shell);

  const disposeHandlers = s4ChartHandlers.install({
    shell,
    constants: {SEQ_ENABLED_IN_MAP, SEQ_PLAY_MS, PLAY_MS, N_CHAPTERS},
    state: {
      chapter: () => chapter, setChapter: v => { chapter = v; },
      focalizer: () => focalizer, setFocalizer: v => { focalizer = v; },
      seqMode: () => seqMode, setSeqMode: v => { seqMode = v; },
      seqPos: () => seqPos,
      setSeqOccDirty: v => { seqOccDirty = v; },
      roleSortTarget: () => roleSortTarget, setRoleSortTarget: v => { roleSortTarget = v; },
      setPlanRot: v => { planRot = v; },
      diagramOpenedOnce: () => diagramOpenedOnce,
      tiltTarget: () => tiltTarget,
      crimpTarget: () => crimpTarget,
      showFictitious: () => showFictitious, setShowFictitious: v => { showFictitious = v; },
      playing: () => playing, setPlaying: v => { playing = v; },
      playTimer: () => playTimer, setPlayTimer: v => { playTimer = v; }
    },
    actions: {
      setSeqPos, nearestSeqPos, seqTrack, seqTrackIndex, lastSeqPosOfChapter, firstSeqPosOfChapter,
      chapterOfCursor, seqEnabledNow, updateSeqUi, moveStage, moveSeqChapter, toggleRoleFilter, applyStage, clearSelectedRoute: () => routeSelection.clear(),
      freezeRotPivot,
      cancelFrame: () => cancelAnimationFrame(raf)
    }
  });

  updateSeqUi();
  wrap.dispose = () => {
    disposeHandlers();
    listeners.abort();
    document.removeEventListener("keydown", routeKeydown);
    d3.select(canvas).on(".zoom", null);
  };
  return wrap;
}
