# Dati

## La regola

`source/` si modifica a mano. `dist/` no: si rigenera.

Le sorgenti sono:

| file | cos'è |
|---|---|
| `source/xlsx/*.xlsx` | l'annotazione, superficie di editing in Excel |
| `source/tables/*.tsv` | gli stessi dati, diffabili in git |
| `source/mapping.yaml` | etichette italiane → URI dell'ontologia |
| `source/void_seeds.json` | 48 semi congelati dei tasselli fittizi |
| `source/roma.geojson` | contorno amministrativo di Roma, sfondo della mappa |
| `../ontology/chora.rdf` | la TBox, curata in Protégé |

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

Al 2026-09-06, con `make all && make audit && make shacl`:

| | |
|---|---|
| Triple (full) | 17.203 |
| GazetteerEntity | 265, di cui 252 con tessera in mappa |
| NarrativePlace | 309, di cui 48 con tessera propria |
| PlaceReference | 722 — tutte con `chora:excerpt` |
| SpatialInterpretation | 962 — 933 verso luoghi, 29 verso route |
| FocalizingAgent | 83 · NarrativeRoute 18 · Chapter 10 |
| criticalNote | 59 · hasPlaceCategory 309 |
| Righe di `relief` | 933 — tutte risolvono a una feature |
| Audit | 9 invarianti su 9 |
| SHACL | conforme, nessuna violazione |
| Query | 12/12 competency, 10/10 integrity |

Esclusioni verificate come volute, non come perdite:

- **19 `PlaceReference` fuori da `relief`**: riferimenti di sola route
  (`targetsRoute` invece di `targetsPlace`).
- **13 `GazetteerEntity` fuori mappa**: zero interpretazioni ancorate.
- **261 `NarrativePlace` senza tessera propria**: 260 di statuto *Imported*, le
  cui occorrenze confluiscono nel rilievo dell'entità che le ancora, più uno
  senza alcuna interpretazione.

## `_note/References_manual.xlsx`

Superset di `References.xlsx` con quattro colonne in più che l'ETL non consuma.
Non è una sorgente: resta come reperto in attesa che si decida se archiviarlo.
Vedi la nota accanto.
