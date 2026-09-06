# References_manual.xlsx

Superset di `References.xlsx`: stesse 722 righe e stessi `Reference_ID`, ma 12
colonne invece di 8. Le quattro in più — `Default_VagueArea_ID`,
`Surface_Toponym`, `Concept_ID`, `Occurrences` — non sono consumate
dall'ETL (vedi `mapping.yaml`).

**Da decidere.** Se quelle colonne portano informazione critica ancora utile,
vanno mappate e fatte entrare nel grafo; se sono residuo di una fase precedente
del modello, il file va spostato in `_archivio/` fuori dal repository.

Finché la decisione non è presa il file resta qui, ma **non è una sorgente**:
l'ETL legge `data/source/tables/References.tsv`.
