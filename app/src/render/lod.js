import * as d3 from "d3";
import s4Config from "../model/config.js";

// ===== CELLA: s4LodPicking =====
  // -- CELLA: s4LodPicking --
  // Misure LOD e risoluzione della terrazza interrogata.
  const s4LodPicking = (() => {
  // Misura in pixel l'alzata e la pedata disponibili sullo schermo.
  function lodMetrics({s4Painters, tiltNow, transform, isoProfileMed, displayCellScale, N_INMAP, zScaleNow}) {
    const invTilt = 1 / Math.max(0.001, tiltNow);
    const alzataPx = s4Painters.AXON_Z_STEP * zScaleNow * transform.k * invTilt;
    let acc = 0, n = 0;
    for (let i = 0; i < N_INMAP; i++) {
      const m = isoProfileMed[i];
      if (!(m > 0)) continue;
      acc += m * displayCellScale[i];
      n++;
    }
    const rMedAvg = n ? acc / n : 0;
    const pedataPx = s4Painters.TER_STEP_FRAC * rMedAvg * transform.k;
    return { alzataPx, pedataPx };
  }

  // Dalla cima verso il basso, seleziona la prima calotta che contiene il cursore.
  function pickTerrace({terraceCurveCache, hostIndex, painters, x, y}) {
    const c = terraceCurveCache;
    if (!c.curves || c.index < 0) return -1;
    if (c.index !== hostIndex) return -1;
    const f = {tiltNow: c.tiltNow, rotSinNow: c.rotSinNow, rotCosNow: c.rotCosNow};
    const tol = (s4Config.PICK_TOLERANCE_PX || 0) * (c.invK || 1);
    const dilate = poly => {
      if (!(tol > 0) || !poly.length) return poly;
      let center = d3.polygonCentroid(poly);
      if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
        center = poly.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map(v => v / poly.length);
      }
      return poly.map(p => {
        const dx = p[0] - center[0], dy = p[1] - center[1];
        const d = Math.hypot(dx, dy);
        return d > 1e-6 ? [center[0] + dx * (1 + tol / d), center[1] + dy * (1 + tol / d)] : p;
      });
    };
    for (let k = c.curves.length - 1; k >= 1; k--) {
      const z = painters.axonZOf(k) * c.zScale;
      const poly = dilate(c.curves[k].map(p => painters.zPoint(f, p[0], p[1], z)));
      if (d3.polygonContains(poly, [x, y])) return k;
    }
    for (let k = c.curves.length - 1; k >= 1; k--) {
      const z0 = painters.axonZOf(k - 1) * c.zScale;
      const poly = dilate(c.curves[k].map(p => painters.zPoint(f, p[0], p[1], z0)));
      if (d3.polygonContains(poly, [x, y])) return k;
    }
    return -1;
  }

  function curveRadius(curve) {
    if (!curve || !curve.length) return 0;
    const c = d3.polygonCentroid(curve);
    const center = Number.isFinite(c[0]) && Number.isFinite(c[1])
      ? c
      : curve.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map(v => v / curve.length);
    return curve.reduce((acc, p) => acc + Math.hypot(p[0] - center[0], p[1] - center[1]), 0) / curve.length;
  }

  function makePickLogger({PROFILE, painters}) {
    let lastPickLogKey = null;
    return function logPickDiagnostics(cache) {
      if (!PROFILE || !cache || !cache.curves || cache.index < 0) return;
      const B = Math.min(cache.B || 0, cache.curves.length - 1);
      if (B < 1) return;
      const regime = cache.crimpEased > 0.5 ? "diagramma" : "mappa";
      const key = `${cache.index}:${regime}`;
      if (key === lastPickLogKey) return;
      const radii = d3.range(1, B + 1).map(k => curveRadius(cache.curves[k])).sort((a, b) => a - b);
      let distinctCapRadii = 0;
      for (const r of radii) {
        if (!distinctCapRadii || Math.abs(r - radii[distinctCapRadii - 1]) >= 0.5) {
          radii[distinctCapRadii++] = r;
        }
      }
      console.log("[pick]", {
        hostIndex: cache.index,
        regime,
        crimpEased: +cache.crimpEased.toFixed(3),
        k: +cache.transformK.toFixed(2),
        B,
        packing: +cache.packing.toFixed(3),
        rMed: +cache.rMed.toFixed(2),
        rCurve1: +curveRadius(cache.curves[1]).toFixed(2),
        rCurveB: +curveRadius(cache.curves[B]).toFixed(2),
        distinctCapRadii,
        dzPx: +(painters.axonZOf(1) * cache.zScale * cache.transformK / Math.max(0.001, cache.tiltNow)).toFixed(2)
      });
      lastPickLogKey = key;
    };
  }

  return { lodMetrics, pickTerrace, makePickLogger };
})();

export default s4LodPicking;
