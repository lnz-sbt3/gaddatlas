# CHORA — an Ontology for Narrative Spatiality

> Nome provvisorio, da confermare. Vedi `docs/DECISIONS.md` § D-008.
> Cambiarlo è un comando: `python3 tools/migrate_namespace.py --onto <nome>`.

Ontologia per la modellazione dello spazio narrativo: come un testo di finzione
costruisce, trasforma e inventa luoghi, e come quei luoghi si rapportano — o
resistono — a un referente geografico.

| | |
|---|---|
| Namespace | `https://w3id.org/chora#` |
| Prefisso | `chora:` |
| Versione | 4.1.1 — vedi nota sotto |
| Licenza | CC BY 4.0 |
| Classi | 10 proprie, più 5 termini esterni riusati |
| Proprietà | 33 proprie: 17 object + 16 datatype |
| Concetti SKOS | 85 in 5 vocabolari |
| Dimensione TBox | 588 triple |

> **Versione da allineare.** `owl:versionInfo` nel file dichiara `4.1.1` e
> `owl:versionIRI` punta a `https://w3id.org/chora/4.1.1`, mentre il
> `CHANGELOG` annuncia `1.0.0` come prima versione pubblica sotto il nuovo
> nome. Le due cose vanno riconciliate **in Protégé**, prima della PR su
> w3id: la TBox è una sorgente e non va modificata dagli script.

## Perché un nome diverso da GaddAtlas

GaddAtlas è il caso di studio: il dataset sul *Pasticciaccio* e l'interfaccia
che lo espone. Questa ontologia non contiene nulla di gaddiano — il romanzo vive
interamente nell'ABox. Lo schema è applicabile a qualunque testo narrativo di
cui si voglia modellare la spazialità, ed è nominato di conseguenza.

## Il modello

Quattro assi ortogonali, ciascuno un vocabolario SKOS controllato:

| Asse | Che cosa qualifica | Portato da |
|---|---|---|
| **Reality Status** | il rapporto del luogo col referente reale | `chora:NarrativePlace` (invariante) |
| **Narrative Role** | la funzione del luogo in quella occorrenza | `chora:SpatialInterpretation` |
| **Spatial Determination** | quanto precisamente il testo lo colloca | `chora:SpatialInterpretation` |
| **Spatial Relation Type** | la relazione topologica espressa | `chora:SpatialInterpretation` |

La scelta portante: **statuto e sfocatura sono proprietà diverse di soggetti
diversi**. Lo statuto di realtà appartiene al luogo e non cambia col
focalizzatore; la determinazione spaziale appartiene al singolo atto
interpretativo. Un luogo inventato può essere descritto con precisione, e uno
reale in modo indeterminato: la query CQ3 verifica empiricamente che le due
dimensioni non collassino.

### Classi principali

- **`chora:PlaceReference`** — l'occorrenza testuale: estratto (`chora:excerpt`),
  capitolo, riferimento di pagina. Livello attestativo, senza interpretazione.
- **`chora:SpatialInterpretation`** — l'atto critico che lega un riferimento a un
  luogo assegnando ruolo, determinazione, relazione e focalizzatore. Porta la
  propria provenienza PROV-O: è l'interpretazione stessa a essere citabile.
- **`chora:NarrativePlace`** — il luogo come costruito dal testo.
- **`chora:GazetteerEntity`** — il referente geolocalizzato, esterno al testo.
- **`chora:NarrativeRoute`** — aggregato ordinato di luoghi percorsi da un agente.
- **`chora:FocalizingAgent`** — chi guarda: il centro di focalizzazione.

La separazione fra i due livelli, attestativo e interpretativo, è ciò che rende
il grafo revisionabile: si può cambiare interpretazione senza toccare
l'attestazione, e più interpretazioni possono insistere sulla stessa occorrenza.

## File

```
chora.rdf                        la TBox (sorgente, curata in Protégé)
chora.ttl                        TBox in Turtle (derivata dall'RDF tramite ETL)
shapes/chora-shapes.ttl          vincoli SHACL sulla struttura
shapes/chora-placecategories.ttl vocabolario SKOS delle categorie di luogo
queries/competency.rq            12 competency question
queries/integrity.rq             10 controlli di integrità
docs/index.html                  documentazione pyLODE
```

## Verificare

```bash
python3 tools/validate_shacl.py     # deve dire CONFORME
python3 tools/run_queries.py        # 12/12 e 10/10 eseguibili
```

Le integrity query devono restituire zero righe, tranne IQ9 che è informativa.

## Riuso

Termini presi in prestito senza importarli: SKOS, PROV-O, GeoSPARQL,
Dublin Core. `chora:hasPlaceCategory` allinea a Getty AAT (`skos:exactMatch`) e
Wikidata (`skos:closeMatch`) dove esiste una corrispondenza.
