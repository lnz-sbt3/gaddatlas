# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).
Versionamento semantico applicato all'ontologia, non al dataset.

## [1.0.0] — non ancora rilasciata

> `owl:versionInfo` nella TBox dichiara `1.0.0` (verificato il 15/10/2026: è
> così dalla base canonica, commit `df1bd8a`; la nota precedente, «dichiara
> ancora `4.1.1`», non corrispondeva al file). Vedi D-010.

Prima versione pubblica. Rinomina e stabilizzazione dell'ontologia sviluppata
internamente come «GaddAtlas Ontology» fino alla v4.1.1.

### Cambiato
- Nome: da *GaddAtlas Ontology* a **CHORA — an Ontology for Narrative
  Spatiality**, per separare lo schema riusabile dal caso di studio
  (vedi `docs/DECISIONS.md` § D-008).
- Namespace: da `https://gaddatlas.org/ontology#` (placeholder mai registrato)
  a `https://w3id.org/chora#`.
- Vocabolari SKOS: da `https://gaddatlas.org/vocab/…` a
  `https://w3id.org/chora/vocab/…`.
- Numerazione ripartita da 1.0.0: la serie 1.x–4.1.1 era interna e senza
  consumatori esterni.
- I nomi dei file non portano più la versione (§ D-010).
- Statuto di realtà: definizioni di `chora:Invented` e `chora:Imagined`
  riportate alla lettera di Reuschel e Hurni (2011), con Reuschel, Piatti e
  Hurni (2013); `chora:Invented` ha ora la definizione con tag di lingua, in
  inglese e in italiano. È superata la definizione di Imagined del 9/10/2026
  («può essere collocato nel mondo reale…», D-061). Il commento di
  `chora:hasRealityStatus` precisa che l'ordine 1–4 è un ordinamento del
  vocabolario, non una scala di precisione o di affidabilità. Imagined resta
  un concetto dello schema con notazione 4 (D-090).
- `chora:hasFocalizer` e `chora:FocalizingAgent`: il focalizzatore è definito per
  inerenza, come l'agente a cui il luogo appartiene in quel punto del racconto, a
  prescindere da chi pronunci la menzione; commenti in italiano e in inglese (D-094).

### Rimosso
- `chora:hasNarratingVoice`, `chora:MemoryAssertion`, `chora:MemoryAttributionScheme`
  (`AuthorMemory`, `CharacterMemory`, `UndecidableMemory`) e `chora:memoryAttribution`:
  il focalizzatore è definito per inerenza, e voce e memoria restano nella tesi e nel
  commento critico (D-094).

### Corretto
- Dieci categorie di luogo presenti nei dati e assenti da `mapping.yaml`
  facevano perdere silenziosamente 13 asserzioni `chora:hasPlaceCategory`.
- Sei `owl:sameAs` serializzati come URI `file:///C:/Users/…`.

## [4.1.1] — 2026-08-11 (interna)
Ultima versione con namespace placeholder. `ga:NarrativeRoute` e le proprietà
di percorso (`targetsRoute`, `isNodeOfRoute`, `routeOrder`). Unificazione di
`DiscreteNarrativePlace` e `VagueNarrativeArea` in `ga:NarrativePlace`;
`hasRealityStatus` e `hasFuzzinessLevel` spostate sul luogo.

## [4.0] e precedenti — 2025-10 / 2026-07 (interne)
Sviluppo iniziale del modello a quattro assi e della separazione fra livello
attestativo (`PlaceReference`) e livello interpretativo
(`SpatialInterpretation`).
