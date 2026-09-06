import * as d3 from "d3";
import s4Config from "./config.js";

// Costruzione a incastro: ogni tessera narrativa condivide uno spigolo intero
// con il referenziale o con la tessera padre. Niente Voronoi locale.
export default function s4NarrativeGeometry(s4Entities, s4Voronoi, s4Satellites, s4Chapters) {
  const {
    N_CHAPTERS, COLLAR_DEPTH, COLLAR_DEPTH_DECAY, COLLAR_MITER_MAX,
    CHILD_DEPTH, SHAPE_MIN_V, SHAPE_MAX_V, SHAPE_AMP, REF_TILE_RADIUS_TARGET
  } = s4Config;
  const { allData } = s4Entities;
  const { cellRings: baseCellRings, normalizedCellScale, cognitiveTileRadius } = s4Voronoi;
  const { satellitesByHost, effectiveParent } = s4Satellites;
  const { cumOcc, isBorn } = s4Chapters;

  function signedArea(P) {
    let a = 0;
    for (let i = 0; i < P.length; i++) {
      const A = P[i], B = P[(i + 1) % P.length];
      a += A[0] * B[1] - B[0] * A[1];
    }
    return a / 2;
  }

  function ensureCCW(P) {
    return signedArea(P) >= 0 ? P.slice() : P.slice().reverse();
  }

  function disk(radius, n = 8) {
    return Array.from({length: n}, (_, k) => {
      const a = (Math.PI * 2 * k) / n;
      return [Math.cos(a) * radius, Math.sin(a) * radius];
    });
  }

  function hostPolygon(host) {
    const cr = baseCellRings[host];
    const s = normalizedCellScale[host] || 1;
    if (cr && cr.cell && cr.cell.length >= 4) {
      return ensureCCW(cr.cell.slice(0, cr.cell.length - 1).map(([x, y]) => [
        (x - cr.gx) * s,
        (y - cr.gy) * s
      ]));
    }
    return ensureCCW(disk(cognitiveTileRadius[host] || REF_TILE_RADIUS_TARGET));
  }

  function outwardNormals(P) {
    return P.map((A, i) => {
      const B = P[(i + 1) % P.length];
      const ex = B[0] - A[0], ey = B[1] - A[1];
      const L = Math.hypot(ex, ey) || 1;
      return [ey / L, -ex / L];
    });
  }

  function collar(P, h, childCounts = []) {
    const n = P.length, N = outwardNormals(P), outer = [];
    for (let i = 0; i < n; i++) {
      const n0 = N[(i - 1 + n) % n], n1 = N[i];
      let bx = n0[0] + n1[0], by = n0[1] + n1[1];
      const L = Math.hypot(bx, by) || 1;
      bx /= L; by /= L;
      const cosd = Math.max(0.2, bx * n1[0] + by * n1[1]);
      const m = Math.min(1 / cosd, COLLAR_MITER_MAX);
      outer.push([P[i][0] + h * bx * m, P[i][1] + h * by * m]);
    }
    const tiles = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const k = Math.max(1, childCounts[i] || 0);
      const chain = [];
      for (let t = 0; t <= k; t++) {
        chain.push([
          outer[j][0] + (outer[i][0] - outer[j][0]) * t / k,
          outer[j][1] + (outer[i][1] - outer[j][1]) * t / k
        ]);
      }
      tiles.push({
        edgeIndex: i,
        inner: [P[i], P[j]],
        outer: [outer[j], outer[i]],
        polygon: [P[i], P[j], ...chain],
        freeEdges: chain.slice(0, -1).map((A, t) => [A, chain[t + 1]])
      });
    }
    return { tiles, outer };
  }

  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => d3.ascending(a[0], b[0]) || d3.ascending(a[1], b[1]));
    if (p.length <= 1) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const pt of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
      lower.push(pt);
    }
    const upper = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const pt = p[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
      upper.push(pt);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function hash01(seed, k) {
    let h = (Math.imul(seed, 2654435761) + Math.imul(k, 40503) + 12345) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0; h ^= h >>> 16;
    return (h & 0xFFFFFF) / 0xFFFFFF;
  }

  function seedFor(i) {
    const raw = allData[i].properties.voidSeed ?? ((i * 0.6180339887) % 1);
    return Math.max(1, Math.floor(raw * 0xFFFFFF) ^ i);
  }

  function perturbedTile(Pi, Pj, Oi, Oj, seed, h) {
    const m = SHAPE_MIN_V + Math.floor(hash01(seed, 0) * (SHAPE_MAX_V - SHAPE_MIN_V + 1));
    const ex = Oi[0] - Oj[0], ey = Oi[1] - Oj[1];
    const L = Math.hypot(ex, ey) || 1;
    let nx = ey / L, ny = -ex / L;
    const mi = [(Pi[0] + Pj[0]) / 2, (Pi[1] + Pj[1]) / 2];
    const mo = [(Oi[0] + Oj[0]) / 2, (Oi[1] + Oj[1]) / 2];
    if (nx * (mo[0] - mi[0]) + ny * (mo[1] - mi[1]) < 0) { nx = -nx; ny = -ny; }
    const ts = Array.from({length: m}, (_, k) => 0.12 + 0.76 * hash01(seed, 10 + k)).sort(d3.ascending);
    const pts = ts.map((t, k) => {
      const d = SHAPE_AMP * h * (0.35 + 0.65 * hash01(seed, 30 + k));
      return [Oj[0] + ex * t + nx * d, Oj[1] + ey * t + ny * d];
    });
    return convexHull([Pi, Pj, Oj, ...pts, Oi]);
  }

  function edgeLength(tile) {
    const A = tile.inner[0], B = tile.inner[1];
    return Math.hypot(B[0] - A[0], B[1] - A[1]);
  }

  function polygonCentroid(P) {
    const c = d3.polygonCentroid(P);
    return Number.isFinite(c[0]) && Number.isFinite(c[1]) ? c : [
      d3.mean(P, p => p[0]) || 0,
      d3.mean(P, p => p[1]) || 0
    ];
  }

  function childrenOf(i, host, c) {
    return (satellitesByHost.get(host) || [])
      .filter(s => isBorn(s, c) && effectiveParent(s, c, isBorn) === i);
  }

  function childTileFromEdge(edge, parentPoly, childIndex, childCount, h) {
    const [A, B] = edge;
    const ex = B[0] - A[0], ey = B[1] - A[1];
    const L = Math.hypot(ex, ey) || 1;
    let nx = ey / L, ny = -ex / L;
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const pc = polygonCentroid(parentPoly);
    if (nx * (mid[0] - pc[0]) + ny * (mid[1] - pc[1]) < 0) { nx = -nx; ny = -ny; }
    const Oa = [A[0] + nx * h, A[1] + ny * h];
    const Ob = [B[0] + nx * h, B[1] + ny * h];
    const k = Math.max(1, childCount);
    const chain = [];
    for (let t = 0; t <= k; t++) {
      chain.push([Ob[0] + (Oa[0] - Ob[0]) * t / k, Ob[1] + (Oa[1] - Ob[1]) * t / k]);
    }
    const poly = childCount > 0
      ? [A, B, ...chain]
      : perturbedTile(A, B, Oa, Ob, seedFor(childIndex), h);
    return {
      polygon: ensureCCW(poly),
      freeEdges: chain.slice(0, -1).map((P, t) => [P, chain[t + 1]])
    };
  }

  function buildHostTiles(host, c = N_CHAPTERS, hostPt = [0, 0]) {
    const sats = (satellitesByHost.get(host) || []).filter(i => isBorn(i, c));
    if (!sats.length) return {tiles: [], radius: 0};
    const P0 = hostPolygon(host);
    const roots = sats
      .filter(i => effectiveParent(i, c, isBorn) == null)
      .sort((a, b) =>
        d3.descending(cumOcc(a, c), cumOcc(b, c)) ||
        d3.ascending(allData[a].properties.GazetteerEntity_ID, allData[b].properties.GazetteerEntity_ID)
      );
    const rootChildCounts = roots.map(i => childrenOf(i, host, c).length);
    const collars = [];
    let P = P0;
    let remaining = roots.length;
    for (let ring = 0; remaining > 0 && ring < 6; ring++) {
      const h = COLLAR_DEPTH / (1 + COLLAR_DEPTH_DECAY * ring);
      const childCounts = Array.from({length: P.length}, (_, i) => rootChildCounts[collars.length * P.length + i] || 0);
      const cRec = collar(P, h, childCounts);
      collars.push({...cRec, h, ring});
      P = cRec.outer;
      remaining -= cRec.tiles.length;
    }
    const slots = collars.flatMap(rec => rec.tiles.map(tile => ({...tile, h: rec.h, ring: rec.ring})))
      .sort((a, b) => d3.descending(edgeLength(a), edgeLength(b)) || d3.ascending(a.edgeIndex, b.edgeIndex));
    const recs = [];
    const tileByIndex = new Map();

    function tileWithChildSlots(tile, childCount) {
      const k = Math.max(1, childCount);
      const chain = [];
      const Oj = tile.outer[0], Oi = tile.outer[1];
      for (let t = 0; t <= k; t++) {
        chain.push([
          Oj[0] + (Oi[0] - Oj[0]) * t / k,
          Oj[1] + (Oi[1] - Oj[1]) * t / k
        ]);
      }
      return {
        polygon: ensureCCW([tile.inner[0], tile.inner[1], ...chain]),
        freeEdges: chain.slice(0, -1).map((P, t) => [P, chain[t + 1]])
      };
    }

    function addRec(index, tile, parentIndex, ring) {
      const childCount = childrenOf(index, host, c).length;
      const slotted = childCount > 0 ? tileWithChildSlots(tile, childCount) : null;
      const polygon = slotted ? slotted.polygon : ensureCCW(perturbedTile(tile.inner[0], tile.inner[1], tile.outer[1], tile.outer[0], seedFor(index), tile.h));
      const freeEdges = slotted ? slotted.freeEdges : [];
      const rec = {index, host, parentIndex, ring, polygon, freeEdges, pt: polygonCentroid(polygon)};
      recs.push(rec);
      tileByIndex.set(index, rec);
      return rec;
    }

    roots.forEach((index, k) => {
      const slot = slots[k];
      if (slot) addRec(index, slot, host, slot.ring);
    });

    const queue = roots.slice();
    while (queue.length) {
      const parent = queue.shift();
      const parentRec = tileByIndex.get(parent);
      if (!parentRec) continue;
      const kids = childrenOf(parent, host, c).sort((a, b) =>
        d3.descending(cumOcc(a, c), cumOcc(b, c)) ||
        d3.ascending(allData[a].properties.GazetteerEntity_ID, allData[b].properties.GazetteerEntity_ID)
      );
      kids.forEach((kid, k) => {
        const edge = parentRec.freeEdges[k % Math.max(1, parentRec.freeEdges.length)];
        if (!edge) return;
        const childCount = childrenOf(kid, host, c).length;
        const tile = childTileFromEdge(edge, parentRec.polygon, kid, childCount, CHILD_DEPTH);
        const rec = {index: kid, host, parentIndex: parent, ring: parentRec.ring + 1, polygon: tile.polygon, freeEdges: tile.freeEdges, pt: polygonCentroid(tile.polygon)};
        recs.push(rec);
        tileByIndex.set(kid, rec);
        queue.push(kid);
      });
    }

    const translatedTiles = recs.map(rec => ({
      ...rec,
      polygon: rec.polygon.map(([x, y]) => [x + hostPt[0], y + hostPt[1]]),
      freeEdges: rec.freeEdges.map(edge => edge.map(([x, y]) => [x + hostPt[0], y + hostPt[1]])),
      pt: [rec.pt[0] + hostPt[0], rec.pt[1] + hostPt[1]]
    }));
    const radius = d3.max(translatedTiles, rec => d3.max(rec.polygon, ([x, y]) => Math.hypot(x - hostPt[0], y - hostPt[1]))) || 0;
    return {tiles: translatedTiles, radius};
  }

  function groupRadius(host, c = N_CHAPTERS) {
    return buildHostTiles(host, c, [0, 0]).radius;
  }

  return { buildHostTiles, groupRadius };
}
