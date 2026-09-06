# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/it/1.1.0/).
Versionamento semantico applicato all'ontologia, non al dataset.

## [1.0.0] — non ancora rilasciata

> **Attenzione:** `owl:versionInfo` nella TBox dichiara ancora `4.1.1`.
> Prima del rilascio va deciso se pubblicare come 1.0.0 (e aggiornare la
> TBox in Protégé) o mantenere la numerazione 4.x. Vedi D-010.

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
