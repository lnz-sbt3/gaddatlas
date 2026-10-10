# TBOX_2 — Modello di fase 2: TBox, mapping, asserzioni

> **Superato** (10 ottobre 2026, D-089): il riferimento per il modello delle letture è `docs/MODELLO_LETTURE.md`. Questo documento resta come testimonianza della fase 2.

**9 ottobre 2026** · ramo `allinea-cap4-fase2`, HEAD `eadb380` · report in sola lettura: nessuna sorgente modificata.

Confronto: `ontology/chora.ttl` al tag `fase1-allineamento-cap4` (600 triple) contro HEAD (1.306 triple). Righe = righe di `ontology/chora.ttl` a HEAD; per `tools/etl.py` e `data/source/mapping.yaml` le righe sono quelle di HEAD. Conteggi dal grafo pubblicato `data/dist/gaddatlas-full.ttl` (29.730 triple).

## 1. Classi, proprietà e schemi SKOS

### 1.1 Entità modificate (esistevano in fase 1)

| IRI | modifica | righe | voce |
|---|---|---|---|
| prefisso `hico:` | dichiarato `@prefix hico: <http://purl.org/emmedi/hico/>` | 5 | D-042 |
| chora:appearsInWork | aggiunti `rdfs:comment` («Derived») e `owl:propertyChainAxiom ( chora:appearsInWitness chora:witnessOf )`; dominio PlaceReference, codominio LiteraryWork invariati | 278–284 | D-055 |
| chora:interpretationType | `owl:deprecated true` e `skos:historyNote`: il tipo di lettura è ora `chora:assertionType` | 393–400 | D-042 |
| chora:Imported | `skos:scopeNote`: motivazione standard dello statuto; un Imported non richiede asserzione di statuto | 615–623 | D-046 |
| chora:RealityStatusScheme | `skos:historyNote`: la permutazione Invented ↔ Imagined è una correzione di schema, non una revisione | 737–748 | D-051 |
| chora:SpatialRelationTypeScheme | `skos:hasTopConcept` esteso con Between, Boundary, Facing, Threshold | 778–797 | D-057, D-058 |

Il confronto rdflib segnala anche due `dcterms:contributor` dell'intestazione: sono nodi anonimi rinominati, non una modifica (il diff testuale non tocca quelle righe).

### 1.2 Entità aggiunte (96)

Le aggiunte sono in coda al file, per sezioni: asserzioni attribuite (D-042), `housedIn` (D-044), motivazione e revisione (D-046), incertezza (D-047), astensione (D-048), livelli enunciativi (D-049), partizioni (D-050), opera e testimoni (D-052), `appearsInWitness` (D-053), ancoraggio relazionale (D-057), relazioni qualitative (D-058), forma attestata (D-059), percorsi (D-060). La colonna «schema» indica `skos:inScheme` per i concetti e `dcterms:references` per le proprietà con valori SKOS. «—» = non dichiarato.

| IRI | tipo | sottoclasse / sottoproprietà / schema | dominio | codominio | definizione (o commento) | righe |
|---|---|---|---|---|---|---|
| chora:Assertion | owl:Class | prov:Entity, hico:InterpretationAct | — | — | An attributed reading about a resource of the dataset: who formulated it (prov:qualifiedAttribution with role chora:ReadingAuthor), who encoded it (role chora:Encoder), on which source, when, which earlier assertion it revises, and whether the project adopts it. Competing readings coexist as distinct assertions; the adopted one is attributed like the others. | 808–814 |
| chora:assertionType | owl:ObjectProperty | in chora:AssertionTypeScheme | chora:Assertion | skos:Concept | — | 819–824 |
| chora:aboutSubject | owl:ObjectProperty | — | chora:Assertion | — | The resource the assertion is about (a narrative place, a place reference, a gazetteer entity, an interpretation). | 826–830 |
| chora:assertsValue | owl:ObjectProperty | — | chora:Assertion | — | The value the assertion assigns to its subject: a concept (e.g. a reality status) or a resource (e.g. the gazetteer entity of an identification). | 832–836 |
| chora:adoptedByProject | owl:DatatypeProperty | — | chora:Assertion | xsd:boolean | True when the project adopts this reading (the one shown by the interface). It marks a choice, not a truth: the adopted reading is attributed like the others. | 838–843 |
| chora:rationale | owl:DatatypeProperty | — | chora:Assertion | rdf:langString | Textual, philological or critical motivation of the assertion (R07). | 845–850 |
| chora:sourceWork | owl:DatatypeProperty | — | chora:Assertion | xsd:string | Bibliographic key (author-date, as in the thesis bibliography) of the source on which the reading rests. | 852–857 |
| chora:sourcePage | owl:DatatypeProperty | — | chora:Assertion | xsd:string | Page or pages of the source work. | 859–864 |
| chora:AssertionTypeScheme | skos:ConceptScheme | — | — | — | Assertion type | 866–878 |
| chora:StatusAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Assigns a reality status to a narrative place. | 880–886 |
| chora:IdentificationAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Identifies a narrative place or a place reference with a gazetteer entity. Replaces owl:sameAs as a judgement of identity. | 888–894 |
| chora:LocationAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Locates a gazetteer entity according to a dated repertory. | 896–902 |
| chora:PartitionAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Assigns a place to an interpretive partition (e.g. city / countryside). | 904–910 |
| chora:MemoryAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Attributes a remembered or projected space to the author, to a character, or declares it undecidable. | 912–918 |
| chora:UncertaintyAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Qualifies the uncertainty of a reading by type, axis and origin. | 920–926 |
| chora:VariantAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Records a reading of another witness corresponding to an occurrence of the reference text. | 928–934 |
| chora:AttributionRoleScheme | skos:ConceptScheme | — | — | — | Attribution role | 936–942 |
| chora:ReadingAuthor | skos:Concept | in chora:AttributionRoleScheme | — | — | The agent who formulated the reading: a scholar, or the project when the reading is its own. | 944–949 |
| chora:Encoder | skos:Concept | in chora:AttributionRoleScheme | — | — | The agent who encoded the reading in the knowledge graph. | 951–956 |
| chora:housedIn | owl:ObjectProperty | — | chora:GazetteerEntity | chora:GazetteerEntity | An institution (e.g. a police station, a prison) is housed in a site (a building, a street). The two gazetteer entities are distinct referents: this is neither an identity (owl:sameAs) nor an identification assertion, and it never merges them. | 982–988 |
| chora:rationaleType | owl:ObjectProperty | in chora:RationaleTypeScheme | chora:Assertion | skos:Concept | — | 991–996 |
| chora:reviewStatus | owl:ObjectProperty | in chora:ReviewStatusScheme | chora:Assertion | skos:Concept | Whether the content of the assertion has been validated by the project, or is a draft prepared from existing documents. | 998–1004 |
| chora:RationaleTypeScheme | skos:ConceptScheme | — | — | — | Rationale type | 1006–1010 |
| chora:ReferentialEvidence | skos:Concept | in chora:RationaleTypeScheme | — | — | The reading rests on a repertory (map, guide, gazetteer) that documents or excludes the referent. | 1012–1017 |
| chora:TextualEvidence | skos:Concept | in chora:RationaleTypeScheme | — | — | The reading rests on the text itself (wording, position, context of the occurrences). | 1019–1024 |
| chora:CriticalReading | skos:Concept | in chora:RationaleTypeScheme | — | — | The reading rests on a scholar's interpretation, cited with work and page. | 1026–1031 |
| chora:ReviewStatusScheme | skos:ConceptScheme | — | — | — | Review status | 1033–1037 |
| chora:Draft | skos:Concept | in chora:ReviewStatusScheme | — | — | Prepared from the existing documents (sheet descriptions, Chapter 4), not yet validated. | 1039–1044 |
| chora:Validated | skos:Concept | in chora:ReviewStatusScheme | — | — | Validated by the project. | 1046–1051 |
| chora:uncertaintyAxis | owl:ObjectProperty | in chora:UncertaintyAxisScheme | chora:Assertion | skos:Concept | — | 1061–1066 |
| chora:uncertaintyOrigin | owl:ObjectProperty | in chora:UncertaintyOriginScheme | chora:Assertion | skos:Concept | — | 1068–1073 |
| chora:UncertaintyTypeScheme | skos:ConceptScheme | — | — | — | Value of a chora:Assertion of type chora:UncertaintyAssertion. The absence of such an assertion means «not analysed», not «certain». | 1075–1080 |
| chora:Vagueness | skos:Concept | in chora:UncertaintyTypeScheme | — | — | The extent or boundary of the place is indeterminate. | 1082–1087 |
| chora:NonSpecificity | skos:Concept | in chora:UncertaintyTypeScheme | — | — | The text designates one among several candidates without resolving which (e.g. a disjunction). | 1089–1094 |
| chora:ContestedIdentification | skos:Concept | in chora:UncertaintyTypeScheme | — | — | Competing identifications of the referent, each supported by a reading. | 1096–1101 |
| chora:Discrepancy | skos:Concept | in chora:UncertaintyTypeScheme | — | — | The text diverges from a repertory or from itself; recorded, never corrected. | 1103–1108 |
| chora:Incompleteness | skos:Concept | in chora:UncertaintyTypeScheme | — | — | Information needed to locate or identify the place is missing in the sources. | 1110–1115 |
| chora:NonApplicability | skos:Concept | in chora:UncertaintyTypeScheme | — | — | A coordinate or referent does not apply to this occurrence. | 1117–1122 |
| chora:Oversight | skos:Concept | in chora:UncertaintyTypeScheme | — | — | A probable slip of the author (e.g. a misplaced accent). | 1124–1129 |
| chora:Anachronism | skos:Concept | in chora:UncertaintyTypeScheme | — | — | The referent did not exist, or was different, at the time of the story. | 1131–1136 |
| chora:Confusion | skos:Concept | in chora:UncertaintyTypeScheme | — | — | The text combines or confuses distinct referents. | 1138–1143 |
| chora:InternalDiscrepancy | skos:Concept | in chora:UncertaintyTypeScheme | — | — | Two passages of the text are mutually incompatible. | 1145–1150 |
| chora:UncertaintyAxisScheme | skos:ConceptScheme | — | — | — | Uncertainty axis | 1152–1156 |
| chora:NameAxis | skos:Concept | in chora:UncertaintyAxisScheme | — | — | Uncertainty about the name or its form. | 1158–1163 |
| chora:IdentificationAxis | skos:Concept | in chora:UncertaintyAxisScheme | — | — | Uncertainty about which referent is meant. | 1165–1170 |
| chora:GeometryAxis | skos:Concept | in chora:UncertaintyAxisScheme | — | — | Uncertainty about the position or extent. | 1172–1177 |
| chora:UncertaintyOriginScheme | skos:ConceptScheme | — | — | — | Uncertainty origin | 1179–1183 |
| chora:DocumentaryOrigin | skos:Concept | in chora:UncertaintyOriginScheme | — | — | Arises from the sources: text, witnesses, repertories. | 1185–1190 |
| chora:ConstructiveOrigin | skos:Concept | in chora:UncertaintyOriginScheme | — | — | Arises from the modelling choices of the project. | 1192–1197 |
| chora:localizationStatus | owl:ObjectProperty | in chora:LocalizationStatusScheme | chora:NarrativePlace | skos:Concept | Why a narrative place has no geographic anchoring. It is distinct from missing data: a place without anchoring and without this status is an error (integrity query IQ14). | 1205–1211 |
| chora:localizationReason | owl:DatatypeProperty | — | chora:NarrativePlace | rdf:langString | Motivation of a suspended localization. | 1213–1218 |
| chora:LocalizationStatusScheme | skos:ConceptScheme | — | — | — | Localization status | 1220–1224 |
| chora:NotYetAnalysed | skos:Concept | in chora:LocalizationStatusScheme | — | — | The anchoring has not been analysed yet. | 1226–1231 |
| chora:SuspendedWithReason | skos:Concept | in chora:LocalizationStatusScheme | — | — | The anchoring is deliberately suspended, for a stated reason (chora:localizationReason). | 1233–1238 |
| chora:NotApplicable | skos:Concept | in chora:LocalizationStatusScheme | — | — | A coordinate does not apply to the place (e.g. an imagined place, located «somewhere»). | 1240–1245 |
| chora:hasNarratingVoice | owl:ObjectProperty | — | chora:SpatialInterpretation | chora:FocalizingAgent | The voice that utters the passage of a spatial interpretation (who speaks), distinct from the focalizer (who perceives). Annotated only where a critical source discusses it; an interpretation without this property is «not annotated», which does not mean that voice and focalizer coincide. | 1256–1261 |
| chora:MemoryAttributionScheme | skos:ConceptScheme | — | — | — | Memory attribution | 1263–1267 |
| chora:AuthorMemory | skos:Concept | in chora:MemoryAttributionScheme | — | — | The remembered space belongs to the author's memory. | 1269–1274 |
| chora:CharacterMemory | skos:Concept | in chora:MemoryAttributionScheme | — | — | The remembered space belongs to the character's memory. | 1276–1281 |
| chora:UndecidableMemory | skos:Concept | in chora:MemoryAttributionScheme | — | — | The text does not allow the memory to be attributed to author or character. | 1283–1289 |
| chora:Partition | owl:Class | — | — | — | An interpretive partition of the territory (e.g. city / countryside), proposed by a reader. It is a hypothesis: its author, source and adoption are stated by a chora:PartitionAssertion whose subject is the partition. | 1301–1304 |
| chora:PartitionZone | owl:Class | — | — | — | One zone of a chora:Partition. A zone belongs to exactly one partition. | 1306–1309 |
| chora:hasZone | owl:ObjectProperty | — | chora:Partition | chora:PartitionZone | Links a partition to one of its zones. | 1311–1316 |
| chora:inPartitionZone | owl:ObjectProperty | — | chora:NarrativePlace | chora:PartitionZone | Assigns a narrative place to a zone of a partition. The assignment holds within the partition hypothesis that owns the zone; a place not assigned to any zone is not classified by that hypothesis. | 1318–1323 |
| chora:Witness | owl:Class | prov:Entity | — | — | A witness of a literary work: a periodical redaction, a typescript, a set of proofs, a first edition or a later edition, each carrying a state of the text. Derivations between witnesses (prov:wasDerivedFrom) are stated only where documented. | 1332–1336 |
| chora:witnessOf | owl:ObjectProperty | — | chora:Witness | chora:LiteraryWork | Links a witness to the work whose text it carries. | 1338–1343 |
| chora:referenceWitness | owl:ObjectProperty | — | chora:LiteraryWork | chora:Witness | The witness chosen by the project as reference text of the work: occurrences are annotated on its readings. | 1345–1350 |
| chora:witnessType | owl:ObjectProperty | in chora:WitnessTypeScheme | chora:Witness | skos:Concept | — | 1352–1357 |
| chora:editor | owl:DatatypeProperty | dcterms:contributor | chora:Witness | — | Editor(s) of an edition («a cura di»). | 1359–1364 |
| chora:heldAt | owl:DatatypeProperty | — | chora:Witness | rdf:langString | Institution and fonds holding an unpublished witness. | 1366–1371 |
| chora:WitnessTypeScheme | skos:ConceptScheme | — | — | — | Witness type | 1373–1378 |
| chora:PeriodicalRedaction | skos:Concept | in chora:WitnessTypeScheme | — | — | — | 1380–1384 |
| chora:Typescript | skos:Concept | in chora:WitnessTypeScheme | — | — | — | 1386–1390 |
| chora:Proofs | skos:Concept | in chora:WitnessTypeScheme | — | — | — | 1392–1396 |
| chora:FirstEdition | skos:Concept | in chora:WitnessTypeScheme | — | — | — | 1398–1402 |
| chora:Edition | skos:Concept | in chora:WitnessTypeScheme | — | — | A later edition of the work, edited (e.g. collected works, the reference edition). | 1404–1409 |
| chora:appearsInWitness | owl:ObjectProperty | — | chora:PlaceReference | chora:Witness | The witness in which a place reference occurs (D-053). Occurrences in witnesses other than the reference witness enter only as comparison corpora: they point to the same narrative place, never count in the views of the published novel, and carry no status of their own. | 1411–1416 |
| chora:RelationalAnchoring | owl:Class | — | — | — | The placement of a narrative place relative to one or more geographic entities («between», «near»), as stated by a passage. It produces no geometry: a place without an adopted position stays off the map, with its relational anchoring. | 1428–1431 |
| chora:hasRelationalAnchoring | owl:ObjectProperty | — | chora:SpatialInterpretation | chora:RelationalAnchoring | — | 1433–1437 |
| chora:relatum | owl:ObjectProperty | — | chora:RelationalAnchoring | unione di chora:GazetteerEntity ∪ chora:NarrativePlace | A geographic entity, or another narrative place, with respect to which the place is located. A narrative place as relatum makes the relation hold without a geographic referent (R17, D-058). | 1439–1444 |
| chora:relationalType | owl:ObjectProperty | in chora:SpatialRelationTypeScheme | chora:RelationalAnchoring | skos:Concept | — | 1446–1451 |
| chora:Between | skos:Concept | in chora:SpatialRelationTypeScheme | — | — | — | 1453–1458 |
| chora:Threshold | skos:Concept | in chora:SpatialRelationTypeScheme | — | — | — | 1462–1467 |
| chora:Facing | skos:Concept | in chora:SpatialRelationTypeScheme | — | — | — | 1469–1474 |
| chora:Boundary | skos:Concept | in chora:SpatialRelationTypeScheme | — | — | — | 1476–1481 |
| chora:attestedForm | owl:DatatypeProperty | — | chora:PlaceReference | rdf:langString | The form of the toponym as printed in the witness of the reference, recorded where it differs from the normalized label of the place. It is transcribed, not corrected. | 1490–1495 |
| chora:nickname | owl:DatatypeProperty | skos:altLabel | chora:NarrativePlace | rdf:langString | A nickname of the place used in the text (antonomasia, popular name), distinct from a variant spelling of its toponym. | 1497–1503 |
| chora:RouteTypeAssertion | skos:Concept | in chora:AssertionTypeScheme | — | — | Assigns a route type to a narrative route. | 1512–1518 |
| chora:hasRouteType | owl:ObjectProperty | in chora:RouteTypeScheme | chora:NarrativeRoute | skos:Concept | Type of a route, derived from the adopted route type assertion. | 1520–1526 |
| chora:RouteTypeScheme | skos:ConceptScheme | — | — | — | Route type | 1528–1533 |
| chora:CompletedRoute | skos:Concept | in chora:RouteTypeScheme | — | — | A route the character actually travels in the story, once or habitually. | 1535–1541 |
| chora:IndicatedRoute | skos:Concept | in chora:RouteTypeScheme | — | — | A route described to a character by another, as directions. | 1543–1549 |
| chora:DreamedRoute | skos:Concept | in chora:RouteTypeScheme | — | — | A route travelled in a dream or a vision. | 1551–1557 |
| chora:InferredRoute | skos:Concept | in chora:RouteTypeScheme | — | — | A route reconstructed by a character or the narrator from traces or hypotheses, not narrated as travelled. | 1559–1565 |
| chora:DirectionalRoute | skos:Concept | in chora:RouteTypeScheme | — | — | A route known only as a direction or a road, without the stretch actually covered. | 1567–1574 |
| chora:ProposedRoute | skos:Concept | in chora:RouteTypeScheme | — | — | A route a character proposes to take, not (yet) travelled. | 1576–1582 |


Osservazioni sulla TBox:

- Molte proprietà oggetto con valori SKOS hanno codominio `skos:Concept`, non lo schema: il vincolo «valore dello schema X» sta nelle shape (`sh:in`), non nella TBox.
- `chora:aboutSubject` e `chora:assertsValue` non hanno codominio: soggetto e valore sono di classi diverse per tipo di asserzione (luogo, interpretazione, percorso, partizione, concetto, entità del gazetteer, occorrenza).
- `chora:relatum` ha codominio unione (GazetteerEntity ∪ NarrativePlace), dichiarato con un nodo anonimo `owl:unionOf`.
- `chora:nickname` è `rdfs:subPropertyOf skos:altLabel`; `chora:editor` è `rdfs:subPropertyOf dcterms:contributor`; `chora:Assertion` e `chora:Witness` sono sottoclassi di `prov:Entity`.

## 2. Colonne dei fogli: regola e tripla prodotta

`Assertions.tsv`, `Agents.tsv`, `Witnesses.tsv`, `PartitionZones.tsv` e `PartitionMembers.tsv` **non hanno un blocco di mapping operativo**. `mapping.yaml` documenta `Assertions` con un commento (r. 661–669, «Non ha un blocco di mapping») e `Witnesses` con un blocco che serve solo a risolvere `@Witness_ID` (r. 633–660, con l'allineamento LRMoo). La traduzione è codice in `tools/etl.py`. `id:` = `https://w3id.org/gaddatlas/id/`.

### 2.1 Assertions.tsv (`process_assertions`, etl.py r. 1260–1349)

| colonna | regola | tripla prodotta | righe etl.py |
|---|---|---|---|
| Assertion_ID | IRI `id:assertion/{id}`; obbligatorio | `<a> a chora:Assertion` | 1279–1287 |
| Assertion_Type | status, identification, location, partition, memory, uncertainty, variant, route → concetto di AssertionTypeScheme; altri valori: errore | `<a> chora:assertionType chora:StatusAssertion` … | 1283–1288 |
| Subject | `resolve_compact`: `tipo/id` relativo a `id:` oppure `chora:Termine`; un soggetto | `<a> chora:aboutSubject id:narrativeplace/castello` | 1236–1246, 1289 |
| Value | come Subject; più valori separati da «\|» | `<a> chora:assertsValue chora:Invented` (uno per valore) | 1290–1292 |
| Author_ID | agente di Agents.tsv (id nudo o `annotator/…`); più autori con «\|» | `<a> prov:qualifiedAttribution id:attribution/{id}-readingauthor-{agente}`; il nodo: `a prov:Attribution ; prov:agent … ; prov:hadRole chora:ReadingAuthor`; più `<a> prov:wasAttributedTo <agente>` | 1294–1298, 1248–1258 |
| Encoder_ID | come sopra, ruolo Encoder; obbligatorio | `… prov:hadRole chora:Encoder` (nessun `wasAttributedTo`) | 1299–1303 |
| Source_Work | letterale | `<a> chora:sourceWork "Manzotti 2010"^^xsd:string` | 1310 |
| Source_Page | letterale | `<a> chora:sourcePage "293"^^xsd:string` | 1311 |
| Adopted | si / sì / no; vuoto = nessuna tripla | `<a> chora:adoptedByProject true` (xsd:boolean) | 1304–1309 |
| Rationale | letterale @it | `<a> chora:rationale "…"@it` | 1312 |
| Revision_Of | Assertion_ID | `<a> prov:wasRevisionOf id:assertion/{id}` | 1336–1338 |
| Date | AAAA-MM-GG | `<a> prov:generatedAtTime "2026-10-09"^^xsd:date` | 1335 |
| Note | letterale @it | `<a> rdfs:comment "…"@it` | 1334 |
| Rationale_Type | prova referenziale / prova testuale / lettura critica | `<a> chora:rationaleType chora:ReferentialEvidence` | 1313–1317 |
| Review_Status | bozza / validata | `<a> chora:reviewStatus chora:Draft` | 1329–1333 |
| Uncertainty_Axis | nome / identificazione / geometria; obbligatorio per `uncertainty`, vietato per gli altri tipi | `<a> chora:uncertaintyAxis chora:GeometryAxis` | 1318–1328 |
| Uncertainty_Origin | documentaria / costruttiva; come sopra | `<a> chora:uncertaintyOrigin chora:DocumentaryOrigin` | 1318–1328 |
| (derivata) | per ogni asserzione `route` adottata | `id:route/{id} chora:hasRouteType chora:CompletedRoute` | 1339–1347 |

### 2.2 Agents.tsv (`process_agents`, etl.py r. 1132–1156)

| colonna | regola | tripla prodotta | righe |
|---|---|---|---|
| Agent_ID | IRI `id:annotator/{id}` se annotator, `id:agent/{id}` se scholar | `<ag> a prov:Agent` | 1143–1152 |
| Name | letterale senza lingua | `<ag> schema:name "Emilio Manzotti"` | 1153 |
| Agent_Type | annotator / scholar: sceglie il namespace, **nessuna tripla** | — | 1144–1150 |
| Note | letterale @it | `<ag> rdfs:comment "…"@it` | 1154 |

### 2.3 Witnesses.tsv (`process_witnesses`, etl.py r. 1078–1126; mapping.yaml r. 633–660)

| colonna | regola | tripla prodotta | righe |
|---|---|---|---|
| Witness_ID | IRI `id:witness/{id}` (via `@Witness_ID` del mapping) | `<w> a chora:Witness` | 1086–1100 |
| Siglum | letterale senza lingua | `<w> rdfs:label "QP57"` | 1103 |
| Work_ID | opera di LiteraryWorks.tsv; obbligatoria | `<w> chora:witnessOf id:work/quer_pasticciaccio` | 1088, 1101 |
| Witness_Type | redazione in rivista / dattiloscritto / bozze / princeps / edizione | `<w> chora:witnessType chora:FirstEdition` | 1089, 1102 |
| Date | AAAA → xsd:gYear; AAAA-MM-GG → xsd:date | `<w> dcterms:date "1957-06-22"^^xsd:date` | 1104–1107 |
| Editor | letterale @it | `<w> chora:editor "Giorgio Pinotti"@it` | 1108 |
| Publisher | letterale @it | `<w> dcterms:publisher "Garzanti, Milano"@it` | 1109 |
| Held_At | letterale @it | `<w> chora:heldAt "Pavia, Fondazione Maria Corti, Fondo Gelli"@it` | 1110 |
| Description | letterale @it | `<w> dcterms:description "…"@it` | 1111 |
| Note | letterale @it | `<w> rdfs:comment "…"@it` | 1112 |
| Reference | si → testimone di riferimento dell'opera | `id:work/quer_pasticciaccio chora:referenceWitness id:witness/qp` | 1113–1115 |
| Derived_From | Witness_ID, più valori con «\|»; risolti dopo il ciclo; richiede Derivation_Source | `<w> prov:wasDerivedFrom id:witness/qpl` | 1116–1125 |
| Derivation_Source | letterale @it | `<w> dcterms:source "Matt e Pinotti 2022, pp. 271–272 …"@it` | 1119 |

### 2.4 Colonne nuove (o compilate per la prima volta) negli altri fogli

| foglio | colonna | regola (mapping.yaml / etl.py) | tripla prodotta | voce |
|---|---|---|---|---|
| SpatialInterpretations | Annotator_ID (compilata su tutte le righe) | mapping r. 500–507 (`provenance`); etl r. 1023–1029 | due `prov:qualifiedAttribution` (Encoder, ReadingAuthor) + `prov:wasAttributedTo` | D-043 |
| SpatialInterpretations | Narrating_Voice_ID | mapping r. 446; etl r. 988–995 | `id:interpretation/interp_00636 chora:hasNarratingVoice id:focalizer/narrator` | D-049 |
| SpatialInterpretations | Relational_Anchor_IDs, Relational_Anchor_Type | mapping r. 435–442 (commento); etl r. 958–985 | `<si> chora:hasRelationalAnchoring id:relanchor/{interp}`; il nodo: `a chora:RelationalAnchoring ; chora:relationalType chora:Between ; chora:relatum …` | D-057, D-058 |
| NarrativePlaces | Localization_Status, Localization_Reason | **non documentate in mapping.yaml**; etl r. 595–604 | `<np> chora:localizationStatus chora:SuspendedWithReason ; chora:localizationReason "…"@it` | D-048 |
| NarrativePlaces | Nickname | mapping r. 298; etl r. 566–567 (una per forma, «;») | `<np> chora:nickname "palazzo de li pescicani"@it` | D-059 |
| NarrativePlaces | Alternative_Toponym (regola cambiata) | mapping r. 291–296; etl r. 564–565 | un `skos:altLabel` per forma (prima: un solo letterale con i «;») | D-059 |
| GazetteerEntities | Housed_In | mapping r. 342 (commento); etl r. 703–717 (risolto dopo il ciclo) | `<gaz> chora:housedIn <gaz>` | D-044 |
| GazetteerEntities | sameAs (regola cambiata) | etl r. 688–700 | `owl:sameAs` solo verso IRI esterni; un id interno è errore | D-044 |
| References | Witness_ID | mapping r. 213–217; etl r. 761–770 | `<ref> chora:appearsInWitness id:witness/qp ; chora:appearsInWork id:work/quer_pasticciaccio` (opera derivata) | D-053, D-055 |
| References | LiteraryWork_ID | **tolta** | — | D-055 |
| References | Attested_Form | mapping r. 240; etl r. 789 | `<ref> chora:attestedForm "Castel Savelli"@it` | D-059 |
| LiteraryWorks | Related_Work | mapping r. 627; etl r. 382–386 | `id:work/il_palazzo_degli_ori dcterms:relation id:work/quer_pasticciaccio` | D-052 |
| PartitionZones (nuovo) | Zone_ID, Partition_ID, Label, Definition | solo etl r. 1172–1202 | `id:partition/citta_campagna a chora:Partition ; chora:hasZone id:zone/roma_citta`; `<zona> a chora:PartitionZone ; rdfs:label ; skos:definition` | D-050 |
| PartitionMembers (nuovo) | NarrativePlace_ID, Zone_ID | solo etl r. 1204–1215 | `<np> chora:inPartitionZone id:zone/campagna_romana` | D-050 |

### 2.5 Esempi reali (da `data/gaddatlas.ttl`)

Un'asserzione per tipo presente nei dati: nessuna asserzione è di tipo `location` (v. § 5). Le asserzioni comprendono i nodi di attribuzione.

#### `status` — assertion/S-castello

```turtle
<https://w3id.org/gaddatlas/id/assertion/S-castello> a chora:Assertion ;
    rdfs:comment "Bozza T-33 (D-046): da validare in REVIEW_2"@it ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/S-castello-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/S-castello-readingauthor-lorenzo_sabatino> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/narrativeplace/castello> ;
    chora:adoptedByProject true ;
    chora:assertionType chora:StatusAssertion ;
    chora:assertsValue chora:Invented ;
    chora:rationale "Luogo testuale della «stazione di Castello» (QP 279), bersaglio di due identificazioni concorrenti (Cap. 4, § 4.3, r. 93; § 4.4, r. 107): Castel Gandolfo (LS, A-0001) e Castel Savello (Manzotti 2010, p. 293, A-0002, adottata). Statuto da rivedere alla luce della lettura adottata (REVIEW_2)."@it ;
    chora:rationaleType chora:CriticalReading ;
    chora:reviewStatus chora:Draft ;
    chora:sourcePage "293"^^xsd:string ;
    chora:sourceWork "Manzotti 2010"^^xsd:string .

<https://w3id.org/gaddatlas/id/attribution/S-castello-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/S-castello-readingauthor-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:ReadingAuthor .
```

#### `identification` — assertion/I-casal_bruciato

```turtle
<https://w3id.org/gaddatlas/id/assertion/I-casal_bruciato> a chora:Assertion ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/I-casal_bruciato-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/I-casal_bruciato-readingauthor-lorenzo_sabatino> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:wasRevisionOf <https://w3id.org/gaddatlas/id/assertion/C-casal_bruciato> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/narrativeplace/casal_bruciato> ;
    chora:adoptedByProject true ;
    chora:assertionType chora:IdentificationAssertion ;
    chora:assertsValue <https://w3id.org/gaddatlas/id/gazetteer/gaz_casale_abbruciato> ;
    chora:rationale "Casal Bruciato è il casale dell'Agro romano a sud di Roma, «Casal(e) Bruciato / Abbruciato / Abbrusciato» (Nibby, Dintorni di Roma, p. 569), fra le ferrovie Roma–Napoli e Roma–Velletri; posizione adottata TCI (D-037)."@it ;
    chora:rationaleType chora:ReferentialEvidence ;
    chora:reviewStatus chora:Validated ;
    chora:sourcePage "268–269; Tavv. VI–VII, pp. 300–301"^^xsd:string ;
    chora:sourceWork "Manzotti 2010"^^xsd:string .

<https://w3id.org/gaddatlas/id/attribution/I-casal_bruciato-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/I-casal_bruciato-readingauthor-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:ReadingAuthor .
```

#### `partition` — assertion/P-0001

```turtle
<https://w3id.org/gaddatlas/id/assertion/P-0001> a chora:Assertion ;
    rdfs:comment "Il poligono comunale di roma.geojson è scartato come criterio: include l'Agro romano (Divino Amore, Castel di Leva, Tor di Gheppio) ed esclude il Vaticano. Altre letture della partizione (Roggia, Perosa, Savettieri, Alfano, Calvino): fase 3."@it ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/P-0001-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/P-0001-readingauthor-lorenzo_sabatino> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/partition/citta_campagna> ;
    chora:adoptedByProject true ;
    chora:assertionType chora:PartitionAssertion ;
    chora:assertsValue <https://w3id.org/gaddatlas/id/zone/campagna_romana>,
        <https://w3id.org/gaddatlas/id/zone/roma_citta> ;
    chora:rationale "Partizione Roma città / campagna romana, lettura adottata dal progetto. Criterio: distanza dell'ancora primaria del luogo dal Campidoglio; città fino a 10 km (nei dati il primo luogo di campagna, Castel di Leva, è a 12,9 km; l'ultimo urbano, l'Acqua Marcia, a 8,4), campagna fra 10 e 30 km. Non si assegnano d'ufficio entità lineari o areali che attraversano la soglia, luoghi Imagined, luoghi senza ancora, il litorale e la fascia fra 30 e 60 km: sono i casi di confine (REVIEW_2)."@it ;
    chora:rationaleType chora:CriticalReading ;
    chora:reviewStatus chora:Draft ;
    chora:sourcePage "§ 4.1, § 4.6 (R20)"^^xsd:string ;
    chora:sourceWork "Capitolo 4"^^xsd:string .

<https://w3id.org/gaddatlas/id/attribution/P-0001-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/P-0001-readingauthor-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:ReadingAuthor .
```

#### `memory` — assertion/M-0003

```turtle
<https://w3id.org/gaddatlas/id/assertion/M-0003> a chora:Assertion ;
    rdfs:comment "Cap. 4, § 4.3: le tre letture convivono, nessuna è adottata dal progetto."@it ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/M-0003-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/M-0003-readingauthor-cortellessa> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/agent/cortellessa> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/interpretation/interp_00168> ;
    chora:adoptedByProject false ;
    chora:assertionType chora:MemoryAssertion ;
    chora:assertsValue chora:AuthorMemory,
        chora:CharacterMemory ;
    chora:rationale "La sequenza «sovrappone la memoria del personaggio, anzi la sovrimprime, a quella dell'autore» (QP 61, Dosso Faiti)."@it ;
    chora:rationaleType chora:CriticalReading ;
    chora:reviewStatus chora:Draft ;
    chora:sourcePage "669"^^xsd:string ;
    chora:sourceWork "Cortellessa 2023"^^xsd:string .

<https://w3id.org/gaddatlas/id/attribution/M-0003-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/M-0003-readingauthor-cortellessa> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/agent/cortellessa> ;
    prov:hadRole chora:ReadingAuthor .
```

#### `uncertainty` — assertion/U-0001

```turtle
<https://w3id.org/gaddatlas/id/assertion/U-0001> a chora:Assertion ;
    rdfs:comment "Bozza T-34 (D-047): classificazione da validare in REVIEW_2"@it ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/U-0001-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/U-0001-readingauthor-manzotti> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/agent/manzotti> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/narrativeplace/casal_bruciato> ;
    chora:assertionType chora:UncertaintyAssertion ;
    chora:assertsValue chora:Confusion ;
    chora:rationale "La topografia di Gadda «pare combinare e forse confondere» le due ferrovie, «fondandosi […] più sulla memoria di escursioni in loco, che sui rilievi delle carte»; TCI e testo tra le due ferrovie, IGM a ovest della Roma–Napoli. Discrepanza fra testo e repertorio, non corretta (D-037)."@it ;
    chora:rationaleType chora:CriticalReading ;
    chora:reviewStatus chora:Draft ;
    chora:sourcePage "268–269"^^xsd:string ;
    chora:sourceWork "Manzotti 2010"^^xsd:string ;
    chora:uncertaintyAxis chora:GeometryAxis ;
    chora:uncertaintyOrigin chora:DocumentaryOrigin .

<https://w3id.org/gaddatlas/id/attribution/U-0001-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/U-0001-readingauthor-manzotti> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/agent/manzotti> ;
    prov:hadRole chora:ReadingAuthor .
```

#### `variant` — assertion/V-0001

```turtle
<https://w3id.org/gaddatlas/id/assertion/V-0001> a chora:Assertion ;
    rdfs:comment "Cap. 4, § 4.3 (r. 83) e n. 26. La lettura di Terzoli 2015, p. 771 («se non è refuso, rafforza l'onomatopea») e quella di Italia 2020, pp. 101–102 entrano in fase 3."@it ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/V-0001-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/V-0001-readingauthor-pinotti> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/agent/pinotti> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/narrativeplace/frattocchie> ;
    chora:assertionType chora:VariantAssertion ;
    chora:assertsValue <https://w3id.org/gaddatlas/id/reference/ref_00588>,
        <https://w3id.org/gaddatlas/id/reference/ref_00724> ;
    chora:rationale "Fattocchie (RR II 219, stampa Garzanti) / Frattocchie (QP 241): emendamento dell'editore. Le occorrenze si annotano sulla lezione del testo di riferimento."@it ;
    chora:rationaleType chora:TextualEvidence ;
    chora:reviewStatus chora:Validated ;
    chora:sourcePage "241"^^xsd:string ;
    chora:sourceWork "QP (Adelphi 2018)"^^xsd:string .

<https://w3id.org/gaddatlas/id/attribution/V-0001-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/V-0001-readingauthor-pinotti> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/agent/pinotti> ;
    prov:hadRole chora:ReadingAuthor .
```

#### `route` — assertion/R-0020

```turtle
<https://w3id.org/gaddatlas/id/assertion/R-0020> a chora:Assertion ;
    rdfs:comment "Nuovo percorso (D-060). La lettura di Manzotti di «per fil a dest» (2010, p. 269) è una nota attribuita di fase 3."@it ;
    prov:generatedAtTime "2026-10-09"^^xsd:date ;
    prov:qualifiedAttribution <https://w3id.org/gaddatlas/id/attribution/R-0020-encoder-lorenzo_sabatino>,
        <https://w3id.org/gaddatlas/id/attribution/R-0020-readingauthor-lorenzo_sabatino> ;
    prov:wasAttributedTo <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    chora:aboutSubject <https://w3id.org/gaddatlas/id/route/tragitto_sogno_casal_bruciato_campo_morto> ;
    chora:adoptedByProject true ;
    chora:assertionType chora:RouteTypeAssertion ;
    chora:assertsValue chora:DreamedRoute ;
    chora:rationale "Il sogno di Pestalozzi: «al passaggio a livello di Casal Bruciato il vetrone girasole... per fil a dest!», il Roma-Napoli che «filava filava», la fuga «verso le gore senza foce del Campo Morto»."@it ;
    chora:rationaleType chora:TextualEvidence ;
    chora:reviewStatus chora:Draft ;
    chora:sourcePage "212"^^xsd:string ;
    chora:sourceWork "QP"^^xsd:string .

<https://w3id.org/gaddatlas/id/attribution/R-0020-encoder-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:Encoder .

<https://w3id.org/gaddatlas/id/attribution/R-0020-readingauthor-lorenzo_sabatino> a prov:Attribution ;
    prov:agent <https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> ;
    prov:hadRole chora:ReadingAuthor .
```

#### agente

```turtle
<https://w3id.org/gaddatlas/id/agent/manzotti> a prov:Agent ;
    rdfs:comment "Commento al cap. VIII del Pasticciaccio (Manzotti 2010, «Per leggere» 19)"@it ;
    schema:name "Emilio Manzotti" .

<https://w3id.org/gaddatlas/id/annotator/lorenzo_sabatino> a prov:Agent ;
    rdfs:comment "Codificatore del dataset GaddAtlas (dottorato in Digital Humanities, Università di Bologna, FICLIT)"@it ;
    schema:name "Lorenzo Sabatino" .
```

#### testimone e opera

```turtle
<https://w3id.org/gaddatlas/id/witness/qp57> a chora:Witness ;
    rdfs:label "QP57" ;
    dcterms:date "1957-06-22"^^xsd:date ;
    dcterms:description "Princeps Garzanti: finito di stampare del 22 giugno 1957. Nuovi capitoli consegnati fra il 23 aprile 1955 e il 6 febbraio 1957; il romanesco dei «tratti» di rivista rivisto con Dell'Arco, il quarto sacrificato, il tutto riorganizzato in dieci capitoli (Matt e Pinotti 2022, pp. 271–272)."@it ;
    dcterms:publisher "Garzanti, Milano"@it ;
    dcterms:source "Matt e Pinotti 2022, pp. 271–272 (revisione dei «tratti» di rivista); Cap. 4, n. 10 (bzFG = bozze del volume)"@it ;
    prov:wasDerivedFrom <https://w3id.org/gaddatlas/id/witness/bzfg>,
        <https://w3id.org/gaddatlas/id/witness/qpl> ;
    chora:witnessOf <https://w3id.org/gaddatlas/id/work/quer_pasticciaccio> ;
    chora:witnessType chora:FirstEdition .

<https://w3id.org/gaddatlas/id/work/quer_pasticciaccio> a chora:LiteraryWork ;
    dcterms:creator "Carlo Emilio Gadda"@it ;
    dcterms:date "1957"^^xsd:gYear ;
    dcterms:title "Quer pasticciaccio brutto de via Merulana"@it ;
    rdfs:comment "Romanzo. Testimoni in Witnesses.tsv (D-052): QPL, dtsFG, bzFG, QP57, RR II, QP (testo di riferimento)."@it ;
    chora:referenceWitness <https://w3id.org/gaddatlas/id/witness/qp> .
```

#### partizione e zona

```turtle
<https://w3id.org/gaddatlas/id/partition/citta_campagna> a chora:Partition ;
    chora:hasZone <https://w3id.org/gaddatlas/id/zone/campagna_romana>,
        <https://w3id.org/gaddatlas/id/zone/roma_citta> .

<https://w3id.org/gaddatlas/id/zone/campagna_romana> a chora:PartitionZone ;
    rdfs:label "Campagna romana"@it ;
    skos:definition "La campagna intorno a Roma, Castelli compresi: i luoghi la cui ancora primaria dista fra 10 e 30 km dal Campidoglio."@it .
```

#### appartenenza a una zona (estratto)

```turtle
id:narrativeplace/castel_di_leva chora:inPartitionZone id:zone/campagna_romana .
```

#### ancoraggio relazionale

```turtle
<https://w3id.org/gaddatlas/id/relanchor/interp_00472> a chora:RelationalAnchoring ;
    chora:relationalType chora:Between ;
    chora:relatum <https://w3id.org/gaddatlas/id/gazetteer/gaz_due_santi>,
        <https://w3id.org/gaddatlas/id/gazetteer/gaz_frattocchie> .
```

#### occorrenza: testimone e forma attestata

```turtle
<https://w3id.org/gaddatlas/id/reference/ref_00413> a chora:PlaceReference ;
    chora:appearsInWitness <https://w3id.org/gaddatlas/id/witness/qp> ;
    chora:appearsInWork <https://w3id.org/gaddatlas/id/work/quer_pasticciaccio> ;
    chora:attestedForm "Castel Savelli"@it ;
    chora:excerpt "Lui tutt'al rovescio, appena rosa e oro il cielo: da Rocca di Papa a Castel Savelli, giù: da Rocca Orsina al Monte Nuncupale, su"@it ;
    chora:mentionedInChapter <https://w3id.org/gaddatlas/id/chapter/capitolo_VI> ;
    chora:sourceReference "A 173"^^xsd:string .

<https://w3id.org/gaddatlas/id/reference/ref_00725> a chora:PlaceReference ;
    rdfs:comment "Il dattiloscritto dei capitoli nuovi legge «via Lata» dove QP 177 legge «via Lanza» (Pinotti 2025, p. 78; variante V-0002). Pagina del dattiloscritto non registrata."@it ;
    chora:appearsInWitness <https://w3id.org/gaddatlas/id/witness/dtsfg> ;
    chora:appearsInWork <https://w3id.org/gaddatlas/id/work/quer_pasticciaccio> ;
    chora:attestedForm "via Lata"@it ;
    chora:sourceReference "dtsFG"^^xsd:string .
```

#### luogo: stato di localizzazione, soprannome

```turtle
<https://w3id.org/gaddatlas/id/narrativeplace/palazzo_219> a chora:NarrativePlace ;
    rdfs:label "Palazzo di via Merulana 219"@it ;
    dcterms:description "Luogo che identifica il palazzo in via Merulana 219"@it ;
    skos:altLabel "ben nota architettura"@it,
        "camere al duecentodiciannove"@it,
        "casermone color pidocchio"@it,
        "il duecentodiciannove"@it,
        "sto palazzo"@it ;
    chora:hasPlaceCategory chora:historical_building ;
    chora:hasRealityStatus chora:Transformed ;
    chora:inPartitionZone <https://w3id.org/gaddatlas/id/zone/roma_citta> ;
    chora:nickname "er palazzo dell'oro"@it,
        "palazzo de li pescicani"@it .

<https://w3id.org/gaddatlas/id/narrativeplace/robine_vecchie> a chora:NarrativePlace ;
    rdfs:label "Robine Vecchie"@it ;
    dcterms:description "Robine Vecchie è un microtoponimo gaddiano non identificato, forse deformazione di un nome locale o denominazione fantastica applicata al paesaggio reale di Frattocchie–Due Santi."@it ;
    chora:hasPlaceCategory chora:locality ;
    chora:hasRealityStatus chora:Transformed ;
    chora:inPartitionZone <https://w3id.org/gaddatlas/id/zone/campagna_romana> ;
    chora:localizationReason "Solo ancoraggio relazionale: il passo colloca le Robine Vecchie fra Frattocchie e Due Santi (QP 169), senza una posizione. Toponimo «non registrato nelle carte topografiche» (Terzoli 2015, p. 491)."@it ;
    chora:localizationStatus chora:SuspendedWithReason .
```


## 3. Conteggi delle asserzioni

97 asserzioni.

| tipo | n. | classe del soggetto | adottate (true / false / non dichiarato) | bozza / validata |
|---|---|---|---|---|
| StatusAssertion | 53 | NarrativePlace (53) | 51 / 2 / 0 | 51 / 2 |
| RouteTypeAssertion | 21 | NarrativeRoute (21) | 21 / 0 / 0 | 21 / 0 |
| UncertaintyAssertion | 8 | NarrativePlace (8) | 0 / 0 / 8 | 8 / 0 |
| MemoryAssertion | 6 | SpatialInterpretation (6) | 0 / 6 / 0 | 6 / 0 |
| IdentificationAssertion | 4 | NarrativePlace (4) | 2 / 2 / 0 | 0 / 4 |
| VariantAssertion | 4 | NarrativePlace (4) | 0 / 0 / 4 | 0 / 4 |
| PartitionAssertion | 1 | Partition (1) | 1 / 0 / 0 | 1 / 0 |
| LocationAssertion | 0 | — | — | — |

**Con soggetto una SpatialInterpretation: 6**, le sei asserzioni di memoria su QP 61 (interp_00168, interp_00169; M-0001…M-0006).

Note:

- Le due StatusAssertion non adottate sono le letture del censimento superate (C-edicola_due_santi, C-palazzo_simonetti, D-051).
- Le due IdentificationAssertion non adottate sono A-0001 (Castel Gandolfo) e C-casal_bruciato.
- Incertezze e varianti non dichiarano l'adozione: sono classificazioni, non letture alternative fra cui scegliere.
- Un valore d'asserzione non è tipizzato nel grafo: `gazetteer/gaz_casal_bruciato` in C-casal_bruciato, entità eliminata in D-029 e conservata solo come IRI della lettura superata.

## 4. Allineamento a HiCO e a PROV

| dichiarazione | righe | note |
|---|---|---|
| `chora:Assertion rdfs:subClassOf prov:Entity, hico:InterpretationAct` | 808–814 | sì: l'allineamento a HiCO è dichiarato, sulla sola classe Assertion |
| `hico:InterpretationAct a owl:Class ; rdfs:isDefinedBy <http://purl.org/emmedi/hico>` | 816–817 | dichiarazione locale minima della classe; HiCO non è importato (`owl:imports` assente) |
| `chora:SpatialInterpretation rdfs:subClassOf prov:Entity` | 771–776 | **non** è sottoclasse di `hico:InterpretationAct` né di `chora:Assertion` (fase 1, invariata). Porta comunque le attribuzioni qualificate (D-043) |
| `chora:Witness rdfs:subClassOf prov:Entity` | 1332–1336 | |
| `chora:ReadingAuthor`, `chora:Encoder` `a prov:Role, skos:Concept` (schema AttributionRoleScheme) | 936–957 | usati come `prov:hadRole` dei nodi `prov:Attribution` |
| `prov:Entity`, `prov:Agent`, `prov:Attribution` dichiarate `owl:Class` con `rdfs:isDefinedBy` | 473, 658, 961 | dichiarazioni locali; PROV-O non è importato |
| proprietà PROV usate senza ridichiararle | — | `prov:qualifiedAttribution`, `prov:agent`, `prov:hadRole`, `prov:wasAttributedTo`, `prov:generatedAtTime`, `prov:wasRevisionOf`, `prov:wasDerivedFrom` |

Nessuna proprietà HiCO è usata: autore (`hico:isExtractedFrom`, `hico:hasInterpretationType`, `hico:hasInterpretationCriterion`…) e tipo di lettura sono espressi con proprietà CHORA (`chora:assertionType`, `chora:rationaleType`, `chora:sourceWork`) e PROV. La definizione di `chora:SpatialInterpretation` (r. 775) dice ancora che l'interpretazione assegna lo «status di realtà», che dalla v4.1.1 sta sul luogo.

## 5. Asserzioni di tipo `location`

**Nessuna.** Il concetto `chora:LocationAssertion` esiste (r. 896–902, «Locates a gazetteer entity according to a dated repertory») ed è ammesso da `AssertionShape` (`chora-shapes.ttl` r. 304), ma non ha istanze, e né le query né l'adapter lo leggono.

La posizione oggi passa per tre canali, nessuno attribuito come asserzione:

1. le coordinate della GazetteerEntity (`geo:lat`, `geo:long`, geometria) e la sua fonte in prosa (`dcterms:source`, da `Authority_Source`). Per `gaz_casale_abbruciato` la posizione adottata (TCI) e l'alternativa (IGM, F. 150 III SO) stanno entrambe in quel testo;
2. l'ancoraggio dell'interpretazione (`chora:anchorsToEntity`), che dà la geometria al luogo (D-057);
3. per un luogo senza ancore proprie, l'identificazione adottata (IdentificationAssertion, D-045: `castello` → Castel Savello).

Rapporto con le SpatialInterpretation dello stesso luogo: non c'è, perché non ci sono asserzioni `location`. Se le posizioni alternative di Casal Bruciato (TCI/IGM) diventassero due LocationAssertion con soggetto `gaz_casale_abbruciato`, le 13 interpretazioni di `casal_bruciato` continuerebbero ad ancorarsi all'entità, non alle asserzioni. La coordinata adottata resterebbe quella dell'entità, e la coerenza fra le due andrebbe garantita da una query come IQ13 per gli statuti.

## 6. NarrativePlace con `hasRealityStatus` senza asserzione di statuto

**258 luoghi, tutti Imported.** I 260 luoghi Imported meno Casal Bruciato ed edicola ai Due Santi, che hanno un'asserzione di statuto. Ogni luogo non Imported (49: Transformed 30, Invented 14, Imagined 5) ha un'asserzione di statuto adottata, e IQ13 verifica che il valore coincida con `hasRealityStatus`.

È la regola di D-046: per Imported vale la motivazione standard dello `skos:scopeNote` di `chora:Imported` («referente identificato nel repertorio»), senza un'asserzione per luogo. La conseguenza: per 258 luoghi lo statuto è un fatto del luogo, non una lettura attribuita. Contrasta con l'invariante «ogni interpretazione è un'asserzione attribuita», e se ne dovrà dare conto (Appendice J).
