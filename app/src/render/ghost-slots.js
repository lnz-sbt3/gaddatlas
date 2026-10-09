// ===== CELLA: s4GhostSlotsOverlay =====
// -- CELLA: s4GhostSlotsOverlay --
// Overlay diagnostico dei ghost slots; non modifica la geometria principale.
const s4GhostSlotsOverlay = (() => {
  function draw({
    context, PROFILE, SHOW_GHOST_SLOTS, crimpEased, chapter,
    ghostSlotsLoggedChapter, ghostSlots, primaryHostOf, fictBirthEased, birthEased,
    contentAlpha, BIRTH_EPSILON, allData, birthChapter,
    cogCenter, cogScaleDyn, displayPts, invK, BORDER_WIDTH, GRID_COLOR
  }) {
    if (!(SHOW_GHOST_SLOTS && crimpEased > 0.01)) return {ghostSlotsLoggedChapter};
    if (PROFILE && ghostSlotsLoggedChapter !== chapter) {
      ghostSlotsLoggedChapter = chapter;
      console.table(
        [...ghostSlots.entries()].flatMap(([i, slots]) =>
          slots.map(slot => {
            const slotHost = slot.host;
            const primaryHost = primaryHostOf[i];
            const fictFactor = fictBirthEased[i];
            const slotHostFactor = birthEased[slotHost];
            const primaryHostFactor = primaryHost == null ? 0 : birthEased[primaryHost];
            const crimpFactor = crimpEased;
            return {
              toponimo: allData[i].properties.Toponym,
              hostSlot: slotHost == null ? null : allData[slotHost]?.properties.Toponym,
              hostPrimario: primaryHost == null ? null : allData[primaryHost].properties.Toponym,
              birthChapterHostSlot: slotHost == null ? null : birthChapter[slotHost],
              birthChapterHostPrimario: primaryHost == null ? null : birthChapter[primaryHost],
              fictBirthEased: +fictFactor.toFixed(4),
              slotHostBirthEased: Number.isFinite(slotHostFactor) ? +slotHostFactor.toFixed(4) : slotHostFactor,
              primaryHostBirthEased: Number.isFinite(primaryHostFactor) ? +primaryHostFactor.toFixed(4) : primaryHostFactor,
              crimpEased: +crimpFactor.toFixed(4)
            };
          })
        )
      );
    }
    for (const [i, slots] of ghostSlots) {
      for (const slot of slots) {
        const slotHost = slot.host;
        const primaryHost = primaryHostOf[i];
        const vis = fictBirthEased[i]
          * birthEased[slotHost]
          * (primaryHost == null ? 0 : birthEased[primaryHost])
          * contentAlpha(i, {crimp: true});
        if (!Number.isFinite(vis)) {
          context.setLineDash([]);
          continue;
        }
        if (vis <= BIRTH_EPSILON) {
          context.setLineDash([]);
          continue;
        }
        const polygon = slot.polygon.map(p => [
          cogCenter[0] + p[0] * cogScaleDyn,
          cogCenter[1] + p[1] * cogScaleDyn
        ]);
        const slotPt = [
          cogCenter[0] + slot.pt[0] * cogScaleDyn,
          cogCenter[1] + slot.pt[1] * cogScaleDyn
        ];
        context.save();
        context.beginPath();
        polygon.forEach(([x, y], k) => k ? context.lineTo(x, y) : context.moveTo(x, y));
        context.closePath();
        context.setLineDash([2.5 * invK, 3 * invK]);
        context.lineWidth = BORDER_WIDTH * 0.6 * invK;
        context.strokeStyle = `rgba(${GRID_COLOR},${0.30 * vis})`;
        context.stroke();
        context.setLineDash([]);
        context.beginPath();
        context.setLineDash([2 * invK, 5 * invK]);
        context.moveTo(slotPt[0], slotPt[1]);
        context.lineTo(displayPts[i][0], displayPts[i][1]);
        context.lineWidth = 0.5 * invK;
        context.strokeStyle = `rgba(${GRID_COLOR},${0.24 * vis})`;
        context.stroke();
        context.setLineDash([]);
        context.restore();
      }
    }
    return {ghostSlotsLoggedChapter};
  }

  return { draw };
})();

export default s4GhostSlotsOverlay;
