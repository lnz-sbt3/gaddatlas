# AUDIT_0 — Allineamento al Capitolo 4, fase 0 (sola lettura)

**8 ottobre 2026** · commit `df1bd8a` · nessun file modificato durante l'audit.

Riferimenti: WO = `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md`;
DC = `docs/thesis/DATA_CHECKS_GaddAtlas.md` (v1.4); Cap. 4 = `docs/thesis/Capitolo 4.md`.
Righe dei TSV = righe fisiche del file (intestazione = riga 1; alcune celle sono multiriga).

## 0. Metodo e baseline

Comandi eseguiti, tutti in sola lettura: conteggi rdflib su `data/gaddatlas.ttl`;
`tools/validate_shacl.py --report <scratchpad>` (non `make shacl`, che sovrascrive
`data/dist/shacl-report.ttl`); `tools/audit_alignment.py`; `tools/run_queries.py`
(integrity); confronto XLSX→TSV in una cartella temporanea.

| Misura | WO / DC (4/10) | Verificato oggi |
|---|---|---|
| Triple ABox (`data/gaddatlas.ttl`) | 16.035 | **16.045** |
| Triple full (`data/dist/gaddatlas-full.ttl`) | — | 17.203 (= `meta.tripleCount` del GeoJSON) |
| NarrativePlace / GazetteerEntity / PlaceReference / SpatialInterpretation | 309 / 265 / 722 / 962 | uguale |
| FocalizingAgent / NarrativeRoute / LiteraryWork | 83 / 18 / 3 | uguale (82 Character + 1 Narrator) |
| `hasRealityStatus` Imported/Transformed/Imagined/Invented | 260/29/15/5 | uguale |
| `assignsSpatialDetermination` Approx/Rel/Prec/Indet | 446/239/100/54 | uguale (839 su 962; 123 interpretazioni senza valore) |
| `prov:wasAttributedTo` | 161, tutte LS | uguale; 801 interpretazioni senza annotatore |
| `chora:confidence` | 167 (142 = 1.0) | uguale (16 × 0.5, 4 × 0.9, 3 × 0.8, 1 × 0.75) |
| `hasFuzzinessLevel` | — | 19 luoghi (13 × 3, 5 × 4, 1 × 2) |
| SHACL | — | CONFORMS True, 0 violazioni |
| `audit_alignment.py` | — | tutti i controlli superati |
| Integrity IQ1–IQ10 | — | tutte a 0; IQ9 (informativa) = 14 luoghi mai interpretati |

## 1. Premesse del work order da correggere prima di procedere

1. **Sorgente della TBox.** `Makefile:21-22,27-29`: la sorgente è `ontology/chora.rdf`
   (Protégé); `chora.ttl` è *derivata* dall'ETL. `CLAUDE.md:38` elenca invece
   `chora.ttl` fra i file modificabili. Finché la decisione del WO §4 non è presa, ogni
   patch alla TBox va su `chora.rdf`: una modifica a `chora.ttl` sparisce al build.
2. **Sorgente dei dati.** L'ETL legge `data/source/tables/*.tsv` (`Makefile:25`), non
   gli XLSX; la conversione `tools/xlsx_to_tsv.py` è manuale e fuori dal Makefile.
   `CLAUDE.md:37` indica gli XLSX. Verificato: XLSX e TSV coincidono (0 differenze di
   valore; solo formattazione dei decimali in `GazetteerEntities` e
   `SpatialInterpretations`). Ogni task sui dati deve aggiornare entrambi, oppure va
   deciso quale dei due sia canonico.
3. **Nomi dei file di riferimento.** `CLAUDE.md:51` cita `cap4.md`; il file è
   `docs/thesis/Capitolo 4.md`. Il WO cita DATA_CHECKS v1.3; il file è v1.4 (DC-10…DC-16
   in più).
4. **Palette degli statuti (T-04).** I valori #4A9EFF, #5BC892, #E89A4D, #A876C9 non
   compaiono in nessun file del repository. Nel prototipo lo statuto è codificato dalla
   **forma del glifo** (`_archivio/chartD.js:219-237`, `FICT_GLYPH_PATHS`), non dal
   colore; `app/src/styles/tokens.css` non ha token di statuto. La decisione «palette»
   diventa una decisione «glifi».
5. **Castelporziano esiste.** `gaz_castel_porziano` (`GazetteerEntities.tsv:532`) e le
   due interpretazioni di Castel Porcano vi sono già ancorate (`SpatialInterpretations.tsv:648-649`).
   Il WO (T-14) e DC-11 dicono il contrario.
6. **`gaz_collegio_romano` non riguarda Simonetti.** Il suo `owl:sameAs` lo lega a
   `gaz_santo_stefano_del_cacco_celio_santo_stefano` (`GazetteerEntities.tsv:661`),
   non al palazzo Simonetti (WO T-11, DC-10).
7. **Gli `owl:sameAs` non sono solo relativi: contengono un percorso Windows.**
   `data/gaddatlas.ttl` ha IRI relativi (`<gaz_castel_gandolfo>`, r. 54, 19471, 19584,
   20183 …); `data/dist/gaddatlas-full.ttl` ha
   `<file:///C:/Users/lorenzo.sabatino3/Desktop/gaddatlasrepocanonico/…>` (r. 360,
   20339, 20452, 21122, 21786, 23145). D-009 §3 dichiara il difetto chiuso: è una
   **regressione**, perché la correzione fu applicata al derivato
   (`tools/migrate_namespace.py`) mentre la causa è nell'ETL (`tools/etl.py:671-674`,
   `URIRef(same_as)` su un id nudo). Effetto collaterale probabile: il workflow
   `.github/workflows/data.yml` («i derivati devono coincidere con la build») fallisce
   su qualunque macchina diversa da quella di build (non verificato su CI).
8. **«Castel Savelli» è la lezione del testo**, non solo di Manzotti: estratto QP 173,
   `References.tsv:414`. Il luogo si chiama «Castel Savello» (`NarrativePlaces.tsv:45`).
   È un caso R05 (forma attestata ≠ forma normalizzata), non un refuso da uniformare.
9. **Robine Vecchie a p. 169 non è necessariamente un errore.** L'estratto di
   `ref_00403` (`References.tsv:404`, «A 169», cap. VI) contiene davvero «dalle Robine
   Vecchie». Può trattarsi di una seconda occorrenza oltre a QP 161, assente dal
   censimento. Da verificare sul volume prima di cambiare la pagina (T-02).
10. **`app/public/data/` non è sincronizzata in automatico.** Il GeoJSON in
    `app/public/data/` differisce da `data/dist/`: stesso contenuto per id, ma ordine
    delle feature diverso e `meta.excerptsIncluded: true` (contro `false`; nessun
    estratto presente). I passages coincidono. Nessun target del Makefile copia i
    derivati in `app/public/`: ogni correzione (es. T-01) richiede un passo di copia.

## 2. Task per task

Formato: **File/righe** · **Stato verificato** · **Proposta** · **Note**.

### T-01 · Fattocchie → Frattocchie — DECISO

- **File/righe:** `data/source/tables/References.tsv:589` (`ref_00588`, «A 241») e
  `References.xlsx` (stessa riga). Derivati: `data/gaddatlas.ttl:16692`,
  `data/dist/gaddatlas-full.ttl:17254`, `data/dist/passages/ch09.json:101`,
  `app/public/data/passages/ch09.json:101`. Documentazione: `CLAUDE.md:98` (esempio
  corretto, resta). Nessuna occorrenza in `_archivio/chartD.js`, GeoJSON, codice.
- **Stato:** l'estratto legge «da 'e Fattocchie»; il luogo è già `frattocchie` e
  l'interpretazione `interp_00713` (`SpatialInterpretations.tsv:716`) ancora a
  `gaz_frattocchie`. L'errore sta solo nel testo dell'estratto.
- **Proposta:** correggere l'estratto in XLSX e TSV; `make all`; copiare i passages in
  `app/public/data/`. La variante «Fattocchie» (RR II 219, QP57) entra con il modello di
  T-41 (fase 2): fino ad allora resta solo nel registro (D-015).
- **Note:** cambia solo un letterale; triple invariate.

### T-02 · Robine Vecchie — DA VERIFICARE

- **File/righe:** `NarrativePlaces.tsv:171`; `References.tsv:404` (`ref_00403`, «A 169»);
  `SpatialInterpretations.tsv:473-474`.
- **Stato:** Transformed; descrizione già prudente («microtoponimo … non identificato»).
  Due interpretazioni, focalizzatore Santarella, ancorate a `gaz_frattocchie` e
  `gaz_due_santi` con relazione `near`, confidence 0.5: l'ancoraggio relazionale c'è
  già in nuce, ma espresso come doppio ancoraggio (che il modello legge come referenza
  multipla, contro Cap. 4 r. 93).
- **Proposta:** (1) verificare sul volume se Robine compare sia a QP 161 sia a QP 169
  (premessa 9): se sì, aggiungere un riferimento per QP 161 e lasciare 169; se no,
  correggere la pagina. (2) Le letture di Terzoli e la nota su Pinotti si inseriscono in
  fase 3 (T-30). (3) Rimodellare l'ancoraggio come relazione «tra» (T-47, T-53).
- **Note:** il capitolo di `ref_00403` è VI; QP 161 cade nello stesso capitolo.

### T-03 · Edicola ai Due Santi → Imported — DECISO

- **File/righe:** `NarrativePlaces.tsv:68`; `References.tsv:551,554,555`;
  `SpatialInterpretations.tsv:663,666,667`; `tools/build_geojson.py:399-404`.
- **Stato:** Imagined, `Is_Part_Of = orto_vigna_due_santi` (a sua volta Imagined, parte
  di `laboratorio_zamira`), descrizione «Edicola immaginata…». Nessun ancoraggio nelle 3
  interpretazioni. Nessuna GazetteerEntity adatta.
- **Proposta:** statuto → Imported; nuova descrizione; nuova GazetteerEntity
  (`gaz_edicola_due_santi`) con coordinate ricavate dalla piantina TCI e fonte nella
  colonna `Authority_Source` (oggi sempre vuota, v. T-46); ancorare le 3 interpretazioni.
  Asserzione attribuita a Manzotti 2010, p. 246 e revisione superata di LS: fase 3.
- **Note — effetti sulla vista:** in `build_geojson.py:403` hanno tessera propria solo
  i luoghi **non** Imported. Passando a Imported l'edicola perde la tessera e, se non
  ancorata, finisce fra gli esclusi (`excludedUnanchored`): **sparisce dalla mappa**.
  L'ancoraggio è quindi obbligatorio nello stesso task. Va anche deciso il destino di
  `Is_Part_Of`: un luogo Imported parte di un luogo Imagined è incoerente, e
  `isPartOf` (`chora.ttl:404-411`) impone di ereditare l'ancoraggio dal padre. I
  `voidSeeds` congelati (D-012, `data/source/void_seeds.json`) coprono 48 tessere: ogni
  variazione dell'insieme delle tessere va verificata sul layout.

### T-04 · Inversione Invented ↔ Imagined (DM-01) — DECISO sul modello, DA VERIFICARE caso per caso

> **Superato l'8/10/2026:** Lorenzo ha deciso una permutazione completa (WO v1.2, T-04;
> DATA_CHECKS v1.5, DM-01, DC-16). La tabella «indizi» qui sotto resta come documentazione
> dello stato di partenza; non guida più le modifiche.

- **TBox (sorgente `chora.rdf`):**
  - `chora.rdf:1351`: `chora:Imagined` ha la definizione «An invented setting within
    familiar geographical reality»; `chora.rdf:1408`: `chora:Invented` ha «There is no
    hint at all about the position…». Le stesse in `chora.ttl:527` e `:654-655` (derivato).
  - `chora.rdf:352` / `chora.ttl:377`: commento di `hasRealityStatus` con l'ordine
    «imported, transformed, imagined, invented».
  - `chora.rdf` ~1505-1512 / `chora.ttl:721-729`: `RealityStatusScheme` senza ordine
    (`skos:notation` assente).
  - Asimmetria minore: `owl:differentFrom` di Imported non include Imagined
    (`chora.rdf:1363-1364`), quello di Invented include solo Transformed
    (`chora.rdf:1406`).
- **Altri file:** `ontology/shapes/chora-shapes.ttl:185` (`sh:in`, ordine da allineare);
  `data/source/mapping.yaml:39-43`; `README.md:111,129`;
  `ontology/docs/vocab_realitystatus.html` (derivato, `make docs`);
  `_archivio/chartD.js:219-237` (glifi), `:4930-4935` (qualunque statuto diverso da
  transformed/imagined finisce sul glifo «invented»: fallback silenzioso).
- **Proposta TBox:** scambiare le `skos:definition`, aggiungere `skos:notation` 1–4
  (Imported, Transformed, Invented, Imagined) e un `skos:scopeNote` con Reuschel,
  Piatti e Hurni 2013, pp. 138–139; riscrivere il commento di `hasRealityStatus`;
  completare i `differentFrom`. Attenzione: il commento di `hasRealityStatus` («invariant
  property of the place…, NOT dependent on … interpretation») va rivisto anche per T-30.
- **Dati — i 20 luoghi** (indizio dai dati, non decisione: ogni riga va confermata sul
  testo e motivata in `DECISIONS.md`):

| Luogo (riga NP) | Oggi | Ancoraggio attuale | QP | Atteso WO | Indizio |
|---|---|---|---|---|---|
| roccafringoli (177) | Invented | gaz_monte_manno, relative | 107, 142 | Invented | conferma |
| monte_nuncupale (107) | Invented | gaz_colli_albani | 173 | Invented | conferma |
| casa_del_butiro (37) | Invented | gaz_due_santi, relative | 193 | Invented | conferma (descrizione dice «immaginata») |
| scerpure (216) | Invented | gaz_brahmaputra, relative | 140–141 | Invented | conferma |
| castel_porcano (44) | Invented | gaz_castel_porziano, overlaps | 213 | T-14 | v. T-14 |
| tor_di_gheppio (233) | Imagined | gaz_quarto_di_santa_fumia ×13 | 295–302 | Invented | posizione data → Invented |
| casa_crocchiapani (36) | Imagined | nessuno; parte di tor_di_gheppio | 299, 302 | — | segue il padre → Invented |
| laboratorio_zamira (89) | Imagined | gaz_due_santi ×19 | 155–247 | Invented («bettola della Zamira») | → Invented |
| casuccia_zamira (47) | Imagined | gaz_due_santi | 207 | Invented | → Invented |
| orto_vigna_due_santi (115) | Imagined | nessuno | 216 | — | posizione data («di fronte… lato opposto della via Appia») → Invented |
| edicola_due_santi (68) | Imagined | nessuno | 216, 219 | Imported (T-03) | v. T-03 |
| castello (46) | Imagined | nessuno; **0 occorrenze** (IQ9) | — | T-13 | v. T-13 |
| cassero (40) | Imagined | gaz_frattocchie + gaz_pavona | 169 | — | posizione data → Invented? |
| cantinone_albano (34) | Imagined | gaz_albano_laziale, indeterminate | 67–78 | — | → Invented? |
| grotta_de_sor_pippo (85) | Imagined | gaz_marino | 55 | — | → Invented? |
| bottega_ceccherelli (23) | Imagined | gaz_roma | 132–133 | — | → Invented? |
| villino_lungotevere (307) | Imagined | gaz_lungotevere_prati | 105 | — | → Invented? |
| pozzofondo (159) | Imagined | gaz_valle_fondo, indeterminate | 221 | — | da leggere |
| pensione_burgess (131) | Imagined | gaz_porta_pinciana | 189, 291 | — | descrizione: «possibile deformazione di Pensione Villa Borghese» → Transformed? |
| via_delle_oche (270) | Imagined | gaz_milano + gaz_bologna | 22 | — | unico candidato Imagined plausibile |

  Esito atteso se gli indizi reggono: quasi tutti i 15 Imagined passano a Invented, il
  che conferma Cap. 4 r. 85 («molto più ardua … la reperibilità d'un luogo integralmente
  immaginato»). I conteggi 260/29/15/5 cambieranno in modo sostanziale: ricalcolarli in
  `DATA_CHECKS` e nel Cap. 4 se citati.
- **Interfaccia:** nessuna legenda di statuto esiste ancora (né nel prototipo né in
  `app/src/`). L'ordine e il mapping statuto → glifo vanno decisi prima del porting di
  `s4Config` (v. premessa 4).

### T-10 · Palazzo di via Merulana 219 — DA DECIDERE

- **File/righe:** `NarrativePlaces.tsv:120` (palazzo_219); interni Transformed con
  `Is_Part_Of = palazzo_219`: `:132` piani_alti_219, `:213` scale, `:214` scala_a, `:215`
  scala_b, `:229` terzo_piano_219.
- **Stato:** Transformed, ancorato (ereditato) a `gaz_via_merulana`; 21 occorrenze, 31
  interpretazioni. `Alternative_Toponym` contiene già «palazzo dell'oro; palazzo de li
  pescicani; casermone color pidocchio; …» (separatori incoerenti `;` / `; `).
- **Opzioni:** come WO. Se (a) Invented: anche i 5 interni andrebbero rivisti (oggi
  Transformed), altrimenti un Transformed è parte di un Invented.
- **Varianti 119→219, «degli ori»→«dell'Oro»:** fase 2 (T-41).

### T-11 · Palazzo Simonetti / via Lanza — DA DECIDERE

- **File/righe:** `NarrativePlaces.tsv:126` (palazzo_simonetti, Imported, nessuna
  descrizione), `:278` (via_lanza, label «Via Lanza » con spazio finale);
  `References.tsv:436-437` (QP 177), `:675` (QP 292); `SpatialInterpretations.tsv:507`
  (palazzo_simonetti → **`gaz_via_lanza`**), `:508`, `:842-844`;
  `GazetteerEntities.tsv:1607` (gaz_palazzo_simonetti), `:3722` (gaz_via_lanza).
- **Stato:** `gaz_palazzo_simonetti` ha `Present_Location` «Via Vittoria Colonna, 13»
  e coordinate in Prati: è già, implicitamente, la lettura di Terzoli, ma **nessuna
  interpretazione vi è ancorata**. Il WO indica il civico 11 (pensione White): 11 o 13
  da verificare. Nessun `sameAs` riguarda Simonetti (premessa 6).
- **Proposta (se approvata):** via_lanza resta Imported (correggere la label);
  palazzo_simonetti → Invented con motivazione; `gaz_palazzo_simonetti` diventa il
  candidato Terzoli, una nuova `gaz_palazzo_simonetti_via_lata` il candidato Pinotti
  (dtsFG). Le due identificazioni attribuite: fase 3. Effetto vista: passando a
  non-Imported il palazzo acquista una tessera propria (nuovo `voidSeed`).

### T-12 · Correzioni di lezione sul cartaceo — DA VERIFICARE

- **Stato:** 722 estratti, tutti con prefisso «A» (`Source_Reference`), colonna `Notes`
  sempre vuota: nessuna traccia di verifica sul cartaceo.
- **Proposta:** generare (in fase 1, come report e non come modifica) la lista di
  controllo prioritaria: estratti dei 49 luoghi non Imported, forme dialettali (regex
  su `li |delli |alli |de |der `), nomi deformati (Castel Porcano/Porcino, «Casale
  Abbrusciato» `References.tsv:696`, «Tor der/de Gheppio» `:706,720`). Coincide con T-56.

### T-13 · «Castello» / stazione di Castello — DA DECIDERE

- **File/righe:** `NarrativePlaces.tsv:46` (castello), `:219`
  (stazione_carabinieri_castello, Transformed), `:43` castel_gandolfo, `:45`
  castel_savello; `References.tsv:652` (QP 279), `:414` (QP 173, «Castel Savelli»);
  `SpatialInterpretations.tsv:802-803`; `GazetteerEntities.tsv:515,565`; `tools/etl.py:671-674`;
  `data/source/mapping.yaml:320-322`; `FocalizingAgents.tsv` (militi_castello).
- **Stato:** `castello` è un luogo **senza occorrenze** (IQ9) e senza tessera; la
  stazione è ancorata **direttamente** a `gaz_castel_gandolfo`, non a `gaz_castello`;
  `gaz_castello` non ha interpretazioni ed è fra le 13 entità fuori mappa. La coppia
  `sameAs` castello ↔ castel_gandolfo è quindi ridondante con l'ancoraggio.
- **Proposta:** (1) **bug ETL subito (fase 1):** in `etl.py:674` risolvere l'id nel
  namespace `gazetteer/` oppure, coerentemente con DM-06, smettere di emettere
  `owl:sameAs` dalla colonna `sameAs` (che `mapping.yaml:320` documenta come «link
  esterno Wikidata/Geonames», uso diverso da quello reale). (2) Decidere se eliminare il
  luogo orfano `castello` o farne il bersaglio delle due identificazioni. (3)
  Identificazioni LS/Manzotti: fase 3. (4) Forme: «Castel Savelli» come forma attestata
  di `castel_savello` (premessa 8).
- **Note:** togliere i `sameAs` tocca anche D-011 (tre fonti di alias) e
  `tools/build_geojson.py:100-128`: la proposta D-009 di derivare `MERGE_MAP` dai
  `sameAs` decade se i `sameAs` spariscono. Serve una voce in `DECISIONS.md` che
  aggiorni D-009 e D-011.

### T-14 · Castel Porcano / Castel Porcino — DA DECIDERE

- **File/righe:** `NarrativePlaces.tsv:44`; `References.tsv:539-540` (QP 213);
  `SpatialInterpretations.tsv:648-649`; `GazetteerEntities.tsv:532`.
- **Stato:** Invented; `Alternative_Toponym` «castel porcino» (minuscolo); entrambe le
  interpretazioni: Pestalozzi, ProjectedSpace, Indeterminate, `overlaps`
  `gaz_castel_porziano`. Castelporziano **esiste** (premessa 5).
- **Proposta:** l'opzione (a) del WO è già quasi realizzata: basta lo statuto Imagined
  motivato, trasformare l'ancoraggio `overlaps` in relazione attribuita a Manzotti (fase
  3) e normalizzare le forme attestate (T-48). L'opzione (b) richiederebbe un nuovo
  luogo e lo smistamento delle due occorrenze.

### T-15 · Casal Bruciato e casello km 20,25 — DA VERIFICARE · **priorità alta**

- **File/righe:** `GazetteerEntities.tsv:467`; `NarrativePlaces.tsv:38` (casal_bruciato,
  «Quartiere di Roma»), `:39` (casello_km_20_25, Transformed), `:28`
  (camera_casello), `:129` (passaggio_livello_casal_bruciato), `:18` (bivio);
  `SpatialInterpretations.tsv:644,684,712,752,779,903-906,931-932,949-950` e `:713-794`
  (22 interpretazioni del casello).
- **Stato:** `gaz_casal_bruciato` è a 41.9070, 12.5506: il **quartiere di Casal Bruciato
  a Roma (Tiburtino)**, non la località tra le ferrovie Roma–Velletri e Roma–Napoli
  presso il Divino Amore (circa 25 km più a sud). Il casello e i suoi 22 ancoraggi
  ereditano la posizione sbagliata. È un errore di referente, non un'incertezza fra
  repertori.
- **Proposta:** fase 1: correggere coordinate e descrizione (con fonte TCI o IGM in
  `Authority_Source`) e verificare l'effetto sulla tassellazione. Fase 3: le due
  posizioni alternative TCI/IGM attribuite (Manzotti 2010, pp. 268–270). Il casello
  resta luogo senza toponimo (R06); valutare se Transformed sia lo statuto giusto.

### T-16 · Altri casi del Cap. 4

| Caso | File/righe | Stato verificato | Proposta |
|---|---|---|---|
| Tenenza di Marino | NP `:228`; 27 interpretazioni → `gaz_marino` | Transformed; descrizione errata («Stazione di Polizia di Marino») | correggere descrizione; motivazione Manzotti pp. 239, 293 (fase 3) |
| Due Santi | NP `:67`; 30 interpretazioni | Imported; nessuna forma «li Du Santi» registrata, pur presente in 7 estratti | forme attestate (T-48) |
| Faiti / Cengio (QP 61) | NP `:66`, `:103`; Ref `:145-146`; SI `:169-170` | lo stesso passo è spezzato in **due** riferimenti, uno per monte; nessun legame fra i due | un solo riferimento con due bersagli (referenza plurale, T-47); letture sulla memoria: fase 3 |
| Roccafringoli, Nuncupale, Scerpure | v. T-04 | Invented | confermare |
| Tor di Gheppio | NP `:233` | Imagined, ancorato ×13 | → Invented (T-04); Cortellessa come nota |
| Pavona, percorso proposto (QP 298) | Ref `:702,706,715`; nessuna route | non esiste un tragitto per QP 298 | v. T-54 |
| Ernici o Simbruini (QP 215) | Ref `:542`; SI `:652` + `interp_00650` → `gaz_monti_simbruini` | disgiunzione resa come due ancoraggi, senza tipo | tipo «non-specificità» (T-34) |
| Càrsoli (QP 210) | NP `:35` «Carsoli»; Ref `:523-524` | **bug:** `interp_00627` punta a `ref_00522` (Tivoli) e `interp_00628` a `ref_00523` (Càrsoli) con luoghi scambiati | correggere in fase 1; poi discrepanza «svista» (T-34) |
| Direttissima Roma–Napoli | NP `:63` | Imported, nessuna nota | discrepanza «anacronismo» (T-34) |
| Sciarpa narrata due volte | — | nessuna traccia nei dati | discrepanza interna (T-34) |
| Mercato di piazza Vittorio | NP piazza_vittorio_emanuele; `GazetteerEntities.tsv:1879` | nessun luogo «mercato»; nessuna validità temporale | T-46 |
| Ines: Campo de' Fiori → piazza Vittorio | NP campo_de_fiori (Ref QP 102) | il dataset ha solo QP | variante di testimone (T-41) |
| Scale A/B, «in faccia» | NP `:214-215` | `isPartOf` palazzo_219; `above` usato 1 volta in tutto il dataset | T-53 |
| Santa Maria Maggiore (QP 292) | Ref QP 280, 292 | presente | nota attribuita (fase 3) |
| Nuvole (QP 175, 210, 213, 292–293) | — | il cielo non è un luogo nel modello; QP 175 ha solo Ciampino e Santa Palomba | decidere se modellabile o esclusione (R12) |
| «Mappa o plastico» (QP 211) | Ref `ref_00530` (porta_san_paolo) | registrato come occorrenza di Porta San Paolo | evento di cambio di scala (T-52) |
| Menegazzi / Zamira | — | assente | esclusione dichiarata (T-70) |
| «Vortice» (QP 12–13) | — | nessun riferimento a QP 12–13 | NotApplicable (T-35) |
| *Ingravola in campagna* | — | fuori corpus | T-42 |

### T-30 · Asserzioni attribuite — DA DECIDERE

- **Stato:** `SpatialInterpretation` è già `rdfs:subClassOf prov:Entity`
  (`chora.ttl` blocco SpatialInterpretation, ~r. 751) e porta `prov:wasAttributedTo`,
  `prov:generatedAtTime`, `chora:criticalNote`. Nella TBox esistono già, **inutilizzate**
  (0 triple), `chora:evidenceSource` (langString) e `chora:interpretationType` (string).
  `hasRealityStatus` sta sul luogo, non su un'asserzione (`mapping.yaml:259-263`, nota
  v4.1.1 a `:395-396`).
- **Proposta:** l'opzione 1 del WO è coerente con il modello esistente. Prima di
  scriverla serve la decisione «Protégé o Turtle canonico» (premessa 1). Sorgente dati
  proposta: un nuovo foglio `Assertions.tsv/.xlsx` + blocco in `mapping.yaml` + regola
  nell'ETL; `evidenceSource` e `interpretationType` vanno riusate o deprecate, non
  duplicate.

### T-31 · Identificazioni senza `owl:sameAs` — DECISO (dopo T-30)

- **Stato:** 6 triple (3 coppie simmetriche), v. premessa 7 e T-13. Nessun caso di
  coreferenza tecnica: tutti e tre sono giudizi d'identità o fusioni di alias.
- **Proposta:** fase 1: correggere solo il bug IRI (o sospendere l'emissione). Fase 2:
  sostituire le 3 coppie con IdentificationAssessment; aggiornare D-009/D-011.

### T-32 · Agenti — DECISO

- **Stato:** un solo agente, `annotator/lorenzo_sabatino`, presente solo come oggetto
  di `prov:wasAttributedTo` (nessuna tripla di tipo `prov:Agent`). 801 interpretazioni
  su 962 senza annotatore. `prov:Agent` è dichiarata nella TBox.
- **Proposta:** foglio `Agents` (studiosi + LS) con chiave APA; ruolo encoder di LS
  via `prov:qualifiedAttribution`; attribuire a LS anche le 801 interpretazioni
  oggi anonime (da confermare: sono tutte sue?).

### T-33 · Motivazione dello statuto — DECISO

- **Stato:** nessuna colonna di motivazione in `NarrativePlaces.tsv` (le colonne sono
  `Description`, `Notes`); `Notes` è usata in modo eterogeneo (es. Rocca Orsina, r. 173).
- **Proposta:** dipende da T-30. Nel frattempo, nessuna modifica.

### T-34 · Incertezza tipizzata — DECISO (vocabolari), DA DECIDERE (decimali)

- **File/righe:** `chora.ttl:317-319` (`confidence`, senza label né commento),
  `:348-354` (`hasFuzzinessLevel`, commento «invariant property of the place»);
  `chora-shapes.ttl:131-136`, `:208-211`; `mapping.yaml:296-297`, `:482-483`;
  `tools/build_geojson.py:212,228,310,341`.
- **Stato:** il prototipo **non usa** né `confidence` né `fuzziness` né
  `determination` (nessuna occorrenza in `chartD.js`): rimuoverli non ha effetti visivi.
  `build_geojson.py:341` imputa `confidence = 1.0` quando manca (795 interpretazioni):
  un default numerico implicito, contro DM-05.
- **Proposta:** se si sceglie di rimuovere: togliere le due colonne dal mapping, le
  proprietà dalla TBox (o `owl:deprecated true`), gli shape, i campi del GeoJSON.

### T-35 · Astensione a tre valori — DECISO

- **Stato:** 123 interpretazioni senza `SpatialDetermination`; 54 Indeterminate; 74
  interpretazioni senza ancoraggio; nessun modo di distinguere «non analizzato» da
  «sospeso» da «non applicabile».
- **Proposta:** schema SKOS + colonna `Localization_Status` in `SpatialInterpretations`
  + shape che vieta ancoraggio assente senza stato. Revisione dei 54 Indeterminate e
  delle 123 vuote: elenco da produrre in fase 2.

### T-36 · Livelli enunciativi — DECISO

- **Stato:** `hasFocalizer` obbligatorio (shape r. 48-52) su 962/962. `narratorType` è
  usata **una sola volta** (narrator, «onnisciente-eterodiegetico»): 82 focalizzatori
  su 83 sono Character. Nessuna voce né tempo del racconto.
- **Proposta:** colonne `Narrating_Voice`, `Narrative_Time` in `SpatialInterpretations`;
  `MemoryAttributionAssessment` dentro T-30.

### T-37 · Partizioni città/campagna — DECISO

- **Stato:** nessuna entità «campagna» o «città» come partizione. L'unico luogo che la
  nomina è `strada_di_campagna_celio` (Transformed). Le bande `nazionale/periurbano/
  urbano` di `build_geojson.py` sono una partizione **metrica** (distanza dal centro),
  da non confondere con la partizione interpretativa.
- **Proposta:** PartitionAssessment in T-30; dichiarare nella documentazione che le
  bande di distanza non sono una partizione città/campagna.

### T-38 · Storia delle revisioni — DECISO

- **Stato:** `prov:generatedAtTime` su 150 interpretazioni (data annotazione);
  `owl:versionInfo "1.0.0"` solo sulla TBox (`chora.ttl:252-253`); nessuna versione
  del dataset nel TTL, solo `meta.buildVersion "4.3"` nel GeoJSON. Nessun changelog
  per asserzione.
- **Proposta:** `dcterms:hasVersion` sul dataset; script di diff fra due TTL (nuovo
  `tools/diff_assertions.py`) in fase 2.

### T-40 · Opera e testimoni — DA DECIDERE

- **File/righe:** `LiteraryWorks.tsv:2-4`; `Chapters.tsv` (tutti i capitoli →
  `quer_pasticciaccio_adelphi`); `mapping.yaml:576`.
- **Stato:** `quer_pasticciaccio` («Garzanti 1957 (ed. definitiva)»),
  `quer_pasticciaccio_letteratura` (Notes: «… dal 1946 al 1948» → **DC-05 confermato**),
  `quer_pasticciaccio_adelphi`. Nessuna relazione fra i tre.
- **Proposta:** DC-05 si corregge subito in fase 1 (Notes: fascicoli 26–29 e 31 del
  1946). Il modello opera/testimoni attende la decisione.

### T-41 · Varianti di testimone — DECISO (modello)

- **Stato:** nessuna occorrenza fuori da QP; nessuna proprietà per i testimoni.
- **Proposta:** dopo T-40/T-44. Casi del Palazzo degli ori: in attesa di Lorenzo.

### T-42 · Occorrenze non-QP — DECISO

- **Stato:** non ce ne sono; vincolo da aggiungere come integrity query quando
  compariranno.

### T-43 · Nessuna diacronia nell'interfaccia — DECISO

- **Stato:** nessuna diacronia nel prototipo né in `app/src/`. Resta da dichiararlo in
  `docs/EXCLUSIONS.md` (inesistente, T-70).

### T-44 · `appearsInWork` → `appearsInWitness` — DA DECIDERE

- **File/righe:** `chora.rdf:264`, `chora.ttl:277-281`; `mapping.yaml:209-211`;
  `chora-shapes.ttl:242-245` (minCount 1); `ontology/queries/integrity.rq` IQ6.
- **Stato:** 722/722 → `quer_pasticciaccio_adelphi`.

### T-45 · Temporalità — DA DECIDERE

- **Stato:** nessuna proprietà temporale oltre a `prov:generatedAtTime` (che è la data
  di annotazione, non un tempo del testo).

### T-46 · Repertorio datato — da verificare

- **File/righe:** `GazetteerEntities.tsv` colonna `Authority_Source`;
  `chora.ttl:383-389`, `:437-442`.
- **Stato:** `Authority_Source` è **vuota in 265 righe su 265** e non è mappata
  nell'ETL. `historicalLocation` presente in 19 entità, `presentLocation` in 125, come
  stringhe. Nessuna data di validità.
- **Proposta:** mappare `Authority_Source` (fonte + anno) e aggiungere `Valid_From/To`;
  popolamento progressivo, prima i casi del Cap. 4 (TCI 1925, IGM, mercato di piazza
  Vittorio).

### T-47 · Molti-a-molti

- **Stato:** referenza plurale (Faiti/Cengio) = due riferimenti separati; ancoraggio
  relazionale (Robine) = due ancoraggi `near`; identificazione contesa (Castello) =
  `sameAs`; disgiunzione (Ernici/Simbruini) = due ancoraggi. Le quattro relazioni del Cap.
  4 r. 93 sono oggi **indistinguibili** nei dati.
- **Proposta:** tipizzare la relazione (proprietà o asserzione) in fase 2.

### T-48 · Forma attestata / normalizzata

- **Stato:** `skos:altLabel` su 53 triple; `Alternative_Toponym` popolato in 11 luoghi,
  separatori incoerenti, maiuscole incoerenti. «via de' Merli» e «palazzo der Mappamonno»
  sono **luoghi distinti** (`via_de_merli`, `palazzo_del_mappamondo`), mentre il Cap. 4
  r. 93 tratta «via de' Merli» come odonimo concorrente di via Merulana. Nessuna forma
  attestata sulla PlaceReference.
- **Proposta:** colonna `Attested_Form` in `References`; decidere se via de' Merli resta
  un luogo autonomo (si collega a D-011, `ALIAS_GROUPS` la fonde con via Merulana).

### T-49 · Luoghi senza toponimo

- **Stato:** orto/vigna (`:115`, QP 216) e casello (`:39`, QP 241) presenti; «torri
  senza nome» (QP 211–212) assenti.
- **Proposta:** verificare le torri sul testo; nessuna modifica prima.

### T-50 · Scale

- **Stato:** `isPartOf` transitiva su 11 luoghi (palazzo_219 e interni; catena
  edicola → orto → laboratorio → casuccia). Nessuna relazione di scala non inclusiva;
  la nota critica di `interp_00169` (Cengio) descrive lo slittamento ma solo in prosa.
- **Proposta:** nuova proprietà figurale (fase 2).

### T-51 · Asse testuale

- **Stato:** edizione (sempre Adelphi), capitolo (`mentionedInChapter`), pagina
  (`Page_Count` + `sourceReference "A n"`). **Nessun identificativo di segmento.**
- **Proposta:** decidere l'unità (periodo) e l'id stabile (es. `QP-241-03`); necessario
  anche per T-55.

### T-52 · Cambi di scala attribuiti

- **Stato:** assente (v. T-16, `ref_00530`).

### T-53 · Relazioni qualitative

- **File/righe:** `chora.ttl:721-…` (`SpatialRelationTypeScheme`, 8 concetti);
  `chora-shapes.ttl:89` (`sh:in`); `mapping.yaml:179-…`.
- **Stato:** uso: inside 160, near 44, overlaps 18, adjacentTo 7 + «adjacentto» 3
  (maiuscole incoerenti nel foglio), above 1; 729 vuote.
- **Proposta:** aggiungere Threshold, Facing, Boundary in TBox, shape e mapping.

### T-54 · Percorsi tipizzati — DA DECIDERE (Castel de Leva)

- **Stato:** 18 `NarrativeRoute` senza tipo e senza foglio proprio (create dall'ETL da
  `Spatial_Component_Of`, `mapping.yaml:436-461`). Fra queste
  `tragitto_torraccio_ponte_divino_amore` mescola nodi di QP 169 e QP 297 (5
  focalizzatori, ordine parziale): va verificato se sia un percorso o due. Nessun
  tragitto per QP 212, 237, 274, 298; `tragitto_marino_albano_laziale` (QP 278) è il
  candidato «direzionale». `corteo_funebre` è un focalizzatore collettivo, non un oggetto.
- **Cap. 4:** r. 194 (R18) e r. 303 (P4) usano «presunto»; r. 176 elenca «percorso noto
  soltanto come direzione»; r. 218 «direzione presunta». Va scelta un'etichetta unica.
- **Castel de Leva — evidenza dai dati:** QP 237 (`References.tsv:569`) è un dialogo
  («Quale passaggio?» «Pe la strada de Castel de Leva…»), focalizzatrice Camilla
  Mattonari: è un **percorso indicato**, come dice r. 176. Il percorso sognato è QP 212
  (`References.tsv:535`, «al passaggio a livello di Casal Bruciato il vetrone
  girasole…», Pestalozzi), che r. 176 voce 3 descrive correttamente. L'incoerenza sta
  in Cap. 4 r. 105, che attribuisce la citazione di QP 237 al sogno. Proposta per
  Lorenzo: correggere r. 105 nel capitolo (citare QP 212); nei dati, QP 237 = indicato.

### T-55 · Policy degli estratti — soglia DA DECIDERE

- **File/righe:** `NOTICE-EXCERPTS.md:22-24`; `tools/build_passages.py` (tetto 700
  caratteri).
- **Stato:** 722 estratti; mediana 141 caratteri, p90 261, massimo 573 (93 parole).
  Oltre 200 caratteri: 133; oltre 300: 55; oltre 400: 18; oltre 500: 1. Nessun estratto
  supera il tetto attuale.
- **Proposta:** scegliere la soglia (es. un periodo o 300 caratteri) e produrre il
  report degli estratti oltre soglia; il tetto di `build_passages.py` va allineato.

### T-56 · Controllo a campione — DA VERIFICARE

- Come T-12. Il campione richiede il volume a stampa: fuori dalla portata di Claude.

### T-60 · Letture concorrenti nell'interfaccia — DECISO (interazione), DA DECIDERE (grafica)

- **Stato:** `app/src/main.js` è un'impalcatura di 42 righe (stampa contatori); il
  prototipo non ha alcun segnale di contesa. Il GeoJSON non trasporta asserzioni.
- **Vincolo cromatico da segnalare:** `ROLE_COLORS.Setting` #B32B40
  (`chartD.js:37`, `tokens.css:13`) è un rosso vicino a `HUE_RGB` #9B2335 (densità);
  `ROLE_COLORS.ProjectedSpace` #1F6F6B è **identico** a `FICT_HUE_RGB` (densità dei
  luoghi fittizi, `chartD.js:32`). Gli invarianti «rosso = densità» e «tinte = ruolo»
  sono già in conflitto nel prototipo: va deciso prima di aggiungere un altro canale.

### T-61 · Canale della SpatialDetermination — DA DECIDERE

- **Stato:** la determinazione arriva al GeoJSON (`determinations` per feature,
  `build_geojson.py:390`) ma il prototipo non la disegna. Nessun conflitto con codice
  esistente.

### T-62 · Pannello «Fuori carta» — DECISO

- **Stato:** assente. Oggi i fuori carta sono 13 GazetteerEntity senza interpretazioni
  e 14 NarrativePlace mai interpretati (`audit_alignment.py`, IQ9); il GeoJSON dichiara
  `excludedUnanchored: 0`. Dipende da T-35.

### T-63 · Regola di aggregazione — DECISO

- **Stato:** la regola esiste già nei dati: `meta.countingRule` e `meta.reliefBands`
  (base log 1.47, 9 bande) nel GeoJSON; non è mostrata nell'interfaccia.
- **Proposta:** leggerla da `meta` e mostrarla in legenda (fase 5).

### T-64 · Percorsi non compiuti — DA DECIDERE

- **Stato:** il prototipo disegna come linee tutte le 18 route (`s4AttestedRoutes`,
  `chartD.js:2269-2367`), indistintamente. Le 103 `derivedSequences` del GeoJSON non
  sono usate dal prototipo.

### T-65 · Legenda e ordine degli statuti

- **Stato:** nessuna legenda di statuto (v. T-04). Ordine dei glifi nel codice:
  transformed, imagined, invented.

### T-66 · Stringhe UI

- **Stato:** l'interfaccia non ha ancora testi (impalcatura). Il README (r. 105-135)
  sì: va riletto con T-73.

### T-67 · Data adapter

- **Stato:** `tools/build_geojson.py` è l'adapter (803 righe, query SPARQL r. 208-228).
  Nessun campo per asserzioni, agenti, revisioni, incertezza, astensione, tipo di
  percorso. `hasDefaultTarget`/`hasTarget` non esistono nella TBox.

### T-70 · Esclusioni — DECISO

- **Stato:** `docs/EXCLUSIONS.md` non esiste. `CLAUDE.md:105` lo cita già.

### T-71 · Query di integrità R01–R22

- **Stato:** `ontology/queries/integrity.rq` ha 10 query (IQ1–IQ10) di forma, nessuna
  legata a un requisito. IQ3 non intercetta gli IRI `sameAs` rotti (non controlla
  `owl:sameAs`). Header «GaddAtlas v4.1»: datato.

### T-72 · Competency query P1–P8

- **Stato:** `ontology/queries/competency.rq` ha CQ1–CQ12, non mappate sulle P. CQ3
  (statuto × determinazione) è già il nucleo di P6. Header «v4.1» e riferimento a
  `gaddatlas_v4_1_full.ttl`: datati.

### T-73 · pyLODE / README / mapping

- **Stato:** `make docs` rigenera `ontology/docs/*.html`. Da rifare dopo ogni modifica
  alla TBox (T-04 in fase 1).

### T-74 · Grafia tesi ↔ dati

- **Stato:** «Via Lanza » (`NarrativePlaces.tsv:278`); spazi finali anche in «Palazzo »
  (`palazzo`), «Piazza Colonna », «Via dei Greci »; id `vicenza ` con spazio finale in
  `interp_00245`; ancoraggio `gaz_brahmaputra` seguito da uno spazio non separabile
  (U+00A0) nelle interpretazioni di Scerpure. «Dosso Faiti» è uniforme nei dati.
  «Castel Savelli/Savello»: v. premessa 8.
- **Proposta:** pulizia in fase 1, una voce di `DECISIONS.md`.

## 3. Difetti collaterali trovati (fuori dal work order)

1. **Riferimento e interpretazione con luoghi diversi** (6 casi):
   `interp_00245` (vicenza / «vicenza »), `interp_00331` (ref piazza_verdi → luogo
   banca_ditalia), `interp_00627`/`interp_00628` (Tivoli/Càrsoli scambiati),
   `interp_00858` (ref tenenza → luogo marino), `interp_00859` (ref
   via_massimo_dazeglio → luogo marino). Nessuna query li intercetta: proposta una IQ11.
2. **DC-13 confermato:** `annotationMethod` «close_reading» 143, «close reading» 2.
3. **Regressione D-009 / percorso personale nel RDF pubblicato:** premessa 7.
4. **`app/public/data/` non sincronizzata:** premessa 10.
5. **Fallback silenzioso del glifo:** `chartD.js:4935` disegna «invented» per qualunque
   statuto non riconosciuto.
6. **`build_geojson.py:341`** imputa confidence 1.0 dove manca.

## 4. Proposta per la fase 1 (in attesa di approvazione)

In ordine, un task per volta, ciascuno chiuso da manifest, `make all && make audit` e
SHACL (report fuori da `data/dist/` o accettandone la rigenerazione):

1. Bug ETL `sameAs` (`etl.py:671-674`) + voce che aggiorna D-009 — prerequisito di tutto,
   perché oggi ogni build produce un TTL dipendente dalla macchina.
2. T-01 (Frattocchie) + copia in `app/public/data/`.
3. DC-05 (Notes di `quer_pasticciaccio_letteratura`).
4. Collaterali 1, 2 e T-74 (pulizia di id, label, maiuscole).
5. T-15 (coordinate di Casal Bruciato).
6. T-04 TBox (definizioni, notazioni, commento) in `chora.rdf`, poi revisione dei 20
   luoghi **uno per uno**, con la tabella sopra come punto di partenza e una motivazione
   per riga.
7. T-03 (edicola) insieme alla sua GazetteerEntity e al nodo `isPartOf`.
8. T-02 solo dopo la verifica sul volume.

**Decisioni che servono prima della fase 1:** sorgente canonica dei dati (XLSX o TSV) e
della TBox (`chora.rdf` finché §4 non è deciso); destino del luogo orfano `castello`;
`Is_Part_Of` dell'edicola dopo T-03.
