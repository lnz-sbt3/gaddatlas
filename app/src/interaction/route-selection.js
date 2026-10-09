// ===== CELLA: s4ChartRouteSelection =====
// -- CELLA: s4ChartRouteSelection --
// Stato persistente della route selezionata. Isolato da chartS4 per tenere insieme
// gate di interrogabilita', risoluzione referenceId e terrazza sorgente evidenziata.
const s4ChartRouteSelection = (() => {
  function create({getFocalizer, getLodEased, getHostIndex, getHoverTerrace, getRoleSortTarget, roleBands, sequence, routeIdByReferenceId, onReferenceSelect = () => {}}) {
    let id = null;
    let tileIndex = -1;
    let terrace = -1;

    function clear() {
      id = null;
      tileIndex = -1;
      terrace = -1;
    }

    function enabled() {
      // Gate di sola attivazione: la route e' interrogabile solo dove la terrazza
      // e' indirizzabile (roleMode && !lodCollapse). Una selezione gia' stabilita
      // resta invece stato di lettura e non segue zoom, pan o rotazione.
      return getFocalizer() != null && getLodEased() >= 0.5;
    }

    function selectFromTerrace() {
      const hostIndex = getHostIndex();
      const hoverTerrace = getHoverTerrace();
      if (!enabled() || hostIndex < 0 || hoverTerrace < 1) {
        clear();
        return;
      }
      const pos = roleBands.posOfBand(hostIndex, hoverTerrace, getRoleSortTarget() > 0.5);
      const row = pos >= 0 ? sequence[pos] : null;
      if (row) onReferenceSelect(hostIndex, row.referenceId);
      const routeId = row ? routeIdByReferenceId.get(String(row.referenceId || "")) : null;
      id = routeId ?? null;
      tileIndex = routeId ? hostIndex : -1;
      terrace = routeId ? hoverTerrace : -1;
    }

    return {
      clear,
      enabled,
      selectFromTerrace,
      get id() { return id; },
      get tileIndex() { return tileIndex; },
      get terrace() { return terrace; }
    };
  }

  return { create };
})();

export default s4ChartRouteSelection;
