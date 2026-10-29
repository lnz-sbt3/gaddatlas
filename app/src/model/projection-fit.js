import * as d3 from "d3";
import s4Config from "./config.js";
import projection from "./projection.js";

// Proiezione dei generatori, deduplicazione, scala, bounding box e azimut.
export default function s4Projection(s4Entities) {
  const { MARGIN, VIEW_SIZE } = s4Config;
  // Il polo cognitivo e' distinto dal centro cartografico usato per il filtro geografico.
  const SECONDSPACE_POLE = s4Config.SECONDSPACE_POLES[s4Config.SECONDSPACE_POLE_KEY];
  const { geoData, geoDataAll } = s4Entities;

  // Un jitter deterministico evita celle degeneri per coordinate duplicate.
  const EPS_DUP = 0.01;
  function projectDedup(data, proj) {
    const seen = new Map();
    return data.map(d => {
      let [x, y] = proj(d.geometry.coordinates);
      const key = `${x.toFixed(3)},${y.toFixed(3)}`;
      const n = seen.get(key) || 0;
      seen.set(key, n + 1);
      if (n > 0) {
        const a = n * 2.399963229728653;
        x += Math.cos(a) * EPS_DUP * n;
        y += Math.sin(a) * EPS_DUP * n;
      }
      return [x, y];
    });
  }

  // La proiezione condivisa e' ricalibrata sul dataset per mantenere coerenti punti e contorno.
  const trial = projectDedup(geoData, projection);
  const [trialMinX, trialMaxX] = d3.extent(trial, p => p[0]);
  const [trialMinY, trialMaxY] = d3.extent(trial, p => p[1]);
  const trialMax = Math.max(trialMaxX - trialMinX, trialMaxY - trialMinY) * (1 + 2 * MARGIN);
  projection.scale(projection.scale() * (VIEW_SIZE / trialMax));

  const pts = projectDedup(geoDataAll, projection);

  const azimuthCenter = projection(SECONDSPACE_POLE);
  function angleFromNorthClockwise(p) {
    const dx = p[0] - azimuthCenter[0];
    const dy = p[1] - azimuthCenter[1];
    let angle = Math.atan2(dx, -dy);
    if (angle < 0) angle += Math.PI * 2;
    return angle;
  }

  // i fittizi non hanno coordinate geografiche: usano `voidSeed` (proprieta' presente
  // solo su di loro nel geojson, uniforme in [0,1]) come sostituto deterministico
  // dell'azimut, cosi' da poter comunque entrare nell'ordinamento/impacchettamento angolare
  const { allData, N_GEO } = s4Entities;
  const geographicAngle = allData.map((d, i) =>
    i < N_GEO ? angleFromNorthClockwise(pts[i]) : (d.properties.voidSeed ?? 0) * Math.PI * 2
  );

  // Il rango usa la distanza geodetica, non quella distorta dalla proiezione Mercator.
  function haversineKmFromPole([lon, lat]) {
    const [lon0, lat0] = SECONDSPACE_POLE;
    const R = 6371, toRad = Math.PI / 180;
    const dphi = (lat0 - lat) * toRad, dlmb = (lon0 - lon) * toRad;
    const a = Math.sin(dphi / 2) ** 2
            + Math.cos(lat * toRad) * Math.cos(lat0 * toRad) * Math.sin(dlmb / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  // I fittizi non partecipano al rango geografico.
  const poleDistanceKm = allData.map((d, i) =>
    i < N_GEO ? haversineKmFromPole(d.geometry.coordinates) : Infinity
  );

  // entita' coincidente col polo: azimut indeterminato, quindi va al centro.
  const POLE_SNAP_KM = 0.05;
  const poleIndex = (() => {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < N_GEO; i++) {
      if (poleDistanceKm[i] < bestD) { bestD = poleDistanceKm[i]; best = i; }
    }
    return bestD <= POLE_SNAP_KM ? best : -1;
  })();

  // F(d): CDF empirica. distanceRank[i] in [0,1] per i referenziali, null per i fittizi.
  // Monotona crescente per costruzione: r' = R*F(d) non inverte mai due luoghi.
  const distanceRank = (() => {
    const order = d3.range(N_GEO).sort((a, b) =>
      d3.ascending(poleDistanceKm[a], poleDistanceKm[b]) ||
      d3.ascending(allData[a].properties.GazetteerEntity_ID,
                   allData[b].properties.GazetteerEntity_ID)   // spareggio deterministico
    );
    const out = allData.map(() => null);
    order.forEach((idx, k) => { out[idx] = N_GEO > 1 ? k / (N_GEO - 1) : 0; });
    return out;
  })();

  // Centro iniziale del diagramma, ricalcolato sul viewport all'apertura.
  const cogCenterInit = [d3.mean(pts, p => p[0]), d3.mean(pts, p => p[1])];

  const ptsInMap = pts.slice(0, geoData.length);
  const [minX, maxX] = d3.extent(ptsInMap, p => p[0]);
  const [minY, maxY] = d3.extent(ptsInMap, p => p[1]);
  const diag = Math.hypot(maxX - minX, maxY - minY);
  const margin = diag * MARGIN;
  // Bounding box della tassellazione, distinto dalle dimensioni del canvas.
  const bbox = [minX - margin, minY - margin, maxX + margin, maxY + margin];
  const width = Math.ceil(bbox[2] - bbox[0]);
  const height = Math.ceil(bbox[3] - bbox[1]);

  return { pts, geographicAngle, poleDistanceKm, poleIndex, distanceRank, cogCenterInit, bbox, width, height };
}
