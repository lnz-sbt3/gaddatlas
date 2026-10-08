.PHONY: help all rdf geojson passages publish-data audit shacl queries docs clean check xlsx

help:
	@echo ""
	@echo "  make all       catena completa: rdf -> geojson -> passages -> publish-data -> audit"
	@echo "  make check     all + shacl + queries (verifica totale)"
	@echo ""
	@echo "  make rdf       fogli + TBox  -> data/gaddatlas.ttl e dist/gaddatlas-full.ttl"
	@echo "  make geojson   TTL           -> gaddatlas.geojson, atlas.slim.json, void_seeds"
	@echo "  make passages  TTL           -> data/dist/passages/*.json"
	@echo "  make publish-data  data/dist -> app/public/data (GeoJSON e brani)"
	@echo "  make audit     verifica la coerenza fra sorgenti e derivati"
	@echo "  make shacl     validazione SHACL (deve dire CONFORMS: True)"
	@echo "  make queries   12 competency + 11 integrity query"
	@echo "  make docs      rigenera la documentazione pyLODE"
	@echo "  make xlsx      TSV canonici -> data/source/xlsx/ (per chi lavora in Excel)"
	@echo "  make clean     rimuove i derivati"
	@echo ""

# La catena completa. L'ordine conta: geojson e passages leggono il TTL
# prodotto da rdf, e audit confronta i tre risultati fra loro.
all: rdf geojson passages publish-data audit

check: all shacl queries

# I TSV sono la sorgente (D-015); gli XLSX sono un derivato per chi lavora in
# Excel. Una modifica fatta in un XLSX torna nel TSV con
# tools/xlsx_to_tsv.py, che sovrascrive il TSV: controllarne il diff.
xlsx:
	python3 tools/tsv_to_xlsx.py --tables data/source/tables --out data/source/xlsx

# Sorgenti: i TSV in data/source/tables/, il mapping, e la TBox in
# ontology/chora.ttl (D-016). chora.rdf e' DERIVATA da chora.ttl, in RDF/XML
# per Protege: se si lavora in Protege si salva su chora.ttl.
rdf:
	python3 tools/etl.py \
	  --mapping data/source/mapping.yaml \
	  --base-dir . \
	  --data-dir data/source/tables \
	  --ontology-source ontology/chora.ttl \
	  --ontology-output ontology/chora.rdf \
	  --tbox ontology/shapes/chora-placecategories.ttl \
	  --output data/gaddatlas.ttl \
	  --full-output data/dist/gaddatlas-full.ttl

# --seeds e' obbligatorio nei fatti: senza, i voidSeed si rigenerano per hash
# e i 48 tasselli fittizi cambiano azimut e silhouette (D-012).
geojson:
	python3 tools/build_geojson.py \
	  data/dist/gaddatlas-full.ttl \
	  data/dist \
	  --seeds data/source/void_seeds.json

passages:
	python3 tools/build_passages.py

# L'interfaccia carica i dati da app/public/data/: sono una copia dei
# derivati, non una sorgente (T-83). roma.geojson ha sorgente propria in
# data/source/ e non passa di qui. audit verifica che le copie coincidano.
publish-data:
	mkdir -p app/public/data/passages
	cp data/dist/gaddatlas.geojson app/public/data/gaddatlas.geojson
	cp data/dist/passages/*.json app/public/data/passages/

audit:
	python3 tools/audit_alignment.py

shacl:
	python3 tools/validate_shacl.py --shapes ontology/shapes/chora-shapes.ttl

queries:
	python3 tools/run_queries.py --queries ontology/queries/competency.rq
	python3 tools/run_queries.py --queries ontology/queries/integrity.rq

# build_docs.py fa piu' di pylode: genera un file per vocabolario SKOS,
# corregge i metadati (fix_pylode_metadata.py) e collega le pagine fra loro
# (link_docs.py). Chiamare pylode direttamente produce un solo index.html
# senza i vocab_*.html e senza le correzioni.
docs:
	python3 tools/build_docs.py

clean:
	rm -rf data/dist/passages \
	       data/dist/gaddatlas-full.ttl \
	       data/dist/gaddatlas.geojson \
	       data/dist/atlas.json \
	       data/dist/atlas.slim.json \
	       data/dist/void_seeds.json \
	       data/gaddatlas.ttl
