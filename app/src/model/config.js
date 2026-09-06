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

export default s4Config;
