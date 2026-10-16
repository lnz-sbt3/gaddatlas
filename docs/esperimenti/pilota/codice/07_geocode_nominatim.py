import json, os, time, requests
from urllib.parse import urlencode

IN_PATH  = "data/entities_merged.json"
OUT_PATH = "data/geocoded.json"
CACHE    = "cache/geocode.json"
CITY, COUNTRY = "Roma", "Italia"

os.makedirs("cache", exist_ok=True)

def geocode_name(q, cache):
    if q in cache: 
        return cache[q]
    params = {
        "q": f"{q}, {CITY}, {COUNTRY}",
        "format": "jsonv2",
        "limit": 3,
        "addressdetails": 1
    }
    url = "https://nominatim.openstreetmap.org/search?" + urlencode(params)
    r = requests.get(url, headers={"User-Agent":"AtlanteGadda/1.0"})
    time.sleep(1.0)  # rispetta rate-limit
    data = r.json()
    cache[q] = data
    return data

def pick_best(cands):
    if not cands: return None
    cands = sorted(cands, key=lambda c: (
        0 if c.get("address",{}).get("city") in {"Roma","Rome"} else 1,
        0 if c.get("type") in {"residential","tertiary","secondary","primary","pedestrian","footway","place","square"} else 1,
        -float(c.get("importance",0))
    ))
    c = cands[0]
    return {
        "lat": float(c["lat"]),
        "lon": float(c["lon"]),
        "display_name": c.get("display_name"),
        "class": c.get("class"),
        "type": c.get("type"),
        "importance": float(c.get("importance",0))
    }

merged = json.load(open(IN_PATH, encoding="utf-8"))
cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}

out = []
for b in merged:
    geos = []
    for e in b["entities"]:
        name = e["text"]
        cands = geocode_name(name, cache)
        best = pick_best(cands)
        if best:
            geos.append({
                "mention": name,
                "score_ner": e.get("score", 0.0),
                "geo": best
            })
    if geos:
        out.append({"page": b["page"], "block": b["block"], "text": b["text"], "geocoded": geos})

json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
json.dump(out, open(OUT_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"[Geocode] Completato su {len(out)} blocchi → {OUT_PATH}")
