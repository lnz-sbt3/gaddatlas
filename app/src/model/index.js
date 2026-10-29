// Assembla ogni factory una sola volta, secondo il grafo delle dipendenze.
// Chiamare dopo il caricamento del GeoJSON.
import atlasEntities from "./entities.js";
import atlasChapters from "./chapters.js";
import atlasProjection from "./projection-fit.js";
import atlasVoronoi from "./voronoi.js";
import atlasSatellites from "./satellites.js";
import atlasTerrain from "./terrain.js";
import atlasSequence from "./sequence.js";
import atlasNarrativeGeometry from "./narrative-geometry.js";
import atlasRadialLayout from "./radial-layout.js";
import atlasNarrativeCells from "./narrative-cells.js";
import atlasIsoEngine from "../render/iso-engine.js";
import atlasPainters from "../render/painters.js";
import atlasInteraction from "../interaction/hit-test.js";
import atlasAttestedRoutes from "./attested-routes.js";
import atlasRouteNodes from "./route-nodes.js";
import atlasSupport from "./chart-support.js";
import atlasLodPicking from "../render/lod.js";
import atlasProfileLog from "../dev/profile-log.js";

export default function buildModel(gaddaReal) {
  const entities = atlasEntities(gaddaReal);
  const chapters = atlasChapters(gaddaReal, entities);
  const projectionFit = atlasProjection(entities);
  const voronoi = atlasVoronoi(projectionFit, entities);
  const satellites = atlasSatellites(entities, chapters, voronoi);
  const terrain = atlasTerrain(gaddaReal, entities);
  const sequence = atlasSequence(gaddaReal, entities);
  const narrativeGeometry = atlasNarrativeGeometry(entities, voronoi, satellites, chapters);
  const radialLayout = atlasRadialLayout(entities, projectionFit, voronoi, chapters, satellites, narrativeGeometry);
  const narrativeCells = atlasNarrativeCells(entities, voronoi, projectionFit, radialLayout, satellites, narrativeGeometry);
  const isoEngine = atlasIsoEngine(voronoi, narrativeCells);
  const painters = atlasPainters(entities, chapters, voronoi);
  const interaction = atlasInteraction(entities, projectionFit, voronoi, narrativeCells);
  const attestedRoutes = atlasAttestedRoutes(gaddaReal, entities, sequence);
  const routeNodes = atlasRouteNodes(attestedRoutes);

  return {
    atlasEntities: entities,
    atlasChapters: chapters,
    atlasProjection: projectionFit,
    atlasVoronoi: voronoi,
    atlasSatellites: satellites,
    atlasTerrain: terrain,
    atlasSequence: sequence,
    atlasNarrativeGeometry: narrativeGeometry,
    atlasRadialLayout: radialLayout,
    atlasNarrativeCells: narrativeCells,
    atlasIsoEngine: isoEngine,
    atlasPainters: painters,
    atlasInteraction: interaction,
    atlasAttestedRoutes: attestedRoutes,
    atlasRouteNodes: routeNodes,
    atlasSupport,
    atlasLodPicking,
    atlasProfileLog,
  };
}
