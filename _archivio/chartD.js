// ===== CELLA: gadda_real =====
// Dataset principale e contorno amministrativo di Roma.
const gadda_real = await FileAttachment("GaddAtlas_real_10ch.geojson").json();

// ===== CELLA: roma =====
const roma = await FileAttachment("export.geojson").json();

// ===== CELLA: d3 =====
import * as d3 from "npm:d3@7";

// ===== CELLA: projection =====
const projection = d3.geoMercator()
  .center([12.5, 41.9])
  .translate([487.5, 305])
  .scale(500000);

// ===== CELLA: s4Config =====
  // -- CELLA: s4Config --
  // Parametri visivi, geometrici e temporali della visualizzazione.
  const s4Config = {

  MARGIN: 0.08,        // buffer attorno al bbox dei punti, come frazione della diagonale
  GEO_RADIUS_KM: 100,  // includo solo luoghi entro questa distanza da Roma: esclude
                        // riferimenti narrativi lontani (Milano, Bologna, fronte della
                        // Grande Guerra...) che altrimenti farebbero esplodere il bbox
  VIEW_SIZE: 1150,     // lato lungo del canvas (px)

  // -- PALETTE --
  BG_COLOR: "#F1E7D0",     // fondo parchment
  HUE_RGB: "155,35,53",    // #9B2335 -- hue unico riservato alla densità/rilievo;
                            // il hue categoriale (NarrativeRole) resta libero per dopo
  FICT_HUE_RGB: "31,111,107", // #1F6F6B (teal scuro) -- densità dei luoghi narrativi (fittizi),
                               // hue distinto dal rosso referenziale, leggibile sul fondo parchment
  // Il colore distingue i ruoli narrativi; la luminosita' resta riservata alla quota.
  ROLE_ORDER: ["Setting", "ZoneOfAction", "Route", "Marker", "ProjectedSpace"],
  ROLE_COLORS: {
    Setting:        "#B32B40",
    ZoneOfAction:   "#A45228",
    Route:          "#7A5E1E",
    Marker:         "#74519A",
    ProjectedSpace: "#1F6F6B"
  },
  ROLE_PLURAL_COLOR: "#666666", // pareggio nel prisma: INK_RGB desaturato alla luminanza media dei ruoli
  ROLE_MIX_BASE: 0.98,
  ROLE_MIX_TOP:  0.42,
  AXON_SOLID_CAPS: true,  // terrazze come calotte piene sovrapposte, non anelli
  AXON_EDGE_TOP: 1.5,   // px schermo
  AXON_EDGE_BOT: 0.55,  // px schermo
  AXON_EDGE_PICK: 2.8,  // px schermo, terrazza interrogata
  PICK_TOLERANCE_PX: 3.5,
  ROLE_SORT_MORPH: 0.14, // molla del crossfade fra ordine cronologico e per ruolo
  // Archi route empirici: valori regolati a occhio per leggibilita' in mappa e assonometria.
  ARC_RISE: 0.28,
  ARC_RISE_MIN_PX: 26,
  ARC_RISE_MAX_PX: 210,
  ARC_SAMPLES: 48,
  ARC_WIDTH_MIN: 1.1,
  ARC_WIDTH_MAX: 3.4,
  ARC_CASING_PX: 2.6,
  ARC_JOINT_R: 3.2,
  ARC_JOINT_RING_PX: 1.1,
  ROUTE_HOVER_MORPH: 0.18,  // molla di comparsa/scomparsa della route interrogata
  ISO_ALPHA: 0.25,          // opacità COSTANTE di ogni trattino: la densità si legge dal
                            // numero di trattini, mai dall'intensità/colore
  ISO_WIDTH: 0.35,         // spessore trattino a schermo costante (ISO_WIDTH*invK)
  ISO_FILL: true,          // riempimento ipsometrico fra curve consecutive
  ISO_FILL_A0: 0.02,       // tono della banda 1: quasi invisibile
  ISO_FILL_A1: 0.55,       // tono della banda massima: saturo
  ISO_FILL_GAMMA: 2.6,     // convessita' della rampa
  GRID_COLOR: "120,90,70", // confine di cella: inchiostro neutro caldo, NON il rosso della
                            // densità -> la struttura geometrica recede sotto il rilievo
  GRID_ALPHA: 0.22,        // opacità bassa e costante del confine di cella
  SHOW_GHOST_SLOTS: true,
  PROFILE: false,
  FOCAL_DIM_ALPHA: 0.12,   // fattore di attenuazione delle tessere non coinvolte dal focalizzatore
  FOCAL_DIM_MORPH: 0.10,   // molla della transizione, stessa logica di BIRTH_MORPH
  FOCAL_HIDE: false,       // true = sparizione totale invece di attenuazione; interruttore di riserva
  SEQ_FOLLOW_FOCALIZER: true,  // con focalizzatore attivo il cursore percorre solo i suoi riferimenti
  SEQ_PLAY_MS: 1100,           // intervallo di avanzamento in play sulla timeline sequenziale
  SEQ_MORPH_SCALE: 0.35,       // in modalita' pagina tutte le molle rallentano: la
                               // comparsa di una singola tessera deve essere seguibile
  SEQ_ENABLED_IN_MAP: false,   // la timeline di pagina esiste solo in diagramma/assonometria
  CONSTELLATION_FLOOR: 0.45,
  CONSTELLATION_DECAY: 0.55,
  CONSTELLATION_RADIUS_GAIN: 2.2,
  // L'alone e' spostato verso il lato libero dall'estrusione assonometrica.
  HALO_ALPHA_PEAK: 0.72,    // alpha del plateau visibile
  HALO_FALLOFF_GAMMA: 1.5,  // a = (1-u)^gamma oltre il bordo; >1 = coda piu' morbida
  HALO_FALLOFF_STOPS: 4,    // campioni della rampa esterna (il gradiente canvas e' lineare a tratti)
  HALO_POOL_OFFSET: 0.55,   // scostamento della pozza in frazioni di raggio del tassello,
                            // lungo la direzione opposta all'estrusione, scalato da tiltEased
  GAP_MIN: 4,
  SEQ_BLOCK_DELTA: 2,
  RING_GUIDE_ALPHA: 0.30,  // fasce cognitive: leggibili ma sotto ai tasselli
  RING_GUIDE_WIDTH: 0.6,   // tratto sottile a schermo costante (*invK)
  INK_COLOR: "#2A1F18",    // inchiostro scuro neutro: contorno di Roma, glow, etichetta

  // -- ISOIPSE --
  // La densita' e' codificata dal numero di curve di livello.
  // nL (numero di curve di livello per cella) = B = bandsFor(occ), soglie assolute
  // log sull'occorrenza cumulativa (vedi bandsFor in s4Chapters).
  ISO_INNER: 0.16,      // frazione del raggio a cui si chiude la curva più interna (la "vetta")
  ISO_OUTER: 0.88,      // frazione del raggio del bordo a cui sta la curva più esterna:
                        // <1 così la curva di base non si incolla al confine di cella
  ISO_ANGLES: 40,       // campioni angolari per curva: sotto ~28 si vedono le spezzate
  ISO_WOBBLE: 0.14,     // ampiezza dell'irregolarità, frazione del raggio locale
  ISO_DRIFT: 0.55,      // quanto il rumore deriva passando da un livello all'altro:
                        // 0 = anelli omotetici (leggibili come poligoni scalati), alto = curve slegate
  AXON_STACK_ALIGN: 1.0, // 1 = contorni omotetici in assonometria
  TER_SLOPE: 1.5,
  TER_BANDS_SPAN: 9,
  AXON_OPAQUE: true,    // superfici opache: occlusione reale
  AXON_TREAD_TINT: 0.035, // scurimento massimo della base: la vetta schiarisce verso BG_COLOR
  AXON_WALL_SHADE: 0.28,
  AXON_WALL_MIN_LUM: 0.46, // frazione minima della luminanza del fondo sotto cui una parete non puo' scendere
  AXON_MAP_FOOTPRINT_MAX: null, // limite disattivato: in mappa il rilievo torna a coincidere con la cella
  ISO_SUMMIT_BIAS: 0.18, // asimmetria della vetta, frazione del raggio MINIMO della cella
                         // (non del raggio direzionale: quello deformava le curve su celle allungate)
  ISO_MARGIN: 0.92,      // clamp duro: nessun punto della curva oltre questa frazione del bordo
  ISO_MIN_SPACING: 3.0,  // spaziatura minima tra curve (px schermo). Sotto questa soglia
                         // riduco il numero di curve: su celle piccole 12 isoipse sono una macchia
  ISO_ECC_DAMP: 0.65,    // compressione dell'eccentricità verso il raggio mediano della cella:
                         // 1 = la curva segue esattamente la forma del tassello, 0 = circolare

  // Soglie in pixel per il passaggio tra sintesi e stratigrafia completa.
  LOD_MIN: 0.9,
  LOD_FULL: 2.0,
  LOD_DIAG_GAIN: 2.0, // guadagno empirico: in diagramma anticipa l'apertura della stratigrafia leggibile

  // -- ZOOM / LIVELLO DI DETTAGLIO --
  K2: 4,          // sopra: anche pallino generatore + etichetta al hover
  ZOOM_MIN: 1,    // k=1 = vista iniziale adattata al bbox
  ZOOM_MAX: 32,   // abbastanza per isolare le bande di un singolo luogo

  // -- GOCCIA / TREMOLIO: molla che insegue il cursore, effetto elastico sui bordi cella --
  SPRING: 0.18,     // rincorsa posizione: piu' alto = la goccia raggiunge il cursore piu' in fretta
  S_STIFF: 0.14,    // rigidezza della molla sotto-smorzata su drop.s (rilascio elastico)
  S_DAMP: 0.62,     // smorzamento < 1 -> overshoot: un solo rimbalzo all'uscita del cursore
  STRENGTH: 12,     // intensita' target a regime (drop.ts) -> deformazione leggera
  RADIUS: 48,       // raggio del falloff a supporto compatto del liquido (bordi cella)
  // INFLUENCE_RADIUS (= RADIUS*3, usato solo da nearDrop) si ricava in chartS4 per non duplicare il fattore

  // -- DIMENSIONI A SCHERMO COSTANTE --
  // dentro scale(transform.k): un raggio/spessore in "unità di mondo" cresce
  // di k volte a schermo. Questi valori sono invece la dimensione DESIDERATA
  // a schermo (px), e vengono divisi per k in draw() prima dell'uso -- così
  // pallini, bordi, glow e la goccia stessa non esplodono zoomando
  DOT_RADIUS: 1.5,  // raggio pallino generatore
  BORDER_WIDTH: 0.75, // spessore confine di cella
  GLOW_WIDTH: 1.5,  // spessore contorno del glow
  GLOW_BLUR: 12,    // shadowBlur del glow
  ROMA_WIDTH: 2.0,  // spessore contorno di Roma
  LABEL_SIZE: 12,   // dimensione font dell'etichetta hover

  // -- TEMPO / CAPITOLI --
  N_CHAPTERS: 10,   // mentionsByChapter ha 10 voci, indice 0 = capitolo 1
  MORPH: 0.12,      // rincorsa del rilievo verso il capitolo target
  PULSE_R: 2.5,     // raggio base del pulse a schermo (px) -> *invK, come DOT_RADIUS
  PLAY_MS: 900,     // intervallo di avanzamento capitolo durante il play

  ROME_CENTER: [12.4964, 41.9028],

  // -- POLO DELLA VISTA COGNITIVA --
  // Origine di azimut e rango radiale, distinta dal riferimento cartografico di Roma.
  SECONDSPACE_POLES: {
    romeCenter:   [12.4964, 41.9028],
    viaMerulana:  [12.5020, 41.8919],
    weightedMean: [12.5598, 41.8452]
  },
  SECONDSPACE_POLE_KEY: "viaMerulana",

  // -- FUSIONE ALIAS TOPONOMASTICI --
  // Le occorrenze e le menzioni per capitolo confluiscono nell'entita' canonica.
  ALIAS_GROUPS: [
    { ids: ["gaz_collegio_romano", "gaz_santo_stefano_del_cacco_celio_santo_stefano"], canonical: "gaz_santo_stefano_del_cacco_celio_santo_stefano" },
    { ids: ["gaz_pantheon", "gaz_tempio_di_agrippa"], canonical: "gaz_pantheon" },
    { ids: ["gaz_santa_margherita_in_abitacolo", "gaz_santa_rita_invitacolo"], canonical: "gaz_santa_margherita_in_abitacolo" },
    { ids: ["gaz_via_de_merli", "gaz_via_merulana"], canonical: "gaz_via_merulana" },
    { ids: ["gaz_viale_della_regina", "gaz_viale_regina_margherita"], canonical: "gaz_viale_regina_margherita" },
  ],

  REF_TILE_RADIUS_TARGET: 11, // raggio-base uniforme (px, spazio diagramma) delle tessere referenziali
  REF_TILE_VARIANCE: 0.25,    // 0 = tutte identiche; 1 = piena varianza geografica
  REF_TILE_RADIUS_MIN: 7,     // guard-rail anti-invisibilita'
  REF_TILE_RADIUS_MAX: 16,    // guard-rail anti-gigantismo
  OFFMAP_TILE_RADIUS: 9.5,    // tassello sintetico dei referenziali fuori mappa
  TILE_GAP: 4,
  DIAG_SCREEN_FRAC: 0.90,   // il diagramma occupa ~90% del lato corto del viewport

  // -- TRASFORMAZIONE A RANGO RADIALE --
  RADIAL_BANDS: 14,        // K bande equipopolate: quantili della distanza dal polo.
                            // Piu' bande = maggiore fedelta' azimutale ma piu' estensione.
  BAND_FILL: 0.75,         // frazione massima di circonferenza occupata da una banda.
                            // Sotto 1 lascia lo slack che permette al packing di
                            // rispettare l'azimut invece di equispaziare per forza.
  BAND_STEP_MIN: 30,       // distanza radiale minima fra bande consecutive
  BAND_START_RADIUS: 60,   // raggio minimo della prima banda

  LABEL_GAP_WIDTH_PX: 46,    // larghezza del varco in px di spazio-diagramma, alla quota dell'anello

  CRIMP_MORPH: 0.0325, // rincorsa del ritaglio: dimezzata per rallentare ~2x la transizione mappa<->diagramma
  BIRTH_MORPH: 0.14,
  BIRTH_EPSILON: 0.015,
  LAYOUT_MORPH_SLOW: 0.025, // tessere vicine al centro viewport: dimezzato per rallentare ~2x
  LAYOUT_MORPH_FAST: 0.15,  // tessere lontane dal centro viewport: dimezzato per rallentare ~2x
  FICT_CRIMP_THRESHOLD: 0.5,
  FICT_GLYPH_WIDTH: 1.0,       // spessore contorno glifo fittizio (px schermo)
  FICT_RELIEF_ALPHA: 0.5,      // opacita' ridotta della raggiera fittizia
  // -- TESSERE NARRATIVE A COLLARE --
  COLLAR_DEPTH: 14,        // profondita' del primo anello
  COLLAR_DEPTH_DECAY: 0.3, // h_k = COLLAR_DEPTH / (1 + decay * k)
  COLLAR_MITER_MAX: 2.5,   // clamp del miter sui vertici acuti
  CHILD_DEPTH: 11,         // profondita' delle tessere figlie su spigolo suddiviso
  SHAPE_MIN_V: 0,          // vertici intermedi sul bordo esterno libero
  SHAPE_MAX_V: 5,
  SHAPE_AMP: 0.30,         // sporgenza massima, in frazione di h
  NARR_GLYPH_SCALE: 0.55,  // dimensione glifo riferita al tassello referenziale
  METRIC_ISOLINES_KM: [0.5, 1, 2, 5, 20, 100],
  // -- GLIFI FITTIZI: path SVG da Figma, viewBox 100x100 --
  // bbox reale del tracciato (misurata sui path, non sul frame): serve a centrare
  // i tre glifi sullo stesso baricentro visivo, dato che in Figma non sono
  // centrati sul frame allo stesso modo.
  FICT_GLYPH_PATHS: {
    transformed: "M44.6429 0C44.6429 0 48.3499 25.6938 60.5263 34.375C72.7028 43.0562 100 29.1667 100 29.1667C100 29.1667 74.0441 38.1162 73.6842 53.125C73.3243 68.1338 96.4286 79.1667 96.4286 79.1667C96.4286 79.1667 76.8233 71.0769 65.7895 75.8333C54.7556 80.5898 44.6429 100 44.6429 100C44.6429 100 35.933 80.7964 26.3158 75.8333C16.6986 70.8702 0 75.8333 0 75.8333C0 75.8333 13.9047 62.0212 13.1579 53.125C12.411 44.2288 5.26316 37.5 5.26316 37.5C5.26316 37.5 22.0143 41.6652 31.5789 34.375C41.1436 27.0848 44.6429 0 44.6429 0Z",
    imagined: "M44.8819 0.0369721C57.4316 -1.1313 48.5711 25.7132 60.6891 34.3884C72.8071 43.0637 98.9827 12.3385 99.9732 29.1837C100.964 46.0289 74.142 38.1271 73.7838 53.1256C73.4257 68.1241 101.875 66.2465 96.4189 79.1495C90.9631 92.0524 76.9079 71.0652 65.927 75.8184C54.9461 80.5716 55.8789 100.907 44.8819 99.9685C33.885 99.03 36.2139 80.7781 26.6429 75.8184C17.0719 70.8587 3.89295 86.537 0.453497 75.8184C-2.98595 65.0998 14.2915 62.0158 13.5482 53.1256C12.8049 44.2355 5.13521 47.1723 5.69138 37.5113C6.24755 27.8503 22.362 41.6737 31.8808 34.3884C41.3995 27.1032 32.3323 1.20525 44.8819 0.0369721Z",
    invented: "M45.9915 6.60415C54.1921 -4.89582 97.0782 -2.25548 99.6009 21.5076C102.124 45.2706 92.0328 50.5513 87.677 74.3161C83.3212 98.0809 54.1921 90.1564 38.6352 97.8327C23.0783 105.509 7.55605 91.6419 1.85374 74.3161C-3.84856 56.9903 4.83385 54.7282 11.3062 37.3496C17.7785 19.971 37.7908 18.1041 45.9915 6.60415Z"
  },
  // centro geometrico e semi-lato dominante della bbox del tracciato, in coordinate
  // viewBox. Precalcolati: evita di misurare i path ad ogni frame.
  FICT_GLYPH_BOX: {
    transformed: { cx: 50.0,  cy: 50.0,  half: 50.0 },
    imagined:    { cx: 50.0,  cy: 50.0,  half: 50.0 },
    invented:    { cx: 50.5,  cy: 50.5,  half: 49.5 }
  },
  // correttivo per-status: compensa il diverso riempimento del frame (Invented e'
  // un blob compatto, gli altri due stelle che toccano i bordi). 1 = nessuna correzione.
  FICT_GLYPH_GAIN: { transformed: 1.0, imagined: 1.0, invented: 0.92 },

  SAMPLE: 7 // passo di campionamento (px) dei lati Voronoi / dei ring cella
};

// ===== CELLA: s4Entities =====
// -- CELLA: s4Entities --
// fusione alias + separazione referenziali/fittizi + indice unificato
const s4Entities = (() => {
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
})();

// ===== CELLA: s4Satellites =====
// -- CELLA: s4Satellites --
// Alberi meronimici dei luoghi narrativi: host referenziale -> satelliti fittizi.
const s4Satellites = (() => {
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
})();

// ===== CELLA: s4Projection =====
// -- CELLA: s4Projection --
// Proiezione dei generatori, deduplicazione, scala, bounding box e azimut.
const s4Projection = (() => {
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
})();

// ===== CELLA: s4Voronoi =====
// -- CELLA: s4Voronoi --
// Delaunay/Voronoi, bordi campionati e normalizzazione cognitiva delle celle.
const s4Voronoi = (() => {
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
})();

// ===== CELLA: s4Chapters =====
// -- CELLA: s4Chapters --
// Occorrenze cumulative e capitolo di prima comparsa.
const s4Chapters = (() => {
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
})();

// ===== CELLA: s4Terrain =====
// -- CELLA: s4Terrain --
// Piano cumulativo per riferimento distinto e viste per focalizzatore.
const s4Terrain = (() => {
  const { N_CHAPTERS } = s4Config;
  const { allData, allDataById } = s4Entities;
  const reliefRows = Array.isArray(gadda_real.relief) ? gadda_real.relief : [];
  const agentNameById = new Map((gadda_real.paths?.agents || []).map(a => [a.id, a.name || a.label || a.id]));
  const aliasTargetById = new Map((s4Config.ALIAS_GROUPS || []).flatMap(g => g.ids.map(id => [id, g.canonical])));

  function tileIndexOf(targetId) {
    return allDataById.get(targetId) ?? allDataById.get(aliasTargetById.get(targetId));
  }

  const rows = [];
  for (const r of reliefRows) {
    const i = tileIndexOf(r.targetId);
    if (i == null) continue;
    rows.push({ row: r, i });
  }

  const refsByTileChapter = Array.from({length: allData.length}, () =>
    Array.from({length: N_CHAPTERS + 1}, () => new Set())
  );
  const agentTotals = new Map();
  const agentTiles = new Map();
  const occAgent = new Map();

  function agentArray(agentId) {
    let arr = occAgent.get(agentId);
    if (!arr) {
      arr = new Float32Array(allData.length * (N_CHAPTERS + 1));
      occAgent.set(agentId, arr);
    }
    return arr;
  }

  for (const {row, i} of rows) {
    const c = Math.max(1, Math.min(N_CHAPTERS, Number(row.chapter) || 1));
    refsByTileChapter[i][c].add(row.referenceId);
    const agentId = row.agentId;
    agentTotals.set(agentId, (agentTotals.get(agentId) || 0) + 1);
    if (!agentTiles.has(agentId)) agentTiles.set(agentId, new Set());
    agentTiles.get(agentId).add(i);
    agentArray(agentId)[i * (N_CHAPTERS + 1) + c] += 1;
  }

  const occPlane = Array.from({length: allData.length}, (_, i) => {
    const arr = new Float32Array(N_CHAPTERS + 1);
    const seen = new Set();
    for (let c = 1; c <= N_CHAPTERS; c++) {
      for (const refId of refsByTileChapter[i][c]) seen.add(refId);
      arr[c] = seen.size;
    }
    return arr;
  });

  for (const arr of occAgent.values()) {
    for (let i = 0; i < allData.length; i++) {
      let s = 0;
      for (let c = 1; c <= N_CHAPTERS; c++) {
        const idx = i * (N_CHAPTERS + 1) + c;
        s += arr[idx];
        arr[idx] = s;
      }
    }
  }

  const agents = [
    { id: null, name: "tutti", total: rows.length, tiles: new Set(rows.map(d => d.i)).size },
    ...Array.from(agentTotals, ([id, total]) => ({
      id,
      name: agentNameById.get(id) || id,
      total,
      tiles: agentTiles.get(id)?.size || 0
    })).sort((a, b) => b.total - a.total)
  ];

  function occAt(i, c, agentId = null) {
    if (agentId == null) return occPlane[i]?.[c] || 0;
    const arr = occAgent.get(agentId);
    return arr ? arr[i * (N_CHAPTERS + 1) + c] || 0 : 0;
  }

  return { agents, occAt };
})();

// ===== CELLA: s4Sequence =====
// -- CELLA: s4Sequence --
// Indice sequenziale dei riferimenti a livello pagina. La chiave di lettura e'
// (page, referenceId), con referenceId
// confrontato come stringa zero-padded: niente parsing numerico del riferimento.
const s4Sequence = (() => {
  const { N_CHAPTERS } = s4Config;
  const { allData, allDataById } = s4Entities;
  const reliefRows = Array.isArray(gadda_real.relief) ? gadda_real.relief : [];
  const aliasTargetById = new Map((s4Config.ALIAS_GROUPS || []).flatMap(g => g.ids.map(id => [id, g.canonical])));

  function tileIndexOf(targetId) {
    return allDataById.get(targetId) ?? allDataById.get(aliasTargetById.get(targetId));
  }

  function pageKey(row) {
    const p = Number(row.page);
    return Number.isFinite(p) ? p : Infinity;
  }

  const resolved = [];
  reliefRows.forEach((row, sourceIndex) => {
    const tileIndex = tileIndexOf(row.targetId);
    if (tileIndex == null) return;
    resolved.push({ ...row, tileIndex, sourceIndex });
  });

  const sequence = resolved
    .slice()
    .sort((a, b) =>
      d3.ascending(pageKey(a), pageKey(b)) ||
      d3.ascending(String(a.referenceId || ""), String(b.referenceId || "")) ||
      d3.ascending(a.sourceIndex, b.sourceIndex)
    )
    .map((row, pos) => ({ ...row, pos }));

  const sequenceByAgent = new Map();
  for (const row of sequence) {
    const agentId = row.agentId;
    if (!sequenceByAgent.has(agentId)) sequenceByAgent.set(agentId, []);
    sequenceByAgent.get(agentId).push(row.pos);
  }

  const birthPos = Array.from({length: allData.length}, () => Infinity);
  for (const row of sequence) {
    if (row.pos < birthPos[row.tileIndex]) birthPos[row.tileIndex] = row.pos;
  }

  function chapterOfCursor(pos) {
    const p = Math.max(0, Math.min(sequence.length - 1, Math.floor(pos)));
    return sequence[p]?.chapter ?? 1;
  }

  // Route e' un ruolo relazionale, rappresentato da isRouteNode quando role e' nullo.
  const ROLE_IDX = new Map(s4Config.ROLE_ORDER.map((r, k) => [r, k]));
  function effRoleIdx(row) {
    const r = row.role || (row.isRouteNode ? "Route" : null);
    if (r == null) return -1;
    return ROLE_IDX.has(r) ? ROLE_IDX.get(r) : -1;
  }
  // Capienza dello stack cronologico dei ruoli per tessera.
  const BANDS_CAP = 32;
  const roleStack = new Int8Array(allData.length * BANDS_CAP).fill(-1);
  const rolePosStack = new Int32Array(allData.length * BANDS_CAP).fill(-1);
  const roleLen   = new Uint8Array(allData.length);

  // Buffer riusato: occUpTo restituisce sempre lo stesso Float32Array, valido fino
  // alla chiamata successiva. La funzione fa una sola passata lineare sulla
  // sequenza ordinata e conta referenceId distinti per tessera.
  const occBuf = new Float32Array(allData.length);
  const seenRefsByTile = Array.from({length: allData.length}, () => new Set());
  function occUpTo(pos, agentId = null, roleMask = null) {
    occBuf.fill(0);
    roleStack.fill(-1); rolePosStack.fill(-1); roleLen.fill(0);
    for (const seen of seenRefsByTile) seen.clear();
    if (!sequence.length || pos < 0) return occBuf;
    const stop = Math.min(sequence.length - 1, Math.floor(pos));
    // Filtro ruolo intenzionale: maschera completa = nessun filtro e le righe senza
    // ruolo restano valide; maschera parziale = contano solo righe con ruolo attivo,
    // quindi le righe role -1 sono escluse.
    const roleMaskComplete = !roleMask || roleMask.every(Boolean);
    for (let k = 0; k <= stop; k++) {
      const row = sequence[k];
      if (agentId != null && row.agentId !== agentId) continue;
      const roleIdx = effRoleIdx(row);
      if (!roleMaskComplete && !(roleIdx >= 0 && roleMask[roleIdx])) continue;
      const seen = seenRefsByTile[row.tileIndex];
      const ref = row.referenceId;
      if (seen.has(ref)) continue;
      seen.add(ref);
      occBuf[row.tileIndex] += 1;
      const t = row.tileIndex;
      if (roleLen[t] < BANDS_CAP) {
        const slot = t * BANDS_CAP + roleLen[t]++;
        roleStack[slot] = roleIdx;
        rolePosStack[slot] = row.pos;
      }
    }
    return occBuf;
  }

  const lastPosByChapter = Array.from({length: N_CHAPTERS + 1}, () => -1);
  for (const row of sequence) {
    const c = Math.max(1, Math.min(N_CHAPTERS, Number(row.chapter) || 1));
    lastPosByChapter[c] = Math.max(lastPosByChapter[c], row.pos);
  }
  for (let c = 1; c <= N_CHAPTERS; c++) {
    if (lastPosByChapter[c] < 0) lastPosByChapter[c] = lastPosByChapter[c - 1];
  }

  return {
    sequence, sequenceByAgent, chapterOfCursor, occUpTo, birthPos, lastPosByChapter,
    roleStack, rolePosStack, roleLen, BANDS_CAP
  };
})();

// ===== CELLA: s4NarrativeGeometry =====
// -- CELLA: s4NarrativeGeometry --
// Costruzione a incastro: ogni tessera narrativa condivide uno spigolo intero
// con il referenziale o con la tessera padre. Niente Voronoi locale.
const s4NarrativeGeometry = (() => {
  const {
    N_CHAPTERS, COLLAR_DEPTH, COLLAR_DEPTH_DECAY, COLLAR_MITER_MAX,
    CHILD_DEPTH, SHAPE_MIN_V, SHAPE_MAX_V, SHAPE_AMP, REF_TILE_RADIUS_TARGET
  } = s4Config;
  const { allData } = s4Entities;
  const { cellRings: baseCellRings, normalizedCellScale, cognitiveTileRadius } = s4Voronoi;
  const { satellitesByHost, effectiveParent } = s4Satellites;
  const { cumOcc, isBorn } = s4Chapters;

  function signedArea(P) {
    let a = 0;
    for (let i = 0; i < P.length; i++) {
      const A = P[i], B = P[(i + 1) % P.length];
      a += A[0] * B[1] - B[0] * A[1];
    }
    return a / 2;
  }

  function ensureCCW(P) {
    return signedArea(P) >= 0 ? P.slice() : P.slice().reverse();
  }

  function disk(radius, n = 8) {
    return Array.from({length: n}, (_, k) => {
      const a = (Math.PI * 2 * k) / n;
      return [Math.cos(a) * radius, Math.sin(a) * radius];
    });
  }

  function hostPolygon(host) {
    const cr = baseCellRings[host];
    const s = normalizedCellScale[host] || 1;
    if (cr && cr.cell && cr.cell.length >= 4) {
      return ensureCCW(cr.cell.slice(0, cr.cell.length - 1).map(([x, y]) => [
        (x - cr.gx) * s,
        (y - cr.gy) * s
      ]));
    }
    return ensureCCW(disk(cognitiveTileRadius[host] || REF_TILE_RADIUS_TARGET));
  }

  function outwardNormals(P) {
    return P.map((A, i) => {
      const B = P[(i + 1) % P.length];
      const ex = B[0] - A[0], ey = B[1] - A[1];
      const L = Math.hypot(ex, ey) || 1;
      return [ey / L, -ex / L];
    });
  }

  function collar(P, h, childCounts = []) {
    const n = P.length, N = outwardNormals(P), outer = [];
    for (let i = 0; i < n; i++) {
      const n0 = N[(i - 1 + n) % n], n1 = N[i];
      let bx = n0[0] + n1[0], by = n0[1] + n1[1];
      const L = Math.hypot(bx, by) || 1;
      bx /= L; by /= L;
      const cosd = Math.max(0.2, bx * n1[0] + by * n1[1]);
      const m = Math.min(1 / cosd, COLLAR_MITER_MAX);
      outer.push([P[i][0] + h * bx * m, P[i][1] + h * by * m]);
    }
    const tiles = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const k = Math.max(1, childCounts[i] || 0);
      const chain = [];
      for (let t = 0; t <= k; t++) {
        chain.push([
          outer[j][0] + (outer[i][0] - outer[j][0]) * t / k,
          outer[j][1] + (outer[i][1] - outer[j][1]) * t / k
        ]);
      }
      tiles.push({
        edgeIndex: i,
        inner: [P[i], P[j]],
        outer: [outer[j], outer[i]],
        polygon: [P[i], P[j], ...chain],
        freeEdges: chain.slice(0, -1).map((A, t) => [A, chain[t + 1]])
      });
    }
    return { tiles, outer };
  }

  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => d3.ascending(a[0], b[0]) || d3.ascending(a[1], b[1]));
    if (p.length <= 1) return p;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const pt of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
      lower.push(pt);
    }
    const upper = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const pt = p[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
      upper.push(pt);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function hash01(seed, k) {
    let h = (Math.imul(seed, 2654435761) + Math.imul(k, 40503) + 12345) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 1274126177) >>> 0; h ^= h >>> 16;
    return (h & 0xFFFFFF) / 0xFFFFFF;
  }

  function seedFor(i) {
    const raw = allData[i].properties.voidSeed ?? ((i * 0.6180339887) % 1);
    return Math.max(1, Math.floor(raw * 0xFFFFFF) ^ i);
  }

  function perturbedTile(Pi, Pj, Oi, Oj, seed, h) {
    const m = SHAPE_MIN_V + Math.floor(hash01(seed, 0) * (SHAPE_MAX_V - SHAPE_MIN_V + 1));
    const ex = Oi[0] - Oj[0], ey = Oi[1] - Oj[1];
    const L = Math.hypot(ex, ey) || 1;
    let nx = ey / L, ny = -ex / L;
    const mi = [(Pi[0] + Pj[0]) / 2, (Pi[1] + Pj[1]) / 2];
    const mo = [(Oi[0] + Oj[0]) / 2, (Oi[1] + Oj[1]) / 2];
    if (nx * (mo[0] - mi[0]) + ny * (mo[1] - mi[1]) < 0) { nx = -nx; ny = -ny; }
    const ts = Array.from({length: m}, (_, k) => 0.12 + 0.76 * hash01(seed, 10 + k)).sort(d3.ascending);
    const pts = ts.map((t, k) => {
      const d = SHAPE_AMP * h * (0.35 + 0.65 * hash01(seed, 30 + k));
      return [Oj[0] + ex * t + nx * d, Oj[1] + ey * t + ny * d];
    });
    return convexHull([Pi, Pj, Oj, ...pts, Oi]);
  }

  function edgeLength(tile) {
    const A = tile.inner[0], B = tile.inner[1];
    return Math.hypot(B[0] - A[0], B[1] - A[1]);
  }

  function polygonCentroid(P) {
    const c = d3.polygonCentroid(P);
    return Number.isFinite(c[0]) && Number.isFinite(c[1]) ? c : [
      d3.mean(P, p => p[0]) || 0,
      d3.mean(P, p => p[1]) || 0
    ];
  }

  function childrenOf(i, host, c) {
    return (satellitesByHost.get(host) || [])
      .filter(s => isBorn(s, c) && effectiveParent(s, c, isBorn) === i);
  }

  function childTileFromEdge(edge, parentPoly, childIndex, childCount, h) {
    const [A, B] = edge;
    const ex = B[0] - A[0], ey = B[1] - A[1];
    const L = Math.hypot(ex, ey) || 1;
    let nx = ey / L, ny = -ex / L;
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
    const pc = polygonCentroid(parentPoly);
    if (nx * (mid[0] - pc[0]) + ny * (mid[1] - pc[1]) < 0) { nx = -nx; ny = -ny; }
    const Oa = [A[0] + nx * h, A[1] + ny * h];
    const Ob = [B[0] + nx * h, B[1] + ny * h];
    const k = Math.max(1, childCount);
    const chain = [];
    for (let t = 0; t <= k; t++) {
      chain.push([Ob[0] + (Oa[0] - Ob[0]) * t / k, Ob[1] + (Oa[1] - Ob[1]) * t / k]);
    }
    const poly = childCount > 0
      ? [A, B, ...chain]
      : perturbedTile(A, B, Oa, Ob, seedFor(childIndex), h);
    return {
      polygon: ensureCCW(poly),
      freeEdges: chain.slice(0, -1).map((P, t) => [P, chain[t + 1]])
    };
  }

  function buildHostTiles(host, c = N_CHAPTERS, hostPt = [0, 0]) {
    const sats = (satellitesByHost.get(host) || []).filter(i => isBorn(i, c));
    if (!sats.length) return {tiles: [], radius: 0};
    const P0 = hostPolygon(host);
    const roots = sats
      .filter(i => effectiveParent(i, c, isBorn) == null)
      .sort((a, b) =>
        d3.descending(cumOcc(a, c), cumOcc(b, c)) ||
        d3.ascending(allData[a].properties.GazetteerEntity_ID, allData[b].properties.GazetteerEntity_ID)
      );
    const rootChildCounts = roots.map(i => childrenOf(i, host, c).length);
    const collars = [];
    let P = P0;
    let remaining = roots.length;
    for (let ring = 0; remaining > 0 && ring < 6; ring++) {
      const h = COLLAR_DEPTH / (1 + COLLAR_DEPTH_DECAY * ring);
      const childCounts = Array.from({length: P.length}, (_, i) => rootChildCounts[collars.length * P.length + i] || 0);
      const cRec = collar(P, h, childCounts);
      collars.push({...cRec, h, ring});
      P = cRec.outer;
      remaining -= cRec.tiles.length;
    }
    const slots = collars.flatMap(rec => rec.tiles.map(tile => ({...tile, h: rec.h, ring: rec.ring})))
      .sort((a, b) => d3.descending(edgeLength(a), edgeLength(b)) || d3.ascending(a.edgeIndex, b.edgeIndex));
    const recs = [];
    const tileByIndex = new Map();

    function tileWithChildSlots(tile, childCount) {
      const k = Math.max(1, childCount);
      const chain = [];
      const Oj = tile.outer[0], Oi = tile.outer[1];
      for (let t = 0; t <= k; t++) {
        chain.push([
          Oj[0] + (Oi[0] - Oj[0]) * t / k,
          Oj[1] + (Oi[1] - Oj[1]) * t / k
        ]);
      }
      return {
        polygon: ensureCCW([tile.inner[0], tile.inner[1], ...chain]),
        freeEdges: chain.slice(0, -1).map((P, t) => [P, chain[t + 1]])
      };
    }

    function addRec(index, tile, parentIndex, ring) {
      const childCount = childrenOf(index, host, c).length;
      const slotted = childCount > 0 ? tileWithChildSlots(tile, childCount) : null;
      const polygon = slotted ? slotted.polygon : ensureCCW(perturbedTile(tile.inner[0], tile.inner[1], tile.outer[1], tile.outer[0], seedFor(index), tile.h));
      const freeEdges = slotted ? slotted.freeEdges : [];
      const rec = {index, host, parentIndex, ring, polygon, freeEdges, pt: polygonCentroid(polygon)};
      recs.push(rec);
      tileByIndex.set(index, rec);
      return rec;
    }

    roots.forEach((index, k) => {
      const slot = slots[k];
      if (slot) addRec(index, slot, host, slot.ring);
    });

    const queue = roots.slice();
    while (queue.length) {
      const parent = queue.shift();
      const parentRec = tileByIndex.get(parent);
      if (!parentRec) continue;
      const kids = childrenOf(parent, host, c).sort((a, b) =>
        d3.descending(cumOcc(a, c), cumOcc(b, c)) ||
        d3.ascending(allData[a].properties.GazetteerEntity_ID, allData[b].properties.GazetteerEntity_ID)
      );
      kids.forEach((kid, k) => {
        const edge = parentRec.freeEdges[k % Math.max(1, parentRec.freeEdges.length)];
        if (!edge) return;
        const childCount = childrenOf(kid, host, c).length;
        const tile = childTileFromEdge(edge, parentRec.polygon, kid, childCount, CHILD_DEPTH);
        const rec = {index: kid, host, parentIndex: parent, ring: parentRec.ring + 1, polygon: tile.polygon, freeEdges: tile.freeEdges, pt: polygonCentroid(tile.polygon)};
        recs.push(rec);
        tileByIndex.set(kid, rec);
        queue.push(kid);
      });
    }

    const translatedTiles = recs.map(rec => ({
      ...rec,
      polygon: rec.polygon.map(([x, y]) => [x + hostPt[0], y + hostPt[1]]),
      freeEdges: rec.freeEdges.map(edge => edge.map(([x, y]) => [x + hostPt[0], y + hostPt[1]])),
      pt: [rec.pt[0] + hostPt[0], rec.pt[1] + hostPt[1]]
    }));
    const radius = d3.max(translatedTiles, rec => d3.max(rec.polygon, ([x, y]) => Math.hypot(x - hostPt[0], y - hostPt[1]))) || 0;
    return {tiles: translatedTiles, radius};
  }

  function groupRadius(host, c = N_CHAPTERS) {
    return buildHostTiles(host, c, [0, 0]).radius;
  }

  return { buildHostTiles, groupRadius };
})();

// ===== CELLA: s4RadialLayout =====
// -- CELLA: s4RadialLayout --
// Layout radiale per bande equipopolate del rango di distanza, con azimut conservato.
// Il collare narrativo e' congelato sul corpus completo: i fittizi non ancora
// nati lasciano vuoto il proprio alloggiamento invece di ricollocare il gruppo.
const s4RadialLayout = (() => {
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
})();

// ===== CELLA: s4NarrativeCells =====
// -- CELLA: s4NarrativeCells --
// Tessere narrative a incastro: usa i poligoni del collare, senza Voronoi locale.
const s4NarrativeCells = (() => {
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
})();

// ===== CELLA: s4RayCellDistance =====
// -- CELLA: s4RayCellDistance --
// Intersezione raggio-cella: la cella Voronoi è convessa e contiene il
// generatore: un raggio da G in una direzione data la attraversa il bordo esattamente
// una volta. Scorro i lati del poligono GREZZO (pochi vertici) e risolvo il sistema
// lineare raggio<->segmento; restituisco la distanza minima positiva trovata (= dove
// il trattino deve fermarsi per restare dentro).
const s4RayCellDistance = function rayCellDistance(gx, gy, dx, dy, cell){
  let best = Infinity;
  for (let k=0;k<cell.length-1;k++){
    const ax=cell[k][0], ay=cell[k][1], bx=cell[k+1][0], by=cell[k+1][1];
    const ex = bx-ax, ey = by-ay;
    const det = ex*dy - ey*dx;
    if (Math.abs(det) < 1e-9) continue;
    const t = (ex*(ay-gy) - ey*(ax-gx)) / det;
    const u = (dx*(ay-gy) - dy*(ax-gx)) / det;
    if (t > 1e-9 && u >= -1e-6 && u <= 1+1e-6 && t < best) best = t;
  }
  return best === Infinity ? 0 : best;
};

// ===== CELLA: s4IsoEngine =====
// -- CELLA: s4IsoEngine --
// Motore isolinee senza stato di frame: profili, armoniche e buffer sono cache
// geometriche invarianti. traceIsoline riceve posizione, scala e livello dal
// chiamante, cosi' chartS4 conserva tutto lo stato mutabile della lettura.
const s4IsoEngine = (() => {
  const {
    ISO_ANGLES, ISO_OUTER, ISO_INNER, ISO_SUMMIT_BIAS, ISO_DRIFT,
    ISO_WOBBLE, ISO_MARGIN, ISO_ECC_DAMP
  } = s4Config;
  const { cellRings: baseCellRings } = s4Voronoi;
  const { narrativeCellRings } = s4NarrativeCells;
  const rayCellDistance = s4RayCellDistance;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);

  // Profilo radiale grezzo di ogni cella: distanza generatore->bordo su
  // ISO_ANGLES direzioni. Dipende solo dalla geometria Voronoi/narrativa.
  const isoProfile = cellRings.map((cr, i) => {
    if (!cr) return null;
    const prof = new Float64Array(ISO_ANGLES);
    for (let k = 0; k < ISO_ANGLES; k++) {
      const ang = (k / ISO_ANGLES) * 6.2831853;
      prof[k] = rayCellDistance(cr.gx, cr.gy, Math.cos(ang), Math.sin(ang), cr.cell);
    }
    return prof;
  });
  const isoProfileMin = isoProfile.map(p => p ? Math.min(...p) : 0);
  const isoProfileMed = isoProfile.map(p => p ? d3.median(p) : 0);

  const isoBufX = new Float64Array(ISO_ANGLES);
  const isoBufY = new Float64Array(ISO_ANGLES);
  const isoCosA = new Float64Array(ISO_ANGLES), isoSinA = new Float64Array(ISO_ANGLES);
  const isoS2 = new Float64Array(ISO_ANGLES), isoC2 = new Float64Array(ISO_ANGLES);
  const isoS3 = new Float64Array(ISO_ANGLES), isoC3 = new Float64Array(ISO_ANGLES);
  const isoS5 = new Float64Array(ISO_ANGLES), isoC5 = new Float64Array(ISO_ANGLES);
  for (let k = 0; k < ISO_ANGLES; k++) {
    const a = (k / ISO_ANGLES) * 6.2831853;
    isoCosA[k] = Math.cos(a);   isoSinA[k] = Math.sin(a);
    isoS2[k] = Math.sin(a*2);   isoC2[k] = Math.cos(a*2);
    isoS3[k] = Math.sin(a*3);   isoC3[k] = Math.cos(a*3);
    isoS5[k] = Math.sin(a*5);   isoC5[k] = Math.cos(a*5);
  }

  function traceIsoline(path, fillPath, cx, cy, radii, rConst, sCell, rMin, rMed, seed, level, packing, outPts, align = 0) {
    const N = radii ? radii.length : ISO_ANGLES;
    const aAlign = Math.max(0, Math.min(1, align || 0));
    const inner = ISO_OUTER - (ISO_OUTER - ISO_INNER) * packing;
    const t = inner + (ISO_OUTER - inner) * level;
    const sx = Math.cos(seed * 6.2831853) * ISO_SUMMIT_BIAS * rMin * (1 - level) * (1 - aAlign);
    const sy = Math.sin(seed * 6.2831853 * 1.31) * ISO_SUMMIT_BIAS * rMin * (1 - level) * (1 - aAlign);
    const hyp = Math.hypot(sx, sy);
    const p = seed * 6.2831853, d = level * ISO_DRIFT * 6.2831853 * (1 - aAlign);
    const f1 = p + d, f2 = p*1.7 - d*0.6, f3 = p*2.3 + d*1.4;
    const sf1 = Math.sin(f1), cf1 = Math.cos(f1);
    const sf2 = Math.sin(f2), cf2 = Math.cos(f2);
    const sf3 = Math.sin(f3), cf3 = Math.cos(f3);
    const wobbleNow = ISO_WOBBLE * (0.45 + 0.55 * level);
    const wobbleAmp = wobbleNow + (ISO_WOBBLE - wobbleNow) * aAlign;

    for (let k = 0; k < N; k++) {
      const rBound = radii ? radii[k] * sCell : rConst;
      if (rBound <= 0) return false;
      const rShape = rMed + (rBound - rMed) * ISO_ECC_DAMP;
      const noise = (isoS2[k]*cf1 + isoC2[k]*sf1) * 0.5
                  + (isoS3[k]*cf2 + isoC3[k]*sf2) * 0.32
                  + (isoS5[k]*cf3 + isoC5[k]*sf3) * 0.18;
      let r = rShape * t * (1 + noise * wobbleAmp);
      const budget = rBound * ISO_MARGIN - hyp;
      if (budget <= 0) return false;
      if (r > budget) r = budget;
      isoBufX[k] = cx + isoCosA[k] * r + sx;
      isoBufY[k] = cy + isoSinA[k] * r + sy;
    }
    if (outPts) {
      outPts.length = 0;
      for (let k = 0; k < N; k++) outPts.push([isoBufX[k], isoBufY[k]]);
    }

    const fx = isoBufX[0], fy = isoBufY[0];
    const lx = isoBufX[N-1], ly = isoBufY[N-1];
    function addCurve(targetPath) {
      if (!targetPath) return;
      targetPath.moveTo((lx + fx) / 2, (ly + fy) / 2);
      for (let k = 0; k < N; k++) {
        const nk = (k + 1) % N;
        targetPath.quadraticCurveTo(isoBufX[k], isoBufY[k], (isoBufX[k] + isoBufX[nk]) / 2, (isoBufY[k] + isoBufY[nk]) / 2);
      }
      targetPath.closePath();
    }
    addCurve(path);
    addCurve(fillPath);
    return true;
  }

  return { isoProfile, isoProfileMin, isoProfileMed, traceIsoline };
})();

// ===== CELLA: s4Painters =====
// -- CELLA: s4Painters --
// Fabbrica di primitive pittoriche senza stato di frame: il context e le costanti
// sono dipendenze statiche, mentre scala, rotazione, quote e buffer correnti
// arrivano sempre dal parametro frame costruito in draw().
const s4Painters = (() => {
  const {
    BG_COLOR, HUE_RGB, FICT_HUE_RGB, ISO_ALPHA, ISO_WIDTH, ISO_FILL,
    FICT_GLYPH_WIDTH, FICT_RELIEF_ALPHA, FICT_GLYPH_PATHS, FICT_GLYPH_BOX,
    FICT_GLYPH_GAIN, INK_COLOR, ISO_ANGLES, ISO_WOBBLE, ISO_DRIFT,
    ISO_ECC_DAMP, ISO_OUTER, ISO_INNER, ISO_MARGIN, AXON_STACK_ALIGN, TER_SLOPE,
    TER_BANDS_SPAN, AXON_OPAQUE, AXON_SOLID_CAPS, AXON_TREAD_TINT, AXON_WALL_SHADE, AXON_WALL_MIN_LUM,
    AXON_EDGE_TOP, AXON_EDGE_BOT, AXON_EDGE_PICK, CONSTELLATION_RADIUS_GAIN,
    HALO_ALPHA_PEAK, HALO_FALLOFF_GAMMA, HALO_FALLOFF_STOPS, HALO_POOL_OFFSET,
    AXON_MAP_FOOTPRINT_MAX, ROLE_MIX_BASE, ROLE_MIX_TOP
  } = s4Config;
  const { N_GEO, N_INMAP } = s4Entities;
  const { BANDS_MAX } = s4Chapters;
  const { cognitiveTileRadius } = s4Voronoi;
  function hexToRgb(hex) {
    const h = String(hex || "#000000").replace("#", "");
    const v = h.length === 3
      ? h.split("").map(c => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
    return [0, 2, 4].map(o => parseInt(v.slice(o, o + 2), 16) || 0);
  }
  const TER_STEP_FRAC = (ISO_OUTER - ISO_INNER) / TER_BANDS_SPAN;
  // La quota assonometrica deriva da una pendenza globale uniforme.
  const AXON_Z_STEP = TER_SLOPE * TER_STEP_FRAC * d3.median(cognitiveTileRadius.slice(0, N_INMAP));
  const BG_RGB = hexToRgb(BG_COLOR);
  const INK_RGB = hexToRgb(INK_COLOR);

  function makePainters(context) {
    const fictGlyphPath2D = Object.fromEntries(
      Object.entries(FICT_GLYPH_PATHS).map(([k, d]) => [k, new Path2D(d)])
    );

    function zPoint(frame, x, y, z) {
      const dz = (z || 0) / Math.max(0.001, frame.tiltNow);
      return [x - dz * frame.rotSinNow, y - dz * frame.rotCosNow];
    }

    function rgbString(rgb) {
      return `${rgb[0]},${rgb[1]},${rgb[2]}`;
    }

    function shadeRgb(rgb, amount) {
      const f = Math.max(0, Math.min(1, 1 - amount));
      return rgb.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    }

    function treadRgb(k) {
      return shadeRgb(BG_RGB, AXON_TREAD_TINT * Math.max(0, TER_BANDS_SPAN - k));
    }

    // Il colore codifica il ruolo e la luminosita' la quota.
    const ROLE_RGB = s4Config.ROLE_ORDER.map(r => hexToRgb(s4Config.ROLE_COLORS[r]));
    const ROLE_PLURAL_RGB = hexToRgb(s4Config.ROLE_PLURAL_COLOR);
    function mixRgb(a, b, t) {
      return a.map((v, j) => Math.round(v + (b[j] - v) * t));
    }

    function relLum(rgb) {
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function shadeWall(rgb) {
      const shaded = shadeRgb(rgb, AXON_WALL_SHADE);
      const minLum = AXON_WALL_MIN_LUM * relLum(BG_RGB);
      const lum = relLum(shaded);
      if (lum >= minLum) return shaded;
      const bgLum = relLum(BG_RGB);
      const t = (minLum - lum) / Math.max(0.001, bgLum - lum);
      return mixRgb(shaded, BG_RGB, Math.max(0, Math.min(1, t)));
    }

    function wallRgb(k) {
      return shadeWall(treadRgb(k));
    }
    // La luminosita' e' normalizzata sulla quota assoluta, non sulla singola tessera.
    function roleTreadRgb(idx, k) {
      if (!(idx >= 0) || idx >= ROLE_RGB.length) return treadRgb(k);
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      const mix = ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t;
      return mixRgb(BG_RGB, ROLE_RGB[idx], mix);
    }

    function rolePluralTreadRgb(k) {
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      const mix = ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t;
      return mixRgb(BG_RGB, ROLE_PLURAL_RGB, mix);
    }

    function wallFromTreadRgb(rgb) {
      return shadeWall(rgb);
    }

    function drawGroundHalo(frame, cx, cy, radius, color, strength) {
      if (!(strength > 0.01) || !(radius > 0)) return;
      const rgb = hexToRgb(color || INK_COLOR);
      const ink = rgbString(rgb);
      const r = radius * CONSTELLATION_RADIUS_GAIN;
      // B -- l'estrusione va verso (-rotSin, -rotCos): la pozza scivola
      // sull'opposto, dove nessuna parete la copre. Resta nel piano di terra
      // (nessuna divisione per tiltNow): e' un oggetto steso sul suolo, non
      // una quota. A tilt=0 l'offset si annulla e la pozza torna concentrica.
      const off = radius * HALO_POOL_OFFSET * frame.tiltEased;
      const px = cx + off * frame.rotSinNow;
      const py = cy + off * frame.rotCosNow;
      // A -- plateau fino al bordo VICINO del tassello, poi decadimento gamma.
      const tEdge = Math.max(0.05, Math.min(0.88, (radius - off) / r));
      const a0 = HALO_ALPHA_PEAK * strength;
      const g = context.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${ink},${a0})`);
      g.addColorStop(tEdge, `rgba(${ink},${a0})`);
      for (let s = 1; s <= HALO_FALLOFF_STOPS; s++) {
        const u = s / HALO_FALLOFF_STOPS;
        const a = a0 * Math.pow(1 - u, HALO_FALLOFF_GAMMA);
        g.addColorStop(tEdge + (1 - tEdge) * u, `rgba(${ink},${a})`);
      }
      context.save();
      context.beginPath();
      context.ellipse(px, py, r, r, 0, 0, Math.PI * 2);
      context.fillStyle = g;
      context.fill();
      context.restore();
    }

    function axonZOf(k) {
      return k * AXON_Z_STEP;
    }

    function axonLevelForBand(k, packing) {
      const inner = ISO_OUTER - (ISO_OUTER - ISO_INNER) * packing;
      const target = Math.max(ISO_INNER, ISO_OUTER - (k - 1) * TER_STEP_FRAC);
      const denom = ISO_OUTER - inner;
      if (denom <= 1e-9) return 1;
      return Math.max(0, Math.min(1, (target - inner) / denom));
    }

    function planarLevelForBand(k, B) {
      return B > 0 ? (B - k + 1) / B : 1;
    }

    function mapFootprintRadius(frame, rawR) {
      if (AXON_MAP_FOOTPRINT_MAX == null) return rawR;
      const cap = AXON_MAP_FOOTPRINT_MAX * frame.invK;
      if (!(rawR > cap)) return rawR;
      return cap + (rawR - cap) * frame.crimpEased;
    }

    function axonFootprint(frame, radii, rConst, sCell) {
      if (!radii) {
        const r = mapFootprintRadius(frame, rConst);
        return {radii: null, rMin: r, rMed: r, sCell: 1};
      }
      const out = new Float64Array(radii.length);
      for (let k = 0; k < radii.length; k++) out[k] = mapFootprintRadius(frame, radii[k] * sCell);
      return {radii: out, rMin: Math.min(...out), rMed: d3.median(out), sCell: 1};
    }

    function drawFictGlyph(frame, cx, cy, r, status) {
      const key = FICT_GLYPH_PATHS[status] ? status : "invented";
      const box = FICT_GLYPH_BOX[key];
      const gain = FICT_GLYPH_GAIN[key] ?? 1;
      const s = (r * gain) / box.half;
      context.save();
      context.translate(cx, cy);
      context.scale(s, s);
      context.translate(-box.cx, -box.cy);
      context.setLineDash([]);
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = (FICT_GLYPH_WIDTH * frame.invK) / s;
      context.strokeStyle = INK_COLOR;
      context.stroke(fictGlyphPath2D[key]);
      context.restore();
    }

    function baseContourPts(frame, px, py, r, radii, sCell, rMed, seed, align = 0) {
      const t0 = frame.profile ? performance.now() : 0;
      const aAlign = Math.max(0, Math.min(1, align || 0));
      const p = seed * 6.2831853;
      const d = ISO_DRIFT * 6.2831853 * (1 - aAlign);
      const f1 = p + d, f2 = p*1.7 - d*0.6, f3 = p*2.3 + d*1.4;
      const sf1 = Math.sin(f1), cf1 = Math.cos(f1);
      const sf2 = Math.sin(f2), cf2 = Math.cos(f2);
      const sf3 = Math.sin(f3), cf3 = Math.cos(f3);
      const wobbleAmp = ISO_WOBBLE;
      const pts = Array.from({length: ISO_ANGLES}, (_, k) => {
        const a = (k / ISO_ANGLES) * 6.2831853;
        const ca = Math.cos(a), sa = Math.sin(a);
        const rBound = radii ? radii[k] * sCell : r;
        const rShape = rMed + (rBound - rMed) * ISO_ECC_DAMP;
        const noise = (Math.sin(a*2)*cf1 + Math.cos(a*2)*sf1) * 0.5
                    + (Math.sin(a*3)*cf2 + Math.cos(a*3)*sf2) * 0.32
                    + (Math.sin(a*5)*cf3 + Math.cos(a*5)*sf3) * 0.18;
        let rr = rShape * (1 + noise * wobbleAmp);
        const budget = rBound * ISO_MARGIN;
        if (rr > budget) rr = budget;
        return [px + ca * rr, py + sa * rr];
      });
      if (frame.profile) frame.profile.baseContourMs += performance.now() - t0;
      return pts;
    }

    function fillQuadStrip(frame, a, za, b, zb, rgb, alpha, cullBackfaces = false) {
      const n = Math.min(a.length, b.length);
      if (n < 2 || alpha <= 0) return;
      const buildT0 = frame.profile ? performance.now() : 0;
      const stripPath = new Path2D();
      const area = cullBackfaces ? d3.polygonArea(a) : 0;
      let drawn = 0;
      context.fillStyle = `rgba(${rgb},${alpha})`;
      for (let j = 0; j < n; j++) {
        const j2 = (j + 1) % n;
        if (cullBackfaces) {
          const dx = a[j2][0] - a[j][0], dy = a[j2][1] - a[j][1];
          const nx = area >= 0 ? dy : -dy;
          const ny = area >= 0 ? -dx : dx;
          const screenNy = frame.tiltNow * (nx * frame.rotSinNow + ny * frame.rotCosNow);
          if (screenNy <= 0) continue;
        }
        const aj = zPoint(frame, a[j][0], a[j][1], za);
        const aj2 = zPoint(frame, a[j2][0], a[j2][1], za);
        const bj2 = zPoint(frame, b[j2][0], b[j2][1], zb);
        const bj = zPoint(frame, b[j][0], b[j][1], zb);
        stripPath.moveTo(aj[0], aj[1]);
        stripPath.lineTo(aj2[0], aj2[1]);
        stripPath.lineTo(bj2[0], bj2[1]);
        stripPath.lineTo(bj[0], bj[1]);
        stripPath.closePath();
        drawn++;
      }
      if (!drawn) return;
      if (frame.profile) {
        frame.profile.quadCount += drawn;
        frame.profile.fillLenASum += a.length;
        frame.profile.fillLenBSum += b.length;
        frame.profile.fillLenCalls++;
      }
      const fillT0 = frame.profile ? performance.now() : 0;
      if (frame.profile) frame.profile.fillBuildMs += fillT0 - buildT0;
      context.fill(stripPath);
      if (frame.profile) {
        frame.profile.fillRasterMs += performance.now() - fillT0;
        frame.profile.fillCalls++;
      }
    }

    function addClosedPolygon(path, pts, z, reverse, frame) {
      const n = pts.length;
      if (n < 2) return false;
      const first = reverse ? pts[n - 1] : pts[0];
      const p0 = zPoint(frame, first[0], first[1], z);
      path.moveTo(p0[0], p0[1]);
      for (let j = 1; j < n; j++) {
        const src = reverse ? pts[n - 1 - j] : pts[j];
        const p = zPoint(frame, src[0], src[1], z);
        path.lineTo(p[0], p[1]);
      }
      path.closePath();
      return true;
    }

    function annulusLooksNested(outer, inner) {
      if (!outer || !inner || outer.length < 3 || inner.length < 3) return false;
      for (const p of inner) {
        if (!d3.polygonContains(outer, p)) return false;
      }
      return true;
    }

    function fillNestedBand(frame, outer, inner, z, rgb, alpha) {
      if (!outer || !inner || outer.length < 2 || inner.length < 2 || alpha <= 0) return;
      if (!annulusLooksNested(outer, inner)) {
        if (frame.profile) frame.profile.nestedFallbacks++;
        fillQuadStrip(frame, outer, z, inner, z, rgb, alpha);
        return;
      }
      if (frame.profile) {
        frame.profile.nestedBandCount++;
        frame.profile.fillLenASum += outer.length;
        frame.profile.fillLenBSum += inner.length;
        frame.profile.fillLenCalls++;
      }
      const buildT0 = frame.profile ? performance.now() : 0;
      const bandPath = new Path2D();
      addClosedPolygon(bandPath, outer, z, false, frame);
      addClosedPolygon(bandPath, inner, z, true, frame);
      const fillT0 = frame.profile ? performance.now() : 0;
      if (frame.profile) frame.profile.fillBuildMs += fillT0 - buildT0;
      context.fillStyle = `rgba(${rgb},${alpha})`;
      context.fill(bandPath, "evenodd");
      if (frame.profile) {
        frame.profile.fillRasterMs += performance.now() - fillT0;
        frame.profile.fillCalls++;
      }
    }

    function fillClosedContour(frame, pts, z, rgb, alpha) {
      if (!pts || pts.length < 3 || alpha <= 0) return;
      if (frame.profile) {
        frame.profile.nestedBandCount++;
        frame.profile.fillLenASum += pts.length;
        frame.profile.fillLenBSum += 0;
        frame.profile.fillLenCalls++;
      }
      const buildT0 = frame.profile ? performance.now() : 0;
      const capPath = new Path2D();
      addClosedPolygon(capPath, pts, z, false, frame);
      const fillT0 = frame.profile ? performance.now() : 0;
      if (frame.profile) frame.profile.fillBuildMs += fillT0 - buildT0;
      context.fillStyle = `rgba(${rgb},${alpha})`;
      context.fill(capPath);
      if (frame.profile) {
        frame.profile.fillRasterMs += performance.now() - fillT0;
        frame.profile.fillCalls++;
      }
    }

    function strokePts(frame, strokeGroups, pts, z, rgb, alpha, width = ISO_WIDTH * frame.invK) {
      if (!pts || pts.length < 2) return;
      const t0 = frame.profile ? performance.now() : 0;
      const key = `${rgb}|${alpha}|${width}`;
      let group = strokeGroups.get(key);
      if (!group) {
        group = {rgb, alpha, width, path: new Path2D()};
        strokeGroups.set(key, group);
      }
      const p0 = zPoint(frame, pts[0][0], pts[0][1], z);
      group.path.moveTo(p0[0], p0[1]);
      for (let j = 1; j < pts.length; j++) {
        const p = zPoint(frame, pts[j][0], pts[j][1], z);
        group.path.lineTo(p[0], p[1]);
      }
      group.path.closePath();
      if (frame.profile) frame.profile.strokePtsMs += performance.now() - t0;
    }

    function flushStrokeGroups(frame, strokeGroups) {
      for (const group of strokeGroups.values()) {
        context.lineWidth = group.width;
        context.strokeStyle = `rgba(${group.rgb},${group.alpha})`;
        context.stroke(group.path);
        if (frame.profile) frame.profile.strokeCalls++;
      }
    }

    function drawAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint = null, roleMarks = null) {
      const focalAlpha = frame.contentAlpha ? frame.contentAlpha(i) : (frame.focalEased ? frame.focalEased[i] : 1);
      // In modalita' ruolo il contorno resta neutro: il colore e' gia' sulla terrazza.
      const strokeRgb = (frame.roleMode || !isFict) ? rgbString(INK_RGB) : FICT_HUE_RGB;
      const strokeAlpha = focalAlpha;
      const stackAlign = AXON_STACK_ALIGN * frame.tiltEased;
      const zScale = frame.zScaleDraw;
      const fillAlphaNow = (axonAlpha, planarAlpha) =>
        frame.tiltEased >= 0.999 ? axonAlpha : planarAlpha + (axonAlpha - planarAlpha) * frame.tiltEased;
      const strokeGroups = new Map();
      const footprint = axonFootprint(frame, radii, rMin, sCell);
      const axRadii = footprint.radii, axRMin = footprint.rMin, axRMed = footprint.rMed, axSCell = footprint.sCell;
      const curves = [baseContourPts(frame, px, py, axRMin, axRadii, axSCell, axRMed, seed, stackAlign)];
      for (let k = 1; k <= B; k++) {
        const outPts = [];
        const axonLevel = axonLevelForBand(k, packing);
        const level2D = planarLevelForBand(k, B);
        const level = frame.tiltEased >= 0.999 ? axonLevel : level2D + (axonLevel - level2D) * frame.tiltEased;
        const traceT0 = frame.profile ? performance.now() : 0;
        if (traceIsoline(null, null, px, py, axRadii, axRMin, axSCell, axRMin, axRMed, seed, level, packing, outPts, stackAlign)) {
          curves.push(outPts);
        }
        if (frame.profile) frame.profile.traceMs += performance.now() - traceT0;
      }
      if (frame.stashCurves) frame.stashCurves(i, curves);
      const edgeTopWidth = (bandTint ? AXON_EDGE_TOP : ISO_WIDTH * 0.9) * frame.invK;
      const edgeBotWidth = (bandTint ? AXON_EDGE_BOT : ISO_WIDTH * 0.65) * frame.invK;
      const baseWidth = ISO_WIDTH * 0.9 * frame.invK;
      if (B <= 0) {
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        flushStrokeGroups(frame, strokeGroups);
        return;
      }
      // A basso dettaglio la stratigrafia collassa in una silhouette del ruolo dominante.
      if (frame.lodCollapse && B > 0) {
        const zTop = axonZOf(B) * zScale;
        const tint = bandTint ? bandTint(1, B) : null;
        const tread = tint ? tint[0] : treadRgb(0);
        const wall = tint ? tint[1] : wallRgb(0);
        const collapsedAlpha = fillAlphaNow(focalAlpha, isoFillAlpha(B) * focalAlpha);
        fillQuadStrip(frame, curves[0], 0, curves[0], zTop, rgbString(wall), collapsedAlpha, true);
        fillClosedContour(frame, curves[0], zTop, rgbString(tread), collapsedAlpha);
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        strokePts(frame, strokeGroups, curves[0], zTop, strokeRgb, strokeAlpha, edgeTopWidth);
        flushStrokeGroups(frame, strokeGroups);
        return;
      }
      const solidCaps = AXON_SOLID_CAPS && AXON_OPAQUE && focalAlpha > 0.98;
      if (ISO_FILL && curves.length > 1) {
        const baseRgb = rgbString(shadeRgb(BG_RGB, 0.10));
        const baseAlpha = fillAlphaNow(AXON_OPAQUE ? focalAlpha : isoFillAlpha(1) * focalAlpha, isoFillAlpha(B) * focalAlpha);
        if (solidCaps) fillClosedContour(frame, curves[0], 0, baseRgb, baseAlpha);
        else fillNestedBand(frame, curves[0], curves[1], 0, baseRgb, baseAlpha);
      }
      strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, 0.55 * strokeAlpha, baseWidth);
      for (let k = 1; k < curves.length; k++) {
        const z0 = axonZOf(k - 1) * zScale, z1 = axonZOf(k) * zScale;
        const tint = bandTint ? bandTint(k, B) : null;
        // La terrazza interrogata varia per luminosita' e spessore, non per colore.
        const isPicked = roleMarks && roleMarks.terrace === k;
        let tread = tint ? tint[0] : treadRgb(k);
        let wall = tint ? tint[1] : wallRgb(k);
        if (roleMarks?.isolate) {
          if (!isPicked) {
            tread = mixRgb(tread, BG_RGB, 0.45);
            wall = wallFromTreadRgb(tread);
          }
        } else if (isPicked) {
          tread = mixRgb(tread, BG_RGB, 0.34);
          wall = wallFromTreadRgb(tread);
        }
        const terraceStrokeRgb = strokeRgb;
        const planarAlpha = isoFillAlpha(B - k + 1) * focalAlpha;
        fillQuadStrip(frame, k === 1 ? curves[0] : curves[k], z0, curves[k], z1, rgbString(wall), fillAlphaNow(focalAlpha, planarAlpha), true);
        if (ISO_FILL) {
          const fillAlpha = fillAlphaNow(AXON_OPAQUE ? focalAlpha : isoFillAlpha(k + 1) * focalAlpha, planarAlpha);
          if (solidCaps) {
            fillClosedContour(frame, curves[k], z1, rgbString(tread), fillAlpha);
          } else if (k < curves.length - 1) {
            fillNestedBand(frame, curves[k], curves[k + 1], z1, rgbString(tread), fillAlpha);
          } else {
            fillClosedContour(frame, curves[k], z1, rgbString(tread), fillAlphaNow(AXON_OPAQUE ? focalAlpha : isoFillAlpha(k) * focalAlpha, planarAlpha));
          }
        }
        const wBot = isPicked ? AXON_EDGE_PICK * frame.invK : edgeBotWidth;
        const wTop = isPicked ? AXON_EDGE_PICK * frame.invK : edgeTopWidth;
        const cBot = isPicked ? rgbString(INK_RGB) : terraceStrokeRgb;
        strokePts(frame, strokeGroups, k === 1 ? curves[0] : curves[k], z0, cBot, strokeAlpha, wBot);
        strokePts(frame, strokeGroups, curves[k], z1, cBot, strokeAlpha, wTop);
      }
      flushStrokeGroups(frame, strokeGroups);
      if (roleMarks && roleMarks.isRouteHot && curves.length) {
        const ring = new Path2D();
        addClosedPolygon(ring, curves[0], 0, false, frame);
        context.save();
        context.lineJoin = "round";
        context.globalAlpha = 0.95 * focalAlpha;
        context.lineWidth = 3.2 * frame.invK;
        context.strokeStyle = roleMarks.routeRgb;
        context.shadowColor = roleMarks.routeRgb;
        context.shadowBlur = 16;
        context.stroke(ring);
        const top = new Path2D();
        addClosedPolygon(top, curves[curves.length - 1], axonZOf(curves.length - 1) * zScale, false, frame);
        context.stroke(top);
        context.restore();
      }
    }

    return {
      drawFictGlyph, drawGroundHalo, drawAxonReliefTile, zPoint,
      mixRgb, roleTreadRgb, rolePluralTreadRgb, wallFromTreadRgb,
      axonZOf
    };
  }

  // Le costanti di quota sono condivise con il calcolo del livello di dettaglio.
  return { makePainters, AXON_Z_STEP, TER_STEP_FRAC };
})();

// ===== CELLA: s4Interaction =====
// -- CELLA: s4Interaction --
// Interazioni e conversioni geometriche parametrizzate: transform, centro, tilt,
// rotazione e buffer di frame restano in chartS4 e vengono passati a ogni chiamata.
const s4Interaction = (() => {
  const { BIRTH_EPSILON, STRENGTH } = s4Config;
  const { allData, N_INMAP, N_GEO } = s4Entities;
  const { pts, bbox, width, height, geographicAngle } = s4Projection;
  const { delaunay, cellRings: baseCellRings, cognitiveTileRadius: baseCognitiveTileRadius } = s4Voronoi;
  const { narrativeCellRings, narrativeTileRadius } = s4NarrativeCells;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);
  const cognitiveTileRadius = baseCognitiveTileRadius.map((r, i) => narrativeCellRings[i] ? narrativeTileRadius[i] : r);
  const cellRingBBoxes = cellRings.map(cr => {
    if (!cr || !cr.ring || cr.ring.length < 3) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of cr.ring) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return [x0, y0, x1, y1];
  });
  const hitPolyBuf = [];

  function findDisplayHost(frame, x, y) {
    const cognitiveMode = frame.crimpEased > 0.01;
    if (!cognitiveMode) {
      if (x < bbox[0] || x > bbox[2] || y < bbox[1] || y > bbox[3]) return -1;
      return delaunay.find(x, y);
    }
    for (let i=0;i<cellRings.length;i++){
      if (i >= N_GEO) continue;
      const cr = cellRings[i];
      if (!cr || !cr.ring || cr.ring.length < 3) continue;
      if (frame.birthEased[i] <= BIRTH_EPSILON) continue;
      const cognitiveBirthScale = 0.35 + 0.65 * frame.birthEased[i];
      const birthScale = 1 + (cognitiveBirthScale - 1) * frame.crimpEased;
      const s = frame.displayCellScale[i] * birthScale;
      const bb = cellRingBBoxes[i];
      const tx0 = frame.displayPts[i][0] + (bb[0] - cr.gx) * s;
      const ty0 = frame.displayPts[i][1] + (bb[1] - cr.gy) * s;
      const tx1 = frame.displayPts[i][0] + (bb[2] - cr.gx) * s;
      const ty1 = frame.displayPts[i][1] + (bb[3] - cr.gy) * s;
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      hitPolyBuf.length = 0;
      for (const [px, py] of cr.ring) {
        hitPolyBuf.push([
          frame.displayPts[i][0] + (px - cr.gx) * s,
          frame.displayPts[i][1] + (py - cr.gy) * s
        ]);
      }
      if (d3.polygonContains(hitPolyBuf, [x, y])) return i;
    }
    for (let i = N_INMAP; i < N_GEO; i++) {
      if (frame.birthEased[i] <= BIRTH_EPSILON) continue;
      const r = cognitiveTileRadius[i] * frame.displayCellScale[i];
      const [cx, cy] = frame.displayPts[i];
      if (Math.hypot(x - cx, y - cy) <= r) return i;
    }
    return -1;
  }

  function findFictHost(frame, x, y) {
    for (let i = N_GEO; i < allData.length; i++) {
      if (frame.fictBirthEased[i] <= BIRTH_EPSILON) continue;
      const cr = cellRings[i];
      if (!cr || !cr.ring || cr.ring.length < 3) continue;
      const s = frame.displayCellScale[i];
      const bb = cellRingBBoxes[i];
      const tx0 = frame.displayPts[i][0] + (bb[0] - cr.gx) * s;
      const ty0 = frame.displayPts[i][1] + (bb[1] - cr.gy) * s;
      const tx1 = frame.displayPts[i][0] + (bb[2] - cr.gx) * s;
      const ty1 = frame.displayPts[i][1] + (bb[3] - cr.gy) * s;
      if (x < tx0 || x > tx1 || y < ty0 || y > ty1) continue;
      hitPolyBuf.length = 0;
      for (const [px, py] of cr.ring) {
        hitPolyBuf.push([
          frame.displayPts[i][0] + (px - cr.gx) * s,
          frame.displayPts[i][1] + (py - cr.gy) * s
        ]);
      }
      if (d3.polygonContains(hitPolyBuf, [x, y])) return i;
    }
    return -1;
  }

  // L'hit test riporta il cursore a terra per ogni quota e sceglie il rilievo piu' vicino.
  function findAxonHost(frame, x, y, bandsOf, opts = {}) {
    const focalActive = !!opts.focalActive;
    let best = -1, bestDepth = -Infinity;
    for (let i = 0; i < cellRings.length; i++) {
      const cr = cellRings[i];
      const born = i >= N_GEO ? frame.fictBirthEased[i] : frame.birthEased[i];
      const hasCell = !!(cr && cr.ring && cr.ring.length >= 3);
      const drawnRegardless = hasCell && i < N_INMAP && frame.crimpEased <= 0.01;
      if (!drawnRegardless && born <= BIRTH_EPSILON) continue;
      if (!cr || !cr.ring || cr.ring.length < 3) {
        if (!(i >= N_INMAP && i < N_GEO)) continue;
        const B = bandsOf(i);
        // Il silenzio di una tessera e' una condizione del FILTRO per personaggio,
        // non della proiezione assonometrica: senza filtro resta interrogabile la base.
        if (focalActive && B < 1) continue;
        const kMax = Math.max(0, B);
        const [dx0, dy0] = frame.displayPts[i];
        const r = cognitiveTileRadius[i] * frame.displayCellScale[i];
        let hit = false;
        for (let k = 0; k <= kMax && !hit; k++) {
          const dz = k * frame.zStep;
          const qx = x + dz * frame.rotSinNow;
          const qy = y + dz * frame.rotCosNow;
          if (Math.hypot(qx - dx0, qy - dy0) <= r) hit = true;
        }
        if (!hit) continue;
        const depth = dx0 * frame.rotSinNow + dy0 * frame.rotCosNow;
        if (depth > bestDepth) { bestDepth = depth; best = i; }
        continue;
      }
      const B = bandsOf(i);
      // Il silenzio di una tessera e' una condizione del FILTRO per personaggio,
      // non della proiezione assonometrica: senza filtro resta interrogabile la base.
      if (focalActive && B < 1) continue;
      const kMax = Math.max(0, B);
      const bb = cellRingBBoxes[i];
      const s = frame.displayCellScale[i];
      const [dx0, dy0] = frame.displayPts[i];
      let hit = false;
      for (let k = 0; k <= kMax && !hit; k++) {
        const dz = k * frame.zStep;
        const qx = x + dz * frame.rotSinNow;
        const qy = y + dz * frame.rotCosNow;
        const tx0 = dx0 + (bb[0] - cr.gx) * s, ty0 = dy0 + (bb[1] - cr.gy) * s;
        const tx1 = dx0 + (bb[2] - cr.gx) * s, ty1 = dy0 + (bb[3] - cr.gy) * s;
        if (qx < tx0 || qx > tx1 || qy < ty0 || qy > ty1) continue;
        hitPolyBuf.length = 0;
        for (const [px, py] of cr.ring) {
          hitPolyBuf.push([dx0 + (px - cr.gx) * s, dy0 + (py - cr.gy) * s]);
        }
        if (d3.polygonContains(hitPolyBuf, [qx, qy])) hit = true;
      }
      if (!hit) continue;
      const depth = dx0 * frame.rotSinNow + dy0 * frame.rotCosNow;
      if (depth > bestDepth) { bestDepth = depth; best = i; }
    }
    return best;
  }

  function unprojectPlanAffine(frame, x, y) {
    if (frame.tiltEased <= 0.01) return [x, y];
    const pivot = frame.rotPivot || frame.cogCenter;
    let dx = x - pivot[0], dy = y - pivot[1];
    dy /= Math.max(0.001, frame.tiltNow);
    const c = Math.cos(-frame.planRot), s = Math.sin(-frame.planRot);
    return [
      pivot[0] + dx * c - dy * s,
      pivot[1] + dx * s + dy * c
    ];
  }

  function toCanvas(frame, canvas, cx, cy) {
    const r = canvas.getBoundingClientRect();
    const px = (cx-r.left)*(width/r.width), py = (cy-r.top)*(height/r.height);
    return unprojectPlanAffine(frame, (px-frame.transform.x)/frame.transform.k+bbox[0], (py-frame.transform.y)/frame.transform.k+bbox[1]);
  }

  function viewportCenterWorld(frame) {
    return [
      (width  / 2 - frame.transform.x) / frame.transform.k + bbox[0],
      (height / 2 - frame.transform.y) / frame.transform.k + bbox[1]
    ];
  }

  function viewportCorners(frame) {
    return [
      [(0 - frame.transform.x) / frame.transform.k + bbox[0], (0 - frame.transform.y) / frame.transform.k + bbox[1]],
      [(width - frame.transform.x) / frame.transform.k + bbox[0], (0 - frame.transform.y) / frame.transform.k + bbox[1]],
      [(0 - frame.transform.x) / frame.transform.k + bbox[0], (height - frame.transform.y) / frame.transform.k + bbox[1]],
      [(width - frame.transform.x) / frame.transform.k + bbox[0], (height - frame.transform.y) / frame.transform.k + bbox[1]],
    ];
  }

  function nearestViewportCorner(frame, targetX, targetY) {
    const corners = viewportCorners(frame);
    let best = corners[0], bestD = Infinity;
    for (const c of corners) {
      const d = Math.hypot(c[0] - targetX, c[1] - targetY);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best.slice();
  }

  function spawnPointAlongAzimuth(frame, angle, marginFactor = 1.15) {
    const [cx, cy] = frame.cogCenter;
    const halfW = (width  / frame.transform.k) / 2;
    const halfH = (height / frame.transform.k) / 2;
    const dx = Math.sin(angle), dy = -Math.cos(angle);
    const tX = Math.abs(dx) < 1e-9 ? Infinity : halfW / Math.abs(dx);
    const tY = Math.abs(dy) < 1e-9 ? Infinity : halfH / Math.abs(dy);
    const t = Math.min(tX, tY) * marginFactor;
    return [cx + dx * t, cy + dy * t];
  }

  return {
    findDisplayHost,
    findFictHost,
    findAxonHost,
    unprojectPlanAffine,
    toCanvas,
    viewportCenterWorld,
      nearestViewportCorner,
    spawnPointAlongAzimuth
  };
})();

// ===== CELLA: s4AttestedRoutes =====
// -- CELLA: s4AttestedRoutes --
// Precalcolo delle route attestate, segmentate per focalizzatore.
const s4AttestedRoutes = (() => {
  const { allDataById } = s4Entities;
  const { sequence, chapterOfCursor } = s4Sequence;
  const sequenceByRefId = new Map(sequence.map(row => [String(row.referenceId || ""), row]));
  const routeRgb = s4Config.ROLE_COLORS.Route;
  const routeSource = gadda_real.paths?.routes || gadda_real.routes || [];
  const aliasTargetById = new Map((s4Config.ALIAS_GROUPS || []).flatMap(g => g.ids.map(id => [id, g.canonical])));

  function tileIndexOf(targetId) {
    return allDataById.get(targetId) ?? allDataById.get(aliasTargetById.get(targetId));
  }

  function routeOrder(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function globalStepTargetIds(route) {
    if (Array.isArray(route.steps) && route.steps.length) {
      return route.steps
        .slice()
        .sort((a, b) => d3.ascending(Number(a.order) || 0, Number(b.order) || 0))
        .map(step => Array.from(new Set(step.targetIds || [])));
    }
    const byOrder = d3.group(route.nodes || [], d => Number(d.order) || 0);
    return Array.from(byOrder.entries())
      .sort((a, b) => d3.ascending(a[0], b[0]))
      .map(([, nodes]) => Array.from(new Set(nodes.map(n => n.targetId).filter(Boolean))));
  }

  function focalizedSteps(route) {
    const byFocalizer = new Map();
    for (const node of route.nodes || []) {
      const focalizerId = node.focalizerId || (route.focalizerIds?.length === 1 ? route.focalizerIds[0] : null);
      const idx = tileIndexOf(node.targetId);
      if (!focalizerId || idx == null) continue;
      const order = routeOrder(node.order, 0);
      if (!byFocalizer.has(focalizerId)) byFocalizer.set(focalizerId, new Map());
      const byOrder = byFocalizer.get(focalizerId);
      if (!byOrder.has(order)) byOrder.set(order, new Set());
      byOrder.get(order).add(idx);
    }
    const stepsByFocalizer = new Map();
    const stepOrdersByFocalizer = new Map();
    for (const [focalizerId, byOrder] of byFocalizer) {
      const steps = [];
      const orders = [];
      for (const [order, indicesSet] of Array.from(byOrder.entries()).sort((a, b) => d3.ascending(a[0], b[0]))) {
        const indices = Array.from(indicesSet);
        if (!indices.length) continue;
        steps.push([indices[0]]);
        orders.push(order);
      }
      if (steps.length) {
        stepsByFocalizer.set(focalizerId, steps);
        stepOrdersByFocalizer.set(focalizerId, orders);
      }
    }
    return {stepsByFocalizer, stepOrdersByFocalizer};
  }

  const routeIdByReferenceId = new Map();
  const attestedRoutes = routeSource.map(route => {
    const steps = globalStepTargetIds(route)
      .map(ids => Array.from(new Set(ids.map(tileIndexOf).filter(i => i != null))))
      .filter(indices => indices.length);
    // Invariante E5: una route disegnata e' sempre la percorrenza di un solo
    // agente. L'unione di percorrenze non e' un percorso e non va mai resa come
    // polilinea, come le sequenze derivate da pagina non sono movimento.
    const {stepsByFocalizer, stepOrdersByFocalizer} = focalizedSteps(route);
    const routeRefs = new Set([
      ...(route.referenceIds || []),
      ...(route.nodes || []).map(node => node.referenceId).filter(Boolean)
    ].map(String));
    const birthRows = Array.from(routeRefs).map(ref => sequenceByRefId.get(ref)).filter(Boolean);
    const birthPosRoute = birthRows.length ? d3.min(birthRows, d => d.pos) : Infinity;
    const birthChapterRoute = Number.isFinite(birthPosRoute) ? chapterOfCursor(birthPosRoute) : Infinity;
    const id = route.id;
    for (const ref of routeRefs) {
      if (ref) routeIdByReferenceId.set(ref, id);
    }
    return {
      id,
      steps,
      stepsByFocalizer,
      stepOrdersByFocalizer,
      // Il focalizzatore puo' essere dichiarato sulla route o sui singoli nodi.
      focalizerIds: new Set([
        ...(route.focalizerIds || []),
        ...(route.nodes || []).map(n => n.focalizerId).filter(Boolean),
        ...stepsByFocalizer.keys()
      ]),
      birthPos: birthPosRoute,
      birthChapter: birthChapterRoute
    };
  }).filter(route => route.steps.length >= 2 && route.stepsByFocalizer.size);

  // La selezione di una route usa il referenceId univoco della terrazza.
  return { attestedRoutes, routeIdByReferenceId, routeRgb };
})();

// ===== CELLA: s4RouteNodes =====
// -- CELLA: s4RouteNodes --
// Una route compare soltanto quando viene selezionata dall'utente.
const s4RouteNodes = (() => {
  const { attestedRoutes, routeRgb } = s4AttestedRoutes;

  const routeById = new Map();

  for (const route of attestedRoutes) {
    routeById.set(route.id, route);
  }

  function routeActive(route, {focalizer, seqMode, seqPos, chapter}) {
    if (focalizer == null || !route.focalizerIds.has(focalizer)) return false;
    return seqMode ? route.birthPos <= seqPos : route.birthChapter <= chapter;
  }

  function frameState({selectedRouteId, focalizer, seqMode, seqPos, chapter}) {
    const hot = new Set();
    const routes = [];
    // La rivelazione dipende dalla selezione persistente, non dal LOD: zoom,
    // pan e rotazione sono punto di vista, non uscite dallo stato di lettura.
    if (selectedRouteId == null) return {hot, routes};
    const ctx = {focalizer, seqMode, seqPos, chapter};
    const route = routeById.get(selectedRouteId);
    if (!route || !routeActive(route, ctx)) return {hot, routes};
    const steps = route.stepsByFocalizer.get(focalizer) || [];
    const stepOrders = route.stepOrdersByFocalizer.get(focalizer) || [];
    if (!steps.length) return {hot, routes};
    for (const step of steps) for (const i of step) hot.add(i);
    routes.push({
      id: selectedRouteId,
      focalizerId: focalizer,
      steps,
      stepOrders
    });
    return {hot, routes};
  }

  return { frameState, routeRgb };
})();

// ===== CELLA: s4PageRibbon =====
// -- CELLA: s4PageRibbon --
// Registro per pagina delle occorrenze, con filtri, cardinalita' e cursore corrente.
const s4PageRibbon = (() => {
  const NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function update({
    pageRibbon, pageRibbonWrap, seqMode, rows, stateKey, chapter, focalizer, seqPos,
    width, inkColor, roleColors, gapMin, blockDelta, seqPage, effRoleName, setSeqPos,
    focalDimAlpha, allData, roleMaskKey
  }) {
    if (!pageRibbon) return {stateKey, currentRibbonTick: null};

    // Con un focalizzatore attivo, il resto del corpus rimane visibile ma attenuato.
    const visible = seqMode;
    pageRibbon.style.display = visible ? "block" : "none";
    if (pageRibbonWrap) pageRibbonWrap.style.display = visible ? "block" : "none";
    if (!visible) return {stateKey: "", currentRibbonTick: null};

    const filtered = focalizer != null;
    const countRows = filtered ? rows.filter(row => row.agentId === focalizer) : rows;
    const rowsByPage = d3.group(rows, d => seqPage(d));
    const countRowsByPage = d3.group(countRows, d => seqPage(d));
    const pages = Array.from(rowsByPage.keys()).sort(d3.ascending);
    const pageKey = pages.join(",");
    const key = [
      filtered ? "filtered" : "neutral",
      chapter,
      focalizer || "",
      seqPos,
      rows.length,
      countRows.length,
      roleMaskKey || "",
      pageKey,
      rows[0]?.pos ?? -1,
      rows[rows.length - 1]?.pos ?? -1
    ].join("|");
    if (key === stateKey) return {stateKey, currentRibbonTick: null, unchanged: true};

    pageRibbon.replaceChildren();
    if (!rows.length) return {stateKey: key, currentRibbonTick: null};

    const W = width, H = 132;
    const margin = {l: 28, r: 28};
    const axisY = 78;                 // asse piu' in basso: le barre crescono sopra
    const tickSize = 9, stackGap = 3, maxTicksPerColumn = 6, minReadableTickWidth = 5;
    const pMin = pages[0], pMax = pages[pages.length - 1];
    const innerW = W - margin.l - margin.r;
    const xByPage = new Map();
    let gapUnits = 0;
    const gapUnitsBefore = [];
    for (let j = 0; j < pages.length; j++) {
      gapUnitsBefore[j] = gapUnits;
      if (j < pages.length - 1) {
        const gap = pages[j + 1] - pages[j];
        gapUnits += Math.max(0, Math.min(3, Math.log2(Math.max(1, gap))));
      }
    }
    const slotUnits = pages.length + gapUnits;
    const slotW = innerW / Math.max(1, slotUnits);
    for (let j = 0; j < pages.length; j++) {
      xByPage.set(pages[j], margin.l + slotW * (j + 0.5 + gapUnitsBefore[j]));
    }
    const xOfPage = p => xByPage.get(p) ?? margin.l + innerW / 2;

    pageRibbon.setAttribute("viewBox", `0 0 ${W} ${H}`);
    pageRibbon.setAttribute("preserveAspectRatio", "none");
    pageRibbon.style.height = `${H}px`;

    // -- linea di pagina -------------------------------------------------
    pageRibbon.appendChild(el("line", {
      x1: margin.l, x2: W - margin.r, y1: axisY, y2: axisY,
      stroke: inkColor, "stroke-opacity": "0.45", "stroke-width": "1"
    }));

    // -- pagine mute: i vuoti sono parte del segnale ----------------------
    for (let j = 1; j < pages.length; j++) {
      const gap = pages[j] - pages[j - 1];
      if (gap < gapMin) continue;
      const x1 = xOfPage(pages[j - 1]) + tickSize, x2 = xOfPage(pages[j]) - tickSize;
      pageRibbon.appendChild(el("line", {
        x1, x2, y1: axisY + 14, y2: axisY + 14,
        stroke: inkColor, "stroke-opacity": "0.38", "stroke-dasharray": "4 5"
      }));
      const label = el("text", {
        x: (x1 + x2) / 2, y: axisY + 27, "text-anchor": "middle",
        "font-size": "10", fill: inkColor, "fill-opacity": "0.75"
      });
      label.textContent = `${gap} pagine mute`;
      pageRibbon.appendChild(label);
    }

    // -- blocchi testuali --------------------------------------------------
    const blocks = [];
    let blockStart = 0;
    for (let j = 1; j <= rows.length; j++) {
      const prev = rows[j - 1], cur = rows[j];
      if (!cur || Math.abs(seqPage(cur) - seqPage(prev)) > blockDelta) {
        if (j - blockStart > 1) blocks.push(rows.slice(blockStart, j));
        blockStart = j;
      }
    }
    for (const block of blocks) {
      const x1 = xOfPage(seqPage(block[0])), x2 = xOfPage(seqPage(block[block.length - 1]));
      if (Math.abs(x2 - x1) < tickSize) continue;
      const y = axisY + 38;
      pageRibbon.appendChild(el("path", {
        d: `M${x1},${y - 5} L${x1},${y} L${x2},${y} L${x2},${y - 5}`,
        fill: "none", stroke: inkColor, "stroke-opacity": "0.58", "stroke-width": "1"
      }));
    }

    // -- cursore verticale -------------------------------------------------
    const cursorRow = rows.find(row => row.pos === seqPos && (!filtered || row.agentId === focalizer));
    const cursorPage = cursorRow ? seqPage(cursorRow) : null;
    const cartiglio = el("text", {
      x: margin.l, y: 14, "text-anchor": "start",
      "font-size": "11", fill: inkColor, "font-weight": "600"
    });
    if (cursorRow) {
      const toponym = allData?.[cursorRow.tileIndex]?.properties?.Toponym || "";
      const role = effRoleName(cursorRow);
      const lead = el("tspan", {});
      lead.textContent = `p. ${cursorPage} · ${toponym}`;
      cartiglio.appendChild(lead);
      if (filtered && role) {
        const roleSpan = el("tspan", {fill: roleColors[role] || inkColor});
        roleSpan.textContent = ` · ${role}`;
        cartiglio.appendChild(roleSpan);
      }
    }
    pageRibbon.appendChild(cartiglio);
    if (cursorPage != null) {
      const x = xOfPage(cursorPage);
      // La retroilluminazione precede le tacche per non coprirle.
      pageRibbon.appendChild(el("rect", {
        x: x - (tickSize + 3) / 2 - 2, y: 4,
        width: tickSize + 7, height: axisY - 2,
        fill: inkColor, "fill-opacity": "0.10", rx: 2
      }));
      pageRibbon.appendChild(el("line", {
        x1: x, x2: x, y1: 4, y2: H - 10,
        stroke: inkColor, "stroke-width": "1.4"
      }));
    }

    // -- barre: una colonna per pagina, altezza = occorrenze ---------------
    let currentRibbonTick = null;

    for (const page of pages) {
      const stack = rowsByPage.get(page).slice().sort((a, b) => d3.ascending(a.pos, b.pos));
      const x = xOfPage(page);
      const isCursorPage = page === cursorPage;
      const columnCount = Math.max(1, Math.ceil(stack.length / maxTicksPerColumn));
      const maxGroupWidth = slotW || (columnCount * (tickSize + stackGap));
      const naturalGroupWidth = columnCount * tickSize + (columnCount - 1) * stackGap;
      const tickWidth = naturalGroupWidth <= maxGroupWidth
        ? tickSize
        : Math.max(minReadableTickWidth, Math.min(tickSize, maxGroupWidth / columnCount));
      const columnStride = columnCount <= 1
        ? 0
        : Math.max(0, Math.min(tickWidth + stackGap, (maxGroupWidth - tickWidth) / (columnCount - 1)));
      const groupWidth = columnCount <= 1 ? tickWidth : tickWidth + columnStride * (columnCount - 1);

      stack.forEach((row, j) => {
        const col = Math.floor(j / maxTicksPerColumn);
        const rowInCol = j % maxTicksPerColumn;
        const tx = x - groupWidth / 2 + tickWidth / 2 + col * columnStride;
        const y = axisY - tickSize - rowInCol * (tickSize + stackGap);
        const isCursor = row.pos === seqPos;
        const tickScale = isCursor ? 1.45 : 1;
        const drawTickWidth = tickWidth * tickScale;
        const drawTickSize = tickSize * tickScale;
        const inFilter = !filtered || row.agentId === focalizer;
        const rowFill = filtered
          ? (inFilter ? (roleColors[effRoleName(row)] || inkColor) : inkColor)
          : inkColor;
        if (isCursor) {
          // alone dell'occorrenza di riferimento
          pageRibbon.appendChild(el("rect", {
            x: tx - drawTickWidth / 2 - 3, y: y + tickSize / 2 - drawTickSize / 2 - 3,
            width: drawTickWidth + 6, height: drawTickSize + 6,
            fill: rowFill,
            "fill-opacity": "0.30", rx: 2
          }));
        }
        const tick = el("rect", {
          x: tx - drawTickWidth / 2, y: y + tickSize / 2 - drawTickSize / 2,
          width: drawTickWidth, height: drawTickSize,
          fill: rowFill,
          stroke: inkColor,
          "stroke-width": isCursor ? "1.8" : "0.5",
          "fill-opacity": inFilter ? (isCursorPage || isCursor ? "1" : "0.85") : String(focalDimAlpha)
        });
        if (inFilter) {
          tick.style.cursor = "pointer";
          tick.addEventListener("click", () => setSeqPos(row.pos));
        }
        pageRibbon.appendChild(tick);

        if (isCursor && inFilter) {
          pageRibbon.appendChild(el("circle", {cx: x, cy: y - 7, r: "3", fill: inkColor}));
          currentRibbonTick = {x, y: y + tickSize / 2, page, tileIndex: row.tileIndex, pos: row.pos};
        }
      });

    }

    let lastLabelX = -Infinity;
    for (const page of pages) {
      const x = xOfPage(page);
      const isCursorPage = page === cursorPage;
      if (!isCursorPage && x - lastLabelX < 36) continue;
      const counted = countRowsByPage.get(page)?.length || 0;
      const label = el("text", {
        x, y: axisY + 11, "text-anchor": "middle", "font-size": "9",
        fill: inkColor, "fill-opacity": isCursorPage ? "1" : "0.6",
        "font-weight": isCursorPage ? "700" : "400"
      });
      label.textContent = counted > 1 ? `${page} · ${counted}` : String(page);
      pageRibbon.appendChild(label);
      lastLabelX = x;
    }

    // -- estremi di pagina --------------------------------------------------
    for (const [p, anchor, dx] of [[pMin, "start", 0], [pMax, "end", 0]]) {
      const t = el("text", {
        x: xOfPage(p) + dx, y: H - 4, "text-anchor": anchor,
        "font-size": "10", fill: inkColor, "fill-opacity": "0.7"
      });
      t.textContent = `p. ${p}`;
      pageRibbon.appendChild(t);
    }

    return {stateKey: key, currentRibbonTick};
  }

  return { update };
})();

// ===== CELLA: s4RoleBands =====
// -- CELLA: s4RoleBands --
// Stato compatto dei colori e delle identita' delle terrazze.
const s4RoleBands = (() => {
  function create({allDataLength, roleCap, bandsMax, bandsLogBase, bandsCap}) {
    const CAP = roleCap ?? bandsCap;
    const NB = bandsMax ?? bandsCap;
    const LOGB = Math.log(bandsLogBase ?? 1.55);
    const bandRoleChrono = new Int8Array(allDataLength * NB).fill(-1);
    const bandRoleGrouped = new Int8Array(allDataLength * NB).fill(-1);
    // Posizione in sequenza dell'occorrenza rappresentata; -1 indica una banda aggregata.
    const bandPosChrono = new Int32Array(allDataLength * NB).fill(-1);
    const bandPosGrouped = new Int32Array(allDataLength * NB).fill(-1);
    const dominantRoleOf = new Int8Array(allDataLength).fill(-1);
    const roleMixOf = Array.from({length: allDataLength}, () => []);
    const bandCountOf = new Uint8Array(allDataLength);
    const occCountOf = new Int16Array(allDataLength);
    const lastRoleByTile = new Int8Array(allDataLength).fill(-1);
    const chapterRankByTile = new Int32Array(allDataLength).fill(-1);
    let chapterStepCountValue = 0;
    const openingOrdinal = Array.from({length: NB + 2}, (_, k) =>
      k <= 0 ? 1 : Math.max(1, Math.ceil(Math.pow(bandsLogBase ?? 1.55, k - 1)))
    );

    function bandsForCount(n) {
      if (n <= 0) return 0;
      return Math.min(NB, Math.floor(Math.log(n) / LOGB) + 1);
    }

    function rebuild({roleStack, rolePosStack, roleCounts, roleLen, roleOrder, linear}) {
      const countsSource = roleCounts || roleLen;
      bandRoleChrono.fill(-1); bandRoleGrouped.fill(-1);
      bandPosChrono.fill(-1);  bandPosGrouped.fill(-1);
      bandCountOf.fill(0); occCountOf.fill(0); dominantRoleOf.fill(-1);
      for (let i = 0; i < roleMixOf.length; i++) roleMixOf[i] = [];
      const roleCount = roleOrder.length;
      const counts = new Int16Array(roleCount);
      const mixCounts = new Int16Array(roleCount);
      // In modo lineare la banda k rappresenta l'occorrenza k.
      const ordAt = linear ? (k => k) : (k => openingOrdinal[k]);

      for (let i = 0; i < allDataLength; i++) {
        const n = Math.min(CAP, countsSource[i] | 0);
        occCountOf[i] = n;
        if (!n) continue;
        const B = linear ? Math.min(NB, n) : bandsForCount(n);
        bandCountOf[i] = B;
        const src = i * CAP;
        const dst = i * NB;
        mixCounts.fill(0);
        for (let k = 0; k < n; k++) {
          const r = roleStack[src + k];
          if (r >= 0 && r < roleCount) mixCounts[r]++;
        }
        roleMixOf[i] = Array.from(mixCounts);

        let carry = -1, carryPos = -1;
        for (let k = 1; k <= B; k++) {
          const ord = Math.min(n, ordAt(k));
          let r = roleStack[src + (ord - 1)];
          let p = rolePosStack ? rolePosStack[src + (ord - 1)] : -1;
          if (r < 0) { r = carry; p = carryPos; }
          if (r >= 0) { carry = r; carryPos = p; }
          bandRoleChrono[dst + (k - 1)] = r;
          bandPosChrono[dst + (k - 1)] = linear ? (rolePosStack ? rolePosStack[src + (k - 1)] : -1) : p;
        }

        // Riempimento all'indietro dei ruoli mancanti.
        let back = -1;
        for (let k = B; k >= 1; k--) {
          const v = bandRoleChrono[dst + (k - 1)];
          if (v >= 0) back = v;
          else if (back >= 0) bandRoleChrono[dst + (k - 1)] = back;
        }

        const top = bandRoleChrono[dst + (B - 1)];
        for (let k = B; k < NB; k++) bandRoleChrono[dst + k] = top;

        // Ruolo dominante usato dalla vista sintetica.
        counts.fill(0);
        for (let k = 0; k < B; k++) {
          const r = bandRoleChrono[dst + k];
          if (r >= 0 && r < roleCount) counts[r]++;
        }
        let best = -1, bestC = 0, ties = 0;
        for (let q = 0; q < roleCount; q++) {
          if (counts[q] > bestC) { bestC = counts[q]; best = q; ties = 1; }
          else if (counts[q] === bestC && bestC > 0) ties++;
        }
        dominantRoleOf[i] = ties > 1 ? -2 : best;

        // L'ordinamento per ruolo mantiene allineati colore e identita' della terrazza.
        const rec = [];
        for (let k = 0; k < B; k++) rec.push({r: bandRoleChrono[dst + k], p: bandPosChrono[dst + k], k});
        rec.sort((a, b) =>
          d3.descending(a.r >= 0 ? counts[a.r] : -1, b.r >= 0 ? counts[b.r] : -1) ||
          d3.ascending(a.r, b.r) ||
          d3.ascending(a.k, b.k)
        );
        for (let k = 0; k < NB; k++) {
          bandRoleGrouped[dst + k] = k < rec.length ? rec[k].r : top;
          bandPosGrouped[dst + k]  = k < rec.length ? rec[k].p : -1;
        }
      }
    }

    function rebuildRecency({focalizer, cursorPos, cursorChapter, track, sequence, effRoleIdx, rowAllowed = null}) {
      lastRoleByTile.fill(-1);
      chapterRankByTile.fill(-1);
      chapterStepCountValue = 0;
      if (focalizer == null) return;
      const seenByTile = new Map();
      for (let j = 0; j < track.length; j++) {
        const pos = track[j];
        if (pos > cursorPos) break;
        const row = sequence[pos];
        if (!row) continue;
        if (rowAllowed && !rowAllowed(row)) continue;
        const t = row.tileIndex;
        let seen = seenByTile.get(t);
        if (!seen) { seen = new Set(); seenByTile.set(t, seen); }
        const ref = row.referenceId;
        if (seen.has(ref)) continue;
        seen.add(ref);
        const rowChapter = Number(row.chapter) || -1;
        const r = effRoleIdx(row);
        if (r >= 0) lastRoleByTile[t] = r;
        if (rowChapter === cursorChapter) {
          chapterStepCountValue++;
          chapterRankByTile[t] = chapterStepCountValue;
        }
      }
    }

    function bandTint({tileIndex, painters, sortEased}) {
      const base = tileIndex * NB;
      return k => {
        const slot = Math.max(0, Math.min(NB - 1, k - 1));
        const chrono = painters.roleTreadRgb(bandRoleChrono[base + slot], k);
        const grouped = painters.roleTreadRgb(bandRoleGrouped[base + slot], k);
        const tread = painters.mixRgb(chrono, grouped, sortEased);
        return [tread, painters.wallFromTreadRgb(tread)];
      };
    }

    function dominantTint({tileIndex, painters}) {
      const idx = dominantRoleOf[tileIndex];
      return () => {
        const tread = idx === -2 ? painters.rolePluralTreadRgb(1) : painters.roleTreadRgb(idx, 1);
        return [tread, painters.wallFromTreadRgb(tread)];
      };
    }

    return {
      bandRoleChrono, bandCountOf, occCountOf, dominantRoleOf, roleMixOf,
      // L'identita' segue l'ordinamento di destinazione e non il crossfade cromatico.
      posOfBand: (i, k, grouped) =>
        (grouped ? bandPosGrouped : bandPosChrono)[i * NB + Math.max(0, Math.min(NB - 1, k - 1))],
      lastRoleByTile,
      chapterRankByTile, chapterStepCount: () => chapterStepCountValue,
      rebuild, rebuildRecency, bandTint, dominantTint
    };
  }

  return { create };
})();

// ===== CELLA: s4ChartShell =====
// -- CELLA: s4ChartShell --
// Costruzione DOM dei controlli e degli overlay. Gli handler restano in chartS4,
// cosi' lo stato mutabile non attraversa celle Observable.
const s4ChartShell = (() => {
  function create({canvas, width, nChapters, inkColor, bgColor, terrainAgents, sequenceLength, roleOrder, roleColors, rolePluralColor}) {
    const PLAY_ICON = "▶";
    const PAUSE_ICON = "❚❚";
    const SLIDER_STYLE = "flex:1 1 130px;min-width:80px;max-width:220px";
    const slider = html`<input type=range min=1 max=${nChapters} step=1 value=1 style="${SLIDER_STYLE}">`;
    const chLabel = html`<span>1</span>`;
    const btn = html`<button style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 10px;cursor:pointer">${PLAY_ICON}</button>`;
    const stagePrevBtn = html`<button style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 8px;cursor:pointer">indietro</button>`;
    const stageNextBtn = html`<button style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 8px;cursor:pointer">avanti</button>`;
    const stageLabel = html`<span style="font:12px sans-serif;min-width:15em;font-weight:600">1/6 · Mappa di Roma</span>`;
    const shortcutStyle = `font:11px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 8px;cursor:pointer;opacity:.72`;
    const mapBtn = html`<button style="${shortcutStyle}">Mappa di Roma</button>`;
    const pasticciaccioBtn = html`<button style="${shortcutStyle}">Mappa del Pasticciaccio</button>`;
    const focalizerSelect = html`<select style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 6px;max-width:150px">
      ${terrainAgents.filter((a, j) => j === 0 || a.total >= 10).map(a => html`<option value=${a.id == null ? "" : a.id}>${a.name}</option>`)}
    </select>`;
    const seqModeToggle = html`<span style="display:inline-flex;border:1px solid ${inkColor};border-radius:4px;overflow:hidden;opacity:.45">
      <button style="font:12px sans-serif;border:0;border-right:1px solid ${inkColor};background:${inkColor};color:${bgColor};padding:2px 8px;cursor:pointer">per capitolo</button>
      <button style="font:12px sans-serif;border:0;background:${bgColor};color:${inkColor};padding:2px 8px;cursor:pointer">per pagina</button>
    </span>`;
    const seqChapterBtn = seqModeToggle.querySelector("button:first-child");
    const seqPageBtn = seqModeToggle.querySelector("button:last-child");
    const orderBtn = html`<button disabled style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 10px;cursor:pointer;opacity:.45">ordine: cronologico</button>`;
    const seqSlider = html`<input type=range min=0 max=${Math.max(0, sequenceLength - 1)} step=1 value=0 style="${SLIDER_STYLE};display:none">`;
    const seqLabel = html`<span style="display:none;min-width:7.5em;text-align:left">p. - (cap. -)</span>`;
    const roleLegend = html`<span style="display:none;gap:8px;align-items:center">
      ${roleOrder.map(r => html`<button type=button data-role=${r} style="font:12px sans-serif;border:0;background:transparent;color:${inkColor};padding:0;display:inline-flex;gap:4px;align-items:center;white-space:nowrap;cursor:pointer"><span style="width:12px;height:12px;background:${roleColors[r]};border:1px solid ${inkColor};display:inline-block"></span><span>${r}</span></button>`)}
      <span style="display:inline-flex;gap:4px;align-items:center;white-space:nowrap"><span style="width:12px;height:12px;background:${rolePluralColor};border:1px solid ${inkColor};display:inline-block"></span>ruolo plurale</span>
    </span>`;
    const roleButtons = Array.from(roleLegend.querySelectorAll("button[data-role]"));
    const rotSlider = html`<input type=range min=0 max=360 step=1 value=0 style="${SLIDER_STYLE}">`;
    const reliefBtn = html`<button disabled style="${shortcutStyle};opacity:.45">Rilievo Narrativo</button>`;

    const VIEW_CLIP_PX = 640;
    const viewBox = document.createElement("div");
    viewBox.style.position = "relative";
    viewBox.style.overflow = "hidden";
    viewBox.style.width = "100%";
    viewBox.style.height = VIEW_CLIP_PX + "px";
    viewBox.style.display = "flex";
    viewBox.style.alignItems = "center";
    viewBox.style.justifyContent = "center";
    canvas.style.flexShrink = "0";
    viewBox.appendChild(canvas);

    const svgNs = "http://www.w3.org/2000/svg";
    const pageRibbon = document.createElementNS(svgNs, "svg");
    pageRibbon.style.display = "none";
    pageRibbon.style.width = `${width}px`;
    pageRibbon.style.maxWidth = "100%";
    pageRibbon.style.margin = "0 auto";
    pageRibbon.style.overflow = "visible";
    pageRibbon.style.font = "12px sans-serif";
    const ribbonPrevBtn = html`<button style="position:absolute;left:0;top:78px;transform:translateY(-50%);font:18px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;width:24px;height:28px;line-height:20px;cursor:pointer">‹</button>`;
    const ribbonNextBtn = html`<button style="position:absolute;right:0;top:78px;transform:translateY(-50%);font:18px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;width:24px;height:28px;line-height:20px;cursor:pointer">›</button>`;
    const ribbonWrap = html`<div style="position:relative;width:${width}px;max-width:100%;margin:4px auto 0;display:none">
      ${ribbonPrevBtn}${pageRibbon}${ribbonNextBtn}
    </div>`;

    const ROW = `display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px;font:12px sans-serif;color:${inkColor}`;
    const lodLabel = html`<span style="opacity:.7;white-space:nowrap"></span>`;

    const rowProgress = html`<div style="${ROW}">
      ${stagePrevBtn}${stageNextBtn}${stageLabel}
    </div>`;
    const rowPlayback = html`<div style="${ROW}">
      ${btn}${seqModeToggle}${seqSlider}${seqLabel}
      <span>Cap.</span>${slider}<span style="min-width:1.5em;text-align:right">${chLabel}</span>
      <span>personaggio</span>${focalizerSelect}${orderBtn}
      <span>rot.</span>${rotSlider}
    </div>`;
    const rowShortcuts = html`<div style="${ROW};opacity:.78">
      ${mapBtn}${pasticciaccioBtn}${reliefBtn}${lodLabel}
    </div>`;
    const legendRow = html`<div style="${ROW};display:none">${roleLegend}</div>`;

    const wrap = html`<div style="position:relative">
      ${viewBox}
      ${ribbonWrap}
      ${rowProgress}
      ${rowPlayback}
      ${rowShortcuts}
      ${legendRow}
    </div>`;

    return {
      PLAY_ICON, PAUSE_ICON, wrap,
      slider, chLabel, btn, stagePrevBtn, stageNextBtn, stageLabel,
      mapBtn, pasticciaccioBtn, reliefBtn,
      focalizerSelect, seqModeToggle, seqChapterBtn, seqPageBtn, orderBtn, seqSlider, seqLabel, roleLegend,
      roleButtons, rotSlider, pageRibbon, ribbonWrap, ribbonPrevBtn, ribbonNextBtn, legendRow, lodLabel
    };
  }

  return { create };
})();

// ===== CELLA: s4ChartHandlers =====
// -- CELLA: s4ChartHandlers --
// Installa gli handler dei controlli. Tiene fuori da chartS4 il wiring UI,
// lasciando li' solo le funzioni che mutano lo stato locale.
const s4ChartHandlers = (() => {
  function install({shell, invalidation, constants, state, actions}) {
    const {
      PLAY_ICON, PAUSE_ICON,
      slider, chLabel, btn, mapBtn, pasticciaccioBtn, reliefBtn, focalizerSelect, rotSlider,
      stagePrevBtn, stageNextBtn, seqChapterBtn, seqPageBtn, orderBtn, seqSlider,
      ribbonPrevBtn, ribbonNextBtn, roleButtons
    } = shell;
    const {SEQ_PLAY_MS, PLAY_MS, N_CHAPTERS} = constants;

    function clearPlayback() {
      const timer = state.playTimer();
      if (timer) clearInterval(timer);
      state.setPlayTimer(null);
      state.setPlaying(false);
      btn.textContent = PLAY_ICON;
    }

    slider.oninput = () => {
      state.setChapter(+slider.value);
      state.setSeqOccDirty(true);
      chLabel.textContent = slider.value;
      actions.updateSeqUi();
    };
    focalizerSelect.onchange = () => {
      actions.clearSelectedRoute();
      state.setFocalizer(focalizerSelect.value || null);
      if (state.seqMode()) actions.setSeqPos(actions.nearestSeqPos(state.seqPos()));
      state.setSeqOccDirty(true);
      actions.updateSeqUi();
    };
    seqSlider.oninput = () => {
      const track = actions.seqTrack();
      const idx = Math.max(0, Math.min(track.length - 1, +seqSlider.value || 0));
      if (track.length) actions.setSeqPos(track[idx]);
    };
    rotSlider.onpointerdown = () => actions.freezeRotPivot();
    rotSlider.oninput = () => state.setPlanRot((+rotSlider.value || 0) * Math.PI / 180);
    stagePrevBtn.onclick = () => actions.moveStage(-1);
    stageNextBtn.onclick = () => actions.moveStage(1);
    function setSeqModeExplicit(nextSeqMode) {
      if (!actions.seqEnabledNow()) return;
      if (state.playing() && state.playTimer()) clearPlayback();
      if (nextSeqMode && !state.seqMode()) {
        state.setSeqMode(true);
        actions.setSeqPos(actions.lastSeqPosOfChapter(state.chapter()));
        state.setSeqOccDirty(true);
        actions.updateSeqUi();
      } else if (!nextSeqMode && state.seqMode()) {
        state.setSeqMode(false);
        const c = actions.chapterOfCursor(state.seqPos());
        state.setChapter(c);
        slider.value = c;
        chLabel.textContent = String(c);
        state.setSeqOccDirty(true);
        actions.updateSeqUi();
      } else {
        actions.updateSeqUi();
      }
    }
    seqChapterBtn.onclick = () => setSeqModeExplicit(false);
    seqPageBtn.onclick = () => setSeqModeExplicit(true);
    if (ribbonPrevBtn) ribbonPrevBtn.onclick = () => actions.moveSeqChapter(-1);
    if (ribbonNextBtn) ribbonNextBtn.onclick = () => actions.moveSeqChapter(1);
    if (roleButtons) roleButtons.forEach((button, roleIndex) => {
      button.onclick = () => actions.toggleRoleFilter(roleIndex);
    });
    orderBtn.onclick = () => {
      if (state.focalizer() == null) return;
      state.setRoleSortTarget(state.roleSortTarget() > 0.5 ? 0 : 1);
      actions.updateSeqUi();
    };
    reliefBtn.onclick = () => {
      if (!state.diagramOpenedOnce()) return;
      if (state.tiltTarget() > 0) {
        actions.applyStage(state.crimpTarget() > 0.5
          ? (state.showFictitious() ? "diagram2d_fict" : "diagram2d")
          : "map2d");
      } else {
        actions.applyStage(state.crimpTarget() > 0.5 ? "diagram_axon" : "map_axon");
      }
    };
    mapBtn.onclick = () => actions.applyStage(state.tiltTarget() > 0 ? "map_axon" : "map2d");
    pasticciaccioBtn.onclick = () => {
      state.setShowFictitious(true);
      actions.applyStage(state.tiltTarget() > 0 ? "diagram_axon" : "diagram2d_fict");
    };
    btn.onclick = () => {
      state.setPlaying(!state.playing());
      btn.textContent = state.playing() ? PAUSE_ICON : PLAY_ICON;
      if (state.playing()) {
        if (state.playTimer()) clearInterval(state.playTimer());
        if (state.seqMode()) {
          const track = actions.seqTrack();
          if (!track.length) { clearPlayback(); return; }
          let j = actions.seqTrackIndex(state.seqPos(), track);
          const currentChapter = actions.chapterOfCursor(state.seqPos());
          const nextPos = j < track.length - 1 ? track[j + 1] : null;
          if (nextPos == null || actions.chapterOfCursor(nextPos) !== currentChapter) {
            let nextChapterPos = -1;
            for (let c = currentChapter + 1; c <= N_CHAPTERS && nextChapterPos < 0; c++) {
              nextChapterPos = actions.firstSeqPosOfChapter(c, track);
            }
            if (nextChapterPos < 0) { clearPlayback(); return; }
            actions.setSeqPos(nextChapterPos);
          }
          state.setPlayTimer(setInterval(() => {
            const currentTrack = actions.seqTrack();
            if (!currentTrack.length){ clearPlayback(); return; }
            let k = actions.seqTrackIndex(state.seqPos(), currentTrack);
            if (k >= currentTrack.length - 1){ clearPlayback(); return; }
            if (actions.chapterOfCursor(currentTrack[k + 1]) !== actions.chapterOfCursor(state.seqPos())) {
              clearPlayback();
              return;
            }
            actions.setSeqPos(currentTrack[k + 1]);
          }, SEQ_PLAY_MS));
          return;
        }
        if (state.chapter() >= N_CHAPTERS) {
          state.setChapter(1);
          state.setSeqOccDirty(true);
          slider.value = 1;
          chLabel.textContent = "1";
          actions.updateSeqUi();
        }
        state.setPlayTimer(setInterval(() => {
          if (state.chapter() >= N_CHAPTERS){ clearPlayback(); return; }
          const next = state.chapter() + 1;
          state.setChapter(next);
          state.setSeqOccDirty(true);
          slider.value = next;
          chLabel.textContent = next;
          actions.updateSeqUi();
        }, PLAY_MS));
      } else if (state.playTimer()) clearPlayback();
    };

    invalidation.then(() => {
      actions.cancelFrame();
      if (state.playTimer()) clearInterval(state.playTimer());
    });
  }

  return { install };
})();

// ===== CELLA: s4RouteHoverDrawing =====
  // -- CELLA: s4RouteHoverDrawing --
  const s4RouteHoverDrawing = (() => {
  let lastRouteArcs = [];
  const {
    ARC_RISE, ARC_RISE_MIN_PX, ARC_RISE_MAX_PX, ARC_SAMPLES,
    ARC_WIDTH_MIN, ARC_WIDTH_MAX, ARC_CASING_PX, ARC_JOINT_R, ARC_JOINT_RING_PX, BG_COLOR
  } = s4Config;

  function buildStepPoints({ routes, routePointOf, birthEased, fictBirthEased, N_GEO, BIRTH_EPSILON }) {
    const routeStepPoints = [];
    if (!routes || !routes.length) return routeStepPoints;
    for (const route of routes) {
      const pts2 = [];
      for (let s = 0; s < route.steps.length; s++) {
        const step = route.steps[s];
        const i = step[0];
        const visible = i != null && ((i >= N_GEO ? fictBirthEased[i] : birthEased[i]) > BIRTH_EPSILON);
        // Un vertice di route coincide col centro del rilievo disegnato: il
        // generatore Voronoi grezzo non e' il centro del disegno quando la cella
        // viene scalata e riposizionata.
        const routePoint = visible ? routePointOf(i) : null;
        const point = routePoint ? routePoint.point : null;
        const z = routePoint ? routePoint.z : null;
        const order = route.stepOrders?.[s] ?? (s + 1);
        pts2.push(point ? {point: [point[0], point[1]], z, order} : null);
      }
      routeStepPoints.push(pts2);
    }
    return routeStepPoints;
  }

  function buildArc(A, zA, B, zB, frame) {
    const d = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const h = Math.max(ARC_RISE_MIN_PX * frame.invK, Math.min(ARC_RISE_MAX_PX * frame.invK, ARC_RISE * d));
    const samples = Math.max(2, ARC_SAMPLES);
    const pts = [];
    for (let s = 0; s < samples; s++) {
      const t = samples === 1 ? 0 : s / (samples - 1);
      const x = A[0] + (B[0] - A[0]) * t;
      const y = A[1] + (B[1] - A[1]) * t;
      const z = zA + (zB - zA) * t + h * Math.sin(Math.PI * t);
      const p = frame.painters.zPoint(frame, x, y, z);
      pts.push({point: p, t});
    }
    return pts;
  }

  function arcPolygon(arc, widthPx, frame) {
    const left = [], right = [];
    for (let i = 0; i < arc.length; i++) {
      const prev = arc[Math.max(0, i - 1)].point;
      const next = arc[Math.min(arc.length - 1, i + 1)].point;
      let dx = next[0] - prev[0], dy = next[1] - prev[1];
      let len = Math.hypot(dx, dy);
      if (len < 1e-6 && i > 0) {
        dx = arc[i].point[0] - arc[i - 1].point[0];
        dy = arc[i].point[1] - arc[i - 1].point[1];
        len = Math.hypot(dx, dy);
      }
      if (len < 1e-6) len = 1;
      const nx = -dy / len, ny = dx / len;
      const t = arc[i].t;
      const w = (ARC_WIDTH_MIN + (ARC_WIDTH_MAX - ARC_WIDTH_MIN) * t + widthPx) * frame.invK * 0.5;
      const p = arc[i].point;
      left.push([p[0] + nx * w, p[1] + ny * w]);
      right.push([p[0] - nx * w, p[1] - ny * w]);
    }
    const path = new Path2D();
    if (!left.length) return path;
    path.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < left.length; i++) path.lineTo(left[i][0], left[i][1]);
    for (let i = right.length - 1; i >= 0; i--) path.lineTo(right[i][0], right[i][1]);
    path.closePath();
    return path;
  }

  function drawArcs({ context, routeStepPoints, routeHoverEased, routeRgb, frame }) {
    lastRouteArcs = [];
    if (routeHoverEased <= 0.01 || !routeStepPoints.length) return;
    const arcs = [];
    for (const pts2 of routeStepPoints) {
      let prev = null;
      for (const p of pts2) {
        if (p && prev) arcs.push(buildArc(prev.point, prev.z || 0, p.point, p.z || 0, frame));
        prev = p || null;
      }
    }
    if (!arcs.length) return;
    lastRouteArcs = arcs;
    context.save();
    context.fillStyle = BG_COLOR;
    context.globalAlpha = 0.85 * routeHoverEased;
    for (const arc of arcs) context.fill(arcPolygon(arc, ARC_CASING_PX, frame));
    context.fillStyle = routeRgb;
    context.globalAlpha = 0.95 * routeHoverEased;
    for (const arc of arcs) context.fill(arcPolygon(arc, 0, frame));
    context.restore();
  }

  function drawJoints({ context, routeHoverEased, routeRgb, rotNow, tiltNow, invK }) {
    if (routeHoverEased <= 0.01 || !lastRouteArcs.length) return;
    const seen = new Set();
    const nodes = [];
    const snap = 0.5 * invK;
    for (const arc of lastRouteArcs) {
      const endpoints = [arc[0], arc[arc.length - 1]];
      for (const sample of endpoints) {
        if (!sample) continue;
        const p = sample.point;
        const key = `${Math.round(p[0] / snap)},${Math.round(p[1] / snap)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        nodes.push(p);
      }
    }
    if (!nodes.length) return;
    context.save();
    context.globalAlpha = 0.95 * routeHoverEased;
    for (const p of nodes) {
      context.save();
      context.translate(p[0], p[1]);
      context.rotate(-rotNow);
      context.scale(1, 1 / Math.max(0.001, tiltNow));
      context.beginPath();
      context.fillStyle = BG_COLOR;
      context.arc(0, 0, (ARC_JOINT_R + ARC_JOINT_RING_PX) * invK, 0, 2 * Math.PI);
      context.fill();
      context.beginPath();
      context.fillStyle = routeRgb;
      context.arc(0, 0, ARC_JOINT_R * invK, 0, 2 * Math.PI);
      context.fill();
      context.restore();
    }
    context.restore();
  }

  function drawOrdinals({ context, routeStepPoints, routeHoverEased, rotNow, tiltNow, labelSize, invK, bgColor, routeRgb }) {
    if (routeHoverEased <= 0.01 || !routeStepPoints.length) return;
    context.save();
    context.globalAlpha = routeHoverEased;
    for (const pts2 of routeStepPoints) {
      pts2.forEach((p, s) => {
        if (!p) return;
        context.save();
        context.translate(p.point[0], p.point[1]);
        context.rotate(-rotNow);
        context.scale(1, 1 / Math.max(0.001, tiltNow));
        context.font = `700 ${labelSize * 0.8 * invK}px sans-serif`;
        context.textAlign = "center"; context.textBaseline = "middle";
        context.lineJoin = "round"; context.lineWidth = 3 * invK;
        context.strokeStyle = bgColor;
        const label = String(p.order ?? (s + 1));
        context.strokeText(label, 0, 14 * invK);
        context.fillStyle = routeRgb;
        context.fillText(label, 0, 14 * invK);
        context.restore();
      });
    }
    context.restore();
  }

  return { buildStepPoints, drawArcs, drawJoints, drawOrdinals };
})();

// ===== CELLA: s4HoverOverlay =====
  // -- CELLA: s4HoverOverlay --
  const s4HoverOverlay = (() => {
  function draw({
    context, hostIndex, crimpEased, transform, K2, allData, N_GEO,
    birthEased, fictBirthEased, BIRTH_EPSILON, cellRings, cellPoint, displayPts,
    roleMode, occSeq = [], occEased = [], terraceInfo, roleSummary, rotNow, tiltNow, invK, glowWidth, glowBlur, inkColor, bgColor, labelSize
  }) {
    // Il glow usa sempre il ring Voronoi standard, cosi' coincide col tassello.
    if (hostIndex >= 0 && (crimpEased <= 0.01 || birthEased[hostIndex] > BIRTH_EPSILON)) {
      const cr = cellRings[hostIndex];
      if (cr && cr.ring && cr.ring.length >= 3) {
        context.save();
        context.beginPath();
        const p0 = cellPoint(hostIndex, cr.ring[0][0], cr.ring[0][1], true);
        context.moveTo(p0[0], p0[1]);
        for (let j = 1; j < cr.ring.length; j++) {
          const p = cellPoint(hostIndex, cr.ring[j][0], cr.ring[j][1], true);
          context.lineTo(p[0], p[1]);
        }
        context.closePath();
        context.lineWidth = glowWidth * invK;
        context.strokeStyle = inkColor;
        context.shadowColor = inkColor;
        context.shadowBlur = glowBlur;
        context.stroke();
        context.restore();
      }
    }
    if ((crimpEased <= 0.01 || transform.k >= K2) && hostIndex >= 0 && allData[hostIndex] &&
        (crimpEased <= 0.01 || (hostIndex >= N_GEO ? fictBirthEased[hostIndex] : birthEased[hostIndex]) > BIRTH_EPSILON)) {
      const [x, y] = displayPts[hostIndex];
      // L'etichetta descrive la terrazza interrogata e riporta il totale in coda.
      const nMentions = Math.round((roleMode ? occSeq[hostIndex] : occEased[hostIndex]) || 0);
      let hoverLabel = allData[hostIndex].properties.Toponym;
      if (terraceInfo && terraceInfo.band > 0) {
        hoverLabel += ` · occ. ${terraceInfo.band} di ${nMentions}`;
        if (terraceInfo.page != null) hoverLabel += ` · p. ${terraceInfo.page}`;
        if (terraceInfo.role) hoverLabel += ` · ${terraceInfo.role}`;
      } else if (nMentions > 0) {
        const occText = nMentions + " " + (nMentions === 1 ? "occorrenza" : "occorrenze");
        hoverLabel += roleSummary && roleSummary.length ? ` · ${occText} · ${roleSummary.join(", ")}` : ` · ${occText}`;
      }
      // Ogni annotazione testuale resta leggibile in orizzontale: la rotazione
      // disambigua gli addensamenti di montagne, non ruota la lettura.
      context.save();
      context.translate(x, y);
      context.rotate(-rotNow);
      context.scale(1, 1 / Math.max(0.001, tiltNow));
      context.font = `${labelSize * invK}px sans-serif`;
      context.lineJoin = "round";
      context.lineWidth = 3 * invK;
      context.strokeStyle = bgColor;
      context.strokeText(hoverLabel, 6 * invK, -6 * invK);
      context.fillStyle = inkColor;
      context.fillText(hoverLabel, 6 * invK, -6 * invK);
      context.restore();
    }
  }

  return { draw };
})();

// ===== CELLA: s4ProfileLog =====
  // -- CELLA: s4ProfileLog --
  const s4ProfileLog = (() => {
  function chartS4(args) {
    const nextFrame = args.profileFrame + 1;
    if (nextFrame % 60 === 0) {
      const frame = args.frame;
      console.log("[chartS4 profile]", {
        tiles: args.profileTiles,
        curves: args.profileCurves,
        fillCalls: args.profileFills,
        strokeCalls: args.profileStrokes,
        displayMs: +args.profileDisplayMs.toFixed(1),
        drawOrderMs: +args.profileDrawOrderMs.toFixed(1),
        reliefMs: +args.profileReliefMs.toFixed(1),
        baseContourMs: +(frame.profile ? frame.profile.baseContourMs : 0).toFixed(1),
        traceMs: +(frame.profile ? frame.profile.traceMs : 0).toFixed(1),
        fillBuildMs: +(frame.profile ? frame.profile.fillBuildMs : 0).toFixed(1),
        fillRasterMs: +(frame.profile ? frame.profile.fillRasterMs : 0).toFixed(1),
        strokePtsMs: +(frame.profile ? frame.profile.strokePtsMs : 0).toFixed(1),
        quadCount: frame.profile ? frame.profile.quadCount : 0,
        ribbonCount: frame.profile ? frame.profile.ribbonCount : 0,
        nestedBandCount: frame.profile ? frame.profile.nestedBandCount : 0,
        nestedFallbacks: frame.profile ? frame.profile.nestedFallbacks : 0,
        fillLenAAvg: frame.profile && frame.profile.fillLenCalls ? +(frame.profile.fillLenASum / frame.profile.fillLenCalls).toFixed(1) : 0,
        fillLenBAvg: frame.profile && frame.profile.fillLenCalls ? +(frame.profile.fillLenBSum / frame.profile.fillLenCalls).toFixed(1) : 0,
        bordersMs: +args.profileBordersMs.toFixed(1),
        rulerMs: +args.profileRulerMs.toFixed(1),
        tickMs: +args.profileTickMs.toFixed(1),
        tickOtherMs: +(args.profileTickMs - args.profileHitMs).toFixed(1),
        hitMs: +args.profileHitMs.toFixed(1),
        seqOccCallsPerSecond: +args.seqOccCallsPerSecond.toFixed(1),
        drawMs: +(performance.now() - args.profileT0).toFixed(1)
      });
    }
    return nextFrame;
  }

  return { chartS4 };
})();

// ===== CELLA: s4LodPicking =====
  // -- CELLA: s4LodPicking --
  // Misure LOD e risoluzione della terrazza interrogata.
  const s4LodPicking = (() => {
  // Misura in pixel l'alzata e la pedata disponibili sullo schermo.
  function lodMetrics({s4Painters, tiltNow, transform, isoProfileMed, displayCellScale, N_INMAP, zScaleNow}) {
    const invTilt = 1 / Math.max(0.001, tiltNow);
    const alzataPx = s4Painters.AXON_Z_STEP * zScaleNow * transform.k * invTilt;
    let acc = 0, n = 0;
    for (let i = 0; i < N_INMAP; i++) {
      const m = isoProfileMed[i];
      if (!(m > 0)) continue;
      acc += m * displayCellScale[i];
      n++;
    }
    const rMedAvg = n ? acc / n : 0;
    const pedataPx = s4Painters.TER_STEP_FRAC * rMedAvg * transform.k;
    return { alzataPx, pedataPx };
  }

  // Dalla cima verso il basso, seleziona la prima calotta che contiene il cursore.
  function pickTerrace({terraceCurveCache, hostIndex, painters, x, y}) {
    const c = terraceCurveCache;
    if (!c.curves || c.index < 0) return -1;
    if (c.index !== hostIndex) return -1;
    const f = {tiltNow: c.tiltNow, rotSinNow: c.rotSinNow, rotCosNow: c.rotCosNow};
    const tol = (s4Config.PICK_TOLERANCE_PX || 0) * (c.invK || 1);
    const dilate = poly => {
      if (!(tol > 0) || !poly.length) return poly;
      let center = d3.polygonCentroid(poly);
      if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
        center = poly.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map(v => v / poly.length);
      }
      return poly.map(p => {
        const dx = p[0] - center[0], dy = p[1] - center[1];
        const d = Math.hypot(dx, dy);
        return d > 1e-6 ? [center[0] + dx * (1 + tol / d), center[1] + dy * (1 + tol / d)] : p;
      });
    };
    for (let k = c.curves.length - 1; k >= 1; k--) {
      const z = painters.axonZOf(k) * c.zScale;
      const poly = dilate(c.curves[k].map(p => painters.zPoint(f, p[0], p[1], z)));
      if (d3.polygonContains(poly, [x, y])) return k;
    }
    for (let k = c.curves.length - 1; k >= 1; k--) {
      const z0 = painters.axonZOf(k - 1) * c.zScale;
      const poly = dilate(c.curves[k].map(p => painters.zPoint(f, p[0], p[1], z0)));
      if (d3.polygonContains(poly, [x, y])) return k;
    }
    return -1;
  }

  function curveRadius(curve) {
    if (!curve || !curve.length) return 0;
    const c = d3.polygonCentroid(curve);
    const center = Number.isFinite(c[0]) && Number.isFinite(c[1])
      ? c
      : curve.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]).map(v => v / curve.length);
    return curve.reduce((acc, p) => acc + Math.hypot(p[0] - center[0], p[1] - center[1]), 0) / curve.length;
  }

  function makePickLogger({PROFILE, painters}) {
    let lastPickLogKey = null;
    return function logPickDiagnostics(cache) {
      if (!PROFILE || !cache || !cache.curves || cache.index < 0) return;
      const B = Math.min(cache.B || 0, cache.curves.length - 1);
      if (B < 1) return;
      const regime = cache.crimpEased > 0.5 ? "diagramma" : "mappa";
      const key = `${cache.index}:${regime}`;
      if (key === lastPickLogKey) return;
      const radii = d3.range(1, B + 1).map(k => curveRadius(cache.curves[k])).sort((a, b) => a - b);
      let distinctCapRadii = 0;
      for (const r of radii) {
        if (!distinctCapRadii || Math.abs(r - radii[distinctCapRadii - 1]) >= 0.5) {
          radii[distinctCapRadii++] = r;
        }
      }
      console.log("[pick]", {
        hostIndex: cache.index,
        regime,
        crimpEased: +cache.crimpEased.toFixed(3),
        k: +cache.transformK.toFixed(2),
        B,
        packing: +cache.packing.toFixed(3),
        rMed: +cache.rMed.toFixed(2),
        rCurve1: +curveRadius(cache.curves[1]).toFixed(2),
        rCurveB: +curveRadius(cache.curves[B]).toFixed(2),
        distinctCapRadii,
        dzPx: +(painters.axonZOf(1) * cache.zScale * cache.transformK / Math.max(0.001, cache.tiltNow)).toFixed(2)
      });
      lastPickLogKey = key;
    };
  }

  return { lodMetrics, pickTerrace, makePickLogger };
})();

// ===== CELLA: s4ChartSupport =====
  // -- CELLA: s4ChartSupport --
  // Helper matematici puri usati dalla cella chartS4.
  const s4ChartSupport = (() => {
  function bandsOfTile({i, occEased, focalizer, BANDS_MAX, bandsFor}) {
    const occ = occEased[i] || 0;
    return focalizer != null ? Math.min(BANDS_MAX, Math.round(occ)) : bandsFor(occ);
  }

  function baseWorldPt({i, N_GEO, pts, cogCenter}) {
    return i < N_GEO ? pts[i].slice() : cogCenter.slice();
  }

  function deformPoint({px, py, drop, effRadius, transform, crimpEased}) {
    const dx = px - drop.x, dy = py - drop.y, dist = Math.hypot(dx, dy);
    if (drop.s < 0.5 || dist < 1e-6) return [px, py];
    const q = dist / effRadius;
    if (q >= 1) return [px, py];
    const falloff = (1 - q * q) * (1 - q * q);
    const amp = (drop.s / transform.k) * (1 - crimpEased) * falloff;
    return [px + dx / dist * amp, py + dy / dist * amp];
  }

  function nearDropBBox({box, drop, effInfluence}) {
    if (drop.s < 0.5) return false;
    const dx = Math.max(box[0] - drop.x, 0, drop.x - box[2]);
    const dy = Math.max(box[1] - drop.y, 0, drop.y - box[3]);
    return dx * dx + dy * dy <= effInfluence * effInfluence;
  }

  function focalAlpha(focalEased, i) {
    return focalEased[i] == null ? 1 : focalEased[i];
  }

  function offmapPresence(crimpEased, threshold) {
    return Math.max(0, Math.min(1, crimpEased / threshold));
  }

  function alphaBucket(alpha) {
    return Math.max(0, Math.min(1, Math.round(alpha * 255) / 255));
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function seqPage(row) {
    const p = Number(row?.page);
    return Number.isFinite(p) ? p : null;
  }

  function effRoleName(row) {
    return row?.role || (row?.isRouteNode ? "Route" : null);
  }

  function effRoleIdx(row, roleOrder) {
    const r = effRoleName(row);
    const idx = roleOrder.indexOf(r);
    return idx >= 0 ? idx : -1;
  }

  function hitState(fields) {
    const {drop, chapter, crimpEased, tiltEased, planRot, rotPivot, transform, showFictitious, seqMode, seqPos} = fields;
    return {
      x: drop.x, y: drop.y, s: drop.s,
      chapter, crimpEased, tiltEased, planRot,
      rpx: rotPivot[0], rpy: rotPivot[1],
      tx: transform.x, ty: transform.y, tk: transform.k,
      showFictitious,
      seqMode,
      seqPos
    };
  }

  function sameHitState(a, b) {
    return !!a
      && a.x === b.x
      && a.y === b.y
      && a.s === b.s
      && a.chapter === b.chapter
      && a.crimpEased === b.crimpEased
      && a.tiltEased === b.tiltEased
      && a.planRot === b.planRot
      && a.rpx === b.rpx
      && a.rpy === b.rpy
      && a.tx === b.tx
      && a.ty === b.ty
      && a.tk === b.tk
      && a.showFictitious === b.showFictitious
      && a.seqMode === b.seqMode
      && a.seqPos === b.seqPos;
  }

  return {
    bandsOfTile, baseWorldPt, deformPoint, nearDropBBox,
    focalAlpha, offmapPresence, alphaBucket, clamp01,
    seqPage, effRoleName, effRoleIdx, hitState, sameHitState
  };
})();

// ===== CELLA: s4ChartOverlays =====
  // -- CELLA: s4ChartOverlays --
  // Disegni di overlay in coda a chartS4.draw(): pulse, punti generatori,
  // righello, polo, route-hover e label hover.
  const s4ChartOverlays = (() => {
  function draw({
    context, PROFILE, profileRulerMs, profileT0, profileFrame,
    crimpEased, transform, K2, chapter, t0, N_INMAP, N_GEO,
    geoData, allData, pts, displayPts, birthEased, fictBirthEased,
    BIRTH_EPSILON, HUE_RGB, GRID_COLOR, INK_COLOR, BG_COLOR,
    PULSE_R, DOT_RADIUS, LABEL_SIZE, GLOW_WIDTH, GLOW_BLUR,
    invK, contentAlpha, alphaBucket, metricTicks, cogCenter, cogScaleDyn,
    poleIndex, routeStepPoints, routeHoverEased, rotNow, tiltNow, routeRgb,
    roleMode, occSeq, occEased, hostIndex, hoverTerrace, roleBands, roleSortTarget,
    sequence, effRoleName, cellRings, cellPoint, frame,
    profileTiles, profileCurves, profileFills, profileStrokes,
    profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
    profileTickMs, profileHitMs, seqOccCallsPerSecond,
    formatMetricIsoline
  }) {
    function drawUprightText(text, x, y) {
      context.lineJoin = "round";
      context.lineWidth = 3 * invK;
      context.strokeStyle = BG_COLOR;
      context.strokeText(text, x, y);
      context.fillText(text, x, y);
    }

    function withUprightAnnotation(drawFn) {
      context.save();
      context.translate(cogCenter[0], cogCenter[1]);
      context.rotate(-rotNow);
      context.translate(-cogCenter[0], -cogCenter[1]);
      drawFn();
      context.restore();
    }

    if (crimpEased <= 0.01) {
      const pulse = 0.5 + 0.5 * Math.sin((performance.now() - t0) / 380);
      const cur = chapter - 1;
      const pulseAlpha = 0.35 + 0.45 * pulse;
      const pulseGroups = new Map();
      for (let i = 0; i < N_INMAP; i++) {
        if ((geoData[i].properties.mentionsByChapter[cur] || 0) <= 0) continue;
        const alpha = alphaBucket(pulseAlpha * contentAlpha(i));
        if (alpha <= BIRTH_EPSILON) continue;
        let path = pulseGroups.get(alpha);
        if (!path) { path = new Path2D(); pulseGroups.set(alpha, path); }
        const [x, y] = displayPts[i];
        const r = (PULSE_R * (0.7 + 0.6 * pulse)) * invK;
        path.moveTo(x + r, y); path.arc(x, y, r, 0, 2 * Math.PI);
      }
      for (const [alpha, path] of pulseGroups) {
        context.fillStyle = `rgba(${HUE_RGB},${alpha})`;
        context.fill(path);
      }
    }

    if (transform.k >= K2) {
      const r = DOT_RADIUS * invK;
      const dotGroups = new Map();
      for (let i = 0; i < pts.length; i++) {
        if (crimpEased > 0.01 && birthEased[i] <= BIRTH_EPSILON) continue;
        const alpha = alphaBucket(contentAlpha(i));
        if (alpha <= BIRTH_EPSILON) continue;
        const [x, y] = displayPts[i];
        let path = dotGroups.get(alpha);
        if (!path) { path = new Path2D(); dotGroups.set(alpha, path); }
        path.moveTo(x + r, y); path.arc(x, y, r, 0, 2 * Math.PI);
      }
      for (const [alpha, path] of dotGroups) {
        context.fillStyle = alpha >= 0.999 ? `rgb(${HUE_RGB})` : `rgba(${HUE_RGB},${alpha})`;
        context.fill(path);
      }
    }

    const profileRulerT0 = PROFILE ? performance.now() : 0;
    if (crimpEased > 0.01 && metricTicks.length) {
      const rulerX = cogCenter[0];
      const labelX = rulerX + 14 * invK;
      const tickHalf = 5 * invK;
      const maxR = d3.max(metricTicks, d => d.rMetric) * cogScaleDyn;
      const poleName = poleIndex >= 0 ? allData[poleIndex].properties.Toponym : "via Merulana";
      context.save();
      context.globalAlpha = crimpEased;
      withUprightAnnotation(() => {
        context.strokeStyle = `rgba(${GRID_COLOR},${0.55 * crimpEased})`;
        context.lineWidth = 0.7 * invK;
        context.beginPath();
        context.moveTo(rulerX, cogCenter[1]);
        context.lineTo(rulerX, cogCenter[1] - maxR);
        context.stroke();
        context.font = `600 ${10 * invK}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillStyle = INK_COLOR;
        for (const {dKm, rMetric} of metricTicks) {
          const y = cogCenter[1] - rMetric * cogScaleDyn;
          context.strokeStyle = `rgba(${GRID_COLOR},${0.55 * crimpEased})`;
          context.lineWidth = 0.7 * invK;
          context.beginPath();
          context.moveTo(rulerX - tickHalf, y);
          context.lineTo(rulerX + tickHalf, y);
          context.stroke();
          drawUprightText(formatMetricIsoline(dKm), labelX, y);
        }
        context.textBaseline = "bottom";
        drawUprightText(`distanza da ${poleName}`, labelX, cogCenter[1] - maxR - 6 * invK);
      });
      context.restore();
    }
    if (PROFILE) profileRulerMs = performance.now() - profileRulerT0;

    if (crimpEased > 0.01 && poleIndex >= 0 && birthEased[poleIndex] > BIRTH_EPSILON) {
      const [x, y] = displayPts[poleIndex];
      const m = 5 * invK;
      context.save();
      context.globalAlpha = crimpEased;
      withUprightAnnotation(() => {
        context.strokeStyle = INK_COLOR;
        context.lineWidth = 0.8 * invK;
        context.beginPath();
        context.moveTo(x - m, y);
        context.lineTo(x + m, y);
        context.moveTo(x, y - m);
        context.lineTo(x, y + m);
        context.stroke();
        context.font = `700 ${LABEL_SIZE * invK}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "bottom";
        context.fillStyle = INK_COLOR;
        drawUprightText(allData[poleIndex].properties.Toponym, x + 7 * invK, y - 7 * invK);
      });
      context.restore();
    }

    s4RouteHoverDrawing.drawArcs({
      context, routeStepPoints, routeHoverEased, routeRgb, frame
    });
    s4RouteHoverDrawing.drawJoints({
      context, routeHoverEased, routeRgb, rotNow, tiltNow, invK
    });
    s4RouteHoverDrawing.drawOrdinals({
      context, routeStepPoints, routeHoverEased, rotNow, tiltNow,
      labelSize: LABEL_SIZE, invK, bgColor: BG_COLOR, routeRgb
    });
    s4HoverOverlay.draw({
      context, hostIndex, crimpEased, transform, K2, allData, N_GEO,
      birthEased, fictBirthEased, BIRTH_EPSILON, cellRings, cellPoint, displayPts,
      roleMode, occSeq, occEased,
      terraceInfo: (() => {
        if (frame.lodCollapse) return null;
        if (!roleMode || hostIndex < 0 || hoverTerrace < 1) return null;
        const pos = roleBands.posOfBand(hostIndex, hoverTerrace, roleSortTarget > 0.5);
        const row = pos >= 0 ? sequence[pos] : null;
        return row ? {band: hoverTerrace, page: row.page, role: effRoleName(row), referenceId: row.referenceId} : null;
      })(),
      roleSummary: (() => {
        if (!frame.lodCollapse || !roleMode || hostIndex < 0 || roleBands.dominantRoleOf[hostIndex] !== -2) return null;
        return roleBands.roleMixOf[hostIndex]
          .map((count, roleIndex) => ({count, roleIndex}))
          .filter(d => d.count > 0)
          .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.roleIndex, b.roleIndex))
          .map(d => `${d.count} ${s4Config.ROLE_ORDER[d.roleIndex]}`);
      })(),
      rotNow, tiltNow, invK, glowWidth: GLOW_WIDTH, glowBlur: GLOW_BLUR,
      inkColor: INK_COLOR, bgColor: BG_COLOR, labelSize: LABEL_SIZE
    });
    if (PROFILE) {
      profileFrame = s4ProfileLog.chartS4({
        profileFrame, profileTiles, profileCurves, profileFills, profileStrokes,
        profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
        profileRulerMs, profileTickMs, profileHitMs, seqOccCallsPerSecond, frame, profileT0
      });
    }
    return {profileFrame, profileRulerMs};
  }

  return { draw };
})();

// ===== CELLA: s4ChartRouteSelection =====
// -- CELLA: s4ChartRouteSelection --
// Stato persistente della route selezionata. Isolato da chartS4 per tenere insieme
// gate di interrogabilita', risoluzione referenceId e terrazza sorgente evidenziata.
const s4ChartRouteSelection = (() => {
  function create({getFocalizer, getLodEased, getHostIndex, getHoverTerrace, getRoleSortTarget, roleBands, sequence, routeIdByReferenceId}) {
    let id = null;
    let tileIndex = -1;
    let terrace = -1;

    function clear() {
      id = null;
      tileIndex = -1;
      terrace = -1;
    }

    function enabled() {
      // Gate di sola attivazione: la route e' interrogabile solo dove la terrazza
      // e' indirizzabile (roleMode && !lodCollapse). Una selezione gia' stabilita
      // resta invece stato di lettura e non segue zoom, pan o rotazione.
      return getFocalizer() != null && getLodEased() >= 0.5;
    }

    function selectFromTerrace() {
      const hostIndex = getHostIndex();
      const hoverTerrace = getHoverTerrace();
      if (!enabled() || hostIndex < 0 || hoverTerrace < 1) {
        clear();
        return;
      }
      const pos = roleBands.posOfBand(hostIndex, hoverTerrace, getRoleSortTarget() > 0.5);
      const row = pos >= 0 ? sequence[pos] : null;
      const routeId = row ? routeIdByReferenceId.get(String(row.referenceId || "")) : null;
      id = routeId ?? null;
      tileIndex = routeId ? hostIndex : -1;
      terrace = routeId ? hoverTerrace : -1;
    }

    return {
      clear,
      enabled,
      selectFromTerrace,
      get id() { return id; },
      get tileIndex() { return tileIndex; },
      get terrace() { return terrace; }
    };
  }

  return { create };
})();

// ===== CELLA: s4ChartFrameUi =====
// -- CELLA: s4ChartFrameUi --
// Aggiornamento DOM per-frame dei soli indicatori che cambiano con la molla del rilievo.
const s4ChartFrameUi = (() => {
  function update({reliefBtn, lodLabel, roleButtons, roleFilter, roleOrder, roleColors, diagramOpenedOnce, tiltTarget, focalizer, inkColor, bgColor, cache}) {
    if (reliefBtn) {
      const key = `${diagramOpenedOnce ? 1 : 0}:${tiltTarget > 0 ? 1 : 0}`;
      if (key !== cache.lastReliefButtonKey) {
        cache.lastReliefButtonKey = key;
        const enabled = diagramOpenedOnce;
        reliefBtn.disabled = !enabled;
        reliefBtn.style.opacity = enabled ? "0.72" : "0.45";
        reliefBtn.style.background = tiltTarget > 0 ? inkColor : bgColor;
        reliefBtn.style.color = tiltTarget > 0 ? bgColor : inkColor;
      }
    }
    if (lodLabel) {
      // Con un personaggio la terrazza e' un'occorrenza; altrimenti e' una banda logaritmica.
      const activeRoles = roleOrder.filter((_, i) => roleFilter?.[i]);
      const filteredRoles = roleFilter && activeRoles.length < roleOrder.length;
      const baseText = focalizer != null ? "una terrazza = un'occorrenza" : "una terrazza = banda di occorrenze";
      const nextText = tiltTarget > 0
        ? (filteredRoles ? `${baseText} · filtro: ${activeRoles.join(", ")}` : baseText)
        : "";
      if (nextText !== cache.lastLodLabelText) {
        cache.lastLodLabelText = nextText;
        lodLabel.textContent = nextText;
      }
    }
    if (roleButtons && roleFilter && roleOrder) {
      const key = roleFilter.map(v => v ? 1 : 0).join("");
      if (key !== cache.lastRoleLegendKey) {
        cache.lastRoleLegendKey = key;
        roleButtons.forEach((button, i) => {
          const active = !!roleFilter[i];
          const swatch = button.querySelector("span:first-child");
          const label = button.querySelector("span:last-child");
          if (swatch) swatch.style.background = active ? (roleColors[roleOrder[i]] || inkColor) : "transparent";
          if (label) label.style.opacity = active ? "1" : "0.4";
          button.style.opacity = "1";
          button.style.cursor = "pointer";
        });
      }
    }
  }

  return { update };
})();

// ===== CELLA: s4ChartMapBackdrop =====
// -- CELLA: s4ChartMapBackdrop --
// Anelli metrici, confini delle celle e cerchi dei referenziali fuori mappa.
const s4ChartMapBackdrop = (() => {
  function radiusForDistance(dKm, rings) {
    if (!rings.length) return null;
    let prevD = 0, prevR = 0;
    for (const ring of rings) {
      const maxD = d3.max(ring.items, it => it.distanceKm);
      if (maxD == null) continue;
      if (dKm <= maxD) {
        const t = maxD > prevD ? (dKm - prevD) / (maxD - prevD) : 1;
        return prevR + (ring.radius - prevR) * t;
      }
      prevD = maxD;
      prevR = ring.radius;
    }
    return null;
  }

  function draw({
    context, PROFILE, crimpEased, activeRanked, chapter, METRIC_ISOLINES_KM,
    invK, cogCenter, cogScaleDyn, GRID_COLOR, GRID_ALPHA, RING_GUIDE_ALPHA,
    RING_GUIDE_WIDTH, BORDER_WIDTH, segments, nearDrop, deform, cellRings,
    N_INMAP, N_GEO, fictBirthEased, birthEased, BIRTH_EPSILON, isBorn,
    contentAlpha, cellPoint, displayPts, cognitiveTileRadius, displayCellScale, offmapPresence
  }) {
    let metricTicks = [];
    if (crimpEased > 0.01) {
      context.save();
      const ringsArr = activeRanked[chapter].rings;
      context.setLineDash([3 * invK, 7 * invK]);
      context.lineWidth = RING_GUIDE_WIDTH * 0.7 * invK;
      for (const dKm of METRIC_ISOLINES_KM) {
        const rMetric = radiusForDistance(dKm, ringsArr);
        if (rMetric == null) continue;
        metricTicks.push({dKm, rMetric});
        const rDraw = rMetric * cogScaleDyn;
        context.strokeStyle = `rgba(${GRID_COLOR},${RING_GUIDE_ALPHA * 0.58 * crimpEased})`;
        context.beginPath();
        context.arc(cogCenter[0], cogCenter[1], rDraw, 0, Math.PI * 2);
        context.stroke();
      }
      context.setLineDash([]);
      context.restore();
    }

    const profileBordersT0 = PROFILE ? performance.now() : 0;
    if (crimpEased <= 0.01) {
      context.beginPath();
      for (const {poly, bbox: pbbox} of segments){
        const near = nearDrop(pbbox);
        const p0 = near ? deform(poly[0][0],poly[0][1]) : poly[0]; context.moveTo(p0[0],p0[1]);
        for (let i=1;i<poly.length;i++){ const p = near ? deform(poly[i][0],poly[i][1]) : poly[i]; context.lineTo(p[0],p[1]); }
      }
      context.lineWidth=BORDER_WIDTH*invK;
      context.strokeStyle=`rgba(${GRID_COLOR},${GRID_ALPHA})`;
      context.lineJoin="round";
      context.lineCap="round";
      context.stroke();
    } else {
      context.lineWidth=BORDER_WIDTH*invK;
      context.lineJoin="round";
      context.lineCap="round";
      for (let i=0;i<cellRings.length;i++){
        const cr = cellRings[i];
        if (!cr || !cr.ring || cr.ring.length < 3) continue;
        if (i >= N_GEO && fictBirthEased[i] <= BIRTH_EPSILON) continue;
        if (!isBorn(i, chapter) && birthEased[i] <= BIRTH_EPSILON) continue;
        const entering = birthEased[i] < 0.999;
        const visible = i >= N_GEO ? fictBirthEased[i] : (entering ? birthEased[i] : 1);
        const cellAlpha = 0.42 * contentAlpha(i, {presence: visible, crimp: true});
        if (cellAlpha <= 0.001) continue;
        context.beginPath();
        const p0 = cellPoint(i, cr.ring[0][0], cr.ring[0][1], true);
        context.moveTo(p0[0], p0[1]);
        for (let j=1;j<cr.ring.length;j++){
          const p = cellPoint(i, cr.ring[j][0], cr.ring[j][1], true);
          context.lineTo(p[0], p[1]);
        }
        context.closePath();
        context.strokeStyle=`rgba(${GRID_COLOR},${cellAlpha})`;
        context.stroke();
      }
    }

    if (crimpEased > 0.01) {
      context.save();
      context.lineWidth = BORDER_WIDTH * invK;
      context.setLineDash([]);
      const offmapAlpha = offmapPresence();
      for (let i = N_INMAP; i < N_GEO; i++) {
        if (birthEased[i] <= BIRTH_EPSILON) continue;
        if (offmapAlpha <= BIRTH_EPSILON) continue;
        const r = cognitiveTileRadius[i] * displayCellScale[i];
        context.beginPath();
        const [cx, cy] = displayPts[i];
        context.arc(cx, cy, r, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${GRID_COLOR},${0.42 * contentAlpha(i, {presence: birthEased[i], crimp: true})})`;
        context.stroke();
      }
      context.restore();
    }
    return {metricTicks, profileBordersMs: PROFILE ? performance.now() - profileBordersT0 : 0};
  }

  return { draw };
})();

// ===== CELLA: s4GhostSlotsOverlay =====
// -- CELLA: s4GhostSlotsOverlay --
// Overlay diagnostico dei ghost slots; non modifica la geometria principale.
const s4GhostSlotsOverlay = (() => {
  function draw({
    context, PROFILE, SHOW_GHOST_SLOTS, crimpEased, chapter,
    ghostSlotsLoggedChapter, ghostSlots, primaryHostOf, fictBirthEased, birthEased,
    contentAlpha, BIRTH_EPSILON, allData, birthChapter,
    cogCenter, cogScaleDyn, displayPts, invK, BORDER_WIDTH, GRID_COLOR
  }) {
    if (!(SHOW_GHOST_SLOTS && crimpEased > 0.01)) return {ghostSlotsLoggedChapter};
    if (PROFILE && ghostSlotsLoggedChapter !== chapter) {
      ghostSlotsLoggedChapter = chapter;
      console.table(
        [...ghostSlots.entries()].flatMap(([i, slots]) =>
          slots.map(slot => {
            const slotHost = slot.host;
            const primaryHost = primaryHostOf[i];
            const fictFactor = fictBirthEased[i];
            const slotHostFactor = birthEased[slotHost];
            const primaryHostFactor = primaryHost == null ? 0 : birthEased[primaryHost];
            const crimpFactor = crimpEased;
            return {
              toponimo: allData[i].properties.Toponym,
              hostSlot: slotHost == null ? null : allData[slotHost]?.properties.Toponym,
              hostPrimario: primaryHost == null ? null : allData[primaryHost].properties.Toponym,
              birthChapterHostSlot: slotHost == null ? null : birthChapter[slotHost],
              birthChapterHostPrimario: primaryHost == null ? null : birthChapter[primaryHost],
              fictBirthEased: +fictFactor.toFixed(4),
              slotHostBirthEased: Number.isFinite(slotHostFactor) ? +slotHostFactor.toFixed(4) : slotHostFactor,
              primaryHostBirthEased: Number.isFinite(primaryHostFactor) ? +primaryHostFactor.toFixed(4) : primaryHostFactor,
              crimpEased: +crimpFactor.toFixed(4)
            };
          })
        )
      );
    }
    for (const [i, slots] of ghostSlots) {
      for (const slot of slots) {
        const slotHost = slot.host;
        const primaryHost = primaryHostOf[i];
        const vis = fictBirthEased[i]
          * birthEased[slotHost]
          * (primaryHost == null ? 0 : birthEased[primaryHost])
          * contentAlpha(i, {crimp: true});
        if (!Number.isFinite(vis)) {
          context.setLineDash([]);
          continue;
        }
        if (vis <= BIRTH_EPSILON) {
          context.setLineDash([]);
          continue;
        }
        const polygon = slot.polygon.map(p => [
          cogCenter[0] + p[0] * cogScaleDyn,
          cogCenter[1] + p[1] * cogScaleDyn
        ]);
        const slotPt = [
          cogCenter[0] + slot.pt[0] * cogScaleDyn,
          cogCenter[1] + slot.pt[1] * cogScaleDyn
        ];
        context.save();
        context.beginPath();
        polygon.forEach(([x, y], k) => k ? context.lineTo(x, y) : context.moveTo(x, y));
        context.closePath();
        context.setLineDash([2.5 * invK, 3 * invK]);
        context.lineWidth = BORDER_WIDTH * 0.6 * invK;
        context.strokeStyle = `rgba(${GRID_COLOR},${0.30 * vis})`;
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.setLineDash([2 * invK, 5 * invK]);
        context.moveTo(slotPt[0], slotPt[1]);
        context.lineTo(displayPts[i][0], displayPts[i][1]);
        context.lineWidth = 0.5 * invK;
        context.strokeStyle = `rgba(${GRID_COLOR},${0.24 * vis})`;
        context.stroke();
        context.setLineDash([]);
        context.restore();
      }
    }
    return {ghostSlotsLoggedChapter};
  }

  return { draw };
})();

// ===== CELLA: context2d =====
const context2d = (width, height, dpi = devicePixelRatio) => {
  const canvas = document.createElement("canvas");
  canvas.width = width * dpi;
  canvas.height = height * dpi;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const context = canvas.getContext("2d");
  context.scale(dpi, dpi);
  return context;
};

// ===== CELLA: chartS4 =====
  // -- CELLA FINALE: chartS4 --
  const chartS4 = (() => {
  const {
    BG_COLOR, HUE_RGB, FICT_HUE_RGB, ISO_ALPHA, ISO_WIDTH, ISO_FILL, ISO_FILL_A0, ISO_FILL_A1, ISO_FILL_GAMMA, GRID_COLOR, GRID_ALPHA, SHOW_GHOST_SLOTS, PROFILE,
    FOCAL_DIM_ALPHA, FOCAL_DIM_MORPH, FOCAL_HIDE,
    SEQ_FOLLOW_FOCALIZER, SEQ_PLAY_MS, SEQ_ENABLED_IN_MAP, SEQ_MORPH_SCALE, CONSTELLATION_FLOOR, CONSTELLATION_DECAY,
    GAP_MIN, SEQ_BLOCK_DELTA,
    ROUTE_HOVER_MORPH,
    ROLE_SORT_MORPH,
    RING_GUIDE_ALPHA, RING_GUIDE_WIDTH, INK_COLOR,
    K2, ZOOM_MIN, ZOOM_MAX,
    ISO_INNER, ISO_OUTER, ISO_MIN_SPACING,
    SPRING, S_STIFF, S_DAMP, STRENGTH, RADIUS,
    DOT_RADIUS, BORDER_WIDTH, GLOW_WIDTH, GLOW_BLUR, ROMA_WIDTH, LABEL_SIZE,
    N_CHAPTERS, MORPH, PULSE_R, PLAY_MS,
    CRIMP_MORPH, BIRTH_MORPH, BIRTH_EPSILON,
    LAYOUT_MORPH_SLOW, LAYOUT_MORPH_FAST,
    FICT_CRIMP_THRESHOLD, FICT_RELIEF_ALPHA,
    DIAG_SCREEN_FRAC
  } = s4Config;
  const METRIC_ISOLINES_KM = s4Config.METRIC_ISOLINES_KM;
  const INFLUENCE_RADIUS = RADIUS * 3; // usato solo da nearDrop per il bbox-test dei segmenti condivisi;
                                        // deform() si annulla gia' oltre RADIUS (falloff compatto)

  const { geoData, allData, N_INMAP, N_GEO } = s4Entities;
  const { pts, bbox, width, height, cogCenterInit, geographicAngle, poleDistanceKm, poleIndex } = s4Projection;
  const { segments, cellRings: baseCellRings, normalizedCellScale: baseNormalizedCellScale, cognitiveTileRadius: baseCognitiveTileRadius } = s4Voronoi;
  const { narrativeCellRings, narrativeTileRadius, ghostSlots } = s4NarrativeCells;
  const cellRings = baseCellRings.map((cr, i) => narrativeCellRings[i] || cr);
  const cognitiveTileRadius = baseCognitiveTileRadius.map((r, i) => narrativeCellRings[i] ? narrativeTileRadius[i] : r);
  const normalizedCellScale = baseNormalizedCellScale.map((s, i) => narrativeCellRings[i] ? 1 : s);
  const { birthChapter, isBorn, bandsFor, BANDS_MAX } = s4Chapters;
  const { primaryHostOf } = s4Satellites;
  const { agents: terrainAgents, occAt } = s4Terrain;
  const { rankedRadialByChapter, rankedRadialFullByChapter, extentBase } = s4RadialLayout;
  const { isoProfile, isoProfileMin, isoProfileMed, traceIsoline } = s4IsoEngine;
  const {
    sequence, sequenceByAgent, chapterOfCursor, occUpTo, birthPos, lastPosByChapter,
    roleStack, rolePosStack, roleLen, BANDS_CAP: SEQ_BANDS_CAP
  } = s4Sequence;
  const seqAllPositions = sequence.map(d => d.pos);
  const { routeRgb } = s4AttestedRoutes;

  const context = context2d(width, height);
  const canvas = context.canvas;
  const painters = s4Painters.makePainters(context);
  const interaction = s4Interaction;
  const baseTransform = context.getTransform();
  function bandsOfTile(i) {
    return s4ChartSupport.bandsOfTile({i, occEased, focalizer, BANDS_MAX, bandsFor});
  }
  const geoPath = d3.geoPath(projection, context);

  let cogCenter = cogCenterInit.slice();
  let rotPivot = cogCenter.slice();

  function baseWorldPt(i) {
    return s4ChartSupport.baseWorldPt({i, N_GEO, pts, cogCenter});
  }

  let displayPts = allData.map((d, i) => i < pts.length ? pts[i].slice() : cogCenterInit.slice());
  let displayCellScale = cellRings.map(() => 1);
  let profileFrame = 0;
  let profileTickMs = 0, profileHitMs = 0;
  let lastHitState = null;
  const drawDepthKey = cellRings.map(() => 0);
  let diagramScaleBaseK = 1;    // zoom congelato all'apertura: da li' in poi il diagramma puo' ingrandirsi
  let lastCogScaleDyn = 1;
  let mapTransformBeforeDiagram = null;
  let pendingRestoreMapCamera = false;

  // -- stato zoom --
  let transform = d3.zoomIdentity; // k=1 = vista iniziale adattata al bbox
  let rotPivotSyncing = false;

  // stato della goccia (i parametri SPRING/S_STIFF/S_DAMP/STRENGTH/RADIUS sono in s4Config)
  const drop = { x:-1e4, y:-1e4, tx:-1e4, ty:-1e4, s:0, ts:0, vs:0 };

  let effRadius = RADIUS, effInfluence = INFLUENCE_RADIUS;

  function deform(px, py){
    if (tiltEased > 0.01) return [px, py];
    return s4ChartSupport.deformPoint({px, py, drop, effRadius, transform, crimpEased});
  }

  function nearDrop(bbox){
    if (tiltEased > 0.01) return false;
    return s4ChartSupport.nearDropBBox({box: bbox, drop, effInfluence});
  }

  let hostIndex = -1;
  let terraceCurveCache = {index: -1, curves: null, tiltNow: 1, rotSinNow: 0, rotCosNow: 1, zScale: 1, invK: 1};
  let hoverTerrace = -1;
  const logPickDiagnostics = s4LodPicking.makePickLogger({PROFILE, painters});

  let chapter = 1;                 
  let occEased = allData.map(() => 0);
  let birthEased = allData.map(() => 0); // presenza cumulativa nel layout cognitivo
  let focalEased = allData.map(() => 1);
  let fictBirthEased = allData.map(() => 0);

  let layoutPtsEased = allData.map((d, i) => baseWorldPt(i));
  let gravRamp = allData.map(() => 1);

  const STAGES = [
    "map2d",
    "diagram2d",
    "diagram2d_fict",
    "diagram_axon",
    "map_axon"
  ];
  const STAGE_LABELS = {
    map2d: "Mappa di Roma",
    diagram2d: "Mappa del Pasticciaccio",
    diagram2d_fict: "Mappa del Pasticciaccio",
    diagram_axon: "Rilievo Narrativo",
    map_axon: "Rilievo Narrativo"
  };
  let stage = "map2d";       // stato canonico della sequenza STAGES
  let diagramOpenedOnce = false;
  let crimpTarget = 0;        // 0 = geografico, 1 = cognitivo
  let crimpEased = 0;         // molla, come occEased
  const TILT_REST = 0.75;     // schiacciamento y a riposo nello stato 3
  const TILT_MORPH = 0.05;
  let tiltTarget = 0;         // 0 = pianta, TILT_REST = assonometria
  let tiltEased = 0;          // molla, stessa logica di crimpEased
  let tiltNow = 1;            // scala y effettiva del frame corrente
  let planRot = 0;            // rotazione della pianta, radianti
  let focalizer = null;       // null = vista "tutti" (misura del piano)
  let seqMode = false;        // false = timeline capitoli; true = timeline sequenziale per riferimento
  let seqPos = 0;             // posizione ordinale globale dentro s4Sequence.sequence
  // occSeq e' il buffer riusato restituito da occUpTo: si aggiorna solo quando
  // cambiano seqPos, focalizer o seqMode, mai per frame.
  let occSeq = new Float32Array(allData.length);
  const occSeqBuf = new Float32Array(allData.length);
  let seqOccDirty = true;
  const roleBands = s4RoleBands.create({
    allDataLength: allData.length,
    roleCap: SEQ_BANDS_CAP,
    bandsMax: BANDS_MAX,
    bandsLogBase: s4Chapters.BANDS_LOG_BASE
  });
  let roleSortTarget = 0;
  let roleSortEased = 0;
  let lodTarget = 0;
  let lodEased = 0;
  const routeSelection = s4ChartRouteSelection.create({
    getFocalizer: () => focalizer,
    getLodEased: () => lodEased,
    getHostIndex: () => hostIndex,
    getHoverTerrace: () => hoverTerrace,
    getRoleSortTarget: () => roleSortTarget,
    roleBands,
    sequence,
    routeIdByReferenceId: s4AttestedRoutes.routeIdByReferenceId
  });
  let seqOccCalls = 0;
  let seqOccWindowT0 = performance.now();
  let seqOccCallsPerSecond = 0;
  let mapBtn = null, pasticciaccioBtn = null, reliefBtn = null;
  let seqModeToggle = null, seqChapterBtn = null, seqPageBtn = null, orderBtn = null, seqSlider = null, seqLabel = null, roleLegend = null, roleButtons = null;
  let legendRow = null, lodLabel = null;
  let pageRibbon = null, pageRibbonShell = null, ribbonPrevBtn = null, ribbonNextBtn = null;
  let currentRibbonTick = null;
  let routeHotSet = new Set(), routeHoverRoutes = [], routeHoverEased = 0;
  let ribbonStateKey = "";
  let stagePrevBtn = null, stageNextBtn = null, stageLabel = null;
  const frameUiCache = {lastReliefButtonKey: "", lastLodLabelText: null};
  let playing = false;
  let playTimer = null;
  let showFictitious = false;   // gate del secondo bottone "luoghi narrativi"
  const roleFilter = s4Config.ROLE_ORDER.map(() => true);
  let fictSpawnPt = allData.map(() => null); // punto di riposo world-space (angolo viewport piu' vicino) per i fittizi assenti
  let ghostSlotsLoggedChapter = null;
  // Layout radiale attivo: solo referenziali oppure referenziali e fittizi.
  let activeRanked = rankedRadialByChapter;
  const t0 = performance.now();          // clock monotono per la fase del pulse

  function interactionFrame() {
    const rotNow = tiltEased > 0.01 ? planRot : 0;
    return {
      transform,
      cogCenter,
      rotPivot,
      crimpEased,
      tiltEased,
      tiltNow,
      planRot,
      displayPts,
      displayCellScale,
      birthEased,
      fictBirthEased,
      rotSinNow: Math.sin(rotNow),
      rotCosNow: Math.cos(rotNow),
      // Il picking usa la quota nel piano precedente alla compressione verticale.
      zStep: s4Painters.AXON_Z_STEP
             * (1 + (lastCogScaleDyn - 1) * crimpEased)
             * (tiltEased >= 0.999 ? 1 : tiltEased)
             / Math.max(0.001, tiltNow)
    };
  }

  function focalAlpha(i) {
    return s4ChartSupport.focalAlpha(focalEased, i);
  }

  function offmapPresence() {
    return s4ChartSupport.offmapPresence(crimpEased, FICT_CRIMP_THRESHOLD);
  }

  function routeAlphaOf(i) {
    if (routeHoverEased <= 0.01 || routeHotSet.size === 0) return 1;
    if (routeHotSet.has(i)) return 1;
    return 1 - (1 - FOCAL_DIM_ALPHA) * routeHoverEased;
  }

  function contentAlpha(i, opts = {}) {
    const offmap = i >= N_INMAP && i < N_GEO;
    const presence = opts.presence == null ? 1 : opts.presence;
    const crimp = opts.crimp ? crimpEased : 1;
    return presence * crimp * focalAlpha(i) * routeAlphaOf(i) * (offmap ? offmapPresence() : 1);
  }

  function alphaBucket(alpha) {
    return s4ChartSupport.alphaBucket(alpha);
  }

  function clamp01(v) {
    return s4ChartSupport.clamp01(v);
  }

  function seqPage(row) {
    return s4ChartSupport.seqPage(row);
  }

  function effRoleName(row) {
    return s4ChartSupport.effRoleName(row);
  }

  function effRoleIdx(row) {
    return s4ChartSupport.effRoleIdx(row, s4Config.ROLE_ORDER);
  }

  function roleMaskComplete() {
    return roleFilter.every(Boolean);
  }

  function activeRoleMask() {
    return focalizer != null && !roleMaskComplete() ? roleFilter : null;
  }

  function roleAllowed(row) {
    const mask = activeRoleMask();
    if (!mask) return true;
    const idx = effRoleIdx(row);
    return idx >= 0 && mask[idx];
  }

  function openDiagramCameraIfNeeded() {
    if (crimpTarget > 0.5 || crimpEased > 0.02) return;
    mapTransformBeforeDiagram = transform;
    pendingRestoreMapCamera = false;
    diagramScaleBaseK = transform.k;
    zoomBehavior.scaleExtent([diagramScaleBaseK * ZOOM_MIN, diagramScaleBaseK * ZOOM_MAX]);
    cogCenter = interaction.viewportCenterWorld(interactionFrame());
    setRotPivot(cogCenter.slice());
    const openInteractionFrame = interactionFrame();
    const viewportRadiusWorld = Math.min(width, height) / 2 / transform.k;
    const gravDist = allData.map((d, i) => i < N_GEO
      ? Math.hypot(pts[i][0] - cogCenter[0], pts[i][1] - cogCenter[1])
      : 0);
    gravRamp = gravDist.map(d => Math.min(1, d / viewportRadiusWorld));
    for (let i = N_INMAP; i < N_GEO; i++) {
      layoutPtsEased[i] = interaction.spawnPointAlongAzimuth(openInteractionFrame, geographicAngle[i]);
    }
  }

  function syncStageLabel() {
    stage = crimpTarget > 0.5
      ? (tiltTarget > 0 ? "diagram_axon" : (showFictitious ? "diagram2d_fict" : "diagram2d"))
      : (tiltTarget > 0 ? "map_axon" : "map2d");
  }

  function applyStage(nextStage) {
    routeSelection.clear();
    if (nextStage === "diagram2d" || nextStage === "diagram2d_fict" || nextStage === "diagram_axon") {
      diagramOpenedOnce = true;
      openDiagramCameraIfNeeded();
      crimpTarget = 1;
    } else if (nextStage === "map2d" || nextStage === "map_axon") {
      crimpTarget = 0;
      pendingRestoreMapCamera = true;
    }
    if (nextStage === "diagram_axon" || nextStage === "map_axon") tiltTarget = TILT_REST;
    else if (nextStage === "diagram2d" || nextStage === "diagram2d_fict" || nextStage === "map2d") tiltTarget = 0;
    if (nextStage === "diagram2d_fict") showFictitious = true;
    else if (nextStage === "diagram2d") showFictitious = false;
    syncStageLabel();
    updateSeqUi();
  }

  function moveStage(delta) {
    const idx = Math.max(0, STAGES.indexOf(stage));
    const next = STAGES[(idx + delta + STAGES.length) % STAGES.length];
    applyStage(next);
  }

  function seqTrack() {
    if (SEQ_FOLLOW_FOCALIZER && focalizer != null) return sequenceByAgent.get(focalizer) || [];
    return seqAllPositions;
  }

  function seqEnabledNow() {
    return SEQ_ENABLED_IN_MAP || crimpEased > 0.99;
  }

  function freezeRotPivot() {
    setRotPivot((drop.s > 0.5 && hostIndex >= 0 && displayPts[hostIndex])
      ? displayPts[hostIndex].slice()
      : interaction.viewportCenterWorld(interactionFrame()));
  }

  function setRotPivot(next) {
    if (!next) return;
    const dx = next[0] - rotPivot[0], dy = next[1] - rotPivot[1];
    if (dx || dy) {
      const rotNow = tiltEased > 0.01 ? planRot : 0;
      const tiltNow = 1 - (1 - TILT_REST) * tiltEased;
      const cos = Math.cos(rotNow), sin = Math.sin(rotNow);
      const mdx = cos * dx - sin * dy;
      const mdy = tiltNow * (sin * dx + cos * dy);
      const deltaX = dx - mdx, deltaY = dy - mdy;
      const nextTransform = d3.zoomIdentity
        .translate(transform.x - transform.k * deltaX, transform.y - transform.k * deltaY)
        .scale(transform.k);
      transform = nextTransform;
      rotPivotSyncing = true;
      try {
        d3.select(canvas).call(zoomBehavior.transform, nextTransform);
      } finally {
        rotPivotSyncing = false;
      }
    }
    rotPivot = next.slice();
    lastHitState = null;
  }

  function nearestSeqPos(targetPos, track = seqTrack()) {
    if (!track.length) return Math.max(0, Math.min(sequence.length - 1, Math.floor(targetPos || 0)));
    let best = track[0], bestD = Math.abs(track[0] - targetPos);
    for (const p of track) {
      const d = Math.abs(p - targetPos);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  function seqTrackIndex(pos = seqPos, track = seqTrack()) {
    if (!track.length) return 0;
    let bestJ = 0, bestD = Math.abs(track[0] - pos);
    for (let j = 1; j < track.length; j++) {
      const d = Math.abs(track[j] - pos);
      if (d < bestD) { bestD = d; bestJ = j; }
    }
    return bestJ;
  }

  function lastSeqPosOfChapter(c) {
    let best = 0;
    for (const row of sequence) {
      if ((Number(row.chapter) || 1) <= c) best = row.pos;
      else break;
    }
    return best;
  }

  function firstSeqPosOfChapter(c, track = seqAllPositions) {
    for (const pos of track) {
      const row = sequence[pos];
      if (row && (Number(row.chapter) || 1) === c && roleAllowed(row)) return pos;
    }
    return -1;
  }

  function seqChapterTarget(direction) {
    const track = seqTrack();
    if (!track.length) return -1;
    for (let c = chapter + direction; c >= 1 && c <= N_CHAPTERS; c += direction) {
      const pos = firstSeqPosOfChapter(c, track);
      if (pos >= 0) return pos;
    }
    return -1;
  }

  function moveSeqChapter(direction) {
    const pos = seqChapterTarget(direction);
    if (pos >= 0) setSeqPos(pos);
  }

  function setSeqPos(pos) {
    const next = nearestSeqPos(pos);
    if (next !== seqPos) seqOccDirty = true;
    routeSelection.clear();
    seqPos = next;
    chapter = chapterOfCursor(seqPos);
    if (slider) { slider.value = chapter; chLabel.textContent = String(chapter); }
    updateSeqUi();
  }

  function rebuildRolePermutations() {
    roleBands.rebuild({
      roleStack, rolePosStack, roleCounts: roleLen,
      roleOrder: s4Config.ROLE_ORDER,
      linear: focalizer != null
    });
  }

  function rebuildRoleBadges() {
    const cursorPos = seqMode ? seqPos : (lastPosByChapter[chapter] ?? -1);
    roleBands.rebuildRecency({
      focalizer,
      cursorPos,
      cursorChapter: chapter,
      track: seqTrack(),
      sequence,
      effRoleIdx,
      rowAllowed: roleAllowed
    });
  }

  function logRoleStratigraphy() {
    if (!PROFILE) return;
    console.table(
      d3.range(allData.length)
        .filter(i => roleBands.bandCountOf[i] > 0)
        .sort((a, b) => d3.descending(roleBands.bandCountOf[a], roleBands.bandCountOf[b]))
        .slice(0, 6)
        .map(i => ({
          toponimo: allData[i].properties.Toponym,
          occorrenze: roleBands.occCountOf[i],
          terrazze: roleBands.bandCountOf[i],
          stratigrafia: Array.from({length: roleBands.bandCountOf[i]}, (_, k) => {
            const r = roleBands.bandRoleChrono[i * BANDS_MAX + k];
            return r >= 0 ? s4Config.ROLE_ORDER[r] : "-";
          }).join(" -> ")
        }))
    );
  }

  function refreshOccSeq() {
    if (!seqMode) {
      if (focalizer == null || !seqOccDirty) return;
      occSeqBuf.set(occUpTo(lastPosByChapter[chapter], focalizer, activeRoleMask()));
      occSeq = occSeqBuf;
      rebuildRolePermutations();
      logRoleStratigraphy();
      rebuildRoleBadges();
      seqOccDirty = false;
      return;
    }
    if (!seqOccDirty) return;
    occSeqBuf.set(occUpTo(seqPos, focalizer, activeRoleMask()));
    occSeq = occSeqBuf;
    rebuildRolePermutations();
    logRoleStratigraphy();
    rebuildRoleBadges();
    seqOccDirty = false;
    seqOccCalls++;
    const now = performance.now();
    if (now - seqOccWindowT0 >= 1000) {
      seqOccCallsPerSecond = seqOccCalls * 1000 / (now - seqOccWindowT0);
      seqOccCalls = 0;
      seqOccWindowT0 = now;
    }
  }

  function toggleRoleFilter(roleIndex) {
    if (!(roleIndex >= 0 && roleIndex < roleFilter.length)) return;
    if (roleFilter[roleIndex] && roleFilter.filter(Boolean).length <= 1) return;
    roleFilter[roleIndex] = !roleFilter[roleIndex];
    seqOccDirty = true;
    ribbonStateKey = "";
    if (!roleFilter[s4Config.ROLE_ORDER.indexOf("Route")]) routeSelection.clear();
    refreshOccSeq();
    updateSeqUi();
  }

  function refreshSeqOccRate() {
    if (!PROFILE) return;
    const now = performance.now();
    if (now - seqOccWindowT0 >= 1000) {
      seqOccCallsPerSecond = seqOccCalls * 1000 / (now - seqOccWindowT0);
      seqOccCalls = 0;
      seqOccWindowT0 = now;
    }
  }

  function updateSeqUi() {
    if (!seqChapterBtn || !seqPageBtn) return;
    const seqEnabled = seqEnabledNow();
    const roleModeNow = focalizer != null;
    if (!seqEnabled && seqMode) {
      seqMode = false;
      chapter = chapterOfCursor(seqPos);
      if (slider) { slider.value = chapter; chLabel.textContent = String(chapter); }
      seqOccDirty = true;
      if (playing && playTimer) { playing = false; btn.textContent = PLAY_ICON; clearInterval(playTimer); playTimer = null; }
    }
    seqModeToggle.style.opacity = seqEnabled ? "1" : "0.45";
    seqPageBtn.disabled = !seqEnabled;
    seqChapterBtn.disabled = false;
    seqChapterBtn.style.background = seqMode ? BG_COLOR : INK_COLOR;
    seqChapterBtn.style.color = seqMode ? INK_COLOR : BG_COLOR;
    seqPageBtn.style.background = seqMode ? INK_COLOR : BG_COLOR;
    seqPageBtn.style.color = seqMode ? BG_COLOR : INK_COLOR;
    seqSlider.style.display = seqMode ? "" : "none";
    seqLabel.style.display = seqMode ? "" : "none";
    slider.style.display = seqMode ? "none" : "";
    chLabel.style.display = seqMode ? "none" : "";
    const track = seqTrack();
    seqSlider.min = 0;
    seqSlider.max = Math.max(0, track.length - 1);
    seqSlider.disabled = !seqMode || !track.length;
    seqSlider.value = seqTrackIndex(seqPos, track);
    const row = sequence[seqPos];
    seqLabel.textContent = row ? `p. ${row.page} (cap. ${chapterOfCursor(seqPos)})` : "p. - (cap. -)";
    if (stageLabel) {
      const pos = Math.max(0, STAGES.indexOf(stage)) + 1;
      stageLabel.textContent = `${pos}/${STAGES.length} · ${STAGE_LABELS[stage] || stage}`;
    }
    if (mapBtn) {
      const hot = crimpTarget <= 0.5;
      mapBtn.style.background = hot ? INK_COLOR : BG_COLOR;
      mapBtn.style.color = hot ? BG_COLOR : INK_COLOR;
    }
    if (pasticciaccioBtn) {
      const hot = crimpTarget > 0.5;
      pasticciaccioBtn.style.background = hot ? INK_COLOR : BG_COLOR;
      pasticciaccioBtn.style.color = hot ? BG_COLOR : INK_COLOR;
    }
    const reliefOn = tiltTarget > 0;
    const rotLabel = rotSlider?.previousElementSibling;
    if (rotLabel) rotLabel.style.display = reliefOn ? "" : "none";
    if (rotSlider) rotSlider.style.display = reliefOn ? "" : "none";
    if (orderBtn) {
      if (!roleModeNow) roleSortTarget = 0;
      orderBtn.style.display = reliefOn ? "" : "none";
      orderBtn.disabled = !roleModeNow || !reliefOn;
      orderBtn.style.opacity = roleModeNow && reliefOn ? "1" : "0.45";
      orderBtn.textContent = roleSortTarget > 0.5 ? "ordine: per ruolo" : "ordine: cronologico";
    }
    if (roleLegend) roleLegend.style.display = roleModeNow ? "flex" : "none";
    if (legendRow) legendRow.style.display = roleModeNow ? "flex" : "none";
    if (lodLabel) lodLabel.style.display = reliefOn ? "" : "none";
    updatePageRibbon();
    if (ribbonPrevBtn) {
      const enabled = seqMode && seqChapterTarget(-1) >= 0;
      ribbonPrevBtn.disabled = !enabled;
      ribbonPrevBtn.style.opacity = enabled ? "0.95" : "0.35";
      ribbonPrevBtn.style.cursor = enabled ? "pointer" : "default";
    }
    if (ribbonNextBtn) {
      const enabled = seqMode && seqChapterTarget(1) >= 0;
      ribbonNextBtn.disabled = !enabled;
      ribbonNextBtn.style.opacity = enabled ? "0.95" : "0.35";
      ribbonNextBtn.style.cursor = enabled ? "pointer" : "default";
    }
    if (stagePrevBtn && stageNextBtn) {
      stagePrevBtn.disabled = !diagramOpenedOnce && stage === "map2d";
      stageNextBtn.disabled = false;
    }
  }

  function updatePageRibbon() {
    if (!pageRibbon) return;
    const rows = seqAllPositions
      .map(pos => sequence[pos])
      .filter(row => {
        if (!row || seqPage(row) == null) return false;
        const c = Number(row.chapter) || 1;
        return seqMode && c === chapter && roleAllowed(row);
      });
    const roleMaskKey = activeRoleMask() ? roleFilter.map(v => v ? 1 : 0).join("") : "all";
    const result = s4PageRibbon.update({
      pageRibbon, pageRibbonWrap: pageRibbonShell, seqMode, rows, stateKey: ribbonStateKey, chapter, focalizer, seqPos,
      width, inkColor: INK_COLOR, roleColors: s4Config.ROLE_COLORS,
      gapMin: GAP_MIN, blockDelta: SEQ_BLOCK_DELTA,
      seqPage, effRoleName, setSeqPos, focalDimAlpha: FOCAL_DIM_ALPHA,
      allData, roleMaskKey
    });
    if (!result.unchanged) {
      ribbonStateKey = result.stateKey;
      currentRibbonTick = result.currentRibbonTick;
    }
  }

  function draw(){
    const profileT0 = PROFILE ? performance.now() : 0;
    let profileTiles = 0, profileCurves = 0, profileFills = 0, profileStrokes = 0;
    let profileDisplayMs = 0, profileDrawOrderMs = 0, profileReliefMs = 0, profileBordersMs = 0, profileRulerMs = 0;
    const invK = 1 / transform.k;
    tiltNow = 1 - (1 - TILT_REST) * tiltEased;
    effRadius = RADIUS * invK;
    effInfluence = INFLUENCE_RADIUS * invK;
    const shortSide = Math.min(width, height);
    const cogScaleDyn = (DIAG_SCREEN_FRAC * shortSide) / (2 * extentBase * diagramScaleBaseK);
    lastCogScaleDyn = cogScaleDyn;
    const zScaleNow = 1 + (cogScaleDyn - 1) * crimpEased;
    const zScaleDraw = tiltEased >= 0.999 ? zScaleNow : zScaleNow * tiltEased;
    const lod = s4LodPicking.lodMetrics({
      s4Painters, tiltNow, transform, isoProfileMed, displayCellScale, N_INMAP, zScaleNow
    });
    const lodGainNow = 1 + (s4Config.LOD_DIAG_GAIN - 1) * crimpEased;
    const lodMinNow = s4Config.LOD_MIN / lodGainNow;
    const lodFullNow = s4Config.LOD_FULL / lodGainNow;
    lodTarget = clamp01((Math.min(lod.alzataPx, lod.pedataPx) - lodMinNow) /
                        Math.max(0.01, lodFullNow - lodMinNow));
    if (PROFILE && profileFrame % 60 === 0) {
      console.log("[LOD]", {
        k: +transform.k.toFixed(2),
        alzataPx: +lod.alzataPx.toFixed(2),
        pedataPx: +lod.pedataPx.toFixed(2),
        rapporto: +(lod.alzataPx / Math.max(0.01, lod.pedataPx)).toFixed(2),
        lodMinNow: +lodMinNow.toFixed(2),
        lodFullNow: +lodFullNow.toFixed(2),
        lodTarget: +lodTarget.toFixed(2)
      });
    }
    const rotNow = tiltEased > 0.01 ? planRot : 0;
    const rotSinNow = Math.sin(rotNow);
    const rotCosNow = Math.cos(rotNow);
    let pickMetricsForTile = null;
    const roleMode = focalizer != null;
    const roleMarksOf = i => {
      if (!roleMode) return null;
      const r = roleBands.chapterRankByTile[i];
      const R = roleBands.chapterStepCount();
      const highlight = r < 0
        ? 0
        : CONSTELLATION_FLOOR + (1 - CONSTELLATION_FLOOR) * Math.pow(CONSTELLATION_DECAY, R - r);
      const ri = roleBands.lastRoleByTile[i];
      const routeTerrace = (!frame.lodCollapse && i === routeSelection.tileIndex) ? routeSelection.terrace : -1;
      const hoverIsolate = routeTerrace < 1 && !frame.lodCollapse && hostIndex === i && hoverTerrace >= 1;
      return {
        highlight,
        terrace: routeTerrace >= 1 ? routeTerrace : (hoverIsolate ? hoverTerrace : -1),
        isolate: hoverIsolate,
        highlightColor: ri >= 0 ? s4Config.ROLE_COLORS[s4Config.ROLE_ORDER[ri]] : INK_COLOR,
        ribbonLinked: currentRibbonTick != null && currentRibbonTick.tileIndex === i,
        isRouteHot: routeHotSet.has(i),
        routeRgb: s4RouteNodes.routeRgb
      };
    };
    const frame = {
      transform,
      cogCenter,
      rotPivot,
      crimpEased,
      tiltEased,
      tiltNow,
      planRot,
      displayPts,
      displayCellScale,
      birthEased,
      fictBirthEased,
      focalEased,
      offmapPresence: offmapPresence(),
      contentAlpha,
      invK,
      rotSinNow,
      rotCosNow,
      zScaleNow,
      zScaleDraw,
      painters,
      lodCollapse: lodEased < 0.5,
      pickTile: hostIndex,
      stashCurves: (i, curves) => {
        if (i !== hostIndex) return;
        const pickMetrics = pickMetricsForTile || {};
        terraceCurveCache = {
          index: i, curves,
          tiltNow, rotSinNow, rotCosNow, zScale: frame.zScaleDraw, invK,
          B: pickMetrics.B || Math.max(0, curves.length - 1),
          packing: pickMetrics.packing || 0,
          rMed: pickMetrics.rMed || 0,
          crimpEased,
          transformK: transform.k
        };
        logPickDiagnostics(terraceCurveCache);
      },
      roleMode,
      cellRings,
      profile: PROFILE ? {
        fillCalls: 0,
        strokeCalls: 0,
        baseContourMs: 0,
        traceMs: 0,
        fillBuildMs: 0,
        fillRasterMs: 0,
        strokePtsMs: 0,
        quadCount: 0,
        ribbonCount: 0,
        nestedBandCount: 0,
        nestedFallbacks: 0,
        fillLenASum: 0,
        fillLenBSum: 0,
        fillLenCalls: 0
      } : null
    };
    const profileDisplayT0 = PROFILE ? performance.now() : 0;
    for (let i = 0; i < allData.length; i++) {
      const cogX = cogCenter[0] + (layoutPtsEased[i][0] - cogCenter[0]) * cogScaleDyn;
      const cogY = cogCenter[1] + (layoutPtsEased[i][1] - cogCenter[1]) * cogScaleDyn;
      if (i >= N_GEO) {
        displayPts[i][0] = cogX;
        displayPts[i][1] = cogY;
      } else {
        const p = cellRings[i] ? pts[i] : interaction.spawnPointAlongAzimuth(frame, geographicAngle[i]);
        displayPts[i][0] = p[0] + (cogX - p[0]) * crimpEased;
        displayPts[i][1] = p[1] + (cogY - p[1]) * crimpEased;
      }
    }
    for (let i = 0; i < cellRings.length; i++) {
      const cr = cellRings[i];
      if (!cr) {
        displayCellScale[i] = cogScaleDyn;
        continue;
      }
      const target = normalizedCellScale[i] * cogScaleDyn;
      displayCellScale[i] = 1 + (target - 1) * crimpEased;
    }
    if (PROFILE) profileDisplayMs = performance.now() - profileDisplayT0;
    const cognitiveBirthScale = birthEased.map(v => 0.35 + 0.65 * v);

    function cellPoint(i, x, y, withDrop = true) {
      const cr = cellRings[i];
      if (!cr) return [x, y];
      const birthScale = 1 + (cognitiveBirthScale[i] - 1) * crimpEased;
      const s = displayCellScale[i] * birthScale;
      const px = displayPts[i][0] + (x - cr.gx) * s;
      const py = displayPts[i][1] + (y - cr.gy) * s;
      return withDrop ? deform(px, py) : [px, py];
    }

    function formatMetricIsoline(dKm) {
      return dKm < 1 ? `${Math.round(dKm * 1000)} m` : `${dKm} km`;
    }

    context.setTransform(baseTransform);
    context.clearRect(0,0,width,height);
    context.fillStyle=BG_COLOR; context.fillRect(0,0,width,height);
    context.translate(transform.x, transform.y);
    context.scale(transform.k, transform.k);
    context.translate(-bbox[0], -bbox[1]);
    context.translate(rotPivot[0], rotPivot[1]);
    context.scale(1, tiltNow);
    context.rotate(rotNow);
    context.translate(-rotPivot[0], -rotPivot[1]);

    const backdrop = s4ChartMapBackdrop.draw({
      context, PROFILE, crimpEased, activeRanked, chapter, METRIC_ISOLINES_KM,
      invK, cogCenter, cogScaleDyn, GRID_COLOR, GRID_ALPHA, RING_GUIDE_ALPHA,
      RING_GUIDE_WIDTH, BORDER_WIDTH, segments, nearDrop, deform, cellRings,
      N_INMAP, N_GEO, fictBirthEased, birthEased, BIRTH_EPSILON, isBorn,
      contentAlpha, cellPoint, displayPts, cognitiveTileRadius, displayCellScale,
      offmapPresence
    });
    const metricTicks = backdrop.metricTicks;
    profileBordersMs = backdrop.profileBordersMs;

    let reliefFull = new Path2D();
    // i fittizi usano un hue distinto (FICT_HUE_RGB) dal rosso referenziale: path separati
    let reliefFictFull = new Path2D();
    let fillPaths     = Array.from({length: BANDS_MAX + 1}, () => new Path2D());
    let fillPathsFict = Array.from({length: BANDS_MAX + 1}, () => new Path2D());

    function isoFillAlpha(k) {
      const t = (k - 1) / (BANDS_MAX - 1);
      return ISO_FILL_A0 + (ISO_FILL_A1 - ISO_FILL_A0) * Math.pow(t, ISO_FILL_GAMMA);
    }

    function flushIsoFill() {
      if (!ISO_FILL) return;
      for (let k = 1; k <= BANDS_MAX; k++) {
        context.fillStyle = `rgba(${HUE_RGB},${isoFillAlpha(k)})`;
        context.fill(fillPaths[k]);
        if (PROFILE) profileFills++;
        context.fillStyle = `rgba(${FICT_HUE_RGB},${isoFillAlpha(k)})`;
        context.fill(fillPathsFict[k]);
        if (PROFILE) profileFills++;
      }
      fillPaths     = Array.from({length: BANDS_MAX + 1}, () => new Path2D());
      fillPathsFict = Array.from({length: BANDS_MAX + 1}, () => new Path2D());
    }

    function reliefVisibleIndex(i) {
      const cr = cellRings[i];
      const isFict = i >= N_GEO;
      const isOffmap = i >= N_INMAP && i < N_GEO;
      if (!cr && !isFict && !isOffmap) return false;
      if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) return false;
      if (isOffmap && offmapPresence() <= BIRTH_EPSILON) return false;
      const visible = isFict ? fictBirthEased[i] : birthEased[i];
      return !(crimpEased > 0.01 && visible <= BIRTH_EPSILON);
    }

    const profileDrawOrderT0 = PROFILE ? performance.now() : 0;
    const drawOrder = tiltEased > 0.01
      ? d3.range(cellRings.length).filter(reliefVisibleIndex)
      : d3.range(cellRings.length);
    if (tiltEased > 0.01) {
      for (const i of drawOrder) drawDepthKey[i] = displayPts[i][0] * rotSinNow + displayPts[i][1] * rotCosNow;
      drawOrder.sort((a, b) => d3.ascending(drawDepthKey[a], drawDepthKey[b]) || d3.ascending(a, b));
    }
    if (PROFILE) profileDrawOrderMs = performance.now() - profileDrawOrderT0;

    const profileReliefT0 = PROFILE ? performance.now() : 0;
    const routePointOf = i => {
      const cr = cellRings[i];
      const point = cr ? cellPoint(i, cr.gx, cr.gy, false) : displayPts[i];
      return {point, z: painters.axonZOf(bandsOfTile(i)) * zScaleDraw};
    };
    const routeStepPoints = routeHoverEased > 0.01
      ? s4RouteHoverDrawing.buildStepPoints({ routes: routeHoverRoutes, routePointOf, birthEased, fictBirthEased, N_GEO, BIRTH_EPSILON })
      : [];
    const haloProfile = PROFILE && profileFrame % 60 === 0 ? {calls: 0, samples: []} : null;
    if (roleMode && seqMode && crimpEased > 0.99) {
      for (const i of drawOrder) {
        const cr = cellRings[i];
        const isFict = i >= N_GEO;
        const isOffmap = i >= N_INMAP && i < N_GEO;
        if (!cr && !isFict && !isOffmap) continue;
        if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) continue;
        if (isOffmap && offmapPresence() <= BIRTH_EPSILON) continue;
        if (!isFict && !isOffmap && birthEased[i] <= BIRTH_EPSILON) continue;
        const roleMarks = roleMarksOf(i);
        const markHighlight = roleMarks?.ribbonLinked ? 1 : (roleMarks?.highlight || 0);
        if (markHighlight <= 0.01) continue;
        const birthScale = 1 + (cognitiveBirthScale[i] - 1) * crimpEased;
        const sCell = displayCellScale[i] * birthScale;
        const radius = isOffmap ? cognitiveTileRadius[i] * sCell : (isoProfileMed[i] || 0) * sCell;
        if (haloProfile) {
          haloProfile.calls++;
          if (haloProfile.samples.length < 3) {
            haloProfile.samples.push({
              i,
              Toponym: allData[i]?.properties?.Toponym || "",
              markHighlight: +markHighlight.toFixed(3),
              radius: +radius.toFixed(2),
              strength: +markHighlight.toFixed(3),
              rTilePx: +(radius * transform.k).toFixed(1),
              rHaloPx: +(radius * s4Config.CONSTELLATION_RADIUS_GAIN * transform.k).toFixed(1),
              offPx: +(radius * s4Config.HALO_POOL_OFFSET * tiltEased * transform.k).toFixed(1),
              displayPt: displayPts[i]?.slice()
            });
          }
        }
        painters.drawGroundHalo(frame, displayPts[i][0], displayPts[i][1], radius, roleMarks.highlightColor, markHighlight);
      }
    }
    if (haloProfile) {
      const lit = [];
      for (const i of drawOrder) {
        const rm = roleMarksOf(i);
        const h = rm?.ribbonLinked ? 1 : (rm?.highlight || 0);
        if (h > 0.01 && displayPts[i]) lit.push(displayPts[i]);
      }
      let nn = Infinity;
      for (let a = 0; a < lit.length; a++) {
        for (let b = a + 1; b < lit.length; b++) {
          const d = Math.hypot(lit[a][0] - lit[b][0], lit[a][1] - lit[b][1]);
          if (d < nn) nn = d;
        }
      }
      haloProfile.litCount = lit.length;
      haloProfile.nnPx = Number.isFinite(nn) ? +(nn * transform.k).toFixed(1) : null;
      haloProfile.k = +transform.k.toFixed(2);
      haloProfile.tilt = +tiltEased.toFixed(2);
    }
    if (haloProfile) console.log("[halo]", haloProfile);
    for (const i of drawOrder){
      const cr = cellRings[i];
      const isFict = i >= N_GEO;
      const isOffmap = i >= N_INMAP && i < N_GEO;
      if (!cr && !isFict && !isOffmap) continue;
      if (isFict && fictBirthEased[i] <= BIRTH_EPSILON) continue;
      if (isOffmap && offmapPresence() <= BIRTH_EPSILON) continue;
      const visible = isFict ? fictBirthEased[i] : birthEased[i];
      if (crimpEased > 0.01 && visible <= BIRTH_EPSILON) continue;
      const occ = occEased[i];
      const B = roleMode ? Math.min(BANDS_MAX, Math.round(occ)) : bandsFor(occ);
      const [px, py] = displayPts[i];
      const drawFictSummitGlyph = () => {
        const glyphB = tiltEased > 0.01 ? B : 0;
        const [cx, cy] = painters.zPoint(frame, px, py, painters.axonZOf(glyphB) * zScaleDraw);
        const gr = cognitiveTileRadius[i] * displayCellScale[i] * 0.5;
        const status = allData[i].properties.reality_status;
        context.save();
        context.globalAlpha = contentAlpha(i, {presence: fictBirthEased[i]});
        if (status === "transformed") painters.drawFictGlyph(frame, cx, cy, gr, "transformed");
        else if (status === "imagined") painters.drawFictGlyph(frame, cx, cy, gr, "imagined");
        else painters.drawFictGlyph(frame, cx, cy, gr, "invented");
        context.restore();
      };
      if (B <= 0 && tiltEased <= 0.01) {
        if (isFict) drawFictSummitGlyph();
        continue;
      }
      const birthScale = 1 + (cognitiveBirthScale[i] - 1) * crimpEased;
      const sCell = displayCellScale[i] * birthScale;

      if (focalizer == null && profileTiles > 0 && profileTiles % 20 === 0) {
        flushIsoFill();
        context.lineWidth = ISO_WIDTH * invK;
        context.strokeStyle = `rgba(${HUE_RGB},${ISO_ALPHA})`;
        context.stroke(reliefFull);
        if (PROFILE) profileStrokes++;
        reliefFull = new Path2D();
        context.strokeStyle = `rgba(${FICT_HUE_RGB},${FICT_RELIEF_ALPHA})`;
        context.stroke(reliefFictFull);
        if (PROFILE) profileStrokes++;
        reliefFictFull = new Path2D();
      }

      const target = isFict ? reliefFictFull : reliefFull;
      const seed = isFict
        ? (allData[i].properties.voidSeed ?? (i * 0.6180339887) % 1)
        : (i * 0.6180339887) % 1;

      let radii, rMin, rMed;
      if (isOffmap) {
        const rr = cognitiveTileRadius[i] * sCell;
        radii = null;                  // profilo costante: nessun array da allocare
        rMin = rMed = rr;
      } else {
        radii = isoProfile[i];
        if (!radii) continue;
        rMin = isoProfileMin[i] * sCell;
        rMed = isoProfileMed[i] * sCell;
      }
      if (rMin <= 0) continue;

      const nL = B;
      profileTiles++;
      profileCurves += nL;
      const bandPx = Math.max(1, nL) * ISO_MIN_SPACING * invK;
      const packing = Math.min(1, bandPx / (rMed * (ISO_OUTER - ISO_INNER)));

      if (tiltEased > 0.01) {
        const bandTint = roleMode
          ? (frame.lodCollapse
              ? roleBands.dominantTint({tileIndex: i, painters})
              : roleBands.bandTint({tileIndex: i, painters, sortEased: roleSortEased}))
          : null;
        const roleMarks = roleMarksOf(i);
        pickMetricsForTile = {B, packing, rMed};
        painters.drawAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint, roleMarks);
        if (isFict) drawFictSummitGlyph();
        continue;
      }

      if (focalizer != null) {
        const focal = contentAlpha(i);
        const tileTarget = new Path2D();
        const tileFillPaths = ISO_FILL ? Array.from({length: BANDS_MAX + 1}, () => new Path2D()) : null;
        for (let k = 0; k < nL; k++) {
          const level = (k + 1) / nL;
          const absLevel = k + 1;
          const fillTarget = ISO_FILL ? tileFillPaths[absLevel] : null;
          const traceT0 = PROFILE ? performance.now() : 0;
          traceIsoline(tileTarget, fillTarget, px, py, radii, rMin, sCell, rMin, rMed, seed, level, packing, null, 0);
          if (PROFILE && frame.profile) frame.profile.traceMs += performance.now() - traceT0;
        }
        if (ISO_FILL) {
          for (let k = 1; k <= nL; k++) {
            context.fillStyle = `rgba(${isFict ? FICT_HUE_RGB : HUE_RGB},${isoFillAlpha(k) * focal})`;
            context.fill(tileFillPaths[k]);
            if (PROFILE) profileFills++;
          }
        }
        context.lineWidth=ISO_WIDTH*invK;
        context.strokeStyle = `rgba(${isFict ? FICT_HUE_RGB : HUE_RGB},${(isFict ? FICT_RELIEF_ALPHA : ISO_ALPHA) * focal})`;
        context.stroke(tileTarget);
        if (roleMode && cr && cr.ring && cr.ring.length >= 3 && routeHotSet.has(i)) {
          context.save();
          context.beginPath();
          const q0 = cellPoint(i, cr.ring[0][0], cr.ring[0][1], true);
          context.moveTo(q0[0], q0[1]);
          for (let j = 1; j < cr.ring.length; j++) {
            const q = cellPoint(i, cr.ring[j][0], cr.ring[j][1], true);
            context.lineTo(q[0], q[1]);
          }
          context.closePath();
          context.globalAlpha = 0.95 * focal;
          context.lineWidth = 3 * invK;
          context.lineJoin = "round";
          context.strokeStyle = s4RouteNodes.routeRgb;
          context.shadowColor = s4RouteNodes.routeRgb;
          context.shadowBlur = 14;
          context.stroke();
          context.restore();
        }
        if (PROFILE) profileStrokes++;
        if (isFict) drawFictSummitGlyph();
        continue;
      }

      for (let k = 0; k < nL; k++) {
        const level = (k + 1) / nL;
        const absLevel = k + 1;
        const fillTarget = isFict ? fillPathsFict[absLevel] : fillPaths[absLevel];
        const traceT0 = PROFILE ? performance.now() : 0;
        traceIsoline(target, fillTarget, px, py, radii, rMin, sCell, rMin, rMed, seed, level, packing, null, 0);
        if (PROFILE && frame.profile) frame.profile.traceMs += performance.now() - traceT0;
      }
      if (isFict) drawFictSummitGlyph();
    }
    if (focalizer == null) {
      flushIsoFill();
      context.lineWidth=ISO_WIDTH*invK;
      context.strokeStyle = `rgba(${HUE_RGB},${ISO_ALPHA})`;
      context.stroke(reliefFull);
      if (PROFILE) profileStrokes++;
      context.strokeStyle = `rgba(${FICT_HUE_RGB},${FICT_RELIEF_ALPHA})`;
      context.stroke(reliefFictFull);
      if (PROFILE) profileStrokes++;
    }
    if (PROFILE && frame.profile) {
      profileFills += frame.profile.fillCalls;
      profileStrokes += frame.profile.strokeCalls;
    }
    if (PROFILE) profileReliefMs = performance.now() - profileReliefT0;

    // contorno di Roma: geografico, quindi sfuma nello stato cognitivo
    const romaAlpha = 1 - crimpEased;
    if (romaAlpha > 0.001) {
      context.save();
      context.globalAlpha = romaAlpha;
      context.beginPath(); geoPath(roma.features[0]);
      context.lineWidth=ROMA_WIDTH*invK; context.lineJoin="round"; context.strokeStyle=INK_COLOR; context.stroke();
      context.restore();
    }

    ({ghostSlotsLoggedChapter} = s4GhostSlotsOverlay.draw({
      context, PROFILE, SHOW_GHOST_SLOTS, crimpEased, chapter,
      ghostSlotsLoggedChapter, ghostSlots, primaryHostOf, fictBirthEased, birthEased,
      contentAlpha, BIRTH_EPSILON, allData, birthChapter,
      cogCenter, cogScaleDyn, displayPts, invK, BORDER_WIDTH, GRID_COLOR
    }));

    const overlayProfile = s4ChartOverlays.draw({
      context, PROFILE, profileRulerMs, profileT0, profileFrame,
      crimpEased, transform, K2, chapter, t0, N_INMAP, N_GEO,
      geoData, allData, pts, displayPts, birthEased, fictBirthEased,
      BIRTH_EPSILON, HUE_RGB, GRID_COLOR, INK_COLOR, BG_COLOR,
      PULSE_R, DOT_RADIUS, LABEL_SIZE, GLOW_WIDTH, GLOW_BLUR,
      invK, contentAlpha, alphaBucket, metricTicks, cogCenter, cogScaleDyn,
      poleIndex, routeStepPoints, routeHoverEased, rotNow, tiltNow, routeRgb,
      roleMode, occSeq, occEased, hostIndex, hoverTerrace, roleBands, roleSortTarget,
      sequence, effRoleName, cellRings, cellPoint, frame,
      profileTiles, profileCurves, profileFills, profileStrokes,
      profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
      profileTickMs, profileHitMs, seqOccCallsPerSecond,
      formatMetricIsoline
    });
    profileFrame = overlayProfile.profileFrame;
    profileRulerMs = overlayProfile.profileRulerMs;
  }

  const zoomBehavior = d3.zoom()
    .scaleExtent([ZOOM_MIN, ZOOM_MAX])
    .on("zoom", ev => {
      if (rotPivotSyncing) return;
      transform = ev.transform;
      draw();
    })
    .on("end", () => {
      if (rotPivotSyncing) return;
      freezeRotPivot();
    });
  d3.select(canvas).call(zoomBehavior);

  let raf;
  function tick(){
    const profileTickT0 = PROFILE ? performance.now() : 0;
    const morphScale = seqMode ? SEQ_MORPH_SCALE : 1;
    drop.x+=(drop.tx-drop.x)*SPRING;
    drop.y+=(drop.ty-drop.y)*SPRING;
    // La molla sotto-smorzata produce un singolo rimbalzo all'uscita del cursore.
    const as = (drop.ts - drop.s) * S_STIFF - drop.vs * S_DAMP;
    drop.vs += as; drop.s += drop.vs;
    lodEased += (lodTarget - lodEased) * CRIMP_MORPH * 3;
    // ospite dell'hover: calcolato una volta per frame, condiviso da tutti i loop di draw()
    const hitState = s4ChartSupport.hitState({drop, chapter, crimpEased, tiltEased, planRot, rotPivot, transform, showFictitious, seqMode, seqPos});
    const sameHitState = s4ChartSupport.sameHitState(lastHitState, hitState);
    const tickInteractionFrame = interactionFrame();
    const profileHitT0 = PROFILE ? performance.now() : 0;
    if (sameHitState) {
      hostIndex = lastHitState.hostIndex;
    } else {
      // In assonometria l'hit test comprende tutte le quote del rilievo.
      const axonHit = tiltEased > 0.01 && drop.s > 0.5;
      hostIndex = drop.s > 0.5
        ? (axonHit
            ? interaction.findAxonHost(tickInteractionFrame, drop.x, drop.y, bandsOfTile, {focalActive: focalizer != null})
            : interaction.findDisplayHost(tickInteractionFrame, drop.x, drop.y))
        : -1;
      // i fittizi non hanno cella Voronoi (findDisplayHost li ignora): in diagramma
      // provo il loro hit-test circolare come fallback, cosi' l'hover li copre anche loro
      if (hostIndex === -1 && drop.s > 0.5 && crimpEased > 0.01 && tiltEased <= 0.01) {
        hostIndex = interaction.findFictHost(tickInteractionFrame, drop.x, drop.y);
      }
      lastHitState = {...hitState, hostIndex};
    }
    hoverTerrace = (tiltEased > 0.01 && hostIndex >= 0 && drop.s > 0.5)
      ? s4LodPicking.pickTerrace({terraceCurveCache, hostIndex, painters, x: drop.x, y: drop.y}) : -1;
    profileHitMs = PROFILE ? performance.now() - profileHitT0 : 0;
    const routeFrameState = s4RouteNodes.frameState({selectedRouteId: routeSelection.id, focalizer, seqMode, seqPos, chapter});
    routeHotSet = routeFrameState.hot; routeHoverRoutes = routeFrameState.routes;
    routeHoverEased += ((routeSelection.id != null ? 1 : 0) - routeHoverEased) * ROUTE_HOVER_MORPH;
    if (seqMode) {
      chapter = chapterOfCursor(seqPos);
    }
    if (seqMode || focalizer != null) refreshOccSeq();
    const isBornNow = i => seqMode ? birthPos[i] <= seqPos : isBorn(i, chapter);
    activeRanked = showFictitious ? rankedRadialFullByChapter : rankedRadialByChapter;
    const stateC = activeRanked[chapter];
    const Laz = stateC.layoutAzimuth;
    const LazFull = rankedRadialFullByChapter[chapter].layoutAzimuth;
    const placedFictNow = rankedRadialFullByChapter[chapter].placedFict;
    let hitLayoutInvalidated = false;
    for (let i=0;i<layoutPtsEased.length;i++){
      let tx, ty;
      if (i < N_GEO && !cellRings[i] && crimpEased <= 0.01) {
        const p = interaction.spawnPointAlongAzimuth(tickInteractionFrame, geographicAngle[i]);
        tx = p[0]; ty = p[1];
      } else if (i >= N_GEO && crimpEased <= FICT_CRIMP_THRESHOLD) {
        tx = cogCenter[0]; ty = cogCenter[1];
      } else if (i >= N_GEO && (!showFictitious || !placedFictNow.has(i)) && isBornNow(i)) {
        const lazFullX = cogCenter[0] + LazFull[i][0], lazFullY = cogCenter[1] + LazFull[i][1];
        fictSpawnPt[i] = interaction.nearestViewportCorner(tickInteractionFrame, lazFullX, lazFullY);
        tx = fictSpawnPt[i][0]; ty = fictSpawnPt[i][1];
      } else if (isBornNow(i)) {
        const lazX = cogCenter[0] + Laz[i][0], lazY = cogCenter[1] + Laz[i][1];
        if (i >= N_GEO) fictSpawnPt[i] = interaction.nearestViewportCorner(tickInteractionFrame, lazX, lazY);
        tx = lazX;
        ty = lazY;
      } else {
        tx = Laz[i][0];
        ty = Laz[i][1];
      }
      // molla per-tessera: vicine al centro viewport = lente, lontane = rapide
      const m = (LAYOUT_MORPH_SLOW + (LAYOUT_MORPH_FAST - LAYOUT_MORPH_SLOW) * gravRamp[i]) * morphScale;
      const prevX = layoutPtsEased[i][0], prevY = layoutPtsEased[i][1];
      layoutPtsEased[i][0] += (tx - layoutPtsEased[i][0]) * m;
      layoutPtsEased[i][1] += (ty - layoutPtsEased[i][1]) * m;
      if (layoutPtsEased[i][0] !== prevX || layoutPtsEased[i][1] !== prevY) hitLayoutInvalidated = true;
    }
    let hitStateInvalidated = false;
    for (let i=0;i<allData.length;i++){
      const target = (seqMode || focalizer != null) ? (occSeq[i] || 0) : occAt(i, chapter, focalizer);
      occEased[i] += (target - occEased[i]) * MORPH * morphScale;
      const focalTarget = focalizer == null
        ? 1
        : (occAt(i, N_CHAPTERS, focalizer) > 0 ? 1 : (FOCAL_HIDE ? 0 : FOCAL_DIM_ALPHA));
      focalEased[i] += (focalTarget - focalEased[i]) * FOCAL_DIM_MORPH;
      const birthTarget = isBornNow(i) ? 1 : 0;
      const prevBirth = birthEased[i];
      birthEased[i] += (birthTarget - birthEased[i]) * BIRTH_MORPH * morphScale;
      // fittizi: restano a 0 finche' non nati E il diagramma non e' aperto oltre soglia
      const fictBirthTarget = (showFictitious && i >= N_GEO
        && crimpTarget === 1 && crimpEased > FICT_CRIMP_THRESHOLD
        && placedFictNow.has(i)
        && isBornNow(i)) ? 1 : 0;
      const prevFictBirth = fictBirthEased[i];
      fictBirthEased[i] += (fictBirthTarget - fictBirthEased[i]) * BIRTH_MORPH * morphScale;
      if (birthEased[i] !== prevBirth || fictBirthEased[i] !== prevFictBirth) hitStateInvalidated = true;
    }
    if (hitLayoutInvalidated || hitStateInvalidated) lastHitState = null;
    tiltEased += ((tiltTarget > 0 ? 1 : 0) - tiltEased) * TILT_MORPH;
    crimpEased += (crimpTarget - crimpEased) * CRIMP_MORPH;
    if (pendingRestoreMapCamera && crimpTarget <= 0.5 && crimpEased < 0.02) {
      pendingRestoreMapCamera = false;
      zoomBehavior.scaleExtent([ZOOM_MIN, ZOOM_MAX]);
      if (mapTransformBeforeDiagram) {
        d3.select(canvas).call(zoomBehavior.transform, mapTransformBeforeDiagram);
        mapTransformBeforeDiagram = null;
      }
    }
    // Crossfade cromatico fra ordine cronologico e ordine per ruolo.
    roleSortEased += (roleSortTarget - roleSortEased) * ROLE_SORT_MORPH;
    s4ChartFrameUi.update({
      reliefBtn, lodLabel, roleButtons, roleFilter,
      roleOrder: s4Config.ROLE_ORDER, roleColors: s4Config.ROLE_COLORS,
      diagramOpenedOnce, tiltTarget, focalizer,
      inkColor: INK_COLOR, bgColor: BG_COLOR, cache: frameUiCache
    });
    refreshSeqOccRate();
    profileTickMs = PROFILE ? performance.now() - profileTickT0 : 0;
    draw();
    raf=requestAnimationFrame(tick);
  }
  tick();

  canvas.addEventListener("mousemove", ev=>{
    const [x,y]=interaction.toCanvas(interactionFrame(), canvas, ev.clientX,ev.clientY); drop.tx=x; drop.ty=y; drop.ts=STRENGTH;
  });
  canvas.addEventListener("click", ev => {
    const [x, y] = interaction.toCanvas(interactionFrame(), canvas, ev.clientX, ev.clientY);
    drop.tx = x; drop.ty = y; drop.ts = STRENGTH;
    const clickHost = interaction.findAxonHost(interactionFrame(), x, y, bandsOfTile, {focalActive: focalizer != null});
    if (clickHost !== hostIndex) {
      routeSelection.clear();
      return;
    }
    if (!routeSelection.enabled()) return;
    routeSelection.selectFromTerrace();
  });
  canvas.addEventListener("touchmove", ev=>{
    ev.preventDefault(); const t=ev.touches[0];
    const [x,y]=interaction.toCanvas(interactionFrame(), canvas, t.clientX,t.clientY); drop.tx=x; drop.ty=y; drop.ts=STRENGTH;
  }, {passive:false});
  canvas.addEventListener("mouseleave", ()=>{ drop.ts=0; });

  const routeKeydown = ev => {
    if (ev.key === "Escape") routeSelection.clear();
  };
  document.addEventListener("keydown", routeKeydown);
  invalidation.then(() => document.removeEventListener("keydown", routeKeydown));

  const shell = s4ChartShell.create({
    canvas, width, nChapters: N_CHAPTERS, inkColor: INK_COLOR, bgColor: BG_COLOR,
    terrainAgents, sequenceLength: sequence.length,
    roleOrder: s4Config.ROLE_ORDER, roleColors: s4Config.ROLE_COLORS, rolePluralColor: s4Config.ROLE_PLURAL_COLOR
  });
  const {
    PLAY_ICON, wrap,
    slider, chLabel, btn, focalizerSelect, rotSlider
  } = shell;
  ({mapBtn, pasticciaccioBtn, reliefBtn, stagePrevBtn, stageNextBtn, stageLabel, seqModeToggle, seqChapterBtn, seqPageBtn, orderBtn, seqSlider, seqLabel, roleLegend, roleButtons, pageRibbon, ribbonWrap: pageRibbonShell, ribbonPrevBtn, ribbonNextBtn, legendRow, lodLabel} = shell);

  s4ChartHandlers.install({
    shell, invalidation,
    constants: {SEQ_ENABLED_IN_MAP, SEQ_PLAY_MS, PLAY_MS, N_CHAPTERS},
    state: {
      chapter: () => chapter, setChapter: v => { chapter = v; },
      focalizer: () => focalizer, setFocalizer: v => { focalizer = v; },
      seqMode: () => seqMode, setSeqMode: v => { seqMode = v; },
      seqPos: () => seqPos,
      setSeqOccDirty: v => { seqOccDirty = v; },
      roleSortTarget: () => roleSortTarget, setRoleSortTarget: v => { roleSortTarget = v; },
      setPlanRot: v => { planRot = v; },
      diagramOpenedOnce: () => diagramOpenedOnce,
      tiltTarget: () => tiltTarget,
      crimpTarget: () => crimpTarget,
      showFictitious: () => showFictitious, setShowFictitious: v => { showFictitious = v; },
      playing: () => playing, setPlaying: v => { playing = v; },
      playTimer: () => playTimer, setPlayTimer: v => { playTimer = v; }
    },
    actions: {
      setSeqPos, nearestSeqPos, seqTrack, seqTrackIndex, lastSeqPosOfChapter, firstSeqPosOfChapter,
      chapterOfCursor, seqEnabledNow, updateSeqUi, moveStage, moveSeqChapter, toggleRoleFilter, applyStage, clearSelectedRoute: () => routeSelection.clear(),
      freezeRotPivot,
      cancelFrame: () => cancelAnimationFrame(raf)
    }
  });

  updateSeqUi();
  return wrap;
})();

// ===== CELLA: display =====
display(chartS4);
