# GaddAtlas

Atlante semantico della geografia narrativa di *Quer pasticciaccio brutto de via
Merulana* di Carlo Emilio Gadda.

Il progetto mappa i luoghi del romanzo non come coordinate, ma come
**interpretazioni spaziali**: ogni riferimento testuale a un luogo viene
annotato con il suo ruolo narrativo, il suo statuto di realtà, la sua
determinazione spaziale e il personaggio che lo focalizza. L'interfaccia
restituisce questo apparato come un rilievo cartografico navigabile, in cui la
densità di menzione diventa quota e la struttura del romanzo diventa
tassellazione.

Tesi di dottorato in Digital Humanities — Università di Bologna, dipartimento
FICLIT, XXXIX ciclo.

---

## Stato

| | |
|---|---|
| Ontologia | CHORA — 10 classi proprie, 33 proprietà, 85 concetti SKOS |
| Dataset | 17.203 triple · 265 entità di gazetteer · 309 luoghi narrativi |
| Annotazione | 722 riferimenti testuali · 962 interpretazioni · 83 focalizzatori · 18 route |
| Copertura testuale | 722/722 riferimenti con estratto (100%) |
| Qualità | SHACL conforme · 12/12 competency · 10/10 integrity · ETL 0 warning |
| Interfaccia | in migrazione da prototipo Observable a applicazione statica |

---

## Struttura del repository

```
gaddatlas/
├── ontology/                    ← CHORA: lo schema, riusabile oltre Gadda
│   ├── chora.rdf                  TBox (SORGENTE, curata in Protégé)
│   ├── chora.ttl                  TBox in Turtle (derivata dall'RDF)
│   ├── shapes/                    vincoli SHACL + vocabolario SKOS
│   ├── queries/                   12 competency + 10 integrity query
│   ├── docs/                      documentazione pyLODE
│   ├── CHANGELOG.md  README.md
├── data/                        ← GaddAtlas: il caso di studio
│   ├── source/                    ← SORGENTE
│   │   ├── xlsx/                    annotazione, superficie di editing
│   │   ├── tables/                  gli stessi dati in TSV, diffabili in git
│   │   └── mapping.yaml             etichette italiane → URI dell'ontologia
│   ├── gaddatlas.ttl              ABox (derivata)
│   └── dist/                      ← derivati, rigenerabili
│       ├── gaddatlas-full.ttl       TBox + ABox, per Protégé e query
│       ├── gaddatlas.geojson        view model dell'interfaccia
│       └── passages/                ch01.json … ch10.json + index.json
├── app/                         ← interfaccia web (Vite + moduli ES)
├── tools/                         ETL, build, audit, migrazione namespace
├── w3id/                          configurazione dei redirect w3id.org
└── docs/DECISIONS.md              registro delle decisioni
```

### Il principio architetturale

Le sorgenti modificabili a mano sono **due**: i fogli di annotazione in
`data/source/xlsx/` e la TBox in `ontology/chora.rdf`. Tutto il resto è
derivato e rigenerabile con `make all`.

```
data/source/xlsx/*.xlsx  ──▶  tables/*.tsv  ─┐
                                              ├─(tools/etl.py + mapping.yaml)─▶  data/gaddatlas.ttl
ontology/chora.rdf  ─────────────────────────┘                                        │
                                                                                      ▼
                                                                    data/dist/gaddatlas-full.ttl
                                                                          │              │
                                              build_passages.py ──────────┘              └──▶ build_geojson.py
                                                     │                                              │
                                              passages/*.json                              gaddatlas.geojson
                                                            │                    │
                                                            └── audit_alignment.py
```

L'interfaccia non è una copia del grafo: è una sua proiezione, e il grafo è una
proiezione dell'annotazione. Ogni scelta di rappresentazione è tracciabile fino
alla cella del foglio che la motiva.

---

## Rigenerare i dati

Requisiti: Python 3.11+, `rdflib`, `pandas`, `pyyaml`, `openpyxl`, `pyshacl`.

```bash
pip install rdflib pandas pyyaml openpyxl pyshacl
make all          # rdf → passages → audit
make shacl        # validazione SHACL — deve dire CONFORME
make queries      # 12/12 competency, 10/10 integrity
```

L'audit va eseguito **dopo ogni modifica al TTL**. Verifica nove invarianti,
fra cui che ogni riga di `relief` risolva a una feature esistente e che ogni
riferimento navigabile abbia un brano associato. Esce con codice 1 in caso di
disallineamento: è ciò che impedisce a un errore nei dati di trasformarsi in
un'occorrenza persa silenziosamente nell'interfaccia.

---

## Il modello dei dati

Quattro assi ortogonali di interpretazione spaziale, ciascuno un vocabolario
SKOS controllato:

| Asse | Valori |
|---|---|
| **Reality Status** | Imported · Transformed · Imagined · Invented |
| **Narrative Role** | Setting · ZoneOfAction · Route · Marker · ProjectedSpace |
| **Spatial Determination** | Precise · Relative · Approximate · Indeterminate |
| **Spatial Relation Type** | Inside · Near · Toward · Through · … |

Le entità principali:

- **`chora:PlaceReference`** — un'occorrenza testuale, con il suo estratto
  (`chora:excerpt`), il capitolo e il riferimento di pagina.
- **`chora:SpatialInterpretation`** — l'atto interpretativo che collega un
  riferimento a un luogo, assegnandogli ruolo, determinazione e focalizzatore.
  Porta la propria provenienza PROV-O.
- **`chora:GazetteerEntity`** — il luogo referenziale, geolocalizzato.
- **`chora:NarrativePlace`** — il luogo come costruito dal testo, eventualmente
  ancorato a un'entità di gazetteer.

La distinzione fra `NarrativePlace` e `GazetteerEntity` è il cuore
dell'argomento: un luogo *Imported* coincide con il suo referente e ne eredita
la posizione, mentre *Transformed*, *Imagined* e *Invented* richiedono una
collocazione propria nello spazio diagrammatico.

---

## Licenze

Il repository contiene tre corpi con tre regimi distinti. **Non sono
intercambiabili.**

| Contenuto | Licenza | File |
|---|---|---|
| Codice (`app/`, `tools/`) | MIT | `LICENSE` |
| Ontologia CHORA e dati di annotazione | CC BY 4.0 | `LICENSE-DATA` |
| Estratti da *Quer pasticciaccio* | tutti i diritti riservati | `NOTICE-EXCERPTS.md` |

Gli estratti testuali sono citazioni brevi riprodotte a fini di critica e
ricerca ai sensi dell'art. 70 L. 633/1941. Vedi `NOTICE-EXCERPTS.md` prima di
riutilizzare o ridistribuire il contenuto di `data/dist/passages/`.

---

## Come citare

Vedi `CITATION.cff`.
