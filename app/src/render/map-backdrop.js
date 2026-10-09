import * as d3 from "d3";

// ===== CELLA: s4ChartMapBackdrop =====
// -- CELLA: s4ChartMapBackdrop --
// Anelli metrici, confini delle celle e cerchi dei referenziali fuori mappa.
const s4ChartMapBackdrop = (() => {
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
    contentAlpha, cellPoint, displayPts, cognitiveTileRadius, displayCellScale, offmapPresence
  }) {
    let metricTicks = [];
    if (crimpEased > 0.01) {
      context.save();
      const ringsArr = activeRanked[chapter].rings;
      context.setLineDash([3 * invK, 7 * invK]);
      context.lineWidth = RING_GUIDE_WIDTH * 0.7 * invK;
      for (const dKm of METRIC_ISOLINES_KM) {
        const rMetric = radiusForDistance(dKm, ringsArr);
        if (rMetric == null) continue;
        metricTicks.push({dKm, rMetric});
        const rDraw = rMetric * cogScaleDyn;
        context.strokeStyle = `rgba(${GRID_COLOR},${RING_GUIDE_ALPHA * 0.58 * crimpEased})`;
        context.beginPath();
        context.arc(cogCenter[0], cogCenter[1], rDraw, 0, Math.PI * 2);
        context.stroke();
      }
      context.setLineDash([]);
      context.restore();
    }

    const profileBordersT0 = PROFILE ? performance.now() : 0;
    if (crimpEased <= 0.01) {
      context.beginPath();
      for (const {poly, bbox: pbbox} of segments){
        const near = nearDrop(pbbox);
        const p0 = near ? deform(poly[0][0],poly[0][1]) : poly[0]; context.moveTo(p0[0],p0[1]);
        for (let i=1;i<poly.length;i++){ const p = near ? deform(poly[i][0],poly[i][1]) : poly[i]; context.lineTo(p[0],p[1]); }
      }
      context.lineWidth=BORDER_WIDTH*invK;
      context.strokeStyle=`rgba(${GRID_COLOR},${GRID_ALPHA})`;
      context.lineJoin="round";
      context.lineCap="round";
      context.stroke();
    } else {
      context.lineWidth=BORDER_WIDTH*invK;
      context.lineJoin="round";
      context.lineCap="round";
      for (let i=0;i<cellRings.length;i++){
        const cr = cellRings[i];
        if (!cr || !cr.ring || cr.ring.length < 3) continue;
        if (i >= N_GEO && fictBirthEased[i] <= BIRTH_EPSILON) continue;
        if (!isBorn(i, chapter) && birthEased[i] <= BIRTH_EPSILON) continue;
        const entering = birthEased[i] < 0.999;
        const visible = i >= N_GEO ? fictBirthEased[i] : (entering ? birthEased[i] : 1);
        const cellAlpha = 0.42 * contentAlpha(i, {presence: visible, crimp: true});
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
    return {metricTicks, profileBordersMs: PROFILE ? performance.now() - profileBordersT0 : 0};
  }

  return { draw };
})();

export default s4ChartMapBackdrop;
