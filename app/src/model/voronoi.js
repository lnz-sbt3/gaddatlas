import * as d3 from "d3";
import atlasConfig from "./config.js";

// Delaunay/Voronoi, bordi campionati e normalizzazione cognitiva delle celle.
export default function atlasVoronoi(atlasProjection, atlasEntities) {
  const { SAMPLE, REF_TILE_RADIUS_TARGET, REF_TILE_VARIANCE, REF_TILE_RADIUS_MIN, REF_TILE_RADIUS_MAX, OFFMAP_TILE_RADIUS, TILE_SIZE, TILE_AREA_GAIN, TILE_CORE_REACH, TILE_EQUA_GAIN, TILE_EQUA_REACH, TILE_EQUA_FLOOR } = atlasConfig;
  const { pts, bbox } = atlasProjection;
  const { allData, N_INMAP, N_GEO } = atlasEntities;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const delaunay = d3.Delaunay.from(pts.slice(0, N_INMAP));
  const voronoi = delaunay.voronoi(bbox);

  // bbox di una polilinea: precalcolato una volta per poter decidere a runtime,
  // senza chiamare deform punto per punto, se è entro il raggio d'influenza
  // della goccia (vedi nearDrop, in createAtlas)
  function bboxOf(ring){
    let x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity;
    for (const [x,y] of ring){
      if (x<x0) x0=x; if (x>x1) x1=x;
      if (y<y0) y0=y; if (y>y1) y1=y;
    }
    return [x0,y0,x1,y1];
  }

  // Lati Voronoi campionati e deduplicati.
  const segments = [];
  {
    const seen = new Set();
    for (let i=0;i<N_INMAP;i++){
      const cell = voronoi.cellPolygon(i);
      if (!cell) continue;
      for (let k=0;k<cell.length-1;k++){
        const a=cell[k], b=cell[k+1];
        const key = a[0]<b[0]||(a[0]===b[0]&&a[1]<b[1])
          ? `${a[0].toFixed(1)},${a[1].toFixed(1)}|${b[0].toFixed(1)},${b[1].toFixed(1)}`
          : `${b[0].toFixed(1)},${b[1].toFixed(1)}|${a[0].toFixed(1)},${a[1].toFixed(1)}`;
        if (seen.has(key)) continue; seen.add(key);
        const L=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(2,Math.round(L/SAMPLE));
        const poly=[];
        for (let t=0;t<=n;t++){ const u=t/n; poly.push([a[0]+(b[0]-a[0])*u, a[1]+(b[1]-a[1])*u]); }
        segments.push({ poly, bbox: bboxOf(poly) });
      }
    }
  }

  // Geometria invariante delle celle, riusata dal rendering e dall'hit test.
  function sampleRing(cell, sample){
    const ring = [];
    for (let k=0;k<cell.length-1;k++){
      const a=cell[k], b=cell[k+1];
      const L=Math.hypot(b[0]-a[0],b[1]-a[1]), n=Math.max(2,Math.round(L/sample));
      for (let t=0;t<n;t++){ const u=t/n; ring.push([a[0]+(b[0]-a[0])*u, a[1]+(b[1]-a[1])*u]); }
    }
    return ring;
  }
  const cellRings = []; // { gx, gy, ring, cell } per cella, null se cella degenere
  for (let i=0;i<N_INMAP;i++){
    const cell = voronoi.cellPolygon(i);
    if (!cell){ cellRings.push(null); continue; }
    const [gx,gy] = pts[i];
    cellRings.push({ gx, gy, ring: sampleRing(cell, SAMPLE), cell });
  }
  // I fittizi non hanno una cella Voronoi.
  for (let i = N_INMAP; i < allData.length; i++) cellRings.push(null);

  const cellBaseRadius = cellRings.map(cr => {
    if (!cr || !cr.ring) return 1;
    return Math.max(1, ...cr.ring.map(([x,y]) => Math.hypot(x - cr.gx, y - cr.gy)));
  });

  // Dimensione diagrammatica quasi-uniforme: parte da un raggio comune e lascia
  // solo una piccola traccia logaritmica della varianza geografica centro/periferia.
  const refRadii = cellBaseRadius.slice(0, N_INMAP);
  const medR = d3.median(refRadii) || 1;
  function geoFactor(i) { return Math.log2(cellBaseRadius[i] / medR); }

  // i fittizi restano indipendenti: leggermente piu' esili dei referenziali.
  const FICT_TILE_RADIUS = REF_TILE_RADIUS_TARGET * 0.8;
  const cognitiveTileRadius = cellBaseRadius.map((r, i) => {
    if (i >= N_GEO) return FICT_TILE_RADIUS;
    if (!cellRings[i]) return OFFMAP_TILE_RADIUS;
    return clamp(
      REF_TILE_RADIUS_TARGET * (1 + REF_TILE_VARIANCE * geoFactor(i)),
      REF_TILE_RADIUS_MIN,
      REF_TILE_RADIUS_MAX
    );
  });

  let normalizedCellScale = cellRings.map((cr, i) => {
    if (!cr || i >= N_GEO) return 1;
    return cognitiveTileRadius[i] / cellBaseRadius[i];
  });
  // Area uguale: il peso visivo della tessera non dipende dall'estensione della cella in mappa.
  // La forma resta quella di Voronoi; l'area comune è la mediana del regime a raggio.
  // L'unità d'altezza delle terrazze resta quella del regime a raggio: la legge del rilievo non cambia.
  const reliefReferenceRadius = cognitiveTileRadius.slice();
  let areaTarget = null;
  if (TILE_SIZE === 'area' || TILE_SIZE === 'area-ampia' || TILE_SIZE === 'area-tutte' || TILE_SIZE === 'area-equa') {
    const ringArea = cr => Math.abs(d3.polygonArea(cr.ring));
    const local = cellRings.map((cr, i) => cr && i < N_INMAP ? ringArea(cr) : 0);
    // 'area-ampia': la stessa area comune, moltiplicata (TILE_AREA_GAIN): tessere più grandi, intervalli più stretti.
    const gain = TILE_SIZE === 'area-ampia' ? TILE_AREA_GAIN : TILE_SIZE === 'area-equa' ? TILE_EQUA_GAIN : 1;
    const target = gain * d3.median(cellRings.slice(0, N_INMAP).map((cr, i) => cr ? local[i] * normalizedCellScale[i] ** 2 : NaN).filter(Number.isFinite));
    const radiusScale = normalizedCellScale.slice();
    const medianReach = d3.median(cellRings.slice(0, N_INMAP).map((cr, i) => cr ? cellBaseRadius[i] * normalizedCellScale[i] : NaN).filter(Number.isFinite));
    normalizedCellScale = cellRings.map((cr, i) => cr && i < N_INMAP && local[i] > 0 ? Math.sqrt(target / local[i]) : normalizedCellScale[i]);
    // 'area-equa': le celle molto allungate non vengono ingrandite: il raggio massimo resta entro TILE_EQUA_REACH volte la mediana.
    // e nessuna cella scende sotto TILE_EQUA_FLOOR volte l'area che aveva nel regime a raggio.
    if (TILE_SIZE === 'area-equa') normalizedCellScale = normalizedCellScale.map((s, i) => cellRings[i] && i < N_INMAP ? Math.max(Math.min(s, TILE_EQUA_REACH * TILE_EQUA_GAIN ** .5 * medianReach / cellBaseRadius[i]), Math.sqrt(TILE_EQUA_FLOOR) * radiusScale[i]) : s);
    for (let i = 0; i < N_INMAP; i++) if (cellRings[i]) cognitiveTileRadius[i] = cellBaseRadius[i] * normalizedCellScale[i];
    areaTarget = target;
  } else if (TILE_SIZE === 'nucleo') {
    // Nucleo uguale: ogni tessera ha lo stesso cerchio inscritto attorno al generatore. Il nucleo leggibile (dove
    // stanno vetta e segno) è identico; le celle allungate si allungano, quindi le proporzioni restano variabili.
    // L'allungamento è limitato: il raggio massimo non supera TILE_CORE_REACH volte la mediana.
    const inscribed = cr => { let min = Infinity; for (let j = 0; j < cr.ring.length; j++) { const a = cr.ring[j], b = cr.ring[(j + 1) % cr.ring.length], ex = b[0] - a[0], ey = b[1] - a[1], l = Math.hypot(ex, ey); if (l > 1e-9) min = Math.min(min, Math.abs(ex * (a[1] - cr.gy) - (a[0] - cr.gx) * ey) / l); } return min; };
    const core = cellRings.map((cr, i) => cr && i < N_INMAP ? inscribed(cr) : 0);
    const target = d3.median(cellRings.slice(0, N_INMAP).map((cr, i) => cr ? core[i] * normalizedCellScale[i] : NaN).filter(Number.isFinite));
    const reach = TILE_CORE_REACH * d3.median(cellRings.slice(0, N_INMAP).map((cr, i) => cr ? cellBaseRadius[i] * normalizedCellScale[i] : NaN).filter(Number.isFinite));
    normalizedCellScale = cellRings.map((cr, i) => cr && i < N_INMAP && core[i] > 0 ? Math.min(target / core[i], reach / cellBaseRadius[i]) : normalizedCellScale[i]);
    for (let i = 0; i < N_INMAP; i++) if (cellRings[i]) cognitiveTileRadius[i] = cellBaseRadius[i] * normalizedCellScale[i];
  }

  return { delaunay, segments, cellRings, normalizedCellScale, cognitiveTileRadius, reliefReferenceRadius, FICT_TILE_RADIUS, areaTarget };
}
