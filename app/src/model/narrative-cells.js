import * as d3 from "d3";
import s4Config from "./config.js";

// Tessere narrative a incastro: usa i poligoni del collare, senza Voronoi locale.
export default function s4NarrativeCells(s4Entities, s4Voronoi, s4Projection, s4RadialLayout, s4Satellites, s4NarrativeGeometry) {
  const { N_CHAPTERS, SAMPLE, REF_TILE_RADIUS_TARGET, NARR_GLYPH_SCALE } = s4Config;
  const { allData, N_GEO } = s4Entities;
  const { cognitiveTileRadius, FICT_TILE_RADIUS } = s4Voronoi;
  const { poleIndex } = s4Projection;
  const { rankedRadialFullByChapter, angleToXY } = s4RadialLayout;
  const { satellitesByHost, primaryHostOf } = s4Satellites;
  const { buildHostTiles } = s4NarrativeGeometry;

  const state = rankedRadialFullByChapter[N_CHAPTERS];
  const hostItems = new Map(state.items.map(it => [it.index, it]));
  const narrativeCellRings = allData.map(() => null);
  const narrativeTileRadius = allData.map((d, i) => i >= N_GEO ? FICT_TILE_RADIUS : cognitiveTileRadius[i]);
  const assignments = new Map();
  const ghostSlots = new Map();

  function sampleRing(cell, sample) {
    const ring = [];
    for (let k = 0; k < cell.length; k++) {
      const a = cell[k], b = cell[(k + 1) % cell.length];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(2, Math.round(L / sample));
      for (let t = 0; t < n; t++) {
        const u = t / n;
        ring.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
      }
    }
    return ring;
  }

  function polyArea(poly) {
    return Math.abs(d3.polygonArea(poly));
  }

  for (const host of satellitesByHost.keys()) {
    const hostItem = hostItems.get(host);
    if (!hostItem && host !== poleIndex) continue;
    const R = host === poleIndex ? 0 : hostItem.ringRadius;
    const hostPt = host === poleIndex ? [0, 0] : angleToXY(hostItem.angle, R);
    const group = buildHostTiles(host, N_CHAPTERS, hostPt);

    for (const rec of group.tiles) {
      const area = polyArea(rec.polygon);
      if (rec.host === primaryHostOf[rec.index]) {
        assignments.set(rec.index, {...rec, area});
      } else {
        // Nei referenti secondari resta lo slot vuoto: l'incastro dice gia'
        // "qui manca un pezzo, e il pezzo e' la'". Il collegamento resta
        // acromatico e punteggiato: non e' un percorso e non occupa il colore
        // riservato a NarrativeRole.
        if (!ghostSlots.has(rec.index)) ghostSlots.set(rec.index, []);
        ghostSlots.get(rec.index).push({host: rec.host, polygon: rec.polygon, pt: rec.pt});
      }
    }
  }

  for (const [i, rec] of assignments) {
    const cell = rec.polygon;
    const ring = sampleRing(cell, SAMPLE);
    narrativeCellRings[i] = {gx: rec.pt[0], gy: rec.pt[1], ring, cell: [...cell, cell[0]]};
    narrativeTileRadius[i] = REF_TILE_RADIUS_TARGET * NARR_GLYPH_SCALE;
  }

  return { narrativeCellRings, narrativeTileRadius, assignments, ghostSlots };
}
