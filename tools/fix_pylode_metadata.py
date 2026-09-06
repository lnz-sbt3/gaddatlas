#!/usr/bin/env python
"""
Post-processing per l'HTML generato da pyLODE (profilo ontpub).

pyLODE (pylode/profiles/ontpub.py, funzione _make_metadata) costruisce il
blocco <title>/<h1>/Metadata dell'ontologia raccogliendo dcterms:title,
dcterms:description (e altre ONT_PROPS) da OGNI soggetto tipizzato
owl:Ontology OPPURE skos:ConceptScheme OPPURE prof:Profile nel documento,
fondendoli in un'unica lista condivisa. Se l'ontologia incorpora dei
skos:ConceptScheme con proprie rdfs:label/skos:prefLabel/dcterms:description
(come i vocabolari controllati di CHORA), quei valori finiscono nel
Title/Description dell'ontologia stessa, e l'IRI mostrato diventa quello
dell'ultimo ConceptScheme elaborato invece di quello dell'ontologia.

Questo script rilegge l'OWL originale, ricalcola title/description/IRI
corretti (solo quelli asserted direttamente sul soggetto owl:Ontology) e
corregge SOLO il blocco <div id="metadata"> dell'HTML generato: <title>,
<h1>, IRI, liste Title/Description, e rimuove la riga "Has Top Concept"
(proprietà SKOS che non appartiene mai ai metadati di un'ontologia). Il
resto del file HTML resta invariato byte per byte.

Uso:
    python tools/fix_pylode_metadata.py ontology/chora.ttl ontology/docs/index.html
"""

import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup
from rdflib import Graph, RDF, OWL, DC, DCTERMS, RDFS, URIRef
from rdflib.namespace import Namespace

SDO = Namespace("https://schema.org/")

TITLE_PREDICATES = [DCTERMS.title, DC.title, RDFS.label, SDO.name]
DESCRIPTION_PREDICATES = [DCTERMS.description, DC.description, RDFS.comment, SDO.description]

METADATA_START = '<div class="section" id="metadata">'
NEXT_SECTION_MARKER = 'id="classes">'


def get_ontology_iri(g: Graph) -> URIRef:
    onts = list(g.subjects(RDF.type, OWL.Ontology))
    if not onts:
        raise SystemExit("Nessun owl:Ontology trovato nel file OWL.")
    if len(onts) > 1:
        raise SystemExit(f"Trovate più owl:Ontology: {onts}. Specifica quale usare.")
    return onts[0]


def get_literals(g: Graph, subject: URIRef, predicates) -> list[str]:
    values = []
    for pred in predicates:
        for obj in g.objects(subject, pred):
            v = str(obj)
            if v not in values:
                values.append(v)
    return values


def fix_metadata_fragment(fragment: str, ont_iri: URIRef, titles: list[str], descriptions: list[str]) -> str:
    soup = BeautifulSoup(fragment, "html.parser")

    metadata = soup.find("div", id="metadata")
    if metadata is None:
        raise SystemExit('Sezione <div id="metadata"> non trovata nel frammento.')

    h1 = metadata.find("h1")
    if h1:
        h1.string = titles[0]

    dl = metadata.find("dl")

    def find_row(prop_href: str):
        for row in dl.find_all("div", recursive=False):
            dt = row.find("dt")
            if dt is None:
                continue
            a = dt.find("a")
            if a is not None and a.get("href") == prop_href:
                return row
            if a is None and dt.get_text(strip=True) == "IRI":
                if prop_href == "IRI":
                    return row
        return None

    iri_row = find_row("IRI")
    if iri_row:
        code = iri_row.find("code")
        if code:
            code.string = str(ont_iri)

    def replace_litlist(prop_href: str, values: list[str]) -> None:
        row = find_row(prop_href)
        if row is None:
            return
        ul = row.find("ul", class_="pylodelitlist")
        if ul is None:
            return
        ul.clear()
        for v in values:
            li = soup.new_tag("li")
            p = soup.new_tag("p")
            p.string = v
            li.append(p)
            ul.append(li)

    replace_litlist("http://purl.org/dc/terms/title", titles)
    if descriptions:
        replace_litlist("http://purl.org/dc/terms/description", descriptions)

    has_top_concept_row = find_row("http://www.w3.org/2004/02/skos/core#hasTopConcept")
    if has_top_concept_row is not None:
        has_top_concept_row.decompose()

    return str(soup)


def fix_html(owl_path: Path, html_path: Path, output_path: Path) -> None:
    g = Graph()
    g.parse(owl_path)

    ont_iri = get_ontology_iri(g)
    titles = get_literals(g, ont_iri, TITLE_PREDICATES)
    descriptions = get_literals(g, ont_iri, DESCRIPTION_PREDICATES)

    if not titles:
        raise SystemExit(f"Nessun titolo (dc:title/rdfs:label/...) trovato su {ont_iri}.")

    text = html_path.read_text(encoding="utf-8")

    # Correggi <title> nel <head> (occorrenza unica, primo tag del documento).
    text, n = re.subn(
        r"<title>.*?</title>",
        lambda _m: f"<title>{titles[0]}</title>",
        text,
        count=1,
        flags=re.DOTALL,
    )
    if n == 0:
        raise SystemExit("Tag <title> non trovato nell'HTML.")

    start = text.find(METADATA_START)
    if start == -1:
        raise SystemExit('Blocco <div id="metadata"> non trovato nell\'HTML.')
    next_section_pos = text.find(NEXT_SECTION_MARKER, start)
    if next_section_pos == -1:
        raise SystemExit("Impossibile individuare la fine del blocco metadata.")
    # Retrocedi fino all'apertura del <div> della sezione successiva.
    end = text.rfind("<div", start, next_section_pos)

    fragment = text[start:end]
    fixed_fragment = fix_metadata_fragment(fragment, ont_iri, titles, descriptions)

    new_text = text[:start] + fixed_fragment + text[end:]
    output_path.write_text(new_text, encoding="utf-8")
    print(f"OK: {output_path} scritto. Titolo ontologia: {titles[0]!r}, IRI: {str(ont_iri)!r}")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        print(__doc__)
        sys.exit(1)

    owl_arg = Path(sys.argv[1])
    html_arg = Path(sys.argv[2])
    out_arg = Path(sys.argv[3]) if len(sys.argv) == 4 else html_arg

    fix_html(owl_arg, html_arg, out_arg)
