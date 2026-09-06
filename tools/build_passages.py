#!/usr/bin/env python3
"""
build_passages.py — estrae gli estratti testuali dal TTL canonico e li scrive
come JSON per capitolo, pronti per il pannello testuale dell'interfaccia.

Sorgente: data/dist/gaddatlas-full.ttl (prodotto da tools/etl.py)
Output derivato:          data/dist/passages/ch01.json ... ch10.json + index.json

Perche' per capitolo e non un file unico:
  1) l'app carica solo il capitolo in vista (~20 KB invece di ~200 KB);
  2) nessun singolo file contiene l'intero corpus di brani gaddiani, il che
     mantiene la pubblicazione nel perimetro della citazione ex art. 70
     L. 633/1941 anziche' della riproduzione.

Uso:  python3 tools/build_passages.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from rdflib import Graph, Namespace, RDF

ROOT = Path(__file__).resolve().parents[1]
TTL = ROOT / "data" / "dist" / "gaddatlas-full.ttl"
OUT = ROOT / "data" / "dist" / "passages"

CHORA = Namespace("https://w3id.org/chora#")

# Tetto di sicurezza sulla lunghezza del singolo brano. Nel dato attuale il
# massimo e' 573 caratteri, quindi non taglia nulla: e' una guardia contro
# regressioni future, non una trasformazione del dato.
MAX_CHARS = 700

ROMAN = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5,
    "VI": 6, "VII": 7, "VIII": 8, "IX": 9, "X": 10,
}


def local(uri) -> str:
    return str(uri).rsplit("/", 1)[-1].rsplit("#", 1)[-1]


def chapter_number(uri) -> int | None:
    """capitolo_I -> 1. Ritorna None se il capitolo non e' riconoscibile."""
    tail = local(uri).replace("capitolo_", "").strip()
    if tail in ROMAN:
        return ROMAN[tail]
    m = re.fullmatch(r"\d+", tail)
    return int(m.group()) if m else None


def page_number(source_reference: str) -> int | None:
    """'A 11' -> 11. La sigla di edizione resta nel campo sourceReference."""
    m = re.search(r"(\d+)", source_reference or "")
    return int(m.group(1)) if m else None


def main() -> int:
    if not TTL.exists():
        print(f"ERRORE: sorgente non trovata: {TTL}", file=sys.stderr)
        return 1

    print(f"Lettura di {TTL.relative_to(ROOT)} ...")
    g = Graph()
    g.parse(TTL, format="turtle")
    print(f"  {len(g):,} triple")

    by_chapter: dict[int, dict] = defaultdict(dict)
    orphans: list[str] = []
    truncated: list[str] = []

    refs = list(g.subjects(RDF.type, CHORA.PlaceReference))
    for ref in refs:
        rid = local(ref)
        excerpt = g.value(ref, CHORA.excerpt)
        if excerpt is None:
            orphans.append(rid)
            continue

        text = str(excerpt).strip()
        if len(text) > MAX_CHARS:
            text = text[:MAX_CHARS].rstrip() + "…"
            truncated.append(rid)

        ch_uri = g.value(ref, CHORA.mentionedInChapter)
        ch = chapter_number(ch_uri) if ch_uri else None
        if ch is None:
            orphans.append(rid)
            continue

        src = str(g.value(ref, CHORA.sourceReference) or "")
        work = g.value(ref, CHORA.appearsInWork)

        by_chapter[ch][rid] = {
            "id": rid,
            "chapter": ch,
            "page": page_number(src),
            "sourceReference": src,
            "work": local(work) if work else None,
            "excerpt": text,
            "iri": str(ref),
        }

    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()

    index = {}
    total = 0
    for ch in sorted(by_chapter):
        entries = by_chapter[ch]
        fname = f"ch{ch:02d}.json"
        payload = {
            "chapter": ch,
            "count": len(entries),
            "passages": entries,
        }
        (OUT / fname).write_text(
            json.dumps(payload, ensure_ascii=False, indent=1),
            encoding="utf-8",
        )
        size_kb = (OUT / fname).stat().st_size / 1024
        index[str(ch)] = {"file": fname, "count": len(entries)}
        total += len(entries)
        print(f"  cap. {ch:2d}  {len(entries):4d} brani  {size_kb:6.1f} KB  -> {fname}")

    # L'indice mappa referenceId -> capitolo, cosi' il pannello sa quale file
    # caricare partendo dal solo referenceId che arriva dal click sul tassello.
    ref_to_chapter = {
        rid: ch for ch, entries in by_chapter.items() for rid in entries
    }
    (OUT / "index.json").write_text(
        json.dumps(
            {
                "generatedFrom": TTL.name,
                "totalPassages": total,
                "chapters": index,
                "referenceToChapter": ref_to_chapter,
            },
            ensure_ascii=False,
            indent=1,
        ),
        encoding="utf-8",
    )

    print(f"\n  totale: {total:,} brani in {len(index)} capitoli")
    print(f"  indice: index.json ({len(ref_to_chapter):,} voci)")

    if truncated:
        print(f"\n  ATTENZIONE: {len(truncated)} brani troncati a {MAX_CHARS} caratteri")
    if orphans:
        print(f"\n  ATTENZIONE: {len(orphans)} PlaceReference senza excerpt o senza capitolo:")
        for rid in orphans[:10]:
            print(f"     - {rid}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
