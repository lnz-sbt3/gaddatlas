# AUDIT_3b — Fase 3b: i cinque Imagined diventano Invented (sola lettura)

**15 ottobre 2026** · ramo `fase3b-statuti-invented` da `main` a `133692c` · audit in sola lettura, nessuna sorgente modificata, nessun commit.

Decisione da applicare: Lorenzo, 14/10/2026. Reuschel e Hurni 2011 (*The Cartographic Journal* 48/4, pp. 293–308), con Reuschel, Piatti e Hurni 2013, pp. 138–139. I cinque luoghi Imagined (`roccafringoli`, `monte_nuncupale`, `scerpure`, `casa_del_butiro`, `castel_porcano`) diventano **Invented** per revisione critica, con nuove letture adottate che rivedono le precedenti (`prov:wasRevisionOf`). **Imagined resta nel vocabolario, senza istanze.** La definizione di D-061 è superata.

**Stato di partenza misurato** (`make shacl`, `run_queries.py`, `node --test`): 44.689 triple nel grafo completo; SHACL conforme, nessun risultato; CQ2 dà Imported 261 · Transformed 31 · Invented 13 · Imagined 5; IQ1–IQ21 a 0, tranne le informative IQ9 (13 righe) e IQ11 (0); test dell'app 8/8. Prossimo numero libero in `DECISIONS.md`: **D-090** (l'ultima voce è D-089, r. 1728).

---

## A1. Inventario delle occorrenze

Ricerca: `grep -rniE "imagined|immaginat|immaginari"`, esclusi `node_modules` e `.git`. Gli XLSX sono zip e `grep` non li legge: sono derivati e si rigenerano con `make xlsx`. Non ci sono occorrenze in `tools/*.py`, in `app/test/**`, in `.github/`, in `docs/alignment/AUDIT_2b.md` né in `TERNE_IQ20.md`.

### Sorgenti dati: si modificano (B1)

| File:riga | Testo | Trattamento |
|---|---|---|
| `NarrativePlaces.tsv:37` | `casa_del_butiro … imagined … «Casa immaginata nella zona dei Due Santi»` | `Reality_Status` → `invented`. La descrizione del censimento resta |
| `NarrativePlaces.tsv:44` | `castel_porcano … imagined … «Castello d'immaginazione, deformazione linguistica di Castel Porziano»` | `invented`; descrizione invariata |
| `NarrativePlaces.tsv:107` | `monte_nuncupale … imagined … «Monte inventato, …»` | `invented` |
| `NarrativePlaces.tsv:177` | `roccafringoli … imagined` | `invented` |
| `NarrativePlaces.tsv:216` | `scerpure … imagined … «Toponimo indiano fittizio…»` | `invented` |
| `NarrativePlaces.tsv:36`, `:131`, `:159` | «immaginaria/immaginario» nelle descrizioni del censimento di casa_crocchiapani, pensione_burgess, pozzofondo (tutti Invented) | **non toccare**: è l'uso comune della parola, non lo statuto |
| `Assertions.tsv:12`, `:16`, `:28`, `:42`, `:46` | `S-casa_del_butiro`, `S-castel_porcano`, `S-monte_nuncupale`, `S-roccafringoli`, `S-scerpure`: valore `chora:Imagined`, adottate | `Adopted` → `no`, nota di superamento; nuove letture (A3) |
| `Assertions.tsv:11`, `:34`, `:40`, `:70`, `:142`, `:143` | «immaginata/immaginario/immaginaria» nelle motivazioni di S-casa_crocchiapani, S-pensione_burgess, S-pozzofondo, C-edicola_due_santi, K-0006, K-0007 | non toccare (citazioni del censimento o di Terzoli) |
| `Assertions.tsv:69` | **P-0001** (partizione Roma città / campagna): «Non si assegnano d'ufficio […] luoghi Imagined […]: sono i casi di confine» | **da decidere (domanda 4).** Dopo D-090 la clausola resta senza oggetto. I cinque luoghi restano non assegnati (nessuno è in `PartitionMembers.tsv`). Propongo di non toccarla: è la motivazione datata 9/10 di una lettura attribuita |

### Sorgenti di modello: si modificano dove cambia la definizione (B2–B4). Imagined resta ammesso

| File:riga | Testo attuale | Trattamento |
|---|---|---|
| `ontology/chora.ttl:382` | `rdfs:comment` di `hasRealityStatus`: «on a scale ordered from the concrete to the abstract: imported, transformed, invented, imagined (skos:notation 1–4; Reuschel, Piatti and Hurni 2013…)» | riformulare: è un ordinamento del vocabolario, non una scala di precisione o di affidabilità; aggiungere Reuschel e Hurni 2011 |
| `ontology/chora.ttl:528-541` | `chora:Imagined`: `skos:definition` en/it = definizione di D-061; `scopeNote` «…even when the author gives it a position… D-061» | definizioni en e it dalla §1; `scopeNote` senza la definizione e il rinvio a D-061. `topConceptOf` e `notation "4"` restano |
| `ontology/chora.ttl:680-692` | `chora:Invented`: `skos:definition "An invented setting within familiar geographical reality"` **senza tag di lingua e senza italiano**; `scopeNote` «…Not to be confused with Imagined, which has no identifiable counterpart in reality (…; D-061)» | definizione `@en` (citazione) e `@it`; `scopeNote` con il termine di confronto della fonte, senza D-061 |
| `ontology/chora.ttl:617`, `:682`, `:722`, `:762` | `owl:differentFrom chora:Imagined`, `skos:hasTopConcept chora:Imagined` | restano |
| `ontology/chora.ttl:766` | `historyNote` dello schema (D-030, D-051) | aggiungere una frase sulla revisione del 14/10 (D-090) |
| `ontology/shapes/chora-shapes.ttl:191` | `sh:in ( ga:Imported ga:Transformed ga:Invented ga:Imagined )` | resta invariato (B3) |
| `ontology/queries/competency.rq:41-44` | commento di CQ3: «verifica se un luogo Invented/Imagined possa essere descritto con precisione. Se comparisse Imagined+Precise, la tesi … trova conferma» | riscrivere (B4). Con la definizione della fonte un Imagined non ha coordinate, quindi «Imagined+Precise» non è più la prova. La prova è **Invented+Precise**, oggi 7 interpretazioni |
| `data/source/mapping.yaml:50` | `imagined: "chora:Imagined"` | resta |

### Codice: Imagined non si toglie; una categoria vuota non rompe nulla (B5, v. A5)

| File:riga | Testo | Trattamento |
|---|---|---|
| `app/src/model/config.js:207`, `:214`, `:219` | `FICT_GLYPH_PATHS.imagined`, `FICT_GLYPH_BOX.imagined`, `FICT_GLYPH_GAIN.imagined` | restano (D-040: uno statuto senza glifo è un errore esplicito) |
| `app/src/model/entities.js:101` | commento «reality_status in transformed/imagined/invented» | resta: descrive i valori ammessi, non i dati |
| `app/src/atlas.js:919`, `app/test/entities-status.test.js:7` | «niente ripiego su "invented"» | non pertinente |

### Derivati: solo rigenerazione (B6)

`data/gaddatlas.ttl` (25 righe), `data/dist/gaddatlas-full.ttl` (36), `data/dist/atlas.slim.json` (9), `data/dist/gaddatlas.geojson` e `app/public/data/gaddatlas.geojson` (1 riga: 5 `"reality_status": "imagined"`), `ontology/chora.rdf` (11), `ontology/chora.jsonld` (11), `ontology/docs/index.html` (2), `ontology/docs/vocab_realitystatus.html` (6), `data/source/xlsx/NarrativePlaces.xlsx` e `Assertions.xlsx`.

### Documentazione corrente: si aggiorna (B7)

| File:riga | Testo attuale | Trattamento |
|---|---|---|
| `CLAUDE.md:31-41` | «Stato dei dati»: tripleCount 44689, «Imported 261 · Transformed 31 · Invented 13 · Imagined 5» | nuovi conteggi e triple, stato «fase 3b» |
| `CLAUDE.md:113-118` | invarianti: «*Imagined* = luogo senza alcuna corrispondenza… può essere collocato nel mondo reale… (definizione di Lorenzo, 9/10/2026, D-061…)» | definizioni della §1, rinvio a D-090 e a Reuschel e Hurni 2011; frase sulla categoria vuota |
| `CLAUDE.md:95-103` | regola 4 (eccezione della permutazione, «Conteggi attesi dopo: … Invented 15, Imagined 5») | **propongo di lasciarla**: descrive l'operazione dell'8/10 e i suoi conteggi attesi, che erano giusti allora. Al più una mezza riga: «(rivista da D-090)» |
| `README.md:112` | tabella degli assi, quattro valori | resta; si aggiunge la nota sulla categoria senza istanze |
| `README.md:128-131` | «…mentre *Transformed*, *Invented* e *Imagined* richiedono una collocazione propria nello spazio diagrammatico» | «*Transformed* e *Invented*…»; più una frase su Imagined |
| `data/README.md` | nessuna occorrenza; non ha una tabella degli assi | aggiungere la frase sulla categoria vuota vicino ai conteggi (r. 75-84) |
| `docs/MODELLO_LETTURE.md:119` | «Transformed, Invented e Imagined hanno una tessera propria nel Diagramma…» | «Transformed e Invented…»; Imagined, se avesse istanze, non avrebbe ancore (v. A5) |
| `ontology/CHANGELOG.md` | sezione `[1.0.0]`: nessuna occorrenza, e nessuna voce nemmeno per D-030 e D-061 | voce in «Cambiato» per le definizioni di Invented e Imagined |
| `ontology/README.md:49` | «Un luogo inventato può essere descritto con precisione… CQ3» | coerente, nessuna modifica |
| `docs/thesis/DATA_CHECKS_GaddAtlas.md:29` (DM-01) | la definizione di D-061 | definizione della §1, decisione del 14/10 nello stato |
| `DATA_CHECKS…:52` (DC-11) | «Con la permutazione… diventa **Imagined** (lo spazio onirico della festa)» | aggiornare lo stato: Invented (D-090) |
| `DATA_CHECKS…:57` (DC-16) | «Chiuso senza riesame (D-035)… Riconfermato in REVIEW_2 (D-061): i cinque restano Imagined» | chiusa di nuovo, con D-090 |
| `DATA_CHECKS…:18` | conteggio storico «prima della permutazione» | resta |
| `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md:518-520` (T-65) | «Imported → Transformed → Invented → Imagined, ovunque… l'ordine dei glifi nel codice è transformed, imagined, invented» | nuova distribuzione e categoria vuota. Il resto della voce resta |
| WorkOrder `:52` | «*Imagined* = luogo senza indicazione di posizione («somewhere»)» | coerente con la fonte; nessuna modifica (o il solo rinvio a D-090) |
| WorkOrder `:15`, `:36`, `:169`, `:178-190`, `:246`, `:263-264`, `:570`, `:576`, `:613`, `:631` | testo di T-04 e censimenti storici | restano: fotografano T-04. Unica eccezione proposta: `:576` «I 5 luoghi divenuti Imagined: nessuna riassegnazione (D-035)» → aggiungere «rivisto da D-090» |

### Documenti storici: non si modificano

`docs/DECISIONS.md` r. 717–1696 (36 righe: D-030, D-031, D-034, D-035, D-046, D-048, D-050, D-051, D-061, D-062, D-079, D-087…). **Unica eccezione:** la nota di correzione in coda a D-061, r. 1225–1252, come quella di D-057. `docs/alignment/AUDIT_0.md` (31 righe), `AUDIT_2.md` (r. 12, 88), `AUDIT_3.md` (r. 7, 93, 94, 255), `REVIEW_2.md` (21 righe), `TBOX_2.md` (r. 19, 84, 282, 571).

### Testo della tesi: non si modifica. Righe da correggere in seguito

| `Capitolo 4.md` | Passo | Rapporto con D-090 |
|---|---|---|
| r. 85, definizioni | «il _luogo immaginato_ (uno spazio privo di riscontro reale o indicazione di posizione, situato "da qualche parte"…)» | **coerente** con la fonte (non con D-061): nessuna correzione. Si può aggiungere la citazione di Reuschel e Hurni 2011 |
| r. 85, esempi | Roccafringoli, Monte Nuncupale, Scerpure, Tor di Gheppio tra i luoghi *inventati* | **coerente**: D-090 riallinea i dati al capitolo |
| r. 85 | «Molto più ardua si rivela invece la reperibilità d'un luogo integralmente _immaginato_…» | coerente: è l'argomento della categoria vuota |
| r. 85 | «l'occorrenza che più si avvicina a questa condizione è la festa notturna di Castel Porcano… (il che penderebbe verso il luogo _trasformato_), lo svolgimento della festa notturna… **ascrivibile alla categoria dell'_immaginato_**» e «Castel Porcano presenta un toponimo reale deformato immerso in una dimensione sospesa» | **in conflitto con D-090**: da riscrivere. Il capitolo stesso apre l'alternativa Transformed (v. A6) |
| r. 115 | Tor di Gheppio «ascrivibile alla categoria dei luoghi _inventati_» | coerente |
| r. 565 (n. 6), r. 601 (n. 24) | Wadköping trasformato; l'edicola «che una prima lettura direbbe inventata» | non pertinenti |

**Nota sulla precedenza.** `CLAUDE.md` dice che in caso di conflitto prevale il Capitolo 4. Su Castel Porcano D-090 contraddice il testo attuale del capitolo, che va quindi corretto dopo. È una decisione esplicita di Lorenzo, posteriore al capitolo, e la registro così in D-090.

### Archivio: non si tocca

`_archivio/chartD.js:225`, `:232`, `:237`, `:317`, `:4934`.

---

## A2. Stato attuale dei cinque luoghi

| Luogo | `NarrativePlaces.tsv` | Lettura di statuto (`Assertions.tsv`) | Fonte, pag. | Tipo | Adottata · revisione | Nota |
|---|---|---|---|---|---|---|
| roccafringoli | r. 177, `imagined`, nessuna descrizione | S-roccafringoli (r. 42): «Paese senza corrispondenza con un luogo attestato; l'autore lo immagina sui monti presso Palestrina ("a monte Manno, quasi", QPa 107).» | qpa, 107 | prova testuale | si · validata | «Motivazione riscritta da LS (10/10/2026, D-079).» Autore `lorenzo_sabatino` |
| monte_nuncupale | r. 107, `imagined`, «Monte inventato, collocato nella zona dei Colli Albani/marino» | S-monte_nuncupale (r. 28): «Monte senza corrispondenza con un rilievo attestato; l'autore lo immagina a chiusura dell'orizzonte dei Colli Albani ("da Rocca Orsina al Monte Nuncupale, su", QPa 173).» | qpa, 173 | prova testuale | si · validata | D-079 |
| scerpure | r. 216, `imagined`, «Toponimo indiano fittizio, ancorato a un referente reale (Brahmaputra) ma non identificabile:» (sic, termina coi due punti), Fuzziness 3 | S-scerpure (r. 46): «Città senza corrispondenza con un luogo attestato; l'autore la immagina "sulle rive, più o meno, del nativo Brahmaputra" (QPa 141).» | qpa, 141 | prova testuale | si · validata | D-079 |
| casa_del_butiro | r. 37, `imagined`, «Casa immaginata nella zona dei Due Santi» | S-casa_del_butiro (r. 12): «Descrizione del censimento: «Casa immaginata nella zona dei Due Santi».» | censimento_gaddatlas, — | prova testuale | si · validata | «Validata da LS (10/10/2026, D-078).» Autore `annotator/lorenzo_sabatino` |
| castel_porcano | r. 44, `imagined`, alt. «Castel Porcino», «Castello d'immaginazione, deformazione linguistica di Castel Porziano» | S-castel_porcano (r. 16): «Luogo senza corrispondenza con un luogo attestato: il nome deforma Castelporziano, ma la festa notturna appartiene a uno spazio d'immaginazione d'autore.» | manzotti_2010, 273, 276 | lettura critica | si · validata | D-079. N-0004 (Manzotti, p. 273): paraetimologia su Castelporziano, `Plays_On` `gaz_castel_porziano` |

Tutte e cinque hanno data 2026-10-09, nessun `Revision_Of` e nessuna lettura più vecchia nel grafo (la permutazione non genera revisioni, D-051). Nessuno dei cinque ha `Localization_Status` (tolto da D-062) né appartiene alla partizione P-0001.

**Ancore delle interpretazioni** (`SpatialInterpretations.tsv`, tutte adottate, annotatore Lorenzo):

| Luogo | Interpretazioni (riga) | Occorrenza, QPa | Ancora · relazione · determinazione |
|---|---|---|---|
| roccafringoli | interp_00287 (r. 286), interp_00376 (r. 375) | ref_00250 p. 107; ref_00321 p. 142 | `gaz_monte_manno` · near · relative (focalizzatore don_lorenzo_corpi) |
| monte_nuncupale | interp_00486 (r. 483) | ref_00415 p. 173 | `gaz_colli_albani` · nodo 4 del percorso `tragitto_rocca_di_papa_monte_nuncupale` (Santarella), senza determinazione |
| scerpure | interp_00356, 00365, 00367 (r. 355, 364, 366) | ref_00306 p. 140; ref_00314, ref_00316 p. 141 | `gaz_brahmaputra` · adjacentto · relative |
| casa_del_butiro | interp_00566, 00567 (r. 563–564) | ref_00479 p. 193 | `gaz_due_santi` · inside · relative (ines_cionini, diomede) |
| castel_porcano | interp_00645, 00646 (r. 643–644) | ref_00538, ref_00539 p. 213 | `gaz_castel_porziano` · overlaps · indeterminate (pestalozzi) |

**GeoJSON** (`data/dist/gaddatlas.geojson`): ognuno ha una tessera propria senza geometria, `reality_status: "imagined"`, quindi il glifo `imagined` di `FICT_GLYPH_PATHS` con guadagno 1,0. Occorrenze: casa_del_butiro 1, castel_porcano 2, monte_nuncupale 1, roccafringoli 2, scerpure 3. Le tessere proprie oggi sono 49 = 31 Transformed + 13 Invented + 5 Imagined. Dopo la modifica restano 49, con 31 Transformed e 18 Invented, e i cinque prendono il glifo `invented` con guadagno 0,92: forma diversa, un po' più piccola.

**Verifica delle fonti proposte per B1** (sugli estratti di `References.tsv`, testimone qpa):

| Luogo | Fonte proposta | Riscontro |
|---|---|---|
| roccafringoli | qpa 107 | ref_00250, p. 107: «…a Roccafrìngoli, su su in cima ai monti, a monte Manno, quasi, che da Palestrina ce se va cor ciuccio…». **Corretta.** Nota a margine: l'estratto stampa «Roccafrìngoli», con l'accento, e `Attested_Form` è vuota. Va solo segnalato (D-059), non toccato qui |
| monte_nuncupale | qpa 173 | ref_00415, p. 173: «da Rocca Orsina al Monte Nuncupale, su». **Corretta** |
| scerpure | qpa 141 | ref_00314, p. 141: «a Scerpure sulle rive, più o meno, del nativo Brahmaputra». **Corretta** |
| casa_del_butiro | qpa 193 | ref_00479, p. 193: «O la stradiccia della fonte de salute, verso Casa del Butiro.» **Corretta** |
| castel_porcano | qpa 213 | ref_00538 e ref_00539, p. 213. **Corretta.** Manzotti p. 273 coincide con N-0004 |

Nessun errore di pagina.

---

## A3. Id delle nuove letture

Convenzioni esistenti: `S-<luogo>` per lo statuto, `S-auto-<luogo>` per le letture generate dall'ETL (D-068), `C-<luogo>` per le letture del censimento rivedute (D-051). Nei tre casi di D-051 la lettura **vecchia** era `C-` e la nuova ha preso `S-`. Qui la lettura vecchia è già `S-<luogo>` e non si rinomina (è un IRI). Né l'ETL né l'audit ricavano il tipo dall'id: `tools/etl.py:1423` legge `Assertion_ID` come stringa e il tipo viene da `Assertion_Type`.

**Proposta: `S-<luogo>-2`**, cioè `S-roccafringoli-2`, `S-monte_nuncupale-2`, `S-scerpure-2`, `S-casa_del_butiro-2`, `S-castel_porcano-2`. Il prefisso resta quello del tipo, il suffisso dice che è la seconda lettura di statuto del progetto su quel soggetto, e una terza sarebbe `-3`. Non si confonde con `S-auto-` né con `V-0003a`. Alternativa: `S-<luogo>-d090`, che lega l'id alla decisione; la scarto perché mette nell'IRI un riferimento al registro, che è documentazione.

Posizione delle righe: subito dopo la lettura che rivedono (le `S-` sono in ordine alfabetico, r. 4–54), così `S-roccafringoli-2` segue `S-roccafringoli`. In alternativa in coda, come C-/I-casal_bruciato (r. 70–73).

Campi di ciascuna riga (B1): `Assertion_Type` status; `Subject` `narrativeplace/<luogo>`; `Value` `chora:Invented`; `Author_ID` e `Encoder_ID` `lorenzo_sabatino`. Nel foglio convivono `lorenzo_sabatino` e `annotator/lorenzo_sabatino`, e l'ETL accetta entrambi (`etl.py:1201`); uso la forma breve delle righe di D-079. `Source_Work`/`Source_Page` come nella tabella di B1; `Adopted` si; `Revision_Of` `S-<luogo>`; `Date` 2026-10-14; `Rationale_Type` prova testuale; `Review_Status` validata; `Note` «Revisione critica (D-090).»

**Controlli sulle letture rivedute:**

- **IQ12** (al più un'adottata per soggetto e tipo): la vecchia passa a `no`, la nuova è l'unica adottata. 0 righe.
- **IQ13** (esattamente un'adottata, con lo stesso valore di `hasRealityStatus`): `NarrativePlaces` dice `invented` e la nuova vale `chora:Invented`. 0 righe. L'ETL non genera `S-auto-` per i cinque: genera solo per gli Imported (`etl.py:1578`).
- **IQ16** (stesso soggetto e tipo, rivista non adottata): soggetto `narrativeplace/<luogo>` e tipo `StatusAssertion` in entrambe, la vecchia `adoptedByProject false`. 0 righe.
- **Shape 8** (`StatusRationaleShape`, Violation): vuole sul luogo una lettura di statuto adottata con motivazione, criterio e `Validated`. La nuova li ha tutti, quindi nessun risultato.
- **Shape 13** (`RevisionShape`): la revisione punta a un'asserzione esistente.

**Nota della lettura rivista:** il prompt dice «nella sua `Note` scrivi "Superata dalla lettura <id> (D-090)"». Le note attuali registrano la storia («Motivazione riscritta da LS (10/10/2026, D-079).», «Validata da LS (10/10/2026, D-078).»). **Propongo di aggiungere in coda**, senza sostituire: «Motivazione riscritta da LS (10/10/2026, D-079). Superata dalla lettura S-scerpure-2 (D-090).» (domanda 2).

---

## A4. Conteggi scritti a mano

Nessun conteggio per statuto è nel codice. `tools/audit_alignment.py`, `tools/check_reproducible.py`, `tools/run_queries.py`, `Makefile`, `app/test/**` e `.github/workflows/*.yml` non contengono né 5/13 legati agli statuti né «imagined»/«invented». `run_queries.py` esegue le query senza confrontare il numero di righe con un atteso.

Conteggi testuali che cambiano:

| Dove | Oggi | Dopo |
|---|---|---|
| `CLAUDE.md:31-32` | Imported 261 · Transformed 31 · Invented 13 · Imagined 5; ABox 42.501, TBox 1.618, tripleCount 44689 | Invented 18 · Imagined 0; triple ricalcolate |
| `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md:520` (T-65) | — | distribuzione nuova |
| `DATA_CHECKS…:29` (DM-01) | stato «Imported 259, Transformed 30, Invented 15, Imagined 5 (dopo D-029)» | aggiunta della distribuzione D-090 |

Conteggi che cambiano **solo se si aggiunge IQ22** (B4):

| Dove | Oggi |
|---|---|
| `Makefile:14` | «12 competency + 21 integrity + 7 loci critici» |
| `README.md:27`, `:40`, `:94` | «21/21 integrity», «21 integrity query» |
| `data/README.md:75` | «21/21 integrity» |
| `CLAUDE.md:175` | «12 competency + 21 integrity query» |

Conteggi già sbagliati prima di questa fase, da segnalare e non correggere qui salvo tua indicazione (domanda 5):

- `ontology/README.md:76`, `:84`, `:87`: «14 controlli di integrità», «12/12 e 10/10», «tranne IQ9 che è informativa». Le integrity query sono 21 e anche IQ11 è informativa.
- `data/README.md:82-84`: «261 `NarrativePlace` senza tessera propria: 260 di statuto *Imported* … più uno senza alcuna interpretazione». Oggi sono 261 Imported e 49 tessere proprie su 310 luoghi.
- `ontology/CHANGELOG.md:8`: «`owl:versionInfo` … dichiara ancora `4.1.1`». Non verificato qui.

Effetto atteso sul grafo (stima, da misurare in B6):

- **ABox:** +5 letture con i loro atti (circa 22 triple ciascuna, misurate su S-scerpure: 11 + 11) e +5 `prov:wasRevisionOf`. Cambiano `adoptedByProject` (5), `hasRealityStatus` (5) e il testo delle note, senza variare il numero di triple. In tutto circa **+115**.
- **TBox:** +1 per la definizione italiana di Invented. +1 se la frase su D-090 entra come secondo `historyNote` (oppure 0 se si estende il letterale esistente).
- **Statuti:** Imported 261 · Transformed 31 · Invented 18 · Imagined 0.
- **CQ3:** Invented passa a Relative 17, Indeterminate 13, Approximate 29, Precise 7; la riga Imagined scompare.

---

## A5. Interfaccia con una categoria vuota

- **Legenda e filtri.** Nell'app oggi **non esiste** né una legenda né un filtro per statuto. L'unica legenda è quella dei ruoli (`app/src/ui/shell.js:82`, `atlas.js:572`), e T-65 è ancora aperto («Oggi non esiste alcuna legenda di statuto»). Una categoria vuota quindi non si vede da nessuna parte. Se e come una futura legenda mostri Imagined vuoto è una decisione del Capitolo 8 (T-65): qui la registro e basta.
- **Glifi.** `painters.drawFictGlyph` usa il glifo del nome dello statuto (D-034). `entities.js:106-118` e `painters.js:167-168` si fermano solo se uno statuto *presente nei dati* non ha glifo. Un glifo definito e non usato (imagined) non produce errori. Il glifo `imagined` resta in `config.js` (D-040).
- **Test** (`node --test test/*.test.js`: 8/8; `package.json` non ha uno script `test`). `entities-status.test.js` controlla che i dati pubblicati abbiano solo statuti con un glifo e che uno statuto sconosciuto dia un errore. Nessun test conta gli statuti, quindi i dati nuovi non li rompono. Non c'è un test che fissi **che i quattro statuti del vocabolario abbiano un glifo anche quando non hanno istanze**: con Imagined vuoto, togliere per errore `imagined` da `FICT_GLYPH_PATHS` non farebbe fallire nessun test. **Propongo** un test in `entities-status.test.js`: le chiavi di `FICT_GLYPH_PATHS` coprono transformed, invented e imagined, e un dato con una tessera `imagined` viene caricato senza errori.
- **Build.** `build_geojson.py` non enumera gli statuti. Le tessere proprie restano 49.
- **Attrito latente da segnalare (non da risolvere ora).** Con la definizione della fonte un Imagined non ha coordinate né posizione («it is not possible to assign coordinates»). La shape 23 (`AnnotatedPlaceAnchorShape`, `chora-shapes.ttl:841`, Violation) e IQ21 vogliono invece un'ancora per **ogni** luogo con un'interpretazione adottata, senza eccezioni per statuto (D-084), e l'adapter si ferma su un luogo annotato senza ancore. Un futuro luogo Imagined annotato sarebbe quindi non conforme e bloccherebbe il build, anche se `sh:in` lo ammette. Lo stato di localizzazione che gli spetterebbe è `chora:NotApplicable` (D-048/D-062), che oggi non esonera dalla shape 23. Oggi l'attrito è teorico (Imagined = 0) ma riguarda CHORA come ontologia riusabile, perché la shape 23 sta nelle shapes di CHORA. **Non propongo modifiche** in questa fase: lo registro in D-090 come voce aperta (domanda 3).

---

## A6. Casi vicini (rapporto, nessuna modifica)

Definizioni di riferimento: *Transformed* «remodelling, renaming, relocation or a synthesis», con *shifted* e *synthesized* come forme speciali; *Invented* «an invented setting within familiar geographical reality».

**`via_delle_oche`** (Invented). `NarrativePlaces.tsv`: «via topograficamente non precisata»; nota: «Toponimo non attestato nella toponomastica storica milanese…». S-via_delle_oche (D-079): «Via reale di Bologna, nota via di prostituzione, che il testo traslata a Milano (QPa 22; U-0009).» U-0009 (discrepanza, asse geometria) la dice «traslazione d'autore». Passo: ref_00028, QPa 22, «udito a Milano da una ragazza, al dispensario celtico di via delle Oche». Ancora `gaz_bologna`, inside, relative. **Alla lettera:** la motivazione adottata descrive un luogo reale spostato, cioè *relocation*, un *shifted place*: **Transformed**. Il caso è identico, nella struttura, a palazzo Simonetti, che è Transformed (D-036: luogo reale trasportato in un'altra via). Resterebbe Invented solo se la via milanese fosse letta come invenzione che allude a quella bolognese, come dice la nota del censimento. Motivazione adottata e statuto oggi non sono coerenti fra loro.

**`pensione_burgess`** (Invented). Censimento: «Albergo immaginario, possibile deformazione di Pensione Villa Borghese, via Sgambati 4, vicino Porta Pinciana». S-pensione_burgess (D-078) cita la descrizione del censimento. Passi: QPa 189 (ref_00466 «pensione Bergèss», ref_00467 «Pensione Bergesse»), QPa 291 (ref_00671 «pensione Burgess»). Ancora `gaz_porta_pinciana`, adjacentto. **Alla lettera:** con il referente Villa Borghese di via Sgambati 4 identificato, sarebbe una rinominazione: **Transformed**. Senza identificazione è un'invenzione in una geografia nota: **Invented**. La motivazione si regge su un «possibile» senza fonte dichiarata. Per Transformed servirebbe un'identificazione attribuita (I-…) con fonte, come per Castel Savello.

**`castel_porcano`** (Imagined → Invented con D-090). Il nome deforma Castelporziano (N-0004, Manzotti 2010, p. 273). Le due interpretazioni sono `overlaps` con `gaz_castel_porziano`, indeterminate. Il Cap. 4, r. 85 dice già che la deformazione del nome «penderebbe verso il luogo _trasformato_». **Alla lettera:** se Castel Porcano *è* Castelporziano con un altro nome, è *renaming*: **Transformed**. Se è un luogo del sogno che il nome lega a una geografia nota senza esserne la tenuta reale, è **Invented**, che è la motivazione proposta per B1. Discrimina se il progetto adotta l'identificazione con Castelporziano: oggi N-0004 è una lettura di denominazione (paraetimologia), non un'identificazione, e nessuna `I-` lega il luogo a `gaz_castel_porziano`. La motivazione di B1 è coerente con i dati attuali. Il caso Transformed resta un'alternativa da decidere.

**`rocca_orsina`** (Imported). `NarrativePlaces.tsv:173`, nota: «"Rocca Orsina" non è il nome moderno di un comune, ma può essere ricondotto con buone ragioni alla fortificazione degli Orsini a Marino… L'attuale Palazzo Colonna sorge sul luogo della rocca… Le fonti locali la indicano come Rocca degli Orsini o fortezza orsinesca». Nessuna fonte citata. `gaz_rocca_orsina` (`GazetteerEntities.tsv:2232`): 41,76992 N 12,65848 E, `sameAs` e `Authority_Source` **vuoti**. La provenienza delle coordinate non è registrata, ma il punto cade nel centro storico di Marino, a circa 750 m da `gaz_marino` (41,7754 N 12,6637 E), cioè sull'area di Palazzo Colonna. La lettura di statuto è quella generata, S-auto-rocca_orsina (D-068): «Referente identificato nel gazetteer del progetto», fonte Censimento. Un solo passo, ref_00414, QPa 173 («da Rocca Orsina al Monte Nuncupale, su»), nodo 3 del percorso di Santarella. Esiste già `gaz_palazzo_colonna_marino` (Manzotti 2010, pp. 239–240, senza coordinate), bersaglio di I-0005 per la tenenza dei carabinieri, non per Rocca Orsina.

La segnalazione dell'estrazione assistita («probabile toponimo inventato») **non è nel repository**: non ho trovato tracce nei TSV, nei documenti né nelle note. **Alla lettera:** se «Rocca Orsina» rinomina la rocca orsiniana di Marino (oggi Palazzo Colonna), è *renaming* di un luogo reale: **Transformed**, non Imported, perché il nome non è attestato come toponimo. Se il nome è attestato in una fonte storica (TCI, Nibby, Tomassetti), è **Imported**. Se non ha riscontro, **Invented** come Monte Nuncupale, che il testo nomina nello stesso respiro. La coordinata è plausibile per la prima ipotesi, ma non ha fonte. Mancano: una fonte per la riconduzione agli Orsini e la fonte della coordinata (`Authority_Source`).

Nessuno di questi quattro casi è in DATA_CHECKS come voce propria: DC-11 tocca Castel Porcano, ma per le forme attestate. In B7 li aggiungo come voci aperte, DC-24…DC-27, dopo aver verificato l'ultimo numero.

---

## A7. Piano della fase B

Ogni task si chiude con `make all && make audit && make shacl`, con le triple e le violazioni prima e dopo.

| Task | Contenuto | Manifest previsto |
|---|---|---|
| **B1** Dati | 5 `Reality_Status` → `invented`. 5 letture `S-<luogo>-2` (testi della §B1 del prompt, fonti verificate in A2). 5 letture vecchie `Adopted` → `no`, con la nota in coda | `data/source/tables/NarrativePlaces.tsv` r. 37, 44, 107, 177, 216; `data/source/tables/Assertions.tsv` r. 12, 16, 28, 42, 46 + 5 righe nuove; `data/source/xlsx/NarrativePlaces.xlsx`, `Assertions.xlsx` (rigenerati) |
| **B2** TBox | `hasRealityStatus` `rdfs:comment`; `chora:Imagined` definizioni en/it e `scopeNote`; `chora:Invented` definizioni en/it e `scopeNote`; `historyNote` dello schema; CHANGELOG | `ontology/chora.ttl` r. 382, 528–541, 680–692, 766; `ontology/CHANGELOG.md` (sezione `[1.0.0]`); derivati `chora.rdf`, `chora.jsonld` |
| **B3** Shapes | nessuna modifica; verifica che `sh:in` resti a quattro valori e che nessuna restrizione nuova escluda Imagined | — (solo verifica, `chora-shapes.ttl:191`) |
| **B4** Query | commento di CQ3 riscritto. **IQ22 (INFORMATIVA)** in `integrity.rq`: luoghi per statuto **compresi gli zeri** (gruppo sui `skos:topConceptOf chora:RealityStatusScheme` con `OPTIONAL` sui luoghi, ordinato per `skos:notation`). CQ2 esiste ma non mostra le categorie vuote | `ontology/queries/competency.rq` r. 40–44; `ontology/queries/integrity.rq` (in coda, dopo IQ21); conteggi «21 → 22 integrity» in `Makefile:14`, `README.md:27,40,94`, `data/README.md:75`, `CLAUDE.md:175`; dichiarazione in `docs/MODELLO_LETTURE.md` (tabella dei controlli) |
| **B5** Interfaccia | nessun cambio di design. Test sui glifi dei quattro statuti (A5). Catture prima/dopo: Diagramma stadio 3/5, settore dei Castelli, luoghi esterni (Scerpure) | `app/test/entities-status.test.js` (+1 test); `docs/alignment/verifica_fase3b/*.png` |
| **B6** Derivati | `make all && make audit && make shacl && make queries`; `make xlsx`; `make docs`; `make publish-data`; `tools/check_reproducible.py`; due `make all` senza diff | `data/gaddatlas.ttl`, `data/dist/*`, `app/public/data/*`, `ontology/docs/*`, XLSX |
| **B7** Documentazione | come A1, «Documentazione corrente»; voci DC nuove per A6 | `CLAUDE.md` r. 31–41, 113–118 (± 102); `README.md` r. 112–131; `data/README.md` r. 75–84; `docs/MODELLO_LETTURE.md` r. 119; `docs/thesis/DATA_CHECKS_GaddAtlas.md` r. 29, 52, 57 + voci nuove e § D; `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md` r. 518–520, 576 |
| **B8** Decisione | D-090 (R07, R22; H3, H8; DM-01, DC-16), con le alternative scartate e l'attrito di A5. Nota di correzione in coda a D-061 | `docs/DECISIONS.md` (in coda, dopo r. 1761; nota dopo r. 1252) |
| **B9** Rapporto | conteggi, triple, SHACL, IQ1–IQ22, test, manifest, righe del Cap. 4 (r. 85 su Castel Porcano), A6, PR verso `main` (senza merge) | — |

---

## Domande prima di procedere

1. **Id:** va bene `S-<luogo>-2`, con le righe subito dopo la lettura rivista?
2. **Nota della lettura rivista:** la frase «Superata dalla lettura … (D-090)» va aggiunta in coda alla nota esistente (la mia proposta) o la sostituisce?
3. **Attrito di A5** (shape 23 / IQ21 contro un Imagined senza coordinate): solo registrato in D-090 come voce aperta, d'accordo?
4. **P-0001:** la clausola «luoghi Imagined» nella motivazione della partizione resta com'è (la mia proposta)?
5. **Conteggi già sbagliati** in `ontology/README.md` e `data/README.md:82-84`: li correggo in B7, visto che tocco quei file, o restano fuori?
6. **IQ22 o CQ2:** una nuova IQ22 informativa (la mia proposta, perché mostra Imagined = 0), oppure riscrivere CQ2 perché mostri gli zeri?
