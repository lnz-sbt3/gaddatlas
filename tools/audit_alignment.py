#!/usr/bin/env python3
"""
audit_alignment.py — verifica che il GeoJSON derivato sia coerente con il TTL
canonico. Da eseguire a ogni build e in CI.

Esce con codice 1 se trova un disallineamento non atteso: e' la rete che
trasforma in errore visibile cio' che oggi, nell'interfaccia, e' uno scarto
silenzioso (`if (i == null) continue;`).

Uso:  python3 tools/audit_alignment.py [--verbose]
"""

from __future__ import annotations

import collections
import csv
import json
import sys
from pathlib import Path

from rdflib import Graph, Namespace, RDF, URIRef

ROOT = Path(__file__).resolve().parents[1]
TTL = ROOT / "data" / "dist" / "gaddatlas-full.ttl"
GEOJSON = ROOT / "data" / "dist" / "gaddatlas.geojson"
PASSAGES = ROOT / "data" / "dist" / "passages" / "index.json"
APP_DATA = ROOT / "app" / "public" / "data"
TABLES = ROOT / "data" / "source" / "tables"

CHORA = Namespace("https://w3id.org/chora#")
# namespace del progetto nella forma da NON trovare (http al posto di https)
PROJECT_NS_HTTP = ("http://w3id.org/chora", "http://w3id.org/gaddatlas")

VERBOSE = "--verbose" in sys.argv


def local(uri) -> str:
    return str(uri).rsplit("/", 1)[-1].rsplit("#", 1)[-1]


class Audit:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.notes: list[str] = []

    def check(self, ok: bool, label: str, detail: str = "") -> None:
        mark = "PASS" if ok else "FAIL"
        print(f"  [{mark}] {label}")
        if detail and (VERBOSE or not ok):
            for line in detail.splitlines():
                print(f"         {line}")
        if not ok:
            self.failures.append(label)

    def note(self, label: str, detail: str = "") -> None:
        print(f"  [ .. ] {label}")
        if detail:
            for line in detail.splitlines():
                print(f"         {line}")
        self.notes.append(label)


def main() -> int:
    for path in (TTL, GEOJSON, PASSAGES):
        if not path.exists():
            print(f"ERRORE: file mancante: {path}", file=sys.stderr)
            return 1

    g = Graph()
    g.parse(TTL, format="turtle")
    gj = json.loads(GEOJSON.read_text(encoding="utf-8"))
    idx = json.loads(PASSAGES.read_text(encoding="utf-8"))

    a = Audit()
    print(f"\nTTL     : {TTL.name}  ({len(g):,} triple)")
    print(f"GeoJSON : {GEOJSON.name}  ({len(gj['features'])} feature, "
          f"{len(gj['relief'])} righe di relief)")
    print(f"Brani   : {idx['totalPassages']} in {len(idx['chapters'])} capitoli\n")

    # ── inventari ────────────────────────────────────────────────────────
    ttl_refs = {local(s) for s in g.subjects(RDF.type, CHORA.PlaceReference)}
    ttl_interp = {local(s) for s in g.subjects(RDF.type, CHORA.SpatialInterpretation)}
    ttl_gaz = {local(s) for s in g.subjects(RDF.type, CHORA.GazetteerEntity)}
    ttl_place = {local(s) for s in g.subjects(RDF.type, CHORA.NarrativePlace)}
    ttl_agents = {local(s) for s in g.subjects(RDF.type, CHORA.FocalizingAgent)}
    ttl_routes = {local(s) for s in g.subjects(RDF.type, CHORA.NarrativeRoute)}
    refs_with_excerpt = {local(s) for s, _, _ in g.triples((None, CHORA.excerpt, None))}
    # occorrenze di testimoni diversi da quello di riferimento (D-053): corpora
    # di confronto, fuori dalle viste e dagli invarianti sugli estratti
    reference_witnesses = set(g.objects(None, CHORA.referenceWitness))
    comparison_refs = {local(s) for s, _, w in g.triples((None, CHORA.appearsInWitness, None))
                       if w not in reference_witnesses}
    ttl_refs -= comparison_refs
    refs_with_excerpt -= comparison_refs

    feats = {f["properties"]["GazetteerEntity_ID"] for f in gj["features"]}
    relief_target = collections.Counter(r["targetId"] for r in gj["relief"])
    relief_ref = {r["referenceId"] for r in gj["relief"]}
    relief_interp = {r["interpretationId"] for r in gj["relief"]}
    gj_agents = {x["id"] for x in gj["paths"]["agents"]}
    gj_routes = {x["id"] for x in gj["paths"]["routes"]}

    # ── invarianti che devono valere sempre ──────────────────────────────
    print("INVARIANTI STRUTTURALI")

    unresolved = {t for t in relief_target if t not in feats}
    lost = sum(relief_target[t] for t in unresolved)
    a.check(
        not unresolved,
        f"ogni relief.targetId risolve a una feature  "
        f"({len(gj['relief']) - lost}/{len(gj['relief'])} righe)",
        "\n".join(f"{t}  ({relief_target[t]} righe perse)" for t in sorted(unresolved)),
    )

    missing_text = relief_ref - refs_with_excerpt
    a.check(
        not missing_text,
        f"ogni relief.referenceId ha un chora:excerpt  "
        f"({len(relief_ref - missing_text)}/{len(relief_ref)})",
        "\n".join(sorted(missing_text)[:20]),
    )

    not_indexed = relief_ref - set(idx["referenceToChapter"])
    a.check(
        not not_indexed,
        f"ogni relief.referenceId e' nell'indice dei brani",
        "\n".join(sorted(not_indexed)[:20]),
    )

    a.check(
        relief_ref <= ttl_refs,
        "ogni relief.referenceId esiste come chora:PlaceReference nel TTL",
        "\n".join(sorted(relief_ref - ttl_refs)[:20]),
    )
    a.check(
        relief_interp <= ttl_interp,
        "ogni relief.interpretationId esiste come chora:SpatialInterpretation",
        "\n".join(sorted(relief_interp - ttl_interp)[:20]),
    )
    a.check(
        feats <= (ttl_gaz | ttl_place),
        "ogni feature esiste nel TTL come GazetteerEntity o NarrativePlace",
        "\n".join(sorted(feats - (ttl_gaz | ttl_place))[:20]),
    )
    a.check(gj_agents == ttl_agents, f"focalizzatori allineati ({len(gj_agents)})")
    a.check(gj_routes == ttl_routes, f"route allineate ({len(gj_routes)})")
    a.check(
        len(refs_with_excerpt) == len(ttl_refs),
        f"ogni PlaceReference del TTL ha un excerpt "
        f"({len(refs_with_excerpt)}/{len(ttl_refs)})",
        "\n".join(sorted(ttl_refs - refs_with_excerpt)[:20]),
    )

    # IRI assoluti e pubblicabili (D-021). Un IRI relativo nel TTL viene
    # risolto al parsing contro il percorso del file e diventa file:///...:
    # e' cosi' che un percorso di desktop era finito nel grafo pubblicato.
    # Tutti gli IRI devono avere schema http(s); quelli dei namespace del
    # progetto devono essere https. I vocabolari W3C (http://www.w3.org/...)
    # restano http per definizione.
    abox = Graph()
    abox.parse(ROOT / "data" / "gaddatlas.ttl", format="turtle")
    bad_iri = set()
    for graph in (g, abox):
        for triple in graph:
            for term in triple:
                if not isinstance(term, URIRef):
                    continue
                iri = str(term)
                if not iri.startswith(("http://", "https://")):
                    bad_iri.add(iri)
                elif any(iri.startswith(ns) for ns in PROJECT_NS_HTTP):
                    bad_iri.add(iri)
    a.check(
        not bad_iri,
        "ogni IRI del grafo e' assoluto (http/https), e https nei namespace del progetto",
        "\n".join(sorted(bad_iri)[:20]),
    )

    # coerenza fra interpretazione e riferimento, sulle sorgenti (T-84).
    # Il controllo non si puo' fare sul grafo: per scelta di modello la
    # PlaceReference non porta il proprio luogo (lo dice solo il foglio
    # References). Le interpretazioni senza luogo (vettori di route) sono escluse.
    def read_tsv(name):
        with open(TABLES / name, encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f, delimiter="\t"))
    ref_place = {r["Reference_ID"]: r["NarrativePlace_ID"]
                 for r in read_tsv("References.tsv")}
    mismatch = [
        f'{s["Interpretation_ID"]}: luogo {s["NarrativePlace_ID"]!r}, '
        f'riferimento {s["Reference_ID"]} -> {ref_place.get(s["Reference_ID"])!r}'
        for s in read_tsv("SpatialInterpretations.tsv")
        if s["NarrativePlace_ID"] and ref_place.get(s["Reference_ID"]) != s["NarrativePlace_ID"]
    ]
    a.check(
        not mismatch,
        "ogni interpretazione ha lo stesso luogo del suo riferimento (sorgenti TSV)",
        "\n".join(mismatch[:20]),
    )

    # occorrenze di altri testimoni (D-054): il luogo dichiarato nel foglio
    # References e' quello della variante che le collega a QP. Nel grafo la
    # PlaceReference non porta il luogo, quindi il controllo sta sulle sorgenti.
    witness_ref = {r["Reference_ID"]: r.get("Witness_ID", "") for r in read_tsv("References.tsv")}
    reference_ids = {w["Witness_ID"] for w in read_tsv("Witnesses.tsv")
                     if w.get("Reference", "").strip().lower() in ("si", "sì")}
    # D-070: soggetto = occorrenza di QP, valore = occorrenza dell'altro testimone
    bad_variant = []
    for row in read_tsv("Assertions.tsv"):
        if row["Assertion_Type"].strip().lower() != "variant":
            continue
        subj = row["Subject"].split("/", 1)[-1]
        place = ref_place.get(subj)
        for v in row["Value"].split("|"):
            rid = v.strip().split("/", 1)[-1]
            if ref_place.get(rid) != place:
                bad_variant.append(f'{row["Assertion_ID"]}: {rid} -> {ref_place.get(rid)!r}, soggetto {subj} -> {place!r}')
    a.check(
        not bad_variant,
        "ogni variante collega due occorrenze dello stesso luogo (sorgenti TSV)",
        "\n".join(bad_variant[:20]),
    )
    stray = sorted(rid for rid, w in witness_ref.items() if w and w not in reference_ids
                   and not any(rid in row["Value"] for row in read_tsv("Assertions.tsv")
                               if row["Assertion_Type"].strip().lower() == "variant"))
    a.check(not stray, "ogni occorrenza di un altro testimone sta in una variante (sorgenti TSV)",
            "\n".join(stray[:20]))

    # copie pubblicate per l'interfaccia (T-83): byte per byte uguali ai
    # derivati, altrimenti l'app mostra dati diversi da quelli del grafo
    published = [GEOJSON, *sorted(PASSAGES.parent.glob("*.json"))]
    stale = []
    for src in published:
        dst = APP_DATA / src.relative_to(ROOT / "data" / "dist")
        if not dst.exists() or dst.read_bytes() != src.read_bytes():
            stale.append(str(dst.relative_to(ROOT)))
    a.check(
        not stale,
        f"app/public/data coincide con data/dist ({len(published) - len(stale)}/"
        f"{len(published)} file; se no: make publish-data)",
        "\n".join(stale),
    )

    # ── esclusioni attese: informative, non errori ───────────────────────
    print("\nESCLUSIONI ATTESE (per costruzione, non errori)")

    route_only = ttl_refs - relief_ref
    a.note(
        f"{len(route_only)} PlaceReference non in relief: riferimenti di sola route "
        f"(targetsRoute, non targetsPlace)"
    )

    a.note(
        f"{len(comparison_refs)} PlaceReference di altri testimoni (corpora di confronto, D-053)",
        ", ".join(sorted(comparison_refs)[:6]),
    )

    gaz_absent = ttl_gaz - feats
    a.note(
        f"{len(gaz_absent)} GazetteerEntity fuori mappa: zero interpretazioni ancorate",
        ", ".join(sorted(gaz_absent)[:6]) + (" …" if len(gaz_absent) > 6 else ""),
    )

    place_absent = ttl_place - feats
    imported = sum(
        1 for p in place_absent
        if local(g.value(
            Namespace("https://w3id.org/gaddatlas/id/narrativeplace/")[p],
            CHORA.hasRealityStatus) or "") == "Imported"
    )
    a.note(
        f"{len(place_absent)} NarrativePlace senza tessera propria "
        f"(di cui {imported} 'Imported': confluiscono nel rilievo dell'ancora)"
    )

    # ── copertura testuale ───────────────────────────────────────────────
    print("\nCOPERTURA TESTUALE")
    cov = len(relief_ref & refs_with_excerpt) / max(1, len(relief_ref)) * 100
    print(f"  {len(relief_ref & refs_with_excerpt)}/{len(relief_ref)} "
          f"riferimenti navigabili hanno un brano  ({cov:.1f}%)")

    # ── esito ────────────────────────────────────────────────────────────
    print()
    if a.failures:
        print(f"ESITO: {len(a.failures)} CONTROLLI FALLITI")
        for f in a.failures:
            print(f"   - {f}")
        return 1
    print("ESITO: tutti i controlli superati. TTL e GeoJSON sono allineati.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
