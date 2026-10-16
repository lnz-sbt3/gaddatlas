import json, os
from rdflib import Graph, Namespace, Literal, URIRef
from rdflib.namespace import RDF, XSD
import regex as re

IN_PATH = "data/geocoded.json"
OUT_GJ  = "data/atlante_pilot.geojson"
OUT_TTL = "data/atlante_pilot.ttl"

data = json.load(open(IN_PATH, encoding="utf-8"))

# ---- GeoJSON
features = []
for item in data:
    page, block, text = item["page"], item["block"], item["text"]
    for g in item["geocoded"]:
        lon, lat = g["geo"]["lon"], g["geo"]["lat"]
        props = {
            "mention": g["mention"],
            "page": page,
            "block": block,
            "snippet": (text[:240] + "…") if len(text) > 250 else text,
            "ner_confidence": round(g["score_ner"], 3),
            "el_importance": g["geo"]["importance"],
            "status": "confirmed" if g["geo"]["importance"] > 0.3 else "ambiguous",
            "source_block": f"QP:Cap?_p{page}_b{block}"
        }
        features.append({
            "type":"Feature",
            "geometry":{"type":"Point","coordinates":[lon,lat]},
            "properties":props
        })

geojson = {"type":"FeatureCollection","features":features}
json.dump(geojson, open(OUT_GJ, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"✔ GeoJSON → {OUT_GJ}")

# ---- RDF/Turtle minimale
EX = Namespace("https://atlantegadda.org/id/")
SCHEMA = Namespace("http://schema.org/")
PROV = Namespace("http://www.w3.org/ns/prov#")

g = Graph()
g.bind("ex", EX); g.bind("schema", SCHEMA); g.bind("prov", PROV)

for f in features:
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

g.serialize(OUT_TTL, format="turtle")
print(f"✔ RDF/Turtle → {OUT_TTL}")
