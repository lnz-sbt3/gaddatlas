// ===== CELLA: s4RouteNodes =====
// -- CELLA: s4RouteNodes --
// Una route compare soltanto quando viene selezionata dall'utente.
export default function s4RouteNodes(s4AttestedRoutes) {
  const { attestedRoutes, routeRgb } = s4AttestedRoutes;

  const routeById = new Map();

  for (const route of attestedRoutes) {
    routeById.set(route.id, route);
  }

  function routeActive(route, {focalizer, seqMode, seqPos, chapter}) {
    if (focalizer == null || !route.focalizerIds.has(focalizer)) return false;
    return seqMode ? route.birthPos <= seqPos : route.birthChapter <= chapter;
  }

  function frameState({selectedRouteId, focalizer, seqMode, seqPos, chapter}) {
    const hot = new Set();
    const routes = [];
    // La rivelazione dipende dalla selezione persistente, non dal LOD: zoom,
    // pan e rotazione sono punto di vista, non uscite dallo stato di lettura.
    if (selectedRouteId == null) return {hot, routes};
    const ctx = {focalizer, seqMode, seqPos, chapter};
    const route = routeById.get(selectedRouteId);
    if (!route || !routeActive(route, ctx)) return {hot, routes};
    const steps = route.stepsByFocalizer.get(focalizer) || [];
    const stepOrders = route.stepOrdersByFocalizer.get(focalizer) || [];
    if (!steps.length) return {hot, routes};
    for (const step of steps) for (const i of step) hot.add(i);
    routes.push({
      id: selectedRouteId,
      focalizerId: focalizer,
      steps,
      stepOrders
    });
    return {hot, routes};
  }

  return { frameState, routeRgb };
}
