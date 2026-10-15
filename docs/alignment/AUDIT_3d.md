# AUDIT_3d — Fase 3d: statuti dei casi vicini (Terzoli 2015) e indice di forma (sola lettura)

**15 ottobre 2026** · ramo `fase3d-statuti-forme` da `main` a `aa091fe` (merge della 3c, PR #6) · audit in sola lettura, nessuna sorgente modificata, nessun commit.

Decisioni da applicare: Lorenzo, 15/10/2026. Fonte: Terzoli 2015 (`terzoli_2015`; agente `terzoli`, entrambi esistenti). Prossimo numero libero: **D-092**.

---

## A1. Stato di partenza

Su `main` dopo il merge della 3c, dopo `make all` senza diff:

| | |
|---|---|
| Triple | TBox 1.620 · ABox 43.071 · full **45.261** |
| Luoghi | 313: Imported 262 · Transformed 31 · Invented 20 · Imagined 0 |
| Gazetteer | 269 entità (4 senza coordinate); 253 con feature, 16 senza interpretazioni |
| Occorrenze | 744 (738 QPa) |
| Interpretazioni | 968, tutte adottate (nel TSV 968 righe; `interp_00973` non esiste) |
| Letture attribuite | 424 (165 esplicite, 259 generate) |
| GeoJSON | 304 feature, 51 tessere proprie, 937 righe di rilievo |
| P-0001 | 224 membri (163 Roma città, 61 campagna romana) |
| Controlli | SHACL conforme, 0 risultati; IQ1–IQ21 a 0 (IQ9 informativa, 13); audit superato (300/300 luoghi annotati nel GeoJSON); test dell'app 9/9 |

---

## A2. Indice di forma (DC-33)

**Dove la posizione entra oggi nel disegno.** I punti sono due, non uno:

1. **Forma della cella narrativa:** `app/src/model/narrative-geometry.js:115-118`, `seedFor(i) = max(1, floor(voidSeed · 0xFFFFFF) XOR i)`. Lo usano `perturbedTile`, per le tessere proprie e i figli (r. 171, 224). `i` è la posizione in `allData`: le referenziali in mappa, poi quelle fuori mappa, poi le fittizie (ordinate per occorrenze e id, `entities.js:92-104`).
2. **Rilievo (isolinee) delle tessere referenziali:** `app/src/atlas.js:945-946`, `seed = isFict ? voidSeed : (i · 0,6180339887) mod 1`. Il seme sposta la cima e fa ruotare le isolinee (`render/iso-engine.js:53-56`, `render/painters.js:189`). Per le fittizie il seme è già `voidSeed`, quindi congelato; per le referenziali dipende dalla posizione.

`projection-fit.js:53` usa `voidSeed` per l'azimut delle fittizie: non dipende dall'indice.

**Effetto in questa fase.** Entra in carta una sola entità nuova, `gaz_via_delle_oche_milano`, oltre i 100 km, quindi fuori mappa. `gaz_campidoglio` non ha coordinate né interpretazioni e non diventa feature. `gaz_bologna` resta, perché ha altre due interpretazioni adottate. Le entità in mappa non cambiano: `gaz_roma` è già una feature. L'entità nuova sposta di uno:
- tutte le fittizie (`N_GEO` 249 → 250): per il punto 1, senza correttivo, cambierebbe la forma di tutte le celle;
- le tessere fuori mappa che la seguono nell'ordinamento. Stimate dieci: gaz_bologna, gaz_brahmaputra, gaz_molise, gaz_padova, gaz_vicenza, gaz_basilica_dei_frari, gaz_benevento, gaz_biferno, gaz_vinchiaturo, gaz_vomero. Per il punto 2 il loro rilievo cambierebbe disegno.

**La decisione del prompt copre il punto 1. Il punto 2 resta scoperto:** con il solo indice delle tessere proprie, il confronto con `7fde43d` mostrerebbe differenze anche sulle tessere fuori mappa. **Domanda 1.**

**Formato proposto.** Un file canonico nuovo, `data/source/shape_index.json`, `{id: intero}`, nello stesso stile di `void_seeds.json`: indentazione 1, chiavi ordinate. Lo preferisco a un cambio di formato di `void_seeds.json`, che è letto da `build_geojson.py` (`--seeds`), riscritto in `data/dist/void_seeds.json` e documentato come mappa id → decimale (D-036). Si aggiunge all'elenco delle sorgenti canoniche (D-020, `CLAUDE.md`). Alternativa: `void_seeds.json` con valori `{"seed": x, "index": n}`, che però tocca tutti i consumatori del file.

- **Valori.** L'indice è il numero **assoluto** che entra nello XOR, cioè la posizione che la tessera aveva in `allData` su `7fde43d`. Lì `N_GEO` = 249, quindi le 49 tessere proprie vanno da 249 a 297. `cantina_zamira` = 298, `sacello_responsale` = 299. `via_delle_oche` tiene il suo indice, riservato: resta nel file anche quando perde la tessera. Un luogo nuovo prende `max(indici) + 1`, mai un indice liberato.
- **Prova eseguita** su una copia del codice in scratchpad, con `seedFor` che legge `shapeIndex`. Con i dati della 3c e gli indici di `7fde43d`, **46 celle su 49 sono identiche a `7fde43d`**. Le 3 diverse sono casuccia, laboratorio e orto, cioè il gruppo in cui entrano cantina e sacello: la differenza attesa.
- **Se si estende al punto 2** (domanda 1, opzione a): lo stesso file dà un indice a ogni feature referenziale, ricostruito dalla posizione su `7fde43d` (0–248), e `atlas.js:946` usa `(shapeIndex · 0,618) mod 1`. `gaz_via_delle_oche_milano` prende il primo indice mai usato (300).

**Codice (B0, commit a sé, separato dai dati come vuole la regola del porting):**
- `tools/build_geojson.py`: legge `data/source/shape_index.json` (argomento `--shape-index`) e scrive `shapeIndex` nelle proprietà della feature. Il build si ferma se una tessera propria (con l'opzione a, ogni feature) non ha indice, o se due id hanno lo stesso indice.
- `app/src/model/narrative-geometry.js:115-118`: `seedFor` usa `properties.shapeIndex` al posto di `i`.
- `app/src/model/entities.js`: un controllo come quello dei glifi (D-040): una tessera senza `shapeIndex` ferma il caricamento con un errore esplicito.
- Opzione a: `app/src/atlas.js:946`.

**Test da aggiungere** in `app/test/`:
- i dati pubblicati hanno un `shapeIndex` per ogni tessera che lo richiede;
- gli indici sono unici;
- una tessera senza indice produce un errore esplicito;
- la forma di una cella non cambia se si inverte l'ordine delle feature (estende il test di D-041).

Lato build, il controllo di unicità e completezza sta in `build_geojson.py` e quindi in `make all`.

---

## A3. Luoghi: righe attuali e modifiche

Id nuovi, primi liberi:
- letture: **I-0012…I-0015** (ultima I-0011), **N-0007** (ultima N-0006);
- interpretazioni: **interp_00979…interp_00982** (ultima interp_00978);
- entità: `gaz_via_delle_oche_milano` e `gaz_campidoglio` (nessuna collisione; non esiste alcuna entità «Campidoglio» o «Capitolino»).

Nota: `MODELLO_LETTURE.md` usa I-0012, N-0007 e K-0011 come esempi ipotetici («Come aggiungere una lettura»). Non sono nei dati, ma dopo questa fase I-0012 e N-0007 esisteranno davvero. Lo segnalo, senza toccare la guida.

### 1.1 Castel Porcano → Transformed

| Tabella | Oggi | Dopo |
|---|---|---|
| `NarrativePlaces.tsv` r. 44 | `invented`; Description «Castello d'immaginazione, deformazione linguistica di Castel Porziano» | `transformed`; Description del prompt (la vecchia va in D-092) |
| `Assertions.tsv` `S-castel_porcano-2` | Invented, adottata, qpa 213, nota «Revisione critica (D-090).» | `Adopted` no; nota + « Superata dalla lettura S-castel_porcano-3 (D-092).» |
| nuova `S-castel_porcano-3` (subito dopo la -2) | — | status, Transformed, autore e codificatore lorenzo_sabatino, terzoli_2015 679, si, motivazione del prompt, `Revision_Of` S-castel_porcano-2, 2026-10-15, lettura critica, validata |
| nuova `I-0012` | — | identification, `narrativeplace/castel_porcano` → `gazetteer/gaz_castel_porziano`, autore `terzoli`, codificatore lorenzo_sabatino, terzoli_2015 679, si, motivazione breve |
| nuova `N-0007` | — | naming, `chora:Paraetymology`, autore `terzoli`, terzoli_2015 679, `Adopted` vuoto, `Grounded_In` ref_00538\|ref_00539, `Plays_On` `gazetteer/gaz_castel_porziano`, `Quotation` breve («già Porciliano», Guida Touring 1924, p. 569) |
| `interp_00645`, `00646` | `overlaps` `gaz_castel_porziano`, indeterminate | invariate |

L'identificazione adottata non cambia la vista: il luogo ha ancore proprie, e D-045 vale solo per i luoghi che non ne hanno. La tessera propria resta; cambia il glifo, da `invented` a `transformed`.

### 1.2 Via delle Oche → Imported

| Tabella | Oggi | Dopo |
|---|---|---|
| `GazetteerEntities.tsv` (nuova riga in coda) | — | `gaz_via_delle_oche_milano`; Toponym «via delle Oche»; Alternative «Via di Okk»; Historical «contrada milanese scomparsa»; Present «via Bernardino Zenale, Milano, tra via San Vittore e corso Magenta, presso Santa Maria delle Grazie»; **Lat/Lon 45.464649 / 9.170031** con Geometry Point nello stesso formato delle altre righe; Authority_Source «Terzoli 2015, p. 77; *L'Adalgisa*, p. 564, n. 53. Coordinata: centroide di via Bernardino Zenale, OpenStreetMap, way 27756097 e 286239491» |
| `NarrativePlaces.tsv` r. 270 (`via_delle_oche`) | `invented`; Description «via topograficamente non precisata»; Notes «Toponimo non attestato nella toponomastica storica milanese…» | `imported`; Description e Notes del prompt (le vecchie vanno in D-092) |
| `S-via_delle_oche` | Invented, adottata, qpa 22, nota «Motivazione riscritta da LS (10/10/2026, D-079).» | `Adopted` no; nota + « Superata dalla lettura S-via_delle_oche-2 (D-092).» |
| nuova `S-via_delle_oche-2` | — | Imported, lorenzo_sabatino, terzoli_2015 77, si, motivazione del prompt, `Revision_Of` S-via_delle_oche, prova testuale, validata |
| nuova `I-0013` | — | `via_delle_oche` → `gaz_via_delle_oche_milano`, autore terzoli, terzoli_2015 77, si |
| `interp_00029` | ref_00028, `gaz_bologna`, ingravallo, projectedspace, relative, inside, confidence 0.5, nota critica «L'espressione «via delle Oche», riferita a Milano, non risulta attestata…» | `Adopted` no; il resto invariato |
| nuova `interp_00979` | — | ref_00028, via_delle_oche, `gaz_via_delle_oche_milano`, ingravallo, projectedspace, determinazione e relazione come in A4.3, `Revision_Of` interp_00029, nota critica del prompt, `Adopted` si |
| `U-0009` | Discrepancy su `gaz_bologna`, «traslazione d'autore», `Adopted` vuoto | v. A4.2 |

`NonAdoptedInterpretationShape` (Warning) accetta una non adottata se è stata rivista: `interp_00029` lo è da `interp_00979`.

### 1.3 Pensione Burgess: resta Invented

| Tabella | Oggi | Dopo |
|---|---|---|
| `NarrativePlaces.tsv` r. 131 | Description «Albergo immaginario, possibile deformazione di Pensione Villa Borghese, via Sgambati 4, vicino Porta Pinciana»; Fuzziness 4 | Description del prompt (la vecchia va in D-092); il resto invariato |
| `S-pensione_burgess` | Invented, censimento, adottata, nota «Validata da LS (10/10/2026, D-078).» | `Adopted` no + nota di superamento |
| nuova `S-pensione_burgess-2` | — | Invented, terzoli_2015 «22, 574–575», lettura critica, validata, `Revision_Of` S-pensione_burgess |
| `interp_00552` (ref_00466, americana_inglese, projectedspace), `interp_00553` (ref_00467, pompeo, projectedspace), `interp_00836` (ref_00671, pompeo, marker) | `gaz_porta_pinciana`, adjacentto; determinazioni relative, relative, approximate | `Adopted` no |
| nuove `interp_00980`, `00981`, `00982` | — | stessi riferimenti, agenti e ruoli; `gaz_roma`, `inside`, `indeterminate`, `Revision_Of` la rispettiva |

**Effetto.** La tessera propria passa dall'host `gaz_porta_pinciana` all'host `gaz_roma` (1,2 km dal centro). Nel layout radiale i due blocchi cambiano raggio, e qualche tessera dei loro anelli può scivolare lungo l'arco (effetto di D-084). `gaz_porta_pinciana` resta una feature, con le sue 2 occorrenze proprie. P-0001: resta `roma_citta`, perché la nuova ancora sta a 1,2 km dal Campidoglio.

### 1.4 Rocca Orsina: resta Imported

| Tabella | Oggi | Dopo |
|---|---|---|
| `NarrativePlaces.tsv` r. 173 | Notes lunghe senza fonte («…può essere ricondotto con buone ragioni alla fortificazione degli Orsini a Marino…») | Notes del prompt (le vecchie in D-092) |
| `GazetteerEntities.tsv` `gaz_rocca_orsina` (r. 2232) | `Authority_Source` vuoto; nessun `sameAs` | `Authority_Source` del prompt; coordinata invariata (v. A4.5) |
| nuova `I-0014` | — | `rocca_orsina` → `gaz_rocca_orsina`, autore terzoli, terzoli_2015 507–508, si |
| `interp_00485` | `gaz_rocca_orsina`, nodo 3 di R-0012 | invariata |

**Collegamento con `gaz_palazzo_colonna_marino`: propongo di non farlo.** `Housed_In` (→ `chora:housedIn`) è riservato alle coppie istituzione/sede (D-044, `mapping.yaml:349`). Il palazzo occupa il *sedime* della rocca, in un tempo successivo, e la rocca non è «ospitata» nel palazzo. Non c'è un altro campo adatto, e il legame resta nella prosa di `Authority_Source`.

### 1.5 Monte Nuncupale: resta Invented

| Tabella | Oggi | Dopo |
|---|---|---|
| `S-monte_nuncupale-2`, `interp_00486` (`gaz_colli_albani`, nodo 4 di R-0012) | — | invariate |
| `GazetteerEntities.tsv` (nuova riga) | — | `gaz_campidoglio`, Toponym «Campidoglio», **senza coordinate**, Authority_Source «Bersaglio dell'identificazione non adottata I-0015 (Terzoli 2015, pp. 507–508)» (pattern di `gaz_palazzo_colonna_marino`) |
| nuova `I-0015` | — | `monte_nuncupale` → `gaz_campidoglio`, autore terzoli, terzoli_2015 507–508, `Adopted` no, motivazione del prompt |

**Controlli su tutte le modifiche.**
- **IQ12** (al più una adottata per soggetto e tipo): ogni lettura nuova adottata sostituisce una vecchia non adottata. Le identificazioni sono le prime sui rispettivi soggetti: nessuna `I-` esistente su questi cinque luoghi. 0.
- **IQ13:** `hasRealityStatus` coincide con la sola lettura adottata (v. A4.1 per via delle Oche). 0.
- **IQ16:** revisioni con stesso soggetto e tipo, e per le interpretazioni stessa occorrenza e stesso luogo; rivista non adottata. 0.
- **IQ20 / shape 25:** una sola interpretazione adottata per occorrenza, luogo e focalizzatore, perché le vecchie passano a «no». 0.
- **Shape 8:** letture di statuto nuove validate, con motivazione e criterio.
- **Shape 13:** le revisioni puntano a letture esistenti.
- **Shape 23 / IQ21:** tutte le interpretazioni nuove hanno un'ancora diretta.

---

## A4. Punti da verificare

1. **Lettura generata e lettura esplicita per via delle Oche.** `generate_imported_statuses` (`tools/etl.py:1560-1615`) salta un Imported che ha già una lettura di statuto esplicita adottata, a meno che la generata non sia rivista (`if place in explicit and not superseded: continue`). Con `S-via_delle_oche-2` adottata **non nasce** `S-auto-via_delle_oche`: c'è esattamente una lettura adottata, e IQ12 e IQ13 restano a 0. **Proposta: lettura esplicita sola**, come `S-castello`, `S-edicola_due_santi` e `S-casal_bruciato`. L'alternativa «solo la generata, che rivede la vecchia» non è esprimibile: una generata non porta `Revision_Of`, e l'ETL gestisce solo il caso inverso (una esplicita che rivede la generata).
2. **U-0009.** Due modi senza cancellarla:
   - (a) **`Adopted` = no**, con nota in coda: «Superata: la via è milanese, oggi via Bernardino Zenale (Terzoli 2015, p. 77); la discrepanza non sussiste (D-092).» L'ETL scrive allora `adoptedByProject false` (`etl.py:1462-1467`); nessuna query o shape richiede che un'incertezza sia adottata. **Proposta.**
   - (b) revisione con una lettura nuova: non c'è un valore d'incertezza adatto per dire «nessuna discrepanza», e l'assenza d'incertezza significa «non analizzato» (D-047).
3. **Convenzione per le vie Imported.** Sulle 190 interpretazioni adottate dei luoghi Imported di categoria via/strada, la relazione è quasi sempre vuota (188) e la determinazione più frequente è `approximate` (97; poi relative 35, precise 23). **Proposta per `interp_00979`:** relazione vuota, determinazione `approximate`. L'alternativa è conservare `inside` e `relative` di `interp_00029`.
4. **Coordinata di via Zenale.** OpenStreetMap è raggiungibile. Via Bernardino Zenale a Milano sono due tratti, way **27756097** e **286239491** (circa 250 m). Il centroide pesato sulla lunghezza è **45,464649 N, 9,170031 E**; il valore di controllo era circa 45,464 N, 9,170 E. Il gazetteer non usa `sameAs` per OSM: nessuna entità ha `sameAs` esterni (T-46), e `sameAs` deve essere un URI. Propongo gli id OSM in `Authority_Source`. In alternativa, `sameAs` = `https://www.openstreetmap.org/way/286239491`, che però sarebbe il primo identificatore esterno del gazetteer e farebbe citare alla motivazione generata il repertorio (D-068), qui non pertinente, perché il luogo ha una lettura esplicita.
5. **Coordinata di `gaz_rocca_orsina`** (41,769916 N, 12,658476 E). Palazzo Colonna di Marino è OSM way **74413768**, Piazza della Repubblica. Il punto cade **a 3 m dal bordo del poligono, appena fuori**, e a 38 m dal suo centro: entro la precisione del dato, sta sul palazzo. Non ho verificato la posizione rispetto a piazza Lepanto: la conferma spetta a te.
6. **`gaz_bologna` dopo la revisione.** Ha altre due interpretazioni adottate e resta una feature, fuori mappa. Perde un'occorrenza e una interpretazione ancorata. Non scompare.
7. **`gaz_campidoglio` senza coordinate.** Come `gaz_palazzo_colonna_marino`: nessuna feature, perché un'entità senza interpretazioni non ne produce, e nessun avviso dell'ETL. Oggi l'unico avviso è `osteria` (DC-31). IQ8 riguarda solo le entità usate come ancora. Le entità del gazetteer senza coordinate passano da 4 a 5.
8. **Motivazione generata di Rocca Orsina.** L'ancora primaria viene dalle interpretazioni (`gaz_rocca_orsina`), non dall'identificazione, e l'entità non ha `sameAs`: la motivazione resta «Referente identificato nel gazetteer del progetto (GazetteerEntities), coordinate registrate.» **Non cambia.** L'identificazione I-0014 e la fonte stanno nella lettura attribuita e in `Authority_Source`, non nella motivazione generata.

---

## A5. Effetto atteso

| | prima | dopo |
|---|---|---|
| Luoghi per statuto | 262 · 31 · 20 · 0 | **263 · 32 · 18 · 0** |
| Tessere proprie | 51 | **50** (via delle Oche passa nella tessera di `gaz_via_delle_oche_milano`) |
| Feature | 304 | **304** (+1 `gaz_via_delle_oche_milano`, −1 tessera propria di via delle Oche) |
| Righe di rilievo | 937 | **937** (4 interpretazioni tolte dal rilievo, 4 nuove) |
| Entità del gazetteer | 269 (4 senza coordinate) | **271** (5 senza coordinate); con feature 253 → **254** |
| Interpretazioni nel grafo / adottate | 968 / 968 | **972 / 968** |
| Letture attribuite | 424 (165 / 259) | **432** (173 esplicite: +3 S, +4 I, +1 N; 259 generate) |
| P-0001 | 224 | **224** (nessun cambio di membri) |
| criticalNote | 76 | **77** |
| Triple | 45.261 | da misurare (stima: TBox invariata, ABox circa +250) |

**Valori scritti a mano da aggiornare:**
- `CLAUDE.md` «Stato dei dati»: tripleCount, ABox, statuti, entità del gazetteer e «4 senza coordinate», interpretazioni («tutte adottate» diventa 972 di cui 968 adottate), letture; più l'elenco delle sorgenti canoniche, se si aggiunge `shape_index.json`;
- `README.md:22-27`: triple, entità, interpretazioni, letture;
- `data/README.md:61-92`: triple, GazetteerEntity, tessere proprie, statuti, SpatialInterpretation, criticalNote, riga sui `NarrativePlace` senza tessera propria (262 → 263);
- `MODELLO_LETTURE.md`: la regola dell'indice di forma;
- test e audit: nessun conteggio scritto a mano.

---

## A6. Capitolo 4 (solo rapporto)

| r. | Passo | Rapporto con la 3d |
|---|---|---|
| 83 | «Castel Porcano» / «Castel Porcino» (QP 213): «il toponimo reale della tenuta di Castelporziano risulta qui — come osserva Emilio Manzotti — "giocato in senso paraetimologico"…» | coerente con Transformed |
| 85 | Monte Nuncupale e Rocca Orsina nella citazione di QP 173, fra i luoghi *inventati* (Nuncupale) | coerente: Nuncupale resta Invented; Rocca Orsina è solo citata |
| 85 | Castel Porcano: «l'occorrenza che più si avvicina a questa condizione [immaginato]…», «penderebbe verso il luogo _trasformato_», «ascrivibile alla categoria dell'_immaginato_», «un toponimo reale deformato immerso in una dimensione sospesa» | già da correggere dopo D-090; con la 3d il dato diventa **Transformed**, cioè l'alternativa che il capitolo stesso apre |
| 95 | «valutando ad esempio se Castel Porcano debba essere schedato come il medesimo luogo di Castelporziano dotato di uno statuto differente, oppure come un'entità autonoma» | il dataset lo scheda come luogo narrativo autonomo, con identificazione adottata verso Castelporziano |
| 273 | tabella dei requisiti: R07, esempi «Palazzo al 219; Castel Porcano (4.3)» | coerente |

Via delle Oche e la pensione Burgess non compaiono nel capitolo.

---

## A7. Piano

Ogni task si chiude con `make all && make audit && make shacl` (e `make queries`), con le triple e i risultati prima e dopo.

| Task | Contenuto | Manifest previsto |
|---|---|---|
| **B0** Indice di forma (commit a sé) | `shape_index.json` con gli indici di `7fde43d` (+ cantina 298, sacello 299; con l'opzione a, anche le referenziali); build e app come in A2; test; verifica visiva contro `7fde43d`: atteso solo il gruppo di Due Santi (catture in `verifica_fase3d/`) | `data/source/shape_index.json` (nuovo); `tools/build_geojson.py`; `Makefile` (argomento `--shape-index`, se serve); `app/src/model/narrative-geometry.js`; `app/src/model/entities.js`; (opzione a) `app/src/atlas.js`; `app/test/shape-index.test.js` (nuovo); derivati |
| **B1** Dati | i cinque luoghi in un solo commit: le modifiche si intrecciano (R-0012 lega Rocca Orsina e Monte Nuncupale; le letture I- e N- condividono la fonte). In alternativa uno per commit, nell'ordine 1.1–1.5 | `NarrativePlaces.tsv` (r. 44, 131, 173, 270); `GazetteerEntities.tsv` (gaz_rocca_orsina; 2 righe nuove); `Assertions.tsv` (S-castel_porcano-2, S-via_delle_oche, S-pensione_burgess, U-0009; 3 S nuove, I-0012…I-0015, N-0007); `SpatialInterpretations.tsv` (00029, 00552, 00553, 00836; 4 nuove); XLSX dei quattro fogli |
| **B2** Verifiche | `make all && make audit && make shacl && make queries`; `make xlsx`; `make publish-data`; `check_reproducible.py`; due `make all` senza diff; test dell'app; catture prima/dopo (stadio 3: glifo di Castel Porcano, tessera della pensione presso Roma, via delle Oche nella tessera di Milano al bordo) | `docs/alignment/verifica_fase3d/` |
| **B3** Documentazione | D-092 (fonti, alternative scartate, descrizioni e note sostituite, indice di forma); DC-24…DC-27 e DC-33 chiuse; conteggi in `CLAUDE.md`, `README.md`, `data/README.md`; `MODELLO_LETTURE.md` (indice di forma); `CLAUDE.md` (sorgente canonica nuova) | come a sinistra |
| **B4** Rapporto e PR | conteggi prima/dopo, triple, SHACL, IQ, test, manifest; PR senza merge | — |

---

## Domande prima di procedere

1. **Rilievo delle tessere referenziali** (A2, punto 2): (a) l'indice fisso vale per **tutte** le feature, e `atlas.js:946` usa `shapeIndex` (proposta: dopo, il confronto con `7fde43d` cambia solo dove deve); (b) solo le tessere proprie, come dice il prompt, accettando che il rilievo di una decina di tessere fuori mappa cambi disegno.
2. **Formato:** file nuovo `data/source/shape_index.json` (proposta) o `void_seeds.json` con valori `{seed, index}`?
3. **U-0009:** `Adopted` = no con nota (proposta)?
4. **`interp_00979`:** relazione vuota e `approximate` (convenzione delle vie) o `inside` e `relative` come la vecchia?
5. **Id OSM di via Zenale** in `Authority_Source` (proposta) o in `sameAs`?
6. **Rocca Orsina:** nessun collegamento a `gaz_palazzo_colonna_marino` con `Housed_In` (proposta), e la coordinata va bene così (3 m fuori dal poligono OSM)?
7. **B1:** un commit unico per i cinque luoghi (proposta) o uno per luogo?
