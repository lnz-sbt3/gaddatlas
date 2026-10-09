// Assembla il modello dati chiamando ogni factory una volta sola, nell'ordine
// del DAG delle dipendenze -- non l'ordine del notebook, che non e' topologico
// (s4Satellites vi appare prima di s4Voronoi e s4Chapters; s4RadialLayout usa
// s4NarrativeGeometry dichiarato dopo di se' nel file). Va chiamato dopo che
// gadda_real e' arrivato da fetch (vedi main.js/boot()).
import s4Entities from "./entities.js";
import s4Chapters from "./chapters.js";
import s4Projection from "./projection-fit.js";
import s4Voronoi from "./voronoi.js";
import s4Satellites from "./satellites.js";
import s4Terrain from "./terrain.js";
import s4Sequence from "./sequence.js";
import s4NarrativeGeometry from "./narrative-geometry.js";
import s4RadialLayout from "./radial-layout.js";
import s4NarrativeCells from "./narrative-cells.js";
import s4IsoEngine from "../render/iso-engine.js";
import s4Painters from "../render/painters.js";
import s4Interaction from "../interaction/hit-test.js";
import s4AttestedRoutes from "./attested-routes.js";
import s4RouteNodes from "./route-nodes.js";
import s4ChartSupport from "./chart-support.js";
import s4LodPicking from "../render/lod.js";
import s4ProfileLog from "../dev/profile-log.js";

export default function buildModel(gaddaReal) {
  const entities = s4Entities(gaddaReal);
  const chapters = s4Chapters(gaddaReal, entities);
  const projectionFit = s4Projection(entities);
  const voronoi = s4Voronoi(projectionFit, entities);
  const satellites = s4Satellites(entities, chapters, voronoi);
  const terrain = s4Terrain(gaddaReal, entities);
  const sequence = s4Sequence(gaddaReal, entities);
  const narrativeGeometry = s4NarrativeGeometry(entities, voronoi, satellites, chapters);
  const radialLayout = s4RadialLayout(entities, projectionFit, voronoi, chapters, satellites, narrativeGeometry);
  const narrativeCells = s4NarrativeCells(entities, voronoi, projectionFit, radialLayout, satellites, narrativeGeometry);
  const isoEngine = s4IsoEngine(voronoi, narrativeCells);
  const painters = s4Painters(entities, chapters, voronoi);
  const interaction = s4Interaction(entities, projectionFit, voronoi, narrativeCells);
  const attestedRoutes = s4AttestedRoutes(gaddaReal, entities, sequence);
  const routeNodes = s4RouteNodes(attestedRoutes);

  // Chiavi = nomi delle celle nel notebook: chi consuma il modello ritrova
  // gli stessi nomi con cui confrontarsi in _archivio/chartD.js.
  return {
    s4Entities: entities,
    s4Chapters: chapters,
    s4Projection: projectionFit,
    s4Voronoi: voronoi,
    s4Satellites: satellites,
    s4Terrain: terrain,
    s4Sequence: sequence,
    s4NarrativeGeometry: narrativeGeometry,
    s4RadialLayout: radialLayout,
    s4NarrativeCells: narrativeCells,
    s4IsoEngine: isoEngine,
    s4Painters: painters,
    s4Interaction: interaction,
    s4AttestedRoutes: attestedRoutes,
    s4RouteNodes: routeNodes,
    s4ChartSupport,
    s4LodPicking,
    s4ProfileLog,
  };
}
