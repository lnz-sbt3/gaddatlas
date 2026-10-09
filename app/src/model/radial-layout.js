import * as d3 from "d3";
import s4Config from "./config.js";

// Layout radiale per bande equipopolate del rango di distanza, con azimut conservato.
// Il collare narrativo e' congelato sul corpus completo: i fittizi non ancora
// nati lasciano vuoto il proprio alloggiamento invece di ricollocare il gruppo.
export default function s4RadialLayout(s4Entities, s4Projection, s4Voronoi, s4Chapters, s4Satellites, s4NarrativeGeometry) {
  const { RADIAL_BANDS, BAND_FILL, BAND_STEP_MIN, BAND_START_RADIUS, TILE_GAP, REF_TILE_RADIUS_MAX, N_CHAPTERS, LABEL_GAP_WIDTH_PX } = s4Config;
  // cognitiveTileRadius (s4Voronoi) e' gia' limitato da REF_TILE_RADIUS_MAX:
  // la soglia dell'invariante e il margine esterno del diagramma seguono quel tetto.
  const { allData, N_GEO } = s4Entities;
  const { pts, geographicAngle, poleDistanceKm, poleIndex, distanceRank, cogCenterInit } = s4Projection;
  const { cognitiveTileRadius, normalizedCellScale } = s4Voronoi;
  const { cumOcc, bornIndicesByChapter, isBorn } = s4Chapters;
  const { satellitesByHost, primaryHostOf } = s4Satellites;
  const { buildHostTiles, groupRadius } = s4NarrativeGeometry;
  const FREEZE = s4Config.COLLAR_FREEZE_CHAPTER ?? N_CHAPTERS;

  // I referenziali partono dalla posizione geografica, i fittizi dal centro del diagramma.
  function baseWorldPt(i) {
    return i < N_GEO ? pts[i].slice() : cogCenterInit.slice();
  }

  function angularHalfWidth(item, radius) {
    const visualRadius = cognitiveTileRadius[item.index] + TILE_GAP;
    let half = Math.asin(Math.min(0.95, visualRadius / radius));

    const sats = (satellitesByHost.get(item.index) || [])
      .filter(i => isBorn(i, FREEZE));
    if (sats && sats.length) {
      const blockR = groupRadius(item.index, FREEZE);
      half = Math.max(half, Math.asin(Math.min(0.95, blockR / radius)));
    }
    return half;
  }

  function normalizeAngle(angle) {
    const tau = Math.PI * 2;
    return ((angle % tau) + tau) % tau;
  }

  // posizione relativa al centro data angolo/raggio: stessa convenzione (angolo
  // orario dal nord) usata da placeSatellites
  // per non rischiare un segno diverso
  function angleToXY(angle, radius) {
    return [Math.sin(angle) * radius, -Math.cos(angle) * radius];
  }

  // Ogni banda corrisponde a un quantile della distanza dal polo.
  function assignDistanceBands(items) {
    const K = RADIAL_BANDS;
    const bands = Array.from({length: K}, (_, ringIndex) => ({ringIndex, radius: 0, items: []}));
    for (const item of items) {
      // item.rank e' F(d) in [0,1]; clamp difensivo sull'estremo superiore
      const k = Math.min(K - 1, Math.floor(item.rank * K));
      bands[k].items.push(item);
    }
    return bands.filter(b => b.items.length > 0);
  }

  // raggio minimo perche' la banda stia entro BAND_FILL della circonferenza,
  // tenuto conto del varco a Nord. Monotono: ogni banda parte da minRadius.
  function requiredBandRadius(items, startRadius, gapPxHalfWidth) {
    let r = Math.max(startRadius, BAND_START_RADIUS);
    for (let guard = 0; guard < 200; guard++) {
      const gapHalf = gapPxHalfWidth > 0
        ? Math.asin(Math.min(0.95, gapPxHalfWidth / r)) : 0;
      const required = d3.sum(items, item => angularHalfWidth(item, r) * 2);
      if (required <= Math.PI * 2 * BAND_FILL - 2 * gapHalf) return r;
      r += BAND_STEP_MIN / 2;
    }
    return r;
  }

  // Il pre-gonfiaggio compensa la compressione del varco; ogni rilassamento e'
  // seguito da un nuovo enforcement delle distanze minime.
  function packRingAngles(items, radius, gapHalf = 0) {
    if (items.length === 0) return [];
    const tau = Math.PI * 2;

    // Compensa la compressione introdotta dalla rimappatura del varco.
    const inflate = gapHalf > 0 ? tau / (tau - 2 * gapHalf) : 1;
    const remap = a => gapHalf > 0
      ? gapHalf + (normalizeAngle(a) / tau) * (tau - 2 * gapHalf)
      : normalizeAngle(a);

    if (items.length === 1) {
      return [{...items[0], angle: remap(items[0].geoAngle)}];
    }

    const ordered = items.slice().sort((a, b) =>
      d3.ascending(a.geoAngle, b.geoAngle) || d3.ascending(a.id, b.id)
    );

    // seam sul gap azimutale maggiore: la linearizzazione taglia dove c'e' piu' spazio
    let seamAfter = 0, largestGap = -Infinity;
    for (let i = 0; i < ordered.length; i++) {
      const a = ordered[i].geoAngle;
      const b = ordered[(i + 1) % ordered.length].geoAngle + (i === ordered.length - 1 ? tau : 0);
      if (b - a > largestGap) { largestGap = b - a; seamAfter = i; }
    }

    const seq = ordered.slice(seamAfter + 1).concat(ordered.slice(0, seamAfter + 1));
    const half = seq.map(item => angularHalfWidth(item, radius) * inflate);

    const base = [];
    for (let i = 0; i < seq.length; i++) {
      let angle = seq[i].geoAngle;
      if (i > 0) {
        while (angle <= seq[i - 1].geoAngle) angle += tau;
        while (angle <= base[i - 1]) angle += tau;
      }
      base.push(angle);
    }

    // separazioni minime: avanti e indietro
    function enforce(angles) {
      for (let i = 1; i < angles.length; i++) {
        const min = angles[i - 1] + half[i - 1] + half[i];
        if (angles[i] < min) angles[i] = min;
      }
      for (let i = angles.length - 2; i >= 0; i--) {
        const max = angles[i + 1] - half[i + 1] - half[i];
        if (angles[i] > max) angles[i] = max;
      }
      return angles;
    }

    let angles = enforce(base.slice());
    // Rilassatura verso l'azimut geografico, sempre seguita da enforcement.
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < angles.length; i++) {
        const lo = i === 0 ? -Infinity : angles[i - 1] + half[i - 1] + half[i];
        const hi = i === angles.length - 1 ? Infinity : angles[i + 1] - half[i + 1] - half[i];
        if (lo <= hi) angles[i] = Math.max(lo, Math.min(hi, base[i]));
      }
      angles = enforce(angles);
    }

    return seq.map((item, i) => ({...item, angle: remap(angles[i])}));
  }

  function pointToPolar([x, y]) {
    return {angle: Math.atan2(x, -y), radius: Math.hypot(x, y)};
  }

  function placeSatellites(bands, layout) {
    const polarOf = new Map();

    for (const band of bands) {
      for (const item of band.items) {
        const sats = (satellitesByHost.get(item.index) || [])
          .filter(i => isBorn(i, FREEZE));
        if (!sats.length) continue;
        const hostPt = angleToXY(item.angle, band.radius);
        const group = buildHostTiles(item.index, FREEZE, hostPt);
        for (const rec of group.tiles) {
          if (rec.host !== primaryHostOf[rec.index]) continue;
          const pos = pointToPolar(rec.pt);
          pos.host = item.index;
          polarOf.set(rec.index, pos);
          layout[rec.index] = rec.pt;
        }
      }
    }

    if (poleIndex >= 0) {
      const sats = (satellitesByHost.get(poleIndex) || [])
        .filter(i => isBorn(i, FREEZE));
      if (sats.length) {
        const hostPt = [0, 0];
        const group = buildHostTiles(poleIndex, FREEZE, hostPt);
        for (const rec of group.tiles) {
          if (rec.host !== primaryHostOf[rec.index]) continue;
          const pos = pointToPolar(rec.pt);
          pos.host = poleIndex;
          polarOf.set(rec.index, pos);
          layout[rec.index] = rec.pt;
        }
      }
    }

    return polarOf;
  }

  function buildRadialRankLayout(c, includeFict) {
    const active = bornIndicesByChapter[c].filter(i =>
      i < N_GEO && i !== poleIndex && distanceRank[i] !== null
    );

    const items = active.map(i => ({
      index: i,
      rank: distanceRank[i],                       // F(d): la chiave del layout
      distanceKm: poleDistanceKm[i],
      geoAngle: geographicAngle[i],
      id: allData[i].properties.GazetteerEntity_ID
    }));

    // ordinamento per rango di distanza: deterministico, spareggio su id
    items.sort((a, b) => d3.ascending(a.rank, b.rank) || d3.ascending(a.id, b.id));

    const bands = assignDistanceBands(items);
    const layoutAzimuth = allData.map((d, i) => baseWorldPt(i));
    if (poleIndex >= 0) layoutAzimuth[poleIndex] = [0, 0];
    const placedItems = [];
    let minRadius = 0;

    for (const band of bands) {
      const gapPxHalf = LABEL_GAP_WIDTH_PX / 2;
      band.radius = requiredBandRadius(band.items, Math.max(minRadius, BAND_START_RADIUS), gapPxHalf);
      minRadius = band.radius + Math.max(
        BAND_STEP_MIN,
        (d3.max(band.items, it => groupRadius(it.index, FREEZE)) || 0) + REF_TILE_RADIUS_MAX
      );

      const gapHalf = Math.asin(Math.min(0.95, gapPxHalf / band.radius));
      const packed = packRingAngles(band.items, band.radius, gapHalf);
      band.items = packed;
      for (const item of packed) {
        item.ringIndex = band.ringIndex;
        item.ringRadius = band.radius;
        layoutAzimuth[item.index] = angleToXY(item.angle, band.radius);
        placedItems.push(item);
      }
    }

    let satellitePositions = new Map();
    if (includeFict) satellitePositions = placeSatellites(bands, layoutAzimuth);
    const placedFict = new Set(satellitePositions.keys());

    return {layoutAzimuth, rings: bands, items: placedItems, satellitePositions, placedFict};
  }

  // Due set per capitolo: solo referenziali oppure referenziali e fittizi.
  const rankedRadialByChapter = Array(N_CHAPTERS + 1);
  const rankedRadialFullByChapter = Array(N_CHAPTERS + 1);
  for (let c = 1; c <= N_CHAPTERS; c++) {
    rankedRadialByChapter[c] = buildRadialRankLayout(c, false);
    rankedRadialFullByChapter[c] = buildRadialRankLayout(c, true);
  }

  // L'estensione massima evita cambi di scala quando si mostrano o nascondono i fittizi.
  const extentBase = (() => {
    let maxR = 0;
    for (const byChapter of [rankedRadialByChapter, rankedRadialFullByChapter]) {
      for (let c = 1; c <= N_CHAPTERS; c++) {
        const rings = byChapter[c].rings;
        if (rings && rings.length) maxR = Math.max(maxR, rings[rings.length - 1].radius);
        for (const pos of byChapter[c].satellitePositions?.values?.() || []) {
          maxR = Math.max(maxR, pos.radius);
        }
      }
    }
    return maxR + REF_TILE_RADIUS_MAX + TILE_GAP;
  })();

  return { rankedRadialByChapter, rankedRadialFullByChapter, extentBase, angleToXY };
}
