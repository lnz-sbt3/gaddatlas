#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generazione documentazione CHORA 4.1.1
======================================
Produce:
  index.html                            ontologia (OntPub + fix_pylode_metadata)
  vocab_placecategory.html              vocabolario PlaceCategory (64 concetti)
  vocab_<nome>.html                     un file per ciascuno dei 4 ConceptScheme
                                        incorporati nell'ontologia

Perche' un file per schema
--------------------------
Sia OntPub sia VocPub raccolgono title/description da OGNI soggetto tipizzato
owl:Ontology o skos:ConceptScheme e li fondono in un'unica lista. Con piu'
schemi nello stesso file, titolo e IRI mostrati diventano quelli dell'ultimo
schema elaborato. fix_pylode_metadata.py corregge il caso dell'ontologia;
per i vocabolari la soluzione strutturale e' isolarli, uno per documento.

Uso:
    python tools/build_docs.py
    python tools/build_docs.py --ontology ontology/chora.ttl
"""
import argparse, subprocess, sys, tempfile
from pathlib import Path
import rdflib
from rdflib.namespace import RDF, SKOS, OWL, DCTERMS
from pylode import OntPub, VocPub

ap = argparse.ArgumentParser()
ap.add_argument('--ontology', default='ontology/chora.ttl')
ap.add_argument('--vocab',    default='ontology/shapes/chora-placecategories.ttl')
ap.add_argument('--fixer',    default='tools/fix_pylode_metadata.py')
ap.add_argument('--outdir',   default='ontology/docs')
a = ap.parse_args()

out = Path(a.outdir); out.mkdir(parents=True, exist_ok=True)
for f in (a.ontology, a.vocab, a.fixer):
    if not Path(f).is_file():
        sys.exit(f"File non trovato: {Path(f).resolve()}")

# --- 1. Ontologia -----------------------------------------------------------
raw = out / 'chora_doc_raw.html'
OntPub(ontology=a.ontology).make_html(destination=str(raw))
subprocess.run([sys.executable, a.fixer, a.ontology, str(raw), str(out / 'index.html')], check=True)
raw.unlink()
print(f"  -> {out / 'index.html'}")

# --- 2. Vocabolario PlaceCategory (file autonomo, un solo schema) -----------
VocPub(ontology=a.vocab).make_html(destination=str(out / 'vocab_placecategory.html'))
print(f"  -> {out / 'vocab_placecategory.html'}")

# --- 3. I 4 ConceptScheme incorporati, uno per documento --------------------
src = rdflib.Graph(); src.parse(a.ontology)
ont = next(src.subjects(RDF.type, OWL.Ontology))
# metadati ereditati dall'ontologia: senza, i doc dei vocabolari sarebbero
# privi di autore, licenza e date.
inherited = [(p, o) for p in (DCTERMS.creator, DCTERMS.publisher, DCTERMS.license,
                              DCTERMS.created, DCTERMS.modified, OWL.versionInfo)
             for o in src.objects(ont, p)]

# Guardia: pyLODE tipizza ogni valore di publisher/creator/contributor come
# prov:Agent, rendendolo soggetto di una tripla. Se il valore e' un letterale,
# finisce in una clausola SPARQL VALUES come <Universita di Bologna> e la
# generazione fallisce con SparqlSyntaxError. Qui i letterali vengono convertiti
# in nodi anonimi con schema:name, che kurra ignora perche' BNode.
SDO_NAME = rdflib.URIRef('https://schema.org/name')
PROV_AGENT = rdflib.URIRef('http://www.w3.org/ns/prov#Agent')
AGENT_PROPS = (DCTERMS.publisher, DCTERMS.creator, DCTERMS.contributor)

def sanitize_agents(g: rdflib.Graph) -> int:
    fixed = 0
    for prop in AGENT_PROPS:
        for s_, o in list(g.subject_objects(prop)):
            if isinstance(o, rdflib.Literal):
                g.remove((s_, prop, o))
                node = rdflib.BNode()
                g.add((s_, prop, node))
                g.add((node, RDF.type, PROV_AGENT))
                g.add((node, SDO_NAME, rdflib.Literal(str(o))))
                fixed += 1
    return fixed

n_fixed = sanitize_agents(src)
if n_fixed:
    print(f"  (sanificati {n_fixed} agenti espressi come letterale)")

for scheme in sorted(src.subjects(RDF.type, SKOS.ConceptScheme), key=str):
    name = str(scheme).split('#')[-1]
    concepts = [c for c in src.subjects(RDF.type, SKOS.Concept)
                if (c, SKOS.inScheme, scheme) in src]
    g = rdflib.Graph()
    g.bind('chora', 'https://w3id.org/chora#', override=True, replace=True)
    g.bind('skos', SKOS)
    g.bind('dcterms', DCTERMS)
    for s in [scheme] + concepts:
        for p, o in src.predicate_objects(s):
            g.add((s, p, o))
    for p, o in inherited:
        g.add((scheme, p, o))
    if not list(g.objects(scheme, DCTERMS.title)):
        lbl = next(g.objects(scheme, SKOS.prefLabel), None) or rdflib.Literal(name)
        g.add((scheme, DCTERMS.title, lbl))
    with tempfile.NamedTemporaryFile('w', suffix='.ttl', delete=False, encoding='utf-8') as tf:
        tf.write(g.serialize(format='turtle')); tmp = tf.name
    dest = out / f"vocab_{name.replace('Scheme','').lower()}.html"
    VocPub(ontology=tmp).make_html(destination=str(dest))
    Path(tmp).unlink()
    print(f"  -> {dest}  ({len(concepts)} concetti)")

print("\nFatto.")

# --- 4. Collega fra loro i documenti ---------------------------------------
subprocess.run([
    sys.executable,
    str(Path(__file__).with_name('link_docs.py')),
    '--ontology', a.ontology,
    '--vocab', a.vocab,
    '--doc', 'index.html',
    '--dir', str(out),
], check=True)
