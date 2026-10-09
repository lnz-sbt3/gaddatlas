// ===== CELLA: s4ChartFrameUi =====
// -- CELLA: s4ChartFrameUi --
// Aggiornamento DOM per-frame dei soli indicatori che cambiano con la molla del rilievo.
const s4ChartFrameUi = (() => {
  function update({reliefBtn, lodLabel, roleButtons, roleFilter, roleOrder, roleColors, diagramOpenedOnce, tiltTarget, focalizer, inkColor, bgColor, cache}) {
    if (reliefBtn) {
      const key = `${diagramOpenedOnce ? 1 : 0}:${tiltTarget > 0 ? 1 : 0}`;
      if (key !== cache.lastReliefButtonKey) {
        cache.lastReliefButtonKey = key;
        const enabled = diagramOpenedOnce;
        reliefBtn.disabled = !enabled;
        reliefBtn.style.opacity = enabled ? "0.72" : "0.45";
        reliefBtn.style.background = tiltTarget > 0 ? inkColor : bgColor;
        reliefBtn.style.color = tiltTarget > 0 ? bgColor : inkColor;
      }
    }
    if (lodLabel) {
      // Con un personaggio la terrazza e' un'occorrenza; altrimenti e' una banda logaritmica.
      const activeRoles = roleOrder.filter((_, i) => roleFilter?.[i]);
      const filteredRoles = roleFilter && activeRoles.length < roleOrder.length;
      const baseText = focalizer != null ? "una terrazza = un'occorrenza" : "una terrazza = banda di occorrenze";
      const nextText = tiltTarget > 0
        ? (filteredRoles ? `${baseText} · filtro: ${activeRoles.join(", ")}` : baseText)
        : "";
      if (nextText !== cache.lastLodLabelText) {
        cache.lastLodLabelText = nextText;
        lodLabel.textContent = nextText;
      }
    }
    if (roleButtons && roleFilter && roleOrder) {
      const key = roleFilter.map(v => v ? 1 : 0).join("");
      if (key !== cache.lastRoleLegendKey) {
        cache.lastRoleLegendKey = key;
        roleButtons.forEach((button, i) => {
          const active = !!roleFilter[i];
          const swatch = button.querySelector("span:first-child");
          const label = button.querySelector("span:last-child");
          if (swatch) swatch.style.background = active ? (roleColors[roleOrder[i]] || inkColor) : "transparent";
          if (label) label.style.opacity = active ? "1" : "0.4";
          button.style.opacity = "1";
          button.style.cursor = "pointer";
        });
      }
    }
  }

  return { update };
})();

export default s4ChartFrameUi;
