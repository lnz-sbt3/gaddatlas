import s4Config from "../model/config.js";

// ===== CELLA: s4RouteHoverDrawing =====
  // -- CELLA: s4RouteHoverDrawing --
  const s4RouteHoverDrawing = (() => {
  let lastRouteArcs = [];
  const {
    ARC_RISE, ARC_RISE_MIN_PX, ARC_RISE_MAX_PX, ARC_SAMPLES,
    ARC_WIDTH_MIN, ARC_WIDTH_MAX, ARC_CASING_PX, ARC_JOINT_R, ARC_JOINT_RING_PX, BG_COLOR
  } = s4Config;

  function buildStepPoints({ routes, routePointOf, birthEased, fictBirthEased, N_GEO, BIRTH_EPSILON }) {
    const routeStepPoints = [];
    if (!routes || !routes.length) return routeStepPoints;
    for (const route of routes) {
      const pts2 = [];
      for (let s = 0; s < route.steps.length; s++) {
        const step = route.steps[s];
        const i = step[0];
        const visible = i != null && ((i >= N_GEO ? fictBirthEased[i] : birthEased[i]) > BIRTH_EPSILON);
        // Un vertice di route coincide col centro del rilievo disegnato: il
        // generatore Voronoi grezzo non e' il centro del disegno quando la cella
        // viene scalata e riposizionata.
        const routePoint = visible ? routePointOf(i) : null;
        const point = routePoint ? routePoint.point : null;
        const z = routePoint ? routePoint.z : null;
        const order = route.stepOrders?.[s] ?? (s + 1);
        pts2.push(point ? {point: [point[0], point[1]], z, order} : null);
      }
      routeStepPoints.push(pts2);
    }
    return routeStepPoints;
  }

  function buildArc(A, zA, B, zB, frame) {
    const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const h = Math.max(ARC_RISE_MIN_PX * frame.invK, Math.min(ARC_RISE_MAX_PX * frame.invK, ARC_RISE * d));
    const samples = Math.max(2, ARC_SAMPLES);
    const pts = [];
    for (let s = 0; s < samples; s++) {
      const t = samples === 1 ? 0 : s / (samples - 1);
      const x = A[0] + (B[0] - A[0]) * t;
      const y = A[1] + (B[1] - A[1]) * t;
      const z = zA + (zB - zA) * t + h * Math.sin(Math.PI * t);
      const p = frame.painters.zPoint(frame, x, y, z);
      pts.push({point: p, t});
    }
    return pts;
  }

  function arcPolygon(arc, widthPx, frame) {
    const left = [], right = [];
    for (let i = 0; i < arc.length; i++) {
      const prev = arc[Math.max(0, i - 1)].point;
      const next = arc[Math.min(arc.length - 1, i + 1)].point;
      let dx = next[0] - prev[0], dy = next[1] - prev[1];
      let len = Math.hypot(dx, dy);
      if (len < 1e-6 && i > 0) {
        dx = arc[i].point[0] - arc[i - 1].point[0];
        dy = arc[i].point[1] - arc[i - 1].point[1];
        len = Math.hypot(dx, dy);
      }
      if (len < 1e-6) len = 1;
      const nx = -dy / len, ny = dx / len;
      const t = arc[i].t;
      const w = (ARC_WIDTH_MIN + (ARC_WIDTH_MAX - ARC_WIDTH_MIN) * t + widthPx) * frame.invK * 0.5;
      const p = arc[i].point;
      left.push([p[0] + nx * w, p[1] + ny * w]);
      right.push([p[0] - nx * w, p[1] - ny * w]);
    }
    const path = new Path2D();
    if (!left.length) return path;
    path.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) path.lineTo(left[i][0], left[i][1]);
    for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
    path.closePath();
    return path;
  }

  function drawArcs({ context, routeStepPoints, routeHoverEased, routeRgb, frame }) {
    lastRouteArcs = [];
    if (routeHoverEased <= 0.01 || !routeStepPoints.length) return;
    const arcs = [];
    for (const pts2 of routeStepPoints) {
      let prev = null;
      for (const p of pts2) {
        if (p && prev) arcs.push(buildArc(prev.point, prev.z || 0, p.point, p.z || 0, frame));
        prev = p || null;
      }
    }
    if (!arcs.length) return;
    lastRouteArcs = arcs;
    context.save();
    context.fillStyle = BG_COLOR;
    context.globalAlpha = 0.85 * routeHoverEased;
    for (const arc of arcs) context.fill(arcPolygon(arc, ARC_CASING_PX, frame));
    context.fillStyle = routeRgb;
    context.globalAlpha = 0.95 * routeHoverEased;
    for (const arc of arcs) context.fill(arcPolygon(arc, 0, frame));
    context.restore();
  }

  function drawJoints({ context, routeHoverEased, routeRgb, rotNow, tiltNow, invK }) {
    if (routeHoverEased <= 0.01 || !lastRouteArcs.length) return;
    const seen = new Set();
    const nodes = [];
    const snap = 0.5 * invK;
    for (const arc of lastRouteArcs) {
      const endpoints = [arc[0], arc[arc.length - 1]];
      for (const sample of endpoints) {
        if (!sample) continue;
        const p = sample.point;
        const key = `${Math.round(p[0] / snap)},${Math.round(p[1] / snap)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        nodes.push(p);
      }
    }
    if (!nodes.length) return;
    context.save();
    context.globalAlpha = 0.95 * routeHoverEased;
    for (const p of nodes) {
      context.save();
      context.translate(p[0], p[1]);
      context.rotate(-rotNow);
      context.scale(1, 1 / Math.max(0.001, tiltNow));
      context.beginPath();
      context.fillStyle = BG_COLOR;
      context.arc(0, 0, (ARC_JOINT_R + ARC_JOINT_RING_PX) * invK, 0, 2 * Math.PI);
      context.fill();
      context.beginPath();
      context.fillStyle = routeRgb;
      context.arc(0, 0, ARC_JOINT_R * invK, 0, 2 * Math.PI);
      context.fill();
      context.restore();
    }
    context.restore();
  }

  function drawOrdinals({ context, routeStepPoints, routeHoverEased, rotNow, tiltNow, labelSize, invK, bgColor, routeRgb }) {
    if (routeHoverEased <= 0.01 || !routeStepPoints.length) return;
    context.save();
    context.globalAlpha = routeHoverEased;
    for (const pts2 of routeStepPoints) {
      pts2.forEach((p, s) => {
        if (!p) return;
        context.save();
        context.translate(p.point[0], p.point[1]);
        context.rotate(-rotNow);
        context.scale(1, 1 / Math.max(0.001, tiltNow));
        context.font = `700 ${labelSize * 0.8 * invK}px sans-serif`;
        context.textAlign = "center"; context.textBaseline = "middle";
        context.lineJoin = "round"; context.lineWidth = 3 * invK;
        context.strokeStyle = bgColor;
        const label = String(p.order ?? (s + 1));
        context.strokeText(label, 0, 14 * invK);
        context.fillStyle = routeRgb;
        context.fillText(label, 0, 14 * invK);
        context.restore();
      });
    }
    context.restore();
  }

  return { buildStepPoints, drawArcs, drawJoints, drawOrdinals };
})();

export default s4RouteHoverDrawing;
