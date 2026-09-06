#!/usr/bin/env python3
"""
migrate_namespace.py — sostituisce il namespace placeholder gaddatlas.org con
URI persistenti su w3id.org, e separa l'identita' dell'ontologia da quella del
dataset.

    ontologia (TBox, riusabile)   https://w3id.org/<ONTO>#
    vocabolari SKOS               https://w3id.org/<ONTO>/vocab/...
    dataset GaddAtlas (ABox)      https://w3id.org/gaddatlas/id/...

Corregge inoltre i 6 owl:sameAs che nel TTL sono serializzati come URI
file:///C:/Users/... (percorso locale Windows finito nell'RDF pubblicato).

Il nome dell'ontologia e' un parametro: cambiarlo e' una riga di comando, non
una migrazione.

    python3 tools/migrate_namespace.py --onto chora
    python3 tools/migrate_namespace.py --onto chora --dry-run
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

OLD_ONTO = "https://gaddatlas.org/ontology"
OLD_VOCAB = "https://gaddatlas.org/vocab"
OLD_ID = "https://gaddatlas.org/id"

# I 6 owl:sameAs rotti: qualunque URI file:// che termini con un id gaz_*
BROKEN_SAMEAS = re.compile(
    r"<file:///[^>]*?/(gaz_[A-Za-z0-9_]+)>"
)

# Estensioni da riscrivere: RDF, configurazioni, query, documentazione generata.
TARGET_SUFFIXES = {".ttl", ".owl", ".rdf", ".jsonld", ".geojson", ".nt", ".rq",
                   ".yaml", ".yml", ".html", ".json", ".py", ".md"}

SKIP_DIRS = {".git", "node_modules", "__pycache__", "_archivio", "dist_backup"}


def build_rules(onto: str) -> list[tuple[str, str]]:
    new_onto = f"https://w3id.org/{onto}"
    new_id = "https://w3id.org/gaddatlas/id"
    # Ordine significativo: le stringhe piu' lunghe per prime, altrimenti
    # una sostituzione parziale corrompe quelle successive.
    return [
        (f"{OLD_ONTO}/", f"{new_onto}/"),   # versionIRI, es. .../ontology/4.1.1
        (f"{OLD_ONTO}#", f"{new_onto}#"),
        (OLD_ONTO, new_onto),
        (OLD_VOCAB, f"{new_onto}/vocab"),
        (OLD_ID, new_id),
    ]


def migrate_text(text: str, rules: list[tuple[str, str]], onto: str) -> tuple[str, int]:
    n = 0
    for old, new in rules:
        cnt = text.count(old)
        if cnt:
            text = text.replace(old, new)
            n += cnt
    # sameAs rotti -> URI corretti nel namespace del dataset
    text, k = BROKEN_SAMEAS.subn(
        r"<https://w3id.org/gaddatlas/id/gazetteer/\1>", text
    )
    n += k
    return text, n


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--onto", required=True,
                    help="nome breve dell'ontologia, minuscolo (es. chora)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--root", default=str(ROOT))
    args = ap.parse_args()

    onto = args.onto.strip().lower()
    if not re.fullmatch(r"[a-z][a-z0-9-]{1,30}", onto):
        print("ERRORE: il nome deve essere minuscolo, alfanumerico, "
              "eventualmente con trattini.", file=sys.stderr)
        return 1

    root = Path(args.root)
    rules = build_rules(onto)

    print(f"Namespace di destinazione")
    print(f"  ontologia : https://w3id.org/{onto}#")
    print(f"  vocabolari: https://w3id.org/{onto}/vocab/...")
    print(f"  dataset   : https://w3id.org/gaddatlas/id/...")
    print(f"{'[DRY RUN] ' if args.dry_run else ''}Radice: {root}\n")

    total_files = total_subs = 0
    sameas_fixed = 0

    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in TARGET_SUFFIXES:
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.name == Path(__file__).name:
            continue

        try:
            original = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue

        before_sameas = len(BROKEN_SAMEAS.findall(original))
        updated, n = migrate_text(original, rules, onto)
        if n == 0:
            continue

        rel = path.relative_to(root)
        note = f"  (+{before_sameas} sameAs)" if before_sameas else ""
        print(f"  {n:6,} sostituzioni  {rel}{note}")
        total_files += 1
        total_subs += n
        sameas_fixed += before_sameas

        if not args.dry_run:
            path.write_text(updated, encoding="utf-8")

    print(f"\n  {total_subs:,} sostituzioni in {total_files} file")
    print(f"  {sameas_fixed} owl:sameAs corretti")
    if args.dry_run:
        print("\n  Nessun file scritto (--dry-run).")
    else:
        print("\n  Prossimi passi:")
        print("    make data && make audit")
        print("    python3 tools/validate_shacl.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
