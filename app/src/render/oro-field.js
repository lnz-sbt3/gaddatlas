// Campo orografico delle catene fuse: funzioni pure, senza stato di frame.
// Ogni luogo attivo è una campana compatta alta B livelli; il campo è la
// fusione a massimo delle campane, le isolinee si tracciano sul campo ai
// livelli l - 1/2 e restano geometria di mondo: la camera le trasforma senza
// ricalcolo. Il chiamante decide quali monti sono fusi e quando ricostruire.

// Campana compatta: vale B al centro, zero da d = R in poi, C1 al bordo.
export function kernelValue(d, R, B) {
  if (!(R > 0) || d >= R) return 0;
  const u = d / R;
  return B * (1 - u * u) * (1 - u * u);
}

// Griglia scalare del campo. mounds: {x, y, R, B} in coordinate di mondo.
// window: riquadro visibile [x0, y0, x1, y1] su cui ritagliare, o null.
// Il passo segue il kernel più piccolo (R/gridKernel), con un tetto di celle.
export function buildField(mounds, {window = null, gridKernel = 6, gridMax = 1500} = {}) {
  if (!mounds.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, rMin = Infinity;
  for (const m of mounds) {
    if (m.x - m.R < x0) x0 = m.x - m.R;
    if (m.x + m.R > x1) x1 = m.x + m.R;
    if (m.y - m.R < y0) y0 = m.y - m.R;
    if (m.y + m.R > y1) y1 = m.y + m.R;
    if (m.R < rMin) rMin = m.R;
  }
  if (window) {
    x0 = Math.max(x0, window[0]); x1 = Math.min(x1, window[2]);
    y0 = Math.max(y0, window[1]); y1 = Math.min(y1, window[3]);
  }
  if (!(x1 > x0 && y1 > y0)) return null;
  const h = Math.max(Math.max(x1 - x0, y1 - y0) / gridMax, rMin / gridKernel);
  const N = Math.ceil((x1 - x0) / h), M = Math.ceil((y1 - y0) / h);
  const grid = new Float32Array((N + 1) * (M + 1));
  for (const m of mounds) {
    const gx0 = Math.max(0, Math.floor((m.x - m.R - x0) / h));
    const gx1 = Math.min(N, Math.ceil((m.x + m.R - x0) / h));
    const gy0 = Math.max(0, Math.floor((m.y - m.R - y0) / h));
    const gy1 = Math.min(M, Math.ceil((m.y + m.R - y0) / h));
    for (let gy = gy0; gy <= gy1; gy++) {
      const wy = y0 + gy * h;
      for (let gx = gx0; gx <= gx1; gx++) {
        const v = kernelValue(Math.hypot(x0 + gx * h - m.x, wy - m.y), m.R, m.B);
        const idx = gy * (N + 1) + gx;
        if (v > grid[idx]) grid[idx] = v;
      }
    }
  }
  return {x0, y0, h, N, M, grid};
}

// Quadrati in marcia alla soglia thr: segmenti orientati per cella.
function marchingSegments(field, thr) {
  const {grid, N, M} = field;
  const at = (x, y) => grid[y * (N + 1) + x];
  const segs = [];
  for (let y = 0; y < M; y++) {
    for (let x = 0; x < N; x++) {
      const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);
      const code = (a > thr ? 1 : 0) | (b > thr ? 2 : 0) | (c > thr ? 4 : 0) | (d > thr ? 8 : 0);
      if (code === 0 || code === 15) continue;
      const top = [x + (thr - a) / (b - a), y];
      const right = [x + 1, y + (thr - b) / (c - b)];
      const bottom = [x + (thr - d) / (c - d), y + 1];
      const left = [x, y + (thr - a) / (d - a)];
      const E = {1: [left, top], 2: [top, right], 3: [left, right], 4: [right, bottom],
        6: [top, bottom], 7: [left, bottom], 8: [bottom, left], 9: [bottom, top],
        11: [bottom, right], 12: [right, left], 13: [right, top], 14: [top, left]};
      if (code === 5) { segs.push([left, top]); segs.push([right, bottom]); }
      else if (code === 10) { segs.push([top, right]); segs.push([bottom, left]); }
      else segs.push(E[code]);
    }
  }
  return segs;
}

// Incatena i segmenti in anelli chiusi; i punti condivisi coincidono esattamente.
function chainLoops(segs) {
  const key = p => p[0].toFixed(3) + ',' + p[1].toFixed(3);
  const byStart = new Map();
  for (const s of segs) {
    const k = key(s[0]);
    let list = byStart.get(k);
    if (!list) byStart.set(k, list = []);
    list.push(s);
  }
  const used = new Set(), loops = [];
  for (const s of segs) {
    if (used.has(s)) continue;
    const loop = [s[0]];
    let cur = s;
    while (cur && !used.has(cur)) {
      used.add(cur);
      loop.push(cur[1]);
      cur = (byStart.get(key(cur[1])) || []).find(n => !used.has(n));
    }
    if (loop.length > 4) loops.push(loop);
  }
  return loops;
}

function pointInPolygon(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Isolinee del campo per i livelli 1..levels, in coordinate di mondo.
// Per ogni anello: owner = indice (in mounds) del monte con B >= livello più
// vicino al baricentro (la sua quota detta la quota del componente); al
// livello 1 anche members, i monti col centro dentro l'anello (per il clic
// che scioglie e per la regola della carta).
export function traceLevels(field, mounds, levels) {
  const out = [];
  for (let L = 1; L <= levels; L++) {
    const loops = chainLoops(marchingSegments(field, L - 0.5));
    const rows = [];
    for (const loop of loops) {
      const pts = loop.map(([gx, gy]) => [field.x0 + gx * field.h, field.y0 + gy * field.h]);
      if (pts.length < 3) continue;
      let bx = 0, by = 0;
      for (const p of pts) { bx += p[0]; by += p[1]; }
      bx /= pts.length; by /= pts.length;
      let owner = -1, best = Infinity;
      for (let q = 0; q < mounds.length; q++) {
        if (mounds[q].B < L) continue;
        const d = Math.hypot(mounds[q].x - bx, mounds[q].y - by);
        if (d < best) { best = d; owner = q; }
      }
      const row = {pts, owner};
      if (L === 1) {
        row.members = [];
        for (let q = 0; q < mounds.length; q++) {
          if (pointInPolygon(pts, mounds[q].x, mounds[q].y)) row.members.push(q);
        }
      }
      rows.push(row);
    }
    out.push(rows);
  }
  return out;
}

// Zoom di scioglimento: il più piccolo k a cui il pavimento di schermo scende
// sotto raggio × scioglimento per ogni monte dato (rEffMin = il più piccolo).
export function dissolveZoom({rEffMin, floorCSS, fit, dissolve}) {
  return floorCSS / (fit * rEffMin * dissolve);
}

// Smussatura di Chaikin su un anello chiuso: ogni passaggio raddoppia i punti.
// Si applica alla geometria, così tratti, determinazione, corridoio e picking
// lavorano sugli stessi punti del disegno.
export function chaikin(pts, iterations = 1) {
  let p = pts;
  for (let it = 0; it < iterations; it++) {
    const n = p.length, out = new Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = p[i], b = p[(i + 1) % n];
      out[2 * i] = [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25];
      out[2 * i + 1] = [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75];
    }
    p = out;
  }
  return p;
}

export default {kernelValue, buildField, traceLevels, dissolveZoom, chaikin};
