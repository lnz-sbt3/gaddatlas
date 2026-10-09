import * as d3 from "d3";

// Alberi meronimici dei luoghi narrativi: host referenziale -> satelliti fittizi.
export default function s4Satellites(s4Entities, s4Chapters, s4Voronoi) {
  const { allData, N_GEO, allDataById } = s4Entities;
  const { birthChapter } = s4Chapters;
  const { cognitiveTileRadius } = s4Voronoi;

  const parentOf = allData.map(() => null);
  for (let i = N_GEO; i < allData.length; i++) {
    const p = allData[i].properties.partOf;
    if (p == null) continue;
    const pi = allDataById.get(p);
    if (pi != null && pi >= N_GEO) parentOf[i] = pi;
  }

  // Primo antenato nato al capitolo c, saltando quelli non ancora comparsi.
  // null = nessun antenato nato: il satellite si attacca direttamente all'host.
  function effectiveParent(i, c, isBorn) {
    let cur = parentOf[i];
    const seen = new Set([i]);
    while (cur != null && !seen.has(cur)) {
      if (isBorn(cur, c)) return cur;
      seen.add(cur);
      cur = parentOf[cur];
    }
    return null;
  }

  const satellitesByHost = new Map();
  const hostsOf = allData.map(() => []);
  for (let i = N_GEO; i < allData.length; i++) {
    const refs = allData[i].properties.refers_to_entity_ID || [];
    for (const rid of refs) {
      const hi = allDataById.get(rid);
      if (hi == null || hi >= N_GEO) continue;
      if (!satellitesByHost.has(hi)) satellitesByHost.set(hi, []);
      satellitesByHost.get(hi).push(i);
      hostsOf[i].push(hi);
    }
  }
  const primaryHostOf = allData.map(() => null);
  for (let i = N_GEO; i < allData.length; i++) {
    const hosts = hostsOf[i];
    if (!hosts.length) continue;
    // INVARIANTE: il primario ha birthChapter minimo. Quindi se un qualunque
    // host del tassello e' nato al capitolo c, anche il primario e' gia' nato:
    // nessun tassello puo' avere solo host secondari presenti.
    primaryHostOf[i] = hosts.slice().sort((a, b) =>
      d3.ascending(birthChapter[a], birthChapter[b]) ||
      d3.descending(cognitiveTileRadius[a], cognitiveTileRadius[b]) ||
      d3.ascending(allData[a].properties.GazetteerEntity_ID, allData[b].properties.GazetteerEntity_ID)
    )[0];
  }

  return { effectiveParent, satellitesByHost, primaryHostOf };
}
