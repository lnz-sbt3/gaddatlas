import * as d3 from "d3";
import s4Config from "./config.js";

// Delaunay/Voronoi, bordi campionati e normalizzazione cognitiva delle celle.
export default function s4Voronoi(s4Projection, s4Entities) {
  const { SAMPLE, REF_TILE_RADIUS_TARGET, REF_TILE_VARIANCE, REF_TILE_RADIUS_MIN, REF_TILE_RADIUS_MAX, OFFMAP_TILE_RADIUS } = s4Config;
  const { pts, bbox } = s4Projection;
  const { allData, N_INMAP, N_GEO } = s4Entities;

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  const delaunay = d3.Delaunay.from(pts.slice(0, N_INMAP));
  const voronoi = delaunay.voronoi(bbox);

  // bbox di una polilinea: precalcolato una volta per poter decidere a runtime,
  // senza chiamare deform() punto per punto, se è entro il raggio d'influenza
  // della goccia (vedi nearDrop, in chartS4)
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

  const normalizedCellScale = cellRings.map((cr, i) => {
    if (!cr || i >= N_GEO) return 1;
    return cognitiveTileRadius[i] / cellBaseRadius[i];
  });

  return { delaunay, segments, cellRings, normalizedCellScale, cognitiveTileRadius, FICT_TILE_RADIUS };
}
