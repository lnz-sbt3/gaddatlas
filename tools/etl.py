#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ETL GaddAtlas / CHORA 1.0.0
============================
Script di conversione Excel/TSV → RDF conforme all'ontologia CHORA 1.0.0

Architettura:
- PlaceReference: livello attestativo (solo metadati testuali/bibliografici,
  nessun default target)
- SpatialInterpretation: livello interpretativo. Le attribuzioni critiche
  vivono qui: targeting (targetsPlace/targetsRoute), focalizzatore
  (hasFocalizer), ancoraggio (anchorsToEntity), ruolo narrativo, spatial
  determination, spatial relation type. Reality status e fuzziness level
  sono invece proprietà invarianti del luogo (vedi NarrativePlace sotto).
- NarrativePlace (unificazione di DiscreteNarrativePlace e
  VagueNarrativeArea): porta hasRealityStatus, hasFuzzinessLevel e isPartOf.
- NarrativeRoute (v1.0.0): aggregato ordinato di NarrativePlace percorso da
  un focalizzatore (targetsRoute / isNodeOfRoute / routeOrder).
- GazetteerEntity: entità spaziale esterna separata

Author: Lorenzo Sabatino
Date: 2026-07-26
"""

import logging
import sys
from pathlib import Path
from typing import Dict, Any, Optional, Set, List
from datetime import datetime

import pandas as pd
import yaml
from rdflib import Graph, Namespace, URIRef, Literal, BNode, RDF, RDFS, XSD, OWL
from rdflib.namespace import SKOS, DCTERMS

# ============================================================
# CONFIGURAZIONE LOGGING
# ============================================================

try:
    # Evita UnicodeEncodeError su console Windows (cp1252) con caratteri
    # come "✓"/"⚠️" nei log.
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('etl_chora.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


# ============================================================
# NAMESPACE RDF
# ============================================================

CHORA = Namespace("https://w3id.org/chora#")
CHORA_ONTOLOGY = URIRef("https://w3id.org/chora")
CHORA_VERSION = "1.0.0"
ID_NS = Namespace("https://w3id.org/gaddatlas/id/")
GEO = Namespace("http://www.w3.org/2003/01/geo/wgs84_pos#")
GEOSPARQL = Namespace("http://www.opengis.net/ont/geosparql#")
PROV = Namespace("http://www.w3.org/ns/prov#")


def has_value(x: Any) -> bool:
    """
    Verifica se una cella TSV contiene un valore popolato.

    I file sono letti con dtype=str, keep_default_na=False: non esistono
    più NaN, le celle vuote sono stringhe vuote "". pd.isna/pd.notna non
    sono più utilizzabili per questo controllo (pd.notna("") è True).
    """
    return bool(x) and bool(str(x).strip())


# ============================================================
# CLASSE ETL PRINCIPALE
# ============================================================

class GaddaETL:
    """ETL principale per conversione dati GaddAtlas / CHORA 1.0.0."""

    def __init__(self, mapping_file: str, base_dir: str = ".", data_dir: str = "NEW_DB"):
        """
        Inizializza ETL.

        Args:
            mapping_file: Path al file mapping YAML (v1.0.0)
            base_dir: Directory base per i file di input
            data_dir: Sottocartella contenente i 7 TSV, relativa a base_dir.
                      Passare "" o "." per leggerli direttamente da base_dir.
        """
        self.mapping_file = Path(mapping_file)
        self.base_dir = Path(base_dir)
        self.data_dir = self.base_dir / data_dir if data_dir not in ("", ".") else self.base_dir
        self.mapping: Dict[str, Any] = {}
        self.vocabularies: Dict[str, Dict[str, str]] = {}
        self.namespaces: Dict[str, str] = {}
        self.constants: Dict[str, str] = {}

        # RDF Graph
        self.graph = Graph()

        # Cache per lookup IDs (validazione integrità referenziale).
        # Le entita primarie vengono popolate dai rispettivi process_* prima
        # di essere referenziate da References e SpatialInterpretations.
        self.id_cache: Dict[str, Set[str]] = {
            'Work_ID': set(),
            'Chapter_ID': set(),
            'Focalizer_ID': set(),
            'NarrativePlace_ID': set(),
            'GazetteerEntity_ID': set(),
            'Reference_ID': set(),
        }

        self.place_fuzziness: Dict[str, Any] = {}

        self.routes_seen: Set[str] = set()

        logger.info(f"ETL GaddAtlas / CHORA {CHORA_VERSION} inizializzato")

    def load_mapping(self):
        """Carica mapping YAML e inizializza namespace."""
        logger.info(f"Caricamento mapping da {self.mapping_file}")

        with open(self.mapping_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        self.namespaces = config.get('namespaces', {})
        self.vocabularies = config.get('vocabularies', {})
        self.mapping = config.get('mappings', {})
        self.constants = config.get('constants', {})

        # Bind namespace in RDF graph
        for prefix, uri in self.namespaces.items():
            self.graph.bind(prefix, Namespace(uri))

        logger.info(f"Caricati {len(self.mapping)} mapping, {len(self.vocabularies)} vocabolari")

    def expand_namespace(self, prefixed_uri: str) -> URIRef:
        """
        Espande URI con prefisso namespace.

        Args:
            prefixed_uri: URI con prefisso (es. "chora:Setting")

        Returns:
            URIRef completo

        Example:
            expand_namespace("chora:Setting") → URIRef("https://w3id.org/chora#Setting")
        """
        if ':' not in prefixed_uri:
            return URIRef(prefixed_uri)

        prefix, local_name = prefixed_uri.split(':', 1)

        if prefix not in self.namespaces:
            logger.warning(f"Namespace '{prefix}' non trovato, uso URI letterale")
            return URIRef(prefixed_uri)

        return URIRef(self.namespaces[prefix] + local_name)

    def resolve_lookup(self, value: str, lookup_target: str) -> Optional[URIRef]:
        """
        Risolve ID in URI usando mapping YAML.

        Args:
            value: ID da risolvere (es. "san_martino_ai_monti")
            lookup_target: Nome del mapping (es. "@NarrativePlace_ID")

        Returns:
            URIRef risolto o None se non valido

        Example:
            resolve_lookup("san_martino_ai_monti", "@NarrativePlace_ID")
            → URIRef("https://w3id.org/gaddatlas/id/narrativeplace/san_martino_ai_monti")
        """
        if not has_value(value):
            return None

        value = str(value).strip()
        if not value:
            return None

        # Risolvi valore per URI (rimuovi caratteri non validi)
        # Rimuovi parentesi quadre e altri caratteri problematici
        value = value.replace('[', '').replace(']', '').replace(' ', '_')

        # Rimuovi "@" dal lookup target
        mapping_key = lookup_target.replace('@', '')

        # Trova il mapping corretto nella configurazione
        # I lookup targets corrispondono alle chiavi primarie nei mapping
        mapping_config = None
        for map_name, map_data in self.mapping.items():
            # Trova la chiave primaria (es. NarrativePlace_ID, Reference_ID, etc.)
            for key in map_data.keys():
                if key == mapping_key and key != 'source_file':
                    mapping_config = map_data[key]
                    break
            if mapping_config:
                break

        if not mapping_config:
            logger.error(f"Mapping '{mapping_key}' non trovato in YAML")
            return None

        # Ottieni template URI
        uri_template = mapping_config.get('as_uri')
        if not uri_template:
            logger.error(f"Template URI non trovato per mapping '{mapping_key}'")
            return None

        # Genera URI sostituendo {value}
        uri = uri_template.format(value=value)

        return URIRef(uri)

    def resolve_work_uri_for_reference(self, value: Any) -> Optional[URIRef]:
        """Risolve Work_ID, con fallback al work unico del corpus."""
        work_id = str(value).strip() if has_value(value) else None
        if work_id in self.id_cache['Work_ID']:
            return self.resolve_lookup(work_id, '@Work_ID')

        if len(self.id_cache['Work_ID']) == 1:
            fallback_id = next(iter(self.id_cache['Work_ID']))
            if work_id:
                logger.debug(f"Work_ID '{work_id}' normalizzato a '{fallback_id}'")
            return self.resolve_lookup(fallback_id, '@Work_ID')

        if work_id:
            return self.resolve_lookup(work_id, '@Work_ID')
        return None

    def resolve_chapter_uri_for_reference(self, value: Any) -> Optional[URIRef]:
        """Risolve Chapter_ID, normalizzando etichette legacy tipo '[Capitolo I]'."""
        if not has_value(value):
            return None

        chapter_id = str(value).strip()
        if chapter_id in self.id_cache['Chapter_ID']:
            return self.resolve_lookup(chapter_id, '@Chapter_ID')

        roman_to_int = {
            'i': 1, 'ii': 2, 'iii': 3, 'iv': 4, 'v': 5,
            'vi': 6, 'vii': 7, 'viii': 8, 'ix': 9, 'x': 10,
        }
        normalized = chapter_id.strip('[]').strip().lower()
        # Accetta sia "[Capitolo I]" (legacy) sia "capitolo_I" (slug v4.1.1)
        normalized = normalized.replace('_', ' ')
        if normalized.startswith('capitolo '):
            roman = normalized.replace('capitolo ', '', 1).strip()
            number = roman_to_int.get(roman)
            if number is not None:
                candidate = f"cap_{number:02d}"
                if candidate in self.id_cache['Chapter_ID']:
                    return self.resolve_lookup(candidate, '@Chapter_ID')

        return self.resolve_lookup(chapter_id, '@Chapter_ID')

    def map_vocabulary(self, value: str, vocab_name: str) -> Optional[URIRef]:
        """
        Mappa valore Excel → URI ontologia usando vocabolario controllato.

        Args:
            value: Valore da mappare
            vocab_name: Nome del vocabolario

        Returns:
            URIRef dell'entità ontologica o None

        Example:
            map_vocabulary("marker", "narrative_roles")
            → URIRef("https://w3id.org/chora#Marker")
        """
        if not has_value(value):
            return None

        value_normalized = str(value).strip().lower()

        vocab = self.vocabularies.get(vocab_name, {})
        uri_suffix = vocab.get(value_normalized)

        if not uri_suffix:
            logger.warning(f"Valore '{value}' non trovato in vocabolario '{vocab_name}'")
            return None

        # uri_suffix è già completo (es. "chora:Marker")
        return self.expand_namespace(uri_suffix)

    def create_geometry_node(
        self,
        geometry_json: str,
        property_uri: URIRef,
        subject_uri: URIRef
    ):
        """
        Crea nodo geometria GeoSPARQL.

        Args:
            geometry_json: Stringa JSON GeoJSON
            property_uri: Property da usare (v4.1.1: solo geosparql:hasGeometry,
                su GazetteerEntity.
            subject_uri: Soggetto a cui collegare la geometria
        """
        if not has_value(geometry_json):
            return

        geom_node = BNode()
        self.graph.add((subject_uri, property_uri, geom_node))
        self.graph.add((geom_node, RDF.type, GEOSPARQL.Geometry))
        self.graph.add((geom_node, GEOSPARQL.asGeoJSON,
                       Literal(geometry_json, datatype=GEOSPARQL.geoJSONLiteral)))

    def add_literal(
        self,
        subject: URIRef,
        predicate: URIRef,
        value: Any,
        datatype: Optional[URIRef] = None,
        lang: Optional[str] = None
    ):
        """
        Aggiunge tripla con literal, gestendo valori nulli.

        Args:
            subject: Soggetto
            predicate: Predicato
            value: Valore
            datatype: Datatype XSD opzionale
            lang: Language tag opzionale
        """
        if not has_value(value):
            return

        if datatype:
            self.graph.add((subject, predicate, Literal(value, datatype=datatype)))
        elif lang:
            self.graph.add((subject, predicate, Literal(value, lang=lang)))
        else:
            self.graph.add((subject, predicate, Literal(value)))

    # ============================================================
    # FILE PROCESSORI
    # ============================================================

    def process_literary_works(self, file_path: str):
        """
        Processa LiteraryWorks.tsv.

        Schema:
        - Work_ID (chiave primaria)
        - Full_Title
        - Author
        - Publication_Year
        - Edition_Used
        - Notes
        """
        logger.info(f"Processando LiteraryWorks da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da LiteraryWorks")

            for idx, row in df.iterrows():
                work_id = row.get('Work_ID')

                if not has_value(work_id):
                    logger.warning(f"Riga {idx}: Work_ID mancante, skip")
                    continue

                work_id = str(work_id).strip()
                self.id_cache['Work_ID'].add(work_id)

                work_uri = self.resolve_lookup(work_id, '@Work_ID')
                if not work_uri:
                    logger.warning(f"Riga {idx}: Work_ID '{work_id}' non risolto, skip")
                    continue

                self.graph.add((work_uri, RDF.type, CHORA.LiteraryWork))
                self.add_literal(work_uri, DCTERMS.title, row.get('Full_Title'), lang='it')
                self.add_literal(work_uri, DCTERMS.creator, row.get('Author'), lang='it')
                self.add_literal(work_uri, DCTERMS.date, row.get('Publication_Year'), datatype=XSD.gYear)
                self.add_literal(work_uri, DCTERMS.bibliographicCitation, row.get('Edition_Used'), lang='it')
                self.add_literal(work_uri, RDFS.comment, row.get('Notes'), lang='it')

            logger.info(f"LiteraryWorks: processate {len(self.id_cache['Work_ID'])} opere")

        except FileNotFoundError:
            logger.error(f"File {file_path} non trovato - CRITICO per LiteraryWorks")
            raise
        except Exception as e:
            logger.error(f"Errore processando LiteraryWorks: {e}", exc_info=True)
            raise

    def process_chapters(self, file_path: str):
        """
        Processa Chapters.tsv.

        Schema:
        - Chapter_ID (chiave primaria)
        - Work_ID
        - Chapter_Title
        - Chapter_Number
        - Page_Range
        """
        logger.info(f"Processando Chapters da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da Chapters")

            for idx, row in df.iterrows():
                chapter_id = row.get('Chapter_ID')

                if not has_value(chapter_id):
                    logger.warning(f"Riga {idx}: Chapter_ID mancante, skip")
                    continue

                chapter_id = str(chapter_id).strip()
                self.id_cache['Chapter_ID'].add(chapter_id)

                chapter_uri = self.resolve_lookup(chapter_id, '@Chapter_ID')
                if not chapter_uri:
                    logger.warning(f"Riga {idx}: Chapter_ID '{chapter_id}' non risolto, skip")
                    continue

                self.graph.add((chapter_uri, RDF.type, CHORA.Chapter))

                work_id = row.get('Work_ID')
                if has_value(work_id):
                    work_uri = self.resolve_lookup(work_id, '@Work_ID')
                    if work_uri:
                        self.graph.add((chapter_uri, CHORA.partOfWork, work_uri))

                self.add_literal(chapter_uri, DCTERMS.title, row.get('Chapter_Title'), lang='it')
                chapter_number = row.get('Chapter_Number')
                if has_value(chapter_number):
                    self.add_literal(chapter_uri, CHORA.chapterNumber, int(chapter_number), datatype=XSD.integer)
                self.add_literal(chapter_uri, CHORA.pageRange, row.get('Page_Range'), datatype=XSD.string)

            logger.info(f"Chapters: processati {len(self.id_cache['Chapter_ID'])} capitoli")

        except FileNotFoundError:
            logger.error(f"File {file_path} non trovato - CRITICO per Chapters")
            raise
        except Exception as e:
            logger.error(f"Errore processando Chapters: {e}", exc_info=True)
            raise

    def process_focalizing_agents(self, file_path: str):
        """
        Processa FocalizingAgents.tsv.

        Schema:
        - Focalizer_ID (chiave primaria)
        - Focalizer_Type (character/narrator)
        - Character_Name
        - Narrator_Type
        - Gender
        - Description
        """
        logger.info(f"Processando FocalizingAgents da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da FocalizingAgents")

            for idx, row in df.iterrows():
                focalizer_id = row.get('Focalizer_ID')

                if not has_value(focalizer_id):
                    logger.warning(f"Riga {idx}: Focalizer_ID mancante, skip")
                    continue

                focalizer_id = str(focalizer_id).strip()
                self.id_cache['Focalizer_ID'].add(focalizer_id)

                foc_uri = self.resolve_lookup(focalizer_id, '@Focalizer_ID')
                if not foc_uri:
                    logger.warning(f"Riga {idx}: Focalizer_ID '{focalizer_id}' non risolto, skip")
                    continue

                focalizer_type = row.get('Focalizer_Type')
                focalizer_type_norm = str(focalizer_type).strip().lower() if has_value(focalizer_type) else ''

                if focalizer_type_norm == 'character':
                    self.graph.add((foc_uri, RDF.type, CHORA.Character))
                    # sh:class NON risolve rdfs:subClassOf: senza il tipo
                    # esplicito la shape sul focalizzatore fallisce su TUTTE
                    # le SpatialInterpretation. Chiusura materializzata qui.
                    self.graph.add((foc_uri, RDF.type, CHORA.FocalizingAgent))
                elif focalizer_type_norm == 'narrator':
                    self.graph.add((foc_uri, RDF.type, CHORA.Narrator))
                    self.graph.add((foc_uri, RDF.type, CHORA.FocalizingAgent))
                    self.add_literal(foc_uri, CHORA.narratorType, row.get('Narrator_Type'), datatype=XSD.string)
                else:
                    logger.warning(
                        f"Riga {idx}: Focalizer_Type '{focalizer_type}' non riconosciuto per {focalizer_id}"
                    )

                self.add_literal(foc_uri, CHORA.characterName, row.get('Character_Name'), lang='it')
                self.add_literal(foc_uri, CHORA.hasGender, row.get('Gender'), datatype=XSD.string)
                self.add_literal(foc_uri, DCTERMS.description, row.get('Description'), lang='it')

            logger.info(f"FocalizingAgents: processati {len(self.id_cache['Focalizer_ID'])} agenti")

        except FileNotFoundError:
            logger.error(f"File {file_path} non trovato - CRITICO per FocalizingAgents")
            raise
        except Exception as e:
            logger.error(f"Errore processando FocalizingAgents: {e}", exc_info=True)
            raise

    def process_discrete_narrative_places(self, file_path: str):
        """
        Processa NarrativePlaces.tsv (funzione e log mantengono il nome
        storico process_discrete_narrative_places per non alterare l'API
        interna dello script)

        Schema:
        - NarrativePlace_ID (chiave primaria)
        - Narrative_Toponym
        - Alternative_Toponym
        - Reality_Status
        - Is_Part_Of
        - Place_Category
        - Description
        - Notes
        - Fuzziness_Level
        """
        logger.info(f"Processando DiscreteNarrativePlaces da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da DiscreteNarrativePlaces")

            for idx, row in df.iterrows():
                place_id = row.get('NarrativePlace_ID')

                if not has_value(place_id):
                    logger.warning(f"Riga {idx}: NarrativePlace_ID mancante, skip")
                    continue

                place_id = str(place_id).strip()
                self.id_cache['NarrativePlace_ID'].add(place_id)

                # Crea URI
                place_uri = self.resolve_lookup(place_id, '@NarrativePlace_ID')

                # RDF Type (v4.1.1: classe unificata NarrativePlace)
                self.graph.add((place_uri, RDF.type, CHORA.NarrativePlace))

                # Labels
                self.add_literal(place_uri, RDFS.label, row.get('Narrative_Toponym'), lang='it')
                self.add_literal(place_uri, SKOS.altLabel, row.get('Alternative_Toponym'), lang='it')

                # Description & Notes
                self.add_literal(place_uri, DCTERMS.description, row.get('Description'), lang='it')
                self.add_literal(place_uri, RDFS.comment, row.get('Notes'), lang='it')

                # Place Category (vocabolario controllato)
                category = row.get('Place_Category')
                if has_value(category):
                    category_uri = self.map_vocabulary(category, 'place_categories')
                    if category_uri:
                        self.graph.add((place_uri, CHORA.hasPlaceCategory, category_uri))

                # Reality status (vocabolario controllato)
                reality_status = row.get('Reality_Status')
                if has_value(reality_status):
                    status_uri = self.map_vocabulary(reality_status, 'reality_statuses')
                    if status_uri:
                        self.graph.add((place_uri, CHORA.hasRealityStatus, status_uri))

                # Meronimia tra luoghi narrativi
                part_of = row.get('Is_Part_Of')
                if has_value(part_of):
                    parent_uri = self.resolve_lookup(str(part_of).strip(), '@NarrativePlace_ID')
                    if parent_uri:
                        self.graph.add((place_uri, CHORA.isPartOf, parent_uri))

                # Fuzziness level (vocabolario controllato)
                fuzziness = row.get('Fuzziness_Level')
                if has_value(fuzziness):
                    self.add_literal(place_uri, CHORA.hasFuzzinessLevel, float(fuzziness), datatype=XSD.decimal)

            logger.info(f"NarrativePlaces: processati {len(self.id_cache['NarrativePlace_ID'])} luoghi")

        except FileNotFoundError:
            logger.warning(f"File {file_path} non trovato, skip DiscreteNarrativePlaces")
        except Exception as e:
            logger.error(f"Errore processando DiscreteNarrativePlaces: {e}", exc_info=True)

    def process_gazetteer_entities(self, file_path: str):
        """
        Processa GazetteerEntities.tsv

        Schema:
        - GazetteerEntity_ID (chiave primaria)
        - Toponym
        - Alternative_Toponym
        - sameAs (URI esterno - Wikidata, Geonames, etc.)
        - Historical_Location
        - Present_Location
        - Place_Category
        - Latitude
        - Longitude
        - Geometry (GeoJSON)
        - Authority_Source
        """
        logger.info(f"Processando GazetteerEntities da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da GazetteerEntities")

            for idx, row in df.iterrows():
                entity_id = row.get('GazetteerEntity_ID')

                if not has_value(entity_id):
                    logger.warning(f"Riga {idx}: GazetteerEntity_ID mancante, skip")
                    continue

                entity_id = str(entity_id).strip()
                self.id_cache['GazetteerEntity_ID'].add(entity_id)

                # Crea URI
                entity_uri = self.resolve_lookup(entity_id, '@GazetteerEntity_ID')

                # RDF Type
                self.graph.add((entity_uri, RDF.type, CHORA.GazetteerEntity))

                # Labels
                self.add_literal(entity_uri, RDFS.label, row.get('Toponym'), lang='it')
                self.add_literal(entity_uri, SKOS.altLabel, row.get('Alternative_Toponym'), lang='it')

                # Historical & Present Location
                self.add_literal(entity_uri, CHORA.historicalLocation,
                               row.get('Historical_Location'), lang='it')
                self.add_literal(entity_uri, CHORA.presentLocation,
                               row.get('Present_Location'), lang='it')

                # Authority Source
                self.add_literal(entity_uri, DCTERMS.source,
                               row.get('Authority_Source'), datatype=XSD.string)

                # Coordinate WGS84
                latitude = row.get('Latitude')
                if has_value(latitude):
                    self.add_literal(entity_uri, GEO.lat, float(latitude), datatype=XSD.decimal)
                longitude = row.get('Longitude')
                if has_value(longitude):
                    self.add_literal(entity_uri, GEO.long, float(longitude), datatype=XSD.decimal)

                # Place Category
                category = row.get('Place_Category')
                if has_value(category):
                    category_uri = self.map_vocabulary(category, 'place_categories')
                    if category_uri:
                        self.graph.add((entity_uri, CHORA.hasPlaceCategory, category_uri))

                # sameAs (link esterno)
                same_as = row.get('sameAs')
                if has_value(same_as):
                    self.graph.add((entity_uri, OWL.sameAs, URIRef(same_as)))

                # Geometry (GeoSPARQL)
                geom = row.get('Geometry')
                if has_value(geom):
                    self.create_geometry_node(geom, GEOSPARQL.hasGeometry, entity_uri)

            logger.info(f"GazetteerEntities: processate {len(self.id_cache['GazetteerEntity_ID'])} entità")

        except FileNotFoundError:
            logger.warning(f"File {file_path} non trovato, skip GazetteerEntities")
        except Exception as e:
            logger.error(f"Errore processando GazetteerEntities: {e}", exc_info=True)

    def process_references(self, file_path: str):
        """
        Processa References.tsv (PlaceReference - livello attestativo)

        Colonne critiche:
        - Reference_ID (chiave primaria)
        - Surface_Toponym
        - Chapter_ID
        - LiteraryWork_ID
        - Occurrences
        - Source_Reference
        - Notes
        - Excerpt
        """
        logger.info(f"Processando PlaceReferences da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da References")

            for idx, row in df.iterrows():
                ref_id = row.get('Reference_ID')

                if not has_value(ref_id):
                    logger.warning(f"Riga {idx}: Reference_ID mancante, skip")
                    continue

                ref_id = str(ref_id).strip()
                self.id_cache['Reference_ID'].add(ref_id)

                # Crea URI
                ref_uri = self.resolve_lookup(ref_id, '@Reference_ID')

                # RDF Type
                self.graph.add((ref_uri, RDF.type, CHORA.PlaceReference))

                # Collegamento all'opera letteraria. I dati legacy usano
                # ADELPHI o celle vuote; con un solo LiteraryWork caricato,
                # normalizziamo al Work_ID canonico del file LiteraryWorks.tsv.
                work_uri = self.resolve_work_uri_for_reference(row.get('LiteraryWork_ID'))
                if work_uri:
                    self.graph.add((ref_uri, CHORA.appearsInWork, work_uri))

                # Collegamento a Chapter. I dati legacy usano etichette tipo
                # "[Capitolo I]"; le normalizziamo agli ID canonici cap_01 ecc.
                chapter_uri = self.resolve_chapter_uri_for_reference(row.get('Chapter_ID'))
                if chapter_uri:
                    self.graph.add((ref_uri, CHORA.mentionedInChapter, chapter_uri))

                # Datatype properties
                self.add_literal(ref_uri, CHORA.excerpt, row.get('Excerpt'), lang='it')
                self.add_literal(ref_uri, CHORA.sourceReference,
                               row.get('Source_Reference'), datatype=XSD.string)
                occurrences = row.get('Occurrences')
                if has_value(occurrences):
                    self.add_literal(ref_uri, CHORA.occurrenceCount,
                                   int(occurrences), datatype=XSD.integer)
                self.add_literal(ref_uri, RDFS.comment, row.get('Notes'), lang='it')

            logger.info(f"PlaceReferences: processate {len(self.id_cache['Reference_ID'])} referenze")

        except FileNotFoundError:
            logger.error(f"File {file_path} non trovato - CRITICO per PlaceReferences")
            raise
        except Exception as e:
            logger.error(f"Errore processando PlaceReferences: {e}", exc_info=True)
            raise

    def process_spatial_interpretations(self, file_path: str):
        """
        Processa SpatialInterpretations.tsv (livello interpretativo)


        NUOVO: NarrativeRoute (nuova classe, nuove property). Le righe con
        Narrative_Role == "route" sono righe-tragitto: NON generano
        targetsPlace, generano targetsRoute verso un individuo
        chora:NarrativeRoute (deduplicato via self.routes_seen). Le righe con
        Spatial_Component_Role == "routenode" sono nodi ordinati di un
        tragitto: generano isNodeOfRoute + routeOrder, in aggiunta al normale
        targetsPlace verso il proprio luogo.

        Colonne critiche:
        - Interpretation_ID (chiave primaria)
        - Reference_ID (obbligatorio - link a PlaceReference)
        - Targets_Type (nei dati reali solo "discreteplace", confrontato
          case-insensitive)
        - NarrativePlace_ID (colonna target: il luogo per le righe normali,
          l'ID del tragitto per le righe-route)
        - Anchors_To_Entity_ID
        - Associated_Agent_ID (focalizzatore, v4.1.1: asserito qui)
        - Narrative_Role
        - Spatial_Determination
        - Spatial_Relation_Type (nei dati reali include ancora valori
          "direct"/"null" non ripuliti: esclusi esplicitamente, non passati
          a map_vocabulary)
        - Spatial_Component_Role / Spatial_Component_Of / Spatial_Component_Order
          (v4.1.1: gestione NarrativeRoute, vedi sopra)
        - Confidence
        - Annotator_ID
        - Annotation_Date
        - Annotation_Method
        - Critical_Note
        """
        logger.info(f"Processando SpatialInterpretations da {file_path}")

        try:
            df = pd.read_csv(file_path, sep='\t', encoding='utf-8', dtype=str, keep_default_na=False, na_values=[])
            logger.info(f"Caricate {len(df)} righe da SpatialInterpretations")

            processed = 0

            for idx, row in df.iterrows():
                interp_id = row.get('Interpretation_ID')

                if not has_value(interp_id):
                    # Auto-genera ID se manca ma c'è un Reference_ID valido
                    ref_id = row.get('Reference_ID')
                    if not has_value(ref_id):
                        # Nessun Interpretation_ID né Reference_ID: riga vuota, skip
                        continue
                    interp_id = f"interp_{str(ref_id).strip()}_{idx}"
                    logger.debug(f"Riga {idx}: Interpretation_ID auto-generato: {interp_id}")

                interp_id = str(interp_id).strip()

                # Crea URI
                interp_uri = self.resolve_lookup(interp_id, '@Interpretation_ID')

                # RDF Type (IMPORTANTE: è sia chora:SpatialInterpretation che prov:Entity)
                self.graph.add((interp_uri, RDF.type, CHORA.SpatialInterpretation))
                self.graph.add((interp_uri, RDF.type, PROV.Entity))

                # *** OBBLIGATORIO: interpretsReference ***
                ref_id = row.get('Reference_ID')
                if has_value(ref_id):
                    ref_uri = self.resolve_lookup(ref_id, '@Reference_ID')
                    if ref_uri:
                        self.graph.add((interp_uri, CHORA.interpretsReference, ref_uri))
                else:
                    logger.warning(f"Riga {idx}: Interpretation {interp_id} senza Reference_ID, skip")
                    continue

                # *** ROUTE vs PLACE: v4.1.1 introduce chora:NarrativeRoute. Le righe
                # con Narrative_Role == "route" sono righe-tragitto: NON generano
                # targetsPlace, generano targetsRoute verso un individuo
                # chora:NarrativeRoute (creato qui, deduplicato via self.routes_seen). ***
                narrative_role_raw = row.get('Narrative_Role')
                is_route_row = has_value(narrative_role_raw) and str(narrative_role_raw).strip().lower() == 'route'

                # *** TARGET MODEL v4.1.1: chora:targetsPlace verso chora:NarrativePlace,
                # oppure chora:targetsRoute verso chora:NarrativeRoute per le righe-tragitto ***
                target_type = row.get('Targets_Type')
                target_id = row.get('NarrativePlace_ID')

                if is_route_row:
                    if has_value(target_id):
                        route_id = str(target_id).strip()
                        route_uri = URIRef(f"{ID_NS}route/{route_id}")
                        if route_id not in self.routes_seen:
                            self.graph.add((route_uri, RDF.type, CHORA.NarrativeRoute))
                            self.routes_seen.add(route_id)
                        self.graph.add((interp_uri, CHORA.targetsRoute, route_uri))
                    else:
                        logger.warning(f"Riga {idx}: riga-tragitto senza NarrativePlace_ID, skip targetsRoute")
                elif has_value(target_id):

                    if has_value(target_type) and str(target_type).strip().lower() != 'discreteplace':
                        logger.warning(
                            f"Riga {idx}: Targets_Type '{target_type}' inatteso (ignorato: "
                            f"il targeting segue Narrative_Role)"
                        )
                    target_uri = self.resolve_lookup(target_id, '@NarrativePlace_ID')
                    if target_uri:
                        self.graph.add((interp_uri, CHORA.targetsPlace, target_uri))

                # *** NODI DI PERCORSO: v4.1.1, righe con Spatial_Component_Role ==
                # "routenode" (marker/setting che sono anche tappe di un tragitto):
                # dichiarano isNodeOfRoute + routeOrder, in aggiunta al targetsPlace
                # normale sopra. ***
                comp_role = row.get('Spatial_Component_Role')
                if has_value(comp_role) and str(comp_role).strip().lower() == 'routenode':
                    comp_of = row.get('Spatial_Component_Of')
                    comp_order = row.get('Spatial_Component_Order')
                    if has_value(comp_of):
                        node_route_id = str(comp_of).strip()
                        node_route_uri = URIRef(f"{ID_NS}route/{node_route_id}")
                        if node_route_id not in self.routes_seen:
                            self.graph.add((node_route_uri, RDF.type, CHORA.NarrativeRoute))
                            self.routes_seen.add(node_route_id)
                        self.graph.add((interp_uri, CHORA.isNodeOfRoute, node_route_uri))
                    if has_value(comp_order):
                        # I TSV rigenerati da Excel possono riportare gli interi
                        # come "1.0": int() fallirebbe. float() prima di int()
                        # rende la pipeline indipendente dal formato numerico
                        # con cui il foglio e' stato esportato.
                        comp_order_int = int(float(str(comp_order).strip()))
                        self.add_literal(interp_uri, CHORA.routeOrder, comp_order_int, datatype=XSD.integer)

                # *** ASSIGNS properties  ***
                narrative_role = narrative_role_raw
                if has_value(narrative_role):
                    role_uri = self.map_vocabulary(narrative_role, 'narrative_roles')
                    if role_uri:
                        self.graph.add((interp_uri, CHORA.assignsNarrativeRole, role_uri))

                spatial_det = row.get('Spatial_Determination')
                if has_value(spatial_det):
                    det_uri = self.map_vocabulary(spatial_det, 'spatial_determinations')
                    if det_uri:
                        self.graph.add((interp_uri, CHORA.assignsSpatialDetermination, det_uri))

                focalizer_id = row.get('Associated_Agent_ID')
                if has_value(focalizer_id):
                    focalizer_id = str(focalizer_id).strip()
                    focalizer_uri = self.resolve_lookup(focalizer_id, '@Focalizer_ID')
                    if focalizer_uri:
                        if focalizer_id not in self.id_cache['Focalizer_ID']:
                            logger.warning(
                                f"Riga {idx}: focalizzatore '{focalizer_id}' assente da FocalizingAgents.tsv; creato come chora:Character fallback"
                            )
                            self.id_cache['Focalizer_ID'].add(focalizer_id)
                            self.graph.add((focalizer_uri, RDF.type, CHORA.Character))
                            self.graph.add((focalizer_uri, RDF.type, CHORA.FocalizingAgent))
                            self.add_literal(focalizer_uri, CHORA.characterName, focalizer_id, lang='it')
                        self.graph.add((interp_uri, CHORA.hasFocalizer, focalizer_uri))

                # *** ANCHOR MODEL: v4.1.1, anchorsToEntity è l'unica property ***
                # Alcune celle contengono più ID separati da "|" (es.
                # "gaz_monte_manno | gaz_palestrina"): un anchorsToEntity
                # per ciascun ID, invece di un unico URI malformato.
                anchor_entity = row.get('Anchors_To_Entity_ID')
                if has_value(anchor_entity):
                    for single_id in str(anchor_entity).split('|'):
                        single_id = single_id.strip()
                        if not single_id:
                            continue
                        entity_uri = self.resolve_lookup(single_id, '@GazetteerEntity_ID')
                        if entity_uri:
                            self.graph.add((interp_uri, CHORA.anchorsToEntity, entity_uri))

                # Spatial Relation Type
                spatial_rel = row.get('Spatial_Relation_Type')
                if has_value(spatial_rel) and str(spatial_rel).strip().lower() not in ('direct', 'null', ''):
                    rel_uri = self.map_vocabulary(spatial_rel, 'spatial_relations')
                    if rel_uri:
                        self.graph.add((interp_uri, CHORA.assignsSpatialRelationType, rel_uri))

                # *** PROVENANCE (PROV-O) ***
                annotator = row.get('Annotator_ID')
                if has_value(annotator):
                    # Crea URI annotatore
                    annotator_uri = URIRef(f"{ID_NS}annotator/{annotator}")
                    self.graph.add((interp_uri, PROV.wasAttributedTo, annotator_uri))

                annotation_date = row.get('Annotation_Date')
                if has_value(annotation_date):
                    try:
                        # Converti in ISO datetime
                        date_value = pd.to_datetime(annotation_date).isoformat()
                        self.graph.add((interp_uri, PROV.generatedAtTime,
                                      Literal(date_value, datatype=XSD.dateTime)))
                    except Exception as e:
                        logger.warning(f"Riga {idx}: Data '{annotation_date}' non valida: {e}")

                # Datatype properties
                self.add_literal(interp_uri, CHORA.interpretationType,
                               row.get('Interpretation_Type'), datatype=XSD.string)
                confidence = row.get('Confidence')
                if has_value(confidence):
                    self.add_literal(interp_uri, CHORA.confidence, float(confidence), datatype=XSD.decimal)
                self.add_literal(interp_uri, CHORA.annotationMethod,
                               row.get('Annotation_Method'), datatype=XSD.string)
                # NOTA: 'Evidence_Source' non esiste come header nel file reale
                # (vedi docstring: probabile colonna "Unnamed: 18" con header
                # rotto). Lasciato per compatibilità: no-op finché la colonna
                # sorgente non viene corretta.
                self.add_literal(interp_uri, CHORA.evidenceSource,
                               row.get('Evidence_Source'), lang='it')
                self.add_literal(interp_uri, CHORA.criticalNote,
                               row.get('Critical_Note'), lang='it')

                processed += 1

            logger.info(f"SpatialInterpretations: processate {processed} interpretazioni")

        except FileNotFoundError:
            logger.error(f"File {file_path} non trovato - CRITICO per SpatialInterpretations")
            raise
        except Exception as e:
            logger.error(f"Errore processando SpatialInterpretations: {e}", exc_info=True)
            raise

    # ============================================================
    # VALIDATORI
    # ============================================================

    def validate_interpretation_targets(self):
        """
        Valida che ogni SpatialInterpretation abbia almeno un target.

        """
        logger.info("Validazione: target obbligatori SpatialInterpretation")

        query = """
        PREFIX chora: <https://w3id.org/chora#>

        SELECT ?interp WHERE {
            ?interp a chora:SpatialInterpretation .
            FILTER NOT EXISTS { ?interp chora:targetsPlace ?t }
            FILTER NOT EXISTS { ?interp chora:targetsRoute ?r }
        }
        """

        results = self.graph.query(query)
        violations = list(results)

        if violations:
            logger.warning(f"AVVISO: {len(violations)} SpatialInterpretation senza target esplicito")
            # Non è un errore critico - alcune interpretazioni potrebbero avere solo anchor
            return True

        logger.info("✓ Target SpatialInterpretation OK")
        return True

    def validate_references_have_work(self):
        """
        Valida che ogni PlaceReference abbia un LiteraryWork.
        """
        logger.info("Validazione: PlaceReference → LiteraryWork")

        query = """
        PREFIX chora: <https://w3id.org/chora#>

        SELECT ?ref WHERE {
            ?ref a chora:PlaceReference .
            FILTER NOT EXISTS { ?ref chora:appearsInWork ?work }
        }
        """

        results = self.graph.query(query)
        violations = list(results)

        if violations:
            logger.warning(f"AVVISO: {len(violations)} PlaceReference senza LiteraryWork")
            # Log primi 10
            for i, row in enumerate(violations[:10]):
                logger.warning(f"  - {row.ref}")
            if len(violations) > 10:
                logger.warning(f"  ... e altri {len(violations) - 10}")
        else:
            logger.info("✓ PlaceReference → LiteraryWork OK")

        return True

    def validate_typed_work_chapter_focalizer_nodes(self):
        """
        Verifica che Work/Chapter/Focalizer referenziati abbiano rdf:type.
        """
        logger.info("Validazione: Work/Chapter/Focalizer tipizzati")

        query = """
        PREFIX chora: <https://w3id.org/chora#>

        SELECT ?kind ?node WHERE {
            {
                ?ref a chora:PlaceReference ; chora:appearsInWork ?node .
                BIND("work" AS ?kind)
                FILTER NOT EXISTS { ?node a chora:LiteraryWork }
            }
            UNION
            {
                ?ref a chora:PlaceReference ; chora:mentionedInChapter ?node .
                BIND("chapter" AS ?kind)
                FILTER NOT EXISTS { ?node a chora:Chapter }
            }
            UNION
            {
                ?interp a chora:SpatialInterpretation ; chora:hasFocalizer ?node .
                BIND("focalizer" AS ?kind)
                FILTER NOT EXISTS { ?node a chora:Character }
                FILTER NOT EXISTS { ?node a chora:Narrator }
            }
        }
        """

        violations = list(self.graph.query(query))

        if violations:
            logger.warning(f"AVVISO: {len(violations)} IRI work/chapter/focalizer referenziati ma non tipizzati")
            for row in violations[:20]:
                logger.warning(f"  - {row.kind}: {row.node}")
            if len(violations) > 20:
                logger.warning(f"  ... e altri {len(violations) - 20}")
            return False

        logger.info("? Work/Chapter/Focalizer tipizzati OK")
        return True

    def validate_referenced_focalizers_in_source(self):
        """
        Segnala focalizzatori usati da SpatialInterpretations ma assenti da
        FocalizingAgents.tsv.
        """
        logger.info("Validazione: focalizzatori referenziati presenti in FocalizingAgents")

        query = """
        PREFIX chora: <https://w3id.org/chora#>

        SELECT DISTINCT ?focalizer WHERE {
            ?interp a chora:SpatialInterpretation ; chora:hasFocalizer ?focalizer .
        }
        """

        referenced_ids = {
            str(row.focalizer).rstrip('/').split('/')[-1]
            for row in self.graph.query(query)
        }
        missing = sorted(referenced_ids - self.id_cache['Focalizer_ID'])

        if missing:
            logger.warning(f"AVVISO: {len(missing)} focalizzatori referenziati ma assenti da FocalizingAgents.tsv")
            for focalizer_id in missing[:20]:
                logger.warning(f"  - {focalizer_id}")
            if len(missing) > 20:
                logger.warning(f"  ... e altri {len(missing) - 20}")
            return False

        logger.info("? Focalizzatori referenziati presenti in FocalizingAgents OK")
        return True

    # ============================================================
    # PIPELINE ETL
    # ============================================================

    def run(self, output_file: str = "data/gaddatlas.ttl"):
        """
        Esegue pipeline ETL completa.

        Args:
            output_file: Path file output RDF (Turtle)
        """
        logger.info("=" * 60)
        logger.info(f"INIZIO ETL GaddAtlas / CHORA {CHORA_VERSION}")
        logger.info("=" * 60)

        # 0. Verifica che tutti i TSV attesi esistano, PRIMA di iniziare:
        # un file mancante produceva in precedenza solo un log di errore e un
        # grafo parziale silenziosamente incompleto.
        attesi = ["LiteraryWorks", "Chapters", "FocalizingAgents", "NarrativePlaces",
                  "GazetteerEntities", "References", "SpatialInterpretations"]
        mancanti = [n for n in attesi if not (self.data_dir / f"{n}.tsv").is_file()]
        if mancanti:
            raise FileNotFoundError(
                f"TSV mancanti in {self.data_dir.resolve()}: "
                + ", ".join(f"{n}.tsv" for n in mancanti)
            )
        logger.info(f"Input TSV: {self.data_dir.resolve()}")
        logger.info(f"Mapping:   {self.mapping_file.resolve()}")

        # 1. Carica mapping
        self.load_mapping()

        # 2. Processa file: prima le entità anagrafiche e spaziali,
        # poi References e SpatialInterpretations che le referenziano.
        logger.info("\n--- FASE 1: Entità testuali e agenti ---")
        self.process_literary_works(
            self.data_dir / "LiteraryWorks.tsv"
        )
        self.process_chapters(
            self.data_dir / "Chapters.tsv"
        )
        self.process_focalizing_agents(
            self.data_dir / "FocalizingAgents.tsv"
        )

        logger.info("\n--- FASE 2: Entità Spaziali ---")
        self.process_discrete_narrative_places(
            self.data_dir / "NarrativePlaces.tsv"
        )
        self.process_gazetteer_entities(
            self.data_dir / "GazetteerEntities.tsv"
        )

        logger.info("\n--- FASE 3: References (livello attestativo) ---")
        self.process_references(
            self.data_dir / "References.tsv"
        )

        logger.info("\n--- FASE 4: Interpretations (livello interpretativo) ---")
        self.process_spatial_interpretations(
            self.data_dir / "SpatialInterpretations.tsv"
        )

        # 3. Validazione
        logger.info("\n--- FASE 5: Validazione ---")
        all_valid = True
        all_valid &= self.validate_interpretation_targets()
        all_valid &= self.validate_references_have_work()
        all_valid &= self.validate_typed_work_chapter_focalizer_nodes()
        all_valid &= self.validate_referenced_focalizers_in_source()

        if not all_valid:
            logger.warning("⚠️  Alcune validazioni hanno rilevato problemi (vedi sopra)")
        else:
            logger.info("✓ Tutte le validazioni OK")

        # 4. Statistiche
        logger.info("\n--- STATISTICHE RDF ---")
        logger.info(f"Triples totali: {len(self.graph)}")
        logger.info(f"LiteraryWorks: {len(self.id_cache['Work_ID'])}")
        logger.info(f"Chapters: {len(self.id_cache['Chapter_ID'])}")
        logger.info(f"FocalizingAgents: {len(self.id_cache['Focalizer_ID'])}")
        logger.info(f"NarrativePlaces: {len(self.id_cache['NarrativePlace_ID'])}")
        logger.info(f"GazetteerEntities: {len(self.id_cache['GazetteerEntity_ID'])}")
        logger.info(f"PlaceReferences: {len(self.id_cache['Reference_ID'])}")

        # 5. Serializzazione
        logger.info(f"\n--- FASE 6: Serializzazione Turtle ---")
        output_path = Path(output_file)

        try:
            self.graph.serialize(destination=output_path, format='turtle')
            logger.info(f"✓ RDF serializzato in {output_path}")
            logger.info(f"  Dimensione: {output_path.stat().st_size / 1024:.2f} KB")
        except Exception as e:
            logger.error(f"Errore serializzazione: {e}", exc_info=True)
            raise

        logger.info("\n" + "=" * 60)
        logger.info("ETL COMPLETATO CON SUCCESSO")
        logger.info("=" * 60)


# ============================================================
# MAIN
# ============================================================

def main():
    """Entry point script ETL."""
    import argparse

    parser = argparse.ArgumentParser(
        description=f"ETL GaddAtlas / CHORA {CHORA_VERSION} - Conversione TSV → RDF"
    )
    parser.add_argument(
        '--mapping',
        default='data/source/mapping.yaml',
        help='Path al file mapping YAML (default: data/source/mapping.yaml)'
    )
    parser.add_argument(
        '--base-dir',
        default='.',
        help='Directory base (default: .)'
    )
    parser.add_argument(
        '--data-dir',
        default='data/source/tables',
        help='Sottocartella dei 7 TSV, relativa a --base-dir '
             '(default: data/source/tables). '
             'Usare "." se i TSV stanno direttamente in --base-dir.'
    )
    parser.add_argument(
        '--ontology-source',
        default='ontology/chora.rdf',
        help='T-Box CHORA sorgente RDF/XML '
             '(default: ontology/chora.rdf)'
    )
    parser.add_argument(
        '--ontology-output',
        default='ontology/chora.ttl',
        help='Serializzazione Turtle della sola T-Box CHORA '
             '(default: ontology/chora.ttl)'
    )
    parser.add_argument(
        '--tbox',
        nargs='*',
        default=['ontology/shapes/chora-placecategories.ttl'],
        help='File T-Box/vocabolari aggiuntivi da unire al grafo completo '
             '(default: ontology/shapes/chora-placecategories.ttl).'
    )
    parser.add_argument(
        '--output',
        default='data/gaddatlas.ttl',
        help='File output RDF Turtle A-Box (default: data/gaddatlas.ttl)'
    )
    parser.add_argument(
        '--full-output',
        default='data/dist/gaddatlas-full.ttl',
        help='File output completo T-Box+A-Box '
             '(default: data/dist/gaddatlas-full.ttl)'
    )

    args = parser.parse_args()

    # Inizializza ETL
    etl = GaddaETL(
        mapping_file=args.mapping,
        base_dir=args.base_dir,
        data_dir=args.data_dir
    )

    # Esegui pipeline
    try:
        etl.run(output_file=args.output)

        # La T-Box canonica e' mantenuta in RDF/XML da Protege e viene sempre
        # riserializzata in Turtle. Il grafo T-Box+A-Box resta un artefatto
        # distinto, per non mescolare l'ontologia riusabile con il dataset.
        ontology_source = Path(args.ontology_source)
        if not ontology_source.is_file():
            raise FileNotFoundError(
                f"T-Box CHORA non trovata: {ontology_source.resolve()}"
            )

        ontology = Graph()
        ontology.parse(str(ontology_source), format='xml')
        version = ontology.value(CHORA_ONTOLOGY, OWL.versionInfo)
        if str(version) != CHORA_VERSION:
            raise ValueError(
                f"Versione CHORA disallineata: attesa {CHORA_VERSION}, "
                f"trovata {version!s} in {ontology_source}"
            )
        ontology.bind('chora', CHORA, override=True, replace=True)
        ontology_output = Path(args.ontology_output)
        ontology.serialize(destination=ontology_output, format='turtle')
        logger.info(
            f"T-Box CHORA {CHORA_VERSION}: {ontology_output} "
            f"({len(ontology)} triple)"
        )

        # rdflib non segue owl:imports: il file completo incorpora quindi la
        # T-Box, i vocabolari aggiuntivi e l'A-Box.
        merged = Graph()
        for triple in ontology:
            merged.add(triple)
        if args.tbox:
            for tb in args.tbox:
                tb_path = Path(tb)
                if not tb_path.is_file():
                    raise FileNotFoundError(f"T-Box non trovata: {tb_path.resolve()}")
                merged.parse(str(tb_path))
                logger.info(f"T-Box aggiuntiva caricata: {tb_path}")
        merged.parse(args.output, format='turtle')
        merged.bind('chora', CHORA, override=True, replace=True)
        merged.bind('id', 'https://w3id.org/gaddatlas/id/')
        full_path = Path(args.full_output)
        merged.serialize(destination=full_path, format='turtle')
        logger.info(f"Grafo completo T-Box+A-Box: {full_path} ({len(merged)} triple)")

        sys.exit(0)
    except Exception as e:
        logger.error(f"ETL FALLITO: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
