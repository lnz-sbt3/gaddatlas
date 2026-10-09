import * as d3 from "d3";
import s4Config from "./config.js";

// ===== CELLA: s4AttestedRoutes =====
// -- CELLA: s4AttestedRoutes --
// Precalcolo delle route attestate, segmentate per focalizzatore.
export default function s4AttestedRoutes(gadda_real, s4Entities, s4Sequence) {
  const { allDataById } = s4Entities;
  const { sequence, chapterOfCursor } = s4Sequence;
  const sequenceByRefId = new Map(sequence.map(row => [String(row.referenceId || ""), row]));
  const routeRgb = s4Config.ROLE_COLORS.Route;
  const routeSource = gadda_real.paths?.routes || gadda_real.routes || [];
  const aliasTargetById = new Map((s4Config.ALIAS_GROUPS || []).flatMap(g => g.ids.map(id => [id, g.canonical])));

  function tileIndexOf(targetId) {
    return allDataById.get(targetId) ?? allDataById.get(aliasTargetById.get(targetId));
  }

  function routeOrder(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  function globalStepTargetIds(route) {
    if (Array.isArray(route.steps) && route.steps.length) {
      return route.steps
        .slice()
        .sort((a, b) => d3.ascending(Number(a.order) || 0, Number(b.order) || 0))
        .map(step => Array.from(new Set(step.targetIds || [])));
    }
    const byOrder = d3.group(route.nodes || [], d => Number(d.order) || 0);
    return Array.from(byOrder.entries())
      .sort((a, b) => d3.ascending(a[0], b[0]))
      .map(([, nodes]) => Array.from(new Set(nodes.map(n => n.targetId).filter(Boolean))));
  }

  function focalizedSteps(route) {
    const byFocalizer = new Map();
    for (const node of route.nodes || []) {
      const focalizerId = node.focalizerId || (route.focalizerIds?.length === 1 ? route.focalizerIds[0] : null);
      const idx = tileIndexOf(node.targetId);
      if (!focalizerId || idx == null) continue;
      const order = routeOrder(node.order, 0);
      if (!byFocalizer.has(focalizerId)) byFocalizer.set(focalizerId, new Map());
      const byOrder = byFocalizer.get(focalizerId);
      if (!byOrder.has(order)) byOrder.set(order, new Set());
      byOrder.get(order).add(idx);
    }
    const stepsByFocalizer = new Map();
    const stepOrdersByFocalizer = new Map();
    for (const [focalizerId, byOrder] of byFocalizer) {
      const steps = [];
      const orders = [];
      for (const [order, indicesSet] of Array.from(byOrder.entries()).sort((a, b) => d3.ascending(a[0], b[0]))) {
        const indices = Array.from(indicesSet);
        if (!indices.length) continue;
        steps.push([indices[0]]);
        orders.push(order);
      }
      if (steps.length) {
        stepsByFocalizer.set(focalizerId, steps);
        stepOrdersByFocalizer.set(focalizerId, orders);
      }
    }
    return {stepsByFocalizer, stepOrdersByFocalizer};
  }

  const routeIdByReferenceId = new Map();
  const attestedRoutes = routeSource.map(route => {
    const steps = globalStepTargetIds(route)
      .map(ids => Array.from(new Set(ids.map(tileIndexOf).filter(i => i != null))))
      .filter(indices => indices.length);
    // Invariante E5: una route disegnata e' sempre la percorrenza di un solo
    // agente. L'unione di percorrenze non e' un percorso e non va mai resa come
    // polilinea, come le sequenze derivate da pagina non sono movimento.
    const {stepsByFocalizer, stepOrdersByFocalizer} = focalizedSteps(route);
    const routeRefs = new Set([
      ...(route.referenceIds || []),
      ...(route.nodes || []).map(node => node.referenceId).filter(Boolean)
    ].map(String));
    const birthRows = Array.from(routeRefs).map(ref => sequenceByRefId.get(ref)).filter(Boolean);
    const birthPosRoute = birthRows.length ? d3.min(birthRows, d => d.pos) : Infinity;
    const birthChapterRoute = Number.isFinite(birthPosRoute) ? chapterOfCursor(birthPosRoute) : Infinity;
    const id = route.id;
    for (const ref of routeRefs) {
      if (ref) routeIdByReferenceId.set(ref, id);
    }
    return {
      id,
      steps,
      stepsByFocalizer,
      stepOrdersByFocalizer,
      // Il focalizzatore puo' essere dichiarato sulla route o sui singoli nodi.
      focalizerIds: new Set([
        ...(route.focalizerIds || []),
        ...(route.nodes || []).map(n => n.focalizerId).filter(Boolean),
        ...stepsByFocalizer.keys()
      ]),
      birthPos: birthPosRoute,
      birthChapter: birthChapterRoute
    };
  }).filter(route => route.steps.length >= 2 && route.stepsByFocalizer.size);

  // La selezione di una route usa il referenceId univoco della terrazza.
  return { attestedRoutes, routeIdByReferenceId, routeRgb };
}
