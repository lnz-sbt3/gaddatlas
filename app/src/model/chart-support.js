// ===== CELLA: s4ChartSupport =====
  // -- CELLA: s4ChartSupport --
  // Helper matematici puri usati dalla cella chartS4.
  const s4ChartSupport = (() => {
  function bandsOfTile({i, occEased, focalizer, BANDS_MAX, bandsFor}) {
    const occ = occEased[i] || 0;
    return focalizer != null ? Math.min(BANDS_MAX, Math.round(occ)) : bandsFor(occ);
  }

  function baseWorldPt({i, N_GEO, pts, cogCenter}) {
    return i < N_GEO ? pts[i].slice() : cogCenter.slice();
  }

  function deformPoint({px, py, drop, effRadius, transform, crimpEased}) {
    const dx = px - drop.x, dy = py - drop.y, dist = Math.hypot(dx, dy);
    if (drop.s < 0.5 || dist < 1e-6) return [px, py];
    const q = dist / effRadius;
    if (q >= 1) return [px, py];
    const falloff = (1 - q * q) * (1 - q * q);
    const amp = (drop.s / transform.k) * (1 - crimpEased) * falloff;
    return [px + dx / dist * amp, py + dy / dist * amp];
  }

  function nearDropBBox({box, drop, effInfluence}) {
    if (drop.s < 0.5) return false;
    const dx = Math.max(box[0] - drop.x, 0, drop.x - box[2]);
    const dy = Math.max(box[1] - drop.y, 0, drop.y - box[3]);
    return dx * dx + dy * dy <= effInfluence * effInfluence;
  }

  function focalAlpha(focalEased, i) {
    return focalEased[i] == null ? 1 : focalEased[i];
  }

  function offmapPresence(crimpEased, threshold) {
    return Math.max(0, Math.min(1, crimpEased / threshold));
  }

  function alphaBucket(alpha) {
    return Math.max(0, Math.min(1, Math.round(alpha * 255) / 255));
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function seqPage(row) {
    const p = Number(row?.page);
    return Number.isFinite(p) ? p : null;
  }

  function effRoleName(row) {
    return row?.role || (row?.isRouteNode ? "Route" : null);
  }

  function effRoleIdx(row, roleOrder) {
    const r = effRoleName(row);
    const idx = roleOrder.indexOf(r);
    return idx >= 0 ? idx : -1;
  }

  function hitState(fields) {
    const {drop, chapter, crimpEased, tiltEased, planRot, rotPivot, transform, showFictitious, seqMode, seqPos} = fields;
    return {
      x: drop.x, y: drop.y, s: drop.s,
      chapter, crimpEased, tiltEased, planRot,
      rpx: rotPivot[0], rpy: rotPivot[1],
      tx: transform.x, ty: transform.y, tk: transform.k,
      showFictitious,
      seqMode,
      seqPos
    };
  }

  function sameHitState(a, b) {
    return !!a
      && a.x === b.x
      && a.y === b.y
      && a.s === b.s
      && a.chapter === b.chapter
      && a.crimpEased === b.crimpEased
      && a.tiltEased === b.tiltEased
      && a.planRot === b.planRot
      && a.rpx === b.rpx
      && a.rpy === b.rpy
      && a.tx === b.tx
      && a.ty === b.ty
      && a.tk === b.tk
      && a.showFictitious === b.showFictitious
      && a.seqMode === b.seqMode
      && a.seqPos === b.seqPos;
  }

  return {
    bandsOfTile, baseWorldPt, deformPoint, nearDropBBox,
    focalAlpha, offmapPresence, alphaBucket, clamp01,
    seqPage, effRoleName, effRoleIdx, hitState, sameHitState
  };
})();

export default s4ChartSupport;
