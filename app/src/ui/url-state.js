// Stato pubblico della lettura: nessun indice del renderer entra nei link.
export const URL_KEYS = ["view", "axon", "narrative", "focalizer", "chapter", "mode", "cursor", "roles", "order", "rotation", "place", "reference", "route", "tour"];

export function createUrlStateCodec(model, config) {
  const {allData, allDataById} = model.atlasEntities;
  const rows = model.atlasSequence.sequence;
  const byCursor = new Map(rows.map(r => [r.interpretationId, r]));
  const focalizers = new Set(model.atlasTerrain.agents.filter(a => a.id != null && a.total >= 10).map(a => a.id));
  const routes = new Map(model.atlasAttestedRoutes.attestedRoutes.map(r => [r.id, r]));
  const aliases = new Map(config.ALIAS_GROUPS.flatMap(g => g.ids.map(id => [id, g.canonical])));
  const references = new Map(allData.map(d => [d.properties.GazetteerEntity_ID, new Set()]));
  for (const row of rows) references.get(allData[row.tileIndex].properties.GazetteerEntity_ID).add(row.referenceId);
  const track = (focalizer, chapter) => rows.filter(r => (focalizer == null || r.agentId === focalizer) && Number(r.chapter) === chapter);
  const last = (focalizer, chapter) => track(focalizer, chapter).at(-1)?.interpretationId ?? null;
  const bit = v => v === 1 || v === "1" ? 1 : 0;
  function normalize(raw = {}) {
    const s = {
      view: raw.view === "diagram" ? "diagram" : "map",
      axon: bit(raw.axon), narrative: bit(raw.narrative),
      focalizer: focalizers.has(raw.focalizer) ? raw.focalizer : null,
      chapter: /^[1-9]\d*$/.test(String(raw.chapter)) && +raw.chapter <= config.N_CHAPTERS ? +raw.chapter : 1,
      mode: raw.mode === "page" ? "page" : "chapter",
      cursor: null, roles: config.ROLE_ORDER.slice(), order: "time", rotation: 0,
      place: null, reference: null, route: null,
      // Passo del percorso guidato (1-based); il percorso stesso limita il valore al numero dei passi.
      tour: /^[1-9]\d?$/.test(String(raw.tour)) ? +raw.tour : null
    };
    const roles = Array.isArray(raw.roles) ? raw.roles : typeof raw.roles === "string" ? raw.roles.split(",") : [];
    if (roles.length && roles.every(r => config.ROLE_ORDER.includes(r))) s.roles = config.ROLE_ORDER.filter(r => roles.includes(r));
    if (s.focalizer && raw.order === "role") s.order = "role";
    const degrees = typeof raw.rotation === "number" || (typeof raw.rotation === "string" && /^\d+(\.\d+)?$/.test(raw.rotation)) ? Number(raw.rotation) : NaN;
    if (s.axon && Number.isFinite(degrees) && degrees >= 0 && degrees <= 360) s.rotation = degrees === 360 ? 0 : degrees;
    if (s.view === "map") s.mode = "chapter";
    if (s.mode === "page") {
      const row = byCursor.get(raw.cursor);
      if (row && (s.focalizer == null || row.agentId === s.focalizer)) {
        s.cursor = row.interpretationId;
        s.chapter = Number(row.chapter);
      } else s.cursor = last(s.focalizer, s.chapter);
      if (!s.cursor) s.mode = "chapter";
    }
    const canonical = aliases.get(raw.place) || raw.place;
    if (allDataById.has(canonical)) s.place = allData[allDataById.get(canonical)].properties.GazetteerEntity_ID;
    if (s.place && references.get(s.place)?.has(raw.reference)) s.reference = raw.reference;
    const route = routes.get(raw.route);
    const pos = byCursor.get(s.cursor)?.pos ?? -1;
    if (route && s.focalizer && s.roles.includes("Route") && route.stepsByFocalizer.has(s.focalizer) &&
        (s.mode === "page" ? route.birthPos <= pos : route.birthChapter <= s.chapter)) s.route = route.id;
    return s;
  }
  function parse(hash = "") {
    const raw = {};
    const params = new URLSearchParams(String(hash).replace(/^#/, ""));
    for (const key of URL_KEYS) {
      const values = params.getAll(key);
      if (values.length === 1) raw[key] = values[0];
    }
    return normalize(raw);
  }
  function serialize(raw) {
    const s = normalize(raw), p = new URLSearchParams();
    if (s.view !== "map") p.set("view", s.view);
    if (s.axon) p.set("axon", "1");
    if (s.view === "diagram" && s.narrative) p.set("narrative", "1");
    if (s.focalizer) p.set("focalizer", s.focalizer);
    if (s.chapter !== 1) p.set("chapter", String(s.chapter));
    if (s.mode !== "chapter") p.set("mode", s.mode);
    if (s.cursor && s.cursor !== last(s.focalizer, s.chapter)) p.set("cursor", s.cursor);
    if (s.roles.length !== config.ROLE_ORDER.length) p.set("roles", s.roles.join(","));
    if (s.order !== "time") p.set("order", s.order);
    if (s.rotation) p.set("rotation", String(s.rotation));
    for (const key of ["place", "reference", "route"]) if (s[key]) p.set(key, s[key]);
    if (s.tour) p.set("tour", String(s.tour));
    return p.size ? "#" + p.toString() : "";
  }
  return {parse, serialize, normalize};
}
