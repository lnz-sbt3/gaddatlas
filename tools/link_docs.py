#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Collega fra loro i documenti generati da pyLODE — CHORA 4.1.1
===============================================================
pyLODE produce pagine autonome e scollegate: l'HTML dell'ontologia non
rimanda ai vocabolari e viceversa. Questo script inserisce la navigazione:

  nell'ontologia   una sezione "Vocabularies" con voce nel Table of Contents,
                   piu' una riga "Vocabulary" nella scheda di ogni proprieta'
                   che attinge a un ConceptScheme;
  nei vocabolari   una barra di navigazione in testa, con ritorno
                   all'ontologia e collegamenti agli altri vocabolari.

Le corrispondenze proprieta' -> vocabolario NON sono cablate: si leggono
dalle triple dcterms:references asserite nell'ontologia. Aggiungendo un
vocabolario e la relativa annotazione, i link compaiono da soli.

Uso:
    python tools/link_docs.py
    python tools/link_docs.py --ontology ontology/chora.ttl --dir ontology/docs
"""
import argparse, sys
from pathlib import Path
import rdflib
from rdflib.namespace import RDF, SKOS, DCTERMS
from bs4 import BeautifulSoup

ap = argparse.ArgumentParser()
ap.add_argument('--ontology', default='ontology/chora.ttl')
ap.add_argument('--vocab',    default='ontology/shapes/chora-placecategories.ttl')
ap.add_argument('--doc',      default='index.html')
ap.add_argument('--dir',      default='ontology/docs')
a = ap.parse_args()
D = Path(a.dir)

g = rdflib.Graph(); g.parse(a.ontology)
try:
    g.parse(a.vocab, format='turtle')
except Exception:
    pass

def page_for(scheme_iri: str) -> str:
    return 'vocab_' + str(scheme_iri).split('#')[-1].replace('Scheme', '').lower() + '.html'

# scheda dei vocabolari: IRI -> (etichetta, file, n. concetti)
schemes = {}
for cs in g.subjects(RDF.type, SKOS.ConceptScheme):
    label = next(g.objects(cs, DCTERMS.title), None) or next(g.objects(cs, SKOS.prefLabel), None)
    n = len([c for c in g.subjects(RDF.type, SKOS.Concept) if (c, SKOS.inScheme, cs) in g])
    f = page_for(cs)
    if (D / f).is_file():
        schemes[str(cs)] = (str(label or str(cs).split('#')[-1]), f, n)
if not schemes:
    sys.exit("Nessuna pagina di vocabolario trovata in " + str(D.resolve()))

# proprieta' -> schema, da dcterms:references
prop_scheme = {str(s).split('#')[-1]: str(o) for s, o in g.subject_objects(DCTERMS.references)
               if str(o) in schemes}

# ---------------------------------------------------------------- ontologia
doc = D / a.doc
soup = BeautifulSoup(doc.read_text(encoding='utf-8'), 'html.parser')

for old in soup.find_all(class_='ga-injected'):
    old.decompose()

# 1. riga "Vocabulary" nella scheda di ogni proprieta' interessata
added = 0
for prop, cs in prop_scheme.items():
    div = soup.find(id=prop)
    if div is None:
        continue
    table = div.find('table')
    if table is None:
        continue
    label, f, n = schemes[cs]
    tr = soup.new_tag('tr'); tr['class'] = 'ga-injected'
    th = soup.new_tag('th'); th.string = 'Vocabulary'
    td = soup.new_tag('td')
    link = soup.new_tag('a', href=f); link.string = label
    td.append(link); td.append(f' — {n} concepts')
    tr.append(th); tr.append(td)
    table.append(tr); added += 1

# 2. sezione "Vocabularies" prima di Namespaces
ns_section = soup.find('div', id='namespaces')
section = soup.new_tag('div'); section['class'] = 'section ga-injected'; section['id'] = 'vocabularies'
h2 = soup.new_tag('h2'); h2.string = 'Vocabularies'; section.append(h2)
p = soup.new_tag('p')
p.string = ('The values of the properties above are drawn from the following SKOS concept schemes, '
            'each documented in its own page.')
section.append(p)
ul = soup.new_tag('ul')
for cs, (label, f, n) in sorted(schemes.items(), key=lambda x: x[1][0]):
    li = soup.new_tag('li')
    link = soup.new_tag('a', href=f); link.string = label
    li.append(link); li.append(f' — {n} concepts')
    users = [pr for pr, s in prop_scheme.items() if s == cs]
    if users:
        li.append(' · used by ')
        for i, pr in enumerate(sorted(users)):
            if i: li.append(', ')
            pl = soup.new_tag('a', href='#' + pr); pl.string = pr
            li.append(pl)
    ul.append(li)
section.append(ul)
(ns_section.insert_before(section) if ns_section else soup.body.append(section))

# 3. voce nel Table of Contents
toc = soup.find('div', id='toc')
if toc:
    first = toc.find('ul', class_='first')
    ns_li = None
    for li in first.find_all('li', recursive=False):
        aa = li.find('a')
        if aa is not None and aa.get('href') == '#namespaces':
            ns_li = li; break
    li = soup.new_tag('li'); li['class'] = 'ga-injected'
    h4 = soup.new_tag('h4'); link = soup.new_tag('a', href='#vocabularies')
    link.string = 'Vocabularies'; h4.append(link); li.append(h4)
    sub = soup.new_tag('ul'); sub['class'] = 'second'
    for cs, (label, f, n) in sorted(schemes.items(), key=lambda x: x[1][0]):
        sli = soup.new_tag('li'); sli['style'] = 'margin-left:10px;'
        sa = soup.new_tag('a', href=f); sa.string = label
        sli.append(sa); sub.append(sli)
    li.append(sub)
    (ns_li.insert_before(li) if ns_li else first.append(li))

doc.write_text(str(soup), encoding='utf-8')
print(f"{doc.name}: sezione Vocabularies + voce TOC + {added} righe 'Vocabulary' nelle proprieta'")

# ---------------------------------------------------------------- vocabolari
for cs, (label, f, n) in schemes.items():
    path = D / f
    s2 = BeautifulSoup(path.read_text(encoding='utf-8'), 'html.parser')
    for old in s2.find_all(class_='ga-injected'):
        old.decompose()
    nav = s2.new_tag('div'); nav['class'] = 'ga-injected'
    nav['style'] = ('margin:0 0 1.5em 0;padding:.6em .9em;border-left:3px solid #666;'
                    'background:#f4f4f4;font-size:.9em;')
    back = s2.new_tag('a', href=a.doc); back.string = 'CHORA Ontology'
    nav.append('↑ '); nav.append(back)
    siblings = [(l2, f2) for c2, (l2, f2, _) in sorted(schemes.items(), key=lambda x: x[1][0]) if c2 != cs]
    if siblings:
        nav.append(s2.new_tag('br'))
        nav.append('Other vocabularies: ')
        for i, (l2, f2) in enumerate(siblings):
            if i: nav.append(' · ')
            sa = s2.new_tag('a', href=f2); sa.string = l2
            nav.append(sa)
    body = s2.find('div', id='content') or s2.body
    body.insert(0, nav)
    path.write_text(str(s2), encoding='utf-8')
    print(f"  {f}: barra di navigazione inserita")
