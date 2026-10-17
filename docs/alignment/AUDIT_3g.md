# AUDIT_3g — Fase 3g: rimozione della voce narrante e della memoria; focalizzatore per inerenza (sola lettura)

**18 ottobre 2026** · ramo `fase3g-voce-memoria` da `main` a `df2d081` (non c'è stata una fase 3f) · audit in sola lettura, nessuna sorgente modificata, nessun commit.

Decisione da applicare: Lorenzo, 17/10/2026. Il focalizzatore è la persona a cui il luogo appartiene in quel punto del racconto, a prescindere da chi parli. `chora:hasNarratingVoice` e tutta la rappresentazione della memoria escono dal modello. QP 61 (Faiti, Cengio) riceve un secondo focalizzatore, `narrator`, che rappresenta l'autore.

**Prima di cominciare.** Su `main` la working copy aveva `data/gaddatlas.ttl` vuoto (0 byte, data di modifica 16/10 alle 02:13): una scrittura interrotta. È un derivato. L'ho rigenerato con `make all`, e il file è tornato identico al commit: nessun diff.

**Stato di partenza:** TBox 1.620 · ABox 43.434 · full 45.624 triple; SHACL conforme, nessuna violazione e nessuna avvertenza; IQ1–IQ21 a 0 (IQ9 informativa); 972 interpretazioni (968 adottate); 432 letture (173 esplicite); 304 feature, 937 righe di rilievo. Primo numero libero: **D-094** (ultima voce D-093). Prossima voce in DATA_CHECKS: DC-36.

---

## A1. Censimento

Ricerca: `hasNarratingVoice`, `Narrating_Voice`, `NarratingVoice`, `MemoryAssertion`, `memoryAttribution`, `MemoryAttribution`, `AuthorMemory`, `CharacterMemory`, `UndecidableMemory`, `memory`, e le forme italiane «voce narrante», «memoria», «memoriale», «enunciazione». Ambito: `ontology/`, `data/source/`, `tools/`, `app/src/`, `app/test/`, `docs/` e i README. Esclusi `docs/DECISIONS.md` e i documenti storici (`docs/alignment/` fino ad AUDIT_3e, REVIEW_2, TBOX_2, TERNE_IQ20).

### Da modificare (sorgenti)

| File:riga | Contenuto | Intervento |
|---|---|---|
| `ontology/chora.ttl:823` | commento delle asserzioni: «(statuto, identificazione, posizione, partizione, **memoria**, incertezza, variante)» | togliere «memoria» |
| `ontology/chora.ttl:346-351` | `chora:hasFocalizer`, `rdfs:comment` (solo it): «…all'agente attraverso cui lo spazio è percepito…» | testo nuovo it ed en (A4) |
| `ontology/chora.ttl:733-736` | `chora:FocalizingAgent`, `rdfs:comment` (solo it): «Entità attraverso cui lo spazio è percepito/descritto» | testo nuovo it ed en (A4) |
| `ontology/chora.ttl:902` | `skos:hasTopConcept … chora:MemoryAssertion` in `AssertionTypeScheme` | togliere |
| `ontology/chora.ttl:948-955` | `chora:MemoryAssertion` (concetto, `reifiesProperty chora:memoryAttribution`, notazione «memory») | togliere il blocco |
| `ontology/chora.ttl:1289-1296` | blocco di commento «LIVELLI ENUNCIATIVI (D-049…) Percezione (chora:hasFocalizer), enunciazione (chora:hasNarratingVoice) e persistenza memoriale (asserzione chora:MemoryAssertion) sono piani distinti…» | riscritto senza voce e memoria (A4) |
| `ontology/chora.ttl:1298-1303` | `chora:hasNarratingVoice` | togliere |
| `ontology/chora.ttl:1305-1331` | `chora:MemoryAttributionScheme`, `chora:AuthorMemory`, `chora:CharacterMemory`, `chora:UndecidableMemory` | togliere |
| `ontology/chora.ttl:1713-1719` | `chora:memoryAttribution` | togliere |
| `ontology/shapes/chora-shapes.ttl:320` | `sh:in ( … ga:PartitionAssertion ga:MemoryAssertion ga:UncertaintyAssertion …)` (tipi ammessi) | togliere `ga:MemoryAssertion` |
| `ontology/shapes/chora-shapes.ttl:489-518` | shape 11 (intestazione a r. 490): commento, `ga:NarratingVoiceShape`, `ga:MemoryAssertionShape` | togliere le due shape e il commento; resta il numero 11 vuoto, oppure si annota «shape 11 rimossa (D-094)» (domanda 5) |
| `data/source/mapping.yaml:449-455` | blocco `chora:hasNarratingVoice` ← `Narrating_Voice_ID` (D-049) | togliere |
| `data/source/mapping.yaml:679`, `:792`, `:814` | documentazione: tipo `memory` fra i tipi di asserzione; `chora:memoryAttribution (memory)` fra le proprietà derivate | togliere `memory` e la proprietà |
| `tools/etl.py:1003-1011` | lettura di `Narrating_Voice_ID` e scrittura di `chora:hasNarratingVoice` | togliere |
| `tools/etl.py:1266` | tipo `"memory": "MemoryAssertion"` | togliere (una riga `memory` in `Assertions.tsv` farà fallire l'ETL come tipo sconosciuto) |
| `tools/etl.py:1409` | docstring dei tipi («… partition \| memory \| uncertainty …») | togliere `memory` |
| `tools/etl.py:1690` | materializzazione `"MemoryAssertion": (CHORA.memoryAttribution, CHORA.PlaceReference, True)` | togliere |
| `data/source/tables/Assertions.tsv:73-78` | M-0001…M-0006 | togliere le sei righe (A2) |
| `data/source/tables/SpatialInterpretations.tsv` | colonna 17 `Narrating_Voice_ID`, con valori in 5 righe (A2) | togliere la colonna |
| `data/source/tables/FocalizingAgents.tsv` (narrator) | Description «Voce narrante gaddiana: onnisciente ma pervasa di digressioni, ironia e plurilinguismo; focalizzatore a pieno titolo.» | testo nuovo (A4) |
| `docs/MODELLO_LETTURE.md:45` | riga della tabella dei tipi: «MemoryAssertion \| `chora:memoryAttribution` \| PlaceReference \| MemoryAttributionScheme…» | togliere |
| `docs/MODELLO_LETTURE.md:69` | `Assertion_Type`: «… partition, memory, uncertainty …» | togliere `memory` |
| `docs/EXCLUSIONS.md:94-95, 97` | righe della voce narrante, della memoria e delle varianti di testimone in «Copertura parziale dichiarata» | togliere (A4) |
| `docs/EXCLUSIONS.md:96` | partizione: «221 luoghi assegnati dal criterio di distanza» | «224 luoghi assegnati (163 Roma città, 61 campagna romana)» |
| `ontology/CHANGELOG.md` | — | voce «Rimosso» nella sezione [1.0.0] (proposta) |

### Derivati: si rigenerano

`ontology/chora.rdf`, `ontology/chora.jsonld`, `data/gaddatlas.ttl`, `data/dist/*`, `app/public/data/*`, `data/source/xlsx/{Assertions,SpatialInterpretations,FocalizingAgents}.xlsx`, `ontology/docs/*` (`make docs`). `make docs` non cancella le pagine superflue, quindi `ontology/docs/vocab_memoryattribution.html` va tolta: è un derivato senza più sorgente.

### Non pertinenti: «memoria» in un altro senso, restano

- `data/source/tables/References.tsv:472`: estratto di QPa 191 («…gli si erano stampati nella memoria»);
- GeoJSON e TTL: la nota di Casal Bruciato con la citazione di Manzotti («…più sulla memoria di escursioni in loco…»);
- `data/dist/passages/ch07.json`: lo stesso estratto di QPa 191;
- `tools/etl.py:1969`: «Lo store in memoria di rdflib…»;
- `docs/EXCLUSIONS.md:19`: formula del requisito R02 («temporalità di storia e memoria»), nella sezione Temporalità.

### Interfaccia e test

`grep` in `app/src/` e `app/test/`: **nessuna occorrenza**. Nessuna vista usa voce o memoria. Il GeoJSON non porta né la voce né la memoria.

### Documenti correnti senza occorrenze

`README.md`, `CLAUDE.md`, `data/README.md`, `ontology/README.md`: nessuna occorrenza, nessuna modifica (salvo i conteggi in `CLAUDE.md`).

### Documenti di pianificazione: da decidere (domanda 4)

- `docs/thesis/GaddAtlas_Cap4_Allineamento_WorkOrder.md`: r. 81 (requisito R02, «storia (con la memoria)»), 262, 288, 360, 362, 378, 432, 440, 457, 609, 621. Sono il piano degli interventi (T-36, tabelle delle letture). Proposta: non riscriverli; aggiungere a T-36 una nota «Voce narrante e memoria rimosse dal modello (D-094, 17/10/2026)».
- `docs/thesis/DATA_CHECKS_GaddAtlas.md:30` (DM-02): «nodi di asserzione n-ari (statuto, identificazione, posizione, partizione, memoria)». Proposta: una nota fra parentesi, «(la memoria è uscita dal modello, D-094)», e una voce nuova, DC-36, chiusa.

---

## A2. Righe da togliere e righe nuove

### `Assertions.tsv`, sei righe (73–78), riportate per intero in D-094

| Id | Soggetto | Valore | Autore | Fonte, pag. | Adottata | Stato |
|---|---|---|---|---|---|---|
| M-0001 | reference/ref_00144 (Dosso Faiti) | chora:AuthorMemory | perosa | perosa_2023a 103–104 | no | bozza |
| M-0002 | reference/ref_00144 | chora:CharacterMemory | lugnani | perosa_2023a 104, n. 97 (`Original_Source` lugnani_2001) | no | bozza |
| M-0003 | reference/ref_00144 | chora:AuthorMemory\|chora:CharacterMemory | cortellessa | cortellessa_2023 669 | no | bozza |
| M-0004 | reference/ref_00145 (Monte Cengio) | chora:AuthorMemory | perosa | perosa_2023a 103–104 | no | bozza |
| M-0005 | reference/ref_00145 | chora:CharacterMemory | lugnani | perosa_2023a 104, n. 97 (lugnani_2001) | no | bozza |
| M-0006 | reference/ref_00145 | chora:AuthorMemory\|chora:CharacterMemory | cortellessa | cortellessa_2023 669 | no | bozza |

Tutte con codificatore `lorenzo_sabatino`, data 2026-10-09, motivazione con citazione breve e nota «Cap. 4, § 4.3: le tre letture convivono, nessuna è adottata dal progetto.»

**Effetto collaterale (domanda 2).** Gli agenti `perosa`, `lugnani` e `cortellessa` e le fonti `perosa_2023a` e `lugnani_2001` sono usati **solo** da queste sei letture. `cortellessa_2023` resta usata da S-tor_di_gheppio. Dopo la rimozione restano nei fogli `Agents.tsv` e `Sources.tsv` senza alcuna lettura.

### `SpatialInterpretations.tsv`: la colonna `Narrating_Voice_ID` e i suoi cinque valori

| Riga | Interpretazione | Riferimento | Luogo | Focalizzatore | `Narrating_Voice_ID` | Nota critica |
|---|---|---|---|---|---|---|
| 167 | interp_00168 | ref_00144 (QPa 61) | dosso_faiti | ingravallo | narrator | — |
| 168 | interp_00169 | ref_00145 (QPa 61) | monte_cengio | ingravallo | narrator | «La visione del sangue produce uno slittamento semantico…» |
| 500 | interp_00503 | ref_00432 (QPa 175) | ciampino | santarella | narrator | «Voce narrante distinta dal focalizzatore: la voce "tradisce l'incursione del narratore gaddiano" (Perosa 2023a, p. 238).» |
| 501 | interp_00504 | ref_00433 (QPa 175) | santa_palomba | santarella | narrator | come sopra |
| 632 | interp_00636 | ref_00530 (QPa 211) | porta_san_paolo | pestalozzi | narrator | «Voce narrante distinta dal focalizzatore: "divaricazione tra voce e punto di vista" (Savettieri 2020, p. 44).» |

Le fonti di QP 175 e QP 211 sono **già nelle note critiche**: non serve aggiungerle. Le note parlano di «voce narrante distinta dal focalizzatore», un concetto che esce dal modello ma resta come commento critico; propongo di lasciarle come sono (domanda 3).

### Interpretazioni nuove (primo id libero: ultima `interp_00982`)

| Id | Riferimento | Luogo | Ancora | Focalizzatore | Ruolo | Determinazione | Relazione | `Revision_Of` | Nota critica |
|---|---|---|---|---|---|---|---|---|---|
| **interp_00983** | ref_00144 | dosso_faiti | gaz_dosso_faiti | narrator | projectedspace | relative | — (come interp_00168) | — | testo del prompt |
| **interp_00984** | ref_00145 | monte_cengio | gaz_monte_cengio | narrator | projectedspace | relative | — (come interp_00169) | — | testo del prompt |

Annotatore lorenzo_sabatino, data 2026-10-17, metodo close_reading, `Adopted` si. Nota critica, uguale per le due:

> «Luogo attribuito anche al narratore: la critica vi riconosce una memoria autobiografica dell'autore, il lutto per il fratello Enrico, che affiora attraverso Ingravallo (Perosa 2023a, pp. 103–104; Cortellessa 2023, p. 669; cfr. Lugnani in Perosa 2023a, p. 104, n. 97). Discussione nella tesi, cap. 4 e § 6.4.»

IQ20 e shape 25 (una sola interpretazione adottata per occorrenza, luogo e focalizzatore): restano a 0, perché `narrator` è un focalizzatore diverso da `ingravallo`.

---

## A3. Effetto previsto

| | prima | dopo |
|---|---|---|
| TBox | 1.620 | **≈ 1.568** (−54 triple dei sette termini e dei loro riferimenti; +2 commenti inglesi del focalizzatore) |
| ABox | 43.434 | **≈ 43.286** (−178 delle sei letture con atti, codifiche e associazioni; −5 `hasNarratingVoice`; +≈ 34 delle due interpretazioni) |
| full | 45.624 | da misurare |
| Interpretazioni (adottate) | 972 (968) | **974 (970)** |
| Letture attribuite (esplicite / generate) | 432 (173 / 259) | **426 (167 / 259)** |
| Tipi di asserzione nello schema | 12 | 11 |
| Righe di rilievo | 937 | **939** |
| Feature | 304 | 304 |
| `gaz_dosso_faiti`, `gaz_monte_cengio` | 1 occorrenza, 1 interpretazione ciascuno (hapax) | 1 occorrenza, **2 interpretazioni** (Ingravallo e narratore); classe di densità invariata (conta le occorrenze) |
| SHACL | conforme, 0 risultati | conforme, 0 risultati (attesi) |

Nessuno statuto, ancora, ruolo o determinazione cambia, salvo le due interpretazioni nuove. La memoria materializzata (`chora:memoryAttribution`) oggi ha 0 triple nel grafo, perché nessuna lettura M- è adottata.

---

## A4. Testi nuovi

**`chora:hasFocalizer`, `rdfs:comment`** (al posto dell'unico commento italiano):
- it: «Collega una SpatialInterpretation al suo focalizzatore: l'agente a cui il luogo appartiene in quel punto del racconto (che vi abita, vi agisce, lo ricorda o vi è implicato), a prescindere da chi pronunci la menzione. La coppia luogo × focalizzatore è l'unità base del dataset.»
- en: «Links a SpatialInterpretation to its focalizer: the agent to whom the place belongs at that point of the narrative (who lives in it, acts in it, remembers it or is implicated in it), regardless of who utters the mention. The place × focalizer pair is the basic unit of the dataset.»

**`chora:FocalizingAgent`, `rdfs:comment`:**
- it: «L'agente a cui il luogo appartiene in quel punto del racconto (che vi abita, vi agisce, lo ricorda o vi è implicato), a prescindere da chi pronunci la menzione.»
- en: «The agent to whom the place belongs at that point of the narrative (who lives in it, acts in it, remembers it or is implicated in it), regardless of who utters the mention.»

**Blocco di commento della TBox** (al posto di «LIVELLI ENUNCIATIVI», r. 1289–1296):
```
# =============================================================================
# MOMENTO DEL RACCONTO
# Il momento del racconto e' la posizione dell'occorrenza nel testo (capitolo,
# pagina del riferimento): la temporalita' della storia non e' modellata
# (docs/EXCLUSIONS.md).
# =============================================================================
```
Il blocco non contiene più termini: propongo di tenerlo come commento, oppure di toglierlo (domanda 5).

**Commento delle asserzioni** (r. 823): «(statuto, identificazione, posizione, partizione, incertezza, variante)».

**`FocalizingAgents.tsv`, `narrator`, Description:** «Focalizzatore quando il luogo non appartiene a un personaggio o gruppo riconoscibile, oppure, come in QP 61, quando rappresenta l'autore.»

**`docs/EXCLUSIONS.md`, «Copertura parziale dichiarata»**, dopo la rimozione di tre righe:

| Fenomeno | Annotato | Il resto | Decisione |
|---|---|---|---|
| Partizione Roma città / campagna romana | 224 luoghi assegnati (163 Roma città, 61 campagna romana) | casi di confine e luoghi senza ancora non assegnati, in revisione | D-050 |

La sezione resta con una sola riga, e il suo cappello («l'assenza del valore vale "non annotato"») vale ancora per la partizione. **Domanda 1:** la teniamo così, oppure spostiamo la partizione altrove (per esempio in una nota della sezione 5, «Partizioni città/campagna dei critici»)?

**`ontology/CHANGELOG.md`, [1.0.0], «Rimosso»:** «`chora:hasNarratingVoice`, `chora:MemoryAssertion`, `chora:MemoryAttributionScheme` (`AuthorMemory`, `CharacterMemory`, `UndecidableMemory`) e `chora:memoryAttribution`: il focalizzatore è definito per inerenza, e voce e memoria restano nella tesi e nel commento critico (D-094).» Più una riga in «Cambiato» per la definizione di `chora:hasFocalizer` e `chora:FocalizingAgent`.

---

## Piano (fase B)

1. Sorgenti: `chora.ttl`, `chora-shapes.ttl`, `mapping.yaml`, `etl.py`, `Assertions.tsv`, `SpatialInterpretations.tsv` (colonna tolta, due righe nuove), `FocalizingAgents.tsv`.
2. Documenti: `MODELLO_LETTURE.md`, `EXCLUSIONS.md`, `CHANGELOG.md`; work order e DATA_CHECKS secondo la domanda 4; conteggi in `CLAUDE.md`, `README.md`, `data/README.md`.
3. `make all && make audit && make shacl && make queries`; `make xlsx` (solo i tre fogli toccati); `make docs`, togliendo `vocab_memoryattribution.html`; `check_reproducible.py`; due `make all` senza diff; test dell'app.
4. D-094 con le righe eliminate per intero, il prompt e la decisione del 17/10/2026; commit unico; PR senza merge.

---

## Domande prima di procedere

1. **EXCLUSIONS, «Copertura parziale dichiarata»:** resta con la sola riga della partizione o si sposta?
2. **Agenti e fonti senza più uso** (`perosa`, `lugnani`, `cortellessa`; `perosa_2023a`, `lugnani_2001`): restano nei fogli come voci bibliografiche (proposta: sono citati nelle note critiche nuove), oppure si tolgono?
3. **Note critiche di QP 175 e 211** («Voce narrante distinta dal focalizzatore…»): restano come sono (proposta), o si riformulano senza il termine del modello eliminato?
4. **Work order e DM-02:** solo una nota di rinvio a D-094 (proposta), o nessuna modifica?
5. **TBox:** il blocco «MOMENTO DEL RACCONTO» resta come commento senza termini, o si toglie? La shape 11 rimossa lascia un buco nella numerazione: va annotata?
