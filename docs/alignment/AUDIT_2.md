# AUDIT_2 — Allineamento al Capitolo 4, fase 2 (sola lettura)

**9 ottobre 2026** · branch `allinea-cap4-fase2` da `main` `95886a0` (tag `fase1-allineamento-cap4`) · nessun file modificato durante l'audit, salvo questo.

Riferimenti: WO = `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md` (v1.2); DC = `docs/thesis/DATA_CHECKS_GaddAtlas.md`; decisioni di Lorenzo del 9/10/2026 (T-30 deciso; annotatori; note per task). Prossimo numero libero in `docs/DECISIONS.md`: **D-041**.

## 0. Baseline

| Misura | Valore |
|---|---|
| Triple ABox / grafo completo / TBox | 16.093 / 17.263 / 600 |
| Luoghi (Imported · Transformed · Invented · Imagined) | 309 (260 · 30 · 14 · 5) |
| Gazetteer / riferimenti / interpretazioni | 266 / 723 / 960 (29 di route) |
| SHACL | conforme, 0 violazioni |
| `make audit`, `make queries`, `check_reproducible.py` | verdi; CI verde sulla PR #1 |
| Test dell'app | 4/4; build di produzione ok |

Stato rilevato che riguarda la fase 2:

- `prov:wasAttributedTo` su 161 interpretazioni su 960, tutte `annotator/lorenzo_sabatino`; nessuna risorsa tipizzata `prov:Agent`; `prov:generatedAtTime` su 150. Mappatura: `data/source/mapping.yaml:465-471`.
- Nessuna classe di asserzione nella TBox. Esistono, **inutilizzate**, `chora:evidenceSource` (`chora.ttl:328`) e `chora:interpretationType` (`:390`). `chora:criticalNote` (`:321`) ha 72 usi.
- 6 `owl:sameAs` (3 coppie), prodotti da `tools/etl.py:673-687` dalla colonna `sameAs` di `GazetteerEntities.tsv` (`mapping.yaml:320-322`).
- Schemi SKOS: NarrativeRole, RealityStatus, SpatialDetermination, SpatialRelationType (e PlaceCategory in `ontology/shapes/chora-placecategories.ttl`). Nessuno schema per incertezza, astensione, partizioni o tipi di percorso.
- 123 interpretazioni senza `SpatialDetermination`, 54 Indeterminate. Le 42 interpretazioni con luogo ma senza ancora sono **tutte** di parti (`isPartOf`) che ereditano l'ancoraggio: oggi nessun luogo è privo di referente, salvo `castello`, che non ha occorrenze.
- `chora:narratorType` usata una volta (82 Character, 1 Narrator).
- `appearsInWork`: 723/723 riferimenti su `quer_pasticciaccio_adelphi`.
- `docs/EXCLUSIONS.md` non esiste.

## 1. Ordine stabile delle feature del GeoJSON (prima di tutto)

- **File/righe:** `tools/build_geojson.py:189-194` («NOTA SULL'ORDINAMENTO», da `main`), `:698-704` (sezioni di `atlas.slim.json`), `:721-722` (feature referenziali), `:743` (tessere proprie); `app/src/model/entities.js:71-85` (riparto referenziali in mappa / fuori mappa / fittizi e indici unificati); `app/src/atlas.js:832` (`drawOrder`, pareggio per indice); `app/src/model/radial-layout.js:200` (pareggio per id).
- **Stato verificato:** l'ordinamento di `main` è **deterministico**: chiave `(-planeCount, id)` ovunque, quindi due build della stessa sorgente danno lo stesso file (verificato anche in CI). **Non è stabile rispetto ai dati:** la chiave primaria è un conteggio, quindi una correzione che cambia `planeCount`, o un'entità aggiunta o tolta, sposta gli indici di tutte le feature che seguono. È successo in fase 1 (D-021, D-037), con il confronto visivo come unica rete. Nell'app l'indice conta in `atlas.js:832` (ordine di disegno a pari profondità) e negli indici unificati di `entities.js` (referenziali in mappa, fuori mappa, fittizi); `radial-layout.js:200` usa già l'id.
- **Proposta (da confermare):** dentro ciascun gruppo che `entities.js` distingue, ordine per **id**; l'ordine per `planeCount` resta nelle sezioni di `atlas.slim.json`, che non sono indici di disegno. Verifica con il confronto visivo sui 10 stati della fase 1 (vedi § 13): le differenze attese riguardano solo l'ordine di disegno di tessere sovrapposte a pari profondità. In alternativa si tiene l'ordine di `main` e lo si documenta. **DA DECIDERE:** quale delle due.

## 2. T-30 · Asserzioni attribuite — DECISO

- **File/righe:** `ontology/chora.ttl` (nuove classi e proprietà; `:764` SpatialInterpretation, già `rdfs:subClassOf prov:Entity`); `ontology/shapes/chora-shapes.ttl`; `data/source/mapping.yaml` (nuovo blocco); `tools/etl.py` (nuovo foglio); `data/source/tables/` (nuovi TSV); `tools/build_geojson.py` (lettura delle asserzioni adottate, solo dove serve, v. T-31).
- **Stato:** nessun nodo di asserzione; `evidenceSource` e `interpretationType` dichiarate e mai usate.
- **Proposta (secondo le decisioni del 9/10):**
  - `chora:Assertion rdfs:subClassOf prov:Entity`, allineata con `hico:InterpretationAct` (`rdfs:subClassOf`, senza importare HiCO);
  - `chora:assertionType` → nuovo schema SKOS `chora:AssertionTypeScheme`: status, identification, location, partition, memory, uncertainty, variant;
  - `chora:aboutSubject` (soggetto), `chora:assertsValue` (valore: un concetto o una risorsa), `prov:wasAttributedTo` (**autore della lettura**), `chora:evidenceSource` (riusata: chiave bibliografica + pagina, letterale strutturato) oppure `cito:citesAsEvidence` verso una risorsa bibliografica, `prov:generatedAtTime`, `prov:wasRevisionOf`, `chora:adoptedByProject` (`xsd:boolean`), `chora:rationale` (langString, T-33);
  - niente RDF-star, niente named graph;
  - nuovo foglio `data/source/tables/Assertions.tsv`, nel formato dell'Appendice A del WO (`assertion_id · type · subject · value · agent · source · page · adopted · rationale · revision_of · date · note`);
  - shape SHACL `AssertionShape` (tipo, soggetto, valore, autore obbligatori; `adoptedByProject` al massimo una volta; al più **una** asserzione adottata per soggetto e tipo, con una query di integrità);
  - `chora:interpretationType`: deprecata (`owl:deprecated true`), assorbita da `assertionType`.
- **Popolamento in fase 2:** solo le asserzioni che già esistono nei dati sotto altra forma: le identificazioni di T-31. Le letture degli studiosi restano alla fase 3.

## 3. Annotatori — DECISO

- **File/righe:** `data/source/tables/SpatialInterpretations.tsv` (colonne `Annotator_ID`, `Annotation_Date`); `mapping.yaml:465-471`; `chora.ttl` (ruoli).
- **Stato:** `Annotator_ID` valorizzato in 161 righe su 960; l'annotatore e l'autore coincidono in `prov:wasAttributedTo`.
- **Proposta:** l'annotatore è registrato come attribuzione qualificata, `prov:qualifiedAttribution [ prov:agent annotator/lorenzo_sabatino ; prov:hadRole chora:Encoder ]`, ripetibile per più annotatori; `prov:wasAttributedTo` resta all'autore della lettura. Le 960 interpretazioni ricevono `lorenzo_sabatino` come encoder (le 799 vuote compilate nel TSV) e, essendo letture sue, anche come autore. Un foglio `Agents.tsv` dichiara gli agenti (`prov:Agent`, `foaf:Person`); in fase 2 contiene solo Lorenzo, gli studiosi entrano in fase 3. **DA DECIDERE** solo la forma: attribuzione qualificata (proposta) oppure una proprietà dedicata `chora:encodedBy rdfs:subPropertyOf prov:wasAttributedTo`.

## 4. T-31 · Identificazioni senza `owl:sameAs` — DECISO (dopo T-30)

- **File/righe:** `tools/etl.py:673-687`; `mapping.yaml:320-322`; `GazetteerEntities.tsv` (colonna `sameAs`: `gaz_castel_gandolfo`, `gaz_castello`, `gaz_collegio_romano`, `gaz_santo_stefano_del_cacco_celio_santo_stefano`, `gaz_lungara`, `gaz_regina_coeli`); `tools/build_geojson.py:100-127` (`MERGE_MAP` vuota e commento su D-011); `app/src/model/config.js` (`ALIAS_GROUPS`, porting: non si tocca, `CLAUDE.md`); D-009, D-011.
- **Proposta:** tre asserzioni `identification`, lettura di Lorenzo, adottate. La colonna `sameAs` resta solo per URI esterni (http/https); gli id interni nella colonna vengono rifiutati dall'ETL con un errore. `owl:sameAs` resta per la sola coreferenza tecnica. `MERGE_MAP` e il commento su D-011 si aggiornano: la fonte unica per le fusioni diventa l'asserzione adottata.
- **Da segnalare:** le tre coppie non sono dello stesso tipo. Castello ↔ Castel Gandolfo è un'**identificazione contesa** (DC-04: lettura adottata ancora aperta; Manzotti propone Castel Savello). Collegio Romano ↔ Santo Stefano del Cacco e Lungara ↔ Regina Coeli sono **alias** di uno stesso referente (istituzione e sede). Le registro tutte come identificazioni di Lorenzo adottate, come deciso; la lettura di Manzotti su Castello entra in fase 3. **DA DECIDERE:** se gli alias vadano tipizzati diversamente dalle identificazioni contese.

## 5. T-33 · Motivazione dello statuto — DECISO

- **File/righe:** `NarrativePlaces.tsv` (colonne attuali: `Description`, `Notes`); shape di NarrativePlace (`chora-shapes.ttl:178-212`).
- **Stato:** nessuna motivazione strutturata; 49 luoghi non Imported.
- **Proposta:** `chora:rationale` sull'asserzione di statuto (T-30). Il valore di `hasRealityStatus` sul luogo resta come valore adottato, derivato dall'asserzione adottata. Shape: motivazione obbligatoria per gli statuti diversi da Imported, inizialmente con `sh:severity sh:Warning`, perché le 49 motivazioni sono contenuto di Lorenzo; diventa `Violation` quando sono compilate. Le motivazioni già scritte in fase 1 (D-030…D-037: Casal Bruciato, Simonetti, palazzo 219, edicola) possono entrare subito.

## 6. T-34 · Vocabolari dell'incertezza — DECISO (vocabolari)

- **File/righe:** `chora.ttl` (nuovi schemi), `chora-shapes.ttl`; `confidence` (`chora.ttl:317-319`, shape `:131`) e `hasFuzzinessLevel` **invariati** (rinviati).
- **Proposta:** `chora:UncertaintyTypeScheme` (Vagueness, NonSpecificity, ContestedIdentification, Discrepancy con i sottotipi Oversight, Anachronism, Confusion, InternalDiscrepancy, Incompleteness, NonApplicability), `chora:UncertaintyAxisScheme` (Name, Identification, Geometry), `chora:UncertaintyOriginScheme` (Documentary, Constructive). L'incertezza è un'asserzione di tipo `uncertainty` con tipo, asse, origine e autore. Nessun popolamento in fase 2.

## 7. T-35 · Astensione a tre valori — DECISO

- **Proposta:** `chora:LocalizationStatusScheme` (NotYetAnalysed, SuspendedWithReason, NotApplicable) e `chora:localizationStatus` sull'interpretazione. Shape: un'interpretazione con `targetsPlace`, senza `anchorsToEntity` e il cui luogo non è parte di un altro, deve avere uno stato. Oggi il vincolo non scatta su nessuna interpretazione (le 42 senza ancora sono tutte parti). Il rapporto con le 54 Indeterminate e le 123 senza determinazione è un altro asse (SpatialDetermination): il report caso per caso spetta a Lorenzo, non lo propongo come modifica.

## 8. T-36 · Livelli enunciativi — DECISO

- **File/righe:** `chora.ttl:341` (`hasFocalizer`), `:418` (`narratorType`); `SpatialInterpretations.tsv`.
- **Proposta:** `chora:hasNarratingVoice` (→ FocalizingAgent o un concetto narratore / voce collettiva), `chora:narrativeTime` (momento del racconto: capitolo e posizione, o un valore testuale), e il tipo di asserzione `memory` per l'attribuzione della memoria (autore / personaggio / indecidibile). Colonne nuove, vuote, nel foglio. Nessun popolamento in fase 2.

## 9. T-37 · Partizioni interpretative — DECISO

- **Stato:** nessuna entità «città» o «campagna»; le bande metriche di `build_geojson.py` non sono una partizione.
- **Proposta:** `chora:InterpretivePartition` (individui «Città», «Campagna», senza geometria) e asserzioni di tipo `partition` che assegnano luoghi a una partizione, ciascuna attribuita (Roggia, Perosa, Savettieri, Alfano, Calvino: fase 3).

## 10. T-38 · Storia delle revisioni — DECISO

- **Proposta:** `prov:wasRevisionOf` fra asserzioni (colonna `revision_of`); versione del dataset come `dcterms:hasVersion` su una risorsa dataset nell'ABox (oggi solo `meta.buildVersion` nel GeoJSON); `tools/diff_assertions.py` che confronta due TTL per asserzione e produce un changelog. Primo caso reale: la revisione superata della lettura di Lorenzo sull'edicola (Imagined → Imported, D-031), in fase 3.

## 11. T-42 · Occorrenze non-QP — DECISO

- **Stato:** nessuna (723/723 su Adelphi).
- **Proposta:** query di integrità IQ12 che segnala riferimenti fuori da QP inclusi nelle viste, e filtro nell'adapter. Il nome della proprietà (`appearsInWork` / `appearsInWitness`) resta T-44, DA DECIDERE con T-40.

## 12. T-45 · Temporalità esclusa — DECISO

- **Proposta:** creare `docs/EXCLUSIONS.md` (R12) con la temporalità e la sua motivazione, insieme alle esclusioni già decise (percorsi degli oggetti, DM-03; diacronia dei testimoni nell'interfaccia, DM-04; resa dei percorsi non compiuti, D-035). Il resto dell'elenco pubblico (T-70) in fase 4.

## 13. Verifica

Per ogni task: `make all && make audit && make shacl` (`make queries` se cambiano le query), `check_reproducible.py`, triple e violazioni prima e dopo, manifest, voce D-0nn da D-041 (dopo un `git fetch origin`), un commit. Per § 1 il confronto visivo sui 10 stati (5 stadi × tutti / Pestalozzi), con la procedura della fase 1: attesa di 10 s e ispezione dei compositi, perché un'animazione continua rende il confronto pixel per pixel solo indicativo.

## 14. Decisioni che servono prima di procedere

1. § 1: ordine delle feature per id dentro i gruppi, oppure ordine di `main` documentato.
2. § 3: annotatore come attribuzione qualificata (proposta) oppure `chora:encodedBy`.
3. § 4: tipizzare diversamente gli alias e le identificazioni contese?
4. § 5: la shape della motivazione parte come Warning?
