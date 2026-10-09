import * as d3 from "d3";
import s4Config from "./config.js";

// Occorrenze cumulative e capitolo di prima comparsa.
export default function s4Chapters(gadda_real, s4Entities) {
  const { N_CHAPTERS } = s4Config;
  const { allData, N_GEO, allDataById } = s4Entities;

  // occorrenze cumulative del luogo i fino al capitolo c (1-based): mentionsByChapter
  // NON è cumulativo, quindi sommo io lo storico.
  function cumOcc(i, c){
    const arr = allData[i].properties.mentionsByChapter;
    let s = 0; for (let k = 0; k < c; k++) s += arr[k]; return s;
  }

  const birthChapter = allData.map(d => {
    const mentions = d.properties.mentionsByChapter || [];
    const first = mentions.findIndex(v => Number(v) > 0);
    return first >= 0 ? first + 1 : Infinity;
  });

  const silentAnchorSatellites = new Map();
  for (let i = N_GEO; i < allData.length; i++) {
    const satBirth = birthChapter[i];
    if (!Number.isFinite(satBirth)) continue;
    const refsRaw = allData[i].properties.refers_to_entity_ID || [];
    const refs = Array.isArray(refsRaw) ? refsRaw : [refsRaw];
    for (const rid of refs) {
      const hi = allDataById.get(rid);
      if (hi == null || hi >= N_GEO || Number.isFinite(birthChapter[hi])) continue;
      if (!silentAnchorSatellites.has(hi)) silentAnchorSatellites.set(hi, []);
      silentAnchorSatellites.get(hi).push(i);
    }
  }
  for (const [hi, satellites] of silentAnchorSatellites) {
    const derived = d3.min(satellites, i => birthChapter[i]);
    if (!Number.isFinite(derived)) continue;
    // Un ancoraggio silente nasce quando nasce il primo luogo narrativo che lo
    // ancora: non prima, perche' nulla ne giustificherebbe la comparsa, e non
    // mai, perche' altrimenti i suoi satelliti sono inesprimibili nel layout.
    birthChapter[hi] = derived;
  }

  function isBorn(i, c) { return birthChapter[i] <= c; }

  const bornIndicesByChapter = Array.from(
    {length: N_CHAPTERS + 1},
    (_, c) => c === 0 ? [] : d3.range(allData.length).filter(i => isBorn(i, c))
  );

  // Le soglie assolute e logaritmiche mantengono il rilievo monotono nel tempo.
  const BANDS_LOG_BASE = 1.47, BANDS_MAX = 9;
  const reliefMeta = gadda_real?.meta?.reliefBands;
  const bandsLogBase = reliefMeta?.logBase ?? BANDS_LOG_BASE;
  const bandsMax = reliefMeta?.maxBands ?? BANDS_MAX;
  // Il numero massimo di bande deve restare coerente con TER_BANDS_SPAN.
  function bandsFor(occ) {
    if (occ <= 0) return 0;
    return Math.min(bandsMax, Math.floor(Math.log(occ) / Math.log(bandsLogBase)) + 1);
  }

  return {
    cumOcc, birthChapter, isBorn, bornIndicesByChapter, bandsFor,
    BANDS_MAX: bandsMax,
    BANDS_LOG_BASE: bandsLogBase
  };
}
