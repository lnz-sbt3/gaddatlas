#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validazione SHACL GaddAtlas / CHORA 4.1.1
=========================================
NOTA: la validazione gira SENZA inferenza (inference='none') e senza
ont_graph. Non e' una svista:
  - pySHACL con inference='rdfs' sul grafo GaddAtlas va in timeout;
  - non serve, perche' l'ETL materializza gia' la chiusura dei tipi
    (chora:Character/chora:Narrator + chora:FocalizingAgent esplicito).
Se un giorno si togliesse quella materializzazione dall'ETL, questa
validazione tornerebbe a produrre un falso positivo per ogni
SpatialInterpretation.
"""
import argparse, re, sys
from collections import Counter
from pathlib import Path
import rdflib
from pyshacl import validate

ap = argparse.ArgumentParser(description="Validazione SHACL A-Box GaddAtlas")
ap.add_argument('--data',   default='data/dist/gaddatlas-full.ttl',    help='TTL completo da validare')
ap.add_argument('--shapes', default='ontology/shapes/chora-shapes.ttl',  help='File SHACL')
ap.add_argument('--report', default='data/dist/shacl-report.ttl',      help='Report di output')
a = ap.parse_args()

for f in (a.data, a.shapes):
    if not Path(f).is_file():
        sys.exit(f"File non trovato: {Path(f).resolve()}")

dg = rdflib.Graph(); dg.parse(a.data,   format='turtle')
sg = rdflib.Graph(); sg.parse(a.shapes, format='turtle')
print(f"Dati: {len(dg)} triple ({a.data})")
print(f"Shape: {len(sg)} triple ({a.shapes})")

conforms, report_graph, report_text = validate(
    dg, shacl_graph=sg, inference='none', advanced=True
)
report_graph.bind(
    'chora',
    rdflib.Namespace('https://w3id.org/chora#'),
    override=True,
    replace=True,
)
report_graph.serialize(destination=a.report, format='turtle')

print(f"\nCONFORMS: {conforms}")
msgs = re.findall(r'Message: (.+)', report_text)
if msgs:
    print(f"Violazioni: {len(msgs)}\n")
    for m, n in Counter(msgs).most_common():
        print(f"  {n:5}  {m[:110]}")
    print("\nDettaglio per nodo:")
    SH = rdflib.Namespace('http://www.w3.org/ns/shacl#')
    for r in report_graph.subjects(rdflib.RDF.type, SH.ValidationResult):
        fn = report_graph.value(r, SH.focusNode)
        pa = report_graph.value(r, SH.resultPath)
        vl = report_graph.value(r, SH.value)
        short = lambda x: str(x).replace('https://w3id.org/gaddatlas/id/', '') if x else '-'
        print(f"  {short(fn):44} path={str(pa).split('#')[-1] if pa else '-':22} value={short(vl)}")
else:
    print("Nessuna violazione.")
print(f"\nReport salvato in {a.report}")
sys.exit(0 if conforms else 1)
