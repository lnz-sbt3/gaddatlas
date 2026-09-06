# Registro delle decisioni

Ogni voce: **cosa** si è deciso, **quando**, **quali alternative** sono state
scartate e **perché**. Le decisioni chiuse restano: se una viene rovesciata si
aggiunge una voce nuova che rimanda alla precedente.

Serve a due cose insieme — non perdere il filo durante lo sviluppo, e avere il
capitolo di tesi sul design fondato su fatti datati anziché su una
ricostruzione a posteriori.

---

## D-001 · Stack statico anziché framework reattivo
**2026-09-06 · chiusa**

L'applicazione è un sito statico: Vite, moduli ES vanilla, `htl` per i template.

**Alternative scartate.** React, Vue, Svelte.

**Motivazione.** Il nucleo visivo è un `<canvas>` guidato da un loop
`requestAnimationFrame` che muta array in place a ogni frame (`displayPts`,
`occEased`, `birthEased`, `focalEased`). Il modello di React — stato immutabile,
re-render alla modifica — è ortogonale a questa architettura: il canvas
finirebbe comunque in un `useRef` contenente lo stesso codice imperativo. Si
pagherebbe un runtime in più e una build più lenta senza guadagno sulla parte
che concentra la complessità.

---

## D-002 · Catena di derivazione a due sorgenti
**2026-09-06 · chiusa · sostituisce una formulazione precedente**

Le sorgenti modificabili a mano sono **due**, non una:

1. `data/source/xlsx/*.xlsx` — l'annotazione, curata in Excel;
2. `ontology/chora.rdf` — lo schema, curato in Protégé.

Tutto il resto è derivato:

```
xlsx  ──(xlsx→tsv)──▶  tables/*.tsv  ─┐
                                       ├──(tools/etl.py + mapping.yaml)──▶  data/gaddatlas.ttl
ontology/chora.rdf  ──────────────────┘                                          │
                                                                                 ▼
                                                              data/dist/gaddatlas-full.ttl
                                                                     │              │
                                              build_passages.py ◀────┘              └───▶ build_geojson.py
                                                     │                                          │
                                              passages/*.json                          gaddatlas.geojson
```

**Correzione rispetto all'ipotesi iniziale.** Si era detto «il TTL è la sorgente
unica di verità». È falso: il TTL è a sua volta un derivato dei fogli di
annotazione. Modificarlo a mano significa perdere la modifica alla prima
riesecuzione dell'ETL. La sorgente sono i fogli più la TBox.

**Conseguenza.** L'interfaccia è una proiezione del grafo, e il grafo è una
proiezione dell'annotazione: ogni scelta di rappresentazione è tracciabile fino
alla cella del foglio che la motiva.

---

## D-003 · Verifica di coerenza obbligatoria
**2026-09-06 · chiusa**

`tools/audit_alignment.py` verifica nove invarianti ed esce con codice 1 in caso
di fallimento. Gira in CI a ogni push su `data/`, `ontology/`, `tools/`.

**Motivazione.** Il prototipo Observable contiene tre occorrenze di
`const i = tileIndexOf(r.targetId); if (i == null) continue;`. Ogni riga di
`relief` il cui `targetId` non risolva viene scartata senza errore.

**Esito 2026-09-06.** Nove su nove superate; 933/933 righe di `relief` risolte;
703/703 riferimenti navigabili con estratto testuale.

---

## D-004 · Brani testuali serviti per capitolo
**2026-09-06 · chiusa**

Gli estratti stanno in dieci file (`ch01.json` … `ch10.json`) più un indice
`referenceId → capitolo`, non in un file unico.

**Motivazione.** *Tecnica:* l'app carica ~25 KB per il capitolo in vista anziché
~270 KB. *Giuridica:* nessun singolo file contiene l'intero corpus, il che
mantiene la pubblicazione nel perimetro della citazione critica ex art. 70
L. 633/1941. Vedi `NOTICE-EXCERPTS.md`.

**Dati.** 722 estratti, mediana 24 parole, massimo 93, nessuno oltre 600
caratteri. Tetto tecnico in build: 700 caratteri.

---

## D-005 · TBox e ABox in file distinti
**2026-09-06 · chiusa**

`ontology/chora.ttl` (588 triple: 10 classi proprie, 33 proprietà — 17
object e 16 datatype — più 5 termini esterni riusati da PROV-O, SKOS e
GeoSPARQL) è la
serializzazione Turtle derivata da `ontology/chora.rdf` ed è separata da
`data/gaddatlas.ttl` (16.045 triple). Il file unito
`data/dist/gaddatlas-full.ttl` è un derivato prodotto dall'ETL con `--tbox`,
comodo per Protégé e per le query (rdflib non segue `owl:imports`).

**Motivazione.** pyLODE documenta un'ontologia, non un dataset. La separazione
permette inoltre di versionare e citare l'ontologia indipendentemente dai dati,
con due DOI distinti — necessario perché l'ontologia è pensata per il riuso
oltre il caso Gadda (vedi D-008).

---

## D-006 · Namespace persistenti su w3id.org
**2026-09-06 · chiusa**

`gaddatlas.org` era un placeholder mai registrato. Sostituito con:

| | |
|---|---|
| Ontologia | `https://w3id.org/chora#` |
| Vocabolari SKOS | `https://w3id.org/chora/vocab/…` |
| Dataset GaddAtlas | `https://w3id.org/gaddatlas/id/…` |

**Alternative scartate.** (a) Registrare `gaddatlas.org`: ~15 €/anno a tempo
indeterminato, e la permanenza dipende dal rinnovo di un privato. (b) Usare
l'URL di hosting: si rompe al primo trasloco.

**Motivazione.** w3id.org è gratuito, gestito dalla comunità e indipendente
dall'hosting: gli identificatori restano stabili anche se il sito passa da
GitHub Pages a un dominio di ateneo. È la scelta della famiglia SPAR, che ha
origine nello stesso ateneo.

**Motivazione della separazione dei due namespace.** L'ontologia e il dataset
sono artefatti distinti con cicli di vita distinti: l'ontologia può essere
riusata su un altro autore senza portarsi dietro una tripla di Gadda, e il
dataset può crescere senza toccare lo schema.

**Eseguito con** `tools/migrate_namespace.py --onto chora`: 16.897 sostituzioni
in 31 file, più 6 `owl:sameAs` corretti (vedi D-009). Cambiare il nome
dell'ontologia resta una riga di comando.

**Da fare.** Aprire la pull request su `github.com/perma-id/w3id.org` con la
configurazione dei redirect (`w3id/` nel repository). Al 2026-09-06 il percorso
`w3id.org/chora` risulta libero.

---

## D-007 · Hosting
**aperta**

Ipotesi di ospitalità su DH.ARC (`projects.dharc.unibo.it`, come ODI e
LeggoManzoni), non ancora confermata.

**Decisione operativa provvisoria.** Si pubblica su GitHub Pages e si predispone
il trasloco con tre condizioni: `base` di Vite da variabile d'ambiente e mai
percorsi assoluti (i progetti DH.ARC stanno sotto prefisso di percorso); nessun
URL di hosting cablato in codice o dati; URI disaccoppiati dall'hosting (D-006,
già chiusa). Con queste, il trasloco è una variabile e un redirect.

---

## D-008 · Nome e identità dell'ontologia
**2026-09-06 · da confermare con i relatori**

**Il problema.** GaddAtlas nomina l'interfaccia e il caso di studio. L'ontologia
è un artefatto diverso: delle sue 10 classi proprie, solo `LiteraryWork` e i tipi di
agente toccano la specificità letteraria; il nucleo — `PlaceReference`,
`SpatialInterpretation`, `NarrativePlace`, `GazetteerEntity`, `NarrativeRoute`,
`FocalizingAgent` — più i quattro assi SKOS è un modello generale di come un
testo narrativo costruisce lo spazio. Nulla di gaddiano vive nella TBox: il
Pasticciaccio sta tutto nell'ABox.

Legare il nome dello schema a un solo romanzo ne sottostima la portata e ne
scoraggia il riuso, che è invece l'argomento più forte da spendere in tesi: un
contributo di modellazione trasferibile, non un attrezzo monografico.

**Nome provvisorio adottato: CHORA.** Greco χώρα — nel *Timeo* lo spazio come
ricettacolo, distinto dal τόπος come luogo localizzato. La coppia chora/topos
distingue lo spazio vissuto e qualitativo dal luogo misurato: è esattamente la
distinzione fra `NarrativePlace` e `GazetteerEntity` su cui l'ontologia è
costruita. Il nome enuncia la tesi.

Titolo esteso: *CHORA — an Ontology for Narrative Spatiality*. Per il
prefisso vedi D-013: è stato scelto `chora:`.

**Alternative considerate.**

| Nome | Pro | Contro |
|---|---|---|
| **NSO** / Narrative Space Ontology | descrittivo, massima trovabilità | *Narrative Ontology* (NOnt, Meghini–Bartalesi–Metilli, CNR-ISTI) è già occupato e la vicinanza confonde; sigla molto collisa |
| **TOPOS** | doppio senso luogo / *topos* letterario | nomina il polo della distinzione che interessa meno: il luogo localizzato |
| **LOCI** | breve, eco dell'arte della memoria | parola comune, molto collisa |
| **CHORA** | fondato sulla distinzione teorica portante, breve, `w3id.org/chora` libero | opaco a chi non ha il riferimento; in Italia esiste il marchio Chora Media (nessuna collisione nello spazio degli URI, ma rumore nelle ricerche) |

**Precedente locale.** La famiglia SPAR (FaBiO, CiTO, DoCO…), nata nello stesso
ateneo, usa sigle brevi e mnemoniche con il titolo descrittivo in
`dcterms:title`. CHORA segue quella convenzione.

**Da chiudere entro:** prima della pull request w3id, perché il nome fissa
l'URI. Cambiarlo dopo è una riga di comando fino alla pubblicazione, un
problema di *cool URIs* dopo.

---

## D-009 · Correzioni ai dati sorgente
**2026-09-06 · chiusa**

Tre difetti trovati confrontando sorgenti, TTL e GeoJSON. Tutti corretti alla
fonte, non nei derivati.

**1. Sei note critiche perse per colonna sfalsata.**
`SpatialInterpretations.xlsx` aveva una diciassettesima colonna senza
intestazione (`Unnamed: 16`) con sei valori: la nota sulle «nerovestite», che
riguarda `interp_00210`–`interp_00215`, era finita una colonna a destra.
`xlsx_to_tsv` la scartava, quindi non era mai arrivata nell'RDF.
`chora:criticalNote` passa da **53 a 59**.

**2. Tredici categorie di luogo perse per vocabolario incompleto.**
`mapping.yaml` traduce le etichette italiane del foglio in URI dell'ontologia.
Dieci valori usati nei dati non erano mappati — *strada, casa rurale,
abitazione, caffè, edicola, orto, passaggio a livello, casello ferroviario,
camera, bivio stradale* — e l'ETL emetteva un warning proseguendo. Il
vocabolario SKOS conteneva già tutti e dieci i concetti corrispondenti: mancava
solo la riga di mappatura. `chora:hasPlaceCategory` passa da **296 a 309**: ora
tutti i `NarrativePlace` hanno una categoria, e l'ETL gira con **zero warning**.

**3. Sei `owl:sameAs` con URI locali Windows.**
Erano serializzati come
`<file:///C:/Users/lorenzo.sabatino3/Desktop/Atlante%20Gadda_step/…/gaz_castello>`:
un percorso di desktop finito nell'RDF destinato alla pubblicazione. Riscritti
su `https://w3id.org/gaddatlas/id/gazetteer/…` da `migrate_namespace.py`.

Questi sei `sameAs` esprimono le fusioni di alias toponomastici
(`gaz_collegio_romano` ↔ `gaz_santo_stefano_del_cacco_celio_santo_stefano`,
`gaz_lungara` ↔ `gaz_regina_coeli`, `gaz_castello` ↔ `gaz_castel_gandolfo`) che
l'interfaccia ridichiara a mano in `s4Config.ALIAS_GROUPS`. **Ora che gli URI
sono corretti, `ALIAS_GROUPS` va derivato dal grafo** anziché mantenuto in
parallelo: due liste che dicono la stessa cosa divergeranno.

**4. Robustezza dell'ETL.** `int(comp_order)` falliva su `"1.0"`, formato che
Excel produce riesportando i TSV. Sostituito con `int(float(...))`: la pipeline
non dipende più da come il foglio è stato esportato.

**Esito.** 17.168 → **17.203 triple**. SHACL conforme, 12/12 competency query e
10/10 integrity query eseguibili, tutte a zero tranne IQ9 (informativa: 14
luoghi narrativi mai interpretati).

---

## D-010 · Versioni fuori dai nomi dei file
**2026-09-06 · chiusa**

I suffissi `_v4_1`, `_full`, `_manual` sono rimossi dai nomi. I file hanno nomi
stabili; la versione vive in tre posti propri: i tag git, `owl:versionIRI` e
`owl:versionInfo` nella TBox, i DOI Zenodo.

**Motivazione.** Un nome di file che contiene la versione costringe a
riscrivere ogni riferimento a ogni rilascio, ed è la ragione per cui in una
cartella convivono `gaddatlas_v4_1.ttl` e `gaddatlas_v4_1_full.ttl` senza che
sia ovvio quale sia quale.

**Prima versione pubblica: 1.0.0**, con il `CHANGELOG` che dà conto della serie
interna fino a 4.1.1. Il numero è per chi consuma l'ontologia, e prima della
pubblicazione non ci sono consumatori.

---

## D-011 · Fusione degli alias toponomastici: tre fonti che si contraddicono
**2026-09-06 · aperta — decisione editoriale**

**Il problema.** La stessa informazione — quali `GazetteerEntity` distinte
designano lo stesso referente — è dichiarata in tre posti che non concordano.
Una sola coppia su sette è condivisa da due fonti; nessuna da tutte e tre.

| Fonte | Coppie | Contenuto |
|---|---|---|
| Grafo (`owl:sameAs`) | 3 | castel_gandolfo↔castello · collegio_romano↔santo_stefano_del_cacco · lungara↔regina_coeli |
| Notebook (`s4Config.ALIAS_GROUPS`) | 5 | collegio_romano↔santo_stefano_del_cacco · pantheon↔tempio_di_agrippa · santa_margherita_in_abitacolo↔santa_rita_invitacolo · via_de_merli↔via_merulana · viale_della_regina↔viale_regina_margherita |
| `build_geojson.py` (`MERGE_MAP`) | 0 | vuota |

Le tre agiscono in momenti diversi: `MERGE_MAP` fonde a build time prima del
conteggio, `ALIAS_GROUPS` fonde a runtime nell'interfaccia sommando occorrenze e
menzioni per capitolo, `owl:sameAs` non fonde nulla — è un'asserzione che
nessuno consuma.

**Stato attuale.** `MERGE_MAP` resta vuota: è ciò che riproduce esattamente il
GeoJSON su cui il notebook è calibrato, e cambiarla adesso sposterebbe conteggi
e tassellazione senza che sia una scelta consapevole.

**Direzione.** La fonte deve diventare **una sola: gli `owl:sameAs` del grafo**,
ora che i loro URI sono validi (D-009). Da lì `MERGE_MAP` si deriva a build time
e `ALIAS_GROUPS` sparisce dall'interfaccia, che legge la fusione già applicata
nel GeoJSON.

**Da decidere.** Quali delle sette coppie sono fusioni corrette: è una questione
toponomastica, non tecnica. Le quattro del solo notebook vanno confermate e
portate nel grafo come `owl:sameAs`; le due del solo grafo confermate o rimosse.

**Attenzione al verso.** `owl:sameAs` è simmetrico, la fusione no: serve
comunque dichiarare quale id è il canonico.

---

## D-012 · Recuperato lo script di build del GeoJSON
**2026-09-06 · chiusa**

`build_atlas.py` era l'anello mancante della catena. Installato come
`tools/build_geojson.py`, migrato al namespace CHORA e verificato.

**Verifica di riproduzione.** Rieseguito sul TTL corrente ha prodotto **933/933
righe di `relief` identiche** e **300/300 feature senza una differenza di
proprietà** rispetto al GeoJSON precedente. La catena è quindi completa e
riproducibile end-to-end con `make all`.

**Tre differenze attese nel blocco `meta`:** `tripleCount` per le correzioni di
D-009; `source` per la rinomina di D-010; e `reliefBands` da
`logBase 1.55 / maxBands 8` a `1.47 / 9`.

Il terzo punto **cambia il rendering**: il numero di isoipse per tessera si
ricalibra. Non è una regressione ma un allineamento — il notebook dichiara
`BANDS_LOG_BASE = 1.47, BANDS_MAX = 9` fra le proprie costanti e legge
`meta.reliefBands` solo come override; il vecchio GeoJSON gli imponeva 1.55/8,
in contraddizione anche con `TER_BANDS_SPAN: 9` dello stesso `s4Config`.

**voidSeed congelati.** Lo script rigenera i semi per hash se non gliene si
passano, cambiando azimut e silhouette dei 48 tasselli fittizi già calibrati. I
semi sono in `data/source/void_seeds.json` e il Makefile li passa a ogni build.
**Quel file è una sorgente, non un derivato**: perderlo significa perdere la
calibrazione visiva dei fittizi.

**`atlas.json` non si pubblica.** Contiene tutti i 722 estratti in un file
unico — l'unico artefatto che permetterebbe di scaricare l'intero corpus in un
colpo, contro D-004. È in `.gitignore`. Si pubblica `atlas.slim.json`, che ne è
privo.

---

## D-013 · Prefisso `chora:`
**2026-09-06 · chiusa**

Il prefisso dell'ontologia è **`chora:`**, non `ga:`. Applicato a
`ontology/chora.ttl`, `data/gaddatlas.ttl`, `data/dist/gaddatlas-full.ttl` e
agli script Python.

**Motivazione.** `ga:` era l'abbreviazione di *GaddAtlas* e sopravviveva alla
rinomina come residuo: un'ontologia che si chiama CHORA e si abbrevia `ga:`
costringe ogni lettore a ricordare una mappatura che non ha ragione di esistere.
D-008 lo aveva lasciato aperto per non riscrivere le query; la riscrittura si è
rivelata banale e la coerenza vale più del risparmio.

**Residui accettati.** Restano dichiarazioni `PREFIX ga: <https://w3id.org/chora#>`
in `ontology/shapes/*.ttl` e in 28 delle query. **Non è un errore e non rompe
nulla**: un prefisso è un'etichetta locale al file che lo dichiara, e l'URI a cui
punta è identico. Ogni query dichiara il prefisso che usa — verificato. Vanno
allineati per leggibilità, non per correttezza, e non prima della consegna.

---

## D-014 · Il GeoJSON versionato è disallineato rispetto al TTL
**2026-09-06 · aperta — azione richiesta**

`data/dist/gaddatlas.geojson` dichiara nel proprio `meta`:

```
source          gaddatlas_v4_1_full.ttl
tripleCount     17168
buildVersion    4.2
ontology        (assente)
```

È quindi il GeoJSON **precedente** a tutte le correzioni di D-009 e alla
rinomina: `tools/build_geojson.py` è aggiornato (emette `ontology: CHORA`,
`buildVersion: 4.3`) ma non è mai stato eseguito sul TTL corrente.

**Perché l'audit passa comunque.** `tools/audit_alignment.py` verifica
invarianti strutturali — che ogni `targetId` risolva, che ogni `referenceId`
abbia un brano — e quelle reggono, perché nessun identificatore è cambiato: le
correzioni di D-009 hanno aggiunto note critiche e categorie di luogo, non
rinominato entità. Il disallineamento è di provenienza, non di contenuto, ed è
esattamente il tipo di divergenza che l'architettura a sorgente unica esiste per
impedire.

**Azione.** `make geojson` (o `make all`), poi `make audit`. Rigenera anche
`atlas.slim.json` e `data/dist/void_seeds.json`, oggi assenti da `dist/`.

**Attenzione al rilievo.** La rigenerazione porta `meta.reliefBands` da
`logBase 1.55 / maxBands 8` a `1.47 / 9`: il numero di isoipse per tessera
cambia. È l'allineamento previsto in D-012, non una regressione — ma va
guardato a schermo prima di darlo per buono.

---

## D-015 · Moduli dati-dipendenti portati come funzioni, non come IIFE
**2026-09-07 · chiusa**

Nel notebook, `s4Entities`, `s4Chapters`, `s4Projection` e `s4Voronoi`
(oltre a `s4Satellites`) sono `const s4X = (() => { ... })()`: eseguiti una
volta, a modulo caricato, perché Observable garantisce che la cella `gadda_real`
sia già risolta prima che queste girino. Portati in `app/src/model/`, restano
sì un file per modulo con `export default`, ma il default esportato è una
**funzione factory** (`export default function s4Entities(gadda_real) {…}`),
non il risultato già calcolato.

**Motivazione.** `gadda_real` arriva da `fetch` in `boot()` — asincrono. Un
IIFE eseguito al `import` del modulo non potrebbe mai vedere quel dato: gli
servirebbe una variabile globale valorizzata più tardi, o un secondo modulo con
top-level `await` che duplica il fetch già fatto in `main.js`. Entrambe le
strade sono più invasive della funzione factory, che riceve `gadda_real` (o il
risultato del modulo a monte: `s4Entities`, `s4Chapters`, `s4Voronoi`) come
parametro e lo passa oltre esattamente come faceva la destrutturazione
originale — il corpo delle funzioni non cambia di una riga.

Non è la stessa scelta della cella `context2d`, che nel notebook è già una
factory non auto-invocata: lì la forma non cambia nel porting. Qui invece la
forma originale era l'IIFE, e la conversione a factory è la minima modifica
strutturale necessaria per lo stesso motivo per cui `context2d` è factory nel
notebook: un valore che non può esistere al momento della valutazione del
modulo.

**Cosa resta IIFE-like/valore diretto.** `projection.js` (valore diretto,
nessuna dipendenza da dati) e `config.js` (oggetto letterale) non hanno questo
problema e restano come nel notebook.

**Precisazione.** Diventare factory non è un default di stile applicato a
tutti i moduli allo stesso modo: lo si fa solo se un modulo ha una ragione
concreta per farlo. Le ragioni concrete sono due, distinte:

1. **Legge dati asincroni direttamente.** Solo `s4Entities`, `s4Chapters`,
   `s4Terrain`, `s4Sequence` e `s4AttestedRoutes` (quest'ultimo non ancora
   portato) toccano `gadda_real` — l'unico dato che arriva da `fetch`. Sono gli
   unici la cui firma include `gadda_real` come parametro.
2. **Riceve a cascata il risultato di un modulo del punto 1, o di un altro
   modulo già diventato factory.** `s4Projection`, `s4Voronoi`, `s4Satellites`,
   `s4NarrativeGeometry`, `s4RadialLayout`, `s4NarrativeCells` non leggono mai
   `gadda_real`: ricevono `s4Entities` (o `s4Chapters`, `s4Voronoi`, ecc.) già
   calcolato, perché quello è ciò che la destrutturazione in testa al blocco
   del notebook già faceva. Se un modulo dipendesse solo da `s4Config` — nessuno
   dei 13 finora portati è in questo caso — resterebbe un valore diretto, non
   una factory: la conversione non è automatica, segue la dipendenza.

**Conseguenza per l'assemblaggio.** Le factory non si chiamano a mano nei punti
di consumo: `app/src/model/index.js` le chiama tutte una volta sola, in ordine
topologico (`entities → chapters/projection-fit → voronoi → satellites →
terrain/sequence → narrative-geometry → radial-layout → narrative-cells`) — non
l'ordine del file `chartD.js`, che non è topologico (vedi `docs/PORTING.md`) —
ed esporta il modello assemblato con le chiavi nominate come le celle del
notebook (`model.s4Terrain`, `model.s4RadialLayout`, ...). `main.js` chiama
`buildModel(gaddaReal)` una sola volta in `boot()`, dopo il `fetch`, e non vede
le singole factory.

---

## D-016 · Smontaggio esplicito degli handler dei controlli
**2026-09-07 · chiusa**

`s4ChartHandlers.install({shell, constants, state, actions})` restituisce una
funzione `dispose()` al posto di ricevere la promise Observable `invalidation`.
Il futuro proprietario della shell deve chiamarla prima di smontare i controlli
o installare nuovi handler sulla stessa shell.

**Motivazione.** Fuori dal runtime reattivo Observable non esiste una promise
che segnali la rigenerazione della cella. Come D-015, questa è una deviazione
necessaria dal porting meccanico. La funzione conserva la cancellazione del
frame e dell'intervallo di playback originali e azzera tutte le proprietà evento
assegnate da `install()`, liberando i riferimenti alle callback del chiamante.
I corpi degli handler e i template restano invariati.

**Alternativa scartata.** `AbortController` con listener registrati tramite
`addEventListener(..., {signal})`: richiederebbe di convertire tutte le
assegnazioni `onclick`, `oninput`, `onchange` e `onpointerdown` del notebook.
Restituire `dispose()` limita la modifica alla firma e al blocco di smontaggio.

**Verifica in questo gruppo.** `install()` non viene invocato: le callback di
`chartS4` non sono ancora disponibili. Lo smontaggio completo sarà verificato
quando verrà portato il proprietario dello stato.

---

## Voci da compilare durante lo sviluppo

- criterio di attribuzione della tessera propria ai `NarrativePlace`
  (oggi: tutti i non-*Imported*, 48 su 309) — motivare la soglia;
- derivazione di `ALIAS_GROUPS` dai `owl:sameAs` del grafo (vedi D-009);
- canale visivo ridondante per il ruolo narrativo: `Route` (#7A5E1E) e
  `ZoneOfAction` (#A45228) collassano in visione deuteranope;
- comportamento del pannello testuale quando un tassello raccoglie molte
  occorrenze;
- perimetro dell'accessibilità: rappresentazione parallela della tassellazione;
- che cosa entra nella versione di ottobre e che cosa è rinviato ad aprile.
