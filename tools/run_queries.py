#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Esecutore di query SPARQL su un file TTL — GaddAtlas / CHORA 4.1.1
Alternativa alla scheda SPARQL di Protege, piu' veloce e senza limiti sulle
aggregazioni. Le query nel file .rq sono separate da righe "# ==== NOME ====".
"""
import argparse, re, sys
from pathlib import Path
import rdflib

ap = argparse.ArgumentParser()
ap.add_argument('--graph',   default='data/dist/gaddatlas-full.ttl')
ap.add_argument('--queries', default='ontology/queries/competency.rq')
ap.add_argument('--only',    default=None, help='esegue solo le query il cui nome contiene questa stringa (es. CQ3)')
ap.add_argument('--limit',   type=int, default=25, help='righe mostrate per query (0 = tutte)')
a = ap.parse_args()

for f in (a.graph, a.queries):
    if not Path(f).is_file():
        sys.exit(f"File non trovato: {Path(f).resolve()}")

g = rdflib.Graph(); g.parse(a.graph, format='turtle')
print(f"Grafo: {a.graph} — {len(g)} triple\n")

raw = Path(a.queries).read_text(encoding='utf-8')
blocks = re.split(r'^# ==== (.+?) ====\s*$', raw, flags=re.M)[1:]
pairs = list(zip(blocks[::2], blocks[1::2]))

for name, body in pairs:
    if a.only and a.only.lower() not in name.lower():
        continue
    query = '\n'.join(l for l in body.splitlines() if not l.strip().startswith('#')).strip()
    if not query:
        continue
    print('=' * 78); print(name)
    try:
        rows = list(g.query(query))
    except Exception as e:
        print(f"  ERRORE: {e}\n"); continue
    print(f"  righe: {len(rows)}")
    if rows:
        cols = [str(v) for v in rows[0].labels] if hasattr(rows[0], 'labels') else []
        if cols: print('  ' + ' | '.join(c[:28].ljust(28) for c in cols))
        shown = rows if a.limit == 0 else rows[:a.limit]
        for r in shown:
            print('  ' + ' | '.join(
                (str(v).replace('https://w3id.org/gaddatlas/id/', '') if v is not None else '-')[:28].ljust(28)
                for v in r))
        if a.limit and len(rows) > a.limit:
            print(f"  ... e altre {len(rows) - a.limit} righe")
    print()
