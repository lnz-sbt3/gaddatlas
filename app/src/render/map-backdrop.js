import * as d3 from "d3";

// Anelli metrici, confini delle celle e cerchi dei referenziali fuori mappa.
const atlasMapBackdrop = (() => {
  function radiusForDistance(dKm, rings) {
    if (!rings.length) return null;
    let prevD = 0, prevR = 0;
    for (const ring of rings) {
      const maxD = d3.max(ring.items, it => it.distanceKm);
      if (maxD == null) continue;
      if (dKm <= maxD) {
        const t = maxD > prevD ? (dKm - prevD) / (maxD - prevD) : 1;
        return prevR + (ring.radius - prevR) * t;
      }
      prevD = maxD;
      prevR = ring.radius;
    }
    return null;
  }

  function draw({
    context, PROFILE, crimpEased, activeRanked, chapter, METRIC_ISOLINES_KM,
    invK, cogCenter, cogScaleDyn, GRID_COLOR, GRID_ALPHA, RING_GUIDE_ALPHA,
    RING_GUIDE_WIDTH, BORDER_WIDTH, segments, nearDrop, deform, cellRings,
    N_INMAP, N_GEO, fictBirthEased, birthEased, BIRTH_EPSILON, isBorn,
    contentAlpha, cellPoint, displayPts, cognitiveTileRadius, displayCellScale, offmapPresence, cellOutline = () => 1, cellWidth = () => 1,
    ringLevel = null, cssUnit = null, paper = null
  }) {
    let ringLabels = null;
    let metricTicks = [];
    if (crimpEased > 0.01) {
      context.save();
      const ringsArr = activeRanked[chapter].rings;
      // Corone metriche (RINGS.level): 'tenue' tratteggio a 1,26:1; 'medio' filo a 2,4:1 e bande alterne;
      // 'marcato' filo a 3,3:1, bande alterne ed etichetta su ogni corona. Le bande sono velature, non campiture.
      const L = ringLevel || {dash: true, alpha: RING_GUIDE_ALPHA * 0.58, width: RING_GUIDE_WIDTH * 0.7, band: 0}, unit = cssUnit || invK;
      const drawn = [];
      for (const dKm of METRIC_ISOLINES_KM) { const rMetric = radiusForDistance(dKm, ringsArr); if (rMetric != null) { metricTicks.push({dKm, rMetric}); drawn.push([dKm, rMetric * cogScaleDyn]); } }
      if (L.band > 0) drawn.forEach(([, r], k) => { if (k % 2) return; const inner = k ? drawn[k - 1][1] : 0; context.beginPath(); context.arc(cogCenter[0], cogCenter[1], r, 0, Math.PI * 2); if (inner > 0) context.arc(cogCenter[0], cogCenter[1], inner, 0, Math.PI * 2, true); context.fillStyle = `rgba(${GRID_COLOR},${L.band * crimpEased})`; context.fill("evenodd"); });
      if (L.dash) context.setLineDash([3 * invK, 7 * invK]);
      context.lineWidth = L.dash ? L.width * invK : L.width * unit;
      for (const [dKm, rDraw] of drawn) {
        context.strokeStyle = `rgba(${GRID_COLOR},${L.alpha * crimpEased})`;
        context.beginPath();
        context.arc(cogCenter[0], cogCenter[1], rDraw, 0, Math.PI * 2);
        context.stroke();
      }
      context.setLineDash([]);
      context.restore();
      if (L.labels) ringLabels = drawn;
    }

    const profileBordersT0 = PROFILE ? performance.now() : 0;
    if (crimpEased <= 0.01) {
      context.beginPath();
      for (const {poly, bbox: pbbox} of segments){
        const near = nearDrop(pbbox);
        const p0 = near ? deform(poly[0][0],poly[0][1]) : poly[0]; context.moveTo(p0[0],p0[1]);
        for (let i=1;i<poly.length;i++){ const p = near ? deform(poly[i][0],poly[i][1]) : poly[i]; context.lineTo(p[0],p[1]); }
      }
      context.lineJoin="round";
      context.lineCap="round";
      // Riserva di carta sotto i confini: con la carta visibile il tratto incide il suolo del 1925
      // invece di aggiungere inchiostro; sulla pergamena nuda il sottotratto è invisibile.
      if (paper && paper.reserveAlpha > 0.003) {
        const bg = typeof paper.bg === 'string' && paper.bg.startsWith('#')
          ? `${parseInt(paper.bg.slice(1, 3), 16)},${parseInt(paper.bg.slice(3, 5), 16)},${parseInt(paper.bg.slice(5, 7), 16)}`
          : paper.bg;
        context.lineWidth = (BORDER_WIDTH + paper.reserveWidthCSS) * invK;
        context.strokeStyle = `rgba(${bg},${paper.reserveAlpha})`;
        context.stroke();
      }
      // Al polo carta i confini restano come selettori: dal valore ordinario a un filo minimo.
      const borderAlpha = paper ? GRID_ALPHA * (1 - paper.lever) + paper.floor * paper.lever : GRID_ALPHA;
      context.lineWidth=BORDER_WIDTH*invK;
      context.strokeStyle=`rgba(${GRID_COLOR},${borderAlpha})`;
      context.stroke();
    } else {
      context.lineWidth=BORDER_WIDTH*invK;
      context.lineJoin="round";
      context.lineCap="round";
      // Anche nelle relazioni il cursore della carta fa arretrare i contorni: le impronte restano leggibili.
      const paperScale = paper ? (1 - paper.lever) + paper.lever * Math.min(1, paper.floor / GRID_ALPHA) : 1;
      for (let i=0;i<cellRings.length;i++){
        const cr = cellRings[i];
        if (!cr || !cr.ring || cr.ring.length < 3) continue;
        if (i >= N_GEO && fictBirthEased[i] <= BIRTH_EPSILON) continue;
        if (!isBorn(i, chapter) && birthEased[i] <= BIRTH_EPSILON) continue;
        const entering = birthEased[i] < 0.999;
        const visible = i >= N_GEO ? fictBirthEased[i] : (entering ? birthEased[i] : 1);
        const cellAlpha = 0.42 * paperScale * contentAlpha(i, {presence: visible, crimp: true}) * cellOutline(i);
        if (cellAlpha <= 0.001) continue;
        context.beginPath();
        const p0 = cellPoint(i, cr.ring[0][0], cr.ring[0][1], true);
        context.moveTo(p0[0], p0[1]);
        for (let j=1;j<cr.ring.length;j++){
          const p = cellPoint(i, cr.ring[j][0], cr.ring[j][1], true);
          context.lineTo(p[0], p[1]);
        }
        context.closePath();
        context.strokeStyle=`rgba(${GRID_COLOR},${cellAlpha})`;
        context.lineWidth = BORDER_WIDTH * invK * cellWidth(i);
        context.stroke();
      }
    }

    if (crimpEased > 0.01) {
      context.save();
      context.lineWidth = BORDER_WIDTH * invK;
      context.setLineDash([]);
      const offmapAlpha = offmapPresence();
      for (let i = N_INMAP; i < N_GEO; i++) {
        if (birthEased[i] <= BIRTH_EPSILON) continue;
        if (offmapAlpha <= BIRTH_EPSILON) continue;
        const r = cognitiveTileRadius[i] * displayCellScale[i];
        context.beginPath();
        const [cx, cy] = displayPts[i];
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${GRID_COLOR},${0.42 * contentAlpha(i, {presence: birthEased[i], crimp: true})})`;
        context.stroke();
      }
      context.restore();
    }
    return {metricTicks, ringLabels, profileBordersMs: PROFILE ? performance.now() - profileBordersT0 : 0};
  }

  return { draw };
})();

export default atlasMapBackdrop;
