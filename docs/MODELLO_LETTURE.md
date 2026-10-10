# Il modello delle letture e della provenienza

Guida unica al modo in cui GaddAtlas registra le letture: dell'interpretazione del progetto, degli studiosi, del censimento. Sostituisce come riferimento `docs/alignment/TBOX_2.md` e `docs/alignment/AUDIT_2b.md`, che restano come documenti storici della fase 2. Aggiornata al 10 ottobre 2026 (D-089). Le decisioni citate sono in `docs/DECISIONS.md`.

Prefissi: `chora:` = `https://w3id.org/chora#`; `id:` = `https://w3id.org/gaddatlas/id/`; `hico:` = `http://purl.org/emmedi/hico/`; `prov:`; `cito:` = `http://purl.org/spar/cito/`; `frbr:`; `geo:` (GeoSPARQL).

---

## 1. Che cos'è una lettura

Una **lettura** è un'entità (`chora:Assertion`, o `chora:SpatialInterpretation` per le interpretazioni spaziali) **generata da un atto interpretativo** (`hico:InterpretationAct`, ⊑ `prov:Activity`).

```
lettura (chora:Assertion)                      atto (hico:InterpretationAct)
  chora:aboutSubject   ─► soggetto                hico:hasInterpretationType   ─► tipo di lettura
  chora:assertsValue   ─► valore                  hico:hasInterpretationCriterion ─► criterio
  chora:adoptedByProject  true | false            hico:isExtractedFrom         ─► fonte (chora:Source o chora:Witness)
  chora:reviewStatus      bozza | validata        chora:sourcePage                pagina o locatore
  prov:wasRevisionOf   ─► lettura precedente      chora:rationale                 argomentazione
  chora:groundedIn     ─► occorrenze (prova)      chora:quotation                 estratto breve del critico
  cito:disagreesWith   ─► altra lettura           chora:originalSource         ─► opera originale (lettura di seconda mano)
  prov:wasAttributedTo ─► autore                  prov:qualifiedAssociation    ─► ruolo ReadingAuthor (e Encoder)
  prov:wasGeneratedBy  ─► atto                    dcterms:date                    data (vedi sotto)
```

**Chi e quando.**

- **Autore e codificatore coincidono** (Lorenzo): un atto solo, con le due associazioni (ReadingAuthor, Encoder) e la data della codifica.
- **L'autore è uno studioso:** l'atto è il suo. Ha per data l'anno della fonte (`xsd:gYear`), o dell'opera originale se la lettura è di seconda mano. La **codifica** è un'attività distinta, `chora:EncodingActivity` (`id:encoding/{id}`), con l'associazione Encoder, `prov:startedAtTime` del 2026, `prov:used` la fonte e `prov:wasInformedBy` l'atto. La lettura ha una sola generazione. Nessun atto di uno studioso porta una data del 2026 (D-067).

Gli studiosi sono gli autori delle letture; Lorenzo è chi le codifica. **Nessuna lettura è il default del modello**: quella usata dall'interfaccia è marcata `adoptedByProject true` ed è attribuita come le altre.

---

## 2. Tipi di lettura

Ogni tipo è un `hico:InterpretationType` e dichiara la proprietà del modello che reifica (`chora:reifiesProperty`). La shape `ReifiedTypeShape` verifica che soggetto e valore siano compatibili con dominio, codominio o schema di quella proprietà.

| tipo | proprietà reificata | soggetto | valore | materializzata dall'ETL | fondamento di default |
|---|---|---|---|---|---|
| StatusAssertion | `chora:hasRealityStatus` | NarrativePlace | RealityStatusScheme | no (lo statuto viene dal foglio dei luoghi; IQ13 verifica la coerenza) | occorrenze del luogo |
| IdentificationAssertion | `chora:identifiedWith` | NarrativePlace | GazetteerEntity | sì, le adottate | occorrenze del luogo |
| LocationAssertion | `geo:hasGeometry` | GazetteerEntity | `geo:Geometry` (WKT, repertorio, locatore) | no (IQ19 verifica la coordinata) | nessuno |
| PartitionAssertion | `chora:hasZone` | Partition | PartitionZone | (dal foglio delle zone) | nessuno |
| MemoryAssertion | `chora:memoryAttribution` | PlaceReference | MemoryAttributionScheme | sì, le adottate | l'occorrenza |
| UncertaintyAssertion | `chora:hasUncertaintyType` | occorrenza (asse nome), luogo (identificazione), entità (geometria) | UncertaintyTypeScheme | no | per asse |
| VariantAssertion | `chora:hasVariant` | PlaceReference del testimone di riferimento | PlaceReference di altro testimone | sì, tutte | l'occorrenza |
| RouteTypeAssertion | `chora:hasRouteType` | NarrativeRoute | RouteTypeScheme | sì, le adottate | occorrenze portatrici |
| RepertoryAttestation | `chora:attestedInRepertory` | GazetteerEntity | `chora:Source` (un volume; la carta nel locatore) | sì, tutte | nessuno |
| NamingAssertion | `chora:nameReading` | PlaceReference o NarrativePlace | NamingMechanismScheme (+ `chora:playsOn` → GazetteerEntity) | sì, le adottate | occorrenze del luogo |
| CommentaryAssertion | — | occorrenza, luogo, percorso, entità, opera | — (nessun valore) | — | occorrenze del luogo |
| SpatialReading (interpretazioni) | `chora:targetsPlace` | (l'interpretazione stessa) | NarrativePlace + qualificazioni | — | l'occorrenza interpretata |

**Varianti.** `chora:variantKind`: **FormVariant** (le due occorrenze nominano lo stesso luogo, D-054) o **SubstitutionVariant** (luoghi diversi, o nessun luogo per l'occorrenza dell'altro testimone). Le occorrenze fuori dal testimone di riferimento (QPa) non entrano mai nelle viste (T-42).

**Statuti generati.** Per ogni luogo Imported senza asserzione di statuto esplicita, l'ETL genera `id:assertion/S-auto-{luogo}`. La motivazione è standard e cita le attestazioni dell'ancora primaria nel repertorio (D-068, D-087).

---

## 3. Fogli e colonne

Le sorgenti sono i TSV di `data/source/tables/`; la sezione `documentation` di `data/source/mapping.yaml` ripete queste tabelle con le righe di `tools/etl.py`.

### Assertions.tsv (una riga = una lettura)

| colonna | tripla prodotta | regola ETL | shape |
|---|---|---|---|
| Assertion_ID | `id:assertion/{id} a chora:Assertion`; atto `id:act/{id}` | obbligatorio | AssertionShape |
| Assertion_Type | atto `hico:hasInterpretationType` | status, identification, location, partition, memory, uncertainty, variant, route, repertory, naming, commentary | AssertionShape |
| Subject | `chora:aboutSubject` | `tipo/id` o `chora:Termine` | ReifiedTypeShape e shape per tipo |
| Value | `chora:assertsValue` (più valori con «\|») | obbligatorio salvo per i commenti | AssertionShape, ReifiedTypeShape |
| Author_ID | associazione ReadingAuthor sull'atto; `prov:wasAttributedTo` | agente di Agents.tsv; più autori con «\|» | ReadingProvenanceShape |
| Encoder_ID | associazione Encoder sull'atto o sulla codifica | obbligatorio | ReadingProvenanceShape |
| Source_Work | atto `hico:isExtractedFrom` | Source_ID o Witness_ID | InterpretationActShape |
| Source_Page | atto `chora:sourcePage` | per le attestazioni: «pagine del critico (repertorio, carta)» | — |
| Adopted | `chora:adoptedByProject` | si / no; al più una adottata per soggetto e tipo (IQ12) | — |
| Rationale | atto `chora:rationale` | — | StatusRationaleShape (statuti) |
| Revision_Of | `prov:wasRevisionOf` | stessa coppia soggetto/tipo (IQ16) | RevisionShape |
| Date | data della codifica | — | — |
| Note | `rdfs:comment` | — | — |
| Rationale_Type | atto `hico:hasInterpretationCriterion` | prova referenziale / testuale / lettura critica | InterpretationActShape |
| Review_Status | `chora:reviewStatus` | bozza / validata | StatusRationaleShape (Violation) |
| Uncertainty_Axis, Uncertainty_Origin | `chora:uncertaintyAxis`, `chora:uncertaintyOrigin` | solo per le incertezze | UncertaintyAssertionShape, UncertaintySubjectShape |
| Grounded_In | `chora:groundedIn` | se vuota, default (tabella § 2) | GroundingShape |
| Original_Source | atto `chora:originalSource` | lettura di seconda mano: l'atto prende la data dell'opera originale | — |
| Quotation | atto `chora:quotation` | estratto breve (una o due frasi), mai una nota intera | — |
| Plays_On | `chora:playsOn` | letture onomastiche | LociCriticiShape |
| Variant_Kind | `chora:variantKind` | forma / sostituzione; obbligatorio per le varianti | LociCriticiShape |
| Disagrees_With | `cito:disagreesWith` | — | LociCriticiShape |

### Agents.tsv, Sources.tsv, Witnesses.tsv, Locations.tsv

| foglio | colonne → triple |
|---|---|
| Agents | `Agent_ID` → `id:annotator/{id}` o `id:agent/{id}`, `a prov:Agent, prov:Person` e `chora:Annotator` o `chora:Scholar` (da `Agent_Type`); `Name` → `schema:name`; `Note` → `rdfs:comment` |
| Sources | `Source_ID` → `id:source/{id} a chora:Source` (⊑ frbr:Expression); `Label` → `rdfs:label`; `Reference` → `dcterms:bibliographicCitation`; `Author` → `dcterms:creator`; `Date` → `dcterms:date` (è la data dell'atto di uno studioso); `Type`, `Note`. **Un volume per fonte**: le carte sono locatori |
| Witnesses | `Witness_ID` → `id:witness/{id} a chora:Witness`; `Siglum` → `rdfs:label` (QPL, QP, QPa…); `Display_Label` → `skos:prefLabel` (per l'interfaccia, «QP (Adelphi 2018)»); `Read_In` → `chora:readIn` (edizione, RR II); `Page_Range`; `Derived_From` → `prov:wasDerivedFrom` (solo se documentata) |
| Locations | geometria del valore di una LocationAssertion: `Geometry_WKT` → `geo:asWKT`; `Repertory_ID` → `chora:repertory`; `Repertory_Locator` → `chora:sourcePage` della geometria; `Precision`, `Datum` |

### SpatialInterpretations.tsv (colonne della provenienza)

| colonna | tripla | regola |
|---|---|---|
| Annotator_ID | codificatore (associazione Encoder) | obbligatorio |
| Reading_Author_ID | autore della lettura (associazione ReadingAuthor) | vuoto = l'annotatore; uno studioso → atto e codifica distinti |
| Adopted | `chora:adoptedByProject`, sempre scritto | si / no; al più una adottata per occorrenza, luogo e focalizzatore (IQ20 e shape 25, Violation) |
| Revision_Of | `prov:wasRevisionOf` | — |
| Source_ID, Source_Page | fonte e pagina dell'atto | — |
| Anchors_To_Entity_ID | `chora:anchorsToEntity` (più ancore con «\|») | la posizione del luogo |
| Relational_Anchor_IDs, Relational_Anchor_Type | `chora:hasRelationalAnchoring` (termini; `tipo:id` per tipi diversi) | **senza ancore dirette, i termini del gazetteer sono le ancore** (D-084) |

---

## 4. Che cosa arriva all'interfaccia

- **Il GeoJSON porta solo le letture adottate:** le interpretazioni con `adoptedByProject true` (rilievo, tessere, percorsi) e le identificazioni adottate (`chora:identifiedWith`) per i luoghi senza ancore proprie. Le letture non adottate, i commenti, le attestazioni e le varianti restano nel grafo e nelle query; l'interfaccia le mostrerà con T-60.
- **Nessun luogo annotato senza ancora.**
  - Gli Imported confluiscono nella tessera dell'ancora primaria.
  - Transformed, Invented e Imagined hanno una tessera propria nel Diagramma, posizionata dalle ancore: dirette, ereditate con `isPartOf`, da identificazione adottata o dai termini relazionali.
  - «Senza coordinate» non vuol dire «fuori dall'interfaccia». Lo garantiscono IQ21 e la shape 23 (Violation), il controllo di `make audit` (ogni luogo annotato è nel GeoJSON) e l'adapter, che si ferma se trova un luogo annotato senza ancore.
- **Testimoni:** l'interfaccia mostra il `prefLabel` del testimone di riferimento, «QP (Adelphi 2018)», non la sigla del dataset (QPa).

---

## 5. Come aggiungere una lettura

1. **Fonte e autore:** se mancano, una riga in `Sources.tsv` (`Source_ID`, `Label`, `Reference`, `Date`) e una in `Agents.tsv` (`Agent_Type` = scholar).
2. **La lettura:** una riga in `Assertions.tsv`, con l'estratto breve in `Quotation` e la pagina in `Source_Page`.
3. **Il bersaglio:** se manca nel gazetteer, una riga in `GazetteerEntities.tsv`, senza coordinate se la lettura non è adottata.
4. `make all && make audit && make shacl && make queries`; una voce in `docs/DECISIONS.md`.

**Regola: una lettura nuova non toglie mai un luogo dall'interfaccia.** Le letture non cambiano ancore né visibilità; per cambiare la posizione di un luogo si cambiano le interpretazioni.

**Esempio 1. Identificazione contesa** (Aliciaro: un critico propone un altro referente):

```
Assertion_ID=I-0012  Assertion_Type=identification  Subject=narrativeplace/aliciaro
Value=gazetteer/gaz_<referente>  Author_ID=<studioso>  Encoder_ID=lorenzo_sabatino
Source_Work=<fonte>  Source_Page=<pagina>  Adopted=no
Rationale=<argomentazione in una frase>  Quotation=<estratto breve>
Rationale_Type=lettura critica  Review_Status=validata  Grounded_In=ref_00491
```

Non adottata: la tessera di Aliciaro resta dove la mettono le sue ancore. LC3 la mostra fra le letture concorrenti, se ce n'è un'altra.

**Esempio 2. Lettura onomastica** (Bottaro: il nome gioca su un toponimo reale):

```
Assertion_ID=N-0007  Assertion_Type=naming  Subject=reference/ref_00488
Value=chora:Paronomasia  Plays_On=gazetteer/gaz_<toponimo>  Author_ID=<studioso>
Encoder_ID=lorenzo_sabatino  Source_Work=<fonte>  Source_Page=<pagina>
Rationale=<…>  Quotation=<…>  Rationale_Type=lettura critica  Review_Status=validata
```

**Esempio 3. Commento** (Falcognana, Colli Albani: osservazione senza valore):

```
Assertion_ID=K-0011  Assertion_Type=commentary  Subject=narrativeplace/via_della_falcognana
Value=  Author_ID=<studioso>  Encoder_ID=lorenzo_sabatino  Source_Work=<fonte>
Source_Page=<pagina>  Rationale=<…>  Quotation=<…>  Rationale_Type=lettura critica
Review_Status=validata
```

Per rispondere a un'altra lettura: `Disagrees_With=K-0011`.

---

## 6. Controlli

| controllo | dove | gravità |
|---|---|---|
| tipo, soggetto, valore coerenti con la proprietà reificata | ReifiedTypeShape (SHACL-SPARQL) | Violation |
| provenienza: una generazione, ReadingAuthor sull'atto, Encoder sull'atto o sulla codifica | ReadingProvenanceShape | Violation |
| statuto motivato e validato per ogni luogo | StatusRationaleShape | Violation |
| luogo annotato con almeno un'ancora | shape 23, IQ21 | Violation |
| una sola interpretazione adottata per occorrenza, luogo, focalizzatore | shape 25, IQ20 | Violation |
| ogni luogo annotato nel GeoJSON; nessun `offMap` | `tools/audit_alignment.py` | build fallito |
| una lettura adottata per soggetto e tipo | IQ12 | query |
| statuto del luogo = lettura adottata, su tutti i luoghi | IQ13 | query |
| revisioni coerenti | IQ16 | query |
| varianti dal testimone di riferimento | IQ18 | query |
| coordinata dell'entità = posizione adottata | IQ19 | query |

Le query dei loci critici (`ontology/queries/loci_critici.rq`, eseguite da `make queries`):

- LC1: letture su un luogo;
- LC2: letture di un autore;
- LC3: letture concorrenti;
- LC4: letture fondate su un'occorrenza;
- LC5: fonte, pagina ed estratto;
- LC6: revisioni;
- LC7: attestazioni per carta.
