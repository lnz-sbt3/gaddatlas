import * as d3 from "d3";
import s4Config from "../model/config.js";
import s4RayCellDistance from "../model/ray-cell-distance.js";

// ===== CELLA: s4IsoEngine =====
// -- CELLA: s4IsoEngine --
// Motore isolinee senza stato di frame: profili, armoniche e buffer sono cache
// geometriche invarianti. traceIsoline riceve posizione, scala e livello dal
// chiamante, cosi' chartS4 conserva tutto lo stato mutabile della lettura.
export default function s4IsoEngine(s4Voronoi, s4NarrativeCells) {
  const {
    ISO_ANGLES, ISO_OUTER, ISO_INNER, ISO_SUMMIT_BIAS, ISO_DRIFT,
    ISO_WOBBLE, ISO_MARGIN, ISO_ECC_DAMP
  } = s4Config;
  const { cellRings: baseCellRings } = s4Voronoi;
  const { narrativeCellRings } = s4NarrativeCells;
  const rayCellDistance = s4RayCellDistance;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);

  // Profilo radiale grezzo di ogni cella: distanza generatore->bordo su
  // ISO_ANGLES direzioni. Dipende solo dalla geometria Voronoi/narrativa.
  const isoProfile = cellRings.map((cr, i) => {
    if (!cr) return null;
    const prof = new Float64Array(ISO_ANGLES);
    for (let k = 0; k < ISO_ANGLES; k++) {
      const ang = (k / ISO_ANGLES) * 6.2831853;
      prof[k] = rayCellDistance(cr.gx, cr.gy, Math.cos(ang), Math.sin(ang), cr.cell);
    }
    return prof;
  });
  const isoProfileMin = isoProfile.map(p => p ? Math.min(...p) : 0);
  const isoProfileMed = isoProfile.map(p => p ? d3.median(p) : 0);

  const isoBufX = new Float64Array(ISO_ANGLES);
  const isoBufY = new Float64Array(ISO_ANGLES);
  const isoCosA = new Float64Array(ISO_ANGLES), isoSinA = new Float64Array(ISO_ANGLES);
  const isoS2 = new Float64Array(ISO_ANGLES), isoC2 = new Float64Array(ISO_ANGLES);
  const isoS3 = new Float64Array(ISO_ANGLES), isoC3 = new Float64Array(ISO_ANGLES);
  const isoS5 = new Float64Array(ISO_ANGLES), isoC5 = new Float64Array(ISO_ANGLES);
  for (let k = 0; k < ISO_ANGLES; k++) {
    const a = (k / ISO_ANGLES) * 6.2831853;
    isoCosA[k] = Math.cos(a);   isoSinA[k] = Math.sin(a);
    isoS2[k] = Math.sin(a*2);   isoC2[k] = Math.cos(a*2);
    isoS3[k] = Math.sin(a*3);   isoC3[k] = Math.cos(a*3);
    isoS5[k] = Math.sin(a*5);   isoC5[k] = Math.cos(a*5);
  }

  function traceIsoline(path, fillPath, cx, cy, radii, rConst, sCell, rMin, rMed, seed, level, packing, outPts, align = 0) {
    const N = radii ? radii.length : ISO_ANGLES;
    const aAlign = Math.max(0, Math.min(1, align || 0));
    const inner = ISO_OUTER - (ISO_OUTER - ISO_INNER) * packing;
    const t = inner + (ISO_OUTER - inner) * level;
    const sx = Math.cos(seed * 6.2831853) * ISO_SUMMIT_BIAS * rMin * (1 - level) * (1 - aAlign);
    const sy = Math.sin(seed * 6.2831853 * 1.31) * ISO_SUMMIT_BIAS * rMin * (1 - level) * (1 - aAlign);
    const hyp = Math.hypot(sx, sy);
    const p = seed * 6.2831853, d = level * ISO_DRIFT * 6.2831853 * (1 - aAlign);
    const f1 = p + d, f2 = p*1.7 - d*0.6, f3 = p*2.3 + d*1.4;
    const sf1 = Math.sin(f1), cf1 = Math.cos(f1);
    const sf2 = Math.sin(f2), cf2 = Math.cos(f2);
    const sf3 = Math.sin(f3), cf3 = Math.cos(f3);
    const wobbleNow = ISO_WOBBLE * (0.45 + 0.55 * level);
    const wobbleAmp = wobbleNow + (ISO_WOBBLE - wobbleNow) * aAlign;

    for (let k = 0; k < N; k++) {
      const rBound = radii ? radii[k] * sCell : rConst;
      if (rBound <= 0) return false;
      const rShape = rMed + (rBound - rMed) * ISO_ECC_DAMP;
      const noise = (isoS2[k]*cf1 + isoC2[k]*sf1) * 0.5
                  + (isoS3[k]*cf2 + isoC3[k]*sf2) * 0.32
                  + (isoS5[k]*cf3 + isoC5[k]*sf3) * 0.18;
      let r = rShape * t * (1 + noise * wobbleAmp);
      const budget = rBound * ISO_MARGIN - hyp;
      if (budget <= 0) return false;
      if (r > budget) r = budget;
      isoBufX[k] = cx + isoCosA[k] * r + sx;
      isoBufY[k] = cy + isoSinA[k] * r + sy;
    }
    if (outPts) {
      outPts.length = 0;
      for (let k = 0; k < N; k++) outPts.push([isoBufX[k], isoBufY[k]]);
    }

    const fx = isoBufX[0], fy = isoBufY[0];
    const lx = isoBufX[N-1], ly = isoBufY[N-1];
    function addCurve(targetPath) {
      if (!targetPath) return;
      targetPath.moveTo((lx + fx) / 2, (ly + fy) / 2);
      for (let k = 0; k < N; k++) {
        const nk = (k + 1) % N;
        targetPath.quadraticCurveTo(isoBufX[k], isoBufY[k], (isoBufX[k] + isoBufX[nk]) / 2, (isoBufY[k] + isoBufY[nk]) / 2);
      }
      targetPath.closePath();
    }
    addCurve(path);
    addCurve(fillPath);
    return true;
  }

  return { isoProfile, isoProfileMin, isoProfileMed, traceIsoline };
}
