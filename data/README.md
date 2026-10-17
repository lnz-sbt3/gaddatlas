# Dati

## La regola

`source/` si modifica a mano. `dist/` no: si rigenera.

Le sorgenti sono:

| file | cos'è |
|---|---|
| `source/tables/*.tsv` | l'annotazione: **sorgente canonica** (D-019), diffabile in git |
| `source/tables/Assertions.tsv` | le letture attribuite (D-042): una riga per lettura, con autore, codificatore, fonte, adozione; facoltativo |
| `source/tables/PartitionZones.tsv`, `PartitionMembers.tsv` | le zone delle partizioni interpretative (città / campagna, D-050) e i luoghi assegnati a ciascuna; la partizione è attribuita in `Assertions.tsv`; facoltativi |
| `source/tables/Witnesses.tsv` | i testimoni dell'opera (D-052, D-073): QPL, dtsFG, bzFG, QP (versione in volume, 1957), QPa (Adelphi 2018, testo di riferimento); tipo, data, curatore, edizione in cui sono letti (RR II), derivazioni documentate; allineamento LRMoo in `mapping.yaml` |
| `source/tables/Sources.tsv` | le fonti delle letture (bibliografia del Cap. 4, censimento; D-067): l'atto interpretativo ne cita una con `hico:isExtractedFrom`, e la sua data è la data dell'atto di uno studioso |
| `source/tables/Locations.tsv` | la geometria (WKT, precisione, datum, repertorio) delle posizioni attribuite (`location` in Assertions.tsv; D-069) |
| `source/mapping.yaml` | etichette italiane → URI dell'ontologia |
| `source/void_seeds.json` | 48 semi congelati dei tasselli fittizi |
| `source/roma.geojson` | contorno amministrativo di Roma, sfondo della mappa |
| `../ontology/chora.ttl` | la TBox (D-020); `chora.rdf` ne è il derivato RDF/XML |

Gli XLSX in `source/xlsx/` sono un **derivato** dei TSV (`make xlsx`), comodo per
chi lavora in Excel. Una modifica fatta lì torna nel TSV con
`python3 tools/xlsx_to_tsv.py data/source/xlsx/<Foglio>.xlsx` e poi spostando il TSV
in `source/tables/`: lo script sovrascrive, quindi va controllato il diff.

Dopo ogni modifica a una di queste:

```bash
make all      # rdf → geojson → passages → audit
make shacl    # deve dire CONFORMS: True
```

`source/void_seeds.json` merita un avviso a parte: congela l'azimut e la
silhouette dei 48 tasselli narrativi. Se lo perdi, `build_geojson.py` li
rigenera per hash e la figura calibrata cambia in modo irreversibile.

## Cosa produce la build

| file | cos'è | versionato |
|---|---|---|
| `gaddatlas.ttl` | ABox, 16.045 triple | sì |
| `dist/gaddatlas-full.ttl` | TBox + ABox, 17.203 triple | sì |
| `dist/gaddatlas.geojson` | view model dell'interfaccia, 300 feature | sì |
| `dist/atlas.slim.json` | proiezione completa, senza estratti | sì |
| `dist/passages/` | 722 brani in 10 file + indice | sì |
| `dist/void_seeds.json` | semi effettivamente usati, per il build successivo | sì |
| `dist/shacl-report.ttl` | esito della validazione | sì |
| `dist/atlas.json` | proiezione **con** i 722 estratti | **no** |

`atlas.json` è escluso da git di proposito: è l'unico artefatto che
permetterebbe di scaricare l'intero corpus gaddiano in un colpo solo, contro la
decisione D-004 e `NOTICE-EXCERPTS.md`. Resta in locale per query e analisi.

I derivati sono versionati pur essendo rigenerabili: garantisce che il sito sia
pubblicabile e il dato citabile senza dover eseguire la pipeline. La CI in
`.github/workflows/data.yml` verifica a ogni push che coincidano con la build.

## Stato verificato

Al 2026-10-18 (fase 3g, D-094), con `make all && make audit && make shacl`:

| | |
|---|---|
| Triple (full) | 45.441 (ABox 43.303, TBox 1.568) |
| GazetteerEntity | 271, di cui 254 con tessera in mappa (5 senza coordinate) |
| NarrativePlace | 313, di cui 50 con tessera propria |
| Reality Status | Imported 263 · Transformed 32 · Invented 18 · Imagined 0 |
| PlaceReference | 744 — 738 del testimone di riferimento QPa, tutte con `chora:excerpt`, confrontate con il volume a stampa (D-092); 6 di altri testimoni |
| SpatialInterpretation | 974 (970 adottate) — 943 verso luoghi, 31 verso route |
| FocalizingAgent | 83 · NarrativeRoute 21 · Chapter 10 |
| criticalNote | 79 · hasPlaceCategory 312 |
| Righe di `relief` | 939 — tutte risolvono a una feature |
| Audit | 16 invarianti su 16 |
| SHACL | conforme, nessun risultato |
| Query | 12/12 competency, 21/21 integrity, 7/7 loci critici |

*Imagined* è una categoria del vocabolario senza istanze nel *Pasticciaccio*:
Gadda colloca tutti i suoi luoghi fittizi dentro una geografia nota, e sono
quindi *Invented* (D-090). Non è un'esclusione: la categoria si applica, ma
nessun luogo la soddisfa.

Esclusioni verificate come volute, non come perdite:

- **22 `PlaceReference` fuori da `relief`**: riferimenti di sola route
  (`targetsRoute` invece di `targetsPlace`).
- **6 `PlaceReference` di altri testimoni**: corpora di confronto (D-053).
- **17 `GazetteerEntity` fuori mappa**: zero interpretazioni ancorate.
- **263 `NarrativePlace` senza tessera propria**: tutti di statuto *Imported*,
  le cui occorrenze confluiscono nel rilievo dell'entità che li ancora.

## `_note/References_manual.xlsx`

Superset di `References.xlsx` con quattro colonne in più che l'ETL non consuma.
Non è una sorgente: resta come reperto in attesa che si decida se archiviarlo.
Vedi la nota accanto.
