#!/usr/bin/env python3
"""
build_atlas.py - GaddAtlas: compilazione della materialized view RDF -> JSON

Il knowledge graph resta la sorgente autoritativa. Questo script esegue un set
di competency query SPARQL e serializza una proiezione denormalizzata destinata
al rendering (Observable / D3 / Canvas).

Ogni nodo del payload conserva il proprio IRI: il JSON e' una vista derivata,
non un sostituto del grafo.

--------------------------------------------------------------------------
REVISIONE 4.2 - COSA CAMBIA RISPETTO ALLA VERSIONE PRECEDENTE
--------------------------------------------------------------------------

(1) UNITA' DI CONTEGGIO. Il conteggio non e' piu' aggregato sul GazetteerEntity.
    L'unita' e' il NarrativePlace: un NP con tessera propria conta le proprie
    interpretazioni e basta. Palazzo 219 non entra piu' nel rilievo di via
    Merulana. Il GazetteerEntity resta l'ancora geografica e mantiene un
    conteggio proprio (`refCountAnchored`) a fini di query, ma NON e' piu'
    quello che alimenta il rendering.

(2) DUE MISURE DISTINTE, non una.
      planeCount  = riferimenti DISTINTI  -> stato 1 e 2 (isoipse)
      reliefRows  = una riga per interpretazione, con focalizzatore e pagina
                    -> stato 3 (assonometria per personaggio)
    Uno stesso PlaceReference letto da cinque focalizzatori vale 1 sul piano
    e 5 in assonometria, spacchettato nelle cinque viste per personaggio.

(3) ROUTE. Nessuna deduplicazione distruttiva. La versione precedente
    collassava i nodi su (order, gazetteerId) perdendo i focalizzatori: 126
    interpretazioni-nodo diventavano 73. Qui i nodi restano tutti, e sono
    raggruppati per `order` in `steps`, perche' `order` NON e' univoco: la
    NarrativeRoute e' un ordine parziale, non una sequenza.
    Il colore della route viene dai `carriers` (ga:targetsRoute), che sono gli
    unici a portare NarrativeRole = Route; i nodi hanno ruolo nullo per
    costruzione.

(4) DUE ARTEFATTI, UN SOLO COMPILATORE. Lo script scrive sia `atlas.json` sia
    il payload di rendering GeoJSON, che prima usciva da uno script separato e
    non versionato. `voidSeed` viene letto da un file di semi congelati
    (--seeds) per non alterare azimut e silhouette dei fittizi gia' calibrati;
    in assenza del file usa un hash deterministico dell'id.

(5) INDICE DI RILIEVO. Nuovo blocco `relief` nel GeoJSON: una riga per
    interpretazione visibile, con targetId, pagina, capitolo, focalizzatore,
    ruolo e determinazione. E' la primitiva da cui il modulo 4 ricava tutto -
    conteggi per personaggio, stratigrafia per pagina, composizione dei ruoli -
    senza dover precalcolare aggregati che poi divergono.

Uso:  python build_atlas.py <input.ttl> <output_dir> [--seeds void_seeds.json]
"""
import sys, json, math, re, hashlib, argparse
from collections import defaultdict, Counter
from rdflib import Graph, Namespace, RDF, RDFS

GA   = Namespace("https://w3id.org/chora#")
GEO  = Namespace("http://www.w3.org/2003/01/geo/wgs84_pos#")

# ---------------------------------------------------------------------------
# PARAMETRI CURATORIALI  (decisioni interpretative: versionate, non nascoste)
# ---------------------------------------------------------------------------

# Classi di densita', ritarate sul conteggio del piano (max 27, non piu' 58).
# Distribuzione risultante: 170 hapax, 72 raro, 21 ricorrente, 9 frequente,
# 5 nodale, 8 hub. La vecchia partizione (soglia hub a 32) lasciava vuota
# l'ultima classe.
DENSITY_BANDS = [
    (1,  1,   "hapax"),
    (2,  3,   "raro"),
    (4,  5,   "ricorrente"),
    (6,  8,   "frequente"),
    (9,  13,  "nodale"),
    (14, 10**9, "hub"),
]

# Soglie assolute delle isoipse / terrazze. Base ricalibrata come nel notebook:
# con massimo 27 sul piano, 1.47 e 9 bande danno soglie 1-2-3-4-5-7-11-15-22,
# identita' 1:1 nella fascia bassa e compressione dolce sopra.
# Il notebook deve leggere questi valori da meta.reliefBands, non ridichiararli.
BANDS_LOG_BASE = 1.47
BANDS_MAX = 9

# Bande di scala: il dataset copre 84 gradi di longitudine (Roma -> Brahmaputra).
# Una singola tassellazione su questa estensione collassa Roma in un pixel.
SCALE_BANDS = [
    ("urbano",     12.4964, 41.9028, 0.060),   # Roma intra-muros
    ("periurbano", 12.5000, 41.9000, 0.400),   # Castelli / agro romano
    ("nazionale",   None,   None,    None),    # resto d'Italia
    ("extra",       None,   None,    None),    # fuori Italia
]

PROJ_CENTER = (12.4964, 41.9028)   # Roma, centro di proiezione
PROJ_SCALE  = 100000.0             # unita' arbitrarie per grado

ROME_CENTER   = (12.4964, 41.9028)
GEO_RADIUS_KM = 100.0              # raggio della tassellazione congelata

INCLUDE_EXCERPTS = True            # cfr. nota copyright nel report
MIN_SEQUENCE_LEN = 2               # sequenze derivate: sotto 2 tappe non c'e' percorso

# Fusione di varianti toponomastiche che nel grafo sono GazetteerEntity distinte
# ma designano lo stesso referente. Formato: { "gaz_variante": "gaz_canonico" }
#
# DECISIONE APERTA (vedi docs/DECISIONS.md § D-011). Oggi esistono TRE fonti che
# si contraddicono, e questa mappa vuota e' la terza:
#
#   nel GRAFO (owl:sameAs, 3 coppie)
#     gaz_castel_gandolfo   <-> gaz_castello
#     gaz_collegio_romano   <-> gaz_santo_stefano_del_cacco_celio_santo_stefano
#     gaz_lungara           <-> gaz_regina_coeli
#
#   nel NOTEBOOK (s4Config.ALIAS_GROUPS, 5 gruppi)
#     gaz_collegio_romano   <-> gaz_santo_stefano_del_cacco_celio_santo_stefano
#     gaz_pantheon          <-> gaz_tempio_di_agrippa
#     gaz_santa_margherita_in_abitacolo <-> gaz_santa_rita_invitacolo
#     gaz_via_de_merli      <-> gaz_via_merulana
#     gaz_viale_della_regina <-> gaz_viale_regina_margherita
#
#   qui: vuota.
#
# Una sola coppia su sette e' condivisa. Finche' la decisione non e' presa la
# mappa resta vuota, perche' e' cio' che riproduce esattamente il GeoJSON su cui
# il notebook e' stato calibrato. Una volta decisa, la fonte deve diventare UNA:
# gli owl:sameAs del grafo, da cui questa mappa si deriva e da cui il notebook
# ricava ALIAS_GROUPS, invece di mantenere due liste parallele.
MERGE_MAP = {}


def sid(uri):
    return str(uri).rsplit("/", 1)[-1] if uri else None


def local(uri):
    return str(uri).split("#")[-1] if uri else None


def density_class(n):
    for lo, hi, name in DENSITY_BANDS:
        if lo <= n <= hi:
            return name
    return None


def density_level(n):
    for i, (lo, hi, name) in enumerate(DENSITY_BANDS):
        if lo <= n <= hi:
            return i
    return 0


def scale_band(lon, lat):
    if abs(lon - 12.4964) < 0.060 and abs(lat - 41.9028) < 0.060:
        return "urbano"
    if abs(lon - 12.5) < 0.400 and abs(lat - 41.9) < 0.400:
        return "periurbano"
    if 6 < lon < 19 and 36 < lat < 47:
        return "nazionale"
    return "extra"


def project(lon, lat):
    """Proiezione equirettangolare centrata su Roma, calcolata a build time.
    Serializzata nel payload perche' la tassellazione e' congelata: deve essere
    riproducibile bit-per-bit indipendentemente dalla versione di D3."""
    lon0, lat0 = PROJ_CENTER
    x = (lon - lon0) * math.cos(math.radians(lat0)) * PROJ_SCALE
    y = -(lat - lat0) * PROJ_SCALE
    return round(x, 3), round(y, 3)


def haversine_km(a, b):
    R, t = 6371.0, math.pi / 180
    dphi = (b[1] - a[1]) * t
    dlmb = (b[0] - a[0]) * t
    h = (math.sin(dphi / 2) ** 2
         + math.cos(a[1] * t) * math.cos(b[1] * t) * math.sin(dlmb / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(h))


def fallback_seed(entity_id):
    """Sostituto deterministico di voidSeed quando manca il file dei semi.
    ATTENZIONE: cambia azimut e silhouette dei fittizi rispetto alla figura
    gia' calibrata. Usare --seeds per congelare."""
    h = hashlib.sha1(entity_id.encode("utf-8")).hexdigest()[:8]
    return round(int(h, 16) / 0xFFFFFFFF, 6)


# NOTA SULL'ORDINAMENTO. Ogni sorted() porta l'id come chiave secondaria.
# Senza, a parita' del criterio primario l'ordine dipende dall'iterazione di
# dict e set costruiti da risultati SPARQL, che varia a ogni processo per la
# randomizzazione degli hash: due build della stessa sorgente producevano file
# diversi, e il confronto in CI falliva sempre. L'artefatto deve essere
# deterministico perche' e' quello che l'interfaccia carica e che viene citato.

# ---------------------------------------------------------------------------
# COMPETENCY QUERIES
# ---------------------------------------------------------------------------

Q_GAZETTEER = """
PREFIX ga: <https://w3id.org/chora#>
PREFIX geo1: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?g ?label ?lon ?lat ?present ?historical WHERE {
  ?g a ga:GazetteerEntity ; rdfs:label ?label ;
     geo1:long ?lon ; geo1:lat ?lat .
  OPTIONAL { ?g ga:presentLocation ?present }
  OPTIONAL { ?g ga:historicalLocation ?historical }
}
"""

Q_NARRATIVE_PLACES = """
PREFIX ga: <https://w3id.org/chora#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?np ?label ?status ?cat ?desc ?fuzz ?partOf WHERE {
  ?np a ga:NarrativePlace ; rdfs:label ?label ; ga:hasRealityStatus ?status .
  OPTIONAL { ?np ga:hasPlaceCategory ?cat }
  OPTIONAL { ?np <http://purl.org/dc/terms/description> ?desc }
  OPTIONAL { ?np ga:hasFuzzinessLevel ?fuzz }
  OPTIONAL { ?np ga:isPartOf ?partOf }
}
"""

Q_INTERPRETATIONS = """
PREFIX ga: <https://w3id.org/chora#>
PREFIX prov: <http://www.w3.org/ns/prov#>
SELECT ?si ?ref ?place ?route ?gaz ?role ?det ?rel ?foc ?conf ?nodeOf ?order ?note WHERE {
  ?si a ga:SpatialInterpretation ; ga:interpretsReference ?ref ; ga:hasFocalizer ?foc .
  OPTIONAL { ?si ga:targetsPlace ?place }
  OPTIONAL { ?si ga:targetsRoute ?route }
  OPTIONAL { ?si ga:anchorsToEntity ?gaz }
  OPTIONAL { ?si ga:assignsNarrativeRole ?role }
  OPTIONAL { ?si ga:assignsSpatialDetermination ?det }
  OPTIONAL { ?si ga:assignsSpatialRelationType ?rel }
  OPTIONAL { ?si ga:confidence ?conf }
  OPTIONAL { ?si ga:isNodeOfRoute ?nodeOf }
  OPTIONAL { ?si ga:routeOrder ?order }
  OPTIONAL { ?si ga:criticalNote ?note }
}
"""

Q_REFERENCES = """
PREFIX ga: <https://w3id.org/chora#>
SELECT ?r ?src ?chapter ?work ?excerpt WHERE {
  ?r a ga:PlaceReference ; ga:sourceReference ?src ;
     ga:mentionedInChapter ?chapter ; ga:appearsInWork ?work .
  OPTIONAL { ?r ga:excerpt ?excerpt }
}
"""

Q_CHAPTERS = """
PREFIX ga: <https://w3id.org/chora#>
SELECT ?c ?title ?num ?range WHERE {
  ?c a ga:Chapter ; ga:chapterNumber ?num .
  OPTIONAL { ?c <http://purl.org/dc/terms/title> ?title }
  OPTIONAL { ?c ga:pageRange ?range }
}
"""

Q_AGENTS = """
PREFIX ga: <https://w3id.org/chora#>
SELECT ?a ?name ?gender ?desc WHERE {
  ?a a ga:FocalizingAgent .
  OPTIONAL { ?a ga:characterName ?name }
  OPTIONAL { ?a ga:hasGender ?gender }
  OPTIONAL { ?a <http://purl.org/dc/terms/description> ?desc }
}
"""


# ---------------------------------------------------------------------------
def main(ttl_path, out_dir, seeds_path=None):
    g = Graph()
    g.parse(ttl_path, format="turtle")
    print(f"[build] grafo caricato: {len(g)} triple")

    frozen_seeds = {}
    if seeds_path:
        with open(seeds_path, encoding="utf-8") as f:
            frozen_seeds = json.load(f)
        print(f"[build] semi congelati caricati: {len(frozen_seeds)}")

    # ---------------- gazetteer -------------------------------------------
    gaz = {}
    for row in g.query(Q_GAZETTEER):
        lon, lat = float(row.lon), float(row.lat)
        x, y = project(lon, lat)
        gaz[str(row.g)] = {
            "id": sid(row.g), "iri": str(row.g), "label": str(row.label),
            "lon": lon, "lat": lat, "x": x, "y": y,
            "scaleBand": scale_band(lon, lat),
            "presentLocation": str(row.present) if row.present else None,
            "historicalLocation": str(row.historical) if row.historical else None,
            "distanceFromRomeKm": round(haversine_km(ROME_CENTER, (lon, lat)), 1),
            # refCountAnchored: TUTTE le interpretazioni ancorate qui, comprese
            # quelle dei NarrativePlace fittizi ospitati. Serve alle query
            # geografiche, NON al rendering: sul rilievo produrrebbe il doppio
            # conteggio host/satellite.
            "refCountAnchored": 0,
            # planeCount / interpCount: solo i NarrativePlace che questa entita'
            # rappresenta direttamente (gli Imported riassorbiti), cioe' cio'
            # che la tessera referenziale ha diritto di mostrare.
            "planeCount": 0, "interpCount": 0,
            "narrativePlaceCount": 0,
        }

    # ---------------- narrative places -------------------------------------
    nps = {}
    for row in g.query(Q_NARRATIVE_PLACES):
        k = str(row.np)
        if k not in nps:
            nps[k] = {
                "id": sid(row.np), "iri": k, "label": str(row.label),
                "realityStatus": local(row.status),
                "placeCategory": local(row.cat),
                "description": str(row.desc) if row.desc else None,
                "fuzziness": float(row.fuzz) if row.fuzz else None,
                "partOf": sid(row.partOf) if row.partOf else None,
                "interpCount": 0, "planeCount": 0,
                "targets": [], "roles": [], "determinations": [],
            }

    # ---------------- interpretations --------------------------------------
    sis = []
    tgt_acc = defaultdict(lambda: defaultdict(float))   # np -> gaz -> conf
    role_acc = defaultdict(Counter)
    det_acc = defaultdict(Counter)
    np_refs = defaultdict(set)      # np -> {referenceId}  (misura del piano)
    for row in g.query(Q_INTERPRETATIONS):
        gaz_iri = str(row.gaz) if row.gaz else None
        if gaz_iri:
            canon = MERGE_MAP.get(sid(row.gaz))
            if canon:
                for gk, gv in gaz.items():
                    if gv["id"] == canon:
                        gaz_iri = gk
                        break
        rec = {
            "id": sid(row.si), "iri": str(row.si),
            "referenceId": sid(row.ref),
            "narrativePlaceId": sid(row.place) if row.place else None,
            "routeId": sid(row.route) if row.route else None,
            "gazetteerId": sid(gaz_iri) if gaz_iri else None,
            "narrativeRole": local(row.role),
            "spatialDetermination": local(row.det),
            "spatialRelation": local(row.rel),
            "focalizerId": sid(row.foc),
            "confidence": float(row.conf) if row.conf else 1.0,
            "isNodeOfRoute": sid(row.nodeOf) if row.nodeOf else None,
            "routeOrder": int(row.order) if row.order is not None else None,
            "criticalNote": str(row.note) if row.note else None,
        }
        sis.append(rec)
        if row.place:
            p = str(row.place)
            if p in nps:
                nps[p]["interpCount"] += 1
                np_refs[p].add(rec["referenceId"])
                if row.role: role_acc[p][local(row.role)] += 1
                if row.det:  det_acc[p][local(row.det)] += 1
            if gaz_iri:
                tgt_acc[p][gaz_iri] += float(row.conf) if row.conf else 1.0
                gaz[gaz_iri]["refCountAnchored"] += 1

    for p, refset in np_refs.items():
        nps[p]["planeCount"] = len(refset)

    # risoluzione ancoraggio ereditato per i sub-places (isPartOf transitivo)
    np_by_id = {v["id"]: k for k, v in nps.items()}

    def inherited_anchor(np_iri, seen=None):
        seen = seen or set()
        if np_iri in seen:
            return {}
        seen.add(np_iri)
        if tgt_acc.get(np_iri):
            return tgt_acc[np_iri]
        parent = nps.get(np_iri, {}).get("partOf")
        if not parent:
            return {}
        cand_iri = np_by_id.get(parent)
        return inherited_anchor(cand_iri, seen) if cand_iri else {}

    for k, v in nps.items():
        acc = tgt_acc.get(k) or {}
        inherited = False
        if not acc:
            acc = inherited_anchor(k)
            inherited = bool(acc)
        tot = sum(acc.values()) or 1.0
        v["targets"] = sorted(
            [{"gazetteerId": sid(gk), "weight": round(w / tot, 4)} for gk, w in acc.items()],
            key=lambda d: -d["weight"])
        v["anchorInherited"] = inherited
        v["multiTarget"] = len(v["targets"]) > 1
        v["roles"] = [{"role": r, "n": n} for r, n in role_acc[k].most_common()]
        v["determinations"] = [{"determination": d, "n": n} for d, n in det_acc[k].most_common()]
        for t in v["targets"]:
            for gk, gv in gaz.items():
                if gv["id"] == t["gazetteerId"]:
                    gv["narrativePlaceCount"] += 1

    # ------------------------------------------------------------------
    # RISOLUZIONE DELLA TESSERA (visual target)
    # ------------------------------------------------------------------
    # Un NarrativePlace non-Imported e con almeno un'occorrenza ha tessera
    # propria: e' un'entita' narratologica a se'. Un NarrativePlace Imported
    # coincide col proprio referente geografico e viene riassorbito nella
    # tessera del GazetteerEntity.
    own_tile = {k for k, v in nps.items()
                if v["realityStatus"] != "Imported" and v["interpCount"] > 0}

    def visual_target(si):
        """id della tessera su cui questa interpretazione deposita rilievo.
        None per i carrier di route (nessun luogo) e per i NarrativePlace mai
        ancorati che non hanno tessera propria."""
        if not si["narrativePlaceId"]:
            return None
        np_iri = np_by_id.get(si["narrativePlaceId"])
        if np_iri in own_tile:
            return si["narrativePlaceId"]
        return si["gazetteerId"]

    # conteggi propri del GazetteerEntity: solo i NP riassorbiti
    gaz_refs = defaultdict(set)
    gaz_by_id = {v["id"]: k for k, v in gaz.items()}
    own_tile_ids = {nps[k]["id"] for k in own_tile}
    for si in sis:
        t = visual_target(si)
        if t is None or t in own_tile_ids:
            continue
        gk = gaz_by_id.get(t)
        if gk:
            gaz[gk]["interpCount"] += 1
            gaz_refs[gk].add(si["referenceId"])
    for gk, refset in gaz_refs.items():
        gaz[gk]["planeCount"] = len(refset)

    # classi di densita' -- calcolate sulla misura del PIANO
    for v in gaz.values():
        v["densityClass"] = density_class(v["planeCount"]) if v["planeCount"] else None
        v["densityLevel"] = density_level(v["planeCount"]) if v["planeCount"] else -1
    for v in nps.values():
        v["densityClass"] = density_class(v["planeCount"]) if v["planeCount"] else None

    # ---------------- references -------------------------------------------
    refs = {}
    for row in g.query(Q_REFERENCES):
        src = str(row.src)
        m = re.match(r"^([A-Za-z]+)\s*(\d+)", src)
        refs[str(row.r)] = {
            "id": sid(row.r), "iri": str(row.r),
            "edition": m.group(1) if m else None,
            "page": int(m.group(2)) if m else None,
            "sourceReference": src,
            "chapterId": sid(row.chapter),
            "workId": sid(row.work),
            "excerpt": str(row.excerpt) if (row.excerpt and INCLUDE_EXCERPTS) else None,
        }
    ref_by_id = {v["id"]: v for v in refs.values()}

    # ---------------- chapters / agents -------------------------------------
    chapters = {}
    for row in g.query(Q_CHAPTERS):
        chapters[str(row.c)] = {
            "id": sid(row.c), "iri": str(row.c),
            "number": int(row.num), "title": str(row.title) if row.title else None,
            "pageRange": str(row.range) if row.range else None,
        }
    chapter_number = {v["id"]: v["number"] for v in chapters.values()}
    n_chapters = max(chapter_number.values()) if chapter_number else 0

    agents = {}
    for row in g.query(Q_AGENTS):
        agents[str(row.a)] = {
            "id": sid(row.a), "iri": str(row.a),
            "name": str(row.name) if row.name else sid(row.a),
            "gender": local(row.gender) if row.gender else None,
            "description": str(row.desc) if row.desc else None,
            "refCount": 0,
        }
    agent_name = {v["id"]: v["name"] for v in agents.values()}
    agent_by_id = {v["id"]: k for k, v in agents.items()}
    for si in sis:
        k = agent_by_id.get(si["focalizerId"])
        if k:
            agents[k]["refCount"] += 1

    # ---------------- routes ------------------------------------------------
    # Nessuna deduplicazione: `order` non e' univoco (ordine parziale) e i nodi
    # con lo stesso order/gazetteer differiscono per focalizzatore.
    routes = {}
    for r in g.subjects(RDF.type, GA.NarrativeRoute):
        rid = sid(r)
        nodes = [{
            "order": si["routeOrder"],
            "interpretationId": si["id"],
            "narrativePlaceId": si["narrativePlaceId"],
            "gazetteerId": si["gazetteerId"],
            "targetId": visual_target(si),
            "focalizerId": si["focalizerId"],
            "referenceId": si["referenceId"],
            "page": (ref_by_id.get(si["referenceId"]) or {}).get("page"),
        } for si in sis if si["isNodeOfRoute"] == rid]
        nodes.sort(key=lambda d: (d["order"] or 0, d["interpretationId"]))

        # steps: raggruppamento per order. Un order con piu' di un targetId
        # distinto e' una tappa simultanea, non un errore di annotazione.
        by_order = defaultdict(list)
        for n in nodes:
            by_order[n["order"]].append(n)
        steps = []
        for o in sorted(by_order, key=lambda v: (v is None, v)):
            grp = by_order[o]
            steps.append({
                "order": o,
                "targetIds": sorted({n["targetId"] for n in grp if n["targetId"]}),
                "focalizerIds": sorted({n["focalizerId"] for n in grp if n["focalizerId"]}),
                "interpretationIds": [n["interpretationId"] for n in grp],
            })

        carriers = [si for si in sis if si["routeId"] == rid]
        routes[str(r)] = {
            "id": rid, "iri": str(r),
            "label": rid.replace("tragitto_", "").replace("_", " "),
            "nodes": nodes, "nodeCount": len(nodes),
            "steps": steps, "stepCount": len(steps),
            "isPartialOrder": any(len(s["targetIds"]) > 1 for s in steps),
            # il colore della route sta qui: i nodi hanno narrativeRole nullo
            # per costruzione, il ruolo Route e' sui carrier.
            "carrierIds": [c["id"] for c in carriers],
            "carrierRoles": sorted({c["narrativeRole"] for c in carriers if c["narrativeRole"]}),
            "referenceIds": sorted({c["referenceId"] for c in carriers}),
            "focalizerIds": sorted({c["focalizerId"] for c in carriers if c["focalizerId"]}),
            "nodeFocalizerIds": sorted({n["focalizerId"] for n in nodes if n["focalizerId"]}),
        }

    # ---------------- indice di rilievo (modulo 4) --------------------------
    # Una riga per interpretazione che deposita rilievo su una tessera.
    # E' la primitiva: conteggi per personaggio, stratigrafia per pagina e
    # composizione dei ruoli si ricavano da qui, senza aggregati precalcolati
    # che poi divergono fra artefatti.
    relief = []
    for si in sis:
        t = visual_target(si)
        if not t:
            continue
        r = ref_by_id.get(si["referenceId"]) or {}
        relief.append({
            "targetId": t,
            "interpretationId": si["id"],
            "referenceId": si["referenceId"],
            "page": r.get("page"),
            "chapter": chapter_number.get(r.get("chapterId")),
            "agentId": si["focalizerId"],
            "role": si["narrativeRole"],
            "determination": si["spatialDetermination"],
            "isRouteNode": si["isNodeOfRoute"],
        })
    relief.sort(key=lambda d: (d["page"] or 0, d["referenceId"], d["interpretationId"]))

    # ---------------- sequenze derivate (timeline) --------------------------
    # NON sono entita' del modello: sono un'inferenza di lettura, ordinamento
    # delle occorrenze per agente e capitolo secondo l'ordine del discorso.
    # NOTA: l'80% delle tappe condivide la pagina con un'altra tappa della
    # stessa sequenza. L'ordinamento intra-pagina qui e' per referenceId, che
    # e' un artefatto di annotazione: le tappe con la stessa pagina vanno
    # trattate come simultanee, non come successive. `simultaneous` le marca.
    seq = defaultdict(list)
    for si in sis:
        t = visual_target(si)
        r = ref_by_id.get(si["referenceId"])
        if not r or not t:
            continue
        seq[(si["focalizerId"], r["chapterId"])].append({
            "page": r["page"], "referenceId": r["id"], "targetId": t,
            "narrativePlaceId": si["narrativePlaceId"],
            "gazetteerId": si["gazetteerId"],
            "interpretationId": si["id"],
            "role": si["narrativeRole"],
        })
    derived = []
    for (ag, ch), items in seq.items():
        items.sort(key=lambda d: (d["page"] or 0, d["referenceId"]))
        if len(items) < MIN_SEQUENCE_LEN:
            continue
        page_count = Counter(d["page"] for d in items)
        for d in items:
            d["simultaneous"] = page_count[d["page"]] > 1
        distinct = len({d["targetId"] for d in items})
        pages = [d["page"] for d in items if d["page"] is not None]
        derived.append({
            "agentId": ag, "agentName": agent_name.get(ag, ag),
            "chapterId": ch, "chapter": chapter_number.get(ch),
            "length": len(items), "distinctTargets": distinct,
            "dispersion": round(distinct / len(items), 3),
            "pageRange": [min(pages), max(pages)] if pages else None,
            "steps": items,
        })
    derived.sort(key=lambda d: (d["chapterId"], -d["length"]))

    # ---------------- tassellazione (parametri congelati) -------------------
    anchored_gaz = [v for v in gaz.values() if v["planeCount"] or v["refCountAnchored"]]
    generators = [v for v in anchored_gaz if v["distanceFromRomeKm"] <= GEO_RADIUS_KM]
    peripheral = [v for v in anchored_gaz if v["distanceFromRomeKm"] > GEO_RADIUS_KM]
    unanchored_np = [v for v in nps.values() if not v["targets"] and v["interpCount"] > 0]
    xs = [v["x"] for v in generators] or [0.0]
    ys = [v["y"] for v in generators] or [0.0]
    tessellation = {
        "generatorBands": sorted({v["scaleBand"] for v in generators}),
        "generatorCount": len(generators),
        "peripheralCount": len(peripheral),
        "excludedUnanchored": len(unanchored_np),
        "bbox": {"minX": min(xs), "maxX": max(xs), "minY": min(ys), "maxY": max(ys)},
        "center": [round((min(xs) + max(xs)) / 2, 2), round((min(ys) + max(ys)) / 2, 2)],
        "ringRadius": round(math.hypot(max(xs) - min(xs), max(ys) - min(ys)) / 2, 3),
    }

    relief_thresholds = [math.ceil(BANDS_LOG_BASE ** (k - 1)) for k in range(1, BANDS_MAX + 1)]

    # ---------------- serializzazione: atlas.json ---------------------------
    context = {
        "@vocab": "https://w3id.org/chora#",
        "id": "@id", "iri": "@id", "label": "http://www.w3.org/2000/01/rdf-schema#label",
        "lat": "http://www.w3.org/2003/01/geo/wgs84_pos#lat",
        "lon": "http://www.w3.org/2003/01/geo/wgs84_pos#long",
        "realityStatus": {"@type": "@vocab"},
        "narrativeRole": {"@type": "@vocab"},
        "spatialDetermination": {"@type": "@vocab"},
    }
    meta = {
        "ontology": "CHORA",
        "ontologyVersion": "1.0.0",
        "buildVersion": "4.3",
        "source": ttl_path.rsplit("/", 1)[-1],
        "tripleCount": len(g),
        "projection": {"type": "equirectangular", "center": list(PROJ_CENTER),
                       "scale": PROJ_SCALE, "computedAt": "build-time"},
        "densityBands": [{"min": lo, "max": (hi if hi < 10**9 else None), "class": n}
                         for lo, hi, n in DENSITY_BANDS],
        "reliefBands": {"logBase": BANDS_LOG_BASE, "maxBands": BANDS_MAX,
                        "thresholds": relief_thresholds},
        "countingRule": {
            "unit": "NarrativePlace",
            "plane": "PlaceReference distinti per tessera",
            "relief": "una SpatialInterpretation per riga, spacchettata per focalizzatore",
            "note": ("un NarrativePlace con tessera propria non contribuisce al "
                     "rilievo del GazetteerEntity che lo ancora"),
        },
        "tessellation": tessellation,
        "mergedVariants": len(MERGE_MAP),
        "excerptsIncluded": INCLUDE_EXCERPTS,
        "voidSeeds": "frozen" if frozen_seeds else "hashed",
        "counts": {
            "gazetteer": len(gaz), "narrativePlaces": len(nps),
            "interpretations": len(sis), "references": len(refs),
            "routes": len(routes), "chapters": len(chapters),
            "agents": len(agents), "derivedSequences": len(derived),
            "reliefRows": len(relief), "ownTiles": len(own_tile),
        },
    }
    atlas = {
        "@context": context,
        "meta": meta,
        "gazetteer": sorted(gaz.values(), key=lambda d: (-d["planeCount"], d["id"])),
        "narrativePlaces": sorted(nps.values(), key=lambda d: (-d["planeCount"], d["id"])),
        "interpretations": sis,
        "references": sorted(refs.values(), key=lambda d: d["id"]),
        "routes": sorted(routes.values(), key=lambda d: (-d["nodeCount"], d["id"])),
        "chapters": sorted(chapters.values(), key=lambda d: d["number"]),
        "agents": sorted(agents.values(), key=lambda d: (-d["refCount"], d["id"])),
        "derivedSequences": derived,
        "relief": relief,
    }

    # ---------------- serializzazione: payload di rendering -----------------
    def mentions_by_chapter(refset_by_chapter):
        return [refset_by_chapter.get(c, 0) for c in range(1, n_chapters + 1)]

    # menzioni per capitolo, sulla misura del piano (riferimenti distinti)
    chap_refs = defaultdict(lambda: defaultdict(set))
    for row in relief:
        if row["chapter"]:
            chap_refs[row["targetId"]][row["chapter"]].add(row["referenceId"])

    # un GazetteerEntity entra nel payload solo se il grafo lo tocca: senza
    # nemmeno un ancoraggio non e' ne' una tessera ne' un'ancora, e' rumore.
    features = []
    for v in sorted(gaz.values(), key=lambda d: (-d["planeCount"], d["id"])):
        if not (v["planeCount"] or v["refCountAnchored"]):
            continue
        cr = {c: len(s) for c, s in chap_refs.get(v["id"], {}).items()}
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [v["lon"], v["lat"]]},
            "properties": {
                "GazetteerEntity_ID": v["id"],
                "Toponym": v["label"],
                "occurrences": v["planeCount"],
                "interpretations": v["interpCount"],
                "anchoredTotal": v["refCountAnchored"],
                "mentionsByChapter": mentions_by_chapter(cr),
                "densityClass": v["densityClass"],
                "densityLevel": v["densityLevel"],
                "distanceFromRomeKm": v["distanceFromRomeKm"],
                "iri": v["iri"],
            },
        })

    for k in sorted(own_tile, key=lambda k: (-nps[k]["planeCount"], nps[k]["id"])):
        v = nps[k]
        cr = {c: len(s) for c, s in chap_refs.get(v["id"], {}).items()}
        seed = frozen_seeds.get(v["id"])
        features.append({
            "type": "Feature",
            "geometry": None,
            "properties": {
                "GazetteerEntity_ID": v["id"],
                "Toponym": v["label"],
                "occurrences": v["planeCount"],
                "interpretations": v["interpCount"],
                "mentionsByChapter": mentions_by_chapter(cr),
                "reality_status": (v["realityStatus"] or "").lower(),
                "partOf": v["partOf"],
                "refers_to_entity_ID": [t["gazetteerId"] for t in v["targets"]],
                "voidSeed": seed if seed is not None else fallback_seed(v["id"]),
                "anchorInherited": v["anchorInherited"],
                # distribuzioni complete, non piu' il solo valore modale:
                # su 258 tessere la dominanza mediana e' 1.0 ma i luoghi misti
                # sono esattamente gli hub -- il valore modale li appiattisce.
                "roles": v["roles"],
                "determinations": v["determinations"],
                "densityClass": v["densityClass"],
                "iri": v["iri"],
            },
        })

    geojson = {
        "type": "FeatureCollection",
        "name": "GaddAtlas_real_10ch",
        # Il payload di rendering non trasporta MAI estratti: ne' le feature ne'
        # le righe di relief hanno un campo excerpt. Il flag ereditato da `meta`
        # descrive atlas.json, non questo file, e lasciarlo a True farebbe
        # credere il contrario a chi ispeziona il GeoJSON.
        "meta": dict(meta, excerptsIncluded=False),
        "paths": {
            "routes": [{k: r[k] for k in
                        ("id", "iri", "label", "nodeCount", "stepCount",
                         "isPartialOrder", "nodes", "steps", "carrierRoles",
                         "focalizerIds", "nodeFocalizerIds")}
                       for r in atlas["routes"]],
            "sequences": derived,
            "agents": atlas["agents"],
            "chapters": atlas["chapters"],
        },
        "relief": relief,
        "features": features,
    }

    import os
    os.makedirs(out_dir, exist_ok=True)
    with open(f"{out_dir}/atlas.json", "w", encoding="utf-8") as f:
        json.dump(atlas, f, ensure_ascii=False, indent=1)

    slim = json.loads(json.dumps(atlas))
    for r in slim["references"]:
        r.pop("excerpt", None)
    slim["meta"] = dict(slim["meta"], excerptsIncluded=False)
    with open(f"{out_dir}/atlas.slim.json", "w", encoding="utf-8") as f:
        json.dump(slim, f, ensure_ascii=False, indent=1)

    with open(f"{out_dir}/gaddatlas.geojson", "w", encoding="utf-8") as f:
        json.dump(geojson, f, ensure_ascii=False)

    # semi effettivamente usati: riesportati per congelare il prossimo build
    with open(f"{out_dir}/void_seeds.json", "w", encoding="utf-8") as f:
        json.dump({ft["properties"]["GazetteerEntity_ID"]: ft["properties"]["voidSeed"]
                   for ft in features if ft["geometry"] is None},
                  f, ensure_ascii=False, indent=1, sort_keys=True)

    print("[build] scritti atlas.json, atlas.slim.json, gaddatlas.geojson, void_seeds.json")
    for k, v in meta["counts"].items():
        print(f"        {k:20s} {v}")
    relief_distribution = {k: 0 for k in range(BANDS_MAX + 1)}
    for ft in features:
        occ = ft["properties"].get("occurrences", 0) or 0
        b = 0 if occ <= 0 else min(BANDS_MAX, math.floor(math.log(occ) / math.log(BANDS_LOG_BASE)) + 1)
        relief_distribution[b] += 1
    print("[build] reliefBands thresholds: " + "·".join(str(v) for v in relief_thresholds))
    print("[build] reliefBands distribution: " +
          ", ".join(f"{k}:{relief_distribution[k]}" for k in range(BANDS_MAX + 1)))
    mute = [ft["properties"]["GazetteerEntity_ID"] for ft in features
            if ft["geometry"] and ft["properties"]["occurrences"] == 0]
    if mute:
        print(f"[build] {len(mute)} tessere referenziali mute (occorrenze proprie = 0): "
              f"{', '.join(mute[:12])}{' ...' if len(mute) > 12 else ''}")
    if not frozen_seeds:
        print("[build] ATTENZIONE: voidSeed rigenerati per hash. Azimut e silhouette "
              "dei fittizi cambieranno. Usare --seeds void_seeds.json per congelarli.")
    return atlas


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("ttl", nargs="?", default="data/dist/gaddatlas-full.ttl")
    ap.add_argument("out", nargs="?", default="data/dist")
    ap.add_argument("--seeds", default="data/source/void_seeds.json",
                    help="file JSON dei voidSeed congelati (id -> seed)")
    args = ap.parse_args()
    main(args.ttl, args.out, args.seeds)
