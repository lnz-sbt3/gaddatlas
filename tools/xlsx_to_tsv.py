#!/usr/bin/env python3
"""
xlsx_to_tsv.py — Conversione sicura Excel -> TSV per la pipeline GaddAtlas.

Perché "sicura":
  - usa il modulo csv con delimiter='\t' e QUOTE_MINIMAL: i campi che
    contengono tab, a-capo o virgolette vengono automaticamente quotati,
    così una description multi-riga NON spezza il file.
  - normalizza i valori: None -> "" (cella vuota), niente 'nan' testuali.
  - preserva gli interi come interi (evita che 1 diventi 1.0):
    se un numero è intero, lo scrive senza decimali.
  - encoding UTF-8 senza BOM, newline gestiti dal modulo csv.

Uso:
    python3 xlsx_to_tsv.py file1.xlsx file2.xlsx ...
    (genera file1.tsv, file2.tsv ... nella stessa cartella)
"""
import sys, csv, os
import openpyxl

def clean(v):
    if v is None:
        return ""
    # interi "puliti": 1.0 -> "1", ma 1.5 resta "1.5"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)

def convert(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    ws = wb.worksheets[0]          # primo foglio
    base = os.path.splitext(xlsx_path)[0]
    tsv_path = base + ".tsv"

    rows = list(ws.iter_rows(values_only=True))
    # rimuovi colonne di coda completamente vuote (header None)
    if rows:
        header = list(rows[0])
        # trova ultima colonna con header non nullo
        last = max((i for i, h in enumerate(header) if h not in (None, "")), default=len(header)-1)
        header = header[:last+1]
    else:
        header = []

    with open(tsv_path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, delimiter="\t", quoting=csv.QUOTE_MINIMAL,
                       quotechar='"', lineterminator="\n")
        w.writerow([clean(h) for h in header])
        for r in rows[1:]:
            row = [clean(c) for c in list(r)[:len(header)]]
            # salta righe interamente vuote
            if any(cell != "" for cell in row):
                w.writerow(row)

    # verifica di reintegrità: rileggi e conta colonne coerenti
    with open(tsv_path, encoding="utf-8") as f:
        rd = list(csv.reader(f, delimiter="\t", quotechar='"'))
    ncol = len(rd[0])
    bad = [i for i, r in enumerate(rd) if len(r) != ncol]
    print(f"OK  {xlsx_path} -> {tsv_path}")
    print(f"    righe: {len(rd)-1} dati | colonne: {ncol} | header: {rd[0]}")
    if bad:
        print(f"    !!! ATTENZIONE: {len(bad)} righe con numero colonne diverso: {bad[:5]}")
    else:
        print(f"    integrità colonne: OK (tutte {ncol})")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python3 xlsx_to_tsv.py file1.xlsx [file2.xlsx ...]")
        sys.exit(1)
    for p in sys.argv[1:]:
        convert(p)
