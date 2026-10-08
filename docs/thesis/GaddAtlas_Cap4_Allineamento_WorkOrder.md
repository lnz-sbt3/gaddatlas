# GaddAtlas / CHORA — Allineamento del progetto al Capitolo 4

**Work order per Claude Code** · v1.2, 8 ottobre 2026 (integra l'audit di fase 0, `docs/alignment/AUDIT_0.md`) · L. Sabatino

---

## 0. Come usare questo file

Questo documento censisce tutto ciò che va verificato, corretto o aggiunto nel progetto (sorgenti canoniche: `data/source/tables/*.tsv` (D-015), `data/source/mapping.yaml`, `data/source/void_seeds.json`, TBox `ontology/chora.ttl` (D-016); gli XLSX e `chora.rdf` diventano derivati; tutto ciò che sta in `data/dist/` si rigenera con `make all` e non si modifica a mano (D-002); SHACL, query, codice dell'interfaccia in `app/src/`, documentazione) perché il progetto dica le stesse cose del Capitolo 4 della tesi. Il riferimento sono le ipotesi H1–H8, i requisiti R01–R22 e le proposizioni P1–P8.

**Regole per Claude Code (vincolanti)**

1. **Prima la diagnosi, poi le modifiche.** Ogni fase comincia con un audit in sola lettura che produce `docs/alignment/AUDIT_<fase>.md`. Per ogni task l'audit elenca i file e le righe interessati, lo stato attuale e la modifica proposta. Nessuna modifica prima dell'approvazione esplicita di Lorenzo.
2. **Disciplina delle patch.** Ogni modifica riporta un manifest: file modificati con intervalli di righe. Niente refactoring non richiesti e niente codice incollato nelle risposte.
3. **Niente sostituzioni globali cieche sui valori semantici** (statuti, identificazioni, letture). Ogni riassegnazione si fa caso per caso e con una motivazione (R07). **Unica eccezione decisa da Lorenzo:** la permutazione Invented ↔ Imagined (T-04, DM-01), che è una correzione di nome, non una riassegnazione.
4. **Dopo ogni task sui dati:** `make all && make audit && make shacl` (e `make queries` quando cambiano le query). Si riportano conteggio delle triple e violazioni prima e dopo.
5. **Ogni decisione di modello o di dati si registra in `docs/DECISIONS.md`** (da D-015, dopo le D-001…D-014 esistenti), la base dell'Appendice J della tesi. Il formato è nella §9. Lo stato della voce corrispondente si aggiorna in `docs/thesis/DATA_CHECKS_GaddAtlas.md`.
6. **Gli stati dei task sono tre.**
   - `DECISO`: si applica.
   - `DA VERIFICARE`: va controllato su una fonte o sui dati, poi riportato a Lorenzo.
   - `DA DECIDERE`: Claude Code prepara le opzioni e si ferma.
7. **I testi dell'opera sono protetti fino al 31/12/2043.** Non si aggiungono estratti più lunghi del necessario, e gli estratti esistenti si verificano contro la policy R21 (§4.7).

**Fonti di verità**, da mettere nel repo sotto `docs/thesis/`:

- `Capitolo 4.md` (conversione del docx);
- `DATA_CHECKS_GaddAtlas.md` v1.5 (DM-01…DM-06, DC-01…DC-20);
- `../alignment/AUDIT_0.md` (audit di fase 0, 8/10/2026, commit df1bd8a): file e righe di ogni task. Dove l'audit corregge una premessa di questo file, questo file è stato aggiornato.
- questo file.

In caso di conflitto prevale il Capitolo 4.

**Stato rilevato** su `gaddatlas.ttl` del 4 ottobre 2026, da riverificare in fase di audit:

- 16.035 triple; 309 NarrativePlace; 265 GazetteerEntity; 722 PlaceReference; 962 SpatialInterpretation; 83 focalizzatori; 18 route; 3 LiteraryWork.
- `hasRealityStatus`: Imported 260, Transformed 29, Imagined 15, Invented 5.
- `assignsSpatialDetermination`: Approximate 446, Relative 239, Precise 100, Indeterminate 54.
- `prov:wasAttributedTo`: 161 occorrenze, tutte su `annotator/lorenzo_sabatino`. `chora:confidence` è un decimale. `hasFuzzinessLevel` è un decimale su NarrativePlace.

---

## 1. Principi e invarianti da rispettare

Vengono dal Capitolo 4 e dal progetto.

- **Tre livelli:** PlaceReference (occorrenza) → SpatialInterpretation (interpretazione, il nodo centrale) → GazetteerEntity (referente). NarrativePlace è il luogo narrativo.
- **Separazioni:**
  - misura ≠ statuto ≠ ruolo ≠ valore (H1);
  - la precisione della localizzazione è indipendente dallo statuto (Reuschel, Piatti e Hurni 2013, p. 139).
- **Statuto di realtà:** scala ordinata dal concreto all'astratto: **Imported → Transformed → Invented → Imagined** (DM-01).
  - *Invented* = luogo fittizio collocato in una geografia nota.
  - *Imagined* = luogo senza indicazione di posizione («somewhere»).
- **Lo statuto si assegna al luogo**, ma le assegnazioni discordanti motivate si conservano e non si correggono (H3, P8, DC-09).
- **Ogni interpretazione è un'asserzione attribuita:** chi, quando, su quale fonte e con quale storia di revisioni (R22, H8). Nessuna lettura è il default del modello. La lettura *adottata dal progetto* è una lettura attribuita come le altre.
- **Il testo prevale sul repertorio** (§4.4): le discrepanze si registrano tipizzate, non si correggono.
- **Mai un indice unico di affidabilità** (§4.4): niente punteggio sintetico al posto del tipo di incertezza.
- **Interfaccia:**
  - il riempimento delle celle Voronoi è vietato;
  - il rosso è riservato alla densità;
  - le tinte categoriali sono riservate al NarrativeRole;
  - le linee sono riservate ai percorsi attestati e ordinati;
  - algoritmi deterministici;
  - i luoghi narrativi hanno piena autonomia anche senza referente.

---

## 2. Matrice requisiti → componenti del progetto

Legenda dei componenti:

- **T** = TBox (`ontology/chora.ttl`)
- **D** = dati (`data/source/tables/*.tsv` + `mapping.yaml` + `void_seeds.json` + ETL)
- **S** = SHACL / query di integrità
- **A** = adapter dati (`build_*`, data layer JS)
- **U** = interfaccia
- **Doc** = documentazione e tesi

| Req | Contenuto (Cap. 4) | Componenti | Stato presunto | Task |
|---|---|---|---|---|
| R01 | Testimone e redazione per ogni occorrenza | T D S A | Solo `appearsInWork` = Adelphi; Work ed edizioni confusi | T-40…T-44 |
| R02 | Temporalità separate: storia (con la memoria), racconto, scrittura, referente | T D | Assente | T-45 |
| R03 | Repertorio geografico datato | T D S | Coordinate senza fonte né data | T-46, T-15 |
| R04 | Molti-a-molti tra occorrenze, luoghi ed entità, motivata | D S | Presente; verificare la motivazione | T-47 |
| R05 | Forma attestata e forma normalizzata; soprannomi come proprietà | T D | Solo label/altLabel | T-48 |
| R06 | Luoghi senza toponimo/referente | D S | Presente (es. orto/vigna Due Santi); verificare | T-49 |
| R07 | Statuto motivato per ogni assegnazione | T D | Nessuna motivazione strutturata | T-30…T-33 |
| R08 | Enunciazione, focalizzazione, interpretazione autobiografica separate | T D | Solo `hasFocalizer` | T-36 |
| R09 | Tipo, asse, origine, autore dell'incertezza | T D S | `confidence` decimale, `hasFuzzinessLevel` decimale | T-34 |
| R10 | Identificazioni alternative senza risoluzione forzata | T D | `owl:sameAs` usati come identificazione | T-31, T-13 |
| R11 | Astensione a tre valori ≠ dato mancante | T D U | Assente | T-35 |
| R12 | Esclusioni dichiarate e motivate | Doc U | Assente | T-70 |
| R13 | Granularità con inclusioni; relazioni di scala non inclusive | T D | `isPartOf` sì; non inclusive no | T-50 |
| R14 | Unità testuali come asse indipendente | D A U | Capitolo/pagina sì; segmento da verificare | T-51 |
| R15 | Regola di aggregazione dichiarata per vista | U Doc | Da verificare | T-63 |
| R16 | Cambi di scala legati ai passi | D U | Da verificare | T-52 |
| R17 | Relazioni qualitative (soglia, adiacenza, verticalità, confine) anche senza referente | T D | SpatialRelationType senza soglia/confine/frontalità | T-53 |
| R18 | Percorsi tipizzati dei **personaggi** (oggetti esclusi) | T D U | 18 route non tipizzate | T-54, T-64 |
| R19 | Focalizzatore, voce e momento del racconto per interpretazione | T D | Solo focalizzatore | T-36 |
| R20 | Partizioni (città/campagna) come ipotesi attribuite | T D | Da verificare | T-37 |
| R21 | Evidenza testuale minima e stabile, non sostitutiva | D A U | Estratti presenti; nessuna policy | T-55 |
| R22 | Provenienza di ogni interpretazione + storia delle revisioni; nessun default | T D S U | Tutto attribuito a LS, nessuna revisione | T-30, T-38, T-60 |

---

## 2bis. Task infrastrutturali emersi dall'audit di fase 0 (da eseguire per primi)

### T-80 · Sorgente dati: TSV canonici (D-015) — `DECISO`

- **Stato (AUDIT_0, premessa 2):** l'ETL legge `data/source/tables/*.tsv` (Makefile:25); `tools/xlsx_to_tsv.py` è manuale e fuori dal Makefile; XLSX e TSV oggi coincidono.
- **Azione:** i TSV sono la sorgente canonica. Gli XLSX si rigenerano dai TSV con un nuovo target (es. `make xlsx`, script `tools/tsv_to_xlsx.py`), per chi vuole lavorare in Excel. Togliere `xlsx_to_tsv.py` dal flusso documentato (o tenerlo solo come importazione una tantum, con avviso). Aggiornare `CLAUDE.md`, `README.md` e la voce D-015, che aggiorna D-002.

### T-81 · Sorgente della TBox: `chora.ttl` canonica (D-016) — `DECISO`

- **Stato (premessa 1):** oggi la sorgente è `ontology/chora.rdf` (Protégé) e `chora.ttl` è derivata dall'ETL (Makefile:21-22, 27-29).
- **Azione:** invertire la catena. `chora.ttl` diventa la sorgente; `chora.rdf` (RDF/XML, per Protégé) si genera da `chora.ttl` con rdflib. Prima di invertire: verificare che i due file siano isomorfi (`rdflib.compare.isomorphic`) e riportarlo. Dopo: `make all`, SHACL, `make docs`. Voce D-016, che aggiorna D-002.
- **Nota:** da qui in poi ogni patch alla TBox va su `chora.ttl`. Protégé può aprire e salvare Turtle; se Lorenzo modifica in Protégé, salva su `chora.ttl`.

### T-82 · Bug `owl:sameAs` nell'ETL (regressione di D-009) — `DECISO`

- **Stato (premessa 7):** `tools/etl.py:671-674` costruisce `URIRef(same_as)` su un id nudo. In `data/gaddatlas.ttl` gli IRI sono relativi; in `data/dist/gaddatlas-full.ttl` contengono il percorso `file:///C:/Users/lorenzo.sabatino3/…`. La correzione di D-009 era stata applicata a un derivato (`tools/migrate_namespace.py`), non alla causa.
- **Azione:** risolvere l'id nel namespace `gazetteer/` (IRI assoluti), senza cambiare per ora il numero delle coppie (3). La sostituzione con identificazioni attribuite resta T-31. Aggiungere un controllo (IQ o `audit_alignment.py`) che fallisca se un IRI del grafo non comincia con `https://`. Voce D-017, che aggiorna D-009 e D-011. **Chiude:** DC-17 (e DC-10).

### T-83 · Sincronizzazione di `app/public/data/` — `DECISO`

- **Stato (premessa 10):** nessun target copia i derivati in `app/public/data/`; il GeoJSON lì differisce da `data/dist/` (ordine delle feature, `meta.excerptsIncluded: true`).
- **Azione:** un target `make publish-data` (o un passo finale di `make all`) che copi GeoJSON e passages; un controllo di uguaglianza in `make audit`.

### T-84 · Interpretazioni con luogo incoerente rispetto al riferimento — `DECISO`

- **Stato (AUDIT_0, §3):** 6 casi: `interp_00245` (id «vicenza » con spazio), `interp_00331` (piazza Verdi → banca_ditalia), `interp_00627`/`interp_00628` (Tivoli e Càrsoli scambiati), `interp_00858` (tenenza → marino), `interp_00859` (via Massimo d'Azeglio → marino).
- **Azione:** correggere caso per caso dopo verifica sull'estratto; aggiungere `IQ11` che intercetti incoerenze tra il luogo dell'interpretazione e quello del riferimento. **Chiude:** DC-19.

### T-85 · Pulizia di id, label, maiuscole e spazi — `DECISO`

- Spazi finali in label («Via Lanza », «Palazzo », «Piazza Colonna », «Via dei Greci »); U+00A0 nell'ancoraggio `gaz_brahmaputra` (Scerpure); «adjacentto» vs «adjacentTo»; `annotationMethod` «close reading» vs «close_reading» (DC-13); separatori incoerenti in `Alternative_Toponym`. Una sola voce in DECISIONS.md. Comprende la parte di pulizia di T-74.

### T-86 · Conflitto cromatico ruolo / densità nel prototipo — `DA DECIDERE` (prima di T-60/T-61)

- **Stato (AUDIT_0, T-60):** `ROLE_COLORS.Setting` #B32B40 (chartD.js:37, tokens.css:13) è quasi identico a `HUE_RGB` #9B2335 (densità); `ROLE_COLORS.ProjectedSpace` #1F6F6B coincide con `FICT_HUE_RGB` (densità dei luoghi fittizi, chartD.js:32). Gli invarianti «rosso = densità» e «tinta = ruolo» sono già in conflitto.
- **Azione:** proporre opzioni (con la skill `dataviz`) e fermarsi.

### T-87 · Difetti minori del prototipo e dell'adapter — da trattare nel porting

- `_archivio/chartD.js:4930-4935`: qualunque statuto non riconosciuto finisce sul glifo «invented» (fallback silenzioso). L'archivio non si modifica: la correzione va nel modulo portato, con un errore esplicito.
- `tools/build_geojson.py:341`: imputa `confidence = 1.0` dove manca (795 interpretazioni), contro DM-05. Rimuovere l'imputazione quando si decide T-34.

---

## 3. Interventi sui dati già decisi o da verificare

### T-01 · Fattocchie → Frattocchie — `DECISO`

- **Stato:** `reference/ref_00588`, `chora:excerpt` «…su su su fu fu fu da 'e Fattocchie…», `sourceReference "A 241"`. L'estratto viene dalla copia digitale Adelphi; il volume a stampa (QP 241) legge **Frattocchie**.
- **Azione:**
  - Correggere l'estratto in «Frattocchie» e cercare ovunque «Fattocchie»: TSV, XLSX, YAML, JSON, GeoJSON, passages, codice, documentazione.
  - Registrare «Fattocchie» come **variante di testimone** (RR II, p. 219, stampa Garzanti) secondo il modello di T-41, con la lettura di Terzoli (2015, p. 771: «se non è refuso, rafforza l'onomatopea precedente») e l'emendazione di Pinotti (QP 241; Italia 2020, pp. 101–102), entrambe attribuite.
- **Nota:** il censimento è stato fatto sulla copia digitale. → T-56 (controllo a campione delle lezioni).

### T-02 · Robine Vecchie — `DA VERIFICARE` + attribuzioni

- **Stato (AUDIT_0):** `NarrativePlaces.tsv:171`, Transformed, descrizione prudente. Unico riferimento: `ref_00403` («A 169», cap. VI), il cui estratto contiene davvero «dalle Robine Vecchie». Due interpretazioni (Santarella) ancorate a `gaz_frattocchie` e `gaz_due_santi` con relazione `near` e `confidence 0.5`: un doppio ancoraggio che il modello legge come referenza multipla.
- **Azione:**
  - **Verificato da Lorenzo (8/10/2026, D-031):** Robine compare una sola volta, a QP 169; i rinvii a «QP 161» erano errati e sono stati corretti.
  - Statuto adottato invariato (Transformed); letture di Terzoli (2015, p. 491) in fase 3: (a) refuso per «Robinie/Rovine vecchie»; (b) «ironico abbassamento» delle Rovine della zona. Pinotti conserva la lezione.
  - Ancoraggio da rimodellare come relazione «tra» Frattocchie e Due Santi (T-47, T-53), non come referenza multipla.

### T-03 · Edicola ai Due Santi → Imported — `DECISO`

- **Stato (AUDIT_0):** `NarrativePlaces.tsv:68`, Imagined (dopo T-04 diventa Invented), `Is_Part_Of = orto_vigna_due_santi`; nessun ancoraggio nelle 3 interpretazioni (`SpatialInterpretations.tsv:663,666,667`); nessuna GazetteerEntity adatta.
- **Azione (decisa da Lorenzo l'8/10):**
  - Statuto → **Imported**, descrizione aggiornata.
  - Nuova `gaz_edicola_due_santi`, con coordinate dalla piantina TCI (*Italia centrale* IV) e fonte in `Authority_Source` (Manzotti 2010, p. 246). Ancorare le 3 interpretazioni.
  - **Togliere `Is_Part_Of`** (un luogo Imported parte di un luogo fittizio è incoerente, e `isPartOf` gli farebbe ereditare l'ancoraggio sbagliato, chora.ttl:404-411). Sostituirlo con una relazione qualitativa con `orto_vigna_due_santi` (l'edicola sta sopra il muro di cinta: `Above` o `AdjacentTo`, da scegliere sul testo, QP 216).
  - **Effetto sulla vista:** in `build_geojson.py:403` hanno tessera propria solo i luoghi non Imported; passando a Imported l'edicola perde la tessera e, senza ancoraggio, finirebbe fra gli esclusi. Ancoraggio obbligatorio nello stesso task; verificare l'effetto sui 48 voidSeeds congelati (D-012).
  - Asserzione attribuita a Manzotti 2010, p. 246 e revisione superata di LS: fase 3.
- **Ordine:** dopo T-04. **Chiude:** DC-03.

### T-04 · Permutazione Invented ↔ Imagined (DM-01) — `DECISO`

> **Decisione di Lorenzo (8/10/2026):** le due etichette erano semplicemente invertite di nome. La correzione è una **permutazione completa**: tutto ciò che era Imagined diventa Invented, e tutto ciò che era Invented diventa Imagined. Non è una revisione critica caso per caso.

- **TBox (`chora.ttl`, dopo T-81):**
  - scambiare le `skos:definition` dei due concetti, in modo che `chora:Invented` = «fictional place set within known geographical reality» e `chora:Imagined` = «no hint of position, "somewhere", no real-world counterpart» (Reuschel, Piatti e Hurni 2013, pp. 138–139, in uno `skos:scopeNote`);
  - aggiungere `skos:notation` 1–4: Imported 1, Transformed 2, Invented 3, Imagined 4;
  - riscrivere il `rdfs:comment` di `hasRealityStatus` (oggi «imported, transformed, imagined, invented»);
  - completare gli `owl:differentFrom` asimmetrici (AUDIT_0, T-04).
- **Dati:** permutazione atomica dei valori nei TSV (passando per un valore temporaneo, così che nessun valore venga scambiato due volte): 15 Imagined → Invented, 5 Invented → Imagined. Conteggi attesi dopo: Imported 260, Transformed 29, **Invented 15, Imagined 5**. Riportare l'elenco completo prima/dopo.
- **Altri file:** `ontology/shapes/chora-shapes.ttl:185` (ordine di `sh:in`), `mapping.yaml:39-43`, `README.md:111,129`, `ontology/docs/` (`make docs`).
- **Glifi (non palette):** lo statuto è codificato dalla forma del glifo (`_archivio/chartD.js:219-237`, `FICT_GLYPH_PATHS`); i colori indicati nella v1.0 non esistono nel repository. **DA DECIDERE con T-65:** i glifi restano legati al nome dello statuto o seguono il significato? Non toccare l'archivio: la decisione si applica nel modulo portato.
- **Controllo di coerenza da riportare, senza modificare:** dopo la permutazione, elencare i 5 luoghi divenuti Imagined (oggi Roccafringoli, Monte Nuncupale, Casa del Butiro, Scerpure, Castel Porcano), con il loro ancoraggio attuale e con ciò che ne dice il Capitolo 4. Il § 4.3 presenta Roccafringoli, Monte Nuncupale e Scerpure come *luoghi inventati* dotati di «una precisa collocazione topografica». Lorenzo deciderà se correggere i dati o il capitolo.
- **Tesi:** i conteggi per statuto cambiano; segnalare a Lorenzo ogni luogo del Cap. 4 citato con uno statuto.

### T-10 · Palazzo di via Merulana 219 (DC-08) — `DA DECIDERE`

- **Stato:** Transformed.
- **Cap. 4:** «un edificio che, salvo prova di un modello reale, è costruito dal testo».
- **Opzioni:**
  - (a) Invented: edificio fittizio in una via reale;
  - (b) Transformed solo se si documenta un edificio-modello.
- **Varianti di testimone da registrare (T-41):**
  - civico 119 (QPL 285, 293) → 219 (QP 16, 25);
  - «palazzo degli ori» → «palazzo dell'Oro» (Matt e Pinotti 2022, schede 8, 11, 30, 31).

### T-11 · Palazzo Simonetti / via Lanza / via Lata (DC-02) — `DA DECIDERE`, con attribuzioni

> ⚠️ **Correzione di premessa.**
> - La lezione **via Lata** non è in QPL: è nel **dattiloscritto dei capitoli nuovi (dtsFG, Fondo Gelli, 1955–57)**. Il cap. VII non esisteva nella redazione di «Letteratura».
> - **Via Lanza** (via Giovanni Lanza) è una via reale dell'Esquilino; non è «oggi via del Corso».
> - È **via Lata** a essere la traversa di via del Corso presso piazza del Collegio Romano, dove sorge il palazzo Simonetti (o De Carolis).
> - Il nome è «Simonetti», non «Simonetta».

- **Stato (AUDIT_0):** `NarrativePlaces.tsv:126` (`palazzo_simonetti`, Imported, nessuna descrizione); `:278` (`via_lanza`, label con spazio finale); `References.tsv:436-437` (QP 177), `:675` (QP 292); `SpatialInterpretations.tsv:507` (→ `gaz_via_lanza`), `:508`, `:842-844`. `gaz_palazzo_simonetti` (`GazetteerEntities.tsv:1607`) ha `Present_Location` «Via Vittoria Colonna, 13» e coordinate in Prati: è già, implicitamente, il candidato di Terzoli, ma nessuna interpretazione vi è ancorata. Nessun `owl:sameAs` riguarda Simonetti.
- **Fatti:**
  - QP 177 colloca il palazzo Simonetti in via Lanza.
  - In via Lanza non esiste alcun palazzo Simonetti (Pinotti 2025, p. 78).
  - dtsFG legge via Lata, dove il palazzo esiste (Pinotti 2025, p. 78).
  - Terzoli (cit. in Pinotti 2025, p. 78) vi legge un riferimento autobiografico al palazzo Odescalchi Simonetti di via Vittoria Colonna 11, la pensione White dove Gadda aveva abitato.
- **Proposta:**
  - `via_lanza` resta Imported.
  - Il palazzo *in via Lanza* (QP) → **Invented**: edificio fittizio in una via reale.
  - Identificazioni alternative attribuite (R10):
    - (a) Palazzo Simonetti/De Carolis, via Lata (Pinotti, sulla base di dtsFG);
    - (b) Palazzo Odescalchi Simonetti, via Vittoria Colonna (Terzoli): è l'attuale `gaz_palazzo_simonetti`. **Civico 11 o 13: da verificare** (Pinotti 2025, p. 78 riporta 11).
  - Nuova `gaz_palazzo_simonetti_via_lata` per il candidato (a). Passando a non-Imported, il palazzo acquista una tessera propria: verificare i voidSeeds.
  - La variante via Lata va registrata come lezione di dtsFG (T-41).
- **Chiude:** DC-02.

### T-12 · Correzioni di lezione da verificare sul cartaceo — `DA VERIFICARE`

- Ricontrollare le lezioni toponomastiche del censimento (estratti e `sourceReference`) contro QP a stampa: il digitale ha riprodotto almeno un'emendazione mancata (T-01).
- **Priorità:** i toponimi con statuto non Imported, le forme dialettali, i nomi deformati (Castel Porcano/Porcino, Due Santi/«li Du Santi», «Casale Abbrusciato»).

### T-13 · «Castello» / stazione dei Carabinieri di Castello (DC-04) — identificazioni `DA DECIDERE`, luogo da mantenere

- **Stato (AUDIT_0):** `castello` (`NarrativePlaces.tsv:46`) non ha occorrenze (IQ9) né tessera; dopo T-04 diventa Invented. La stazione (`:219`, Transformed) è ancorata direttamente a `gaz_castel_gandolfo`, non a `gaz_castello`; `gaz_castello` non ha interpretazioni. Riferimenti: `References.tsv:652` (QP 279), `:414` (QP 173, «Castel Savelli»).
- **Decisione di Lorenzo (8/10):** il luogo `castello` **si mantiene**: è il luogo testuale di «stazione di Castello» e sarà il bersaglio delle due identificazioni concorrenti.
- **Azione:**
  - fase 1: solo T-82 (IRI dei `sameAs`);
  - fase 2–3: collegare la stazione a `castello`; due identificazioni attribuite (LS: Castel Gandolfo; Manzotti 2010, p. 293: Castel Savello), senza risoluzione forzata; poi eliminare gli `owl:sameAs` (T-31). Lettura adottata: da decidere; statuto di `castello` da rivedere di conseguenza.
  - «Castel Savelli» è la **lezione del testo** (QP 173), non una grafia di Manzotti: va registrata come forma attestata di `castel_savello` (R05), non uniformata.
- **Nota:** togliere i `sameAs` tocca D-009 e D-011 e `build_geojson.py:100-128` (la proposta di derivare `MERGE_MAP` dai `sameAs` decade).

### T-14 · Castel Porcano / Castel Porcino — quasi risolto da T-04

- **Stato (AUDIT_0):** `NarrativePlaces.tsv:44`, Invented, `Alternative_Toponym` «castel porcino»; `gaz_castel_porziano` **esiste** (`GazetteerEntities.tsv:532`) e le due interpretazioni (Pestalozzi, ProjectedSpace, Indeterminate) vi sono già legate con `overlaps` (`SpatialInterpretations.tsv:648-649`).
- **Effetto di T-04:** il luogo diventa **Imagined**, che corrisponde all'opzione (a) della v1.1 (lo spazio onirico della festa).
- **Resta da fare (fase 2–3):** motivazione dello statuto; la relazione con Castelporziano come asserzione attribuita a Manzotti 2010, pp. 273, 276; «Castel Porcano»/«Castel Porcino» (QP 213) come forme attestate (R05). Il perimetro d'identità (H3, DC-09) va dichiarato nella motivazione.

### T-15 · Casal Bruciato e il casello al km 20,25 (DC-18, DC-07) — **errore di referente**, priorità alta

- **Stato (AUDIT_0):** `gaz_casal_bruciato` (`GazetteerEntities.tsv:467`) è a 41.9070, 12.5506: il **quartiere romano** di Casal Bruciato (Tiburtino), circa 25 km a nord della località del romanzo, tra le ferrovie Roma–Velletri e Roma–Napoli presso il Divino Amore. Ne ereditano la posizione `casal_bruciato` («Quartiere di Roma»), il casello e i suoi 22 ancoraggi, `passaggio_livello_casal_bruciato`, `camera_casello`, `bivio`.
- **Fase 1:** correggere coordinate e descrizione, con fonte (TCI o IGM) in `Authority_Source`; verificare l'effetto sulla tassellazione e sui voidSeeds.
- **Fase 3:** le due posizioni alternative TCI / IGM, attribuite a Manzotti 2010, pp. 268–270, senza dissolvenza tra i candidati (R03, R10). Il testo attribuisce il nome a una voce popolare: «detto da taluni di Casal Bruciato» (QP 241).
- Il casello «al chilometro 20,25» resta un luogo senza toponimo (R06); valutare se Transformed sia lo statuto giusto.

### T-16 · Altri casi del Cap. 4 da verificare nei dati

| Caso | Fonte Cap. 4 | Verifica / azione |
|---|---|---|
| Tenenza dei Carabinieri di Marino | Manzotti 2010, pp. 239, 293 (nel 1927 solo una «stazione») | Statuto Transformed motivato e attribuito |
| Due Santi | Manzotti 2010, p. 246; forme «li Du Santi», «alli Du Santi», «delli Du Santi» (QP 159, 162, 211, 215) | Imported; forme attestate (R05); esempio canonico di H3 (stesso statuto in ruoli diversi) |
| Faiti / Cengio (QP 61) | Perosa 2023a, pp. 103–104; Lugnani via Perosa p. 104 n. 97; Cortellessa 2023, p. 669; Bignamini | Oggi il passo è spezzato in due riferimenti, uno per monte, senza legame: un solo riferimento con due bersagli (referenza plurale, R04); ProjectedSpace; tre letture attribuite su a chi appartenga la memoria (R08) |
| Roccafringoli, Monte Nuncupale, Scerpure | QP 107, 173, 141 | Con la permutazione T-04 diventano Imagined: è il controllo di coerenza richiesto in T-04 (il § 4.3 li presenta come luoghi inventati) |
| Tor di Gheppio | Cortellessa 2023, p. 679 («immaginaria») | → Invented (permutazione T-04). Nota: Cortellessa usa «immaginaria» in senso generico; registrare la sua formula come nota attribuita, non come valore dello schema |
| Pavona (destinazione mai raggiunta) | Pinotti 2016, pp. 205–206 | Percorso «proposto e non compiuto» (R18); assenza significativa ≠ dato mancante (R11) |
| «Ernici o Simbruini» | Manzotti 2010, p. 290 | Incertezza identificativa per disgiunzione (R09) |
| «Càrsoli» | Manzotti 2010, p. 254 | Prima correggere lo scambio Tivoli/Càrsoli (T-84); poi discrepanza di forma (svista) tipizzata, non corretta |
| Direttissima Roma–Napoli | Manzotti 2010, p. 270 (inaugurata il 28/10/1927) | Discrepanza di tipo anacronismo |
| Scena della sciarpa narrata due volte | Manzotti 2010, p. 240 | Discrepanza interna |
| Mercato di piazza Vittorio | Spostato nel 2001 (fonte da trovare) | Validità temporale del referente (R02, R03) |
| Ines: Campo de' Fiori → piazza Vittorio | QPL 446 → QP 158; Pinotti 2024 | Variante di testimone (T-41) |
| Scale A/B, Balducci «in faccia» alla Menegazzi | QP 16 | Relazioni qualitative senza referente (R17): verticalità, frontalità, soglia |
| Santa Maria Maggiore / la bara | QP 292; Perosa 2023a, p. 239 | Soglia simbolica, nota attribuita |
| Le nuvole: Santarella, Pestalozzi, Ingravallo | QP 175, 210, 213, 292–293; Perosa 2023a, pp. 236–247 | Stesso spazio, tre focalizzatori; voce ≠ focalizzatore per Santarella (Perosa 2023a, p. 238) → R19 |
| «Distesa come in una mappa o in un plastico» | QP 211; Savettieri 2020, p. 44; Perosa 2023a, p. 246; Manzotti 2010, pp. 257–258 | Cambio di scala eseguito dal testo e attribuito (R16); focalizzatore Pestalozzi, voce non coincidente (R19) |
| Menegazzi / Zamira (logica simmetrica) | Savettieri 2020, p. 46 | Relazione figurale, non prossimità; oppure esclusione dichiarata (R12) |
| «Vortice» / «punto di depressione ciclonica» | QP 12–13 | Non-mappabilità: nessuna coordinata (R11, non-applicabilità) |
| Finale «imperfetto», *Ingravola in campagna* | Pinotti 2016, p. 202 | Avantesto: eventuali luoghi solo con lo statuto del testimone (T-42) |

---

## 4. Interventi sul modello (TBox `ontology/chora.ttl`)

> La sorgente canonica della TBox è `ontology/chora.ttl` (D-002): le modifiche si fanno lì, con patch chirurgiche, e si rigenerano i derivati con `make all`.

### T-30 · Asserzioni attribuite (reificazione) — `DA DECIDERE` (proposta)

Serve rappresentare letture concorrenti (statuto, identificazione, posizione, partizione, attribuzione della memoria), ciascuna con autore, fonte, data e storia.

**Opzioni**

1. **Nodi di asserzione n-ari (raccomandata).** È coerente con il pattern già in uso, perché SpatialInterpretation *è già* un'asserzione reificata. Si introduce una superclasse `chora:Assertion` (o si generalizza SpatialInterpretation) e le sottoclassi:
   - `chora:RealityStatusAssessment` → `chora:aboutPlace` NarrativePlace; `chora:assignsRealityStatus`;
   - `chora:IdentificationAssessment` → NarrativePlace / PlaceReference → GazetteerEntity (sostituisce `owl:sameAs`);
   - `chora:LocationAssessment` → GazetteerEntity → geometria + repertorio datato;
   - `chora:PartitionAssessment` → per R20.

   Su ogni asserzione:
   - `prov:wasAttributedTo` (agente: studioso o annotatore);
   - `cito:citesAsEvidence` o `chora:evidenceSource` con riferimento bibliografico e pagina;
   - `prov:generatedAtTime`;
   - `prov:wasRevisionOf` (R22, H8);
   - `chora:adoptedByProject` (booleano) per marcare *senza privilegiare nel modello* la lettura usata dall'interfaccia;
   - `chora:criticalNote`.

   Allineamento consigliato con **HiCO** (Daquino e Tomasi 2015; Daquino, Pasqual e Tomasi 2020, già citati nel Cap. 4: `hico:InterpretationAct`, `hico:hasInterpretationType`, `hico:hasInterpretationCriterion`), più **PROV-O** e **CiTO**.
2. **RDF-star** (GraphDB lo supporta): più compatto, ma meno portabile e meno leggibile in pyLODE e SHACL.
3. **Named graph per fonte** (TriG): pesante per asserzioni puntuali.

**Ricaduta su H3.** `hasRealityStatus` su NarrativePlace resta come *valore adottato*, derivato dall'asserzione con `adoptedByProject true`. Le asserzioni discordanti restano interrogabili (P8).

### T-31 · Identificazioni senza `owl:sameAs` — `DECISO` (dopo T-30)

- Sostituire gli `owl:sameAs` usati come giudizi d'identità con IdentificationAssessment attribuite.
- Riservare `owl:sameAs` ai casi di vera coreferenza tecnica (duplicati di URI), se ce ne sono.

### T-32 · Agenti: annotatori e studiosi — `DECISO`

- Creare `prov:Agent` / `foaf:Person` per gli studiosi:
  - almeno **Manzotti, Terzoli, Pinotti, Italia, Savettieri, Donnarumma, V. Baldi**;
  - inoltre, dal Cap. 4: **Perosa, Cortellessa, Roggia, Matt, Lugnani, Alfano, Amigoni, Tillson, Bricchi**.
- Per ciascuno, l'URI della risorsa bibliografica (APA del Cap. 4) collegato con `prov:wasDerivedFrom` / `cito`.
- Distinguere i ruoli:
  - lo studioso è *fonte* dell'asserzione (`prov:wasAttributedTo` + `prov:wasDerivedFrom` la sua opera);
  - LS è chi *ha codificato* l'asserzione nel KG (`prov:qualifiedAttribution` con ruolo `encoder`, oppure `prov:wasGeneratedBy` un'attività di annotazione associata a LS).

  In questo modo «Manzotti dice X» e «LS ha registrato che Manzotti dice X» restano distinti.
- Popolare il foglio di provenance e collegarlo alle attribuzioni degli altri fogli (TSV → `mapping.yaml` → ETL).

### T-33 · Motivazione dello statuto (R07) — `DECISO`

- Ogni RealityStatusAssessment ha una motivazione (`chora:rationale`, langString) e una fonte.
- Lo shape SHACL rende la motivazione obbligatoria per gli statuti diversi da Imported.

### T-34 · Tipizzazione dell'incertezza (R09, DC-06) — `DECISO` (vocabolari), `DA DECIDERE` (destino dei decimali)

Nuovi ConceptScheme SKOS:

- `chora:UncertaintyTypeScheme`: Vagueness, NonSpecificity, ContestedIdentification, Discrepancy (con sottotipi Svista, Anacronismo, Confusione, DiscrepanzaInterna), Incompleteness, NonApplicability. Corrispondono alle cinque forme del §4.4 e alla n. 27.
- `chora:UncertaintyAxisScheme`: Name, Identification, Geometry.
- `chora:UncertaintyOriginScheme`: Documentary, Constructive.

Ogni incertezza ha autore e fonte.

**DA DECIDERE:**
- `chora:confidence` (decimale, 167 interpretazioni) e `hasFuzzinessLevel` (decimale): rimuoverli, oppure conservarli come parametro *di visualizzazione* documentato e non come misura epistemica. Il Cap. 4 esclude l'«indice unico di affidabilità».
- `hasFuzzinessLevel` oggi è «invariante del luogo», mentre `SpatialDetermination` è sull'interpretazione: chiarire il rapporto e uniformare.

### T-35 · Astensione dall'ancoraggio (R11) — `DECISO`

- Nuovo schema `chora:LocalizationStatusScheme`: NotYetAnalysed, SuspendedWithReason, NotApplicable.
- Ognuno è distinto dal semplice valore mancante, e uno shape SHACL vieta il valore assente senza stato.
- Rapporto con `SpatialDetermination = Indeterminate` (54 casi): verificare caso per caso se si tratta di astensione o di determinazione testuale indeterminata.

### T-36 · Livelli enunciativi (R08, R19) — `DECISO`

Su SpatialInterpretation (o PlaceReference):

- `chora:hasFocalizer` (esiste);
- `chora:hasNarratingVoice` (narratore, voce collettiva, personaggio; `narratorType` esiste: verificare dove si usa);
- `chora:narrativeTime` (momento del racconto);
- per i casi di memoria autobiografica, un'asserzione attribuita `chora:MemoryAttributionAssessment`: autore / personaggio / indecidibile, con autore della lettura.

### T-37 · Partizioni interpretative (R20) — `DECISO`

- Entità «Campagna» / «Città» come **ipotesi attribuite** (PartitionAssessment):
  - polarità etico-morale: Roggia 2016, 2023, p. 41;
  - antitesi di regimi descrittivi: Perosa 2023a, pp. 249, 252–253;
  - confine attraversato / «teppa campagnola»: Savettieri 2020, p. 43;
  - «meticciarsi»: Alfano 2010, pp. 76, 80;
  - «due poli dell'azione»: Calvino 1958.
- Nessun poligono oggettivo. Verificare come «campagna» è oggi modellata.

### T-38 · Storia delle revisioni (R22, H8) — `DECISO`

- `prov:wasRevisionOf` tra versioni di un'asserzione, `prov:generatedAtTime` e versione del dataset (`owl:versionInfo` / `dcterms:hasVersion`).
- Changelog generato dall'ETL: diff tra due versioni del KG per asserzione.
- H8 si verifica su questa memoria (Cap. 9).

---

## 5. Testimoni, edizioni, derivazioni (R01, R02)

### T-40 · Modello minimo Opera / Testimoni — `DA DECIDERE` (proposta)

- **Stato:** 3 LiteraryWork:
  - `quer_pasticciaccio`: «Garzanti 1957», ma anche «opera»;
  - `quer_pasticciaccio_letteratura`: con un errore di metadati, «dal 1946 al 1948» (DC-05: i fascicoli sono 26–29 e 31 del 1946);
  - `quer_pasticciaccio_adelphi`.
- **Proposta:** separare l'**opera** dai **testimoni**, alla maniera di LRMoo: un'opera con `chora:Witness` (o `lrmoo:F2_Expression`):
  - **QPL** (redazione in «Letteratura», 1946);
  - **dtsFG** (dattiloscritto dei capitoli nuovi, Fondo Gelli);
  - **bzFG** (bozze);
  - **QP57** (princeps Garzanti 1957);
  - **QP** (Adelphi 2018, testo di riferimento della tesi).

  Avantesti e derivazioni con il loro statuto (§4.2, cinque ordini):
  - *Sceneggiatura per il finale* (15/3/1947), elenco delle «scene finali», *Ingravola in campagna* (finale «imperfetto»);
  - **Il palazzo degli ori** (soggetto, Lux Film, 1948) e *La casa dei ricchi*: derivazioni per un altro medium;
  - *Il sogno del brigadiere* (anticipazione, 1953).
- **Correggere DC-05.**

### T-41 · Varianti di testimone — `DECISO` (modello) + popolamento esemplificativo

Una `chora:VariantReading` (o PlaceReference con `appearsInWitness` + `chora:correspondsTo` l'occorrenza in QP) per i casi esempio del Cap. 4:

- civico 119 → 219; «palazzo degli ori» → «palazzo dell'Oro» (QPL 285, 293 → QP 16, 25);
- Ines: Campo de' Fiori (QPL 446) → piazza Vittorio (QP 158);
- palazzo Simonetti: via Lata (dtsFG) → via Lanza (QP 177);
- Fattocchie (RR II 219, QP57) → Frattocchie (QP 241);
- «Cor Papa e co' l'Anno Santo?» (QPL 346) → «Cor Papa milanese…» (QP; pagina da trovare): spostamento della datazione 1925 → 1927;
- **Il palazzo degli ori**: 2–3 casi esempio forniti da Lorenzo. → **DA DECIDERE:** quali.

### T-42 · Statuto delle occorrenze non-QP — `DECISO`

- Le occorrenze di avantesti e derivazioni entrano solo come corpora di confronto, con lo statuto del loro testimone.
- Non entrano nei conteggi e nelle viste del romanzo pubblicato. Le query di integrità lo verificano.

### T-43 · Nessuna diacronia nell'interfaccia — `DECISO`

- QPL → PdO → QP resta a livello di ontologia, KG e documentazione.
- Va dichiarato tra le esclusioni (R12, T-70) e nella Parte II.

### T-44 · `appearsInWork` → `appearsInWitness` — `DA DECIDERE`

Rinominare o affiancare la proprietà, e aggiornare SHACL, adapter e query.

### T-45 · Temporalità (R02) — `DA DECIDERE`: modellare o escludere

I quattro tempi:

- storia, con lo strato della memoria;
- racconto;
- scrittura;
- referente.

Proposta minima:

- storia → data o intervallo dell'episodio (marzo 1927);
- memoria → flag o asserzione su ProjectedSpace;
- scrittura → testimone (T-40);
- referente → validità temporale della GazetteerEntity (T-46).

Se non si modella, dichiararlo in R12.

---

## 6. Altri requisiti da verificare

- **T-46 · Repertorio datato (R03).** Ogni geometria ha la fonte (TCI 1925, IGM 1949, OSM/Wikidata attuale) e il periodo di validità. `historicalLocation` e `presentLocation` sono oggi stringhe: strutturarle.
- **T-47 · Molti-a-molti (R04).** Distinguere la *referenza plurale* (Faiti *e* Cengio) dall'*identificazione contesa* (Castello) e dall'*ancoraggio relazionale* (Robine tra Frattocchie e Due Santi). Il §4.3 distingue cinque tipi di relazione.
- **T-48 · Forma attestata / normalizzata (R05).**
  - `chora:attestedForm` sulla PlaceReference, `rdfs:label` normalizzato sul luogo.
  - Soprannomi come proprietà del luogo: «palazzo de li pescicani», «er palazzo dell'oro», «casermone color pidocchio», «via de' Merli», «palazzo der Mappamonno», «li Du Santi», «Casale Abbrusciato».
- **T-49 · Luoghi senza toponimo (R06).** Censire e verificare: orto/vigna dei Due Santi (QP 216), casello km 20,25 (QP 241), «torri senza nome» (QP 211–212).
- **T-50 · Scale (R13).** Inclusioni esplicite (stanza → palazzo → quartiere → città). Relazioni di scala *non inclusive* (corpo → fronte; gemma → geologia; QP 61, 255) come relazione figurale/memoriale, non `isPartOf`.
- **T-51 · Asse testuale (R14).** Edizione, capitolo, pagina, segmento. Verificare l'esistenza di un identificativo di segmento stabile (periodo), che è l'unità minima di evidenza (§4.7).
- **T-52 · Cambi di scala attribuiti (R16).** Il «mappa o plastico» (QP 211) come evento del racconto con focalizzatore e voce.
- **T-53 · Relazioni qualitative (R17).** Lo schema SpatialRelationType oggi ha Above, AdjacentTo, Below, Contains, Inside, Near, Overlaps, RelatedTo. Aggiungere **Threshold** (soglia), **Facing** (frontalità), **Boundary** (confine) e verificare Above/Below per la verticalità del palazzo.
- **T-54 · Percorsi tipizzati (R18).**
  - Nuovo `chora:RouteTypeScheme`: **compiuto, indicato, sognato, inferito, direzionale, proposto**. Le etichette devono coincidere con il Cap. 4: nel testo la voce «noto solo come direzione» va uniformata a «direzionale», e in R18 e P4 «presunto» va sostituito.
  - Tipizzare le 18 route.
  - Gli **oggetti sono esclusi** (gioielli della Menegazzi): dichiararlo in R12.
  - «Pe la strada de Castel de Leva…» (QP 237, `References.tsv:569`) è un dialogo (focalizzatrice Camilla Mattonari): percorso **indicato**. Il percorso **sognato** è QP 212 (`References.tsv:535`, Pestalozzi). L'incoerenza stava nel Cap. 4, § 4.4, che Lorenzo corregge nel testo. Nei dati: QP 237 = indicato.
  - Stato delle route (AUDIT_0): 18 `NarrativeRoute` senza tipo, generate dall'ETL da `Spatial_Component_Of` (`mapping.yaml:436-461`); `tragitto_torraccio_ponte_divino_amore` mescola nodi di QP 169 e QP 297 (verificare se sono due percorsi); nessun tragitto per QP 212, 237, 274, 298; `tragitto_marino_albano_laziale` (QP 278) è il candidato «direzionale».
- **T-55 · Policy degli estratti (R21).** Audit della lunghezza degli `excerpt` (722): unità massima = periodo o porzione di frase; rinvio stabile a pagina e segmento. Report degli estratti oltre la soglia (soglia **DA DECIDERE**).
- **T-56 · Controllo a campione delle lezioni** (da DC-01): campione stratificato di estratti confrontato con QP a stampa; report delle discrepanze.

---

## 7. Interfaccia (`app/src/`)

### T-60 · Provenienza e letture concorrenti nell'interfaccia — `DECISO` l'interazione, `DA DECIDERE` la grafica

- **Comportamento:** un luogo, un'occorrenza o un'identificazione con più asserzioni mostra un **segnale persistente e discreto** che indica che il punto è conteso.
  - Il segnale non usa la tinta (riservata al ruolo) né il rosso (riservato alla densità).
  - È un'annotazione a dimensione costante sullo schermo, come richiesto dai learnings: alla scala base gli halo a gradiente non emergono.
- **Hover/focus:** un pannello a comparsa con:
  - la lettura adottata (autore, opera, pagina, motivazione);
  - le letture alternative, con lo stesso formato;
  - la storia delle revisioni, sintetica.
- **Click:** il pannello si fissa nella sidebar.
- **Accessibilità:** il pannello è raggiungibile da tastiera (focus) e non solo con il mouse.
- **Nessuna lettura è presentata come «vera»:** l'etichetta è «lettura adottata dal progetto», non «corretta».

### T-61 · Canale visivo della SpatialDetermination — `DA DECIDERE`

> ⚠️ **Correzione di premessa.** Lo schema `SpatialDetermination` è **Precise – Relative – Approximate – Indeterminate**. Transformed e Invented appartengono a RealityStatus. Precisione e statuto sono variabili indipendenti (Reuschel, Piatti e Hurni 2013, p. 139; §4.4).

- **Prerequisito:** T-86 (conflitto cromatico ruolo / densità).
- **Vincoli:**
  - non usare il riempimento delle celle né la tinta;
  - non confondersi con l'altezza (= occorrenze) né con il segnale di contesa (T-60);
  - deve restare leggibile alle diverse scale (LOD) e su Canvas.
- **Opzioni da prototipare:**
  1. **Morbidezza del bordo / blur** proporzionale all'indeterminatezza: Precise nitido → Approximate sfumato. Si collega alla proposta Figma di «progressive blur» per livelli epistemici. Il blur Canvas (`ctx.filter`) è costoso: precalcolo su offscreen.
  2. **Tratteggio del bordo** (continuo, tratteggiato, punteggiato).
  3. **Texture / tratteggio interno a densità** (la «grammatica triassiale»: forma = statuto, colore del bordo = ruolo, texture = determinazione). Attenzione: il divieto di riempimento vale per la tinta piena, non per la texture; va verificato con la skill dataviz.
  4. **Relative**: segno di ancoraggio verso i luoghi di riferimento (linea sottile? Vietata: le linee sono riservate ai percorsi) → glifo.
- **Indeterminate / non localizzato (R11):** non si disegna in mappa; va nel pannello «Fuori carta» (T-62).

### T-62 · Pannello «Fuori carta» (R11) — `DECISO`

Elenco dei luoghi non ancorati, raggruppati per i tre valori di astensione, con il motivo e la fonte.

### T-63 · Regola di aggregazione dichiarata (R15) — `DECISO`

Ogni vista dichiara nell'intestazione o nella legenda l'unità contata (occorrenze, luoghi, episodi) e la regola: l'altezza del terreno = occorrenze, in fasce logaritmiche.

### T-64 · Percorsi tipizzati nell'interfaccia (R18) — `DA DECIDERE`

- Solo i percorsi **compiuti** sono linee piene (invariante).
- Per indicati, sognati, inferiti, direzionali e proposti, decidere tra:
  - (a) non disegnati come linee, solo elencati;
  - (b) un trattamento distinto che non si confonda con l'attestazione.

### T-65 · Legenda, ordine e glifi degli statuti

Imported → Transformed → Invented → Imagined, ovunque (dopo T-04). Oggi non esiste alcuna legenda di statuto e l'ordine dei glifi nel codice è transformed, imagined, invented. **DA DECIDERE:** assegnazione dei glifi ai quattro statuti nel nuovo ordine.

### T-66 · Riallineare le stringhe UI e i testi didattici

Pagine «metodo», legende e tooltip devono usare la terminologia del Cap. 4: statuto, determinazione, incertezza tipizzata, lettura attribuita, testimone.

### T-67 · Data adapter

- Leggere i nuovi campi: asserzioni, agenti, revisioni, tipi di incertezza, stati di astensione, tipi di percorso.
- Logica default + override (`hasDefaultTarget` vs `hasTarget`).
- Nessuna lettura privilegiata se non tramite `adoptedByProject`.

---

## 8. Documentazione e query

- **T-70 · Elenco pubblico delle esclusioni (R12).** `docs/EXCLUSIONS.md` e una pagina dell'interfaccia «Cosa questa mappa non mostra»:
  - logica simmetrica (solo come relazione figurale);
  - figuralità di frontiera (proposizione di Moretti non interrogabile);
  - percorsi degli oggetti;
  - diacronia dei testimoni nell'interfaccia;
  - annotazione assiologica (P1, in sospeso);
  - temporalità, se escluse (T-45).
- **T-71 · Query di integrità = domande di verifica della Tabella 4.2.** Una query SPARQL (o uno shape SHACL) per ciascuno di R01–R22, che risponda alla «Domanda di verifica» della tabella. Esempi:
  - R01: «ogni occorrenza ha testimone e redazione?»;
  - R09: «ogni annotazione incerta ha tipo, asse e autore?»;
  - R22: «si ricostruisce chi ha affermato che cosa, quando, su quale fonte, e come è cambiato?».
- **T-72 · Competency query per P1–P8 (Tabella 4.3).** Una query per proposizione, con i criteri «la conferma» / «la smentisce». Il Cap. 9 le eseguirà. Per P1 la query resta in sospeso finché non c'è l'annotazione assiologica.
- **T-73 · pyLODE / README / `mapping.yaml`:** rigenerare dopo le modifiche alla TBox; documentare i nuovi schemi.
- **T-74 · Grafia tra tesi e dati:** la pulizia è in T-85. «Castel Savelli» è forma attestata (QP 173) di Castel Savello: non si uniforma (T-13). «Dosso Faiti» è già uniforme nei dati.

---

## 9. Formato di `docs/DECISIONS.md` (base dell'Appendice J)

```
## D-0nn — titolo (data)
- Requisito/i: R..  ·  Ipotesi: H..  ·  Data check: DC..
- Stato precedente:
- Decisione:
- Motivazione (fonte, pagina):
- Fase in cui è maturata: analisi del testo | prototipazione (vista X) | revisione critica
- File toccati (manifest):
- Effetto su KG (triple prima/dopo, SHACL):
```

---

## 10. Decisioni che spettano a Lorenzo (checklist)

**Prese l'8/10/2026:** sorgente dati TSV (T-80); sorgente TBox `chora.ttl` (T-81); permutazione completa Invented ↔ Imagined (T-04); luogo `castello` mantenuto (T-13); edicola senza `Is_Part_Of`, con relazione qualitativa con l'orto (T-03).

**Aperte:**

- [ ] Modello delle asserzioni: n-ario + HiCO / RDF-star / named graph (T-30)
- [x] Glifi degli statuti: seguono il nome (D-030)
- [x] I 5 luoghi divenuti Imagined: nessuna riassegnazione (D-031)
- [ ] Conflitto cromatico ruolo / densità (T-86)
- [x] Palazzo 219: Transformed (D-031)
- [x] Palazzo Simonetti: Transformed, ancorato a via Lanza (D-031, D-032)
- [ ] Castello: lettura adottata (T-13)
- [x] Robine Vecchie: una sola occorrenza, QP 169 (D-031)
- [ ] `confidence` / `hasFuzzinessLevel`: rimuovere o declassare (T-34)
- [ ] Le 801 interpretazioni senza annotatore sono tutte di LS? (T-32)
- [x] Temporalità: esclusa (D-031)
- [ ] Casi esempio del Palazzo degli ori (T-41)
- [ ] Canale visivo della SpatialDetermination (T-61)
- [x] Resa dei percorsi non compiuti: esclusa (D-031)
- [x] Soglia di lunghezza degli estratti: invariata (D-030)

---

## 11. Ordine di esecuzione

| Fase | Contenuto | Uscita |
|---|---|---|
| 0 | Audit in sola lettura (fatto: `AUDIT_0.md`) | — |
| 1 | **Infrastruttura e correzioni decise**, in quest'ordine: T-81 (TBox canonica), T-80 (TSV canonici), T-82 (bug `sameAs`), T-83 (sincronizzazione `app/public/data/`), T-01 (Frattocchie), DC-05 (metadati di «Letteratura», T-40), T-84 e T-85 (incoerenze e pulizia), T-15 (coordinate di Casal Bruciato), T-04 (permutazione), T-03 (edicola). T-02 dopo la verifica sul volume | KG rigenerato, SHACL ok, voci D-015 e seguenti |
| 2 | Estensioni del modello: T-30…T-38, T-40…T-45, T-47, T-48, T-53, T-54 | TBox v1.1, shapes, ETL/YAML aggiornati |
| 3 | Popolamento delle asserzioni attribuite (§3 e T-16) dal foglio delle asserzioni validato da Lorenzo | KG con letture concorrenti |
| 4 | Query R01–R22 e P1–P8 (T-71, T-72), documentazione (T-70, T-73) | Report di conformità |
| 5 | Interfaccia: T-86, adapter (T-67), poi T-60…T-66 | Prototipo allineato |

---

## Appendice A — Asserzioni attribuite da inserire (fase 3)

Le pagine vengono dal Capitolo 4. Formato proposto (una nuova tabella `data/source/tables/Assertions.tsv`, mappata in `mapping.yaml`; l'XLSX corrispondente si genera con `make xlsx`):

`assertion_id · tipo (status|identification|location|partition|memory|uncertainty|variant) · soggetto (URI) · valore · agente · opera (chiave APA) · pagina · adottata (sì/no) · motivazione · nota`

| Soggetto | Tipo | Letture (agente, fonte) |
|---|---|---|
| Edicola Due Santi | status, location | Imported + TCI piantina (Manzotti 2010, p. 246) **adottata**; Invented (LS, censimento; «Imagined» prima della permutazione di T-04) → revisione superata |
| Robine Vecchie | status | Transformed, «ironico abbassamento» (Terzoli 2015, p. 491) **adottata**; refuso «Robinie/Rovine vecchie» (Terzoli 2015, p. 491) alternativa |
| Frattocchie (QP 241) | variant | «Fattocchie» RR II 219 / QP57; «se non è refuso…» (Terzoli 2015, p. 771); emendazione (Pinotti 2018; Italia 2020, pp. 101–102) |
| Castello / stazione di Castello | identification | Castel Gandolfo (LS); Castel Savello (Manzotti 2010, p. 293) |
| Casal Bruciato | location | Tra le due ferrovie (TCI; testo); a ovest della Roma–Napoli (IGM) (Manzotti 2010, pp. 268–270) |
| Palazzo Simonetti (QP 177) | status, identification, variant | Invented in via Lanza (Pinotti 2025, p. 78); palazzo Simonetti/De Carolis, via Lata (dtsFG; Pinotti 2025, p. 78); palazzo Odescalchi Simonetti, via Vittoria Colonna 11 (Terzoli, cit. in Pinotti 2025, p. 78) |
| Tenenza di Marino | status | Transformed: «re-invenzione romantica» (Manzotti 2010, p. 293; p. 239 per la «rocca-caserma») |
| Castel Porcano | status, identification | Deformazione paraetimologica di Castelporziano (Manzotti 2010, pp. 273, 276); festa = spazio onirico |
| Faiti / Cengio (QP 61) | memory | Memoria autobiografica dell'autore (Perosa 2023a, pp. 103–104); memoria di Ingravallo (Lugnani, cit. in Perosa 2023a, p. 104 n. 97); sovrimpressione (Cortellessa 2023, p. 669) |
| Città / campagna | partition | Roggia 2016, 2023 (p. 41); Perosa 2023a (pp. 249, 252–253); Savettieri 2020 (p. 43); Alfano 2010 (pp. 76, 80) |
| Palazzo 219 | variant, status | 119 (QPL) → 219 (QP) (Matt e Pinotti 2022, schede 8, 11, 30, 31); statuto: T-10 |
| Ines, luogo del furto | variant | Campo de' Fiori (QPL 446) → piazza Vittorio (QP 158) (Pinotti 2024) |
| Ernici / Simbruini | uncertainty | Identificazione per disgiunzione (Manzotti 2010, p. 290) |
| Càrsoli | uncertainty (discrepancy) | Svista d'accento (Manzotti 2010, p. 254) |
| Direttissima Roma–Napoli | uncertainty (discrepancy) | Anacronismo (Manzotti 2010, p. 270) |
| Sciarpa del rapinatore | uncertainty (discrepancy) | Doppia versione (Manzotti 2010, p. 240) |
| «Mappa o plastico» (QP 211) | focalization, voice | Focalizzatore Pestalozzi; voce non coincidente (Savettieri 2020, p. 44); sguardo dominante (Perosa 2023a, p. 246) |
| Nuvole di Santarella (QP 175) | focalization, voice | Focalizzatore Santarella; voce del narratore (Perosa 2023a, p. 238) |
| Tor di Gheppio | status | Invented (LS); «immaginaria» (Cortellessa 2023, p. 679, uso non tecnico) → nota |

*Fine del documento.*
