import * as d3 from "d3";
import s4Config from "../model/config.js";

// ===== CELLA: s4Interaction =====
// -- CELLA: s4Interaction --
// Interazioni e conversioni geometriche parametrizzate: transform, centro, tilt,
// rotazione e buffer di frame restano in chartS4 e vengono passati a ogni chiamata.
export default function s4Interaction(s4Entities, s4Projection, s4Voronoi, s4NarrativeCells) {
  const { BIRTH_EPSILON, STRENGTH } = s4Config;
  const { allData, N_INMAP, N_GEO } = s4Entities;
  const { pts, bbox, width, height, geographicAngle } = s4Projection;
  const { delaunay, cellRings: baseCellRings, cognitiveTileRadius: baseCognitiveTileRadius } = s4Voronoi;
  const { narrativeCellRings, narrativeTileRadius } = s4NarrativeCells;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);
  const cognitiveTileRadius = baseCognitiveTileRadius.map((r, i) => narrativeCellRings[i] ? narrativeTileRadius[i] : r);
  const cellRingBBoxes = cellRings.map(cr => {
    if (!cr || !cr.ring || cr.ring.length < 3) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of cr.ring) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
  });
  const hitPolyBuf = [];

  function findDisplayHost(frame, x, y) {
    const cognitiveMode = frame.crimpEased > 0.01;
    if (!cognitiveMode) {
      if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) return -1;
      return delaunay.find(x, y);
    }
    for (let i=0;i<cellRings.length;i++){
      if (i >= N_GEO) continue;
      const cr = cellRings[i];
      if (!cr || !cr.ring || cr.ring.length < 3) continue;
      if (frame.birthEased[i] <= BIRTH_EPSILON) continue;
      const cognitiveBirthScale = 0.35 + 0.65 * frame.birthEased[i];
      const birthScale = 1 + (cognitiveBirthScale - 1) * frame.crimpEased;
      const s = frame.displayCellScale[i] * birthScale;
      const bb = cellRingBBoxes[i];
      const tx0 = frame.displayPts[i][0] + (bb[0] - cr.gx) * s;
      const ty0 = frame.displayPts[i][1] + (bb[1] - cr.gy) * s;
      const tx1 = frame.displayPts[i][0] + (bb[2] - cr.gx) * s;
      const ty1 = frame.displayPts[i][1] + (bb[3] - cr.gy) * s;
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      hitPolyBuf.length = 0;
      for (const [px, py] of cr.ring) {
        hitPolyBuf.push([
          frame.displayPts[i][0] + (px - cr.gx) * s,
          frame.displayPts[i][1] + (py - cr.gy) * s
        ]);
      }
      if (d3.polygonContains(hitPolyBuf, [x, y])) return i;
    }
    for (let i = N_INMAP; i < N_GEO; i++) {
      if (frame.birthEased[i] <= BIRTH_EPSILON) continue;
      const r = cognitiveTileRadius[i] * frame.displayCellScale[i];
      const [cx, cy] = frame.displayPts[i];
      if (Math.hypot(x - cx, y - cy) <= r) return i;
    }
    return -1;
  }

  function findFictHost(frame, x, y) {
    for (let i = N_GEO; i < allData.length; i++) {
      if (frame.fictBirthEased[i] <= BIRTH_EPSILON) continue;
      const cr = cellRings[i];
      if (!cr || !cr.ring || cr.ring.length < 3) continue;
      const s = frame.displayCellScale[i];
      const bb = cellRingBBoxes[i];
      const tx0 = frame.displayPts[i][0] + (bb[0] - cr.gx) * s;
      const ty0 = frame.displayPts[i][1] + (bb[1] - cr.gy) * s;
      const tx1 = frame.displayPts[i][0] + (bb[2] - cr.gx) * s;
      const ty1 = frame.displayPts[i][1] + (bb[3] - cr.gy) * s;
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      hitPolyBuf.length = 0;
      for (const [px, py] of cr.ring) {
        hitPolyBuf.push([
          frame.displayPts[i][0] + (px - cr.gx) * s,
          frame.displayPts[i][1] + (py - cr.gy) * s
        ]);
      }
      if (d3.polygonContains(hitPolyBuf, [x, y])) return i;
    }
    return -1;
  }

  // L'hit test riporta il cursore a terra per ogni quota e sceglie il rilievo piu' vicino.
  function findAxonHost(frame, x, y, bandsOf, opts = {}) {
    const focalActive = !!opts.focalActive;
    let best = -1, bestDepth = -Infinity;
    for (let i = 0; i < cellRings.length; i++) {
      const cr = cellRings[i];
      const born = i >= N_GEO ? frame.fictBirthEased[i] : frame.birthEased[i];
      const hasCell = !!(cr && cr.ring && cr.ring.length >= 3);
      const drawnRegardless = hasCell && i < N_INMAP && frame.crimpEased <= 0.01;
      if (!drawnRegardless && born <= BIRTH_EPSILON) continue;
      if (!cr || !cr.ring || cr.ring.length < 3) {
        if (!(i >= N_INMAP && i < N_GEO)) continue;
        const B = bandsOf(i);
        // Il silenzio di una tessera e' una condizione del FILTRO per personaggio,
        // non della proiezione assonometrica: senza filtro resta interrogabile la base.
        if (focalActive && B < 1) continue;
        const kMax = Math.max(0, B);
        const [dx0, dy0] = frame.displayPts[i];
        const r = cognitiveTileRadius[i] * frame.displayCellScale[i];
        let hit = false;
        for (let k = 0; k <= kMax && !hit; k++) {
          const dz = k * frame.zStep;
          const qx = x + dz * frame.rotSinNow;
          const qy = y + dz * frame.rotCosNow;
          if (Math.hypot(qx - dx0, qy - dy0) <= r) hit = true;
        }
        if (!hit) continue;
        const depth = dx0 * frame.rotSinNow + dy0 * frame.rotCosNow;
        if (depth > bestDepth) { bestDepth = depth; best = i; }
        continue;
      }
      const B = bandsOf(i);
      // Il silenzio di una tessera e' una condizione del FILTRO per personaggio,
      // non della proiezione assonometrica: senza filtro resta interrogabile la base.
      if (focalActive && B < 1) continue;
      const kMax = Math.max(0, B);
      const bb = cellRingBBoxes[i];
      const s = frame.displayCellScale[i];
      const [dx0, dy0] = frame.displayPts[i];
      let hit = false;
      for (let k = 0; k <= kMax && !hit; k++) {
        const dz = k * frame.zStep;
        const qx = x + dz * frame.rotSinNow;
        const qy = y + dz * frame.rotCosNow;
        const tx0 = dx0 + (bb[0] - cr.gx) * s, ty0 = dy0 + (bb[1] - cr.gy) * s;
        const tx1 = dx0 + (bb[2] - cr.gx) * s, ty1 = dy0 + (bb[3] - cr.gy) * s;
        if (qx < tx0 || qx > tx1 || qy < ty0 || qy > ty1) continue;
        hitPolyBuf.length = 0;
        for (const [px, py] of cr.ring) {
          hitPolyBuf.push([dx0 + (px - cr.gx) * s, dy0 + (py - cr.gy) * s]);
        }
        if (d3.polygonContains(hitPolyBuf, [qx, qy])) hit = true;
      }
      if (!hit) continue;
      const depth = dx0 * frame.rotSinNow + dy0 * frame.rotCosNow;
      if (depth > bestDepth) { bestDepth = depth; best = i; }
    }
    return best;
  }

  function unprojectPlanAffine(frame, x, y) {
    if (frame.tiltEased <= 0.01) return [x, y];
    const pivot = frame.rotPivot || frame.cogCenter;
    let dx = x - pivot[0], dy = y - pivot[1];
    dy /= Math.max(0.001, frame.tiltNow);
    const c = Math.cos(-frame.planRot), s = Math.sin(-frame.planRot);
    return [
      pivot[0] + dx * c - dy * s,
      pivot[1] + dx * s + dy * c
    ];
  }

  function toCanvas(frame, canvas, cx, cy) {
    const r = canvas.getBoundingClientRect();
    const px = (cx-r.left)*(width/r.width), py = (cy-r.top)*(height/r.height);
    return unprojectPlanAffine(frame, (px-frame.transform.x)/frame.transform.k+bbox[0], (py-frame.transform.y)/frame.transform.k+bbox[1]);
  }

  function viewportCenterWorld(frame) {
    return [
      (width  / 2 - frame.transform.x) / frame.transform.k + bbox[0],
      (height / 2 - frame.transform.y) / frame.transform.k + bbox[1]
    ];
  }

  function viewportCorners(frame) {
    return [
      [(0 - frame.transform.x) / frame.transform.k + bbox[0], (0 - frame.transform.y) / frame.transform.k + bbox[1]],
      [(width - frame.transform.x) / frame.transform.k + bbox[0], (0 - frame.transform.y) / frame.transform.k + bbox[1]],
      [(0 - frame.transform.x) / frame.transform.k + bbox[0], (height - frame.transform.y) / frame.transform.k + bbox[1]],
      [(width - frame.transform.x) / frame.transform.k + bbox[0], (height - frame.transform.y) / frame.transform.k + bbox[1]],
    ];
  }

  function nearestViewportCorner(frame, targetX, targetY) {
    const corners = viewportCorners(frame);
    let best = corners[0], bestD = Infinity;
    for (const c of corners) {
      const d = Math.hypot(c[0] - targetX, c[1] - targetY);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best.slice();
  }

  function spawnPointAlongAzimuth(frame, angle, marginFactor = 1.15) {
    const [cx, cy] = frame.cogCenter;
    const halfW = (width  / frame.transform.k) / 2;
    const halfH = (height / frame.transform.k) / 2;
    const dx = Math.sin(angle), dy = -Math.cos(angle);
    const tX = Math.abs(dx) < 1e-9 ? Infinity : halfW / Math.abs(dx);
    const tY = Math.abs(dy) < 1e-9 ? Infinity : halfH / Math.abs(dy);
    const t = Math.min(tX, tY) * marginFactor;
    return [cx + dx * t, cy + dy * t];
  }

  return {
    findDisplayHost,
    findFictHost,
    findAxonHost,
    unprojectPlanAffine,
    toCanvas,
    viewportCenterWorld,
      nearestViewportCorner,
    spawnPointAlongAzimuth
  };
}
