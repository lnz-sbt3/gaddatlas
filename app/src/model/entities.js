import * as d3 from "d3";
import s4Config from "./config.js";

// fusione alias + separazione referenziali/fittizi + indice unificato
export default function s4Entities(gadda_real) {
  const { ALIAS_GROUPS, GEO_RADIUS_KM, ROME_CENTER, N_CHAPTERS } = s4Config;
  const dataAll = gadda_real.features;
  // occorrenze come pubblicate nel GeoJSON, prima della fusione degli alias:
  // servono al criterio d'ordine esplicito piu' sotto (D-041)
  const publishedOcc = new Map(dataAll.map(d => [d.properties.GazetteerEntity_ID, d.properties.occurrences || 0]));

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
  //
  // Ordine dentro ciascun gruppo (D-041): criterio esplicito, non l'ordine del file.
  // Prima le tessere con piu' occorrenze pubblicate (prima della fusione degli alias),
  // poi l'id. E' l'ordine che il GeoJSON aveva per costruzione e su cui il notebook
  // e' stato calibrato: decide chi si disegna prima (sotto) a parita' di profondita'
  // e chi vince l'hit test in vista piana. Cosi' il file puo' essere ordinato per id
  // senza che l'ordine di disegno dipenda dalla sua posizione.
  // Una tessera fusa da ALIAS_GROUPS prende la chiave del membro del suo gruppo
  // che viene primo con lo stesso criterio (piu' occorrenze, poi id minore).
  const keyOf = d => {
    const id = d.properties.GazetteerEntity_ID;
    const group = aliasGroupById.get(id);
    const ids = group ? group.ids.filter(m => publishedOcc.has(m)) : [id];
    return ids
      .map(m => [publishedOcc.get(m) || 0, m])
      .sort((x, y) => d3.descending(x[0], y[0]) || d3.ascending(x[1], y[1]))[0];
  };
  const byOccThenId = (a, b) => {
    const [oa, ia] = keyOf(a), [ob, ib] = keyOf(b);
    return d3.descending(oa, ob) || d3.ascending(ia, ib);
  };
  const entitiesGeo = entities.filter(d => d.geometry && d.geometry.coordinates);
  const geoData = entitiesGeo.filter(d => haversineKm(ROME_CENTER, d.geometry.coordinates) <= GEO_RADIUS_KM).sort(byOccThenId);
  const geoOffmapData = entitiesGeo.filter(d => haversineKm(ROME_CENTER, d.geometry.coordinates) > GEO_RADIUS_KM).sort(byOccThenId);
  const geoDataAll = [...geoData, ...geoOffmapData];

  // -- FITTIZI: nessuna geometria (reality_status in transformed/imagined/invented; gli
  // imported hanno sempre geometria) -> nessun generatore Voronoi, ma partecipano al
  // rilievo per densita'.
  const fictData = entities.filter(d => !(d.geometry && d.geometry.coordinates)).sort(byOccThenId);

  // Ogni tessera fittizia deve avere uno statuto che ha un glifo (T-87, D-040).
  // Nel notebook uno statuto sconosciuto finiva in silenzio sul glifo «invented»:
  // qui si ferma il caricamento con un errore che dice quale tessera e quale valore.
  const { FICT_GLYPH_PATHS } = s4Config;
  const badStatus = fictData.filter(d => !FICT_GLYPH_PATHS[d.properties.reality_status]);
  if (badStatus.length) {
    throw new Error(
      "statuto di realtà senza glifo per " + badStatus.length + " tessere fittizie: " +
      badStatus.slice(0, 5).map(d => `${d.properties.GazetteerEntity_ID}=${JSON.stringify(d.properties.reality_status)}`).join(", ") +
      ` (ammessi: ${Object.keys(FICT_GLYPH_PATHS).join(", ")})`
    );
  }

  // indici unificati: i referenziali (0..N_GEO-1, hanno pts/cellRings) precedono i
  // fittizi (N_GEO..allData.length-1, nessun pts / cellRings=null)
  const N_INMAP = geoData.length;
  const N_GEO = geoDataAll.length;
  const allData = [...geoDataAll, ...fictData];
  // risolve refers_to_entity_ID (bussola) senza scandire allData ad ogni click
  const allDataById = new Map(allData.map((d, i) => [d.properties.GazetteerEntity_ID, i]));

  return { geoData, geoDataAll, allData, N_INMAP, N_GEO, allDataById };
}
