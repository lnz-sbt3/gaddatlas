import os, sys, json, time, statistics
import regex as re
import pdfplumber
import requests
from urllib.parse import urlencode
from unidecode import unidecode
from rapidfuzz import fuzz
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from rdflib import Graph, Namespace, Literal, URIRef
from rdflib.namespace import RDF, XSD

# ---------- config ----------
PDF = sys.argv[1] if len(sys.argv)>1 else "QP_Adelphi.pdf"
CITY = "Roma"
COUNTRY = "Italia"
MODEL = "Davlan/xlm-roberta-base-ner-hrl"
OUT_DIR = "data"
CACHE_GEO = "cache/geocode.json"
os.makedirs(OUT_DIR, exist_ok=True); os.makedirs("cache", exist_ok=True)

# ---------- validazione PDF (text-based or img) ----------
def probe_pdf(pdf_path, sample_pages=5):
    with pdfplumber.open(pdf_path) as pdf:
        n = len(pdf.pages)
        idx = [0, max(1,n//3), max(2,(2*n)//3), n-2, n-1][:sample_pages] if n>=5 else list(range(n))
        lens, imgs = [], []
        for i in idx:
            p = pdf.pages[i]
            t = (p.extract_text() or "").strip()
            lens.append(len(t))
            imgs.append(len(p.images))
    med = int(statistics.median(lens) if lens else 0)
    print(f"[Probe] Pagine={n} | med_char/pag≈{med} | img(campione)={sum(imgs)}")
    if med<=400 and sum(imgs)>0:
        print("⚠️ PDF forse ibrido/scansione. Procedo comunque con estrazione: valuta OCR se output scarso.")
    return n

# --------- creazione lista vocabolari con pagina-indice riga-testo riga per tutta l'opera --------
def extract_blocks(pdf_path):
    out=[]
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            for i, line in enumerate(lines, start=1):
                out.append({"page": pno, "block": i, "text": line})
    return out

# --------- regex per normalizzazione testuale -----------
def normalize_text(t:str)->str:
    t = t.replace("ﬁ","fi").replace("ﬂ","fl").replace("’","'").replace("“",'"').replace("”",'"')
    t = re.sub(r"(\w)[\--]\s+(\w)", r"\1\2", t)
    t = re.sub(r"\s+"," ", t).strip()
    return t

# ----------
def run_ner(blocks):
    # -- Convertire il testo in token
    tok = AutoTokenizer.from_pretrained(MODEL, use_fast=False, trust_remote_code=False) # Libreria "transformers" di Hugging Face
    # -- Caricamento Modello (scaricare pesi prototipi) per classificare token (NER)
    mod = AutoModelForTokenClassification.from_pretrained(MODEL)
    # -- Wrapper per creazione della Pipeline (tokenizer + modello + post-processing)
    # - "Token-classification": task da eseguire (NER è una token classification)
    ner = pipeline("token-classification", model=mod, tokenizer=tok, aggregation_strategy="simple")
    
    out=[]
    for b in blocks:
        ents = ner(b["text"])
        out.append({**b, "entities":[
            {"text":e["word"], "label":e["entity_group"], "score":float(e["score"]), "start":e["start"], "end":e["end"]}
            for e in ents
        ]})
    return out

# ----------- REGEX COMPILATE (fuori dalle funzioni) ------------
ODONIMO = re.compile(r"(via|viale|vico|vicolo|corso|largo|piazza|piazzale|lungotevere|rione|quartiere)\s+[A-Z][\p{L}\-’']+(?:\s+[A-Z][\p{L}\-’']+)*")
QUARTIERI = re.compile(r"\b(Trastevere|Testaccio|Parioli|Esquilino|Garbatella|Prati|Monti|San Lorenzo|Pigneto|Tiburtino|Aventino|Celio|Flaminio|Trieste)\b")


# ------- Regex matching per quartieri e odonimi nel testo ---------
def rule_hits(blocks):
    hits=[]
    for b in blocks:
        text=b["text"]
        spans=[]
        for m in ODONIMO.finditer(text):
            spans.append({"text":m.group(0),"label":"LOC","score":0.60,"start":m.start(),"end":m.end(),"source":"rule_odonym"})
        for m in QUARTIERI.finditer(text):
            spans.append({"text":m.group(0),"label":"LOC","score":0.55,"start":m.start(),"end":m.end(),"source":"rule_quartiere"})
        hits.append({**b,"entities":spans})
    return hits

# ---- Funzione helper per riparare entità (ents) senza start o end ---------- 
def _normalize_spans(ents, text):
    """Garantisce start/end per ogni entità. Se mancanti, prova a calcolarli con text.find()."""
    norm = []
    for e in ents:
        s = e.get("start")
        t = e.get("text", "")
        if s is None or e.get("end") is None:
            idx = text.find(t)
            if idx >= 0:
                e["start"] = idx
                e["end"] = idx + len(t)
            else:
                # fallback neutro
                e["start"] = 10**9
                e["end"] = 10**9
        norm.append(e)
    return norm

def _ent_len(e):
    try:
        return int(e["end"]) - int(e["start"])
    except Exception:
        return 0

def _starts_before_or_overlap(a, b):
    try:
        return a["start"] <= b["end"] and a["end"] >= b["start"]
    except Exception:
        return False

# ------ IMPORTANTE: Unione della NER e della Regex -------
def merge_entities(ner_res, rule_res):
    # -- Ordina le entities di regex per (pagina, blocco) come keys
    rule_by_key = {(r["page"], r["block"]): r["entities"] for r in rule_res}
    merged = []
    for b in ner_res:
        # -- Ordinale le entities di NER per (pagina, blocco) come keys
        key = (b["page"], b["block"])
        ents = list(b["entities"])
        # -- Genera una lista unita di 2 vocabolari (tramite la stessa key) NER + Regex! ---
        ents += rule_by_key.get(key, [])
        # -- Filtra solo location-like
        ents = [e for e in ents if e.get("label") in {"LOC","GPE","I-LOC","B-LOC"}]
        # normalizza span mancanti
        ents = _normalize_spans(ents, b["text"])
        # ordina: prima per start, poi per lunghezza decrescente
        ents = sorted(ents, key=lambda x: (int(x.get("start", 10**9)), -_ent_len(x)))

        final = []
        for e in ents:
            if final and _starts_before_or_overlap(e, final[-1]):
                # tieni lo span più lungo o col punteggio maggiore
                if (_ent_len(e) > _ent_len(final[-1])) or (e.get("score", 0) > final[-1].get("score", 0)):
                    final[-1] = e
            else:
                final.append(e)

        merged.append({"page": b["page"], "block": b["block"], "text": b["text"], "entities": final})
    return merged

#  API Request a Nominatim
def geocode_name(q, cache):
    if q in cache: return cache[q]
    params={"q":f"{q}, {CITY}, {COUNTRY}","format":"jsonv2","limit":3,"addressdetails":1}
    url="https://nominatim.openstreetmap.org/search?"+urlencode(params)
    r=requests.get(url, headers={"User-Agent":"GaddAtlas/1.0"})
    time.sleep(1.0)
    data=r.json()
    cache[q]=data
    return data

#Ordinamento delle get di Nominatim per rilevanza
def pick_best(cands):
    if not cands: return None
    cands = sorted(cands, key=lambda c: (
        0 if c.get("address",{}).get("city") in {"Roma","Rome"} else 1,
        0 if c.get("type") in {"residential","tertiary","secondary","primary","pedestrian","footway","place","square", "amenity", "building"} else 1,
        -float(c.get("importance",0))
    ))
    c=cands[0]
    return {"lat":float(c["lat"]),"lon":float(c["lon"]),"display_name":c.get("display_name"),
            "class":c.get("class"),"type":c.get("type"),"importance":float(c.get("importance",0))}

def run_geocoding(merged):
    cache = json.load(open(CACHE_GEO,encoding="utf-8")) if os.path.exists(CACHE_GEO) else {}
    out=[]
    for b in merged:
        geos=[]
        for e in b["entities"]:
            name=e["text"]
            cands=geocode_name(name, cache)
            best=pick_best(cands)
            if best:
                geos.append({"mention":name,"score_ner":e.get("score",0.0),"geo":best})
        if geos:
            out.append({"page":b["page"],"block":b["block"],"text":b["text"],"geocoded":geos})
    json.dump(cache, open(CACHE_GEO,"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    return out

def export_geojson_rdf(geocoded):
    # GeoJSON
    feats=[]
    for item in geocoded:
        page, block, text = item["page"], item["block"], item["text"]
        for g in item["geocoded"]:
            lon, lat = g["geo"]["lon"], g["geo"]["lat"]
            props={
                "mention": g["mention"],
                "page": page, "block": block,
                "snippet": (text[:240]+"…") if len(text)>250 else text,
                "ner_confidence": round(g["score_ner"],3),
                "el_importance": g["geo"]["importance"],
                "status": "confirmed" if g["geo"]["importance"]>0.3 else "ambiguous",
                "source_block": f"QP:Cap?_p{page}_b{block}"
            }
            feats.append({"type":"Feature","geometry":{"type":"Point","coordinates":[lon,lat]},"properties":props})
    geojson={"type":"FeatureCollection","features":feats}
    json.dump(geojson, open(os.path.join(OUT_DIR,"atlante_pilot.geojson"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)

    # RDF Turtle minimale
    EX = Namespace("https://atlantegadda.org/id/")
    SCHEMA = Namespace("http://schema.org/")
    PROV = Namespace("http://www.w3.org/ns/prov#")
    g=Graph(); g.bind("ex",EX); g.bind("schema",SCHEMA); g.bind("prov",PROV)

    for f in feats:
        m = f["properties"]["mention"]
        place_id = URIRef(EX["place/"+re.sub(r"\s+","_", m)])
        g.add((place_id, RDF.type, SCHEMA.Place))
        g.add((place_id, SCHEMA.name, Literal(m, lang="it")))
        lat = f["geometry"]["coordinates"][1]; lon = f["geometry"]["coordinates"][0]
        geo_id = URIRef(EX["geo/"+re.sub(r"\s+","_", m)])
        g.add((place_id, SCHEMA.geo, geo_id))
        g.add((geo_id, RDF.type, SCHEMA.GeoCoordinates))
        g.add((geo_id, SCHEMA.latitude, Literal(lat, datatype=XSD.float)))
        g.add((geo_id, SCHEMA.longitude, Literal(lon, datatype=XSD.float)))
        g.add((place_id, EX.status, Literal(f["properties"]["status"])))
        g.add((place_id, EX.nerConfidence, Literal(f["properties"]["ner_confidence"], datatype=XSD.float)))
        g.add((place_id, PROV.wasDerivedFrom, Literal(f["properties"]["source_block"])))

    g.serialize(os.path.join(OUT_DIR,"atlante_pilot.ttl"), format="turtle")


#---- Esegui le funzioni se lo script viene lanciato direttamente, e non come modulo
if __name__=="__main__":
    probe_pdf(PDF)
    blocks = extract_blocks(PDF)
    for b in blocks: b["text"]=normalize_text(b["text"])
    blocks = blocks[:600]
    json.dump(blocks, open(os.path.join(OUT_DIR,"blocks.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[Blocks] Salvati {len(blocks)} blocchi → data/blocks.json")

    ner_res = run_ner(blocks)
    json.dump(ner_res, open(os.path.join(OUT_DIR,"ner_xlmr.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[NER] Completato → data/ner_xlmr.json")

    rules_res = rule_hits(blocks)
    merged = merge_entities(ner_res, rules_res)
    json.dump(merged, open(os.path.join(OUT_DIR,"entities_merged.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[Merge] Completato → data/entities_merged.json")

    geocoded = run_geocoding(merged)
    json.dump(geocoded, open(os.path.join(OUT_DIR,"geocoded.json"),"w",encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[Geocode] Completato su {len(geocoded)} blocchi → data/geocoded.json")

    export_geojson_rdf(geocoded)
    print("✔ Export: data/atlante_pilot.geojson  |  data/atlante_pilot.ttl")