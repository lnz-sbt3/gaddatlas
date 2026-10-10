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


**Aggiornamento (9/10/2026, D-021 e D-044).** Il § 3 non era chiuso: la causa era nell'ETL, corretta in D-021. Con D-044 gli `owl:sameAs` fra entità del dataset spariscono del tutto: l'identificazione Castello ↔ Castel Gandolfo è un'asserzione di Lorenzo non adottata, le due coppie istituzione/sede sono `chora:housedIn`. La proposta di derivare `ALIAS_GROUPS` dai `sameAs` decade.

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


**Aggiornamento (9/10/2026, D-044).** Il grafo non è più una delle tre fonti: non contiene `owl:sameAs` fra entità del dataset e non dichiara fusioni (le coppie diventano un'asserzione d'identificazione e due `chora:housedIn`). Restano `ALIAS_GROUPS` del notebook, portato così com'è, e `MERGE_MAP`, vuota. Nessuna fusione nuova introdotta. Da notare: `ALIAS_GROUPS` fonde ancora Collegio Romano e Santo Stefano del Cacco, che il grafo ora tratta come istituzione e sede distinte.


**Aggiornamento (9/10/2026, LS).** La fusione Collegio Romano / Santo Stefano del Cacco in `ALIAS_GROUPS` è un'**aggregazione di visualizzazione**: una regola dichiarata di conteggio della vista (R15), non un giudizio d'identità. È coerente con `chora:housedIn` (D-044): istituzione e sede restano referenti distinti nel grafo, e la vista le somma in una tessera. `ALIAS_GROUPS` non si tocca.

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

**Integrazione in chartS4 (2026-09-07).** La factory `chartS4(model, roma)`
restituisce il `wrap` originale con un metodo `dispose()`: richiama lo
smontaggio degli handler, rimuove il listener Escape e i listener D3 dello
zoom. Un `AbortController` interno rimuove i quattro listener del canvas,
già registrati con `addEventListener`, senza cambiare il corpo delle callback.
`main.js` richiama lo smontaggio su HMR e `pagehide`. Stato, `draw()` e `tick()`
restano nello stesso blocco, senza ristrutturazione.

**Verifica nel quinto gruppo.** `install()` non viene invocato: le callback di
`chartS4` non sono ancora disponibili. Lo smontaggio completo sarà verificato
quando verrà portato il proprietario dello stato.

---

## D-017 · Porting completato: cosa resta non verificato
**2026-09-06 · aperta**

I 34 moduli del prototipo Observable sono portati in moduli ES (D-015, D-016).
Ogni gruppo è stato verificato con valori derivati, incrociati contro fonti
indipendenti — l'ETL Python, il GeoJSON, il grafo RDF — e non contro sé stesso.

**Restano tre verifiche aperte**, nessuna bloccante:

1. **Selezione della route da terrazza.** `routeSelection.selectFromTerrace()`
   non è mai stata esercitata. È la stessa catena su cui si innesterà il
   pannello testuale, quindi verrà collaudata nella fase 2.
2. **Smontaggio completo.** La `dispose()` di D-016 è collegata ma mai invocata:
   servirà quando l'atlante verrà montato e smontato dal routing del sito.
3. **Confronto visivo a condizioni identiche** con gli screenshot di riferimento
   del notebook, ai quattro stati e allo stesso capitolo.

**Due dettagli emersi e non corretti**, entrambi ereditati dal notebook:

- `chartS4` disegna solo `roma.features[0]`, mentre `roma.geojson` contiene due
  geometrie. Da capire se la seconda è un'isola, un confine interno o un
  residuo: oggi non compare.
- L'etichetta di stadio parte da `1/6` cablato nel testo del pulsante, ma
  `STAGES` ha cinque voci e `updateSeqUi()` scrive correttamente `1/5` al primo
  aggiornamento. Cosmetico, da correggere nel valore iniziale della shell.

---

## D-018 · Pannello testuale persistente per riferimento
**2026-09-07 · chiusa**

Il click apre un pannello affiancato al canvas, indipendente da capitolo,
focalizzatore e stadio. Le righe di `relief` sono raggruppate per `referenceId`:
un brano compare una sola volta, con tutte le interpretazioni del tassello.
Le fusioni di alias seguono il modello esistente. I gruppi di capitolo si
aprono su richiesta; indice e promise dei capitoli sono conservati in cache
(per capitolo in una `Map`), con possibilità di riprovare dopo un errore.
Un riferimento singolo si presenta direttamente, senza una lista richiudibile.
La selezione di una terrazza apre il capitolo corrispondente ed evidenzia il
riferimento anche quando non appartiene a una route.

**Alternative scartate.** Overlay sopra il canvas, filtro dei brani legato
al frame corrente, precaricamento di tutti i capitoli e lista per
interpretazione: ostacolano rispettivamente confronto, persistenza della
lettura, caricamento incrementale e distinzione attestazione/interpretazione.
Nessuna esportazione cumulativa. I brani senza `sourceReference` non vengono
mostrati; la sigla originale resta visibile e l'edizione Adelphi è esplicitata
secondo `LiteraryWorks.tsv`.

**Note critiche.** Il campo è derivato da `si["criticalNote"]`. Il TTL contiene
59 note, ma solo 56 appartengono a `relief`: `interp_00044`, `interp_00045` e
`interp_00046` hanno `targetsRoute` e sono escluse dal rilievo dei luoghi.
Non si modifica il criterio di inclusione per raggiungere artificialmente 59.

---

## D-022 — Build deterministico (8 ottobre 2026)

- Requisito/i: — (invariante «algoritmi deterministici», work order § 1) · Ipotesi: — · Data check: —
- Stato precedente: due build consecutivi dalle stesse sorgenti producevano derivati diversi. (1) In `tools/build_geojson.py` i 48 tasselli propri erano ordinati solo per `planeCount`; i pareggi seguivano l'iterazione di un `set`, quindi l'hash randomizzato di Python, e l'ordine delle feature del GeoJSON cambiava a ogni build (contenuto per id identico). (2) `tools/etl.py` serializzava TBox e grafo completo con i nodi anonimi di rdflib, che hanno id casuali: due serializzazioni equivalenti si alternavano anche a seed fisso. Il controllo della CI «derivati = build» poteva quindi fallire a caso, e ogni commit portava un diff rumoroso.
- Decisione: chiave di ordinamento `(-planeCount, id)` per i tasselli propri; serializzazione di TBox e grafo completo dopo `rdflib.compare.to_canonical_graph` (funzione `canonical()` in `etl.py`). Scartato `PYTHONHASHSEED` fisso nel Makefile: provato, non basta, perché gli id dei nodi anonimi sono casuali indipendentemente dal seed.
- Motivazione (fonte, pagina): verifica sperimentale (8/10/2026): GeoJSON diverso fra seed diversi prima della correzione, identico dopo; `chora.ttl` alternava due varianti dei nodi `schema:name` dei contributori anche con `PYTHONHASHSEED=1`. Dopo la correzione tre `make all` con seed diversi danno derivati identici byte per byte.
- Integrazione (8/10/2026, durante T-80): dopo T-81 `chora.rdf` è generato dall'ETL, e il serializzatore RDF/XML di rdflib, a differenza di quello Turtle, non ordina i soggetti: l'ordine seguiva l'iterazione dello store in memoria, dipendente dall'hash. `canonical()` restituisce ora un `_SortedGraph`, che itera le triple in ordine (`tools/etl.py:1226-1236`). Verificato con tre seed diversi: tutti i derivati identici; `chora.rdf` isomorfo (588 triple).
- Fase in cui è maturata: revisione critica (audit di fase 1, passo 0)
- File toccati (manifest): `tools/build_geojson.py:703-706`; `tools/etl.py:36`, `:1226-1239` (nuova `canonical()`), `:1329`, `:1351`; derivati rigenerati (`data/dist/gaddatlas.geojson`, `data/dist/gaddatlas-full.ttl`).
- Effetto su KG (triple prima/dopo, SHACL): nessuno. ABox 16.045 → 16.045; full 17.203 → 17.203, isomorfo; `chora.ttl` invariata (588); SHACL conforme, 0 violazioni. L'ordine delle feature fittizie del GeoJSON cambia rispetto alla versione precedente, che era a sua volta casuale: il confronto visivo con il notebook va rifatto al porting. Il grafo completo contiene ancora i `file:///` dei `sameAs` (ora con il percorso di questa macchina): li elimina D-021 (T-82).
- Fusione: il controllo in CI è quello di `main` (`tools/check_reproducible.py`), esteso con il confronto dei byte e con i derivati della TBox: v. D-039.

---

## D-020 — `chora.ttl` è la sorgente canonica della TBox (8 ottobre 2026)

- Requisito/i: — (infrastruttura; aggiorna D-002 e D-005) · Ipotesi: — · Data check: — (work order T-81; AUDIT_0, premessa 1)
- Stato precedente: la sorgente era `ontology/chora.rdf` (RDF/XML salvato da Protégé); `tools/etl.py` la leggeva e riserializzava `chora.ttl` a ogni build. Le patch alla TBox in Turtle sparivano quindi al build successivo, mentre `CLAUDE.md` indicava già `chora.ttl` come file modificabile.
- Decisione: la catena si inverte. `chora.ttl` è la sorgente, curata in Turtle (diff leggibili, patch chirurgiche); `chora.rdf` è un derivato in RDF/XML, rigenerato dall'ETL per chi apre l'ontologia in Protégé. Chi lavora in Protégé salva su `chora.ttl`. Scartata l'alternativa di continuare in Protégé con una specifica applicata a mano (work order § 4, opzione a): rende impossibili review e patch puntuali. Decisione di Lorenzo dell'8/10/2026.
- Motivazione (fonte, pagina): prima dell'inversione `chora.rdf` e `chora.ttl` sono stati verificati isomorfi (`rdflib.compare.isomorphic`, 588 triple ciascuno, 0 differenze); dopo, il `chora.rdf` rigenerato è isomorfo a quello precedente. Il passaggio non cambia il contenuto dell'ontologia, solo la direzione della derivazione.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `tools/etl.py:1268-1270`, `:1274-1276` (default e help degli argomenti), `:1310-1313` (commento), `:1321` (lettura in Turtle), `:1330` (scrittura in RDF/XML); `Makefile:24-26`, `:32-33`; `README.md:37-38`, `:62`, `:68`; `ontology/README.md:71-72`; `data/README.md:16`; `CLAUDE.md:49-51`. Derivato rigenerato: `ontology/chora.rdf` (serializzazione rdflib al posto di quella di Protégé: i commenti XML di Protégé non ci sono più).
- Effetto su KG (triple prima/dopo, SHACL): TBox 588 → 588; ABox 16.045 → 16.045; full 17.203 → 17.203; `chora.ttl` e `data/dist/` identici byte per byte; SHACL conforme, 0 violazioni; 22 query eseguite, IQ9 = 14 come prima. **Ambiente:** durante il task `pip install pylode` ha aggiornato in `dh_env` rdflib (7.6.0), pyshacl (0.40.1), owlrl e altre dipendenze; le versioni precedenti non sono state registrate. Con le nuove versioni i derivati sono identici, salvo la serializzazione RDF/XML di `chora.rdf`, che resta isomorfa. Su decisione di Lorenzo si tengono le versioni attuali, le stesse che la CI installa senza versione fissa. **Rinviato:** `make docs` (pyLODE 3.6.0 ha una dipendenza rotta, `kurra`); la documentazione si rigenera alla fine della fase 1, dopo T-04.

---

## D-019 — I TSV sono la sorgente canonica dei dati (8 ottobre 2026)

> **Rinumerazione (9 ottobre 2026).** Le voci dell'allineamento al Capitolo 4 erano state numerate D-015…D-034 sul branch `allinea-cap4-fase1`, mentre su `main` D-015…D-018 erano già assegnate a decisioni del porting. Per non toccare numeri già pubblicati, le voci del branch sono state spostate di quattro: D-015…D-034 → **D-019…D-038**. Tutti i rimandi in DECISIONS, DATA_CHECKS, work order, AUDIT_0, `CLAUDE.md` e nei commenti del codice sono stati aggiornati; i messaggi dei commit precedenti alla rinumerazione citano ancora i numeri vecchi.
>
> | Numero sul branch (commit) | Numero definitivo |
> |---|---|
> | D-015 | D-019 |
> | D-016 | D-020 |
> | D-017 | D-021 |
> | D-018 | D-022 |
> | D-019 | D-023 |
> | D-020 | D-024 |
> | D-021 | D-025 |
> | D-022 | D-026 |
> | D-023 | D-027 |
> | D-024 | D-028 |
> | D-025 | D-029 |
> | D-026 | D-030 |
> | D-027 | D-031 |
> | D-028 | D-032 |
> | D-029 | D-033 |
> | D-030 | D-034 |
> | D-031 | D-035 |
> | D-032 | D-036 |
> | D-033 | D-037 |
> | D-034 | D-038 |


- Requisito/i: — (infrastruttura; aggiorna D-002) · Ipotesi: — · Data check: — (work order T-80; AUDIT_0, premessa 2)
- Stato precedente: la documentazione indicava come sorgente gli XLSX di `data/source/xlsx/`, ma l'ETL legge i TSV di `data/source/tables/` (`Makefile`, target `rdf`). La conversione `tools/xlsx_to_tsv.py` era manuale e fuori dal Makefile: una modifica fatta in Excel e non riconvertita veniva ignorata in silenzio. All'audit XLSX e TSV coincidevano (0 differenze di valore).
- Decisione: i TSV sono la sorgente canonica, diffabile e revisionabile in git. Gli XLSX diventano un derivato per chi lavora in Excel e si rigenerano con `make xlsx` (`tools/tsv_to_xlsx.py`, nuovo). `tools/xlsx_to_tsv.py` resta solo per riportare nei TSV una modifica fatta in Excel, con un avviso: sovrascrive il TSV. Scartata l'alternativa di tenere gli XLSX come sorgente e mettere la conversione nel Makefile: gli XLSX sono binari, non diffabili, e la conversione altera i decimali (v. sotto). Decisione di Lorenzo dell'8/10/2026.
- Motivazione (fonte, pagina): giro TSV → XLSX → TSV verificato byte per byte su tutti e sette i fogli. In `tsv_to_xlsx.py` diventano numeri solo gli interi; i decimali restano testo, perché openpyxl li scrive con 16 cifre significative e le coordinate perderebbero l'ultima cifra al ritorno (es. 12.563362579004666 → 12.56336257900467), mentre «1.0» di `Confidence` tornerebbe «1».
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `tools/tsv_to_xlsx.py` (nuovo, 1-69); `tools/xlsx_to_tsv.py:5-9` (avviso); `Makefile:1`, `:15` (help), `:25-30` (target `xlsx`); `README.md:45-46`, `:61-63`, `:66`; `data/README.md:11`, `:17-21`; `CLAUDE.md:49-50`. Rigenerati con `make xlsx`: i sette `data/source/xlsx/*.xlsx`. Cambiano nome del foglio (ora quello del file, prima talvolta «Sheet1»); `GazetteerEntities.xlsx` perde quattro colonne finali senza intestazione e vuote, che la conversione già scartava.
- Effetto su KG (triple prima/dopo, SHACL): nessuno, i TSV non cambiano. ABox 16.045, full 17.203; SHACL conforme, 0 violazioni. Nota: openpyxl scrive data e ora nei metadati degli XLSX, quindi ogni `make xlsx` produce binari diversi anche a dati invariati. `make xlsx` non fa parte di `make all` e la CI non confronta gli XLSX.

---

## D-021 — `owl:sameAs` con IRI assoluti; controllo sugli IRI del grafo (8 ottobre 2026)

- Requisito/i: R10, R22 (premessa tecnica) · Ipotesi: — · Data check: DC-17, DC-10 (work order T-82; AUDIT_0, premessa 7). Aggiorna D-009 (§ 3) e D-011.
- Stato precedente: `tools/etl.py` costruiva `URIRef(same_as)` sul valore della colonna `sameAs` di `GazetteerEntities.tsv`, che contiene id di altre GazetteerEntity (`gaz_castello`), non URI. Ne uscivano IRI relativi in `data/gaddatlas.ttl` (`<gaz_castello>`), che al parsing del grafo completo diventavano `file:///<percorso della macchina di build>/data/gaz_…`. D-009 dichiarava chiuso il difetto, ma la correzione era stata applicata al derivato (`tools/migrate_namespace.py`) e non alla causa: al build successivo era tornato, con il percorso di desktop di chi aveva lanciato la build. Nessun controllo lo intercettava (IQ3 non guarda `owl:sameAs`).
- Decisione: un id senza schema si risolve nel namespace del gazetteer con la stessa funzione che costruisce gli URI delle entità (`resolve_lookup(…, '@GazetteerEntity_ID')`); un valore con schema `http(s)://` resta com'è (link esterno, come previsto dal commento di `mapping.yaml:320`). Il numero delle coppie non cambia (3 coppie, 6 triple). La sostituzione dei `sameAs` con identificazioni attribuite resta T-31 (DM-06). Nuovo controllo in `tools/audit_alignment.py`: fallisce se un IRI dell'ABox o del grafo completo non ha schema `http(s)`, o se un IRI dei namespace del progetto è in `http` invece che in `https`. La formulazione letterale del work order («ogni IRI comincia con `https://`») fallirebbe sui vocabolari W3C, che sono `http://www.w3.org/…` per definizione: il controllo è stato riformulato così.
- Motivazione (fonte, pagina): AUDIT_0, premessa 7. Prova del controllo: sui derivati precedenti segnala esattamente i 6 IRI `file:///…`; dopo la correzione passa.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `tools/etl.py:672-677` (commento), `:680-686` (risoluzione); `tools/audit_alignment.py:20`, `:28-29` (`PROJECT_NS_HTTP`), `:144-168` (controllo). Derivati rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.045 → 16.045; full 17.203 → 17.203. I 6 `owl:sameAs` puntano ora a `https://w3id.org/gaddatlas/id/gazetteer/…`; il grafo completo non contiene più percorsi locali. SHACL conforme, 0 violazioni; query senza errori. **Effetto collaterale:** il GeoJSON e `atlas.slim.json` cambiano solo nell'ordine delle feature referenziali (contenuto identico per id; relief, paths e meta identici), perché la query SPARQL di `build_geojson.py` non ha `ORDER BY` e l'ordine dei risultati segue il grafo. È deterministico (D-022) ma si sposterà a ogni cambiamento dei dati: da valutare prima del porting, perché il prototipo usa l'indice come criterio di pareggio. Dopo questa voce, D-011 conta due fonti di alias corrette (grafo e notebook), non più una rotta.

---

## D-023 — `app/public/data/` si pubblica dai derivati (8 ottobre 2026)

- Requisito/i: R21 (gli estratti pubblicati sono quelli verificati) · Ipotesi: — · Data check: — (work order T-83; AUDIT_0, premessa 10)
- Stato precedente: l'interfaccia carica i dati da `app/public/data/`, ma nessun target del Makefile ci copiava i derivati: la copia si faceva a mano. Il GeoJSON versionato lì differiva da `data/dist/` (ordine delle feature, `meta.excerptsIncluded: true` contro `false`; contenuto per id identico). I passages coincidevano, ma nel working tree erano in CRLF. Una correzione dei dati (per esempio T-01) non sarebbe arrivata all'app.
- Decisione: nuovo target `make publish-data`, incluso in `make all` prima di `audit`, che copia `data/dist/gaddatlas.geojson` e `data/dist/passages/*.json` in `app/public/data/`. `roma.geojson` resta fuori: ha sorgente propria (`data/source/roma.geojson`, già identica). `audit_alignment.py` fallisce se una delle 12 copie non coincide byte per byte con il derivato. La CI esegue anche `publish-data` e include `app/public/data` nel confronto «derivati = build».
- Motivazione (fonte, pagina): AUDIT_0, premessa 10. Prova del controllo: sullo stato precedente segnala 12/12 file non allineati; dopo `make all` passa (12/12).
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `Makefile:1`, `:5`, `:11` (help), `:22` (`all`), `:57-64` (target); `tools/audit_alignment.py:26` (`APP_DATA`), `:170-184` (controllo); `.github/workflows/data.yml:22`, `:37`, `:40`. Copia rigenerata: `app/public/data/gaddatlas.geojson`; i passages non cambiano contenuto.
- Effetto su KG (triple prima/dopo, SHACL): nessuno. ABox 16.045, full 17.203; SHACL conforme, 0 violazioni.

---

## D-024 — «Fattocchie» → «Frattocchie» nell'estratto di QP 241 (8 ottobre 2026)

- Requisito/i: R21 (evidenza testuale stabile e verificabile), R01 · Ipotesi: — · Data check: DC-01 (work order T-01)
- Stato precedente: l'estratto di `ref_00588` (QP 241, cap. IX) leggeva «su su su fu fu fu da 'e Fattocchie», lezione della copia digitale Adelphi da cui è stato condotto il censimento. Il luogo (`frattocchie`) e l'ancoraggio (`gaz_frattocchie`) erano già corretti: l'errore stava solo nel testo dell'estratto.
- Decisione: l'estratto segue il volume a stampa, «Frattocchie». È una correzione di trascrizione verso il testo di riferimento, non un'emendazione del progetto: l'emendazione è dell'editore. «Fattocchie» resta una lezione di RR II (p. 219, stampa Garzanti), da registrare come variante di testimone con il modello di T-41, insieme alla lettura di Terzoli (2015, p. 771: «se non è refuso, rafforza l'onomatopea precedente») e all'emendazione di Pinotti (QP 241; Italia 2020, pp. 101–102): fase 2–3.
- Motivazione (fonte, pagina): verifica di LS sul volume a stampa (6/10/2026): Pinotti emenda «Fattocchie» (RR II 219) in «Frattocchie» (QP 241). Cap. 4, § 4.3 e n. 23.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/References.tsv:589`; `data/source/xlsx/References.xlsx` (rigenerato). Derivati: `data/gaddatlas.ttl`, `data/dist/gaddatlas-full.ttl`, `data/dist/passages/ch09.json`, `app/public/data/passages/ch09.json`.
- Effetto su KG (triple prima/dopo, SHACL): cambia solo un letterale. ABox 16.045 → 16.045; full 17.203 → 17.203; SHACL conforme, 0 violazioni. Nessuna occorrenza di «Fattocchie» resta nei dati o nell'app: compare solo nei documenti che ne discutono (Cap. 4, work order, registro, AUDIT_0, `CLAUDE.md`). Il controllo a campione delle altre lezioni sul cartaceo resta T-12 / T-56.

---

## D-025 — Metadati della redazione in «Letteratura» (8 ottobre 2026)

- Requisito/i: R01 (testimone e redazione) · Ipotesi: H2 · Data check: DC-05 (work order T-40, parte di fase 1)
- Stato precedente: `work/quer_pasticciaccio_letteratura`, nota: «Prima pubblicazione in 5 tratti sulla rivista Letteratura, dal 1946 al 1948». L'arco 1946–1948 è errato: le puntate escono tutte nel 1946.
- Decisione: nota corretta in «Prima pubblicazione in cinque puntate sulla rivista «Letteratura», fascicoli 26, 27, 28, 29 e 31 del 1946 (Pinotti 2016, p. 200, n. 4)». Il resto della riga è invariato. La separazione fra opera e testimoni (QPL, dtsFG, bzFG, QP57, QP) resta T-40, `DA DECIDERE` (fase 2).
- Motivazione (fonte, pagina): Pinotti 2016, p. 200, n. 4; Pinotti 2024, § 7.2; Cap. 4, § 4.2 (r. 41): fascicoli 26, 27, 28, 29 e 31 del 1946, con la sola omissione del n. 30.
- Fase in cui è maturata: analisi del testo (revisione della bibliografia per il Cap. 4)
- File toccati (manifest): `data/source/tables/LiteraryWorks.tsv:3` (colonna `Notes`); `data/source/xlsx/LiteraryWorks.xlsx` (rigenerato). Derivati: `data/gaddatlas.ttl`, `data/dist/gaddatlas-full.ttl`.
- Effetto su KG (triple prima/dopo, SHACL): cambia solo il letterale `rdfs:comment` dell'opera. ABox 16.045 → 16.045; full 17.203 → 17.203; SHACL conforme, 0 violazioni.

---

## D-026 — Sei interpretazioni incoerenti con il riferimento; controllo sulle sorgenti (8 ottobre 2026)

- Requisito/i: R04, R22 · Ipotesi: — · Data check: DC-19 (work order T-84; AUDIT_0, § 3)
- Stato precedente: in `SpatialInterpretations.tsv` sei interpretazioni avevano un luogo diverso da quello del loro riferimento. Nessun controllo li intercettava: nel grafo la PlaceReference non porta il proprio luogo, quindi l'incoerenza era invisibile a SHACL e alle query.
- Decisione (caso per caso, dopo verifica sull'estratto; casi non univoci decisi da Lorenzo l'8/10/2026):
  - `interp_00245` (QP 92, «Milano, Bologna, Vicenza, Padova»): id del luogo «vicenza » con spazio finale → «vicenza». Univoco: l'ETL già lo ripuliva, nel grafo non cambia nulla.
  - `interp_00627` / `interp_00628` (QP 210, «da dietro a Tivoli e a Càrsoli»): riferimenti scambiati fra Càrsoli e Tivoli. Si scambiano i `Reference_ID` (00627 → `ref_00523`, 00628 → `ref_00522`); luoghi e ancore erano giusti. Univoco: stesso estratto, stessa pagina.
  - `interp_00331` (QP 135, «L'antro jeri mattina ereno ancora a Piazza Verdi»): luogo `banca_ditalia` → `piazza_verdi`. Riferimento e ancora (`gaz_piazza_verdi`) indicavano già piazza Verdi; la Banca d'Italia ha un proprio riferimento sulla stessa pagina (`ref_00286`). Decisione di Lorenzo.
  - `interp_00858` (QP 294, «davanti al portone della rocca», Ingravallo) e `interp_00859` (QP 294, «via Massimo Dazzélio», Di Pietrantonio): **eliminate**. Erano doppioni: per gli stessi focalizzatori e riferimenti esistono già `interp_00861` (Tenenza) e `interp_00865` (via Massimo d'Azeglio), e la collocazione a Marino è già data dalle ancore (`gaz_marino`; `gaz_via_massimo_dazeglio` è geocodificata a Marino). Decisione di Lorenzo.
- Controllo: il confronto vero si fa sulle sorgenti, in `tools/audit_alignment.py`: fallisce se il luogo di un'interpretazione è diverso dal `NarrativePlace_ID` del suo riferimento (interpretazioni di route escluse). Lanciato sui TSV precedenti, segnala esattamente i sei casi. `IQ11` in `ontology/queries/integrity.rq` è informativa («riferimenti con più luoghi»): nel grafo non si può fare di più senza cambiare il modello della PlaceReference, e un riferimento con più luoghi può essere una referenza plurale voluta (R04, T-47). Scartata la proprietà PlaceReference → NarrativePlace nel grafo: contraddice la definizione attuale della classe e andrebbe decisa a parte. Decisione di Lorenzo.
- Motivazione (fonte, pagina): estratti di QP 92, 135, 210, 294; AUDIT_0, § 3.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `data/source/tables/SpatialInterpretations.tsv:246`, `:332`, `:628-629`, `:861-862` (righe eliminate); `data/source/xlsx/SpatialInterpretations.xlsx` (rigenerato); `tools/audit_alignment.py:16`, `:28`, `:172-192`; `ontology/queries/integrity.rq:5`, `:110-125` (IQ11); conteggio delle query («11 integrity») in `CLAUDE.md:149`, `Makefile:14`, `README.md:27,40,93`, `data/README.md:70`, `ontology/README.md:76`.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.045 → **16.029**; full 17.203 → **17.187** (−16: 8 triple per ciascuna interpretazione eliminata); interpretazioni 962 → **960**; righe di relief 933 → 931; Marino da 15 a 13 occorrenze. Le altre correzioni non cambiano la vista: i luoghi Imported confluiscono nella tessera della loro ancora, che era già quella giusta. IQ9 da 14 a 13 (piazza Verdi ora è interpretata); IQ11 = 0. SHACL conforme, 0 violazioni. Il `tripleCount` del GeoJSON passa a 17.187: il riferimento in `CLAUDE.md` (17.203) si aggiorna a fine fase.

---

## D-027 — Pulizia di label, spazi, maiuscole e separatori (8 ottobre 2026)

- Requisito/i: R05 (forme normalizzate leggibili) · Ipotesi: — · Data check: DC-13 (work order T-85, comprende la parte di pulizia di T-74)
- Stato precedente: spazi finali in quattro label (`palazzo` «Palazzo », `piazza_colonna`, `via_dei_greci`, `via_lanza` «Via Lanza ») e in tre descrizioni (`centrale_del_latte`, `collina_molisana`, `orto_vigna_due_santi`); uno spazio non separabile (U+00A0) in coda all'ancoraggio `gaz_brahmaputra` di cinque interpretazioni (`interp_00356`, `00357`, `00365`, `00366`, `00367`); relazione spaziale scritta «adjacentTo» in 7 righe e «adjacentto» in 3; `Annotation_Method` «close reading» in 2 righe (`interp_00144`, `interp_00205`) contro «close_reading» in 143; separatori incoerenti in `Alternative_Toponym` (`palazzo_219`, `laboratorio_zamira`, con un «;» finale).
- Decisione: rimossi gli spazi ai bordi e gli U+00A0; relazione uniformata a «adjacentto», la forma minuscola usata da tutti gli altri valori di vocabolario nei fogli (`inside`, `projectedspace`, `zoneofaction`) e già chiave di `mapping.yaml:185` (il piano indicava «adjacentTo»: cambiato per coerenza); metodo uniformato a «close_reading»; `Alternative_Toponym` con separatore «; » e senza elementi vuoti. Nessun valore semantico cambia.
- Motivazione (fonte, pagina): AUDIT_0, T-74 e § 3; DATA_CHECKS DC-13. L'ETL già ripuliva U+00A0 e maiuscole delle relazioni (`resolve_lookup` e `map_vocabulary` fanno `strip()` e `lower()`), quindi quelle due correzioni non toccano il grafo: rendono pulite le sorgenti.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `data/source/tables/NarrativePlaces.tsv` (9 righe: `centrale_del_latte`, `collina_molisana`, `laboratorio_zamira`, `orto_vigna_due_santi`, `palazzo`, `palazzo_219`, `piazza_colonna`, `via_dei_greci`, `via_lanza`); `data/source/tables/SpatialInterpretations.tsv` (14 righe: `interp_00144`, `00205`, `00356`, `00357`, `00365`–`00367`, `00527`, `00528`, `00552`, `00553`, `00555`, `00585`, `00836`); i due XLSX corrispondenti, rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.029 → 16.029; full 17.187 → 17.187. Cambiano 11 letterali (4 `rdfs:label`, 3 `dcterms:description`, 2 `chora:annotationMethod`, 2 `skos:altLabel`). SHACL conforme, 0 violazioni. **Da segnalare per T-48:** l'ETL non divide `Alternative_Toponym`, quindi ogni cella diventa un unico `skos:altLabel` con i punti e virgola dentro («palazzo dell'oro; palazzo de li pescicani; …»); inoltre alcune celle contengono id invece di forme (`prati` ↔ `quartierino_prati`) o valori dubbi (`tiburtino` → «Tivoli», `san_giovanni` → «Galilei»). Non toccati: sono decisioni di contenuto (R05).

---

## D-028 — Adapter: un record per interpretazione anche con più ancore (8 ottobre 2026)

- Requisito/i: R04 (molti-a-molti), R15 (regola di aggregazione) · Ipotesi: — · Data check: — (emerso durante T-15)
- Stato precedente: `tools/build_geojson.py` interroga le interpretazioni con `OPTIONAL { ?si ga:anchorsToEntity ?gaz }`. Un'interpretazione con più ancore torna quindi una volta per ancora, e ogni riga diventava un record separato: interpretazioni, ruoli, determinazioni e righe di rilievo moltiplicati per il numero delle ancore. Era un difetto latente, perché fino a T-15 nessuna interpretazione aveva più di un'ancora (l'ETL lo permette con gli id separati da `|`). Con l'ancoraggio relazionale di Casal Bruciato (4 ancore) le 13 interpretazioni diventavano 52 righe di rilievo.
- Decisione: un solo record per interpretazione. Le ancore in più contribuiscono soltanto ai referenti del luogo (`refers_to_entity_ID`) e al conteggio delle interpretazioni ancorate di ciascuna entità (`anchoredTotal`). Il campo singolo `gazetteerId` prende il primo id in ordine alfabetico, per restare deterministico (D-022). Limite dichiarato: per un luogo **Imported** con più ancore, che oggi non esiste, il rilievo andrebbe a una sola entità; la regola di aggregazione per quel caso resta da decidere con R15 / T-63.
- Motivazione (fonte, pagina): verifica sul GeoJSON di T-15: senza correzione 960 → 999 interpretazioni e 931 → 970 righe di rilievo, a grafo invariato (960 interpretazioni); con la correzione i conteggi restano 960 e 931.
- Fase in cui è maturata: prototipazione (adapter dati, durante T-15)
- File toccati (manifest): `tools/build_geojson.py:322-327` (commento), `:337-346` (accumulo delle ancore in più), `:363` (`rec_by_si`).
- Effetto su KG (triple prima/dopo, SHACL): nessuno sul grafo. Con i dati precedenti a T-15 i derivati sono identici byte per byte a quelli versionati.

---

## D-029 — Casal Bruciato: luogo trasformato con ancoraggio relazionale (8 ottobre 2026)

- Requisito/i: R03, R04, R07, R10 · Ipotesi: H1, H3 · Data check: DC-18, DC-07 (work order T-15)
- Stato precedente: `casal_bruciato` era Imported e le sue 13 interpretazioni erano ancorate a `gaz_casal_bruciato`, collocato a 41,9070 N 12,5506 E: il **quartiere romano** di Casal Bruciato (Tiburtino), non il luogo del romanzo. Il casello al km 20,25 (22 interpretazioni) e i suoi interni ereditavano la stessa posizione.
- Decisione (di Lorenzo, 8/10/2026): Casal Bruciato **non ha coordinate reali**. Diventa un luogo **Transformed**, ancorato in modo relazionale ai riferimenti geografici che lo circoscrivono: a nord/nord-est i Castelli (Marino, da cui parte Pestalozzi) e l'Appia verso Albano (`gaz_albano_laziale`, scelto al posto di `gaz_via_appia`, il cui punto è a 41,85 N, presso Roma); a ovest Pavona, snodo del percorso e della ferrovia; a sud Santa Palomba e le sue antenne. In pratica: le 13 interpretazioni hanno quattro ancore (`gaz_marino|gaz_albano_laziale|gaz_pavona|gaz_santa_palomba`) con relazione `near` e una nota critica che riporta le direzioni e la lettura di Manzotti. `gaz_casal_bruciato` è **eliminata** dal gazetteer (referente errato, nessun uso residuo). Il casello diventa **parte di** `casal_bruciato` (`Is_Part_Of`) ed eredita l'ancoraggio: le sue 22 interpretazioni perdono l'ancora propria e la relazione `near`, che si riferiva al vecchio punto. Le direzioni cardinali e un concetto di «ancoraggio relazionale» non sono ancora esprimibili nella TBox: restano nella nota e vanno in T-47/T-53 (fase 2), come per Robine Vecchie.
- Motivazione (fonte, pagina): QP 240 (la vicinale per Casal Bruciato si stacca dalla strada di Falcognana presso il ponte del Divino Amore), QP 237, 274, 298 (verso l'Ardeatina), QP 241 («detto da taluni di Casal Bruciato»); Manzotti 2010, pp. 268–270 (TCI tra le ferrovie Roma–Velletri e Roma–Napoli, IGM a ovest della Roma–Napoli; la topografia del casello «pare combinare e forse confondere» le due tratte); Cap. 4, § 4.3 (r. 93, ancoraggio relazionale) e § 4.4.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/GazetteerEntities.tsv` (eliminata la riga `gaz_casal_bruciato`, già r. 467–482 con la geometria multiriga); `data/source/tables/NarrativePlaces.tsv:38` (statuto, descrizione), `:39` (`Is_Part_Of`); `data/source/tables/SpatialInterpretations.tsv`: 13 righe di `casal_bruciato` (ancore, relazione, nota) e 22 di `casello_km_20_25` (ancora e relazione rimosse); `data/source/void_seeds.json` (nuovo seme `casal_bruciato` = 0,661939, lo stesso che il build avrebbe calcolato dall'hash dell'id); tre XLSX rigenerati. Correzione delle righe nel manifest di D-028.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.029 → **16.044**; full 17.187 → **17.202** (+15: −7 per l'entità eliminata; +65 per le 13 interpretazioni, cioè 3 ancore, relazione e nota ciascuna; −44 per le 22 del casello; +1 `isPartOf`). Gazetteer 265 → 264; Imported 260 → **259**, Transformed 29 → **30**. Vista: tessere proprie 48 → 49 (nuova per `casal_bruciato`, 13 interpretazioni, 8 occorrenze), i 48 semi preesistenti invariati; generatori della tassellazione 222 → 221; le tre tessere del casello ora ereditano le quattro ancore. Il rilievo non cambia (931 righe, D-028). SHACL conforme, 0 violazioni; IQ3 = 0, IQ11 = 0. **Per la tesi:** i conteggi per statuto cambiano (259/30/15/5 prima della permutazione di T-04).
- Revisione: **rivista da D-037** (9/10/2026): Casal Bruciato è un casale reale, Imported, ancorato a `gaz_casale_abbruciato`; Marino e Albano tolti dalle ancore; il casello non è più parte di Casal Bruciato.

---

## D-030 — Permutazione Invented ↔ Imagined (8 ottobre 2026)

- Requisito/i: R07 · Ipotesi: H3 · Data check: DM-01, DC-16 (work order T-04)
- Stato precedente: nella TBox le definizioni SKOS dei due concetti erano invertite rispetto a Reuschel, Piatti e Hurni (2013, pp. 138–139): `chora:Imagined` aveva la definizione dell'*invented* («An invented setting within familiar geographical reality») e `chora:Invented` quella dell'*imagined* («no hint at all about the position… ‘somewhere’»). L'ordine della scala non era dichiarato e il commento di `hasRealityStatus` elencava «imported, transformed, imagined, invented». Gli `owl:differentFrom` erano asimmetrici (Imported senza Imagined, Invented solo con Transformed, Transformed senza alcuno). Dati: 15 Imagined, 5 Invented.
- Decisione (di Lorenzo, 8/10/2026): le due etichette erano invertite di nome, in TBox e nei dati. Si corregge con una **permutazione completa**, non con una revisione caso per caso (unica eccezione decisa alla regola «niente sostituzioni globali sui valori semantici»). Nella TBox: definizioni scambiate; `skos:notation` 1–4 (Imported, Transformed, Invented, Imagined: dal concreto all'astratto); uno `skos:scopeNote` su Invented e su Imagined con la fonte; commento di `hasRealityStatus` riscritto con l'ordine della scala; `owl:differentFrom` completi fra i quattro concetti. Nei dati: scambio atomico dei valori in `NarrativePlaces.tsv`, passando per un valore temporaneo (script una tantum, non versionato). Ordine allineato anche in shape, mapping e README. I **glifi** del prototipo non sono toccati: restano legati al nome dello statuto, ed è DA DECIDERE con T-65 se debbano seguire il significato.
- Motivazione (fonte, pagina): Reuschel, Piatti e Hurni 2013, pp. 138–139; Cap. 4, § 4.3 (r. 85); DATA_CHECKS DM-01.
- Fase in cui è maturata: revisione critica (stesura del Cap. 4)
- File toccati (manifest): `ontology/chora.ttl:377` (commento), `:527-529` (Imagined: definizione, notation, scopeNote), `:609-614` (Imported: differentFrom, notation), `:657-663` (Invented: differentFrom, definizione, notation, scopeNote), `:697-702` (Transformed: differentFrom, notation); `ontology/shapes/chora-shapes.ttl:185`; `data/source/mapping.yaml:38-43`; `README.md:111`, `:129`; `data/source/tables/NarrativePlaces.tsv` (20 righe, colonna `Reality_Status`); `NarrativePlaces.xlsx` e `chora.rdf` rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): TBox 588 → **600** (+4 `skos:notation`, +2 `skos:scopeNote`, +6 `owl:differentFrom`); ABox 16.044 → 16.044 (cambiano solo i valori); full 17.202 → **17.214**. Statuti: Imported 259, Transformed 30, **Invented 15, Imagined 5**. I conteggi attesi dal work order (260/29/15/5) precedono T-15, che ha portato Casal Bruciato da Imported a Transformed. GeoJSON: cambia solo `reality_status` su 19 tessere (`castello` non ne ha una). SHACL conforme, 0 violazioni. **Elenchi.** Ora Invented (prima Imagined): bottega_ceccherelli, cantinone_albano, casa_crocchiapani, cassero, castello, casuccia_zamira, edicola_due_santi, grotta_de_sor_pippo, laboratorio_zamira, orto_vigna_due_santi, pensione_burgess, pozzofondo, tor_di_gheppio, via_delle_oche, villino_lungotevere. Ora Imagined (prima Invented): casa_del_butiro, castel_porcano, monte_nuncupale, roccafringoli, scerpure. **Da fare:** `make docs` (rinviato a fine fase); `ontology/chora.jsonld` non è generato da nessuno strumento e contiene ancora le definizioni invertite.

---

## D-031 — Edicola ai Due Santi: luogo importato (8 ottobre 2026)

- Requisito/i: R03, R07, R22 · Ipotesi: H3 · Data check: DC-03 (work order T-03)
- Stato precedente: `edicola_due_santi` era Invented (Imagined prima della permutazione di D-030), parte di `orto_vigna_due_santi`, senza ancoraggio nelle sue 3 interpretazioni; descrizione «Edicola immaginata…». Nessuna GazetteerEntity adatta.
- Decisione (di Lorenzo, 8/10/2026): statuto **Imported**, nuova descrizione, `Is_Part_Of` tolto (un luogo importato parte di un luogo fittizio era incoerente, e `isPartOf` gli avrebbe fatto ereditare l'ancoraggio sbagliato). Nuova `gaz_edicola_due_santi`. Non esistendo una coordinata TCI, la posizione **eredita quella di `gaz_due_santi`** con uno scarto convenzionale di +0,0003° in latitudine e longitudine (circa 40 m), al solo scopo di non far coincidere due generatori della tassellazione. Lo scarto è dichiarato in `Authority_Source`, che l'ETL serializza come `dcterms:source` (in AUDIT_0, T-46, avevo scritto per errore che la colonna non era mappata: è mappata, ma era vuota in tutte le 265 righe). Le 3 interpretazioni sono ancorate alla nuova entità. La relazione qualitativa con l'orto (`AdjacentTo`: il tabernacolo «interrompeva» il muriccio, QP 216) è rinviata a T-53, perché oggi il modello non ha relazioni fra luoghi narrativi oltre a `isPartOf`. L'asserzione attribuita a Manzotti e la revisione superata della lettura di LS entrano in fase 3. Il seme `edicola_due_santi` resta in `data/source/void_seeds.json`, inutilizzato, perché un eventuale ritorno della tessera propria non ne cambi la forma.
- Motivazione (fonte, pagina): Manzotti 2010, p. 246 (traccia del tabernacolo nella piantina dei Castelli, TCI, *Italia centrale* IV); QP 216, 219; Cap. 4, n. 24 (r. 601).
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/GazetteerEntities.tsv:789-804` (nuova riga, con la geometria multiriga); `data/source/tables/NarrativePlaces.tsv:68`; `data/source/tables/SpatialInterpretations.tsv:663`, `:666-667`; tre XLSX rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.044 → **16.055**; full 17.214 → **17.225** (+11: 9 per la nuova entità, comprese `dcterms:source` e la geometria; +3 ancore; −1 `isPartOf`). Gazetteer 264 → 265; Imported 259 → **260**, Invented 15 → **14**. Vista: tessere proprie 49 → 48 (l'edicola confluisce nella tessera di `gaz_edicola_due_santi`: 3 occorrenze, classe «raro», 18,6 km dal centro); generatori 221 → 222; semi delle 48 tessere restanti invariati; nessun'altra feature cambia. `excludedUnanchored` resta 0. SHACL conforme, 0 violazioni.

---

## D-032 — Documentazione pyLODE rigenerata (8 ottobre 2026)

- Requisito/i: — (documentazione; work order T-73) · Ipotesi: — · Data check: DM-01
- Stato precedente: `ontology/docs/` era ferma a una versione anteriore all'audit: versione «4.1.1», ancore `ga_*` (prefisso abbandonato con D-013), definizioni di Invented e Imagined invertite. `make docs` era rinviato (D-020) perché pyLODE 3.6.0 non si avvia con l'ultima `kurra`.
- Decisione: `make docs` eseguito con pyLODE 3.5.1 (la versione che aveva generato le pagine esistenti) e `kurra` 3.0.0 in `dh_env`. Il downgrade di `kurra` tocca solo quel pacchetto, installato durante D-020 come dipendenza di pyLODE, e nessun altro (verificato con un dry-run).
- Motivazione (fonte, pagina): allineare la documentazione pubblicata alla TBox canonica (D-020) e alla permutazione (D-030).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/docs/index.html` e i cinque `ontology/docs/vocab_*.html` (rigenerati).
- Effetto su KG (triple prima/dopo, SHACL): nessuno. Le pagine riportano ora versione 1.0.0, ancore `chora_*` e le definizioni corrette (Invented: «An invented setting within familiar geographical reality»; Imagined: «There is no hint at all about the position…»). Nessun link del repository puntava alle vecchie ancore `#ga_`. **Limiti:** VocPub elenca i concetti in ordine alfabetico e non mostra `skos:notation` né `skos:scopeNote`, quindi l'ordine della scala Imported → Transformed → Invented → Imagined non compare nelle pagine. Durante la generazione pyLODE (tramite `kurra`) interroga un servizio esterno (`fuseki.dev.kurrawong.ai`) per le etichette dei termini non definiti nel file.

---

## D-033 — `chora.jsonld` generato dall'ETL (8 ottobre 2026)

- Requisito/i: — (pubblicazione dell'ontologia; aggiorna D-020) · Ipotesi: — · Data check: —
- Stato precedente: `ontology/chora.jsonld`, servito da w3id per negoziazione del contenuto (`w3id/chora/.htaccess:23`, `:29`), non era generato da nessuno strumento. Era fermo a una TBox ancora più vecchia (572 triple, non isomorfa né alla TBox di partenza né a quella attuale) e conteneva le definizioni invertite di Invented e Imagined.
- Decisione: l'ETL genera `chora.jsonld` da `chora.ttl` accanto a `chora.rdf` (nuovo argomento `--ontology-jsonld`), con `auto_compact=True` come indicato in `w3id/README.md`. Il JSON prodotto da rdflib cambia ordine a ogni esecuzione, quindi viene riordinato (`stable_json()`: chiavi e array in ordine, liste `@list` intatte), in coerenza con D-022.
- Motivazione (fonte, pagina): il file pubblicato su w3id deve dire le stesse cose della sorgente; verificato isomorfo a `chora.ttl` (600 triple) e identico byte per byte con tre seed diversi.
- Fase in cui è maturata: revisione critica (chiusura della fase 1)
- File toccati (manifest): `tools/etl.py:26` (`import json`), `:1251-1269` (`stable_json()`), `:1322-1327` (argomento), `:1381-1384` (scrittura); `Makefile:42`; `ontology/chora.jsonld` (rigenerato).
- Effetto su KG (triple prima/dopo, SHACL): nessuno su ABox (16.055) e grafo completo (17.225). `chora.jsonld` passa da 572 triple non allineate a 600, isomorfo alla TBox. SHACL conforme.

---

## D-034 — Glifi degli statuti e soglia degli estratti (8 ottobre 2026)

- Requisito/i: R07, R21 · Ipotesi: — · Data check: DM-01 (work order T-65, T-55)
- Stato precedente: dopo la permutazione (D-030) restava aperto se i glifi del prototipo (`_archivio/chartD.js:219-237`, `FICT_GLYPH_PATHS`, uno per statuto) dovessero seguire il nome dello statuto o il suo significato; la soglia di lunghezza degli estratti (R21) era da decidere (oggi: tetto di 700 caratteri in `tools/build_passages.py`; mediana 141, massimo 573).
- Decisione (di Lorenzo, 8/10/2026): (1) **i glifi restano legati al nome dello statuto**: il glifo «invented» va ai luoghi Invented e quello «imagined» ai luoghi Imagined. Poiché i valori sono stati permutati, i 15 luoghi ora Invented ricevono il glifo che prima avevano i 5 e viceversa: nessuna modifica al codice né all'archivio. (2) **La soglia degli estratti resta quella attuale**: nessun estratto supera il tetto di 700 caratteri, e la policy non richiede tagli.
- Motivazione (fonte, pagina): la forma del glifo codifica lo statuto (grammatica visiva, `CLAUDE.md`); la correzione di D-030 era di nome, non di contenuto grafico.
- Fase in cui è maturata: prototipazione (vista diagramma)
- File toccati (manifest): nessuno nel codice o nei dati; `docs/thesis/DATA_CHECKS_GaddAtlas.md` (lista delle decisioni).
- Effetto su KG (triple prima/dopo, SHACL): nessuno.
- Approvazione: approvata da L. Sabatino, 9/10/2026 (i glifi seguono il nome dello statuto).

---

## D-035 — Decisioni sui casi aperti della fase 1 (8 ottobre 2026)

- Requisito/i: R02, R07, R18, R22 · Ipotesi: H3 · Data check: DC-01, DC-02, DC-07, DC-08, DC-15, DC-16
- Stato precedente: casi lasciati aperti alla chiusura della fase 1 (v. D-030, D-031).
- Decisione (di Lorenzo, 8/10/2026):
  - **DC-16, permutazione:** resta com'è. Invented e Imagined erano stati usati con le definizioni incrociate: la tipologia dei luoghi è identica, è cambiato solo il nome. Nessuna riassegnazione caso per caso. Resta da segnalare per la tesi: il Cap. 4, § 4.3 (r. 85) chiama «inventati» Roccafringoli, Monte Nuncupale e Scerpure, che nei dati sono ora Imagined.
  - **DC-08, palazzo di via Merulana 219:** Transformed. I dati lo sono già; nessuna modifica. Le varianti 119 → 219 e «palazzo degli ori» → «palazzo dell'Oro» restano per il modello dei testimoni (T-41).
  - **DC-02, palazzo Simonetti:** Transformed, non Invented. È un palazzo reale, collocato correttamente in via Lata; in QP Gadda lo sposta in via Lanza, cioè trasforma la collocazione reale di un luogo reale in un'altra via reale. Ancoraggio da applicare con un passo successivo.
  - **DC-01, Robine Vecchie:** una sola occorrenza, a QP 169. I dati erano già corretti (`ref_00403`); erano errati i rinvii a «QP 161», corretti nel Cap. 4 (`docs/thesis/Capitolo 4.md`, § 4.3 e n. 23), nel registro e nel work order. AUDIT_0 resta com'era, come documento dello stato al momento dell'audit. Il docx della tesi va corretto allo stesso modo.
  - **DC-07, Casal Bruciato:** le due collocazioni (TCI tra le ferrovie, IGM a ovest della Roma–Napoli) diventano due asserzioni attribuite a Manzotti e interrogabili. Si fanno con la provenance.
  - **Provenance e modello delle asserzioni (DC-15, T-30, T-32):** rinviati a un secondo momento. Il modello si sceglierà in funzione delle attribuzioni da assegnare, con i dati alla mano.
  - **Temporalità (R02, T-45): esclusa.** Va dichiarata fra le esclusioni (R12, T-70).
  - **Resa dei percorsi non compiuti (T-64): esclusa.**
- Motivazione (fonte, pagina): verifica di LS sul volume (Robine, QP 169); Pinotti 2025, p. 78 (palazzo Simonetti in via Lata nel dattiloscritto); Reuschel, Piatti e Hurni 2013, pp. 138–139 (definizioni).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `docs/thesis/Capitolo 4.md:83`, `:599`; `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-01, DC-02, DC-07, DC-08, DC-16 e lista delle decisioni); `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md:163` e § 10.
- Effetto su KG (triple prima/dopo, SHACL): nessuno. ABox 16.055, full 17.225.
- Approvazione: approvata da L. Sabatino, 9/10/2026 (palazzo di via Merulana 219 Transformed). Robine Vecchie: verificato da LS sul volume a stampa, 9/10/2026, che a QP 161 non compare. DC-16 chiuso senza riesame: la permutazione è puramente nominale.

---

## D-036 — Palazzo Simonetti: luogo trasformato, ancorato a via Lanza (8 ottobre 2026)

- Requisito/i: R07, R10 · Ipotesi: H1 · Data check: DC-02 (work order T-11)
- Stato precedente: `palazzo_simonetti` Imported, senza descrizione, ancorato a `gaz_via_lanza`. L'entità `gaz_palazzo_simonetti` non era il palazzo di via Lata ma il palazzo Odescalchi Simonetti di via Vittoria Colonna (coordinate in Prati, «Via Vittoria Colonna, 13»), cioè il candidato della lettura di Terzoli, e nessuna interpretazione la usava.
- Decisione (di Lorenzo, 8/10/2026): **Transformed**. È un palazzo reale, in via Lata; in QP Gadda lo colloca in via Lanza, trasformando la collocazione reale di un luogo reale in un'altra via reale. Non ha coordinate proprie e resta **ancorato a `gaz_via_lanza`**, dove lo pone il testo. L'entità di Terzoli diventa `gaz_palazzo_odescalchi_simonetti` (stessi dati, nome corretto, fonte e nota sul civico, 11 secondo Pinotti contro il 13 del dato precedente), senza ancoraggi: sarà il bersaglio dell'identificazione attribuita quando si farà la provenance. Scartati l'ancoraggio doppio (via Lata + via Lanza) e l'ancoraggio al solo referente reale.
- Motivazione (fonte, pagina): Pinotti 2025 («Il Gaddus» 3), p. 78: in via Lanza non esiste alcun palazzo Simonetti; il dattiloscritto dei capitoli nuovi (Fondo Gelli) legge via Lata; Terzoli (cit. ivi) vi legge un riferimento autobiografico al palazzo Odescalchi Simonetti. Cap. 4, § 4.2 (r. 45, 47).
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/NarrativePlaces.tsv:126` (statuto, descrizione); `data/source/tables/GazetteerEntities.tsv:1607` (id, toponimo, `Authority_Source`); `data/source/void_seeds.json` (nuovo seme `palazzo_simonetti` = 0,173276, quello che il build calcolerebbe dall'hash dell'id); due XLSX rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.055 → **16.057**; full 17.225 → **17.227** (+2: descrizione del palazzo, `dcterms:source` dell'entità di Terzoli; il cambio di statuto e di id non cambia il numero). Statuti: Imported **259**, Transformed **31**, Invented 14, Imagined 5. Vista: tessere proprie 48 → 49 (nuova per `palazzo_simonetti`, ancorata a via Lanza); via Lanza da 3 a 2 occorrenze proprie. SHACL conforme, 0 violazioni.
- Approvazione: approvata da L. Sabatino, 9/10/2026 (Transformed, ancorato a via Lanza). La lettura di Terzoli entra in fase 3.

---

## D-037 — Casal Bruciato: luogo importato, casale reale dell'Agro romano (rivede D-029) (9 ottobre 2026)

- Requisito/i: R03, R04, R05, R06, R07, R10 · Ipotesi: H1, H3 · Data check: DC-07, DC-18 (work order T-15)
- Stato precedente (D-029): `casal_bruciato` Transformed, senza coordinate, ancorato a Marino, Albano, Pavona e Santa Palomba; casello al km 20,25 parte di Casal Bruciato; `gaz_casal_bruciato` (quartiere del Tiburtino) eliminata.
- Decisione (di Lorenzo, 9/10/2026):
  - **Referente reale.** Casal Bruciato è il casale dell'Agro romano a sud di Roma, attestato come «Casal(e) Bruciato / Abbruciato / Abbrusciato» (Nibby, *Dintorni di Roma*, p. 569). Non è il quartiere del Tiburtino: l'eliminazione di D-029 resta giusta.
  - **Statuto Imported.** L'incertezza della posizione riguarda la SpatialDetermination, non lo statuto. Le determinazioni delle singole occorrenze non sono state toccate. La discrepanza fra testo e repertorio è in nota e non si corregge (Manzotti 2010, p. 269: la topografia «pare combinare e forse confondere» le due ferrovie, «fondandosi […] più sulla memoria di escursioni in loco, che sui rilievi delle carte»).
  - **Nuova `gaz_casale_abbruciato`, con due posizioni datate.** (a) **Adottata**, TCI, *Italia centrale* I, carta «Colli Laziali, Monti Lepini ed Ernici» 1:250.000, fra le pp. 480 e 481 (Manzotti, Tav. VI, p. 300): casale fra le due ferrovie, all'altezza di Santa Fumia, lungo il fosso di Casale Abbrusciato. Coordinate stimate 41,7335 N 12,5830 E, precisione circa 1 km: alla scala 1:250.000 1 mm vale 250 m e la scansione non permette una lettura puntuale. Il punto è mediano fra la Roma–Napoli (12,563 E a quella latitudine, dalla Tav. VII) e la Roma–Velletri (circa 12,602 E, interpolata fra `gaz_ferrovia_roma_velletri` e Pavona), alla latitudine di Borgo Santa Fumia (OpenStreetMap: 41,7331 N 12,5809 E). (b) **Alternativa**, IGM, F. 150 III SO, 1:25.000, rilievo 1872, aggiornamenti 1931 e 1940 (Manzotti, Tav. VII, p. 301): «Casale Abbruciato» a ovest della Roma–Napoli, in discrepanza con il testo. Stimata a 41,7168 N 12,5683 E, precisione circa 250 m. È letta sul reticolo chilometrico della tavola, identificato come UTM fuso 33 (ED50): E 297,7 km, N 4621,3 km, convertiti con l'inversa UTM sull'ellissoide internazionale. Verifica: la ferrovia della tavola cade a circa 100 m dalla stazione di Santa Palomba del dataset. (a) è l'ancoraggio; (b) è in `Authority_Source` e in nota. In fase 3 entrambe diventano asserzioni di localizzazione attribuite a Manzotti 2010, pp. 268–269. Le tavole si citano secondo le didascalie (VI = TCI, VII = IGM), non secondo i rinvii sfasati della nota di Manzotti.
  - **Ancore per passo.** L'ancora principale è sempre `gaz_casale_abbruciato`. Si aggiungono, con relazione `near`, i luoghi reali che ciascun passo dispone intorno al casale: QP 237 Castel di Leva e ponte del Divino Amore; QP 240 via della Falcognana, ponte del Divino Amore e ferrovia Roma–Velletri; QP 274 Ardeatina; QP 297 ferrovia Roma–Velletri; QP 298 Ardeatina e Santa Palomba. QP 212 e 262 hanno solo il casale. Marino e Albano sono tolti, perché nessun passo li mette in rapporto con il casale. Pavona e Santa Maria delle Mole sono tolti dalle ancore e messi in nota come inferenza di Manzotti (km 17,55 e 23,38 della Roma–Velletri, fase 3). Tor di Gheppio (Invented) e il ponte di Santa Fumia (Transformed) sono luoghi narrativi, non ancore geografiche: sono in nota per QP 297, in attesa delle relazioni fra luoghi (T-47/T-53). Da rimodellare come ancoraggio relazionale (DC-07).
  - **Riferimenti e forme attestate (R05).** Aggiunto `ref_00723` per QP 241 («Al casello, detto da taluni di Casal Bruciato…»: lo stesso estratto breve di `ref_00590`, cap. IX), per ora senza interpretazione. Mantenuta l'occorrenza di QP 262 (`ref_00614`), assente dall'elenco del 9/10 ma presente nel testo. Forme: «Casal Bruciato» (QP 212, 237, 240, 241, 262, 274, 298) nell'etichetta, «Casale Abbrusciato» (QP 297) come `skos:altLabel` del luogo; l'entità porta anche «Casale Abbruciato» (IGM) e «Casal Bruciato».
  - **Casello al km 20,25** (luogo senza toponimo, R06, statuto invariato). Non è più parte di Casal Bruciato: è un casello della Roma–Velletri, «detto da taluni di Casal Bruciato». Le sue 22 interpretazioni sono ancorate a `gaz_ferrovia_roma_velletri` con relazione `adjacentto`. Camera del casello e passaggio a livello restano parti del casello e ne ereditano l'ancora. Il bivio Falcognana–Casal Bruciato non aveva mai ereditato dal Tiburtino: invariato. Era la soluzione (a) proposta il 9/10, applicata su indicazione di completare il lavoro.
  - **Percorsi (solo annotazione, si applica in T-54):** QP 237 indicato (dialogo, Camilla); QP 212 sognato (Pestalozzi). La lettura di Manzotti di «per fil a dest» (p. 269: cambio di direzione perpendicolare, in realtà verso sinistra, a sud verso il Circeo) è nella nota dell'interpretazione di QP 212, come lettura attribuita per la fase 3.
- Motivazione (fonte, pagina): Manzotti 2010, nota ai rr. 182–183, pp. 268–269; p. 273; Tavv. VI–VII, pp. 300–301; Nibby, *Dintorni di Roma*, p. 569; QP 212, 237, 240, 241, 262, 274, 297, 298.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/GazetteerEntities.tsv:467-482` (nuova `gaz_casale_abbruciato`, geometria multiriga); `data/source/tables/NarrativePlaces.tsv:38` (statuto, forma attestata, descrizione), `:39` (`Is_Part_Of` del casello tolto); `data/source/tables/References.tsv:724` (`ref_00723`); `data/source/tables/SpatialInterpretations.tsv`: 13 righe di `casal_bruciato` (ancore, relazione, nota) e 22 di `casello_km_20_25` (ancora, relazione); quattro XLSX rigenerati. Il seme `casal_bruciato` resta in `void_seeds.json`, inutilizzato.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.057 → **16.093**; full 17.227 → **17.263** (+36: +10 per la nuova entità, +1 `altLabel`, −1 `isPartOf`, +5 per il nuovo riferimento, −21 ancore e −2 relazioni sulle interpretazioni del casale, +22 ancore e +22 relazioni sul casello). Statuti: Imported **260**, Transformed **30**, Invented 14, Imagined 5. Gazetteer 265 → 266; riferimenti 722 → 723 (uno in più fuori dal rilievo perché ancora senza interpretazione). Vista: tessere proprie 49 → 48 (Casal Bruciato confluisce nella tessera di `gaz_casale_abbruciato`: 13 interpretazioni, 8 occorrenze, classe «frequente», 20,1 km dal centro); generatori 222 → 223; il casello e i suoi interni si appoggiano alla ferrovia Roma–Velletri; nelle entità circostanti cambia solo `anchoredTotal`. SHACL conforme, 0 violazioni.
- Approvazione: coordinate di `gaz_casale_abbruciato` accettate da L. Sabatino con la precisione dichiarata (9/10/2026). Aggiunta in `Authority_Source` la nota sul datum: il reticolo della Tav. VII è ED50, e lo scarto verso WGS84 (~100–200 m) rientra nella precisione di 250 m.

---

## D-038 — Adapter: ancora principale per le interpretazioni con più ancore (9 ottobre 2026)

- Requisito/i: R04, R15 · Ipotesi: — · Data check: DC-07 (completa D-028)
- Stato precedente: con D-028 un'interpretazione con più ancore produce un solo record, e il campo `gazetteerId` prendeva il primo id in ordine alfabetico. Restava aperto il caso di un luogo **Imported** con più ancore, che deposita il rilievo su `gazetteerId`: la scelta alfabetica era arbitraria.
- Decisione: l'ancora principale è quella che compare nel **maggior numero di interpretazioni dello stesso luogo**, cioè il suo referente. Per Casal Bruciato è `gaz_casale_abbruciato`, presente in tutte le 13 interpretazioni; le altre ancore sono i luoghi intorno. A parità vale l'ordine alfabetico. La regola vale per ogni interpretazione con più ancore; per i luoghi con tessera propria non cambia il rilievo. Resta da sostituire con l'ancoraggio relazionale esplicito di T-47.
- Motivazione (fonte, pagina): D-037; R15 (regola di aggregazione dichiarata).
- Fase in cui è maturata: prototipazione (adapter dati)
- File toccati (manifest): `tools/build_geojson.py:328` (`anchors_by_si`), `:338-339` (raccolta delle ancore), `:375-389` (scelta dell'ancora principale); tolta la scelta alfabetica nel ramo delle ancore in più (ex `:343-345`).
- Effetto su KG (triple prima/dopo, SHACL): nessuno sul grafo. Con i dati precedenti a D-037 i derivati sono identici; con D-037 le 13 righe di rilievo di Casal Bruciato vanno tutte a `gaz_casale_abbruciato`.

---

## D-039 — Un solo controllo di riproducibilità: `check_reproducible.py` (9 ottobre 2026)

- Requisito/i: — (infrastruttura; fonde D-022 con il lavoro di `main`) · Ipotesi: — · Data check: —
- Stato precedente: due controlli paralleli per la stessa cosa. Sul branch di allineamento la CI rigenerava i derivati e chiedeva `git diff` vuoto su `data/dist`, `ontology` e `app/public/data`, possibile perché la build era stata resa deterministica byte per byte (D-022). Su `main` (commit `40ce9b2`, `12c9976`) la CI usava `tools/check_reproducible.py`: confronto per isomorfismo dei TTL e per contenuto dei JSON, con il grafo completo escluso perché i due contributori anonimi non si canonicalizzavano in modo stabile. Anche l'ordinamento deterministico del GeoJSON era stato fatto due volte: chiavi secondarie per id in tutti i `sorted()` su `main`, una sola sul branch.
- Decisione (di Lorenzo, 9/10/2026): si tiene il controllo di `main`, esteso allo stato del branch. In `check_reproducible.py`: (1) confronto dei **byte** come primo passo, poi isomorfismo per RDF e contenuto per JSON; (2) `ontology/chora.ttl` esce dai target, perché è la sorgente della TBox (D-020), ed entrano i suoi derivati `ontology/chora.rdf` (RDF/XML) e `ontology/chora.jsonld` (D-033); (3) `data/dist/gaddatlas-full.ttl` rientra: dal D-022 è identico byte per byte fra build; (4) entrano le copie in `app/public/data` (anche `make audit` le confronta byte per byte, D-023). In `build_geojson.py` restano l'ordinamento di `main` (id come chiave secondaria ovunque, «NOTA SULL'ORDINAMENTO») e la regola dell'ancora principale (D-038); il commento locale del branch è assorbito dalla nota generale. Nel workflow `data.yml` resta lo step di `main`, con `publish-data` fra i passi di rigenerazione.
- Motivazione (fonte, pagina): un solo strumento, che dice perché un derivato è cambiato (byte, triple, chiavi), invece di due controlli che possono divergere.
- Fase in cui è maturata: revisione critica (merge di `main` nel branch di allineamento)
- File toccati (manifest): `tools/check_reproducible.py` (blocco `TARGETS`, `compare_rdf` con formato, confronto dei byte in `main()`); `.github/workflows/data.yml` (risoluzione del conflitto, commento); `tools/build_geojson.py` (risoluzione del conflitto: tolto il commento duplicato).
- Effetto su KG (triple prima/dopo, SHACL): nessuno.

---

## D-040 — Statuto di realtà senza glifo: errore esplicito (9 ottobre 2026)

- Requisito/i: R07 · Ipotesi: — · Data check: DC-20 (work order T-87)
- Stato precedente: nel codice portato (come nel notebook, `_archivio/chartD.js:4930-4935`) qualunque statuto diverso da «transformed» e «imagined» veniva disegnato con il glifo «invented»: in `app/src/atlas.js` con una catena `if / else`, in `app/src/render/painters.js` con un ripiego `FICT_GLYPH_PATHS[status] ? status : "invented"`. Un valore sbagliato o nuovo nei dati sarebbe passato inosservato con la forma di un altro statuto.
- Decisione: il glifo segue il nome dello statuto, senza ripiego (D-034). Al caricamento, `model/entities.js` verifica che ogni tessera fittizia abbia uno statuto presente in `FICT_GLYPH_PATHS` e altrimenti ferma l'app con un errore che dice quale tessera e quale valore. `painters.drawFictGlyph` lancia un errore per uno statuto sconosciuto invece di ripiegare. L'archivio non è toccato. Modifica di comportamento in un commit separato dal porting e dal merge, come chiedono le regole del porting.
- Motivazione (fonte, pagina): work order T-87; grammatica visiva semantica (`CLAUDE.md`): la forma del glifo dice lo statuto, quindi un glifo sbagliato è un dato falso.
- Fase in cui è maturata: prototipazione (vista diagramma)
- File toccati (manifest): `app/src/model/entities.js:81-93` (validazione); `app/src/render/painters.js:166-169`; `app/src/atlas.js:919-920`; `app/test/entities-status.test.js` (nuovo: i dati pubblicati passano, uno statuto finto dà l'errore).
- Effetto su KG (triple prima/dopo, SHACL): nessuno. Test dell'app 4/4; build di produzione riuscita.

---

## D-041 — Ordine delle feature per id; ordine di disegno deciso dall'app (9 ottobre 2026)

- Requisito/i: R15 · Ipotesi: — · Data check: — (AUDIT_2, § 1)
- Stato precedente: il GeoJSON ordinava le feature per `(-planeCount, id)` (D-022 e ordinamento di `main`, D-039): deterministico fra build, ma non stabile rispetto ai dati, perché una correzione che cambiava un conteggio, o un'entità aggiunta o tolta, spostava l'indice di tutte le feature successive. L'app usava quell'indice come ordine di disegno: in vista piana disegnava in ordine di indice (`atlas.js:828-830`), in assonometria a pari profondità vinceva l'indice (`atlas.js:832`), e l'hit test in vista piana restituiva la prima tessera trovata in ordine di indice (`interaction/hit-test.js`). Verificato: dentro ciascun gruppo (referenziali in mappa, fuori mappa, fittizi), l'indice equivaleva a «più occorrenze pubblicate prima, poi id»; per le tessere fuse da `ALIAS_GROUPS`, alla posizione del primo membro del gruppo nel file.
- Decisione (di Lorenzo, 9/10/2026): **il file è ordinato per id** dentro ciascun gruppo (referenziali, poi tessere proprie), così che una correzione ai dati non sposti nulla. **L'ordine lo decide l'app** con un criterio esplicito, in `app/src/model/entities.js`: dentro ciascun gruppo, più occorrenze pubblicate prima, poi id. Una tessera fusa da `ALIAS_GROUPS` prende la chiave del membro del gruppo che viene primo con lo stesso criterio. Il criterio riproduce esattamente l'ordine su cui il notebook è stato calibrato, quindi il significato visivo resta («i più frequenti si disegnano prima, cioè sotto»), ma non dipende più dalla posizione nel file. Le sezioni di `atlas.slim.json`, che non sono indici di disegno, restano ordinate per frequenza.
- Motivazione (fonte, pagina): `allData` è identico con il file precedente, con il file ordinato per id e con tre rimescolamenti casuali delle feature; nuovo test dell'app (ordine invariato con le feature in ordine inverso). Confronto visivo sui 10 stati di riferimento (5 stadi × tutti / Pestalozzi), prima e dopo l'ordinamento per id: nessuna differenza oltre al rumore di animazione (al massimo 2.537 pixel; la striscia dei controlli dello stadio 2 differisce per una transizione di opacità del selettore «per capitolo / per pagina»).
- Fase in cui è maturata: prototipazione (porting dell'interfaccia)
- File toccati (manifest): `app/src/model/entities.js:1` (import di d3), `:8-10` (occorrenze pubblicate), `:75-97`, `:104` (criterio e ordinamento dei tre gruppi); `tools/build_geojson.py:721-726`, `:747`; `app/test/entities-status.test.js` (nuovo test); derivati rigenerati (`data/dist/gaddatlas.geojson`, `app/public/data/gaddatlas.geojson`).
- Effetto su KG (triple prima/dopo, SHACL): nessuno (16.093 / 17.263). Il GeoJSON cambia solo nell'ordine delle feature: contenuto per id, relief, paths e meta identici. Test dell'app 5/5.

---

## D-042 — Asserzioni attribuite: `chora:Assertion` (9 ottobre 2026)

- Requisito/i: R07, R10, R20, R22 · Ipotesi: H3, H8 · Data check: DM-02 (work order T-30; AUDIT_2, § 2)
- Stato precedente: nessun modo di registrare letture concorrenti attribuite. Le identificazioni passavano per `owl:sameAs`, lo statuto era solo un valore sul luogo, `prov:wasAttributedTo` confondeva chi formula una lettura con chi la codifica. `chora:evidenceSource` e `chora:interpretationType` erano dichiarate e mai usate.
- Decisione (di Lorenzo, 9/10/2026): un nodo per ogni lettura. `chora:Assertion rdfs:subClassOf prov:Entity, hico:InterpretationAct` (HiCO allineato senza importarlo). Campi: `chora:assertionType` (nuovo schema `chora:AssertionTypeScheme`: status, identification, location, partition, memory, uncertainty, variant), `chora:aboutSubject`, `chora:assertsValue`, `chora:sourceWork` e `chora:sourcePage` (opera e pagina; le risorse bibliografiche con CiTO restano per la fase 3), `prov:generatedAtTime`, `prov:wasRevisionOf`, `chora:adoptedByProject` (booleano), `chora:rationale`. **Attribuzioni** con `prov:qualifiedAttribution` e `prov:hadRole`, due ruoli SKOS in `chora:AttributionRoleScheme`: `chora:ReadingAuthor` (autore della lettura) e `chora:Encoder` (codificatore); l'ETL genera anche la forma breve `prov:wasAttributedTo` verso l'autore. Niente RDF-star, niente named graph. `chora:interpretationType` è deprecata. Sorgente dati: nuovo foglio facoltativo `data/source/tables/Assertions.tsv` (oggi vuoto: le letture degli studiosi sono la fase 3; le prime righe arrivano con T-31), letto da `process_assertions` in `tools/etl.py`, che si ferma con un errore su tipo non ammesso, riferimento malformato, autore o codificatore mancante.
- Controlli: shape `AssertionShape` (un tipo dello schema, un soggetto, almeno un valore, forma breve dell'autore, adozione al più una volta) e `QualifiedAttributionShape` (almeno un'attribuzione per ciascun ruolo), `AttributionShape` (un agente tipizzato `prov:Agent`, un ruolo). IQ12: al più una lettura adottata per soggetto e tipo. Prova in scratchpad: un'asserzione senza codificatore ferma l'ETL; con agenti non tipizzati la SHACL segnala due violazioni (risolte da T-32).
- Motivazione (fonte, pagina): Cap. 4, § 4.4 e § 4.7 (letture concorrenti senza default, R22); Daquino, Pasqual e Tomasi 2020 (HiCO); work order T-30.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl:4` (prefisso `hico:`), `:392-394` (deprecazione di `interpretationType`), `:792-969` (sezione nuova); `ontology/shapes/chora-shapes.ttl:33` (prefisso `prov:`), `:278-354` (shape 7); `ontology/queries/integrity.rq:126-140` (IQ12); `tools/etl.py:28` (`import re`), `:998-1087` (`process_assertions` e funzioni di servizio), `:1285-1287` (chiamata); `data/source/tables/Assertions.tsv` (nuovo, intestazione); `data/source/xlsx/Assertions.xlsx` (generato); `data/source/mapping.yaml` (nota sul foglio); `data/README.md:12`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 600 → **756**; ABox 16.093 → 16.093; full 17.263 → **17.419**. SHACL conforme, 0 violazioni; IQ12 = 0.

---

## D-043 — Agenti e annotatori: attribuzioni qualificate su tutte le interpretazioni (9 ottobre 2026)

- Requisito/i: R22 · Ipotesi: H8 · Data check: DC-15 (work order T-32; AUDIT_2, § 3)
- Stato precedente: un solo agente implicito, `annotator/lorenzo_sabatino`, mai tipizzato `prov:Agent`, indicato con `prov:wasAttributedTo` su 161 interpretazioni su 960; le altre 799 senza attribuzione. Nessuna distinzione fra chi formula una lettura e chi la codifica.
- Decisione (di Lorenzo, 9/10/2026): `prov:qualifiedAttribution` con `prov:hadRole`, nei due ruoli SKOS di D-042 (autore della lettura, codificatore), con un vincolo SHACL per ruolo; l'ETL genera anche la forma breve `prov:wasAttributedTo` verso l'autore. Le 960 interpretazioni hanno come **codificatore** `annotator/lorenzo_sabatino` (le 799 vuote compilate nel foglio). Come **autore della lettura** di un'interpretazione l'ETL registra il codificatore stesso: le interpretazioni sono letture del progetto, e una lettura d'autore di uno studioso entra come `chora:Assertion` (fase 3). Nuovo foglio obbligatorio `Agents.tsv` (`Agent_ID`, `Name`, `Agent_Type` annotator | scholar, `Note`): gli annotatori hanno IRI `annotator/{id}`, gli studiosi `agent/{id}`. Oggi contiene solo Lorenzo; gli studiosi entrano in fase 3. L'ETL si ferma se un'interpretazione non ha annotatore o se un autore o un codificatore (anche nelle asserzioni) non è dichiarato in `Agents.tsv`. Il modello ammette più codificatori per la stessa interpretazione o asserzione.
- Motivazione (fonte, pagina): Cap. 4, R22 (provenienza di ogni interpretazione, «Lorenzo è chi le codifica, gli studiosi sono gli autori delle letture»); PROV-O, attribuzioni qualificate.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `tools/etl.py:73` (namespace `schema:`), `:950-961` (attribuzioni delle interpretazioni), `:1005-1046` (`process_agents`, `agent_uri`), `:1115`, `:1120` (autori e codificatori delle asserzioni via `agent_uri`), `:1289` (foglio atteso), `:1329-1331` (chiamata); `ontology/shapes/chora-shapes.ttl:323`, `:326` (shape estesa alle interpretazioni); `data/source/mapping.yaml` (nota sul blocco provenance); `data/source/tables/Agents.tsv` (nuovo); `data/source/tables/SpatialInterpretations.tsv` (799 righe, colonna `Annotator_ID`); `data/source/xlsx/Agents.xlsx` (nuovo), `SpatialInterpretations.xlsx` (rigenerato).
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.093 → **24.575**; full 17.419 → **25.901** (+8.482: 960 × 8 triple di attribuzione qualificata, 799 forme brevi nuove, 3 triple per l'agente). 1.920 attribuzioni, 1 agente. SHACL conforme, 0 violazioni. GeoJSON invariato salvo `tripleCount`.

- Conferma (LS, 9/10/2026): autore delle interpretazioni = codificatore, vincolo SHACL obbligatorio. In fase 3 un'interpretazione che riprende la lettura di uno studioso si collega all'asserzione con `prov:wasDerivedFrom`; l'autore dell'interpretazione resta Lorenzo.

---

## D-044 — Niente `owl:sameAs` per i giudizi d'identità; `chora:housedIn` per istituzione e sede (9 ottobre 2026)

- Requisito/i: R10, R22 · Ipotesi: — · Data check: DM-06, DC-04, DC-10 (work order T-31; AUDIT_2, § 4)
- Stato precedente: tre coppie di `owl:sameAs` (6 triple) dalla colonna `sameAs` di `GazetteerEntities.tsv`: `gaz_castello` ↔ `gaz_castel_gandolfo`, `gaz_collegio_romano` ↔ `gaz_santo_stefano_del_cacco_celio_santo_stefano`, `gaz_lungara` ↔ `gaz_regina_coeli`. Tre relazioni di tipo diverso espresse come identità, troppo forti e non attribuite.
- Decisione (di Lorenzo, 9/10/2026): tipi diversi.
  - **Castello ↔ Castel Gandolfo** è un'identificazione contesa: diventa l'asserzione `A-0001` (tipo identification, soggetto `narrativeplace/castello`, valore `gaz_castel_gandolfo`, autore e codificatore Lorenzo), **non adottata** finché DC-04 non è deciso. La lettura di Manzotti (Castel Savello, 2010, p. 293) entra in fase 3.
  - **Le due coppie istituzione / sede** diventano la relazione nuova `chora:housedIn` (dominio e codominio GazetteerEntity): Santo Stefano del Cacco, il commissariato del romanzo («Santo Stefano (al Collegio Romano)», QP 152), ha sede nel Collegio Romano; Regina Coeli ha sede in via della Lungara. Non è un'identità né un'identificazione, e non fonde le entità. Nuova colonna `Housed_In` in `GazetteerEntities.tsv`.
  - **`owl:sameAs` resta solo per la coreferenza tecnica** con URI esterni (http/https): l'ETL si ferma se la colonna `sameAs` contiene un id del dataset. Nessuna fusione nuova (D-011).
- Motivazione (fonte, pagina): Cap. 4, § 4.4 (identificazione contesa, R10); Manzotti 2010, p. 293; QP 152, 279.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl:971-980` (`chora:housedIn`); `tools/etl.py` (gazetteer: `sameAs` solo esterno, `Housed_In` risolto a fine ciclo); `tools/build_geojson.py:104-127` (commento sulle fonti di fusione); `data/source/mapping.yaml` (nota su `sameAs`); `data/source/tables/GazetteerEntities.tsv` (6 valori di `sameAs` tolti, colonna `Housed_In`); `data/source/tables/Assertions.tsv` (riga `A-0001`); due XLSX rigenerati; aggiornamenti in D-009 e D-011.
- Effetto su KG (triple prima/dopo, SHACL): TBox 756 → **763**; ABox 24.575 → **24.588**; full 25.901 → **25.921** (−6 `owl:sameAs`, +2 `chora:housedIn`, +17 per l'asserzione e le sue attribuzioni). SHACL conforme, 0 violazioni; IQ3 = 0, IQ12 = 0. GeoJSON invariato salvo `tripleCount` (`MERGE_MAP` è vuota).
- Da segnalare, non toccato: (1) `gaz_castello` («Castello», alle coordinate di Castel Gandolfo) resta un'entità senza interpretazioni, che esisteva solo per il `sameAs`; (2) la stazione dei carabinieri di Castello è ancora ancorata direttamente a `gaz_castel_gandolfo`, cioè porta dentro l'interpretazione la lettura non adottata (DC-04: collegare la stazione a `castello`); (3) `ALIAS_GROUPS` nel codice portato fonde ancora Collegio Romano e Santo Stefano del Cacco (D-011, non si tocca).

---

## D-045 — Castello: lettura adottata di Manzotti; stazione collegata al luogo (9 ottobre 2026)

- Requisito/i: R10, R22 · Ipotesi: — · Data check: DC-04, DM-06 (chiusura dei punti aperti di T-30…T-31)
- Stato precedente: l'identificazione di Castello esisteva solo come lettura di Lorenzo non adottata (A-0001, Castel Gandolfo, D-044); la stazione dei carabinieri di Castello era ancorata direttamente a `gaz_castel_gandolfo`, cioè portava dentro l'interpretazione la lettura non adottata; `gaz_castello` sopravviveva senza interpretazioni.
- Decisione (di Lorenzo, 9/10/2026):
  - **Lettura adottata = Manzotti.** Nuova asserzione `A-0002`: identificazione `castello` → `gaz_castel_savello`; autore Manzotti (nuovo agente `agent/manzotti` in `Agents.tsv`, tipo scholar), Manzotti 2010, p. 293; codificatore Lorenzo; **adottata**. `A-0001` (Castel Gandolfo, Lorenzo) resta come lettura alternativa non adottata.
  - **La stazione è parte di `castello`** (`Is_Part_Of`) e perde l'ancoraggio diretto (e la relazione `inside`) a Castel Gandolfo sulle sue due interpretazioni. La sua posizione deriva dalla lettura adottata: l'adapter dà a un luogo senza ancore proprie l'entità della sua identificazione adottata (nuova query `Q_ADOPTED_IDENTIFICATIONS` in `tools/build_geojson.py`), e le parti la ereditano via `isPartOf`.
  - **`gaz_castello` eliminata**: l'identità resta solo nelle asserzioni.
  - Lo statuto di `castello` (Invented) non è cambiato: la proposta va in REVIEW_2. «Castel Savelli» (QP 173) come forma attestata di `castel_savello`: T-48.
  - L'autore delle interpretazioni resta il codificatore (Lorenzo), con vincolo SHACL obbligatorio (D-043): in fase 3, quando un'interpretazione riprende la lettura di uno studioso, si collega all'asserzione con `prov:wasDerivedFrom`.
  - `ALIAS_GROUPS` non si tocca: v. l'aggiornamento di D-011.
- Motivazione (fonte, pagina): Manzotti 2010, p. 293; Cap. 4, § 4.4 (r. 107); QP 279.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/Assertions.tsv` (riga `A-0002`), `Agents.tsv` (riga `manzotti`), `NarrativePlaces.tsv` (`stazione_carabinieri_castello`: `Is_Part_Of`), `SpatialInterpretations.tsv` (2 righe: ancora e relazione tolte), `GazetteerEntities.tsv` (riga `gaz_castello` eliminata); `tools/build_geojson.py:197-211` (query), `:416-424` (ancora dalla lettura adottata); cinque XLSX rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 24.588 → **24.600**; full 25.921 → **25.933** (−7 per `gaz_castello`, −4 ancore e relazioni della stazione, +1 `isPartOf`, +3 per l'agente, +19 per `A-0002` e le sue attribuzioni). Gazetteer 266 → 265. SHACL conforme; IQ12 = 0. GeoJSON: la stazione eredita `gaz_castel_savello` invece di `gaz_castel_gandolfo`; nient'altro cambia salvo `anchoredTotal` di Castel Gandolfo. **Peso** di `app/public/data/gaddatlas.geojson`: 684.137 byte, contro 684.167 su `main`: le attribuzioni non entrano nel view model (i +40 KB rispetto all'inizio della fase 1 vengono dal campo `criticalNote` del pannello dei brani, D-018). **Confronto visivo** sui 10 stati: la tessera della stazione passa nel gruppo di Castel Savello, nell'arco dei Castelli (stadi 2–4). Lo stadio 5 con «tutti» differiva anche nei confini di cella dell'intera mappa, ma due esperimenti (stazione riportata a Castel Gandolfo; GeoJSON precedente rimesso per intero) danno l'immagine del «dopo»: era un artefatto della prima serie di catture. Lo stato di quel livello dipende dai tempi di caricamento, da tenere presente nei confronti futuri.

---

## D-046 — Motivazione dello statuto: tipo, testo, stato di revisione (9 ottobre 2026)

- Requisito/i: R07 · Ipotesi: H3 · Data check: DC-09 (work order T-33)
- Stato precedente: nessuna motivazione strutturata dello statuto di realtà; per 49 luoghi non Imported lo statuto era un valore senza ragione dichiarata.
- Decisione (di Lorenzo, 9/10/2026): la motivazione sta sull'asserzione di statuto adottata (D-042): testo libero (`chora:rationale`) e tipo, nuovo schema `chora:RationaleTypeScheme` (prova referenziale, prova testuale, lettura critica). Nuovo schema `chora:ReviewStatusScheme` (bozza, validata) con `chora:reviewStatus`. Obbligatoria per i 49 luoghi non Imported e per i casi contesi; per gli Imported vale la motivazione standard «referente identificato nel repertorio» (`skos:scopeNote` di `chora:Imported`). Shape `StatusRationaleShape` a livello **sh:Warning**: diventa sh:Violation quando Lorenzo ha validato. Perché un Warning non renda il grafo non conforme, `tools/validate_shacl.py` passa `allow_warnings=True` e conta i risultati per gravità. IQ13: lo statuto del luogo deve coincidere con quello della lettura adottata.
- Bozze: 51 asserzioni `S-<luogo>` (49 non Imported più Casal Bruciato ed edicola), adottate, autore e codificatore Lorenzo, **stato bozza**, preparate **solo** da documenti esistenti, senza aggiungere nulla: 15 da passi del Cap. 4 o da decisioni registrate (con riga, paragrafo, pagina di QP e, dove c'è, opera e pagina dello studioso); 18 dalla descrizione del censimento; 8 dal legame `Is_Part_Of` del censimento (6 con descrizione); 10 senza fonte, dichiarate «da compilare» e senza tipo. Le tre bozze di Roccafringoli, Monte Nuncupale e Scerpure riportano che il Cap. 4 (§ 4.3) li dice *inventati* mentre i dati li danno Imagined dopo la permutazione (D-030, D-035). L'elenco è in REVIEW_2.
- Motivazione (fonte, pagina): Cap. 4, § 4.3 (r. 85) e R07; Reuschel, Piatti e Hurni 2013, pp. 138–139.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (scopeNote di `chora:Imported`; proprietà e schemi nuovi in fondo); `ontology/shapes/chora-shapes.ttl` (shape 8); `ontology/queries/integrity.rq` (IQ13); `tools/etl.py` (colonne `Rationale_Type`, `Review_Status`); `tools/validate_shacl.py` (`allow_warnings`, conteggio per gravità); `data/source/tables/Assertions.tsv` (due colonne nuove; righe `S-…`); `data/source/xlsx/Assertions.xlsx`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 763 → **827**; ABox 24.600 → **25.579**; full 25.933 → **26.976**. SHACL conforme, 0 violazioni, **49 avvertenze** (le bozze non validate); IQ12 = 0, IQ13 = 0.

---

## D-047 — Incertezza tipizzata: tipo, asse, origine, autore (9 ottobre 2026)

- Requisito/i: R09 · Ipotesi: — · Data check: DM-05, DC-06 (work order T-34)
- Stato precedente: l'incertezza era espressa solo da `chora:confidence` (decimale, 167 interpretazioni) e `chora:hasFuzzinessLevel` (decimale, 19 luoghi), cioè da indici numerici senza tipo né autore, contro il Cap. 4, § 4.4 («mai un indice unico di affidabilità»).
- Decisione (di Lorenzo, 9/10/2026): l'incertezza è un'asserzione di tipo uncertainty (D-042) con tre vocabolari SKOS nuovi: `chora:UncertaintyTypeScheme` (Vagueness, NonSpecificity, ContestedIdentification, Discrepancy con i sottotipi Oversight, Anachronism, Confusion, InternalDiscrepancy, Incompleteness, NonApplicability), `chora:UncertaintyAxisScheme` (nome, identificazione, geometria), `chora:UncertaintyOriginScheme` (documentaria, costruttiva); proprietà `chora:uncertaintyAxis`, `chora:uncertaintyOrigin`. Autore come ogni asserzione. **L'assenza di un'asserzione d'incertezza significa «non analizzato», non «certo»** (dichiarato nello schema). Popolati **solo** i casi documentati, otto asserzioni `U-0001…U-0008` in stato **bozza** (la classificazione è una proposta, in REVIEW_2): Casal Bruciato (confusione, geometria, documentaria; Manzotti 2010, pp. 268–269), Castello (identificazione contesa, identificazione, costruttiva; Manzotti 2010, p. 293), palazzo Simonetti (identificazione contesa; Pinotti 2025, p. 78), Robine Vecchie (discrepanza, nome; Terzoli 2015, p. 491), edicola (incompletezza, geometria, costruttiva; Manzotti 2010, p. 246), monti Ernici (non-specificità, «Ernici o Simbruini»; Manzotti 2010, p. 290), Càrsoli (svista, nome; Manzotti 2010, p. 254), Direttissima (anacronismo; Manzotti 2010, p. 270). Non attaccati perché senza un luogo come soggetto: la sciarpa narrata due volte (discrepanza interna) e il «vortice» di QP 12–13 (non-applicabilità). Nessuna mappatura automatica da Approximate / Indeterminate. `confidence` e `hasFuzzinessLevel` invariati (rinviati).
- Controlli: l'ETL si ferma se un'incertezza non ha asse e origine, o se asse e origine compaiono su un altro tipo; shape 9 (`UncertaintyAssertionShape`), provata su un caso incompleto.
- Motivazione (fonte, pagina): Cap. 4, § 4.4 (le cinque forme dell'incerto, rr. 99–123); DATA_CHECKS DM-05.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (sezione «Incertezza tipizzata»); `ontology/shapes/chora-shapes.ttl` (shape 9); `tools/etl.py` (`UNCERTAINTY_AXES`, `UNCERTAINTY_ORIGINS`, controllo e scrittura); `data/source/tables/Assertions.tsv` (colonne `Uncertainty_Axis`, `Uncertainty_Origin`; righe `U-…`); `data/source/xlsx/Assertions.xlsx`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 827 → **971**; ABox 25.579 → **25.755**; full 26.976 → **27.296**. SHACL conforme, 0 violazioni, 49 avvertenze (T-33).

---

## D-048 — Astensione dall'ancoraggio a tre valori (9 ottobre 2026)

- Requisito/i: R11 · Ipotesi: — · Data check: DM-05 (work order T-35)
- Stato precedente: un luogo senza ancoraggio era indistinguibile da un dato mancante.
- Decisione (di Lorenzo, 9/10/2026): nuovo schema `chora:LocalizationStatusScheme` con tre valori, distinti dal dato mancante: `chora:NotYetAnalysed` (analisi non condotta), `chora:SuspendedWithReason` (sospensione motivata, con `chora:localizationReason` obbligatorio), `chora:NotApplicable` (coordinata non applicabile); proprietà `chora:localizationStatus` sul luogo. Nuove colonne `Localization_Status` e `Localization_Reason` in `NarrativePlaces.tsv`. Valori di default applicati: i 5 luoghi **Imagined** → coordinata non applicabile; i 12 luoghi **senza alcun ancoraggio** (tutti Imported e senza occorrenze, il residuo di censimento segnalato da IQ9: colli_albani, colosseo, fontanella_della_scrofa, foro_italico, galleria_colonna, lungotevere_prati, piazza_garibaldi, piazza_san_pietro, prati_di_castello, quarto_di_santa_fumia, san_callisto, terme_di_caracalla) → analisi non condotta; nessuna sospensione motivata, finché Lorenzo non ne indica. Un luogo è ancorato se lo è una sua interpretazione, se eredita l'ancora via `isPartOf`, o se ha un'identificazione adottata (`castello`, D-045).
- Controlli: l'ETL rifiuta valori fuori schema e una sospensione senza motivo; shape 10 (valori, motivo); **IQ14**: nessun luogo senza ancoraggio e senza stato (provata togliendo lo stato a un luogo).
- Motivazione (fonte, pagina): Cap. 4, § 4.4 e tab. 4.2, R11 («Analisi non condotta, sospensione motivata e irrilevanza sono distinguibili?»).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (sezione «Astensione dall'ancoraggio»); `ontology/shapes/chora-shapes.ttl` (shape 10); `ontology/queries/integrity.rq` (IQ14); `tools/etl.py` (`LOCALIZATION_STATUSES`, lettura delle due colonne); `data/source/tables/NarrativePlaces.tsv` (due colonne, 17 valori); `data/source/xlsx/NarrativePlaces.xlsx`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 971 → **1.013**; ABox 25.755 → **25.772**; full 27.296 → **27.355**. SHACL conforme, 49 avvertenze (T-33); IQ14 = 0.

---

## D-049 — Livelli enunciativi: voce narrante e attribuzione della memoria (9 ottobre 2026)

- Requisito/i: R08, R19 · Ipotesi: H6 · Data check: — (work order T-36)
- Stato precedente: ogni interpretazione aveva solo il focalizzatore (`chora:hasFocalizer`); `narratorType` era usato da un solo agente (`narrator`); nessuna voce, nessuna attribuzione della memoria.
- Decisione (di Lorenzo, 9/10/2026: «modello completo; popola solo i casi del Cap. 4; il resto è non annotato, e va dichiarato»):
  - **enunciazione:** nuova `chora:hasNarratingVoice` (SpatialInterpretation → FocalizingAgent), colonna `Narrating_Voice_ID` in `SpatialInterpretations.tsv`. Popolata su 5 interpretazioni, tutte con voce `narrator`: QP 211 Porta San Paolo, focalizzatore Pestalozzi (Savettieri 2020, p. 44); QP 175 Ciampino e Santa Palomba, focalizzatore Santarella (Perosa 2023a, p. 238); QP 61 Dosso Faiti e Monte Cengio, focalizzatore Ingravallo (Cap. 4, § 4.3: «la voce narrante che scivola nel discorso indiretto libero»). Per le prime tre la fonte sta in `criticalNote`;
  - **«non annotato»:** l'assenza della proprietà vale «non annotato», non «voce = focalizzatore». Lo dichiarano il commento della proprietà nella TBox, `mapping.yaml` e `docs/EXCLUSIONS.md` (T-45);
  - **persistenza memoriale:** nuovo schema `chora:MemoryAttributionScheme` (AuthorMemory, CharacterMemory, UndecidableMemory), valori di `chora:MemoryAssertion`. Una lettura che sovrappone le due memorie asserisce entrambi i valori. Sei asserzioni (M-0001…M-0006), tre per ciascuna delle due interpretazioni di QP 61: Perosa 2023a, pp. 103–104 (autore); Lugnani, cit. in Perosa 2023a, p. 104, n. 97 (personaggio); Cortellessa 2023, p. 669 (autore e personaggio, «sovrimprime»). Nessuna è adottata: il Cap. 4 chiede di conservarle in parallelo. Tutte «bozza», da validare in REVIEW_2. Nuovi agenti: `perosa`, `lugnani`, `cortellessa`;
  - **momento del racconto:** è la posizione dell'occorrenza nel testo (capitolo e pagina del riferimento; il segmento verrà con T-51), già nel grafo. Non si aggiunge un tempo della storia o della stesura, perché la temporalità non è modellata (T-45). L'irruzione del «tempo della stesura» in QP 211 (Savettieri 2020, p. 44) riguarda un'allusione, non un luogo. Scelta segnalata in REVIEW_2.
- Alternative scartate: voce sulla PlaceReference (il work order lo ammetteva), scartata perché focalizzatore e voce devono stare sullo stesso nodo; un valore «non annotato» esplicito su 955 interpretazioni, scartato come rumore: la dichiarazione sta nel modello.
- Controlli: l'ETL rifiuta una voce assente da `FocalizingAgents.tsv`; shape 11 (`NarratingVoiceShape`: al più una voce, di classe FocalizingAgent; `MemoryAssertionShape`: valori dello schema).
- Motivazione (fonte, pagina): Cap. 4, § 4.3 (tre livelli: percezione, enunciazione, persistenza memoriale) e R19.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `ontology/chora.ttl` r. 1239–1281 (sezione «Livelli enunciativi»); `ontology/shapes/chora-shapes.ttl` r. 434–458 (shape 11); `data/source/mapping.yaml` r. 416–423; `tools/etl.py` r. 956–965; `data/source/tables/SpatialInterpretations.tsv` (colonna `Narrating_Voice_ID`, 5 valori; 3 `Critical_Note`); `data/source/tables/Agents.tsv` (3 righe); `data/source/tables/Assertions.tsv` (M-0001…M-0006); XLSX corrispondenti.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.013 → **1.049**; ABox 25.772 → **25.917**; full 27.355 → **27.536**. SHACL conforme, 49 avvertenze (T-33); IQ1–IQ14 a 0.

---

## D-050 — Partizione Roma città / campagna romana come ipotesi attribuita (9 ottobre 2026)

- Requisito/i: R20 · Ipotesi: — · Data check: — (work order T-37)
- Stato precedente: nessuna partizione. Le bande del GeoJSON (`urbano`, `periurbano`, `nazionale`, `build_geojson.py`, `scale_band`) sono una misura di distanza, non una partizione interpretativa.
- Decisione (di Lorenzo, 9/10/2026: «Roma città / campagna romana, lettura di Lorenzo, adottata; proponi il criterio»):
  - **modello:** nuove classi `chora:Partition` e `chora:PartitionZone`, proprietà `chora:hasZone` e `chora:inPartitionZone`. Una zona appartiene a una sola partizione: l'appartenenza di un luogo vale dentro quell'ipotesi, non in assoluto. Chi propone la partizione lo dice un'asserzione di tipo partition che ha la partizione per soggetto: `P-0001`, autore e codificatore Lorenzo, adottata, «bozza» finché il criterio non è validato;
  - **criterio proposto:** distanza dal Campidoglio dell'ancora primaria del luogo (la stessa regola dell'adapter, D-038: ancore proprie, poi identificazione adottata, poi `isPartOf`). Roma città fino a 10 km; campagna romana, Castelli compresi, fra 10 e 30 km. La soglia di 10 km cade in un vuoto dei dati: l'ultimo luogo urbano, l'Acqua Marcia, è a 8,4 km; il primo di campagna, Castel di Leva, a 12,9;
  - **non assegnati, casi di confine (REVIEW_2):** 33 luoghi. Sono entità lineari o areali che attraversano la soglia (via Appia, Aniene, acquedotti, tranvie dei Castelli, ferrovie…), luoghi Imagined, il litorale, la «campagna» dentro la città (Celio, Caffarella), l'ancora sospetta di `tiburtino` e la fascia fra 30 e 60 km. Restano non assegnati anche i 12 luoghi senza ancora. Oltre 60 km un luogo non appartiene a nessuna delle due zone;
  - **esito:** 221 luoghi assegnati: 162 a Roma città, 59 alla campagna romana. Fogli nuovi `PartitionZones.tsv` (2 zone) e `PartitionMembers.tsv` (221 righe). Le assegnazioni sono state prodotte una volta dal criterio; d'ora in poi il foglio è la sorgente e i casi di confine si aggiungono a mano dopo la revisione.
- Alternative scartate: il poligono comunale di `roma.geojson`, suggerito come esempio. Include l'Agro romano (Divino Amore, Castel di Leva, Santa Palomba, Tor di Gheppio) ed esclude il Vaticano (colonnato e cupola di San Pietro, Sant'Anna): darebbe una partizione amministrativa, non narrativa. Scartate anche una proprietà diretta luogo → «città» (renderebbe la partizione un fatto) e un'asserzione per luogo (221 nodi di attribuzione per una sola ipotesi).
- Controlli: l'ETL rifiuta luoghi e zone inesistenti; shape 12 (una zona in una sola partizione; partizione soggetto di un'asserzione; `inPartitionZone` verso una zona); **IQ15**: un luogo in più zone della stessa partizione (atteso 0).
- Motivazione (fonte, pagina): Cap. 4, § 4.1 (Calvino 1995 [1958], p. 51: i «due poli dell'azione») e R20 (§ 4.6). Le altre letture della partizione (Roggia 2016, 2023, p. 41; Perosa 2023a, pp. 249, 252–253; Savettieri 2020, p. 43; Alfano 2010, pp. 76, 80) entrano in fase 3 come partizioni alternative, con zone proprie.
- Fase in cui è maturata: prototipazione
- File toccati (manifest): `ontology/chora.ttl` r. 1283–1315 (sezione «Partizioni interpretative»); `ontology/shapes/chora-shapes.ttl` r. 461–494 (shape 12); `ontology/queries/integrity.rq` (IQ15); `tools/etl.py` r. 1084–1132 (`process_partitions`), r. 1454–1456; `data/source/tables/PartitionZones.tsv`, `PartitionMembers.tsv` (nuovi), `Assertions.tsv` (P-0001); XLSX corrispondenti; `data/README.md`; conteggio delle integrity query in `CLAUDE.md`, `Makefile`, `README.md`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.049 → **1.069**; ABox 25.917 → **26.169**; full 27.536 → **27.808**. SHACL conforme, 49 avvertenze (T-33); IQ1–IQ15 a 0.

---

## D-051 — Storia delle revisioni: tre letture superate (9 ottobre 2026)

- Requisito/i: R22 · Ipotesi: H8 · Data check: — (work order T-38)
- Stato precedente: le letture superate erano raccontate solo nelle voci di questo file (D-029, D-031, D-036, D-037); nel grafo nessuna asserzione portava `prov:wasRevisionOf`.
- Decisione (di Lorenzo, 9/10/2026: `prov:wasRevisionOf` solo per tre casi; la permutazione Invented ↔ Imagined è una correzione di schema, non una revisione):
  - **edicola ai Due Santi:** `C-edicola_due_santi` (censimento, Lorenzo, non adottata) → rivista da `S-edicola_due_santi` (Imported, Manzotti 2010, p. 246). Il valore della lettura del censimento è `chora:Invented`: nel censimento l'etichetta era «Imagined», ma prima della correzione di D-030 «Imagined» designava proprio il luogo fittizio in una geografia nota. Scelta segnalata in REVIEW_2;
  - **Casal Bruciato:** `C-casal_bruciato` (identificazione del censimento con il quartiere del Tiburtino, `gazetteer/gaz_casal_bruciato`, non adottata) → rivista da `I-casal_bruciato` (nuova identificazione adottata con `gaz_casale_abbruciato`, Manzotti 2010, pp. 268–269 e Tavv. VI–VII; D-037). L'entità del Tiburtino è stata eliminata in D-029: il suo IRI resta solo come valore della lettura superata, senza tipo né coordinate, e la nota lo dichiara. Il passaggio intermedio di D-029 (luogo trasformato senza referente) è nella nota, non è una terza asserzione. L'identificazione adottata non cambia la vista: il luogo ha ancore proprie, e la regola di D-045 vale solo per i luoghi che non ne hanno;
  - **palazzo Simonetti:** `C-palazzo_simonetti` (Imported, censimento, non adottata) → rivista da `S-palazzo_simonetti` (Transformed, Pinotti 2025, p. 78; D-036);
  - **permutazione:** dichiarata come `skos:historyNote` di `chora:RealityStatusScheme`; nessuna asserzione per i 20 luoghi permutati.
  Le tre letture del censimento sono «validata», senza data, perché la data del censimento non è registrata (REVIEW_2).
- Alternative scartate: rimettere nel grafo `gaz_casal_bruciato` come entità deprecata, scartata perché tornerebbe fra le entità del gazetteer e nei conteggi; una revisione per ciascun luogo permutato, contraria alla decisione di Lorenzo.
- Controlli: shape 13 (`RevisionShape`: la revisione punta a un'asserzione); **IQ16**: una revisione deve riguardare lo stesso soggetto e lo stesso tipo della lettura rivista, e la lettura rivista non deve essere adottata. Atteso 0; provata spostando una revisione su un altro soggetto (1 riga).
- Motivazione (fonte, pagina): Cap. 4, R22 e H8 («storia delle revisioni»); D-029, D-031, D-036, D-037.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Assertions.tsv` (C-edicola_due_santi, C-palazzo_simonetti, C-casal_bruciato, I-casal_bruciato; `Revision_Of` su S-edicola_due_santi e S-palazzo_simonetti); `data/source/xlsx/Assertions.xlsx`; `ontology/chora.ttl` r. 745 (`historyNote`); `ontology/shapes/chora-shapes.ttl` r. 495–509 (shape 13); `ontology/queries/integrity.rq` (IQ16); conteggio delle integrity query in `CLAUDE.md`, `Makefile`, `README.md`, `data/README.md`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.069 → **1.070**; ABox 26.169 → **26.249**; full 27.808 → **27.889**. SHACL conforme, 49 avvertenze (T-33); IQ1–IQ16 a 0.

---

## D-052 — Opera e testimoni: modello minimo (9 ottobre 2026)

- Requisito/i: R01 · Ipotesi: — · Data check: DC-05, DM-04 (work order T-40)
- Stato precedente: tre `LiteraryWork` che confondevano opera ed edizioni: `quer_pasticciaccio` («Garzanti 1957 (ed. definitiva)»), `quer_pasticciaccio_letteratura`, `quer_pasticciaccio_adelphi`. Nessuna relazione fra loro, nessun testimone.
- Decisione (di Lorenzo, 9/10/2026):
  - **opera:** `quer_pasticciaccio` è l'opera. Il campo `Edition_Used` è svuotato, perché un'opera non è un'edizione;
  - **testimoni:** nuova classe `chora:Witness` (sottoclasse di `prov:Entity`) e nuovo foglio `Witnesses.tsv`, sei righe. Ogni testimone ha `chora:witnessOf`, `chora:witnessType` (schema `WitnessTypeScheme`: redazione in rivista, dattiloscritto, bozze, princeps, edizione), data, curatore (`chora:editor`), editore o sede di conservazione (`chora:heldAt`). L'opera indica il testimone di riferimento con `chora:referenceWitness`:
    - **QPL**, redazione in rivista, 1946, «Letteratura», fascicoli 26–29 e 31 (Pinotti 2016, p. 200, n. 4);
    - **dtsFG**, dattiloscritto dei capitoli nuovi, Fondo Gelli, Fondazione Maria Corti, Pavia;
    - **bzFG**, bozze del volume, stessa sede;
    - **QP57**, princeps, Garzanti, finito di stampare del 22 giugno 1957;
    - **RR II**, edizione, Garzanti 1989, a cura di Giorgio Pinotti, Dante Isella e Raffaella Rodondi: l'edizione delle citazioni di Manzotti, Pinotti 2016 e Perosa;
    - **QP**, edizione, Adelphi 2018, a cura di Giorgio Pinotti, volume a stampa: testimone di riferimento;
  - **derivazioni:** `prov:wasDerivedFrom` solo dove documentato, con la fonte (`dcterms:source`): QP57 ← QPL (revisione dei «tratti» di rivista, Matt e Pinotti 2022, pp. 271–272) e QP57 ← bzFG (bozze del volume, Cap. 4, n. 10). Le altre derivazioni non sono scritte: dtsFG → bzFG, QP57 → RR II, QP57 → QP;
  - **metadati mancanti, lasciati vuoti (REVIEW_2):** data di dtsFG e di bzFG; curatore o direttore di QPL (il foglio delle opere riportava «Letteratura, Bonsanti»); fascicoli e pagine di QPL dentro la rivista;
  - **LRMoo:** allineamento dichiarato in `mapping.yaml` (Work ~ F1, Witness ~ F2 incarnata in F3 o F5, witnessOf ~ R3i, wasDerivedFrom ~ R76), non adottato in blocco: CHORA non distingue Expression e Manifestation, perché per i luoghi conta lo stato del testo;
  - **opera correlata:** `il_palazzo_degli_ori` (soggetto per la Lux Film, 1948; Pinotti 2016, pp. 201–203), legata all'opera con `dcterms:relation`, senza occorrenze e fuori dall'interfaccia (DM-04);
  - **pseudo-opere:** `quer_pasticciaccio_letteratura` e `quer_pasticciaccio_adelphi` restano fino a T-44, che sposta i 723 riferimenti e i 10 capitoli sull'opera e sul testimone QP. Il pannello del testo dell'app riconosce oggi l'edizione dall'id `quer_pasticciaccio_adelphi`: va cambiato nello stesso task, non prima.
- Alternative scartate: adottare LRMoo per intero (quattro livelli per un caso di studio che ne usa uno); un `LiteraryWork` per testimone (lo stato precedente, che confonde opera ed edizione).
- Controlli: l'ETL rifiuta tipi fuori schema, opere e derivazioni inesistenti, derivazioni senza fonte; shape 14 (`WitnessShape`: un'opera, un tipo, derivazione solo da testimoni; `ReferenceWitnessShape`: al più un testimone di riferimento).
- Motivazione (fonte, pagina): Cap. 4, § 4.2 (cinque ordini della tradizione; r. 41, 43) e note 4 e 10 (sigle).
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `ontology/chora.ttl` r. 1318–1402 (sezione «Opera e testimoni»); `ontology/shapes/chora-shapes.ttl` r. 510–545 (shape 14); `data/source/mapping.yaml` r. 599–633 (`Related_Work`, blocco `Witnesses` con l'allineamento LRMoo); `tools/etl.py` r. 1047–1099 (`process_witnesses`), `Related_Work` in `process_literary_works`, `Witnesses` fra i fogli attesi; `data/source/tables/Witnesses.tsv` (nuovo), `LiteraryWorks.tsv` (colonna `Related_Work`, opera ripulita, nuova riga); XLSX corrispondenti; `data/README.md`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.070 → **1.146**; ABox 26.249 → **26.300**; full 27.889 → **28.016**. SHACL conforme, 49 avvertenze (T-33); IQ1–IQ16 a 0. Vista invariata (GeoJSON: cambia solo `tripleCount`).

---

## D-053 — Varianti di testimone: le quattro documentate (9 ottobre 2026)

- Requisito/i: R01, R05 · Ipotesi: — · Data check: DC-01, DC-02 (work order T-41)
- Stato precedente: tutte le occorrenze erano di QP; nessuna proprietà per il testimone di un'occorrenza; le varianti stavano solo nel Cap. 4 e nelle voci D-036 e D-037.
- Decisione (di Lorenzo, 9/10/2026: solo le quattro varianti documentate, come asserzioni `variant`; le letture di Terzoli in fase 3):
  - **testimone dell'occorrenza:** nuova `chora:appearsInWitness` (PlaceReference → Witness) e colonna `Witness_ID` in `References.tsv`. Si compila qui solo per le occorrenze nuove; T-44 la estende alle 723 occorrenze di QP;
  - **quattro occorrenze di confronto**, che puntano allo stesso luogo dell'occorrenza di QP (regola di T-42):
    - `ref_00724`: RR II 219, frattocchie, estratto «su su su fu fu fu da 'e Fattocchie» (Cap. 4, r. 83);
    - `ref_00725`: dtsFG, via_lanza, senza pagina né estratto;
    - `ref_00726` e `ref_00727`: QPL 285 e QPL 293, palazzo_219, senza estratto;
  - **quattro asserzioni `variant`**: soggetto il luogo, valori almeno due occorrenze, una di QP e una dell'altro testimone:
    - `V-0001`: Fattocchie (RR II 219) / Frattocchie (QP 241), emendamento dell'editore; autore Pinotti; QP, p. 241;
    - `V-0002`: via Lata (dtsFG) / via Lanza (QP 177); Pinotti 2025, p. 78;
    - `V-0003`: civico 119 (QPL 285, 293) / 219 (QP 16, 25); Matt e Pinotti 2022, schede 8, 11, 30, 31;
    - `V-0004`: «palazzo degli ori» (QPL 285, 293) / «palazzo dell'Oro» (QP 16, 25); stessa fonte.
    Nuovi agenti `pinotti` e `matt` (nome per esteso da confermare). `Author_ID` accetta ora più autori separati da «|»;
  - **fuori dalle viste:** GeoJSON, brani e invarianti dell'audit considerano solo le occorrenze del testimone di riferimento (`chora:referenceWitness`, D-052). Le altre sono un'esclusione attesa dell'audit («4 PlaceReference di altri testimoni»).
- Effetto collaterale corretto nello stesso task: i brani seguivano l'ordine di iterazione del grafo, che cambia quando un riferimento compare come oggetto di un'asserzione. Ora `build_passages.py` li ordina per IRI, come le feature (D-041). Il contenuto dei 10 file e dell'indice è identico; cambia solo l'ordine.
- Da completare (REVIEW_2): gli estratti di QPL 285 e 293 e di dtsFG, che il repository non ha, e la pagina del dattiloscritto. Lo shape degli estratti (Warning) li segnala: le avvertenze passano da 49 a **52**. L'attribuzione di V-0003 a Matt e Pinotti segue la citazione unica del Cap. 4, r. 45, che vale per entrambe le varianti del palazzo.
- Alternative scartate: una classe `chora:VariantReading` (il work order la proponeva), scartata perché l'asserzione attribuita esiste già (D-042) e una variante è una lettura; un'asserzione per coppia di luoghi testuali, scartata perché la corrispondenza fra QPL 285/293 e QP 16/25 non è documentata riga per riga.
- Controlli: l'ETL rifiuta un testimone inesistente; shape 15 (`VariantAssertionShape`: soggetto NarrativePlace, almeno due valori PlaceReference).
- Motivazione (fonte, pagina): Cap. 4, § 4.2 (r. 45) e § 4.3 (r. 83), n. 26; Pinotti 2025, p. 78; Matt e Pinotti 2022.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `ontology/chora.ttl` r. 1404–1409 (`appearsInWitness`); `ontology/shapes/chora-shapes.ttl` r. 546–564 (shape 15); `tools/etl.py` r. 793–801 (`Witness_ID`), r. 1274–1279 (più autori); `tools/build_geojson.py` r. 258–270 (filtro in `Q_REFERENCES`); `tools/build_passages.py` r. 78–85 (filtro e ordine); `tools/audit_alignment.py` r. 88–94, r. 224–227; `data/source/tables/References.tsv` (colonna `Witness_ID`, 4 righe), `Agents.tsv` (2 righe), `Assertions.tsv` (V-0001…V-0004); XLSX corrispondenti; derivati in `data/dist/passages/` e `app/public/data/passages/` (solo ordine).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.146 → **1.152**; ABox 26.300 → **26.425**; full 28.016 → **28.147**. Riferimenti 723 → 727, di cui 723 nel testimone di riferimento. SHACL conforme, 52 avvertenze (49 T-33, 3 estratti mancanti); IQ1–IQ16 a 0 tranne **IQ6 = 3** (gli stessi estratti mancanti: dato non visto al momento del commit, perché la prima esecuzione si era fermata all'audit e la seconda non aveva rieseguito le query; corretto in D-055). Vista invariata (GeoJSON: cambia solo `tripleCount`). Test dell'app: 5/5.

---

## D-054 — Occorrenze di altri testimoni: stesso luogo, nessuno statuto proprio (9 ottobre 2026)

- Requisito/i: R01 · Ipotesi: — · Data check: DM-04 (work order T-42)
- Stato precedente: con D-053 esistono quattro occorrenze fuori da QP, escluse dalle viste, ma nessun controllo ne fissava lo statuto.
- Decisione (di Lorenzo, 9/10/2026: le occorrenze in testimoni diversi da QP puntano allo stesso luogo, con il proprio testimone; lo statuto è del luogo, non del testimone):
  - **stesso luogo:** nel grafo una PlaceReference non porta il proprio luogo, perché il legame occorrenza → luogo passa per l'interpretazione (scelta di modello v4.1.1). Un'occorrenza di confronto è legata al luogo dall'asserzione di variante che la contiene, il cui soggetto è il luogo (D-053). Sulle sorgenti, l'audit verifica che il luogo dichiarato in `References.tsv` coincida con il soggetto della variante, per tutte le occorrenze della variante, comprese quelle di QP;
  - **nessuna interpretazione propria:** un'occorrenza di confronto non ha SpatialInterpretation. Statuto, ruolo e determinazione restano del luogo e delle occorrenze di QP;
  - **lo statuto è del luogo:** un'asserzione di statuto ha per soggetto un `NarrativePlace`, mai un'occorrenza o un testimone (shape 16);
  - **fuori dalle viste:** già applicato in D-053 (GeoJSON, brani, invarianti dell'audit).
- Alternative scartate: una proprietà diretta occorrenza → luogo solo per le occorrenze di confronto, che avrebbe introdotto due regimi per lo stesso legame; un'interpretazione per ogni occorrenza di confronto, che le avrebbe portate nel rilievo e nei conteggi.
- Controlli:
  - **IQ17**: un'occorrenza di un altro testimone che non sta in alcuna variante, o che è interpretata. Atteso 0; provata togliendo una variante e aggiungendo un'interpretazione (2 righe);
  - shape 16 (`StatusSubjectShape`);
  - due invarianti nuovi in `audit_alignment.py`: luogo dell'occorrenza = soggetto della variante; ogni occorrenza di un altro testimone sta in una variante.
- Motivazione (fonte, pagina): Cap. 4, § 4.2 (r. 43: le occorrenze dei corpora di confronto «vanno registrate con questo statuto, non come occorrenze del romanzo pubblicato»).
- Fase in cui è maturata: prototipazione
- File toccati (manifest): `ontology/queries/integrity.rq` (IQ17); `ontology/shapes/chora-shapes.ttl` r. 565–580 (shape 16); `tools/audit_alignment.py` r. 200–224; conteggio delle integrity query in `CLAUDE.md`, `Makefile`, `README.md`, `data/README.md`.
- Effetto su KG (triple prima/dopo, SHACL): invariato (TBox 1.152, ABox 26.425, full 28.147). SHACL conforme, 52 avvertenze; IQ1–IQ17 a 0 tranne IQ6 = 3 (v. D-053, corretto in D-055).

---

## D-055 — Ogni occorrenza ha il suo testimone; l'opera è derivata (9 ottobre 2026)

- Requisito/i: R01 · Ipotesi: — · Data check: — (work order T-44)
- Stato precedente: le 723 occorrenze di QP puntavano con `appearsInWork` alla pseudo-opera `quer_pasticciaccio_adelphi`, che era un'edizione. I 10 capitoli erano «parte» della stessa pseudo-opera. Solo le 4 occorrenze di confronto di D-053 avevano un testimone.
- Decisione (di Lorenzo, 9/10/2026: `appearsInWitness` (QP, Adelphi 2018, a stampa) su ogni PlaceReference; `appearsInWork` resta come proprietà derivata):
  - **testimone obbligatorio:** `Witness_ID` = `qp` sulle 723 occorrenze di QP. L'ETL rifiuta un'occorrenza senza testimone o con un testimone inesistente;
  - **opera derivata:** la colonna `LiteraryWork_ID` di `References.tsv` è tolta. L'ETL scrive `appearsInWork` come l'opera del testimone, e la TBox lo dichiara con `owl:propertyChainAxiom ( chora:appearsInWitness chora:witnessOf )`;
  - **capitoli:** i 10 capitoli sono parte dell'opera `quer_pasticciaccio`. Le pseudo-opere `quer_pasticciaccio_letteratura` e `quer_pasticciaccio_adelphi` sono tolte: i loro dati stanno nei testimoni QPL e QP (D-052). Resta `il_palazzo_degli_ori`, opera correlata;
  - **app:** il pannello del testo riconosce l'edizione dal testimone (`passage.witness === "qp"`) e non più dall'id della pseudo-opera. I brani portano il campo `witness`. Il testo mostrato non cambia («Adelphi, 2018 · A 241»).
- Correzione di D-053 e D-054: dopo D-053, IQ6 restituiva 3 righe, perché l'estratto mancante delle occorrenze di confronto contava come errore. Ora IQ6 richiede l'estratto solo per le occorrenze del testimone di riferimento, come l'audit, e controlla per tutte la presenza di opera e testimone. La mancanza dell'estratto nelle occorrenze di confronto resta un'avvertenza SHACL (3 delle 52). IQ3 controlla anche `appearsInWitness`.
- Controlli: shape `PlaceReferenceShape` (un solo testimone, Violation); IQ3, IQ6.
- Motivazione (fonte, pagina): Cap. 4, § 4.2 e R01 («testimone e redazione per ogni occorrenza»); CLAUDE.md, testo di riferimento QP nel volume a stampa.
- Fase in cui è maturata: prototipazione
- File toccati (manifest): `data/source/tables/References.tsv` (colonna `Witness_ID` compilata, colonna `LiteraryWork_ID` tolta), `Chapters.tsv` (10 righe), `LiteraryWorks.tsv` (2 righe tolte); XLSX corrispondenti; `data/source/mapping.yaml` r. 207–213; `tools/etl.py` r. 755–764 (testimone e opera derivata), `witness_work` in `process_witnesses`, tolta `resolve_work_uri_for_reference`; `ontology/chora.ttl` r. 278–283 (`appearsInWork`); `ontology/shapes/chora-shapes.ttl` r. 249–255; `ontology/queries/integrity.rq` (IQ3, IQ6); `tools/build_passages.py` (campo `witness`); `app/src/ui/text-panel.js` r. 100.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.152 → **1.158**; ABox 26.425 → **27.136** (+723 `appearsInWitness`, −12 per le due pseudo-opere); full 28.147 → **28.864**. SHACL conforme, 52 avvertenze; IQ1–IQ17 a 0 (IQ9 informativa: 13). Test dell'app 5/5; build dell'app riuscito.

---

## D-056 — Esclusioni dichiarate: docs/EXCLUSIONS.md (9 ottobre 2026)

- Requisito/i: R12 (e R02, che resta non soddisfatto) · Ipotesi: — · Data check: DM-03, DM-04 (work order T-45, T-70)
- Stato precedente: `docs/EXCLUSIONS.md` non esisteva; `CLAUDE.md` lo citava già.
- Decisione (di Lorenzo, 9/10/2026): nuovo file con quattro voci:
  - **temporalità**, con il testo stabilito da Lorenzo («La temporalità della storia, del racconto e del referente non è modellata. La diacronia dei testimoni è registrata nel grafo (T-40) ma non è esposta nell'interfaccia (DM-04).»). Il file dichiara anche la conseguenza: R02 non è soddisfatto, e il «momento del racconto» di R19 è la posizione nel testo (D-049);
  - **percorsi degli oggetti** (DM-03);
  - **diacronia dei testimoni nell'interfaccia** (DM-04), con i rimandi a D-052…D-054;
  - **resa grafica dei percorsi non compiuti** (T-64). Il prototipo disegna oggi tutte le route come linee: il filtro sul tipo arriva con il porting, e il file lo dice.
  Una sezione distinta, «Copertura parziale dichiarata», raccoglie i fenomeni che il modello prevede ma i dati coprono solo in parte: voce narrante e memoria (D-049), partizione (D-050), varianti (D-053). Lì l'assenza vale «non annotato». È la dichiarazione promessa in D-049.
- Non aggiunto, da decidere (REVIEW_2): il Cap. 4, § 4.6 (r. 190) chiede di dichiarare fra i fenomeni esclusi la figuralità delle occorrenze, perché la proposizione che la riguarda non è interrogabile senza quell'annotazione. Non era nell'elenco di Lorenzo.
- Motivazione (fonte, pagina): Cap. 4, R12 (§ 4.8, r. 255) e R02 (§ 4.2, r. 63).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `docs/EXCLUSIONS.md` (nuovo); `README.md` r. 56–57.
- Effetto su KG (triple prima/dopo, SHACL): invariato (TBox 1.158, ABox 27.136, full 28.864). SHACL conforme, 52 avvertenze.

---

## D-057 — Ancoraggio relazionale, distinto dalla referenza plurale e dall'identificazione contesa (9 ottobre 2026)

- Requisito/i: R04 · Ipotesi: H3 · Data check: DC-07, DC-18 (work order T-47; prepara T-62)
- Stato precedente: le relazioni del Cap. 4 (r. 93) erano indistinguibili nei dati. Gli ancoraggi testuali di Casal Bruciato (D-037) erano ancore `anchorsToEntity` aggiunte a quella del casale, con relazione `near`. Robine Vecchie aveva due interpretazioni dello stesso passo e dello stesso focalizzatore (`interp_00472`, `interp_00473`), ciascuna ancorata con `near` a un luogo diverso: un doppio ancoraggio che il modello leggeva come referenza multipla.
- Decisione (di Lorenzo, 9/10/2026):
  - **modello:** nuova classe `chora:RelationalAnchoring` (`relanchor/{interpretazione}`), legata all'interpretazione da `chora:hasRelationalAnchoring`, con uno o più termini (`chora:relatum`, entità del gazetteer) e un tipo (`chora:relationalType`). Nuovo concetto `chora:Between` («tra») nello schema delle relazioni spaziali. Colonne `Relational_Anchor_IDs` e `Relational_Anchor_Type` in `SpatialInterpretations.tsv`. La TBox dichiara la distinzione: la referenza plurale è un riferimento per luogo (Faiti/Cengio); l'identificazione contesa è un'asserzione d'identificazione (Castello);
  - **regola di geometria:** un luogo prende geometria solo dalla posizione adottata (`anchorsToEntity`, o l'identificazione adottata di D-045); gli ancoraggi relazionali non producono un punto;
  - **Casal Bruciato:** in 11 delle 13 interpretazioni l'ancora resta solo `gaz_casale_abbruciato` (posizione TCI adottata). I luoghi che il passo dispone intorno diventano termini di un ancoraggio relazionale `near`: Castel di Leva, ponte del Divino Amore, via della Falcognana, ferrovia Roma–Velletri, Ardeatina, Santa Palomba. La relazione `near` dell'interpretazione, che descriveva quelle ancore, è tolta;
  - **Robine Vecchie:** una sola interpretazione (`interp_00472`), senza ancora, con ancoraggio relazionale `between` Frattocchie e Due Santi. `interp_00473`, il doppione, è eliminata: interpretazioni 960 → **959**. Stato di localizzazione: **sospensione motivata**, motivo: solo ancoraggio relazionale; toponimo «non registrato nelle carte topografiche» (Terzoli 2015, p. 491);
  - **fuori carta:** l'adapter toglie da feature e rilievo un luogo interpretato senza posizione adottata, e lo scrive nel nuovo elenco `offMap` del GeoJSON con stato e motivo di localizzazione, ancoraggi relazionali, interpretazioni e riferimenti. È il dato del pannello «Fuori carta» (T-62). `meta.tessellation.excludedUnanchored` vale ora 1 (Robine Vecchie).
- Effetto sulla vista: feature 301 → **300** (la tessera di Robine Vecchie sparisce: il luogo è fuori carta); righe di rilievo 931 → **929**; generatori della tassellazione invariati (223), semi delle altre tessere invariati. Casal Bruciato non cambia sulla carta: il suo rilievo stava già sul casale (D-038). Il seme di `robine_vecchie` resta in `void_seeds.json`, inutilizzato. Confronto visivo in chiusura di fase.
- Alternative scartate: tenere i termini relazionali come ancore con una relazione (lo stato precedente), perché ogni ancora genera un bersaglio e quindi un punto; dare a Robine una posizione mediana fra i due termini, perché sarebbe una coordinata costruita che il testo non dà.
- Controlli: l'ETL rifiuta termini inesistenti, tipi fuori vocabolario e colonne compilate a metà; shape 17 (`RelationalAnchoringShape`: almeno un termine, un tipo, «tra» con almeno due termini); IQ14 resta a 0 (Robine dichiara lo stato).
- Motivazione (fonte, pagina): Cap. 4, § 4.3 (r. 93: referenza plurale, ancoraggio relazionale, identificazione contesa, disgiunzione); D-037; Terzoli 2015, p. 491 (cit. in Cap. 4, r. 83).
- Fase in cui è maturata: prototipazione
- File toccati (manifest): `ontology/chora.ttl` r. 1414–1454 (sezione «Ancoraggio relazionale»; `chora:Between` nello schema); `ontology/shapes/chora-shapes.ttl` r. 90 (`Between` ammesso), r. 588–613 (shape 17); `data/source/mapping.yaml` r. 190, r. 419–423; `tools/etl.py` r. 949–970; `tools/build_geojson.py` r. 213–223 (`Q_OFF_MAP_INFO`), r. 485–495 (regola fuori carta), r. 690–715 (`offMap`), r. 868; `data/source/tables/SpatialInterpretations.tsv` (due colonne, 12 righe, una eliminata), `NarrativePlaces.tsv` (Robine Vecchie: stato e motivo); XLSX corrispondenti.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.158 → **1.187**; ABox 27.136 → **27.144**; full 28.864 → **28.901**. SHACL conforme, 52 avvertenze; IQ1–IQ17 a 0 (IQ9 informativa: 13). Test dell'app 5/5.

- **Correzione (D-084, 10/10/2026):** lo stato «fuori carta» (`offMap`) era un errore. Nessun luogo annotato esce dall'interfaccia: i termini relazionali del gazetteer sono le ancore di un'interpretazione che non ne ha di dirette, e Robine Vecchie si posiziona da Frattocchie e Due Santi. Elenco `offMap` e sospensione motivata di Robine tolti; controlli permanenti in D-084.
---

## D-058 — Soglia, frontalità, confine; edicola adiacente all'orto (9 ottobre 2026)

- Requisito/i: R17 · Ipotesi: — · Data check: DC-03 (work order T-53)
- Stato precedente: lo schema delle relazioni spaziali non aveva soglia, frontalità e confine. Tolto `Is_Part_Of` (D-031), l'edicola ai Due Santi non aveva più alcun legame con l'orto/vigna nel cui muro il testo la colloca. Il modello non aveva relazioni qualitative fra luoghi oltre a `isPartOf`.
- Decisione (di Lorenzo, 9/10/2026):
  - **tre concetti nuovi** in `chora:SpatialRelationTypeScheme`: `chora:Threshold` (soglia), `chora:Facing` (di fronte, «in faccia», «rimpetto»), `chora:Boundary` (confine). Sono ammessi nella relazione dell'interpretazione e nell'ancoraggio relazionale; il vocabolario del mapping li accetta come `threshold`, `facing`, `boundary`. Per ora non sono usati: il popolamento è fuori da questo task;
  - **relazione senza referente:** il termine di un ancoraggio relazionale (`chora:relatum`, D-057) può essere anche un luogo narrativo, non solo un'entità del gazetteer. È il caso di R17: la relazione vale anche quando l'altro luogo non ha un referente geografico;
  - **edicola ai Due Santi:** l'interpretazione di QP 216 (`interp_00660`, «Lo interrompeva un tabernacolo», dove il soggetto è il muriccio dell'orto) ha un ancoraggio relazionale `AdjacentTo` verso `orto_vigna_due_santi`. Sostituisce l'`Is_Part_Of` tolto in D-031 e non dà geometria: la posizione dell'edicola resta `gaz_edicola_due_santi` (DC-03, volume TCI ancora da verificare).
- Alternative scartate: una proprietà diretta luogo → luogo per ogni relazione (sette proprietà nuove, senza il passo che le attesta); rimettere `Is_Part_Of`, che farebbe ereditare all'edicola, luogo importato, l'ancora di un luogo inventato.
- Controlli: l'ETL accetta come termine un id del gazetteer o di un luogo narrativo, e rifiuta il resto; shape 7 (`assignsSpatialRelationType`) e shape 17 aggiornati.
- Motivazione (fonte, pagina): Cap. 4, § 4.6 e R17 («soglia, adiacenza, verticalità, confine […] anche quando tali contesti risultino sprovvisti di un referente geografico reale»); QP 216.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `ontology/chora.ttl` r. 778–797 (schema delle relazioni), r. 1438–1442 (`chora:relatum` con range unione), r. 1459–1480 (tre concetti); `ontology/shapes/chora-shapes.ttl` r. 90–91, r. 599–607 (shape 17); `data/source/mapping.yaml` r. 190–193, r. 424–425; `tools/etl.py` r. 963–974 (termini luogo); `data/source/tables/SpatialInterpretations.tsv` (`interp_00660`); `SpatialInterpretations.xlsx`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.187 → **1.217**; ABox 27.144 → **27.148**; full 28.901 → **28.935**. SHACL conforme, 52 avvertenze; IQ1–IQ17 a 0. Vista invariata (GeoJSON: cambia solo `tripleCount`). Due build consecutivi identici.

---

## D-059 — Forma attestata sull'occorrenza, soprannomi sul luogo (9 ottobre 2026)

- Requisito/i: R05 · Ipotesi: H1 · Data check: DC-01, T-74 (work order T-48)
- Stato precedente: solo `rdfs:label` e `skos:altLabel` sul luogo. `Alternative_Toponym` arrivava nel grafo come un solo letterale con le forme unite da «;». Nessuna forma attestata sulle occorrenze.
- Decisione (di Lorenzo, 9/10/2026: forma attestata sulla PlaceReference, distinta dall'etichetta normalizzata sul luogo; soprannomi come proprietà del luogo; estrarre dagli estratti le forme che differiscono dall'etichetta ed elencarle in REVIEW_2):
  - **forma attestata:** nuova `chora:attestedForm` sulla PlaceReference, colonna `Attested_Form` in `References.tsv`. È una trascrizione, non una correzione. Compilata per **178** occorrenze: 176 di QP e 2 di confronto («Fattocchie», RR II 219; «via Lata», dtsFG);
  - **soprannomi:** nuova `chora:nickname` (sottoproprietà di `skos:altLabel`), colonna `Nickname` in `NarrativePlaces.tsv`. Palazzo di via Merulana 219: «palazzo de li pescicani», «er palazzo dell'oro», spostati da `Alternative_Toponym`;
  - **forme varianti del luogo** (`skos:altLabel`): «li Du Santi» (due_santi), «Castel Savelli» (castel_savello, QP 173), «Castel Porcino» (castel_porcano, QP 213; prima «castel porcino» minuscolo). «Casale Abbrusciato» (QP 297) c'era già. Ora ogni forma di `Alternative_Toponym` è un letterale distinto (separatore «;», T-85);
  - **estrazione:** sono state considerate le 325 occorrenze di QP il cui estratto non contiene l'etichetta del luogo. Per ognuna si cercano prima le forme registrate del luogo, apostrofi compresi; poi la sequenza di parole più simile all'etichetta (soglia 0,72), rifilata delle parole di contorno. 14 bordi sono corretti a mano (per esempio «La A», «la B», «Reggio (Calabria)», «stazzione»). Ogni forma è una sottostringa esatta dell'estratto. Le altre 149 occorrenze evocano il luogo con una descrizione o un pronome («quela casa», «la tenenza») e non hanno forma attestata. L'elenco completo è in REVIEW_2, da confermare: gli estratti vengono dalla copia digitale, e il testo di riferimento è il volume a stampa.
- Da segnalare (REVIEW_2): l'etichetta del luogo `milano` è «Milanno», mentre le 6 occorrenze stampano «Milano» (T-74); le perifrasi del palazzo 219 rimaste in `Alternative_Toponym` («ben nota architettura», «casermone color pidocchio», «sto palazzo»…) sono forme attestate, non varianti del toponimo; la classificazione di «li Du Santi», «Castel Savelli» e «Castel Porcino» come varianti e non come soprannomi.
- Controlli: shape 18 (`AttestedFormShape`: al più una forma per occorrenza).
- Motivazione (fonte, pagina): Cap. 4, § 4.3 (r. 83, 93) e R05; QP 16, 24, 25, 173, 213, 297.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `ontology/chora.ttl` r. 1482–1502 (sezione «Forma attestata»); `ontology/shapes/chora-shapes.ttl` r. 34, 616–630 (prefisso `rdf:`, shape 18); `data/source/mapping.yaml` r. 239–243, 291–301; `tools/etl.py` r. 561–567, 787–789; `data/source/tables/References.tsv` (colonna `Attested_Form`, 178 valori), `NarrativePlaces.tsv` (colonna `Nickname`; quattro luoghi); XLSX corrispondenti.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.217 → **1.230**; ABox 27.148 → **27.336**; full 28.935 → **29.136**. SHACL conforme, 52 avvertenze; IQ1–IQ17 a 0. Vista invariata (GeoJSON: cambia solo `tripleCount`).

---

## D-060 — Percorsi tipizzati: sei tipi, ventuno percorsi (9 ottobre 2026)

- Requisito/i: R18 · Ipotesi: — · Data check: DM-03 (work order T-54; T-64)
- Stato precedente: 18 `NarrativeRoute` senza tipo. `tragitto_torraccio_ponte_divino_amore` mescolava i nodi di QP 169 (Santarella) e QP 297 (Ingravallo e gli altri). Nessun percorso per QP 212 e 237.
- Decisione (di Lorenzo, 9/10/2026):
  - **schema:** `chora:RouteTypeScheme` con sei tipi, solo per i personaggi (DM-03): compiuto, indicato, sognato, inferito, direzionale, proposto (`CompletedRoute` … `ProposedRoute`, con `skos:notation` 1–6). Il tipo è una lettura: lo assegna un'asserzione `route` (`chora:RouteTypeAssertion`, nuovo tipo dello schema delle asserzioni); l'ETL ne deriva `chora:hasRouteType` dalla lettura adottata. Il GeoJSON porta `routeType` per ogni percorso. Il Cap. 4 (r. 194) chiama «presunto» il tipo che Lorenzo chiama «direzionale»: lo registra lo `scopeNote`, e va allineato nel capitolo;
  - **separazione:** il percorso di QP 169 diventa `tragitto_santarella_torraccio_divino_amore` (sei nodi, il riferimento portatore `ref_00406`); `tragitto_torraccio_ponte_divino_amore` resta il percorso di QP 297;
  - **percorsi nuovi:** `tragitto_sogno_casal_bruciato_campo_morto` (QP 212, sognato, Pestalozzi): passaggio a livello di Casal Bruciato → Roma-Napoli → Campo Morto. `tragitto_castel_di_leva_casal_bruciato` (QP 237, indicato, Camilla): Castel di Leva → ponte → passaggio a livello di Casal Bruciato. I nodi sono le interpretazioni già esistenti di quei passi; i portatori sono due riferimenti nuovi (`ref_00728`, `ref_00729`, estratti composti dai passi dei nodi) e due interpretazioni nuove (`interp_00963`, `interp_00964`);
  - **proposte di tipo**, tutte «bozza» (R-0001…R-0021, REVIEW_2): 15 compiuti (di cui 7 abituali), 2 indicati (QP 237; QP 238, incerto con compiuto), 2 inferiti (QP 169 e 174, elenchi disgiuntivi di provenienze o fermate, forse non percorsi), 1 sognato (QP 212), 1 direzionale (QP 278). Per QP 274 (fughe ipotetiche di Retalli: inferito) e QP 298 (ritorno proposto dall'ometto: proposto) la proposta è in REVIEW_2, senza percorsi nei dati;
  - **anomalie trovate, non corrette (REVIEW_2):**
    - QP 297: l'ultimo nodo (ponte del Divino Amore) è un termine di paragone, non un punto attraversato;
    - QP 153: i nodi sono in ordine inverso (Santo Stefano 1, Tenenza 2);
    - QP 93: il focalizzatore registrato è Liliana, ma si sposta il giudice; se il percorso fosse quello del corpo, sarebbe un oggetto (DM-03).
  La lettura di Manzotti di «per fil a dest» (2010, p. 269) resta una nota attribuita di fase 3.
- Controlli: shape 19 (`RouteTypeAssertionShape`: soggetto un percorso, un valore dello schema; `RouteTypeShape`: ogni percorso ha uno e un solo tipo); l'ETL rifiuta un'asserzione adottata il cui soggetto non è un percorso.
- Motivazione (fonte, pagina): Cap. 4, § 4.6 (r. 176, 194) e R18; QP 25, 40, 41, 56, 93, 139–140, 153, 169, 173, 174, 182, 206, 208–215, 212, 237, 238, 278, 292, 297.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `ontology/chora.ttl` r. 870–877 (tipo di asserzione), r. 1505–1582 (sezione «Percorsi tipizzati»); `ontology/shapes/chora-shapes.ttl` r. 304–306, r. 631–658 (shape 19); `tools/etl.py` r. 1225, r. 1339–1347; `tools/build_geojson.py` r. 609–611, `routeType` nel payload; `data/source/tables/References.tsv` (`ref_00406`; `ref_00728`, `ref_00729`), `SpatialInterpretations.tsv` (7 righe del percorso di QP 169, 6 nodi nuovi, 2 portatori), `Assertions.tsv` (R-0001…R-0021); XLSX corrispondenti.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.230 → **1.306**; ABox 27.336 → **27.854**; full 29.136 → **29.730**. Percorsi 18 → **21**; interpretazioni 959 → **961**; riferimenti 727 → **729** (725 di QP). SHACL conforme, 52 avvertenze; IQ1–IQ17 a 0. Feature (300) e righe di rilievo (929) invariate. Il filtro della carta sui percorsi compiuti è nel commit successivo: `isDrawnRoute` in `app/src/model/attested-routes.js` (un percorso senza tipo resta disegnato), con `app/test/attested-routes.test.js`. Prima del filtro la carta disegnava 18 linee; dopo, 15. Spariscono QP 169 e 174 (inferiti), 238 (indicato) e 278 (direzionale), e non compaiono i due percorsi nuovi. `docs/EXCLUSIONS.md`, voce 4, aggiornata.

---

## D-061 — Statuti dopo REVIEW_2: castello Imported, nuova definizione di Imagined (9 ottobre 2026)

- Requisito/i: R07 · Ipotesi: H1 · Data check: DM-01, DC-04, DC-16 (REVIEW_2 § 2)
- Stato precedente: `castello` Invented (S-castello, bozza). REVIEW_2 proponeva di riassegnare a Invented Roccafringoli, Monte Nuncupale e Scerpure, perché il Cap. 4 (r. 85) li chiama «inventati». La definizione di `chora:Imagined` era «no hint at all about the position… located ‘somewhere’», ripresa in CLAUDE.md e in DM-01.
- Decisione (di Lorenzo, 9/10/2026):
  - **riassegnazioni respinte:** roccafringoli, monte_nuncupale, scerpure, casa_del_butiro e castel_porcano restano Imagined;
  - **castello → Imported:** S-castello ha valore `chora:Imported`, adottata, validata, motivazione referenziale sull'identificazione adottata A-0002 (Manzotti 2010, p. 293): il luogo testuale nomina in forma ellittica un luogo reale. `NarrativePlaces.tsv`: Reality_Status `imported`;
  - **definizione di Imagined** (di Lorenzo): «Luogo senza alcuna corrispondenza identificabile con un luogo attestato nella realtà, frutto dell'immaginazione d'autore. Può essere collocato nel mondo reale, se l'autore lo immagina in una certa posizione, ma nella realtà in quel punto non esiste.» Sostituisce la formula «no hint at all about the position / somewhere» nella `skos:definition` di `chora:Imagined` (en e it), in CLAUDE.md (invarianti) e in DM-01. Con la stessa definizione i cinque luoghi Imagined sono coerenti anche quando il testo li colloca (QP 107, 173).
  - Nello schema degli statuti la stessa formula compariva anche nello `skos:scopeNote` di Imagined e nel termine di confronto dello `scopeNote` di Invented: sostituita solo lì, perché la TBox non contraddicesse la definizione. Notazioni, ordine e definizioni degli altri statuti invariati.
- Da segnalare, non modificato: la descrizione del censimento di `castello` («Luogo narrativo immaginato, un castello nella zona tra Pavona e Frattocchie») non corrisponde più allo statuto né all'identificazione adottata.
- Motivazione (fonte, pagina): REVIEW_2 § 2; Manzotti 2010, p. 293; QP 279.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/NarrativePlaces.tsv` (castello), `Assertions.tsv` (S-castello); XLSX corrispondenti; `ontology/chora.ttl` r. 526–540 (Imagined: definizione en/it, scopeNote), `chora:Invented` scopeNote; `CLAUDE.md` (invarianti); `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DM-01, DC-04, DC-16).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.306 → **1.307** (definizione in due lingue); ABox 27.854 invariata; full 29.730 → **29.731**. Statuti: Imported **261**, Transformed 30, Invented **13**, Imagined 5. SHACL conforme, avvertenze 52 → **51**; IQ1–IQ17 a 0. Vista invariata (castello non ha tessera).

---

## D-062 — Difetti della TBox (TBOX_2): non applicabile, interpretazione, agenti, mapping (9 ottobre 2026)

- Requisito/i: R11, R22 · Ipotesi: — · Data check: DM-05 (TBOX_2 §§ 1, 2, 4)
- Stato precedente:
  - `chora:NotApplicable` aveva per esempio «an imagined place, located «somewhere»», e D-048 aveva assegnato «coordinata non applicabile» ai 5 luoghi Imagined in base allo statuto;
  - la definizione di `chora:SpatialInterpretation` diceva che l'interpretazione assegna lo statuto di realtà;
  - gli agenti erano solo `prov:Agent`, e studioso o annotatore si distinguevano solo dal namespace dell'IRI;
  - Assertions, Agents, Witnesses, i fogli delle partizioni e le colonne di localizzazione non erano documentati in `mapping.yaml`.
- Decisione (di Lorenzo, 9/10/2026):
  - **non applicabile:** tolto l'esempio dalla definizione. Il valore si assegna caso per caso e non deriva mai dallo statuto. Tolti i 5 valori derivati da D-048: **casa_del_butiro, castel_porcano, monte_nuncupale, roccafringoli, scerpure**. Restano senza stato, e lo stato **lo assegna Lorenzo**. Tutti e cinque hanno un ancoraggio relativo, quindi IQ14 resta a 0. I 12 «analisi non condotta» non derivano dallo statuto ma dall'assenza di ancore: invariati;
  - **SpatialInterpretation:** definizione corretta (en, it). L'interpretazione assegna ruolo, determinazione, relazione e ancoraggio; lo statuto sta sul luogo dalla v4.1.1 ed è dichiarato da un'asserzione di statuto;
  - **agenti:** dichiarata `prov:Person` (⊑ `prov:Agent`, `rdfs:isDefinedBy` PROV-O), nuove classi `chora:Scholar` e `chora:Annotator` (⊑ `prov:Person`). L'ETL scrive per ogni agente `a prov:Agent, prov:Person` e la classe del tipo (`Agent_Type`). I ruoli dell'attribuzione (Encoder, ReadingAuthor) restano distinti dal tipo di agente. Shape 20 (`AgentKindShape`): ogni persona è studioso o annotatore;
  - **mapping.yaml:** nuova sezione di primo livello `documentation`, non letta dall'ETL. Per Assertions, Agents, Witnesses, PartitionZones, PartitionMembers e per le colonne di localizzazione di NarrativePlaces dà colonna → proprietà, con rinvio alle righe di `tools/etl.py`. Il commento del blocco Assertions vi rimanda e include il tipo `route`.
- Alternative scartate: per gli agenti, un concetto SKOS `agentType` invece di due classi, scartato perché il tipo è una categoria dell'agente e PROV lo modella con classi (`prov:Person`); per il mapping, blocchi documentali dentro `mappings`, scartati perché `resolve_lookup` cerca le chiavi primarie in tutti i blocchi e un `NarrativePlace_ID` duplicato vi interferirebbe.
- Motivazione (fonte, pagina): TBOX_2 §§ 1, 2, 4; Cap. 4, R11.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` r. 662–685 (`prov:Person`, `chora:Scholar`, `chora:Annotator`), r. 788–795 (definizione di SpatialInterpretation), r. 1257–1263 (NotApplicable); `ontology/shapes/chora-shapes.ttl` r. 659–673 (shape 20); `tools/etl.py` r. 1131, 1153–1156; `data/source/mapping.yaml` r. 664–665 e r. 763–845 (sezione `documentation`); `data/source/tables/NarrativePlaces.tsv` (5 stati tolti), `NarrativePlaces.xlsx`; `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DM-05).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.307 → **1.320**; ABox 27.854 → **27.863** (+14 tipi degli agenti, −5 stati); full 29.731 → **29.753**. SHACL conforme, 51 avvertenze; IQ1–IQ17 a 0.

---

## D-063 — Etichetta di Milano (9 ottobre 2026)

- Requisito/i: R05 · Ipotesi: — · Data check: — (work order T-74; REVIEW_2 § 11)
- Stato precedente: l'etichetta normalizzata del luogo `milano` era «Milanno», una forma che nessuna occorrenza stampa. Le 6 occorrenze leggono «Milano», e D-059 le aveva registrate come forme attestate diverse dall'etichetta.
- Decisione (di Lorenzo, 9/10/2026): etichetta «Milano». Le 6 forme attestate «Milano» (ref_00152, ref_00164, ref_00213, ref_00296, ref_00407, ref_00408) coincidono ora con l'etichetta e sono tolte: la forma attestata si registra solo dove differisce (D-059). Forme attestate 178 → **172**.
- Motivazione (fonte, pagina): REVIEW_2 § 11; QP, occorrenze citate.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/NarrativePlaces.tsv` (milano), `References.tsv` (6 `Attested_Form`); XLSX corrispondenti.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.320 invariata; ABox 27.863 → **27.857**; full 29.753 → **29.747**. SHACL conforme, 51 avvertenze; IQ1–IQ17 a 0.

---

## D-064 — Percorsi dopo REVIEW_2: QP 297, 153, 93 (9 ottobre 2026)

- Requisito/i: R18 · Ipotesi: — · Data check: — (REVIEW_2 § 12)
- Stato precedente: le note delle asserzioni R-0001, R-0018 e R-0019 segnalavano tre anomalie. QP 297: l'ultimo nodo è un termine di paragone. QP 153: i nodi sarebbero invertiti rispetto alla direzione del viaggio. QP 93: il focalizzatore Liliana sarebbe sbagliato.
- Decisione (di Lorenzo, 9/10/2026):
  - **R-0001 (QP 297):** invariato;
  - **R-0018 (QP 153):** nodi nell'ordine di occorrenza nel testo. Nei dati lo sono già: Santo Stefano (1) e Tenenza (2), come nel passo («arrivò a Santo Stefano […] latore di un rapporto […] della Tenenza»). L'«inversione» di REVIEW_2 confrontava l'ordine con la direzione del viaggio, non con il testo;
  - **R-0019 (QP 93):** focalizzatrice del tragitto Liliana, come nel database. L'occorrenza del Mappamonno (QP 177, `interp_00508`) ha già il focalizzatore `mussolini`.
  Nessun dato cambia; si aggiornano solo le note delle tre asserzioni. I tipi proposti restano «bozza».
- Motivazione (fonte, pagina): REVIEW_2 § 12; QP 93, 153, 177, 297.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Assertions.tsv` (note di R-0001, R-0018, R-0019); `Assertions.xlsx`.
- Effetto su KG (triple prima/dopo, SHACL): invariato (TBox 1.320, ABox 27.857, full 29.747; cambiano tre letterali). SHACL conforme, 51 avvertenze.

---

## D-065 — Conferme senza modifiche: esclusioni, partizione, edicola (9 ottobre 2026)

- Requisito/i: R12, R20, R22 · Ipotesi: — · Data check: — (REVIEW_2 §§ 5, 6, 9)
- Decisione (di Lorenzo, 9/10/2026): tre conferme, nessun dato cambia.
  - **Esclusioni:** la figuralità delle occorrenze **non** entra in `docs/EXCLUSIONS.md` né nel database, nonostante il Cap. 4, r. 190, e così la logica simmetrica e l'annotazione assiologica. Sono trattate solo in tesi. Verificato: nessuno dei tre compare in EXCLUSIONS, nelle sorgenti dati, nella TBox o nelle shape. Chiude il punto lasciato aperto in D-056.
  - **Partizione città / campagna** (D-050): resta com'è, con criterio, 221 assegnazioni e 33 casi di confine non assegnati. P-0001 resta «bozza».
  - **Edicola, lettura del censimento** (C-edicola_due_santi): valore `chora:Invented` confermato (D-051).
- Motivazione (fonte, pagina): REVIEW_2 §§ 5, 6, 9.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `docs/DECISIONS.md` (questa voce); `CLAUDE.md` (prossimo numero).
- Effetto su KG (triple prima/dopo, SHACL): invariato (TBox 1.320, ABox 27.857, full 29.747). SHACL conforme, 51 avvertenze.

---

## D-066 — Estratti dei testimoni non di riferimento: facoltativi (9 ottobre 2026)

- Requisito/i: R01, R21 · Ipotesi: — · Data check: — (REVIEW_2 § 8)
- Stato precedente: lo shape dell'estratto (Warning) valeva per tutte le occorrenze. Le tre occorrenze di QPL e dtsFG senza estratto (ref_00725, ref_00726, ref_00727) davano 3 avvertenze. IQ6 era già ristretta al testimone di riferimento (D-055).
- Decisione (di Lorenzo, 9/10/2026): gli estratti di QPL e dtsFG non verranno forniti. Sono facoltativi, solo nel modello (provenienza delle letture), mai nell'interfaccia. L'estratto è obbligatorio solo per le occorrenze del testimone di riferimento:
  - nuovo shape `ReferenceExcerptShape`, **Violation**: un'occorrenza il cui testimone è testimone di riferimento di un'opera (`appearsInWitness / ^referenceWitness`) deve avere l'estratto. Provato togliendo l'estratto a `ref_00007`: non conforme;
  - in `PlaceReferenceShape` resta solo «al più un estratto»;
  - IQ6 invariata nella logica; commento aggiornato.
- Verifica: nessuna delle quattro occorrenze fuori da QP (ref_00724…ref_00727) compare nel GeoJSON o nei brani, in `data/dist/` né in `app/public/data/`. Le escludono i filtri di D-053 (adapter, `build_passages.py`, audit).
- Motivazione (fonte, pagina): REVIEW_2 § 8; NOTICE-EXCERPTS.md (estratti solo per capitolo, dal testo di riferimento).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/shapes/chora-shapes.ttl` (`PlaceReferenceShape`, nuovo `ReferenceExcerptShape`); `ontology/queries/integrity.rq` (commento di IQ6).
- Effetto su KG (triple prima/dopo, SHACL): dati invariati (TBox 1.320, ABox 27.857, full 29.747). SHACL conforme, avvertenze 51 → **48** (restano le motivazioni di statuto in bozza dei 48 luoghi non Imported); IQ1–IQ17 a 0.

---

## D-067 — Pattern HiCO: la lettura generata dall'atto interpretativo (9 ottobre 2026)

- Requisito/i: R07, R22 · Ipotesi: H8 · Data check: DM-05 (AUDIT_2b, B1, con le modifiche M1, M4 e le risposte 2, 3, 8, 14 e C5 di Lorenzo)
- Stato precedente: `chora:Assertion ⊑ prov:Entity, hico:InterpretationAct`. Tipo, criterio, fonte (letterale), pagina, motivazione, data e attribuzioni qualificate stavano tutti sulla lettura. L'interpretazione aveva solo attribuzioni qualificate.
- Decisione (di Lorenzo, 9/10/2026):
  - **lettura e atto:** `chora:Assertion ⊑ prov:Entity` soltanto. Ogni lettura (asserzione o interpretazione) è generata (`prov:wasGeneratedBy`) da un `hico:InterpretationAct` (`act/{id}`, ⊑ `prov:Activity`). L'atto porta `hico:hasInterpretationType` (i concetti di AssertionTypeScheme, ora anche `hico:InterpretationType`, più il nuovo `chora:SpatialReading` per le interpretazioni), `hico:hasInterpretationCriterion` (i tre concetti di RationaleTypeScheme, ora anche `hico:InterpretationCriterion`), `hico:isExtractedFrom` (la fonte), `chora:sourcePage`, `chora:rationale` (decisione 2: sull'atto) e le associazioni (`prov:qualifiedAssociation` con ruolo ReadingAuthor o Encoder, più `prov:wasAssociatedWith`). Sulla lettura restano soggetto, valore, `adoptedByProject`, `reviewStatus`, `prov:wasRevisionOf` e la forma breve `prov:wasAttributedTo` verso l'autore;
  - **due attività quando l'autore non è il codificatore (M1).** L'atto interpretativo è l'atto dello studioso: associazione ReadingAuthor, fonte, criterio, argomentazione, `dcterms:date` = anno della fonte (`xsd:gYear`, senza ora). La codifica è una `chora:EncodingActivity` distinta (`encoding/{id}`, ⊑ `prov:Activity`): associazione Encoder (Lorenzo), `prov:startedAtTime` = data della codifica, `prov:used` la fonte, `prov:wasInformedBy` l'atto.
    - **Forma scelta:** la lettura ha una sola generazione, l'atto dello studioso. La codifica non genera la lettura: ne dipende (`wasInformedBy`) e la si raggiunge da essa con `prov:wasGeneratedBy / ^prov:wasInformedBy`. Scartata un'attribuzione qualificata Encoder sulla lettura, perché duplicherebbe l'associazione della codifica.
    - **Autore e codificatore coincidenti** (Lorenzo): un atto solo, con le due associazioni, `dcterms:date` e `prov:startedAtTime` della codifica.
    - **Esito:** nessun atto di uno studioso ha una data del 2026. Per M-0002 e M-0005 (Lugnani, letto in Perosa 2023a) la data è quella della fonte da cui la lettura è tratta, il 2023;
  - **interpretazioni generate da un atto** (decisione 8): ognuna delle 961 ha `act/{interp}`, tipo `chora:SpatialReading`, autore e codificatore Lorenzo; `Annotation_Date` diventa la data dell'atto. Tolte dalle interpretazioni le attribuzioni qualificate e `prov:generatedAtTime`;
  - **fonti come risorse** (decisione 14, C5): nuovo `Sources.tsv` con 8 fonti (`chora:Source ⊑ frbr:Expression`), con la bibliografia del Cap. 4. Il «Censimento GaddAtlas» ha per autore Lorenzo e la data da compilare. `Source_Work` del foglio delle asserzioni contiene ora un `Source_ID` o un `Witness_ID`: le 44 celle vuote diventano `censimento_gaddatlas` (30) o `sabatino_cap4` (4); restano vuote le 10 «nessuna motivazione»;
  - **testimone come fonte (M4):** `chora:Witness ⊑ frbr:Expression` è imposto dal codominio di `hico:isExtractedFrom`, perché un testimone (QP) è fonte di letture. Per i testimoni unici (dattiloscritto, bozze) è un'approssimazione: sono piuttosto esemplari (FRBR Item, LRMoo F5). Lo dichiara uno `skos:editorialNote` della classe;
  - **tipo → proprietà:** ogni concetto-tipo dichiara `chora:reifiesProperty`. Nuove proprietà `chora:identifiedWith`, `chora:hasVariant`, `chora:memoryAttribution`, `chora:hasUncertaintyType`. L'ETL materializza per le letture adottate `hasRouteType` e `identifiedWith`; l'adapter legge ora le identificazioni adottate da `chora:identifiedWith`;
  - **HiCO senza owl:imports** (decisione 3): `hico:InterpretationAct`, `InterpretationType`, `InterpretationCriterion`, `hasInterpretationType`, `hasInterpretationCriterion`, `isExtractedFrom`, `frbr:Expression`, `prov:Activity` e `prov:Association` sono dichiarati in locale con `rdfs:isDefinedBy`;
  - **deprecate:** `chora:assertionType`, `chora:rationaleType`, `chora:sourceWork` (`owl:deprecated`, `historyNote`). Il dominio di `rationale` e `sourcePage` è ora l'atto.
- Shape e query: nuove `ReadingProvenanceShape` (una sola generazione da un atto; ReadingAuthor sull'atto; Encoder sull'atto o sulla codifica informata dall'atto) e `InterpretationActShape` (un tipo, al più un criterio, fonte `Source` o `Witness`). `AttributionShape` passa sulle associazioni. Tutte le shape e le query IQ12–IQ17 leggono il tipo con `prov:wasGeneratedBy / hico:hasInterpretationType`.
- Esito di C1: i 5 luoghi Imagined senza stato di localizzazione hanno tutti un'ancora (gaz_due_santi, gaz_castel_porziano, gaz_colli_albani, gaz_monte_manno, gaz_brahmaputra): nessuno stato, nessuna assegnazione. DATA_CHECKS DM-05 aggiornato.
- Alternative scartate: lettura ⊑ InterpretationAct (lo stato precedente: un'entità non è un'attività); un solo atto con la data della codifica anche per gli studiosi (M1); `owl:imports` di HiCO (dipendenza dalla rete, D-022).
- Motivazione (fonte, pagina): AUDIT_2b, B1; HiCO (Daquino e Tomasi 2015); PROV-O (qualified association, wasInformedBy).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (Assertion, `hico:InterpretationAct`, tre deprecazioni, `rationale`, `sourcePage`, Witness, tipi e criteri, sezione «Atto interpretativo e codifica» in coda, r. 1623–1718); `ontology/shapes/chora-shapes.ttl` (shape 7: ReadingProvenanceShape, InterpretationActShape, AttributionShape; cammino del tipo nelle shape 7–19); `ontology/queries/integrity.rq` (IQ12–IQ17); `tools/etl.py` r. 1028–1035 (interpretazioni), r. 1254–1351 (`process_sources`, `resolve_source`, `add_association`, `add_reading_provenance`), r. 1353–1452 (`process_assertions`, materializzazione); `tools/build_geojson.py` (`Q_ADOPTED_IDENTIFICATIONS`); `data/source/tables/Sources.tsv` (nuovo), `Assertions.tsv` (`Source_Work`); XLSX corrispondenti; `data/source/mapping.yaml` (documentazione Assertions, Sources); `data/README.md`; `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DM-05).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.320 → **1.422**; ABox 27.857 → **32.385**; full 29.747 → **34.377**. Atti interpretativi **1.058** (97 letture, 961 interpretazioni), codifiche distinte **15** (le letture degli studiosi), fonti 8. SHACL conforme, 48 avvertenze; IQ1–IQ17 a 0. GeoJSON: cambia solo `tripleCount`.

---

## D-068 — Statuto degli Imported generato dall'ETL (9 ottobre 2026)

- Requisito/i: R07, R22 · Ipotesi: — · Data check: DC-04 (AUDIT_2b, B2, con la modifica M3, le risposte 4 e 6 e C2)
- Stato precedente: 258 luoghi Imported avevano `hasRealityStatus` senza alcuna lettura attribuita (TBOX_2 § 6), per la regola di D-046 «un Imported non richiede un'asserzione». IQ13 controllava la coerenza solo dove una lettura c'era.
- Decisione (di Lorenzo, 9/10/2026, opzione b):
  - **generazione:** per ogni luogo Imported senza un'asserzione di statuto adottata in `Assertions.tsv`, l'ETL genera la lettura `assertion/S-auto-{luogo}` e il suo atto (`act/S-auto-{luogo}`): valore Imported, autore e codificatore Lorenzo (un atto solo, D-067), criterio ReferentialEvidence, adottata, validata, `rdfs:comment` «Lettura generata dall'ETL». La data è costante (decisione 4): `generated_readings_date` nelle costanti di `mapping.yaml`, 2026-10-09, perché il build resti deterministico. **I TSV non cambiano**;
  - **motivazione:** testo standard (`imported_standard_rationale`, ripetuto nello scopeNote di `chora:Imported`), più l'ancora primaria con la regola dell'adapter (D-038, D-045), cioè l'entità più frequente fra le ancore delle interpretazioni, oppure l'identificazione adottata, oppure l'ancora del luogo di cui è parte;
  - **fonte del repertorio (M3):** se l'ancora primaria ha un `owl:sameAs` esterno, la motivazione cita il repertorio. L'atto lo registra con `hico:isExtractedFrom` verso una `chora:Source` per repertorio (nuove righe `wikidata` e `geonames` in `Sources.tsv`) e con `chora:sourcePage` uguale all'identificatore esterno. Altrimenti la fonte è il Censimento e la motivazione dice «Fonte del repertorio non registrata». **Oggi: 0 su 258 hanno un identificatore esterno.** Nessuna delle 265 entità del gazetteer ha un `owl:sameAs` esterno (T-46);
  - **i 12 Imported senza ancora** (decisione 6): lettura generata con la motivazione «Nessuna ancora: analisi non condotta (D-048)»;
  - **revisione:** una riga esplicita sostituisce la generata. Se la riga rivede la generata (`Revision_Of = S-auto-{luogo}`), la generata esiste ma non è adottata;
  - **IQ13 riscritta su tutti i 309 luoghi:** ogni `hasRealityStatus` ha esattamente una lettura di statuto adottata, con lo stesso valore. Provata togliendo l'adozione a S-auto-colosseo e cambiando lo statuto di marino: 2 righe;
  - **StatusRationaleShape:** ora su tutti i luoghi, non più solo sui non Imported;
  - **scopeNote di `chora:Imported`:** tolta la regola «un Imported non richiede un'asserzione»; descrive la generazione;
  - **C2:** descrizione di `castello` in `NarrativePlaces.tsv`: «Luogo testuale della "stazione di Castello" (QP 279); identificazione adottata Castel Savello (Manzotti 2010, p. 293), concorrente Castel Gandolfo (LS)».
- Avvertenze: 48 → **50**. La shape copre ora anche gli Imported, e le due asserzioni esplicite di luoghi Imported (S-casal_bruciato, S-edicola_due_santi) sono ancora «bozza». Le 258 generate sono validate e non danno avvertenze.
- Motivazione (fonte, pagina): AUDIT_2b, B2; Cap. 4, R07 («statuto motivato per ogni assegnazione»).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `tools/etl.py` r. 1442–1516 (`primary_anchor`, `generate_imported_statuses`), r. 1741 (chiamata); `data/source/mapping.yaml` r. 25–29 (costanti); `data/source/tables/Sources.tsv` (wikidata, geonames), `NarrativePlaces.tsv` (castello); XLSX corrispondenti; `ontology/chora.ttl` (scopeNote di `chora:Imported`); `ontology/queries/integrity.rq` (IQ13); `ontology/shapes/chora-shapes.ttl` (shape 8); `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-04).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.422 invariata nel numero; ABox 32.385 → **38.588** (+258 letture con i loro atti, +2 fonti); full 34.377 → **40.580**. Letture di statuto 53 → **311** (309 adottate). SHACL conforme, 50 avvertenze; IQ1–IQ17 a 0. GeoJSON: cambia solo `tripleCount`.

---

## D-069 — Posizioni attribuite: LocationAssertion per Casal Bruciato (9 ottobre 2026)

- Requisito/i: R03, R10 · Ipotesi: H3 · Data check: DC-07 (AUDIT_2b, B3, con la risposta 13)
- Stato precedente: il concetto `chora:LocationAssertion` esisteva senza istanze. Le due posizioni di Casal Bruciato (TCI adottata, IGM alternativa, D-037) stavano solo nella prosa di `Authority_Source` di `gaz_casale_abbruciato`.
- Decisione (di Lorenzo, 9/10/2026: la LocationAssertion si tiene, per il riuso dell'ontologia):
  - **modello:** soggetto un'entità del gazetteer; valore una `geo:Geometry` (`geometry/{Assertion_ID}`) con `geo:asWKT` (`POINT(lon lat)`, `geo:wktLiteral`), `chora:repertory` (il repertorio datato, una `chora:Source`), `chora:precision` e `chora:datum`. Nuovo foglio `Locations.tsv` per la geometria; il resto della lettura sta in `Assertions.tsv` (pattern di D-067);
  - **primo e unico caso:** L-0001, TCI, *Italia centrale* I, carta 1:250.000: `POINT(12.583 41.7335)`, precisione ~1 km, **adottata**. L-0002, IGM, F. 150 III SO, 1:25.000: `POINT(12.5683 41.7168)`, precisione ~250 m, datum ED50, non adottata. Entrambe con autore Manzotti, codificatore Lorenzo, fonte Manzotti 2010, pp. 268–269, Tavv. VI–VII, validate. Gli atti hanno per data il 2010, le codifiche il 2026;
  - **repertori** in `Sources.tsv`: `tci_italia_centrale_1` (**data dell'edizione da compilare**: non è nei documenti del progetto) e `igm_150_iii_so` (1940, ultimo aggiornamento; rilievo 1872);
  - **coerenza:** la coordinata dell'entità resta quella del foglio; **IQ19** verifica che coincida con la posizione adottata (tolleranza 1e-6). Provata spostando la latitudine dell'entità: 1 riga. IQ12 garantisce già al più una posizione adottata per entità;
  - **Authority_Source** di `gaz_casale_abbruciato` ridotto a un rinvio a L-0001 e L-0002 (risposta 13).
- Controlli: shape 21 (`LocationAssertionShape`: soggetto GazetteerEntity, un valore `geo:Geometry` con un WKT e un repertorio); l'ETL rifiuta un WKT non `POINT(lon lat)`, un repertorio inesistente, una geometria senza la lettura corrispondente.
- Alternative scartate: derivare dall'adottata la coordinata dell'entità (due sorgenti per lo stesso dato); due colonne di geometria in `Assertions.tsv` (la geometria non entra in `Value`).
- Motivazione (fonte, pagina): Manzotti 2010, pp. 268–269, Tavv. VI–VII (pp. 300–301); D-037; Cap. 4, R03.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` r. 1720–1752 (sezione «Posizioni attribuite»); `ontology/shapes/chora-shapes.ttl` (prefisso `geo:`, shape 21 in coda); `ontology/queries/integrity.rq` (IQ19); `tools/etl.py` r. 1521–1547 (`process_locations`) e chiamata; `data/source/tables/Locations.tsv` (nuovo), `Assertions.tsv` (L-0001, L-0002), `Sources.tsv` (due repertori), `GazetteerEntities.tsv` (`Authority_Source` di gaz_casale_abbruciato); XLSX corrispondenti; `data/source/mapping.yaml` (documentazione Locations); `data/README.md`; conteggio delle integrity query in `CLAUDE.md`, `Makefile`, `README.md`; `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-07).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.422 → **1.444**; ABox 38.588 → **38.668**; full 40.580 → **40.682**. SHACL conforme, 50 avvertenze; IQ1–IQ17 e IQ19 a 0. GeoJSON: cambia solo `tripleCount`.

---

## D-070 — L'occorrenza come primitiva: fondamento, varianti, memoria, incertezza, interpretazioni sorelle (9 ottobre 2026)

- Requisito/i: R01, R04, R09, R22 · Ipotesi: H8 · Data check: — (AUDIT_2b, B4, con la modifica M2, le risposte 9 e 12, C3 e C4)
- Stato precedente: varianti, memoria e incertezze sul nome avevano per soggetto un luogo o un'interpretazione; nessuna lettura dichiarava le occorrenze su cui si fonda; le interpretazioni non avevano adozione né revisione.
- Decisione (di Lorenzo, 9/10/2026):
  - **fondamento:** nuova `chora:groundedIn` (Assertion → PlaceReference, ⊑ `cito:citesAsEvidence`, dichiarata in locale), sulla lettura. Colonna `Grounded_In` in `Assertions.tsv` per il fondamento esplicito; altrimenti default (`apply_default_grounding`): le occorrenze delle interpretazioni adottate sul luogo soggetto, ancorate all'entità soggetto, o portatrici del percorso soggetto. Nessun default per posizioni e partizioni (risposta 9), né per le letture che hanno per soggetto un'occorrenza. Espliciti: S-castello, A-0001, A-0002 e U-0002 su ref_00651 (QP 279, l'occorrenza della stazione: castello non ne ha di proprie); U-0003 su ref_00435; U-0006 su ref_00541; U-0008 su ref_00535, ref_00635, ref_00703. Le 258 letture generate di B2 seguono il default. Totale: **764** triple `groundedIn`;
  - **varianti:** soggetto = occorrenza di QP, valore = occorrenza dell'altro testimone, un valore per lettura. V-0001 (ref_00588 → ref_00724), V-0002 (ref_00436 → ref_00725). V-0003 e V-0004 si dividono secondo le corrispondenze confermate da Lorenzo (C3): **QPL 285 ↔ QP 16, QPL 293 ↔ QP 25**. V-0003a (ref_00007 → ref_00726), V-0003b (ref_00036 → ref_00727), V-0004a (ref_00008 → ref_00726), V-0004b (ref_00038 → ref_00727). Le varianti sono 6. L'ETL materializza `chora:hasVariant` per tutte, perché non sono letture alternative;
  - **memoria:** soggetto = occorrenza (M-0001…M-0003 su ref_00144, Dosso Faiti; M-0004…M-0006 su ref_00145, Monte Cengio). Motivo: la persistenza memoriale è un fenomeno del passo, letto dai critici, non dell'interpretazione del progetto. `memoryAttribution` si materializza solo per le letture adottate: oggi nessuna;
  - **incertezza, soggetto per asse:** nome → occorrenza (U-0004 su ref_00403, U-0007 su ref_00523); identificazione → luogo (U-0002, U-0003, U-0006, U-0008); geometria → entità del gazetteer (U-0001 su gaz_casale_abbruciato, U-0005 su gaz_edicola_due_santi);
  - **interpretazioni sorelle:** `chora:adoptedByProject` (dominio esteso: Assertion ∪ SpatialInterpretation) è **scritto su tutte le 961 interpretazioni, vero o falso** (M2): oggi tutte vere. Nuove colonne in `SpatialInterpretations.tsv`: `Adopted` (compilata «si» su ogni riga), `Reading_Author_ID` (vuoto = annotatore; se è uno studioso, atto e codifica sono distinti come in D-067), `Revision_Of` (`prov:wasRevisionOf`), `Source_ID`, `Source_Page`;
  - **unicità** (risposta 12): al più una interpretazione adottata per **occorrenza, luogo e focalizzatore**, verificata da **IQ20, avvertenza**. Restano 6 terne, descritte per la decisione di Lorenzo in `docs/alignment/TERNE_IQ20.md` (C4), ciascuna con un caso candidato:
    - ref_00028, via delle Oche: identificazione contesa, Milano o Bologna;
    - ref_00088, «tra Tevere e Biferno»: ancoraggio relazionale `between`;
    - ref_00271, via Nicotera: doppio ruolo;
    - ref_00404, Cassero: ancoraggio relazionale;
    - ref_00491, Aliciaro: ancoraggio relazionale o referenza plurale;
    - ref_00577, bivio Falcognana: ancoraggio relazionale.
  - **adapter:** legge solo le interpretazioni adottate. Il GeoJSON è identico salvo `tripleCount` (verificato sul contenuto).
- Shape e query:
  - **shape 22:** `UncertaintySubjectShape` (soggetto per asse), `GroundingShape`, `InterpretationAdoptionShape` (adozione esattamente una, booleana), `NonAdoptedInterpretationShape` (Warning: una non adottata è di uno studioso o rivista);
  - **`ReifiedTypeShape`** (SHACL-SPARQL): soggetto e valore compatibili con dominio, codominio o schema (`dcterms:references`) della proprietà reificata dal tipo. Esclude le letture superate, che possono riferirsi a risorse ritirate (C-casal_bruciato). Provata con due errori iniettati: 2 violazioni;
  - `VariantAssertionShape` e `MemoryAssertionShape` aggiornate;
  - **IQ16** estesa alle interpretazioni (stessa occorrenza e stesso luogo); **IQ18** (variante: soggetto nel testimone di riferimento, valore fuori); **IQ20**;
  - **audit:** «ogni variante collega due occorrenze dello stesso luogo» (sorgenti).
- **Tabella finale** (tipo, classe del soggetto, classe del valore, fondamento):

  | tipo | soggetto | valore | fondamento |
  |---|---|---|---|
  | StatusAssertion | NarrativePlace | RealityStatusScheme | occorrenze del luogo (default) o `Grounded_In` |
  | IdentificationAssertion | NarrativePlace | GazetteerEntity | occorrenze del luogo; castello: ref_00651 |
  | LocationAssertion | GazetteerEntity | geo:Geometry | nessun default (repertorio e fonte) |
  | PartitionAssertion | Partition | PartitionZone | nessuno (criterio) |
  | MemoryAssertion | PlaceReference | MemoryAttributionScheme | l'occorrenza soggetto |
  | UncertaintyAssertion, nome | PlaceReference | UncertaintyTypeScheme | l'occorrenza soggetto |
  | UncertaintyAssertion, identificazione | NarrativePlace | UncertaintyTypeScheme | `Grounded_In` o occorrenze del luogo |
  | UncertaintyAssertion, geometria | GazetteerEntity | UncertaintyTypeScheme | occorrenze ancorate all'entità |
  | VariantAssertion | PlaceReference (QP) | PlaceReference (altro testimone) | l'occorrenza soggetto |
  | RouteTypeAssertion | NarrativeRoute | RouteTypeScheme | occorrenze portatrici del percorso |
  | SpatialInterpretation (SpatialReading) | PlaceReference | NarrativePlace e qualificazioni | l'occorrenza interpretata |
- Motivazione (fonte, pagina): AUDIT_2b, B4; Cap. 4, § 4.3 (r. 87, 93) e R04.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (prefisso `cito:`, dominio di `adoptedByProject`, r. 1755–1770 sezione «L'occorrenza come primitiva»); `ontology/shapes/chora-shapes.ttl` (shape 13 e 15 per varianti e memoria, r. 746–836 shape 22, `sh:declare`); `ontology/queries/integrity.rq` (IQ16, IQ18, IQ20); `tools/etl.py` r. 1028–1050 (interpretazioni: autore, fonte, adozione, revisione), r. 1442–1449 (`Grounded_In`), r. 1546–1574 (`apply_default_grounding`), r. 1608–1625 (materializzazione); `tools/build_geojson.py` (`Q_INTERPRETATIONS`: solo adottate); `tools/audit_alignment.py` (controllo delle varianti); `data/source/tables/Assertions.tsv` (colonna `Grounded_In`; soggetti di memoria, incertezze, varianti; V-0003 e V-0004 divise), `SpatialInterpretations.tsv` (cinque colonne, `Adopted = si` su 961 righe); XLSX corrispondenti; `data/source/mapping.yaml` (documentazione); `docs/alignment/TERNE_IQ20.md` (nuovo); conteggio delle integrity query in `CLAUDE.md`, `Makefile`, `README.md`, `data/README.md`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.444 → **1.459**; ABox 38.668 → **40.459**; full 40.682 → **42.488**. Asserzioni 99 → **101** (varianti 4 → 6). SHACL conforme, 50 avvertenze, nessuna violazione; IQ1–IQ19 a 0, **IQ20 = 6** (avvertenza, terne note). Test dell'app 7/7.

---

## D-071 — Correzioni: Lugnani, due statuti validati, motivazione degli statuti generati (10 ottobre 2026)

- Requisito/i: R07, R22 · Ipotesi: — · Data check: — (decisioni di Lorenzo del 10/10, punto 1)
- Stato precedente: M-0002 e M-0005 (Lugnani) avevano per atto la data di Perosa 2023a (2023). S-casal_bruciato e S-edicola_due_santi erano «bozza» e davano 2 avvertenze. Le 258 letture di statuto generate dicevano «Fonte del repertorio non registrata».
- Decisione (di Lorenzo, 10/10/2026):
  - **a, Lugnani:** l'atto interpretativo è di Lugnani, con data **2001** (Lugnani, L., «Racconto ed esperienza umana del tempo», *The Edinburgh Journal of Gadda Studies*, 1, 2001). La lettura è estratta da Perosa 2023a (`hico:isExtractedFrom`), `sourcePage` «104, n. 97», nota «Lugnani 2001, cit. in Perosa 2023a, p. 104, n. 97». Lugnani 2001 entra in `Sources.tsv` come fonte citata di seconda mano, non letta direttamente. Nuova proprietà `chora:originalSource` (atto → Source) e colonna `Original_Source` in `Assertions.tsv`: l'atto prende la data dell'opera originale, mentre la fonte da cui la lettura è estratta resta `isExtractedFrom`;
  - **b:** S-casal_bruciato e S-edicola_due_santi sono **validate** (statuti decisi e motivati da Lorenzo in D-029, D-037 e D-031). Avvertenze 50 → **48**;
  - **c:** le letture generate con ancora dicono ora «Referente identificato nel gazetteer del progetto (GazetteerEntities), coordinate registrate» (246). Per le 12 senza ancora la motivazione resta «Nessuna ancora: analisi non condotta (D-048)», senza la frase sulle coordinate, che lì non sarebbe vera. Gli identificatori esterni sono rinviati: nota in T-46 del work order, nessuna modifica ora.
- Collaterale: l'ETL non legava i prefissi `hico:` e `cito:`, che nel TTL comparivano come `ns1:`. Aggiunti ai `namespaces` di `mapping.yaml`. Nessuna tripla cambia.
- Motivazione (fonte, pagina): Lugnani 2001, cit. in Perosa 2023a, p. 104, n. 97; D-029, D-031, D-037.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Sources.tsv` (lugnani_2001), `Assertions.tsv` (colonna `Original_Source`; M-0002, M-0005, S-casal_bruciato, S-edicola_due_santi); XLSX corrispondenti; `tools/etl.py` r. 1355–1363 (fonte originale), r. 1533–1537 (motivazione); `ontology/chora.ttl` (`chora:originalSource`, in coda); `data/source/mapping.yaml` (namespaces, documentazione Assertions); `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md` (T-46).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.459 → **1.465**; ABox 40.459 → **40.468**; full 42.488 → **42.503**. SHACL conforme, avvertenze 50 → **48**; IQ1–IQ19 a 0, IQ20 = 6 (avvertenza).

---

## D-072 — Terne di IQ20: cinque risolte, Cassero fermo, censimento delle menzioni multiple (10 ottobre 2026)

- Requisito/i: R04, R09 · Ipotesi: — · Data check: — (decisioni di Lorenzo del 10/10, punto 2; `docs/alignment/TERNE_IQ20.md`)
- Stato precedente: 6 terne (occorrenza, luogo, focalizzatore) con più interpretazioni adottate (IQ20 = 6, D-070).
- Decisione (di Lorenzo, 10/10/2026):
  - **a, ref_00028, via delle Oche (QP 22):** la via non è mai esistita a Milano: è la via bolognese della prostituzione, che Gadda trasla a Milano. Resta una sola interpretazione, interp_00029, ancorata a `gaz_bologna` (non c'è un'entità per la via); tolta interp_00028 (gaz_milano). Nuova **U-0009**: Discrepancy, asse geometria, origine documentaria, autore Lorenzo, validata, fondata su ref_00028, con la motivazione di Lorenzo. Il soggetto è `gaz_bologna`, cioè l'entità dell'ancora, per la regola dell'asse geometria (D-070); il luogo è indicato nella nota. Statuto del luogo invariato;
  - **b, ref_00088, «tra Tevere e Biferno» (QP 44):** una sola interpretazione, interp_00102, con due ancore (gaz_tevere, gaz_biferno) e relazione `between`. Resta in carta, come le interpretazioni con più ancore (D-028); tolta interp_00103;
  - **c, ref_00271, via Nicotera (QP 116):** le due menzioni sono due occorrenze. ref_00271 (prima menzione) resta con interp_00309 (marker); la nuova **ref_00730** («Sul marmo del cassettone, a via Nicotera, "fu rinvenuto"…», estratto fornito da Lorenzo) ha interp_00310 (setting);
  - **d, ref_00404, Cassero (QP 169): fermo.** Nel gazetteer non c'è un'entità per Sant'Ignazio presso Frattocchie; c'è solo `gaz_buco_a_santignazio`, a Roma, che è un altro luogo. Le due interpretazioni (gaz_frattocchie, gaz_pavona) restano finché Lorenzo non fornisce l'entità;
  - **e, ref_00491, Aliciaro (QP 200):** una sola interpretazione, interp_00584, ancora gaz_quattro_cantoni, ancoraggio relazionale adjacentTo verso gaz_san_carlo_alle_quattro_fontane; tolta interp_00585;
  - **f, ref_00577, bivio Falcognana (QP 239):** una sola interpretazione, interp_00699, ancora gaz_via_della_falcognana, ancoraggi relazionali `near` verso gaz_ponte_divino_amore e `above` verso gaz_ferrovia_roma_velletri; tolte interp_00700 e interp_00701.
  Per avere due tipi di relazione sulla stessa interpretazione, `Relational_Anchor_IDs` accetta ora `tipo:id` (es. `near:gaz_ponte_divino_amore|above:gaz_ferrovia_roma_velletri`). Un termine senza prefisso vale `Relational_Anchor_Type`. Il nodo è `relanchor/{interpretazione}-{tipo}`; gli IRI esistenti non cambiano.
- **Censimento di 2c:** 7 estratti in cui lo stesso toponimo compare due volte (ref_00148 Genova, ref_00150 scala B, ref_00151 Sacro Cuore, ref_00165 Padova, ref_00177 via Merulana, ref_00241 Santi Quattro, ref_00661 Grottaferrata), elencati in TERNE_IQ20.md per la decisione di Lorenzo. Nessun'altra coppia con stesso riferimento, luogo e focalizzatore ma ruolo diverso. Per questo **IQ20 resta un'avvertenza**: oggi vale 1 (Cassero).
- Verifica in carta: nessuno dei luoghi coinvolti è fuori carta. Fuori carta resta solo Robine Vecchie; feature 300 invariate; righe di rilievo 929 → **924** (5 interpretazioni tolte).
- Motivazione (fonte, pagina): QP 22, 44, 116, 169, 200, 239; Cap. 4, § 4.3 (r. 93).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/SpatialInterpretations.tsv` (5 righe tolte; interp_00102, 00310, 00584, 00699), `References.tsv` (ref_00271, nuova ref_00730), `Assertions.tsv` (U-0009); XLSX corrispondenti; `tools/etl.py` r. 962–999 (termini relazionali con tipo); `docs/alignment/TERNE_IQ20.md` (decisioni, Cassero, censimento).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.465 invariata; ABox 40.468 → **40.390**; full 42.503 → **42.425**. Interpretazioni 961 → **956**; occorrenze 729 → **730** (726 di QP). SHACL conforme, 48 avvertenze; IQ1–IQ19 a 0, **IQ20 = 1** (Cassero, avvertenza).

---

## D-073 — Sigle dei testimoni: QPL, QP, QPa (10 ottobre 2026)

- Requisito/i: R01 · Ipotesi: — · Data check: DM-04 (AUDIT_2b, T, con le decisioni di Lorenzo del 10/10, punto 3)
- Stato precedente: `witness/qp` era l'Adelphi 2018, testimone di riferimento delle 725 occorrenze. QP57 (princeps) e RR II erano due testimoni distinti. «Fattocchie» (ref_00724) era un'occorrenza di RR II. Nei campi dei dati «QP n» indicava l'Adelphi.
- Decisione (di Lorenzo, 10/10/2026), sigle del dataset **QPL, QP, QPa**:
  - **QPa** = Adelphi 2018, a cura di Pinotti: `id:witness/qpa`, `rdfs:label` «QPa», `skos:prefLabel` «QP (Adelphi 2018)»@it (colonna `Display_Label`), testimone di riferimento. Le **726** occorrenze annotate (725 più la nuova ref_00730 di D-072) e le **22** fonti delle letture passano a `qpa`. I brani portano `witnessLabel`, il `prefLabel` del testimone, e il pannello del testo lo mostra al posto dell'id («QP (Adelphi 2018) · A 241», prima «Adelphi, 2018 · A 241»). Nuovo test `app/test/passages.test.js`;
  - **QP** = versione in volume (1957): QP57 è fuso in un unico testimone, **`id:witness/qp`**, princeps Garzanti, 22 giugno 1957. Le derivazioni già scritte (← QPL, ← bzFG) restano su di esso. Non si crea un testimone «QP in RR II»: il progetto non lavora su quel testo;
  - **`witness/qp` cambia significato:** fino al 9/10/2026 era l'Adelphi, ora è la versione in volume. I documenti precedenti (TBOX_2, REVIEW_2, AUDIT_2b, D-052…D-070) lo usano nel vecchio senso. Il ramo non è pubblicato, quindi nessun IRI esterno si rompe;
  - **QPL** invariato, salvo l'edizione in cui è letto;
  - **RR II** esce da `Witnesses.tsv` ed entra in `Sources.tsv` (`source/rr2`, *Romanzi e racconti II*, Garzanti 1989). Nuove `chora:readIn` (Witness → Source) e `chora:pageRange`: QPL `readIn rr2`, pagine 277–460; QP `readIn rr2`, senza intervallo. Le pagine di QPL e di QP nelle occorrenze sono pagine di RR II;
  - **ref_00724** («Fattocchie») → testimone `qp`, `Source_Reference` «QP 219 (RR II)». **V-0001**: soggetto ref_00588 (QPa 241), valore ref_00724 (QP), motivazione «Fattocchie (QP, RR II 219) / Frattocchie (QPa 241): emendamento dell'editore»;
  - **«QP n» → «QPa n» nei campi dei dati**, riga per riga (**46** sostituzioni): **Assertions**: A-0001 (Rationale), A-0002 (Rationale), S-castello (Rationale), S-palazzo_219 (Rationale), S-palazzo_simonetti (Rationale), S-robine_vecchie (Rationale), U-0002 (Rationale), U-0003 (Rationale), U-0004 (Rationale), U-0006 (Rationale), U-0007 (Rationale), M-0001 (Rationale), M-0002 (Rationale), M-0003 (Rationale), M-0004 (Rationale), M-0005 (Rationale), M-0006 (Rationale), C-palazzo_simonetti (Rationale), V-0002 (Rationale), V-0003a (Rationale), V-0003a (Note), V-0003b (Rationale), V-0003b (Note), V-0004a (Rationale), V-0004a (Note), V-0004b (Rationale), V-0004b (Note), R-0002 (Note), R-0006 (Rationale), R-0010 (Note), U-0009 (Note); **NarrativePlaces**: casal_bruciato (Description, 2), castello (Description), edicola_due_santi (Description), palazzo_simonetti (Description), robine_vecchie (Localization_Reason); **SpatialInterpretations**: interp_00641 (Critical_Note), interp_00900 (Critical_Note), interp_00901 (Critical_Note), interp_00902 (Critical_Note), interp_00903 (Critical_Note); **References**: ref_00271 (Notes), ref_00724 (Notes), ref_00725 (Notes), ref_00730 (Notes). **Non sostituite**, perché stanno dentro citazioni letterali del Cap. 4 («…»), dove QP segue la convenzione della tesi: S-edicola_due_santi, S-monte_nuncupale, S-roccafringoli, S-scala_a, S-scerpure. Nei documenti (DECISIONS, REVIEW, AUDIT, work order, DATA_CHECKS, tesi) nessuna sostituzione. Aggiornate anche le note di `quer_pasticciaccio` (LiteraryWorks) e di `pinotti` (Agents);
  - **CLAUDE.md:** convenzione aggiunta (dataset QPL / QP / QPa; tesi QPL / QP di RR II / «QP (Adelphi 2018)»);
  - **derivazione QPa ← QP:** non scritta, perché manca la pagina della *Nota al testo* di Pinotti 2018.
- Motivazione (fonte, pagina): AUDIT_2b, T; Cap. 4, n. 4 (sigle); D-052.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Witnesses.tsv` (qp57 fuso in qp, qp → qpa, rr2 tolto; colonne `Display_Label`, `Read_In`, `Page_Range`), `Sources.tsv` (rr2), `References.tsv` (`Witness_ID` di 726 righe, ref_00724, note), `Assertions.tsv` (`Source_Work`, V-0001, motivazioni e note), `NarrativePlaces.tsv`, `SpatialInterpretations.tsv`, `LiteraryWorks.tsv`, `Agents.tsv`; XLSX corrispondenti; `tools/etl.py` r. 1128–1136 (`prefLabel`, `readIn`, `pageRange`), ordine fonti/testimoni; `tools/build_passages.py` (`witnessLabel`); `app/src/ui/text-panel.js` r. 100; `app/test/passages.test.js` (nuovo); `ontology/chora.ttl` (`readIn`, `pageRange`, in coda); `data/source/mapping.yaml` (LRMoo, documentazione Witnesses); `data/README.md`; `CLAUDE.md`.
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.465 → **1.473**; ABox 40.390 → **40.393**; full 42.425 → **42.436**. Testimoni 6 → **5**, fonti 13 → **14**. SHACL conforme, 48 avvertenze; IQ1–IQ19 a 0, IQ20 = 1 (avvertenza). Test dell'app 8/8.

---

## D-074 — Cassero rinviato alla fase 3 (10 ottobre 2026)

- Requisito/i: R04 · Ipotesi: — · Data check: DC-21 (TERNE_IQ20, ref_00404)
- Stato precedente: Cassero (ref_00404, QP 169) ha due interpretazioni dello stesso passo e focalizzatore (Santarella), ancorate a `gaz_frattocchie` e `gaz_pavona`. È l'unico caso residuo di IQ20 (D-072).
- Decisione (di Lorenzo, 10/10/2026): resta aperto e passa alla fase 3. Serve una fonte cartografica per l'entità di Sant'Ignazio presso le Frattocchie, a cui ancorare il Cassero («Cassero a Sant'Ignazio»). Restano le due interpretazioni attuali; IQ20 resta un'avvertenza con questo caso dichiarato.
- Registrato in DATA_CHECKS (DC-21, nuova voce, «aperto, fase 3»), nel work order (voci aperte della fase 3) e in TERNE_IQ20.md.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-21); `docs/alignment/TERNE_IQ20.md`.
- Effetto su KG: nessuno.

---

## D-075 — Menzioni multiple: tre occorrenze divise, quattro restano uniche (10 ottobre 2026)

- Requisito/i: R14, R21 · Ipotesi: — · Data check: DC-23 (TERNE_IQ20, censimento di D-072)
- Stato precedente: 7 estratti in cui lo stesso toponimo compare due volte (censimento di D-072), residuo della vecchia colonna «occurrences».
- Decisione (di Lorenzo, 10/10/2026): si dividono in due PlaceReference, ciascuna con il proprio estratto breve (la frase della menzione) e la propria interpretazione, solo tre casi:
  - **ref_00151, Sacro Cuore (QP 65):** ref_00151 «…era tornata dar Sacro Core, in quer momento.» con interp_00175 (marker, Luigia Zanchetti); nuova **ref_00731** «Sì, un po' prima della Gina, che annava ar Sacro Core alle otto.» con la nuova **interp_00965** (marker, stesso focalizzatore). Forma attestata «Sacro Core» su entrambe;
  - **ref_00177, via Merulana (QP 76):** ref_00177 «…tanto a via Merulana che giù, a Sante Stefene.» con interp_00205 (setting, narratore); nuova **ref_00732** «Orribile delitto a via Merulana,» gridavano li strilloni…» con la nuova **interp_00966**. **Ruolo proposto: marker**: nel titolo gridato dagli strilloni la via è nominata come riferimento del delitto, non come scena dell'azione. Focalizzatore: il narratore;
  - **ref_00241, Santi Quattro (QP 105):** una menzione per focalizzatore. ref_00241 «E poi co li Santi Quattro là vicino.» con interp_00276 (Liliana); nuova **ref_00733** «Che Liliana, Madonna! guai a sentimme dì de portalla via da li Santi Quattro!» con interp_00277 (Remo Balducci), spostata. Forma attestata «Santi Quattro» su entrambe.
  Restano uniche: Genova (QP 63), scala B (QP 63), Padova (QP 70), Grottaferrata (QP 284). Decisione annotata in TERNE_IQ20.md.
- **Da verificare:** gli estratti nuovi (ref_00731, ref_00732, ref_00733) e quelli accorciati (ref_00151, ref_00177, ref_00241) vengono dalla copia digitale e vanno verificati da Lorenzo sul volume a stampa: DATA_CHECKS DC-23 (nuova voce, che comprende anche ref_00730 di D-072).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/References.tsv` (ref_00151, ref_00177, ref_00241; nuove ref_00731, ref_00732, ref_00733), `SpatialInterpretations.tsv` (interp_00277 su ref_00733; nuove interp_00965, interp_00966); XLSX corrispondenti; `docs/alignment/TERNE_IQ20.md`; `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-23).
- Effetto su KG (triple prima/dopo, SHACL): ABox 40.393 → **40.472**; full 42.436 → **42.515**. Occorrenze 730 → **733** (729 di QPa); interpretazioni 956 → **958**; righe di rilievo 924 → **926**; feature 300 invariate. SHACL conforme, 48 avvertenze; IQ20 = 1.

---

## D-076 — Motivazioni di statuto in bozza rinviate alla fase 3 (10 ottobre 2026)

- Requisito/i: R07 · Ipotesi: — · Data check: DC-22 (REVIEW_2 § 1)
- Stato precedente: 48 luoghi non Imported hanno un'asserzione di statuto adottata ma «bozza» (T-33, D-046); 10 senza motivazione nei documenti. La parte D della fase 2 prevedeva di portare `StatusRationaleShape` a Violation dopo la validazione.
- Decisione (di Lorenzo, 10/10/2026): le motivazioni passano alla fase 3. `StatusRationaleShape` resta **Warning** (48 avvertenze), dichiarata come voce aperta in DATA_CHECKS (DC-22, nuova voce) e nel work order. Diventerà Violation quando Lorenzo avrà validato le bozze e compilato le 10 motivazioni mancanti.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-22).
- Effetto su KG: nessuno. SHACL conforme, 48 avvertenze.

---

## D-077 — Chiusura della fase 2: confronto visivo, stato dei dati, voci aperte (10 ottobre 2026)

- Requisito/i: — · Ipotesi: — · Data check: tutti quelli toccati in fase 2 (parte D)
- **Confronto visivo sui 10 stati** (stadi 1–5 × tutti/Pestalozzi, capitolo al massimo; `main` al tag `fase1-allineamento-cap4` contro il ramo, due server di sviluppo, `.playwright-mcp/vis/f2prima_*`, `f2dopo_*`, compositi `f2comp_*`). Pixel cambiati: stadio 1 0,04% / 0,01%; stadio 2 0,17% / 0,02%; stadio 3 0,57% / 0,09%; stadio 4 1,26% / 0,44%; stadio 5 2,65% / 2,15% (tutti / Pestalozzi).
  - **Rumore misurato:** due catture dello stesso build danno l'1,26% allo stadio 4 e l'1,02% allo stadio 5. La differenza dello stadio 4 è tutta rumore; allo stadio 5 resta circa 1,6 punti oltre il rumore.
  - **Differenze reali, tutte spiegate dai dati:** tessere della fascia della campagna (Robine Vecchie fuori carta, D-057; ancore di Casal Bruciato e del bivio, D-057 e D-072; Cassero), via delle Oche ancorata solo a Bologna (D-072), ranghi del diagramma radiale cambiati con le occorrenze (D-072, D-075), linee dei percorsi da 18 a 15 (D-060). Sequenza delle occorrenze: 930 → 925 passi (Pestalozzi 70). Nessun difetto di disegno.
- **Stato dei dati in CLAUDE.md:** `tripleCount` 42.515, `buildVersion` 4.3, ABox 40.472, TBox 1.473; statuti 261 · 30 · 13 · 5; 265 entità, 958 interpretazioni, 733 occorrenze (729 in QPa), 21 percorsi, 360 letture, 5 testimoni con le sigle QPL / QP / QPa (convenzione in «Invarianti», D-073), 14 fonti; 300 feature in carta, 1 fuori carta.
- **DATA_CHECKS v1.6:** stati aggiornati (DM-02, DM-03, DM-04, DC-01, DC-02, DC-05, DC-06, DC-08, DC-09, DC-11, DC-13, DC-14, DC-15) e nuova sezione D con le voci aperte per la fase 3: motivazioni di statuto (DC-22), Cassero (DC-21), estratti da verificare (DC-23), data della carta TCI, Nota al testo di Pinotti 2018, identificatori esterni (T-46), data del Censimento, letture degli studiosi dell'appendice A.
- **Work order:** fase 2 chiusa in § 11, voci aperte nella riga della fase 3; § 10 aggiornato (modello delle asserzioni, castello, annotatori, varianti del Palazzo degli ori).
- **Documentazione dell'ontologia** (`make docs`, rinviata a fine fase): rigenerata, con i nuovi schemi (tipi di asserzione, ruoli, testimoni, percorsi, incertezza e altri).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `CLAUDE.md` («Stato dei dati», titolo della sezione di allineamento); `docs/thesis/DATA_CHECKS_GaddAtlas.md`; `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md` (§ 10, § 11); `ontology/docs/` (derivati, `make docs`).
- Effetto su KG: nessuno (TBox 1.473, ABox 40.472, full 42.515). SHACL conforme, 48 avvertenze; IQ20 = 1.

---

## D-078 — Motivazioni di statuto validate così come sono (10 ottobre 2026)

- Requisito/i: R07 · Ipotesi: — · Data check: DC-22
- Decisione (di Lorenzo, 10/10/2026): 33 motivazioni in bozza sono validate senza modifiche (`Review_Status` = validata, nota «Validata da LS»): area_oltre_tevere, barbiere, camera_casello, cantinone_albano, casa_crocchiapani, casa_del_butiro, casello_km_20_25, cobianchi, gioielliere_catellani, grotta_de_sor_pippo, laboratorio_zamira, montagne_degli_equi, monte_circeo, orto_vigna_due_santi, palazzo_219, palazzo_simonetti, passaggio_livello_casal_bruciato, pensione_burgess, piani_alti_219, piccarozzi, ponte_divino_amore, porta_borgo_marino, pozzofondo, robine_vecchie, scala_a, scala_b, scale, stazione_carabinieri_castello, stazione_pavona, strada_di_campagna_celio, tenenza_carabinieri_marino, terzo_piano_219, tor_di_gheppio.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Assertions.tsv` (33 righe S-), `Assertions.xlsx`.
- Effetto su KG: cambia solo `reviewStatus` (vedi D-081 per i totali).

---

## D-079 — Motivazioni riscritte: quattro Imagined e via delle Oche (10 ottobre 2026)

- Requisito/i: R07 · Ipotesi: H1 · Data check: DC-22, DC-16
- Decisione (di Lorenzo, 10/10/2026): cinque motivazioni riscritte e validate. Le note «NB … permutazione» scompaiono con le riscritture:
  - **castel_porcano** (Imagined): «Luogo senza corrispondenza con un luogo attestato: il nome deforma Castelporziano, ma la festa notturna appartiene a uno spazio d'immaginazione d'autore.» Fonte Manzotti 2010, pp. 273, 276; lettura critica;
  - **monte_nuncupale** (Imagined): «Monte senza corrispondenza con un rilievo attestato; l'autore lo immagina a chiusura dell'orizzonte dei Colli Albani ("da Rocca Orsina al Monte Nuncupale, su", QPa 173).» Fonte QPa, p. 173; prova testuale;
  - **roccafringoli** (Imagined): «Paese senza corrispondenza con un luogo attestato; l'autore lo immagina sui monti presso Palestrina ("a monte Manno, quasi", QPa 107).» Fonte QPa, p. 107; prova testuale;
  - **scerpure** (Imagined): «Città senza corrispondenza con un luogo attestato; l'autore la immagina "sulle rive, più o meno, del nativo Brahmaputra" (QPa 141).» Fonte QPa, p. 141; prova testuale;
  - **via_delle_oche** (resta Invented): «Via reale di Bologna, nota via di prostituzione, che il testo traslata a Milano (QPa 22; U-0009).» Fonte QPa, p. 22; prova testuale.
  Autore e codificatore Lorenzo.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Assertions.tsv` (5 righe S-), `Assertions.xlsx`.
- Effetto su KG: vedi D-081.

---

## D-080 — Motivazioni nuove (10 ottobre 2026)

- Requisito/i: R07 · Ipotesi: — · Data check: DC-22
- Decisione (di Lorenzo, 10/10/2026): dieci motivazioni nuove, validate, autore e codificatore Lorenzo:
  - **palazzo_del_mappamondo** (Transformed): Palazzo Venezia, indicato per antonomasia dalla Sala del Mappamondo e deformato in «Mappamonno»; lettura critica;
  - **villino_lungotevere** (Invented): villino senza riscontro, collocato sul Lungotevere;
  - **bottega_ceccherelli** (Invented): bottega senza riscontro nei repertori;
  - **cassero** (Invented): toponimo senza riscontro, collocato «a Sant'Ignazio», fra le provenienze di QPa 169. L'entità di Sant'Ignazio resta aperta (DC-21; IQ20 = 1 invariato);
  - **casuccia_zamira** (Invented): segue lo statuto del laboratorio. **Luoghi del mondo della Zamira** (Is_Part_Of, descrizione, nome): laboratorio_zamira (Invented, parte di casuccia_zamira), casuccia_zamira (Invented), orto_vigna_due_santi (Invented, parte del laboratorio). Hanno tutti lo statuto del laboratorio: **nessun allineamento necessario**. edicola_due_santi nomina il laboratorio nella descrizione ma è Imported per decisione di Lorenzo (D-031, confermata in D-065): non allineata;
  - **colli_saluberrimi** (Transformed): perifrasi d'autore per i Colli Albani (ancora `gaz_colli_albani`);
  - **buco_a_santignazio** (Transformed): denominazione popolare del Buco a Sant'Ignazio, presso Sant'Ignazio a Roma (ancora `gaz_buco_a_santignazio`, 41,898 N 12,480 E);
  - **ca_francesi** (Transformed): località reale presso la stazione delle Frattocchie; Terzoli 2015, p. 512; lettura critica;
  - **ditta_ciurlani** (Transformed): origine onomastica di Ciurlani e gioco con «truffaldino», nessun elemento di collocazione; Terzoli 2015, lettura critica. **La pagina non è nei dati: da compilare (Lorenzo).** Il luogo ha già un'ancora (gaz_marino), quindi nessuno stato di localizzazione nuovo;
  - **ponte_di_santa_fumia** (Transformed): la strada dall'Anziate verso Casal Bruciato scavalca la ferrovia Roma–Velletri in località Ponte di Santa Fumia, con planimetria e toponimi delle cartine della Guida Touring 1925; Terzoli 2015, p. 911 (cfr. Terzoli 2008, pp. 109–113); prova referenziale.
  Nuove fonti: `terzoli_2008` (riferimento bibliografico completo da compilare: non è nella bibliografia del Cap. 4) e `tci_guida_1925`, la Guida d'Italia del 1925 con le due cartine (pp. 736–737, cart. 4; 758–759, cart. 1), volume da precisare. La Guida 1925 **non** è collegata alla carta TCI di Manzotti, la cui data resta aperta.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Assertions.tsv` (10 righe S-), `Sources.tsv` (2 righe); XLSX corrispondenti.
- Effetto su KG: vedi D-081.

---

## D-081 — StatusRationaleShape a Violation (10 ottobre 2026)

- Requisito/i: R07 · Ipotesi: — · Data check: DC-22
- Stato precedente: `StatusRationaleShape` era Warning, con 48 avvertenze (D-076).
- Decisione (di Lorenzo, 10/10/2026): con le 48 motivazioni validate (D-078, D-079, D-080), la shape diventa **Violation**. Esito: SHACL conforme **senza alcun risultato** (0 violazioni, 0 avvertenze). Provata riportando in memoria S-scala_b a «bozza»: non conforme. IQ20 resta un'avvertenza per il solo Cassero (IQ20 = 1).
- DATA_CHECKS DC-22 chiusa; work order aggiornato.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/shapes/chora-shapes.ttl` (shape 8: severità e commento); `docs/thesis/DATA_CHECKS_GaddAtlas.md`; `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md`; `CLAUDE.md` («Stato dei dati»).
- Effetto su KG (triple prima/dopo, D-078…D-081): TBox 1.473 invariata; ABox 40.472 → **40.507**; full 42.515 → **42.550**. Fonti 14 → 16. SHACL conforme, 0 risultati; IQ1–IQ19 a 0, IQ20 = 1.

---

## D-082 — Estratti delle occorrenze divise verificati (10 ottobre 2026)

- Requisito/i: R21 · Ipotesi: — · Data check: DC-23
- Decisione (di Lorenzo, 10/10/2026): gli estratti delle occorrenze divise (QPa 65, 76, 105, 116: ref_00151, ref_00731, ref_00177, ref_00732, ref_00241, ref_00733, ref_00271, ref_00730) sono verificati sul volume a stampa. Voce chiusa; nessun dato cambia.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-23).
- Effetto su KG: nessuno.

---

## D-083 — Data del Censimento GaddAtlas: non ancora compilata (10 ottobre 2026)

- Requisito/i: R22 · Ipotesi: — · Data check: —
- Decisione (di Lorenzo, 10/10/2026): compilare la data della fonte `censimento_gaddatlas` in `Sources.tsv`. Il messaggio riportava «[ANNO]», un segnaposto e non un valore: la data **non è stata inventata** e resta vuota. La voce resta aperta in DATA_CHECKS (§ D) e nel work order, finché Lorenzo non indica l'anno.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): nessuno nei dati; `docs/thesis/DATA_CHECKS_GaddAtlas.md`, work order.
- Effetto su KG: nessuno.

---

## D-084 — Nessun luogo annotato fuori dall'interfaccia (corregge D-057) (10 ottobre 2026)

- Requisito/i: R04, R11 · Ipotesi: — · Data check: — (AUDIT_3, blocco F; decisione 9 di Lorenzo)
- Stato precedente: D-057 toglieva da carta e rilievo un luogo interpretato senza ancora diretta e lo metteva in un elenco `offMap`. Robine Vecchie (ancoraggio relazionale Between, senza ancore) era assente dall'interfaccia, con stato «sospensione motivata».
- Decisione (di Lorenzo, 10/10/2026): «senza coordinate» non vuol dire «fuori dall'interfaccia». Transformed, Invented e Imagined compaiono nel Diagramma con il loro glifo, posizionati dalle ancore.
  - **Regola:** l'ancoraggio relazionale qualifica le ancore, non le sostituisce. **Quando l'interpretazione non ha un'ancora diretta**, i termini relazionali che sono entità del gazetteer diventano le sue ancore (`chora:anchorsToEntity`, scritte dall'ETL). Oggi l'unico caso è Robine Vecchie (gaz_frattocchie, gaz_due_santi, Between), che si posiziona come tevere_biferno. Aliciaro, bivio e Casal Bruciato, che hanno ancore dirette, non cambiano (decisione 9). Definizione di `chora:RelationalAnchoring` e commento della sezione riscritti; nota di correzione in D-057;
  - **Robine Vecchie:** tolti `SuspendedWithReason` e il motivo. L'incertezza sul nome resta in U-0004 e nelle letture di Terzoli (D-087);
  - **adapter:** tolti la regola `off_map`, l'elenco `offMap` del GeoJSON e la query che lo alimentava. Un luogo interpretato senza ancore fa fallire il build; `excludedUnanchored` vale sempre 0.
- **Controlli permanenti:**
  - (a) **IQ21** e shape 23 (`AnnotatedPlaceAnchorShape`, SHACL-SPARQL, **Violation**): ogni luogo con un'interpretazione adottata ha almeno un'ancora (diretta, ereditata con `isPartOf`, da identificazione adottata). Provata togliendo le ancore di Robine: non conforme;
  - (b) `audit_alignment.py`: ogni luogo annotato compare nel GeoJSON (tessera propria o tessera dell'ancora primaria), altrimenti `make audit` fallisce. Oggi 296 su 296;
  - (c) `audit_alignment.py`: nessun elenco `offMap` nel GeoJSON.
- App: nessun codice usava `offMap`.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (sezione «Ancoraggio relazionale», `chora:RelationalAnchoring`); `tools/etl.py` (termini relazionali come ancore); `tools/build_geojson.py` (regola `off_map` e `Q_OFF_MAP_INFO` tolte, controllo bloccante); `tools/audit_alignment.py` (controlli b, c); `ontology/queries/integrity.rq` (IQ21); `ontology/shapes/chora-shapes.ttl` (shape 23); `data/source/tables/NarrativePlaces.tsv` (Robine Vecchie), `NarrativePlaces.xlsx`; `docs/DECISIONS.md` (nota in D-057).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.473 invariata; ABox 40.507 invariata (+2 ancore, −2 triple di stato); full 42.550. Feature **300 → 301** (Robine Vecchie torna in carta); righe di rilievo 926 → **927**. SHACL conforme, 0 risultati; IQ21 = 0, IQ20 = 1.

---

## D-085 — Tre tipi di lettura per i loci critici; varianti di forma e di sostituzione (10 ottobre 2026)

- Requisito/i: R03, R05, R07 · Ipotesi: — · Data check: — (AUDIT_3, blocco A; decisioni 2 e 5)
- Decisione (di Lorenzo, 10/10/2026):
  - **A1, `chora:RepertoryAttestation`:** reifica `chora:attestedInRepertory` (GazetteerEntity → chora:Source). L'atto porta il locatore della carta in `chora:sourcePage`. Materializzata per tutte, perché le attestazioni non sono alternative;
  - **A2, `chora:NamingAssertion`:** reifica `chora:nameReading` (PlaceReference ∪ NarrativePlace → `chora:NamingMechanismScheme`: Paraetymology, Synecdoche, Paronomasia, IronicLowering, TypoHypothesis, OnomasticPun). Materializzata solo per le adottate. `chora:playsOn` (lettura → GazetteerEntity, facoltativa, colonna `Plays_On`);
  - **A3, `chora:CommentaryAssertion`:** commento attribuito, senza proprietà reificata e senza valore obbligatorio. `AssertionShape` ammette un valore assente solo per questo tipo; `ReifiedTypeShape` non lo tocca, perché vale solo per i tipi con `reifiesProperty`. Il soggetto può essere anche l'opera (decisione 4);
  - **A4, `chora:quotation`** (langString, sull'atto): l'estratto breve del critico, colonna `Quotation`;
  - **varianti** (decisione 2): `chora:variantKind` con due valori, `FormVariant` (stesso luogo, la regola di D-054) e `SubstitutionVariant` (luoghi diversi, ammessa e dichiarata). La colonna `Variant_Kind` (forma / sostituzione) è obbligatoria per le varianti: le 6 esistenti sono «forma». Il controllo dell'audit sullo stesso luogo vale solo per le varianti di forma;
  - **risposte** (decisione 5): `cito:disagreesWith` (lettura → lettura), colonna `Disagrees_With`; CiTO è dichiarato in locale.
  Nessuna di queste letture cambia posizione, ancore o visibilità dei luoghi.
- Controlli: shape 24 (`LociCriticiShape`: `playsOn` verso un'entità del gazetteer, `variantKind` nello schema e obbligatorio per le varianti, `disagreesWith` verso una lettura); `AssertionShape` aggiornata; l'ETL rifiuta un valore mancante fuori dai commenti e un `Variant_Kind` fuori dalle varianti.
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `ontology/chora.ttl` (tre tipi nello schema delle asserzioni, sezione «Loci critici» in coda); `ontology/shapes/chora-shapes.ttl` (prefisso `cito:`, `AssertionShape`, shape 24); `tools/etl.py` (tipi, colonne, quotation, materializzazione); `tools/audit_alignment.py` (regola dello stesso luogo solo per «forma»); `data/source/tables/Assertions.tsv` (quattro colonne; `Variant_Kind` = forma sulle 6 varianti); `Assertions.xlsx`; `data/source/mapping.yaml` (documentazione).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.473 → **1.612**; ABox 40.507 → **40.513**; full 42.550 → **42.695**. SHACL conforme, 0 risultati; IQ21 = 0, IQ20 = 1.

---

## D-086 — Fonti dei loci critici: le guide del Touring come volumi, carte come locatori (10 ottobre 2026)

- Requisito/i: R03 · Ipotesi: — · Data check: DC-03 (AUDIT_3, blocco B; decisioni 10 e 13)
- Decisione (di Lorenzo, 10/10/2026):
  - **una fonte per volume, le carte come locatori** (`chora:sourcePage` dell'atto, o della geometria con la nuova colonna `Repertory_Locator` di `Locations.tsv`). Il dominio di `chora:sourcePage` si estende a `geo:Geometry`;
  - **bertarelli_1924**: Bertarelli, L. V. (1924), *Italia centrale*, vol. I (Guida d'Italia del TCI). Cartine «Colli laziali, Monti Lepini ed Ernici (Roma, Frosinone)», tra pp. 480–481 (Terzoli CART. 2); «Sabina meridionale, Monti Tiburtini, Prenestini e Carseolani», tra pp. 456–457 (CART. 3). **Assorbe `tci_italia_centrale_1`**: la carta di Manzotti per Casal Bruciato (L-0001) è la CART. 2 del 1924 (conferma: Terzoli 2015, p. 766, «C. Abbruciato» sulla cartina del 1924). La geometria di L-0001 ha ora repertorio `bertarelli_1924`, locatore «cart. 2, tra pp. 480–481». **La voce «data della carta TCI» si chiude**;
  - **bertarelli_1925**: Bertarelli, L. V. (1925), *Roma e dintorni* = *Italia centrale*, vol. IV. Cartine «Roma e dintorni», tra pp. 736–737 (CART. 4); «Colli Albani», tra pp. 758–759 (CART. 1). **Assorbe `tci_guida_1925`**. «TCI, Italia centrale IV, p. 761» di Manzotti 2010 (pp. 239–240) rinvia a questo volume;
  - **DC-03** (edicola, Manzotti 2010, p. 246): la CART. 1 del 1925 è annotata come candidata (Terzoli 2015, p. 419); la voce resta aperta;
  - **terzoli_2008**: anno 2008, nota «Terzoli 2015 lo cita come 2007 (p. 419) e 2008 (p. 911), stesse pp. 109–113: anno da verificare»;
  - **italia_2020** (dalla bibliografia del Cap. 4) e **glm_1997a**: Grassadonia, F., Lagossi, P., & Marchetti, M. (a cura di) (1997a), *Quer pasticciaccio brutto de via Merulana. Strumenti per la lettura* (2 voll.), Garzanti Scuola. Citati di seconda mano in Terzoli 2015, pp. 535–537 (`chora:originalSource`); vale anche per «G.L.M., Commento» citato da Manzotti 2010. **Voce chiusa**;
  - **Censimento GaddAtlas**: data 2026, autore Lorenzo Sabatino. **Voce chiusa**;
  - **agenti nuovi**: terzoli (Maria Antonietta Terzoli), italia (Paola Italia), grassadonia (Fabio Grassadonia), lagossi (Paola Lagossi), marchetti (Mario Marchetti).
- Fase in cui è maturata: revisione critica
- File toccati (manifest): `data/source/tables/Sources.tsv` (2 fonti fuse e rinominate, 2 nuove, 2 corrette), `Locations.tsv` (`Repertory_ID`, colonna `Repertory_Locator`), `Agents.tsv` (5 righe); XLSX corrispondenti; `tools/etl.py` (`Repertory_Locator`); `ontology/chora.ttl` (dominio di `chora:sourcePage`); `data/source/mapping.yaml` (documentazione Locations); `docs/thesis/DATA_CHECKS_GaddAtlas.md` (DC-03).
- Effetto su KG (triple prima/dopo, SHACL): TBox 1.612 → **1.618**; ABox 40.513 → **40.553**; full 42.695 → **42.741**. Fonti 16 → **18**, agenti 7 → **12**. SHACL conforme, 0 risultati; IQ21 = 0, IQ20 = 1.

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
