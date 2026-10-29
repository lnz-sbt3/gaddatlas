// Overlay diagnostico dei ghost slots; non modifica la geometria principale.
const atlasGhostSlots = (() => {
  function draw({
    context, PROFILE, SHOW_GHOST_SLOTS, crimpEased, chapter,
    ghostSlotsLoggedChapter, ghostSlots, primaryHostOf, fictBirthEased, birthEased,
    contentAlpha, BIRTH_EPSILON, allData, birthChapter,
    cogCenter, cogScaleDyn, displayPts, invK, BORDER_WIDTH, GRID_COLOR,
    style = 'tratteggio', cssUnit = invK, glyph = null, active = null
  }) {
    // Quattro rese (config GHOST.style): 'tratteggio' poligono tratteggiato e collegamento; 'registro'
    // quattro segni d'angolo, nessun tratteggio (nessuna collisione con i ritmi della determinazione); 'riserva'
    // lo spazio in carta chiara con un filo continuo; 'eco' lo spazio porta in eco il glifo di statuto del luogo
    // narrativo, con un filo continuo attenuato. Il collegamento alla tessera principale è a puntini neutri.
    // active: indice del luogo narrativo aperto nel pannello, i cui spazi si rafforzano.
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
        const boost = active === i ? 1.8 : 1;
        context.save();
        const outline = new Path2D();
        polygon.forEach(([x, y], k) => k ? outline.lineTo(x, y) : outline.moveTo(x, y));
        outline.closePath();
        if (style === 'tratteggio') {
          context.setLineDash([2.5 * invK, 3 * invK]);
          context.lineWidth = BORDER_WIDTH * 0.6 * invK * boost;
          context.strokeStyle = `rgba(${GRID_COLOR},${Math.min(1, 0.30 * vis * boost)})`;
          context.stroke(outline);
          context.setLineDash([]);
        } else {
          const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1]);
          const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
          if (style === 'registro') {
            const L = Math.min(5 * cssUnit, (box[2] - box[0]) / 3, (box[3] - box[1]) / 3);
            context.beginPath();
            for (const [x, y, dx, dy] of [[box[0], box[1], 1, 1], [box[2], box[1], -1, 1], [box[0], box[3], 1, -1], [box[2], box[3], -1, -1]]) {
              context.moveTo(x + dx * L, y); context.lineTo(x, y); context.lineTo(x, y + dy * L);
            }
            context.lineWidth = 1.1 * cssUnit * boost; context.strokeStyle = `rgba(${GRID_COLOR},${Math.min(1, .75 * vis * boost)})`; context.stroke();
          } else {
            if (style === 'riserva') { context.fillStyle = `rgba(252,250,244,${.72 * vis})`; context.fill(outline); }
            context.lineWidth = (style === 'riserva' ? .9 : .7) * cssUnit * boost;
            context.strokeStyle = `rgba(${GRID_COLOR},${Math.min(1, (style === 'riserva' ? .55 : .5) * vis * boost)})`; context.stroke(outline);
            if (style === 'eco' && glyph) {
              const path = glyph.paths[glyph.statusOf(i)], gb = glyph.box[glyph.statusOf(i)];
              if (path && gb) {
                const r = Math.min(box[2] - box[0], box[3] - box[1]) * .32, k = r / gb.half;
                context.save(); context.translate(slotPt[0] - gb.cx * k, slotPt[1] - gb.cy * k); context.scale(k, k);
                context.lineWidth = 1 * cssUnit / k; context.strokeStyle = `rgba(${glyph.ink},${Math.min(1, .55 * vis * boost)})`; context.stroke(new Path2D(path));
                context.restore();
              }
            }
          }
        }
        // Collegamento a puntini neutri: una relazione referenziale, non un tragitto.
        context.beginPath();
        context.setLineDash(style === 'tratteggio' ? [2 * invK, 5 * invK] : [.1 * cssUnit, 3.2 * cssUnit]);
        context.lineCap = 'round';
        context.moveTo(slotPt[0], slotPt[1]);
        context.lineTo(displayPts[i][0], displayPts[i][1]);
        context.lineWidth = (style === 'tratteggio' ? 0.5 * invK : 1.3 * cssUnit) * boost;
        context.strokeStyle = `rgba(${GRID_COLOR},${Math.min(1, (style === 'tratteggio' ? 0.24 : .5) * vis * boost)})`;
        context.stroke();
        context.setLineDash([]);
        context.restore();
      }
    }
    return {ghostSlotsLoggedChapter};
  }

  return { draw };
})();

export default atlasGhostSlots;
