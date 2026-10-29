// Parametri visivi, geometrici e temporali della visualizzazione.
  const s4Config = {

  MARGIN: 0.08,        // buffer attorno al bbox dei punti, come frazione della diagonale
  GEO_RADIUS_KM: 100,  // solo i luoghi entro questa distanza da Roma: esclude
                        // riferimenti narrativi lontani (Milano, Bologna, fronte della
                        // Grande Guerra...) che altrimenti farebbero esplodere il bbox
  CANVAS_MAX_PIXELS: 8388608, // massimo 32 MiB RGBA per il singolo bitmap
  CANVAS_MAX_EDGE: 8192,      // limite anche per contenitori molto allungati
  // gain: amplificazione dell'inchiostro di ciascun trattamento al caricamento (la carta resta bianca). perTile: la
  // carta segue le tessere in ogni stato e si disegna sopra le terrazze, per moltiplica. stack: con più carte, 'pila'
  // le compone in uno strato unico che entra nella figura una volta; 'sovrapposte' le fonde una per una.
  HISTORICAL: {maxDeviceTexel:1.2, fadeStart:1, fadeEnd:2, reserveCSS:1.5, blend:'multiply', gain:{leggibile:3.5, tenue:5, minimo:7}, perTile:true, stack:'pila'}, // riserva: sottotratto del rilievo, px CSS oltre il tratto
  CENTER_MARKER: {radiusCSS:1.5, minimumCellRadiusCSS:5},
  TOUCH_TARGET_CSS: 44, // diametro del bersaglio al tocco per la rosa di scelta
  // Angolo del foglio: presa, piega a riposo, corsa per p=1, soglia di blocco dell'asse, velocità di lancio.
  // Percorso guidato: durata di un passo del riquadro 'scatola'; 'colonna' | 'margine' | 'sipario' scorrono.
  // drive: 'scorrimento' lo scorrimento tiene il passaggio fra due passi, 'soglia' la figura scatta al passo;
  // settleMs: pausa dopo la quale figura e colonna si assestano sul passo più vicino.
  FRATTURA: {stepMs: 8000, variant: 'colonna', drive: 'scorrimento', settleMs: 250},
  // Inquadratura: 'pieno' la figura occupa tutta la finestra e i comandi stanno sopra di essa; 'riquadro'
  // la figura è un riquadro centrale con i comandi nei margini.
  FRAME: {mode: 'pieno', fadeFraction: .09},
  // Comandi della carta storica (solo con la carta locale): 'strato' | 'cornice' | 'lente'.
  HISTORICAL_UI: {variant: 'strato', lensCSS: 140},
  // Figura a carta storica spenta: 'grana' grana di carta fissa allo schermo; 'raster' carta attuale
  // sobria (tessere CARTO, dati OpenStreetMap, solo sviluppo); 'tratti' fiumi, laghi e grandi strade OpenStreetMap
  // (solo sviluppo); 'piana'; 'corone' cerchi delle distanze in geografia.
  // Spazi fantasma: 'tratteggio' | 'registro' | 'riserva' | 'eco'.
  GHOST: {style: 'eco'},
  // Filtri di ruolo: 'quadrati' | 'filetto' | 'tacca' | 'etichetta'. Nessun riempimento.
  ROLE_BUTTONS: {style: 'tacca'},
  // Nastro di pagine e righe: 'quadratini' | 'tessere' | 'densita' | 'filo'.
  // Nastro di pagine: distanza di pagina conservata, pile adattive, lente di pagina. Forma dei segni: filo di
  // punti, ripiego misurato (le sagome a 8 px diventano schegge nel capitolo X).
  RIBBON: {style: 'filo', spacing: 'distanza', pile: 'adattiva', lens: true, markCSS: 8, minMarkCSS: 6, gapCSS: 2, maxPileCSS: 150},
  // Tessera attiva: 'anello' doppio filo su alone di carta; 'attenua' vela il resto;
  // 'retro' alone d'inchiostro sfumato. focusMs: durata di «Ritrova nella figura».
  ACTIVE: {style: 'anello',
    veil: .55, focusMs: 450, minRingCSS: 11},
  // Carta storica spenta: 'orientamento' elementi stabili OSM nel build; grain: grana leggera
  // sotto i tratti.
  PAPER: {mode: 'orientamento', grain: true, ringAlpha: .32, grainAlpha: .05},
  // Pannello della citazione: 'scheda' | 'margine' | 'edizione'.
  PANEL: {variant: 'edizione'},
  // Granularità del cursore per pagina: 'interruttore' un gruppo
  // pagina | riga sotto il cursore; 'tre-tempi' capitolo | pagina | riga in un solo gruppo; 'modificatore' nessun
  // comando, il cursore va per pagina e Maiuscolo con le frecce per riga. initial: passo all'apertura.
  GRAIN: {variant: 'interruttore', initial: 'page'},  // pagina, con la riga sotto il cursore
  // Rotazione del rilievo: scatto dei tasti, in gradi.
  ROTATION: {stepDeg: 15},
  // Legenda: 'margine' | 'cartiglio' | 'registro' (una nota per comando); 'unica' = foglio unico.
  LEGEND: {variant: 'margine'},
  SHEET: {sizeCSS:56, foldCSS:22, travelCSS:160, lockCSS:8, flickCSSPerMs:0.5,
    // Foglio a quattro quadranti: 'piega' | 'bussola' | 'mirino'; 'angolo' = angolo di pagina.
    // Le misure delle celle sono token CSS (--pad-w, --pad-h) per variante e per banda.
    variant: 'bussola', pad: {lockCSS: 6, flickCSSPerMs: 0.5}},
  VIEW_SIZE: 1150,     // lato lungo del canvas (px)

  MOTION: {duration:1300, catchup:280, tableSamples:256, prepareBudget:1.5, chaseSteps:100, planarHandoff:[0,0.08],
    rankAmplitude:0.12, deceleration:0.12, positionEnd:0.84,
    geoOut:[0,0.20], geoIn:[0.76,1], border:[0,0.16], withdraw:[0,0.30],
    pigmentOut:[0,0.12], pigmentIn:[0.88,1], lodWindow:0.08,
    narrativeLead:30,
    // Rilievo ↔ rilievo cambiando vista (1,3 s): terrazze che si richiudono 0-15% (195 ms), spostamento 15-85%
    // (910 ms), terrazze che si riaprono 85-100% (195 ms); durante lo spostamento resta un solo livello (10%).
    axonPhases:[.15,.85], heightFloor:.1,
    // Dalle relazioni ingrandite alla geografia: inquadra i luoghi visti (quantili robusti, margine e riempimento
    // come frazioni del riquadro); vale da 1,15 volte lo zoom d'apertura del diagramma in su.
    framing:{minZoomRatio:1.15, margin:.04, quantile:0, fill:.1, minPlaces:3}},

  // Tavolozza.
  BG_COLOR: "#F1E7D0",     // fondo pergamena
  HUE_RGB: "155,35,53",    // #9B2335: tinta riservata alla densità e al rilievo dei referenziali
  FICT_HUE_RGB: "31,111,107", // #1F6F6B (petrolio scuro): densità dei luoghi narrativi (fittizi),
                               // tinta distinta dal rosso referenziale, leggibile sul fondo pergamena
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
  // Corone metriche del diagramma: tre livelli (contrasto del filo sulla pergamena).
  // Livello in uso: filo continuo a 1,60:1 sulla pergamena (opacità 0,345), senza bande né tratteggio.
  RINGS: {level: 'autore', levels: {
    autore: {dash: false, alpha: 0.345, width: 0.8, band: 0, labels: true},
    tenue: {dash: true, alpha: 0.174, width: 0.42, band: 0},
    medio: {dash: false, alpha: 0.6, width: 0.9, band: 0.035},
    marcato: {dash: false, alpha: 0.78, width: 1.2, band: 0.055, labels: true}}},
  RING_GUIDE_ALPHA: 0.30,  // fasce cognitive: leggibili ma sotto ai tasselli
  RING_GUIDE_WIDTH: 0.6,   // tratto sottile a schermo costante (*invK)
  INK_COLOR: "#2A1F18",    // inchiostro scuro neutro: contorno di Roma, glow, etichetta

  // Isoipse.
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
  // Terrazze in mappa: 'gradoni' prismi sull'intera cella;
  // 'tumuli' impronta raccolta attorno al luogo e arrotondata, fianchi in tono senza filo, solo il bordo della cima;
  // 'curve' stessa impronta, superfici di carta e un filo d'inchiostro per ogni quota, come un plastico inciso.
  // footprint: raggio massimo dell'impronta in mappa, in raggi mediani di cella; roundness: 0 cella, 1 cerchio.
  // Nel diagramma la sagoma resta quella della tessera (continuità con Voronoi).
  // roleTintScale: tinta del ruolo a faccia piena attenuata dell'8% perché la carta storica resti
  // percepibile; ΔE minimo fra due ruoli 10,46 → 9,57 sulla pergamena, 6,88 → 6,29 sotto l'inchiostro della carta (soglia 2,3).
  TERRACE: {style: 'gradoni', roleFaceOverride: null, roleTintScale: 0.92},
  // Determinazione spaziale della lettura, solo con un personaggio e sui contorni superiore e inferiore
  // delle terrazze individuali in rilievo. width e dash in px CSS, costanti rispetto a zoom, fit e DPR; estremità
  // e giunzioni tonde. Il dato mancante conserva il bordo ordinario. corridorPx: margine in pixel del bitmap, oltre
  // il mezzo tratto ordinario, in cui il bordo continuo è sostituito dal ritmo. mode: 'continuita' | 'off';
  // 'tensione' e 'appoggi' sono disponibili solo in sviluppo.
  DETERMINATION: {mode: 'continuita', width: 1.05, corridorPx: 1.7,
    dash: {Precise: [], Relative: [6, 2], Approximate: [5, 2, 0.15, 2], Indeterminate: [0.15, 2.5]}},
  AXON_MAP_FOOTPRINT_MAX: null, // limite disattivato: in mappa il rilievo torna a coincidere con la cella
  ISO_SUMMIT_BIAS: 0.18, // asimmetria della vetta, frazione del raggio MINIMO della cella
                         // (non del raggio direzionale: quello deformava le curve su celle allungate)
  ISO_MARGIN: 0.92,      // clamp duro: nessun punto della curva oltre questa frazione del bordo
  ISO_MIN_SPACING: 3.0,  // spaziatura minima tra curve (px schermo). Sotto questa soglia
                         // si riduce il numero di curve: su celle piccole 12 isoipse sono una macchia
  ISO_ECC_DAMP: 0.65,    // compressione dell'eccentricità verso il raggio mediano della cella:
                         // 1 = la curva segue esattamente la forma del tassello, 0 = circolare

  // Soglie in pixel per il passaggio tra sintesi e stratigrafia completa.
  LOD_MIN: 0.9,
  LOD_FULL: 2.0,
  LOD_DIAG_GAIN: 2.0, // guadagno empirico: in diagramma anticipa l'apertura della stratigrafia leggibile

  // Zoom e livello di dettaglio.
  K2: 4,          // sopra: anche pallino generatore + etichetta al hover
  ZOOM_MIN: 1,    // zoom utente minimo: 1 × fit del contenitore
  ZOOM_MAX: 32,   // abbastanza per isolare le bande di un singolo luogo

  // Goccia: molla che insegue il cursore, effetto elastico sui bordi di cella.
  SPRING: 0.18,     // rincorsa posizione: piu' alto = la goccia raggiunge il cursore piu' in fretta
  S_STIFF: 0.14,    // rigidezza della molla sotto-smorzata su drop.s (rilascio elastico)
  S_DAMP: 0.62,     // smorzamento < 1 -> overshoot: un solo rimbalzo all'uscita del cursore
  STRENGTH: 12,     // intensita' target a regime (drop.ts) -> deformazione leggera
  RADIUS: 48,       // raggio del falloff a supporto compatto del liquido (bordi cella)
  // INFLUENCE_RADIUS (= RADIUS*3, usato solo da nearDrop) si ricava in createAtlas per non duplicare il fattore

  // Dimensioni a schermo costante.
  // dentro scale(transform.k): un raggio/spessore in "unità di mondo" cresce
  // di k volte a schermo. Questi valori sono invece la dimensione DESIDERATA
  // a schermo (px), e vengono divisi per k in draw prima dell'uso -- così
  // pallini, bordi, glow e la goccia stessa non esplodono zoomando
  DOT_RADIUS: 1.5,  // raggio pallino generatore
  BORDER_WIDTH: 0.75, // spessore confine di cella
  GLOW_WIDTH: 1.5,  // spessore contorno del glow
  GLOW_BLUR: 12,    // shadowBlur del glow
  ROMA_WIDTH: 2.0,  // spessore contorno di Roma
  // Annotazioni del diagramma (scala delle distanze, nome del polo): corpo in px CSS, carattere dell'interfaccia.
  ANNOTATION: {rulerCSS: 12, poleCSS: 13, family: '"Public Sans", system-ui, sans-serif'},
  LABEL_SIZE: 12,   // dimensione font dell'etichetta hover

  // Tempo e capitoli.
  N_CHAPTERS: 10,   // mentionsByChapter ha 10 voci, indice 0 = capitolo 1
  MORPH: 0.12,      // rincorsa del rilievo verso il capitolo target
  PULSE_R: 2.5,     // raggio base del pulse a schermo (px) -> *invK, come DOT_RADIUS
  PLAY_MS: 900,     // intervallo di avanzamento capitolo durante il play

  ROME_CENTER: [12.4964, 41.9028],

  // Polo della vista cognitiva.
  // Origine di azimut e rango radiale, distinta dal riferimento cartografico di Roma.
  SECONDSPACE_POLES: {
    romeCenter:   [12.4964, 41.9028],
    viaMerulana:  [12.5020, 41.8919],
    weightedMean: [12.5598, 41.8452]
  },
  SECONDSPACE_POLE_KEY: "viaMerulana",

  // Fusione degli alias toponomastici.
  // Le occorrenze e le menzioni per capitolo confluiscono nell'entita' canonica.
  ALIAS_GROUPS: [
    { ids: ["gaz_collegio_romano", "gaz_santo_stefano_del_cacco_celio_santo_stefano"], canonical: "gaz_santo_stefano_del_cacco_celio_santo_stefano" },
    { ids: ["gaz_pantheon", "gaz_tempio_di_agrippa"], canonical: "gaz_pantheon" },
    { ids: ["gaz_santa_margherita_in_abitacolo", "gaz_santa_rita_invitacolo"], canonical: "gaz_santa_margherita_in_abitacolo" },
    { ids: ["gaz_via_de_merli", "gaz_via_merulana"], canonical: "gaz_via_merulana" },
    { ids: ["gaz_viale_della_regina", "gaz_viale_regina_margherita"], canonical: "gaz_viale_regina_margherita" },
  ],

  REF_TILE_RADIUS_TARGET: 11, // raggio-base uniforme (px, spazio diagramma) delle tessere referenziali
  REF_TILE_VARIANCE: 0.25,    // 0 = tutte identiche; 1 = piena varianza geografica (solo TILE_SIZE 'radius')
  // Dimensione delle tessere nel diagramma: 'area' = stessa area per ogni cella, forma di Voronoi conservata,
  // pari alla mediana delle aree del regime 'radius'; 'radius' = raggio quasi uniforme con traccia geografica.
  // 'area-ampia' = area uguale moltiplicata per TILE_AREA_GAIN; 'area-tutte' = l'area mediana anche per le tessere
  // narrative; 'nucleo' = cerchio inscritto uguale, allungamento limitato a TILE_CORE_REACH volte il raggio mediano.
  TILE_SIZE: 'area-ampia',
  // 1,8 è l'area comune massima senza sovrapposizioni con le distanze attuali (ricerca per bisezione: 1,85 ne dà una).
  TILE_AREA_GAIN: 1.8,
  // 'area-equa': area comune ×1,6 (margine fra le tessere); le celle allungate non sono ingrandite oltre
  // TILE_EQUA_REACH volte il raggio mediano (la loro forma resta quella di Voronoi); tessere narrative non oltre
  // TILE_NARRATIVE_CAP volte l'area comune.
  TILE_EQUA_GAIN: 1.6, TILE_EQUA_REACH: 1.6, TILE_NARRATIVE_CAP: 2.2, TILE_EQUA_FLOOR: 0.5, // nessuna cella sotto metà dell'area del regime a raggio
  TILE_CORE_REACH: 1.9,
  REF_TILE_RADIUS_MIN: 7,     // guard-rail anti-invisibilita'
  REF_TILE_RADIUS_MAX: 16,    // guard-rail anti-gigantismo
  OFFMAP_TILE_RADIUS: 9.5,    // tassello sintetico dei referenziali fuori mappa
  TILE_GAP: 4,
  DIAG_SCREEN_FRAC: 1.12,   // il diagramma occupa il 112% del lato corto del riquadro: a tutto schermo gli anelli esterni, radi, escono sotto i comandi

  // Trasformazione a rango radiale.
  RADIAL_BANDS: 14,        // K bande equipopolate: quantili della distanza dal polo.
                            // Piu' bande = maggiore fedelta' azimutale ma piu' estensione.
  BAND_FILL: 0.75,         // frazione massima di circonferenza occupata da una banda.
                            // Sotto 1 lascia lo slack che permette al packing di
                            // rispettare l'azimut invece di equispaziare per forza.
  BAND_STEP_MIN: 30,       // distanza radiale minima fra bande consecutive
  BAND_START_RADIUS: 60,   // raggio minimo della prima banda

  LABEL_GAP_WIDTH_PX: 46,    // larghezza del varco in px di spazio-diagramma, alla quota dell'anello

  CRIMP_MORPH: 0.0325, // rincorsa del ritaglio (transizione mappa<->diagramma)
  BIRTH_MORPH: 0.14,
  BIRTH_EPSILON: 0.015,
  LAYOUT_MORPH_SLOW: 0.025, // tessere vicine al centro viewport
  LAYOUT_MORPH_FAST: 0.15,  // tessere lontane dal centro viewport
  FICT_CRIMP_THRESHOLD: 0.5,
  FICT_GLYPH_WIDTH: 1.0,       // spessore contorno glifo fittizio (px schermo), modo 'free'
  // Glifo di statuto: 'inscribed' = dentro il cerchio inscritto della propria tessera (frazione) e ritagliato
  // sul suo poligono, tratto costante in px CSS; 'free' = raggio dal tassello, senza ritaglio.
  GLYPH: {mode: 'inscribed', inscribedFraction: 0.8, strokeCSS: 1.25},
  // Statuto delle tessere narrative: 'glifo' (stella e sagoma chiusa) | 'traccia' (doppio contorno per
  // Transformed, sagoma curva senza poligono per Invented) | 'sigla' (iniziale in Bodoni) | 'ricalco'
  // (Transformed porta in miniatura la traccia del luogo reale a cui è ancorato).
  // Scala ordinale del contorno (traccia e ricalco), per peso e non per contrasto: Imported contorno pieno;
  // Transformed un secondo contorno a distanza fissa dal bordo (offsetCSS, non omotetico: non si legge come
  // isoipsa), poco più pesante del filo (markWeight) e in tono intermedio, o la miniatura del luogo d'ancoraggio;
  // Invented il contorno pieno con un filo di carta appena dentro (inventedReserveCSS): la sagoma ritagliata, senza
  // traccia. Sotto minInscribedCSS di cerchio inscritto il secondo contorno non si disegna. La sigla è tonda, con
  // alone di carta e un corpo minimo (siglaMinCSS).
  // Nel rilievo sta sulla faccia superiore (axonInset). Sotto ricalcoMinWorld (unità del modello, quindi la stessa
  // scelta a ogni viewport e zoom) la traccia del ricalco ripiega sul doppio contorno.
  STATUS: {mode: 'glifo', offsetCSS: 2.5, minInscribedCSS: 3.5, axonInset: 0.42, siglaScale: 1.5, siglaMinCSS: 9, ricalcoScale: 0.55, ricalcoMinWorld: 3, ricalcoAspect: 2, markAlpha: 0.8, markWeight: 1.4, inventedReserveCSS: 1.4},
  FICT_RELIEF_ALPHA: 0.5,      // opacita' ridotta della raggiera fittizia
  // Tessere narrative a collare.
  COLLAR_DEPTH: 14,        // profondita' del primo anello
  COLLAR_DEPTH_DECAY: 0.3, // h_k = COLLAR_DEPTH / (1 + decay * k)
  COLLAR_MITER_MAX: 2.5,   // clamp del miter sui vertici acuti
  CHILD_DEPTH: 11,         // profondita' delle tessere figlie su spigolo suddiviso
  SHAPE_MIN_V: 0,          // vertici intermedi sul bordo esterno libero
  SHAPE_MAX_V: 5,
  SHAPE_AMP: 0.30,         // sporgenza massima, in frazione di h
  NARR_GLYPH_SCALE: 0.55,  // dimensione glifo riferita al tassello referenziale
  METRIC_ISOLINES_KM: [0.5, 1, 2, 5, 20, 100],
  // bbox reale del tracciato (misurata sui path, non sul frame): serve a centrare
  // centrati sul frame allo stesso modo.
  FICT_GLYPH_PATHS: {
    transformed: "M60.40 1.09C57.30 36.51 61.77 43.31 89.78 45.82C65.67 54.35 62.70 62.66 73.27 91.98C53.22 61.20 47.57 58.23 29.19 68.74C36.23 53.52 32.29 45.23 10.27 28.87C40.12 38.22 48.14 33.77 60.40 1.09Z",
    imagined: "M44.8819 0.0369721C57.4316 -1.1313 48.5711 25.7132 60.6891 34.3884C72.8071 43.0637 98.9827 12.3385 99.9732 29.1837C100.964 46.0289 74.142 38.1271 73.7838 53.1256C73.4257 68.1241 101.875 66.2465 96.4189 79.1495C90.9631 92.0524 76.9079 71.0652 65.927 75.8184C54.9461 80.5716 55.8789 100.907 44.8819 99.9685C33.885 99.03 36.2139 80.7781 26.6429 75.8184C17.0719 70.8587 3.89295 86.537 0.453497 75.8184C-2.98595 65.0998 14.2915 62.0158 13.5482 53.1256C12.8049 44.2355 5.13521 47.1723 5.69138 37.5113C6.24755 27.8503 22.362 41.6737 31.8808 34.3884C41.3995 27.1032 32.3323 1.20525 44.8819 0.0369721Z",
    invented: "M45.9915 6.60415C54.1921 -4.89582 97.0782 -2.25548 99.6009 21.5076C102.124 45.2706 92.0328 50.5513 87.677 74.3161C83.3212 98.0809 54.1921 90.1564 38.6352 97.8327C23.0783 105.509 7.55605 91.6419 1.85374 74.3161C-3.84856 56.9903 4.83385 54.7282 11.3062 37.3496C17.7785 19.971 37.7908 18.1041 45.9915 6.60415Z"
  },
  // centro geometrico e semi-lato dominante della bbox del tracciato, in coordinate
  // viewBox. Precalcolati: evita di misurare i path ad ogni frame.
  FICT_GLYPH_BOX: {
    transformed: { cx: 50.0,  cy: 46.5,  half: 45.4 },
    imagined:    { cx: 50.0,  cy: 50.0,  half: 50.0 },
    invented:    { cx: 50.5,  cy: 50.5,  half: 49.5 }
  },
  // correttivo per-status: compensa il diverso riempimento del frame (Invented e'
  // un blob compatto, gli altri due stelle che toccano i bordi). 1 = nessuna correzione.
  FICT_GLYPH_GAIN: { transformed: 1.0, imagined: 1.0, invented: 0.92 },

  SAMPLE: 7, // passo di campionamento (px) dei lati Voronoi / dei ring cella
  // Cromia: 'storica' (densità rossa e petrolio) | 'ardesia' | 'inchiostro' | 'risparmio'.
  // FICT_FILL_SCALE regola il riempimento ipsometrico delle tessere narrative (0 = riserva di carta).
  CHROMA: 'ardesia',
  FICT_FILL_SCALE: 1
};

// Varianti cromatiche: ciascuna sovrascrive soltanto le tinte e i toni che cambia.
// ardesia:    i narrativi in blu ardesia scuro, il petrolio resta solo al ruolo ProjectedSpace; rilievo come carta.
// inchiostro: i luoghi reali in rosso, i luoghi del romanzo in seppia d'inchiostro; il colore resta ai ruoli.
// risparmio:  un solo rosso per la densità; le tessere narrative senza riempimento, riconoscibili per forma
//             (statuto 'ricalco' o 'traccia') e per la carta risparmiata; rilievo quasi carta.
// Ruoli equiluminanti a L* 42,5; Setting spostato dal cremisi al fucsia (ΔE 40,6 dal rosso della densità, 26,3 dal viola),
// così il rosso significa soltanto densità.
const ROLES_EQ = {Setting: "#A53B86", ZoneOfAction: "#9F4D24", Route: "#7C6020", Marker: "#78549E", ProjectedSpace: "#206F6B"};
// Rilievo come carta (preso dal risparmio): pedate del colore del fondo, fianchi appena ombreggiati.
// Il tono sta sulle pareti, le sommità restano carta: l'altezza si legge dai fianchi.
const PAPER_RELIEF = {AXON_TREAD_TINT: 0, AXON_WALL_SHADE: 0.22};
const CHROMA_PRESETS = {
  storica: {},
  // Ardesia neutra (#3A4859, L* 30, croma 12; ΔE 27 dal petrolio, 41 dal viola); isoipse narrative a 0,75, contrasto 4,1:1.
  ardesia: {FICT_HUE_RGB: "58,72,89", FICT_RELIEF_ALPHA: 0.75, ISO_FILL_A1: 0.4, ...PAPER_RELIEF, ROLE_COLORS: ROLES_EQ},
  inchiostro: {FICT_HUE_RGB: "75,58,46", ISO_FILL_A1: 0.38, AXON_WALL_SHADE: 0.2, AXON_TREAD_TINT: 0.022, ROLE_COLORS: ROLES_EQ},
  risparmio: {FICT_HUE_RGB: "155,35,53", FICT_FILL_SCALE: 0, ISO_FILL_A1: 0.42, ...PAPER_RELIEF, ROMA_WIDTH: 1.4, ROLE_COLORS: ROLES_EQ}
};
const TERRACE_PRESETS = {
  gradoni: {footprint: null, roundness: 0, walls: 'tono', edges: 'tutte', roleFace: 'campitura'},
  tumuli: {footprint: 1.5, roundness: .8, walls: 'tinta', tintBase: .06, tintStep: .035, edges: 'cima'},
  curve: {footprint: 1.5, roundness: .45, walls: 'carta', edges: 'quote'}
};
// Laboratorio di sviluppo: sovrascritture locali dei parametri, mai nel build di produzione.
if (import.meta.env?.DEV && typeof localStorage !== 'undefined') {
  try {
    // Prima il parametro ?lab= dell'indirizzo (un riquadro per variante), poi la memoria locale del laboratorio.
    const lab = JSON.parse(new URLSearchParams(location.search).get('lab') || localStorage.getItem('gaddatlas:lab') || 'null');
    if (lab) for (const [path, value] of Object.entries(lab)) {
      const keys = path.split('.'), last = keys.pop(); let target = s4Config;
      for (const k of keys) target = target[k];
      if (target && last in target) target[last] = value;
    }
  } catch { /* sovrascritture illeggibili: si resta ai valori predefiniti */ }
}
// La tinta del ruolo sulle facce (roleFace) può essere scelta a parte dal laboratorio.
Object.assign(s4Config.TERRACE, TERRACE_PRESETS[s4Config.TERRACE.style], {style: s4Config.TERRACE.style}, s4Config.TERRACE.roleFaceOverride ? {roleFace: s4Config.TERRACE.roleFaceOverride} : {});
Object.assign(s4Config, CHROMA_PRESETS[s4Config.CHROMA]);

export default s4Config;
