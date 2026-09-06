#!/usr/bin/env python3
"""
check_reproducible.py — verifica che i derivati versionati coincidano con
quelli che la build produce adesso.

Perche' non basta `git diff`. Confrontare i byte e' troppo severo per due
formati che usiamo:

  * RDF/Turtle — l'ordine con cui rdflib serializza i nodi anonimi non e'
    deterministico. Nel nostro TTL i contributori dell'ontologia e le
    geometrie sono nodi anonimi: due build della stessa sorgente producono
    file diversi che dicono esattamente la stessa cosa. Il confronto corretto
    e' l'isomorfismo del grafo, non l'uguaglianza testuale.

  * JSON — un riordinamento delle chiavi o un cambio di indentazione non
    cambia il contenuto. Il confronto corretto e' sulla struttura decodificata.

Uso:
    python3 tools/check_reproducible.py            # confronta con HEAD
    python3 tools/check_reproducible.py --verbose  # dettaglia le differenze

Esce con 1 se un derivato e' realmente cambiato.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

from rdflib import Graph
from rdflib.compare import isomorphic, to_isomorphic, graph_diff

ROOT = Path(__file__).resolve().parents[1]
VERBOSE = "--verbose" in sys.argv

# I derivati versionati che la build rigenera.
TARGETS = [
    "ontology/chora.ttl",
    "data/gaddatlas.ttl",
    "data/dist/gaddatlas-full.ttl",
    "data/dist/gaddatlas.geojson",
    "data/dist/atlas.slim.json",
    "data/dist/void_seeds.json",
    "data/dist/passages/index.json",
] + [f"data/dist/passages/ch{n:02d}.json" for n in range(1, 11)]


def from_head(path: str) -> bytes | None:
    """Contenuto del file come sta nell'ultimo commit."""
    try:
        return subprocess.run(
            ["git", "show", f"HEAD:{path}"],
            cwd=ROOT, capture_output=True, check=True,
        ).stdout
    except subprocess.CalledProcessError:
        return None


def compare_rdf(old: bytes, new: bytes) -> tuple[bool, str]:
    a, b = Graph(), Graph()
    a.parse(data=old, format="turtle")
    b.parse(data=new, format="turtle")
    if isomorphic(a, b):
        return True, f"{len(b)} triple, grafi isomorfi"
    _, in_old, in_new = graph_diff(to_isomorphic(a), to_isomorphic(b))
    detail = f"{len(in_old)} triple rimosse, {len(in_new)} aggiunte"
    if VERBOSE:
        for t in list(in_old)[:5]:
            detail += f"\n      - {t}"
        for t in list(in_new)[:5]:
            detail += f"\n      + {t}"
    return False, detail


def compare_json(old: bytes, new: bytes) -> tuple[bool, str]:
    a = json.loads(old.decode("utf-8"))
    b = json.loads(new.decode("utf-8"))
    if a == b:
        return True, "contenuto identico"
    if isinstance(a, dict) and isinstance(b, dict):
        changed = sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))
        return False, "chiavi diverse: " + ", ".join(changed)
    return False, "contenuto diverso"


def main() -> int:
    failures, skipped = [], []
    print("Confronto dei derivati versionati con il risultato della build\n")

    for rel in TARGETS:
        path = ROOT / rel
        if not path.exists():
            skipped.append(f"{rel} (assente nel working tree)")
            continue
        old = from_head(rel)
        if old is None:
            skipped.append(f"{rel} (non ancora committato)")
            continue

        new = path.read_bytes()
        if rel.endswith(".ttl"):
            ok, detail = compare_rdf(old, new)
        else:
            ok, detail = compare_json(old, new)

        print(f"  [{'OK  ' if ok else 'DIFF'}] {rel}")
        if not ok or VERBOSE:
            print(f"         {detail}")
        if not ok:
            failures.append(rel)

    if skipped:
        print("\n  non confrontati:")
        for s in skipped:
            print(f"    - {s}")

    print()
    if failures:
        print(f"ESITO: {len(failures)} derivati sono realmente cambiati.")
        print("Rigenera con 'make all' e committa il risultato.")
        return 1
    print("ESITO: tutti i derivati coincidono con la build. Riproducibile.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
