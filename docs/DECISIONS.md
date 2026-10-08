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

## D-018 — Build deterministico (8 ottobre 2026)

- Requisito/i: — (invariante «algoritmi deterministici», work order § 1) · Ipotesi: — · Data check: —
- Stato precedente: due build consecutivi dalle stesse sorgenti producevano derivati diversi. (1) In `tools/build_geojson.py` i 48 tasselli propri erano ordinati solo per `planeCount`; i pareggi seguivano l'iterazione di un `set`, quindi l'hash randomizzato di Python, e l'ordine delle feature del GeoJSON cambiava a ogni build (contenuto per id identico). (2) `tools/etl.py` serializzava TBox e grafo completo con i nodi anonimi di rdflib, che hanno id casuali: due serializzazioni equivalenti si alternavano anche a seed fisso. Il controllo della CI «derivati = build» poteva quindi fallire a caso, e ogni commit portava un diff rumoroso.
- Decisione: chiave di ordinamento `(-planeCount, id)` per i tasselli propri; serializzazione di TBox e grafo completo dopo `rdflib.compare.to_canonical_graph` (funzione `canonical()` in `etl.py`). Scartato `PYTHONHASHSEED` fisso nel Makefile: provato, non basta, perché gli id dei nodi anonimi sono casuali indipendentemente dal seed.
- Motivazione (fonte, pagina): verifica sperimentale (8/10/2026): GeoJSON diverso fra seed diversi prima della correzione, identico dopo; `chora.ttl` alternava due varianti dei nodi `schema:name` dei contributori anche con `PYTHONHASHSEED=1`. Dopo la correzione tre `make all` con seed diversi danno derivati identici byte per byte.
- Integrazione (8/10/2026, durante T-80): dopo T-81 `chora.rdf` è generato dall'ETL, e il serializzatore RDF/XML di rdflib, a differenza di quello Turtle, non ordina i soggetti: l'ordine seguiva l'iterazione dello store in memoria, dipendente dall'hash. `canonical()` restituisce ora un `_SortedGraph`, che itera le triple in ordine (`tools/etl.py:1226-1236`). Verificato con tre seed diversi: tutti i derivati identici; `chora.rdf` isomorfo (588 triple).
- Fase in cui è maturata: revisione critica (audit di fase 1, passo 0)
- File toccati (manifest): `tools/build_geojson.py:703-706`; `tools/etl.py:36`, `:1226-1239` (nuova `canonical()`), `:1329`, `:1351`; derivati rigenerati (`data/dist/gaddatlas.geojson`, `data/dist/gaddatlas-full.ttl`).
- Effetto su KG (triple prima/dopo, SHACL): nessuno. ABox 16.045 → 16.045; full 17.203 → 17.203, isomorfo; `chora.ttl` invariata (588); SHACL conforme, 0 violazioni. L'ordine delle feature fittizie del GeoJSON cambia rispetto alla versione precedente, che era a sua volta casuale: il confronto visivo con il notebook va rifatto al porting. Il grafo completo contiene ancora i `file:///` dei `sameAs` (ora con il percorso di questa macchina): li elimina D-017 (T-82).

---

## D-016 — `chora.ttl` è la sorgente canonica della TBox (8 ottobre 2026)

- Requisito/i: — (infrastruttura; aggiorna D-002 e D-005) · Ipotesi: — · Data check: — (work order T-81; AUDIT_0, premessa 1)
- Stato precedente: la sorgente era `ontology/chora.rdf` (RDF/XML salvato da Protégé); `tools/etl.py` la leggeva e riserializzava `chora.ttl` a ogni build. Le patch alla TBox in Turtle sparivano quindi al build successivo, mentre `CLAUDE.md` indicava già `chora.ttl` come file modificabile.
- Decisione: la catena si inverte. `chora.ttl` è la sorgente, curata in Turtle (diff leggibili, patch chirurgiche); `chora.rdf` è un derivato in RDF/XML, rigenerato dall'ETL per chi apre l'ontologia in Protégé. Chi lavora in Protégé salva su `chora.ttl`. Scartata l'alternativa di continuare in Protégé con una specifica applicata a mano (work order § 4, opzione a): rende impossibili review e patch puntuali. Decisione di Lorenzo dell'8/10/2026.
- Motivazione (fonte, pagina): prima dell'inversione `chora.rdf` e `chora.ttl` sono stati verificati isomorfi (`rdflib.compare.isomorphic`, 588 triple ciascuno, 0 differenze); dopo, il `chora.rdf` rigenerato è isomorfo a quello precedente. Il passaggio non cambia il contenuto dell'ontologia, solo la direzione della derivazione.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `tools/etl.py:1268-1270`, `:1274-1276` (default e help degli argomenti), `:1310-1313` (commento), `:1321` (lettura in Turtle), `:1330` (scrittura in RDF/XML); `Makefile:24-26`, `:32-33`; `README.md:37-38`, `:62`, `:68`; `ontology/README.md:71-72`; `data/README.md:16`; `CLAUDE.md:49-51`. Derivato rigenerato: `ontology/chora.rdf` (serializzazione rdflib al posto di quella di Protégé: i commenti XML di Protégé non ci sono più).
- Effetto su KG (triple prima/dopo, SHACL): TBox 588 → 588; ABox 16.045 → 16.045; full 17.203 → 17.203; `chora.ttl` e `data/dist/` identici byte per byte; SHACL conforme, 0 violazioni; 22 query eseguite, IQ9 = 14 come prima. **Ambiente:** durante il task `pip install pylode` ha aggiornato in `dh_env` rdflib (7.6.0), pyshacl (0.40.1), owlrl e altre dipendenze; le versioni precedenti non sono state registrate. Con le nuove versioni i derivati sono identici, salvo la serializzazione RDF/XML di `chora.rdf`, che resta isomorfa. Su decisione di Lorenzo si tengono le versioni attuali, le stesse che la CI installa senza versione fissa. **Rinviato:** `make docs` (pyLODE 3.6.0 ha una dipendenza rotta, `kurra`); la documentazione si rigenera alla fine della fase 1, dopo T-04.

---

## D-015 — I TSV sono la sorgente canonica dei dati (8 ottobre 2026)

- Requisito/i: — (infrastruttura; aggiorna D-002) · Ipotesi: — · Data check: — (work order T-80; AUDIT_0, premessa 2)
- Stato precedente: la documentazione indicava come sorgente gli XLSX di `data/source/xlsx/`, ma l'ETL legge i TSV di `data/source/tables/` (`Makefile`, target `rdf`). La conversione `tools/xlsx_to_tsv.py` era manuale e fuori dal Makefile: una modifica fatta in Excel e non riconvertita veniva ignorata in silenzio. All'audit XLSX e TSV coincidevano (0 differenze di valore).
- Decisione: i TSV sono la sorgente canonica, diffabile e revisionabile in git. Gli XLSX diventano un derivato per chi lavora in Excel e si rigenerano con `make xlsx` (`tools/tsv_to_xlsx.py`, nuovo). `tools/xlsx_to_tsv.py` resta solo per riportare nei TSV una modifica fatta in Excel, con un avviso: sovrascrive il TSV. Scartata l'alternativa di tenere gli XLSX come sorgente e mettere la conversione nel Makefile: gli XLSX sono binari, non diffabili, e la conversione altera i decimali (v. sotto). Decisione di Lorenzo dell'8/10/2026.
- Motivazione (fonte, pagina): giro TSV → XLSX → TSV verificato byte per byte su tutti e sette i fogli. In `tsv_to_xlsx.py` diventano numeri solo gli interi; i decimali restano testo, perché openpyxl li scrive con 16 cifre significative e le coordinate perderebbero l'ultima cifra al ritorno (es. 12.563362579004666 → 12.56336257900467), mentre «1.0» di `Confidence` tornerebbe «1».
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `tools/tsv_to_xlsx.py` (nuovo, 1-69); `tools/xlsx_to_tsv.py:5-9` (avviso); `Makefile:1`, `:15` (help), `:25-30` (target `xlsx`); `README.md:45-46`, `:61-63`, `:66`; `data/README.md:11`, `:17-21`; `CLAUDE.md:49-50`. Rigenerati con `make xlsx`: i sette `data/source/xlsx/*.xlsx`. Cambiano nome del foglio (ora quello del file, prima talvolta «Sheet1»); `GazetteerEntities.xlsx` perde quattro colonne finali senza intestazione e vuote, che la conversione già scartava.
- Effetto su KG (triple prima/dopo, SHACL): nessuno, i TSV non cambiano. ABox 16.045, full 17.203; SHACL conforme, 0 violazioni. Nota: openpyxl scrive data e ora nei metadati degli XLSX, quindi ogni `make xlsx` produce binari diversi anche a dati invariati. `make xlsx` non fa parte di `make all` e la CI non confronta gli XLSX.

---

## D-017 — `owl:sameAs` con IRI assoluti; controllo sugli IRI del grafo (8 ottobre 2026)

- Requisito/i: R10, R22 (premessa tecnica) · Ipotesi: — · Data check: DC-17, DC-10 (work order T-82; AUDIT_0, premessa 7). Aggiorna D-009 (§ 3) e D-011.
- Stato precedente: `tools/etl.py` costruiva `URIRef(same_as)` sul valore della colonna `sameAs` di `GazetteerEntities.tsv`, che contiene id di altre GazetteerEntity (`gaz_castello`), non URI. Ne uscivano IRI relativi in `data/gaddatlas.ttl` (`<gaz_castello>`), che al parsing del grafo completo diventavano `file:///<percorso della macchina di build>/data/gaz_…`. D-009 dichiarava chiuso il difetto, ma la correzione era stata applicata al derivato (`tools/migrate_namespace.py`) e non alla causa: al build successivo era tornato, con il percorso di desktop di chi aveva lanciato la build. Nessun controllo lo intercettava (IQ3 non guarda `owl:sameAs`).
- Decisione: un id senza schema si risolve nel namespace del gazetteer con la stessa funzione che costruisce gli URI delle entità (`resolve_lookup(…, '@GazetteerEntity_ID')`); un valore con schema `http(s)://` resta com'è (link esterno, come previsto dal commento di `mapping.yaml:320`). Il numero delle coppie non cambia (3 coppie, 6 triple). La sostituzione dei `sameAs` con identificazioni attribuite resta T-31 (DM-06). Nuovo controllo in `tools/audit_alignment.py`: fallisce se un IRI dell'ABox o del grafo completo non ha schema `http(s)`, o se un IRI dei namespace del progetto è in `http` invece che in `https`. La formulazione letterale del work order («ogni IRI comincia con `https://`») fallirebbe sui vocabolari W3C, che sono `http://www.w3.org/…` per definizione: il controllo è stato riformulato così.
- Motivazione (fonte, pagina): AUDIT_0, premessa 7. Prova del controllo: sui derivati precedenti segnala esattamente i 6 IRI `file:///…`; dopo la correzione passa.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `tools/etl.py:672-677` (commento), `:680-686` (risoluzione); `tools/audit_alignment.py:20`, `:28-29` (`PROJECT_NS_HTTP`), `:144-168` (controllo). Derivati rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.045 → 16.045; full 17.203 → 17.203. I 6 `owl:sameAs` puntano ora a `https://w3id.org/gaddatlas/id/gazetteer/…`; il grafo completo non contiene più percorsi locali. SHACL conforme, 0 violazioni; query senza errori. **Effetto collaterale:** il GeoJSON e `atlas.slim.json` cambiano solo nell'ordine delle feature referenziali (contenuto identico per id; relief, paths e meta identici), perché la query SPARQL di `build_geojson.py` non ha `ORDER BY` e l'ordine dei risultati segue il grafo. È deterministico (D-018) ma si sposterà a ogni cambiamento dei dati: da valutare prima del porting, perché il prototipo usa l'indice come criterio di pareggio. Dopo questa voce, D-011 conta due fonti di alias corrette (grafo e notebook), non più una rotta.

---

## D-019 — `app/public/data/` si pubblica dai derivati (8 ottobre 2026)

- Requisito/i: R21 (gli estratti pubblicati sono quelli verificati) · Ipotesi: — · Data check: — (work order T-83; AUDIT_0, premessa 10)
- Stato precedente: l'interfaccia carica i dati da `app/public/data/`, ma nessun target del Makefile ci copiava i derivati: la copia si faceva a mano. Il GeoJSON versionato lì differiva da `data/dist/` (ordine delle feature, `meta.excerptsIncluded: true` contro `false`; contenuto per id identico). I passages coincidevano, ma nel working tree erano in CRLF. Una correzione dei dati (per esempio T-01) non sarebbe arrivata all'app.
- Decisione: nuovo target `make publish-data`, incluso in `make all` prima di `audit`, che copia `data/dist/gaddatlas.geojson` e `data/dist/passages/*.json` in `app/public/data/`. `roma.geojson` resta fuori: ha sorgente propria (`data/source/roma.geojson`, già identica). `audit_alignment.py` fallisce se una delle 12 copie non coincide byte per byte con il derivato. La CI esegue anche `publish-data` e include `app/public/data` nel confronto «derivati = build».
- Motivazione (fonte, pagina): AUDIT_0, premessa 10. Prova del controllo: sullo stato precedente segnala 12/12 file non allineati; dopo `make all` passa (12/12).
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `Makefile:1`, `:5`, `:11` (help), `:22` (`all`), `:57-64` (target); `tools/audit_alignment.py:26` (`APP_DATA`), `:170-184` (controllo); `.github/workflows/data.yml:22`, `:37`, `:40`. Copia rigenerata: `app/public/data/gaddatlas.geojson`; i passages non cambiano contenuto.
- Effetto su KG (triple prima/dopo, SHACL): nessuno. ABox 16.045, full 17.203; SHACL conforme, 0 violazioni.

---

## D-020 — «Fattocchie» → «Frattocchie» nell'estratto di QP 241 (8 ottobre 2026)

- Requisito/i: R21 (evidenza testuale stabile e verificabile), R01 · Ipotesi: — · Data check: DC-01 (work order T-01)
- Stato precedente: l'estratto di `ref_00588` (QP 241, cap. IX) leggeva «su su su fu fu fu da 'e Fattocchie», lezione della copia digitale Adelphi da cui è stato condotto il censimento. Il luogo (`frattocchie`) e l'ancoraggio (`gaz_frattocchie`) erano già corretti: l'errore stava solo nel testo dell'estratto.
- Decisione: l'estratto segue il volume a stampa, «Frattocchie». È una correzione di trascrizione verso il testo di riferimento, non un'emendazione del progetto: l'emendazione è dell'editore. «Fattocchie» resta una lezione di RR II (p. 219, stampa Garzanti), da registrare come variante di testimone con il modello di T-41, insieme alla lettura di Terzoli (2015, p. 771: «se non è refuso, rafforza l'onomatopea precedente») e all'emendazione di Pinotti (QP 241; Italia 2020, pp. 101–102): fase 2–3.
- Motivazione (fonte, pagina): verifica di LS sul volume a stampa (6/10/2026): Pinotti emenda «Fattocchie» (RR II 219) in «Frattocchie» (QP 241). Cap. 4, § 4.3 e n. 23.
- Fase in cui è maturata: analisi del testo
- File toccati (manifest): `data/source/tables/References.tsv:589`; `data/source/xlsx/References.xlsx` (rigenerato). Derivati: `data/gaddatlas.ttl`, `data/dist/gaddatlas-full.ttl`, `data/dist/passages/ch09.json`, `app/public/data/passages/ch09.json`.
- Effetto su KG (triple prima/dopo, SHACL): cambia solo un letterale. ABox 16.045 → 16.045; full 17.203 → 17.203; SHACL conforme, 0 violazioni. Nessuna occorrenza di «Fattocchie» resta nei dati o nell'app: compare solo nei documenti che ne discutono (Cap. 4, work order, registro, AUDIT_0, `CLAUDE.md`). Il controllo a campione delle altre lezioni sul cartaceo resta T-12 / T-56.

---

## D-021 — Metadati della redazione in «Letteratura» (8 ottobre 2026)

- Requisito/i: R01 (testimone e redazione) · Ipotesi: H2 · Data check: DC-05 (work order T-40, parte di fase 1)
- Stato precedente: `work/quer_pasticciaccio_letteratura`, nota: «Prima pubblicazione in 5 tratti sulla rivista Letteratura, dal 1946 al 1948». L'arco 1946–1948 è errato: le puntate escono tutte nel 1946.
- Decisione: nota corretta in «Prima pubblicazione in cinque puntate sulla rivista «Letteratura», fascicoli 26, 27, 28, 29 e 31 del 1946 (Pinotti 2016, p. 200, n. 4)». Il resto della riga è invariato. La separazione fra opera e testimoni (QPL, dtsFG, bzFG, QP57, QP) resta T-40, `DA DECIDERE` (fase 2).
- Motivazione (fonte, pagina): Pinotti 2016, p. 200, n. 4; Pinotti 2024, § 7.2; Cap. 4, § 4.2 (r. 41): fascicoli 26, 27, 28, 29 e 31 del 1946, con la sola omissione del n. 30.
- Fase in cui è maturata: analisi del testo (revisione della bibliografia per il Cap. 4)
- File toccati (manifest): `data/source/tables/LiteraryWorks.tsv:3` (colonna `Notes`); `data/source/xlsx/LiteraryWorks.xlsx` (rigenerato). Derivati: `data/gaddatlas.ttl`, `data/dist/gaddatlas-full.ttl`.
- Effetto su KG (triple prima/dopo, SHACL): cambia solo il letterale `rdfs:comment` dell'opera. ABox 16.045 → 16.045; full 17.203 → 17.203; SHACL conforme, 0 violazioni.

---

## D-022 — Sei interpretazioni incoerenti con il riferimento; controllo sulle sorgenti (8 ottobre 2026)

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

## D-023 — Pulizia di label, spazi, maiuscole e separatori (8 ottobre 2026)

- Requisito/i: R05 (forme normalizzate leggibili) · Ipotesi: — · Data check: DC-13 (work order T-85, comprende la parte di pulizia di T-74)
- Stato precedente: spazi finali in quattro label (`palazzo` «Palazzo », `piazza_colonna`, `via_dei_greci`, `via_lanza` «Via Lanza ») e in tre descrizioni (`centrale_del_latte`, `collina_molisana`, `orto_vigna_due_santi`); uno spazio non separabile (U+00A0) in coda all'ancoraggio `gaz_brahmaputra` di cinque interpretazioni (`interp_00356`, `00357`, `00365`, `00366`, `00367`); relazione spaziale scritta «adjacentTo» in 7 righe e «adjacentto» in 3; `Annotation_Method` «close reading» in 2 righe (`interp_00144`, `interp_00205`) contro «close_reading» in 143; separatori incoerenti in `Alternative_Toponym` (`palazzo_219`, `laboratorio_zamira`, con un «;» finale).
- Decisione: rimossi gli spazi ai bordi e gli U+00A0; relazione uniformata a «adjacentto», la forma minuscola usata da tutti gli altri valori di vocabolario nei fogli (`inside`, `projectedspace`, `zoneofaction`) e già chiave di `mapping.yaml:185` (il piano indicava «adjacentTo»: cambiato per coerenza); metodo uniformato a «close_reading»; `Alternative_Toponym` con separatore «; » e senza elementi vuoti. Nessun valore semantico cambia.
- Motivazione (fonte, pagina): AUDIT_0, T-74 e § 3; DATA_CHECKS DC-13. L'ETL già ripuliva U+00A0 e maiuscole delle relazioni (`resolve_lookup` e `map_vocabulary` fanno `strip()` e `lower()`), quindi quelle due correzioni non toccano il grafo: rendono pulite le sorgenti.
- Fase in cui è maturata: revisione critica (audit di fase 0)
- File toccati (manifest): `data/source/tables/NarrativePlaces.tsv` (9 righe: `centrale_del_latte`, `collina_molisana`, `laboratorio_zamira`, `orto_vigna_due_santi`, `palazzo`, `palazzo_219`, `piazza_colonna`, `via_dei_greci`, `via_lanza`); `data/source/tables/SpatialInterpretations.tsv` (14 righe: `interp_00144`, `00205`, `00356`, `00357`, `00365`–`00367`, `00527`, `00528`, `00552`, `00553`, `00555`, `00585`, `00836`); i due XLSX corrispondenti, rigenerati.
- Effetto su KG (triple prima/dopo, SHACL): ABox 16.029 → 16.029; full 17.187 → 17.187. Cambiano 11 letterali (4 `rdfs:label`, 3 `dcterms:description`, 2 `chora:annotationMethod`, 2 `skos:altLabel`). SHACL conforme, 0 violazioni. **Da segnalare per T-48:** l'ETL non divide `Alternative_Toponym`, quindi ogni cella diventa un unico `skos:altLabel` con i punti e virgola dentro («palazzo dell'oro; palazzo de li pescicani; …»); inoltre alcune celle contengono id invece di forme (`prati` ↔ `quartierino_prati`) o valori dubbi (`tiburtino` → «Tivoli», `san_giovanni` → «Galilei»). Non toccati: sono decisioni di contenuto (R05).

---

## D-024 — Adapter: un record per interpretazione anche con più ancore (8 ottobre 2026)

- Requisito/i: R04 (molti-a-molti), R15 (regola di aggregazione) · Ipotesi: — · Data check: — (emerso durante T-15)
- Stato precedente: `tools/build_geojson.py` interroga le interpretazioni con `OPTIONAL { ?si ga:anchorsToEntity ?gaz }`. Un'interpretazione con più ancore torna quindi una volta per ancora, e ogni riga diventava un record separato: interpretazioni, ruoli, determinazioni e righe di rilievo moltiplicati per il numero delle ancore. Era un difetto latente, perché fino a T-15 nessuna interpretazione aveva più di un'ancora (l'ETL lo permette con gli id separati da `|`). Con l'ancoraggio relazionale di Casal Bruciato (4 ancore) le 13 interpretazioni diventavano 52 righe di rilievo.
- Decisione: un solo record per interpretazione. Le ancore in più contribuiscono soltanto ai referenti del luogo (`refers_to_entity_ID`) e al conteggio delle interpretazioni ancorate di ciascuna entità (`anchoredTotal`). Il campo singolo `gazetteerId` prende il primo id in ordine alfabetico, per restare deterministico (D-018). Limite dichiarato: per un luogo **Imported** con più ancore, che oggi non esiste, il rilievo andrebbe a una sola entità; la regola di aggregazione per quel caso resta da decidere con R15 / T-63.
- Motivazione (fonte, pagina): verifica sul GeoJSON di T-15: senza correzione 960 → 999 interpretazioni e 931 → 970 righe di rilievo, a grafo invariato (960 interpretazioni); con la correzione i conteggi restano 960 e 931.
- Fase in cui è maturata: prototipazione (adapter dati, durante T-15)
- File toccati (manifest): `tools/build_geojson.py:322-347` (record unico e accumulo delle ancore in più), `:363` (`rec_by_si`).
- Effetto su KG (triple prima/dopo, SHACL): nessuno sul grafo. Con i dati precedenti a T-15 i derivati sono identici byte per byte a quelli versionati.

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
