import s4Config from "./config.js";

// fusione alias + separazione referenziali/fittizi + indice unificato
export default function s4Entities(gadda_real) {
  const { ALIAS_GROUPS, GEO_RADIUS_KM, ROME_CENTER, N_CHAPTERS } = s4Config;
  const dataAll = gadda_real.features;

  function haversineKm([lon1, lat1], [lon2, lat2]) {
    const R = 6371, toRad = Math.PI / 180;
    const dphi = (lat2 - lat1) * toRad, dlmb = (lon2 - lon1) * toRad;
    const a = Math.sin(dphi / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dlmb / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  const aliasGroupById = new Map(ALIAS_GROUPS.flatMap(g => g.ids.map(id => [id, g])));
  const dataById = new Map(dataAll.map(d => [d.properties.GazetteerEntity_ID, d]));

  function parseJsonArrayString(value) {
    if (typeof value !== "string") return null;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  function normalizeRefIds(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.map(String);
    const parsed = parseJsonArrayString(value);
    return (parsed || [value]).map(String);
  }

  function normalizePartOf(value) {
    if (value == null) return value;
    const parsed = parseJsonArrayString(value);
    if (parsed) return parsed.length ? String(parsed[0]) : null;
    return Array.isArray(value) ? (value.length ? String(value[0]) : null) : value;
  }

  const entities = [];
  const fused = new Set();
  for (const d of dataAll) {
    const id = d.properties.GazetteerEntity_ID;
    if (fused.has(id)) continue;
    const group = aliasGroupById.get(id);
    if (!group) { entities.push(d); continue; }
    const canonical = dataById.get(group.canonical);
    // Un canonico assente indica un gruppo gia' fuso a monte o non applicabile.
    if (!canonical) { entities.push(d); continue; }
    const occurrences = group.ids.reduce((sum, mid) => sum + (dataById.get(mid)?.properties.occurrences ?? 0), 0);
    const mentionsByChapter = Array.from({length: N_CHAPTERS}, (_, k) =>
      group.ids.reduce((sum, mid) => sum + (dataById.get(mid)?.properties.mentionsByChapter?.[k] ?? 0), 0)
    );
    group.ids.forEach(mid => fused.add(mid));
    entities.push({ ...canonical, properties: { ...canonical.properties, occurrences, mentionsByChapter } });
  }

  for (const d of entities) {
    const props = d.properties || {};
    // La forma del dato si normalizza nel punto d'ingresso, non in ogni
    // consumatore: Array.isArray(x) ? x : [x] mascherava la stringa JSON intera
    // invece di interpretarla, spezzando s4Chapters e s4Satellites in modi diversi.
    props.refers_to_entity_ID = normalizeRefIds(props.refers_to_entity_ID);
    props.partOf = normalizePartOf(props.partOf);
  }

  // referenziali: hanno geometria. Il filtro GEO_RADIUS_KM resta solo sulla
  // tassellazione Voronoi; il second space accoglie anche i referenziali fuori raggio.
  const entitiesGeo = entities.filter(d => d.geometry && d.geometry.coordinates);
  const geoData = entitiesGeo.filter(d => haversineKm(ROME_CENTER, d.geometry.coordinates) <= GEO_RADIUS_KM);
  const geoOffmapData = entitiesGeo.filter(d => haversineKm(ROME_CENTER, d.geometry.coordinates) > GEO_RADIUS_KM);
  const geoDataAll = [...geoData, ...geoOffmapData];

  // -- FITTIZI: nessuna geometria (reality_status in transformed/imagined/invented; gli
  // imported hanno sempre geometria) -> nessun generatore Voronoi, ma partecipano al
  // rilievo per densita'.
  const fictData = entities.filter(d => !(d.geometry && d.geometry.coordinates));

  // indici unificati: i referenziali (0..N_GEO-1, hanno pts/cellRings) precedono i
  // fittizi (N_GEO..allData.length-1, nessun pts / cellRings=null)
  const N_INMAP = geoData.length;
  const N_GEO = geoDataAll.length;
  const allData = [...geoDataAll, ...fictData];
  // risolve refers_to_entity_ID (bussola) senza scandire allData ad ogni click
  const allDataById = new Map(allData.map((d, i) => [d.properties.GazetteerEntity_ID, i]));

  return { geoData, geoDataAll, allData, N_INMAP, N_GEO, allDataById };
}
