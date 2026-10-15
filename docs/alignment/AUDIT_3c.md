# AUDIT_3c — Fase 3c: tre sottoluoghi nuovi (sola lettura)

**15 ottobre 2026** · ramo `fase3c-sottoluoghi` da `main` a `7fde43d` (merge della 3b, PR #5) · audit in sola lettura, nessuna sorgente modificata, nessun commit.

Decisione da applicare: Lorenzo, 15/10/2026. Una soglia di censimento a quattro condizioni congiunte (attestazione, spazialità, funzione, granularità) fa entrare tre sottoluoghi: `cantina_zamira`, `sacello_responsale`, `camera_sicurezza_questura`.

**Stato di partenza** (su `main` dopo il merge, identico al ramo della 3b): 44.830 triple (ABox 42.640, TBox 1.620); SHACL conforme senza risultati; `make audit` superato; 310 luoghi (Imported 261 · Transformed 31 · Invented 18 · Imagined 0); 736 occorrenze (730 QPa); 958 interpretazioni; 302 feature, 49 tessere proprie, 927 righe di rilievo; 221 membri di P-0001. Prossimo numero libero: **D-091**.

**Nessun estratto entra prima della verifica sul volume a stampa.** Gli estratti qui sotto vengono dal prompt (copia digitale) e servono solo a identificare il passo.

---

## A1. Id, categorie, focalizzatori

**Id dei luoghi.** `cantina_zamira`, `sacello_responsale` e `camera_sicurezza_questura` non esistono in `NarrativePlaces.tsv`, nel gazetteer, in `void_seeds.json` né come id di percorso. Gli id affini esistenti sono `casuccia_zamira`, `laboratorio_zamira`, `camera_casello`, `santo_stefano_del_cacco_celio_santo_stefano`, `santo_stefano_rotondo` e `via_di_santo_stefano_rotondo`. **Nessuna collisione.**

**Contenitori** (`NarrativePlaces.tsv`):

| id | statuto | `Is_Part_Of` | categoria | `Alternative_Toponym` | ancore delle interpretazioni | zona P-0001 |
|---|---|---|---|---|---|---|
| `casuccia_zamira` | Invented | — | abitazione | — | 2, `gaz_due_santi`, inside | campagna_romana |
| `laboratorio_zamira` | Invented | `casuccia_zamira` | edificio | **«antro; botteguccia; bottega»** | 21: 19 su `gaz_due_santi`, 2 senza ancora diretta | campagna_romana |
| `santo_stefano_del_cacco_celio_santo_stefano` | Imported | — | commissariato | — | 36, tutte `gaz_santo_stefano_del_cacco_celio_santo_stefano` | roma_citta |

**Da segnalare: «antro».** Il prompt propone «antro» come `Alternative_Toponym` della cantina (A 196, «la discesa in antro»), ma `laboratorio_zamira` porta già «antro» come forma variante dal censimento. Nessun estratto del dataset attesta «antro» per il laboratorio: l'unico «antro» negli estratti è «L'antro jeri», cioè «l'altro», a QPa 135. Se lo aggiungo anche alla cantina, la stessa `skos:altLabel` vale per due luoghi. **Domanda 3.**

**Categorie** (`mapping.yaml`, `place_categories`). Non esiste un valore per *cantina* (cellar) né per *stanza*. I valori pertinenti già mappati sono `camera` → `chora:room` (usato da `camera_casello`), `interno` → `chora:interior` (usato da `terzo_piano_219`), `questura`/`commissariato` → `chora:police_station` e `carcere` → `chora:prison`. Proposta senza valori nuovi:

| luogo | categoria proposta | alternativa |
|---|---|---|
| cantina_zamira | `interno` | un valore nuovo *cantina* (`chora:cellar`), che richiede approvazione: domanda 4 |
| sacello_responsale | `interno` | `camera` |
| camera_sicurezza_questura | `camera` | `carcere` |

Già oggi un valore usato nei dati non è nel vocabolario: `osteria` (osteriuccia_bivio, D-087). È la causa dell'avviso «Valore 'osteria' non trovato in vocabolario 'place_categories'» a ogni `make all`, preesistente. `README.md:27` dichiara invece «ETL 0 warning». Lo segnalo e non lo tocco.

**Focalizzatori** (`FocalizingAgents.tsv`, colonna `Focalizer_ID`): `zamira_pacori`, `diomede`, `ines_cionini`, `narrator`, `pompeo` **esistono tutti**. Esistono anche `camilla_mattonari` e `clelia_farcioni` (per A 169, dove la Zamira manda dietro «la Clelia, o, secondo altri, la Camilla»).

---

## A2. Relazioni fra luoghi

**Il modello esistente.** CHORA ha due canali, e non serve crearne altri:

1. **Inclusione:** `Is_Part_Of` → `chora:isPartOf`, sul luogo. Trasmette l'ancora per ereditarietà (`build_geojson.py:428-445`, IQ14, IQ21, shape 23).
2. **Relazione qualitativa:** l'ancoraggio relazionale **sull'interpretazione** (`Relational_Anchor_IDs`, `Relational_Anchor_Type`; D-057, D-072). Il termine (`chora:relatum`) può essere anche un luogo narrativo, senza referente geografico (D-058, `etl.py:986-996`). È il pattern dell'edicola: `interp_00660` porta `AdjacentTo` → `orto_vigna_due_santi`, perché QP 216 lo attesta. La relazione sta sul passo che la dice, non come proprietà diretta fra luoghi: D-058 ha scartato apposta sette proprietà luogo → luogo «senza il passo che le attesta».

Un termine che è un luogo narrativo **non diventa ancora** (`etl.py:997-1001`: solo i termini del gazetteer). La posizione resta quella ereditata con `isPartOf`.

**Vocabolario.** `chora:Below` **esiste** (`chora.ttl:510`: «A è verticalmente sotto B lungo l'asse gravitazionale. Relazione inversa di Above») ed è mappato come `below` (`mapping.yaml:195`). `chora:AdjacentTo` esiste (`adjacentto`). **Non manca alcun valore.** `chora:Threshold` non si usa (EXCLUSIONS § 6, D-088).

**Proposta:**

| luogo | `Is_Part_Of` | relazione qualitativa | su quale occorrenza | perché |
|---|---|---|---|---|
| cantina_zamira | `casuccia_zamira` | `below` → `laboratorio_zamira` | A 165 («una specie di cantina **sotto** al laboratorio-bettola») | è il passo che dice la verticalità in modo esplicito. In più, a scelta, su A 169 («levarseli in cantina … portarli **su** … in laboratorio»): domanda 5 |
| sacello_responsale | `cantina_zamira` | `adjacentto` → `cantina_zamira` | A 165 («Dava adito, codesto salotto o sala di consultazione, per uscio con catenaccio, al sacello…») | l'uscio unisce due vani contigui; non è una soglia come evento narrativo (EXCLUSIONS § 6) |
| camera_sicurezza_questura | `santo_stefano_del_cacco_celio_santo_stefano` | nessuna | — | l'inclusione basta |

**Un caso da decidere: il sacello parte della cantina e insieme adiacente alla cantina.** Il prompt lo dice `Is_Part_Of = cantina_zamira`, e il passo lo dà come vano a cui la cantina «dà adito»: contiguo, quindi `AdjacentTo`. Le due affermazioni convivono se la cantina è intesa come l'insieme sotterraneo (sala più sacello) e la relazione qualitativa lega il sacello alla *sala* di consultazione. Alternativa più pulita: `Is_Part_Of = casuccia_zamira` (come la cantina) e `adjacentto` → `cantina_zamira`. **Domanda 6.** Lo statuto e la zona non cambiano in nessuno dei due casi.

`Spatial_Relation_Type` delle interpretazioni dei sottoluoghi: `inside`, come `camera_casello`, `terzo_piano_219` e le interpretazioni del laboratorio senza ancora diretta.

---

## A3. Ancoraggio e interfaccia

**I due Invented** (cantina, sacello): interpretazioni **senza ancora diretta**, come `camera_casello`, `terzo_piano_219` e `orto_vigna_due_santi`. L'ancora si eredita con `isPartOf`: sacello → cantina → casuccia → `gaz_due_santi` (`inherited_anchor`, `build_geojson.py:431-445`, ricorsivo).

- **IQ14** (nessun luogo senza ancoraggio e senza stato): `isPartOf*` trova le interpretazioni della casuccia ancorate a `gaz_due_santi`. 0.
- **IQ21 e shape 23** (luogo annotato con almeno un'ancora): stesso cammino `isPartOf*`. 0.
- **Interfaccia:** non Imported con interpretazioni, quindi tessera propria (`own_tile`, `build_geojson.py:476-477`), posizionata dall'ancora ereditata. `make audit` (b) le trova come feature. Le tessere proprie passano da 49 a **51**.
- **Semi Voronoi.** `voidSeeds` è «frozen». Un luogo assente da `data/source/void_seeds.json` prende il seme da un hash dell'id (`fallback_seed`), e il build lo segnala. Come per `palazzo_simonetti` (D-036), propongo di scrivere in `void_seeds.json` lo stesso valore che il build calcolerebbe: `cantina_zamira` 0,946483, `sacello_responsale` 0,029107. Il file è una sorgente canonica (D-020).
- **Layout.** Due satelliti nuovi presso Due Santi allargano il blocco del loro host. Come in D-084, è atteso che qualche tessera dello stesso anello scivoli lungo l'arco; lo misuro nella verifica visiva.

**L'Imported** (camera di sicurezza): **qui c'è un ostacolo.** Per un luogo Imported la tessera su cui l'interpretazione deposita il rilievo è la **sua ancora diretta** (`visual_target`, `build_geojson.py:479-489`: `return si["gazetteerId"]`), non l'ancora ereditata. Oggi nessun Imported ha `Is_Part_Of`, e il caso non si è mai presentato. Con interpretazioni senza ancora diretta:

- il build passa, perché `targets` usa l'ancora ereditata e il controllo «luoghi annotati senza ancora» è superato;
- ma le righe di rilievo avrebbero `targetId` nullo, e il controllo (b) di `make audit` (`audit_alignment.py:229-243`, «ogni luogo annotato compare nel GeoJSON») **fallirebbe**.

**Proposta (a), senza modificare il codice:** le interpretazioni della camera portano anche l'ancora diretta `gaz_santo_stefano_del_cacco_celio_santo_stefano`, come le 36 del contenitore, e il luogo ha comunque `Is_Part_Of`. L'Imported «coincide col proprio referente» e il rilievo confluisce nella tessera della questura, come vuole il prompt. Alternativa (b): `visual_target` ripiega sull'ancora ereditata per gli Imported. È una modifica dell'adapter, fuori dal perimetro di questa fase e da registrare a parte. **Domanda 7.**

Con (a): IQ14 0, IQ21 0, shape 23 0 (ancora diretta); nessuna tessera nuova, perché il rilievo va sulla tessera della questura (`planeCount` e `interpCount` della questura + n).

---

## A4. Letture di statuto

**Invented: lettura esplicita, pattern di `S-orto_vigna_due_santi`, `S-camera_casello`, `S-terzo_piano_219`.** Quelle letture dicono «Parte di X nel censimento (Is_Part_Of): lo statuto segue quello del luogo di cui è parte», con fonte `censimento_gaddatlas`. Qui i luoghi non vengono dal censimento ma dalla soglia di D-091, quindi propongo una variante. `S-casuccia_zamira` usa già «segue lo statuto del laboratorio».

| id | soggetto | valore | autore, codificatore | fonte, pag. | adottata | motivazione proposta | tipo | revisione | data | nota |
|---|---|---|---|---|---|---|---|---|---|---|
| `S-cantina_zamira` | narrativeplace/cantina_zamira | chora:Invented | lorenzo_sabatino | qpa, 165 | si | «Parte di casuccia_zamira (Is_Part_Of), sotto il laboratorio della Zamira (QPa 165): lo statuto segue quello del luogo di cui è parte.» | prova testuale | validata | 2026-10-15 | «Luogo entrato con la soglia di censimento (D-091).» |
| `S-sacello_responsale` | narrativeplace/sacello_responsale | chora:Invented | lorenzo_sabatino | qpa, 165 | si | «Parte di cantina_zamira (Is_Part_Of), oltre l'uscio della sala di consultazione (QPa 165): lo statuto segue quello del luogo di cui è parte.» (da adattare se cambia `Is_Part_Of`, domanda 6) | prova testuale | validata | 2026-10-15 | idem |

La shape 8 (`StatusRationaleShape`, Violation) vuole una lettura adottata con motivazione, criterio e `Validated`. Le due righe la soddisfano solo se nascono «validata». Il prompt ti chiede di decidere le colonne aperte: se preferisci farle nascere «bozza», SHACL diventa non conforme finché non le validi. **Domanda 8.**

**Imported: lettura generata dall'ETL** (D-068). Nessuna riga in `Assertions.tsv`: `generate_imported_statuses` (`etl.py:1560`) scrive `assertion/S-auto-camera_sicurezza_questura`, valore Imported, criterio ReferentialEvidence, adottata, validata, data costante 2026-10-09 (`generated_readings_date`). La motivazione standard cita l'ancora primaria (con (a): `gaz_santo_stefano_del_cacco_celio_santo_stefano`) e «Referente identificato nel gazetteer del progetto», perché l'entità non ha `sameAs` esterno.

Segnalo che il referente è la questura, non la camera: l'Imported si regge sull'ipotesi che una camera di sicurezza della questura di Santo Stefano del Cacco esistesse. È la regola del contenitore, come vuole il prompt; lo scrivo in D-091.

Letture attribuite: 421 → **424** (165 esplicite, 259 generate).

---

## A5. Numerazione

- Ultimo `Reference_ID`: **ref_00736** (`References.tsv`, nessun salto più alto). Nuovi: **ref_00737** e seguenti.
- Ultima `Interpretation_ID`: **interp_00967**. Nuove: **interp_00968** e seguenti.
- Nessuna rinumerazione.

Un'occorrenza per menzione (D-075): due menzioni nella stessa pagina sono due `PlaceReference`, ciascuna con il proprio estratto breve. Con le 11 righe del prompt tutte approvate:

| ref | interp | luogo | QPa | cap. | estratto (da verificare) | forma attestata | ruolo / focalizzatore (proposte) | determinazione (proposta) | relazione · relazionale |
|---|---|---|---|---|---|---|---|---|---|
| ref_00737 | interp_00968 | cantina_zamira | 165 | VI | «in una specie di cantina sotto al laboratorio-bettola» (da trascrivere intero) | cantina | setting / narrator | relative | inside · `below:laboratorio_zamira` |
| ref_00738 | interp_00969 | cantina_zamira | 166 | VI | «…in cantina, cioè nella "sala di tintoria"» | cantina | setting / narrator | approximate | inside |
| ref_00739 | interp_00970 | cantina_zamira | 169 | VI | «La Zamira lo mandò a levarseli in cantina…» | cantina | setting / zamira_pacori | relative | inside · (`below:laboratorio_zamira`, domanda 5) |
| ref_00740 | interp_00971 | cantina_zamira | 195 | VII | «E certe vorte nun te l'attirò puro in cantina…» | cantina | projectedspace / diomede (da decidere: chi parla) | approximate | inside |
| ref_00741 | interp_00972 | cantina_zamira | 196 | VII | «…della discesa in antro» | antro | projectedspace / diomede | indeterminate | inside |
| ref_00742 | interp_00973 | cantina_zamira | 224 | VIII | «Ma doveva esser giù, con la testa di morto, ne la sala di consulto» | sala di consulto | projectedspace / zamira_pacori | relative | inside |
| ref_00743 | interp_00974 | sacello_responsale | 165 | VI | «Dava adito, codesto salotto o sala di consultazione, per uscio con catenaccio, al sacello o ricettacolo responsale…» | sacello o ricettacolo responsale | setting / narrator | relative | inside · `adjacentto:cantina_zamira` |
| ref_00744 | interp_00975 | sacello_responsale | 165 | VI | «Lì germogliavano i vaticini e i responsi…» | — (deittico, D-059) | setting / narrator | approximate | inside |
| ref_00745 | interp_00976 | camera_sicurezza_questura | 176 | VII | «…sul tavolaccio della camera di sicurezza» | camera di sicurezza | setting / ines_cionini | approximate | inside |
| ref_00746 | interp_00977 | camera_sicurezza_questura | 188 | VII | «Pompeo l'avrebbe ricondotta ar dormitorio» | dormitorio | setting / ines_cionini | approximate | inside |
| ref_00747 | interp_00978 | camera_sicurezza_questura | 204 | VII | «ma già stavo qua» / «prima de cascà qua» | — (deittico) | setting / ines_cionini | approximate | inside |

**Note sulla tabella:**

- **Determinazione.** Il prompt non la propone. Uso `relative` dove il passo colloca il vano rispetto a un altro (sotto, giù, oltre l'uscio), `approximate` dove lo nomina dentro il contenitore senza altro, `indeterminate` per la perifrasi «discesa in antro». Sono proposte.
- **A 165, cantina e «salotto o sala di consultazione».** La frase del sacello nomina anche la cantina («codesto salotto o sala di consultazione»), che il prompt mette fra le sue forme varianti. Con la regola di D-075 sarebbe un'altra occorrenza della cantina sullo stesso estratto, come i sei luoghi di QPa 169 che condividono un estratto. Il prompt non la elenca: la aggiungo (ref_00748, interp_00979) o no? **Domanda 9.**
- **A 204, due deittici.** «ma già stavo qua» e «prima de cascà qua» sono due menzioni: una occorrenza ciascuna (ref_00747 e ref_00748, che slitterebbe) o una sola con l'estratto che le contiene entrambe? **Domanda 10** (è il «da decidere» del prompt).
- **A 169, focalizzatore.** Il prompt propone `zamira_pacori`. Il passo è narrato («La Zamira lo mandò…»): narratore o Zamira, da decidere. Esistono anche `clelia_farcioni` e `camilla_mattonari` per chi va in cantina.
- **Attested_Form.** La compilo solo dove la forma differisce dall'etichetta (D-059) ed è sottostringa esatta dell'estratto verificato.

---

## A6. Effetto atteso

Con le 11 occorrenze del prompt e le proposte (a) di A3. Tra parentesi i valori se si aggiungono le occorrenze delle domande 9 e 10.

| unità | prima | dopo |
|---|---|---|
| NarrativePlace | 310 | **313** |
| Imported · Transformed · Invented · Imagined | 261 · 31 · 18 · 0 | **262** · 31 · **20** · 0 |
| PlaceReference (QPa) | 736 (730) | **747 (741)** (+1 o +2) |
| SpatialInterpretation | 958 | **969** (+1 o +2) |
| letture attribuite (esplicite / generate) | 421 (163 / 258) | **424 (165 / 259)** |
| membri di P-0001 | 221 (162 città / 59 campagna) | **224** (163 / 61) |
| luoghi annotati (audit b) | 297 | **300** |
| feature GeoJSON | 302 | **304** (due tessere proprie nuove) |
| tessere proprie | 49 | **51** |
| righe di rilievo | 927 | **938** (una per interpretazione verso luogo; +1 o +2) |
| `void_seeds.json` | 50 semi | 52 |
| triple | 44.830 | da misurare |

Le occorrenze della camera vanno nel rilievo della tessera della questura (`gaz_santo_stefano_del_cacco_celio_santo_stefano`). I brani entrano in `passages/ch06.json`, `ch07.json` e `ch08.json` e in `passages/index.json`.

**Valori scritti a mano da aggiornare:**

- `CLAUDE.md:30-41` («Stato dei dati»): tripleCount, ABox, luoghi e statuti, interpretazioni, occorrenze, letture, feature, «297 su 297».
- `data/README.md:61-92` (fotografia del 14/10): triple, NarrativePlace e tessere proprie, statuti, PlaceReference, SpatialInterpretation, righe di rilievo, `NarrativePlace` senza tessera propria (261 → 262).
- `README.md:22-27`: la tabella di sintesi è **ferma al 6/9/2026** (17.203 triple, 309 luoghi, 722 riferimenti, 962 interpretazioni, 18 route, «ETL 0 warning»). Propongo di aggiornarla in B3 con i valori dopo la 3c e di togliere «ETL 0 warning», che è falso per l'avviso `osteria`. **Domanda 11.**
- **Test e audit:** nessun conteggio scritto a mano in `tools/audit_alignment.py`, `tools/check_reproducible.py`, `app/test/**`, `Makefile` e CI.

---

## A7. Piano

Ogni task si chiude con `make all && make audit && make shacl`, con le triple e le violazioni prima e dopo.

| Task | Contenuto | Manifest previsto |
|---|---|---|
| **B1** Dati | 3 righe in `NarrativePlaces.tsv` (id, nome, `Alternative_Toponym`, statuto, `Is_Part_Of`, categoria, descrizione); 11 (o 12–13) righe in `References.tsv` con gli estratti **verificati da LS**; altrettante in `SpatialInterpretations.tsv` (ancoraggi relazionali come in A2; ancora diretta per la camera, A3); `S-cantina_zamira` e `S-sacello_responsale` in `Assertions.tsv`; 3 righe in `PartitionMembers.tsv` (in ordine alfabetico, come il foglio); 2 semi in `void_seeds.json` | `data/source/tables/NarrativePlaces.tsv`, `References.tsv`, `SpatialInterpretations.tsv`, `Assertions.tsv`, `PartitionMembers.tsv`; `data/source/void_seeds.json`; XLSX dei cinque fogli (ripristino di quelli cambiati solo nel timestamp) |
| **B2** Derivati e verifica | `make all && make audit && make shacl && make queries`; `make xlsx`; `make docs` (la TBox non cambia: atteso nessun cambiamento sostanziale); `make publish-data`; `check_reproducible.py`; due `make all` senza diff; test dell'app; verifica visiva (Diagramma, stadio 3/5, capitolo 10, settore dei Castelli: cantina e sacello come satelliti presso Due Santi; tessera della questura) | `data/gaddatlas.ttl`, `data/dist/*`, `app/public/data/*` (GeoJSON e `passages/ch06–08.json`, `index.json`); `docs/alignment/verifica_fase3c/*.png` |
| **B3** Documentazione | D-091 (la soglia come criterio, i tre luoghi, le esclusioni del § 2 del prompt, gli effetti, la regola Imported + `Is_Part_Of` di A3); conteggi in `CLAUDE.md`, `README.md`, `data/README.md`; voce DC-29 in DATA_CHECKS (e la sezione E); `MODELLO_LETTURE.md`: una riga sulle relazioni qualitative fra sottoluoghi (pattern edicola, ora anche `Below`) e sulla regola dell'ancora diretta per un Imported con `Is_Part_Of` | `docs/DECISIONS.md`, `CLAUDE.md`, `README.md`, `data/README.md`, `docs/thesis/DATA_CHECKS_GaddAtlas.md`, `docs/MODELLO_LETTURE.md` |
| **B4** Rapporto e PR | conteggi prima/dopo, triple, SHACL, IQ, test, manifest, PR verso `main` senza merge | — |

---

## Domande prima di procedere

1. **Estratti:** mi servono le trascrizioni dal volume a stampa di tutte le occorrenze approvate (A 165 cantina intero; le altre verificate o corrette).
2. **Ruolo, focalizzatore e determinazione** di A5: approvi le proposte? In particolare chi parla a A 195 e il focalizzatore di A 169.
3. **«antro»:** alla cantina, togliendolo dal laboratorio, oppure su entrambi?
4. **Categoria:** `interno` per cantina e sacello e `camera` per la camera di sicurezza, oppure un valore nuovo *cantina*?
5. **`below`** anche sull'occorrenza di A 169, oltre che su A 165?
6. **Sacello:** `Is_Part_Of = cantina_zamira` (prompt) con `adjacentto` → cantina, oppure `Is_Part_Of = casuccia_zamira` con `adjacentto` → cantina?
7. **Camera di sicurezza:** ancora diretta su `gaz_santo_stefano_del_cacco_celio_santo_stefano` oltre a `Is_Part_Of` (proposta (a), senza toccare l'adapter)?
8. **Letture di statuto dei due Invented:** nascono «validata» (SHACL resta conforme)?
9. **A 165:** occorrenza della cantina anche per «codesto salotto o sala di consultazione»?
10. **A 204:** una occorrenza o due per i due deittici?
11. **`README.md:22-27`:** aggiorno la tabella di sintesi (ferma al 6/9) e tolgo «ETL 0 warning»?
