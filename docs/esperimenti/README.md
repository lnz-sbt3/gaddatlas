# Esperimenti di estrazione — materiali di verifica

Materiali di supporto all'Appendice A della tesi, *Cicli del dataset ed esperimenti di estrazione*, e al §6.3. Nessun file contiene testo continuo del romanzo, protetto fino al 31/12/2043 (vedi `NOTICE-EXCERPTS.md`). Ci sono solo pagine dell'edizione Adelphi 2018, forme brevi, identificatori e giudizi.

## Contenuto

| Percorso | Contenuto | Tabella dell'appendice |
|---|---|---|
| `pilota/codice/` | script del pilota di riconoscimento automatico (ottobre 2025): estrazione per righe, modello `Davlan/xlm-roberta-base-ner-hrl`, regole per odonimi e quartieri, geocodifica Nominatim, esportazione GeoJSON e RDF | A.2.1 |
| `pilota/candidati.tsv` | i 31 candidati prodotti su QP 11–24, con giudizio, piano dell'errore, occorrenza abbinata ed esito della geocodifica | A.2 |
| `pilota/occorrenze.tsv` | le 30 occorrenze del dataset in QP 11–24, con l'esito nel pilota | A.3 |
| `pilota/geocodifiche.tsv` | risposte di Nominatim per i candidati geocodificati | A.2 |
| `individuazione/protocollo.md` | ricostruzione del protocollo dell'individuazione assistita (capp. VI–X) | A.3.1–A.3.2 |
| `individuazione/proposte.tsv` | le 1.315 proposte (pp. 166–307), **senza forme in superficie, estratti e note**, con esito e occorrenze abbinate | A.4–A.6 |
| `individuazione/riepilogo.tsv` | proposte e accolte per capitolo, modalità e stato proposto | A.4–A.6 |
| `confronto/confronta.py` | script del confronto fra proposte e occorrenze | A.3.3 |

## Metodo e limiti

- **Pilota.** Valutazione a posteriori (ottobre 2026) rispetto alle occorrenze annotate per lettura ravvicinata, abbinamento manuale candidato per candidato. Gli output sono del 18/10/2025; `run_pipeline.py` è stato modificato il 07/01/2026 e può differire in dettagli dalla versione che li ha prodotti.
- **Individuazione assistita.**
  - Confronto con il dataset al commit `133692c` (10/10/2026), prima dei sottoluoghi di D-091.
  - Abbinamento euristico: stessa pagina ±1; almeno il 90% delle parole dell'estratto dell'occorrenza contenute nell'estratto proposto; bonus se il luogo proposto coincide.
  - Il capitolo VI è conservato solo per le pp. 166–175.
  - Un solo validatore. I valori indicano tendenze, non misure di precisione.
- **Riproducibilità.** `confronta.py` richiede i fogli di lavoro con gli estratti, che restano riservati (variabile d'ambiente `ESTRAZIONE_DIR`) e non sono pubblicati. Le tabelle qui pubblicate ne sono l'esito.

## Materiali riservati, non pubblicati

- Il testo per righe delle pagine elaborate dal pilota (`blocks.json`) e gli altri output del pilota che contengono righe di testo (`entities_merged.json`, `ner_xlmr.json`, `atlante_pilot.geojson`, `atlante_pilot.ttl`, cache di geocodifica).
- I fogli di lavoro dell'individuazione assistita con forme, estratti e note.

Sono conservati dall'autore come materiale di lavoro, secondo le condizioni dell'art. 70-ter L. 633/1941 richiamate nel §6.2 della tesi.
