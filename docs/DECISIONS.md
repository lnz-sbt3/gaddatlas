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
