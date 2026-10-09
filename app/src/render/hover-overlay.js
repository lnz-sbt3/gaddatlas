// ===== CELLA: s4HoverOverlay =====
  // -- CELLA: s4HoverOverlay --
  const s4HoverOverlay = (() => {
  function draw({
    context, hostIndex, crimpEased, transform, K2, allData, N_GEO,
    birthEased, fictBirthEased, BIRTH_EPSILON, cellRings, cellPoint, displayPts,
    roleMode, occSeq = [], occEased = [], terraceInfo, roleSummary, rotNow, tiltNow, invK, glowWidth, glowBlur, inkColor, bgColor, labelSize
  }) {
    // Il glow usa sempre il ring Voronoi standard, cosi' coincide col tassello.
    if (hostIndex >= 0 && (crimpEased <= 0.01 || birthEased[hostIndex] > BIRTH_EPSILON)) {
      const cr = cellRings[hostIndex];
      if (cr && cr.ring && cr.ring.length >= 3) {
        context.save();
        context.beginPath();
        const p0 = cellPoint(hostIndex, cr.ring[0][0], cr.ring[0][1], true);
        context.moveTo(p0[0], p0[1]);
        for (let j = 1; j < cr.ring.length; j++) {
          const p = cellPoint(hostIndex, cr.ring[j][0], cr.ring[j][1], true);
          context.lineTo(p[0], p[1]);
        }
        context.closePath();
        context.lineWidth = glowWidth * invK;
        context.strokeStyle = inkColor;
        context.shadowColor = inkColor;
        context.shadowBlur = glowBlur;
        context.stroke();
        context.restore();
      }
    }
    if ((crimpEased <= 0.01 || transform.k >= K2) && hostIndex >= 0 && allData[hostIndex] &&
        (crimpEased <= 0.01 || (hostIndex >= N_GEO ? fictBirthEased[hostIndex] : birthEased[hostIndex]) > BIRTH_EPSILON)) {
      const [x, y] = displayPts[hostIndex];
      // L'etichetta descrive la terrazza interrogata e riporta il totale in coda.
      const nMentions = Math.round((roleMode ? occSeq[hostIndex] : occEased[hostIndex]) || 0);
      let hoverLabel = allData[hostIndex].properties.Toponym;
      if (terraceInfo && terraceInfo.band > 0) {
        hoverLabel += ` · occ. ${terraceInfo.band} di ${nMentions}`;
        if (terraceInfo.page != null) hoverLabel += ` · p. ${terraceInfo.page}`;
        if (terraceInfo.role) hoverLabel += ` · ${terraceInfo.role}`;
      } else if (nMentions > 0) {
        const occText = nMentions + " " + (nMentions === 1 ? "occorrenza" : "occorrenze");
        hoverLabel += roleSummary && roleSummary.length ? ` · ${occText} · ${roleSummary.join(", ")}` : ` · ${occText}`;
      }
      // Ogni annotazione testuale resta leggibile in orizzontale: la rotazione
      // disambigua gli addensamenti di montagne, non ruota la lettura.
      context.save();
      context.translate(x, y);
      context.rotate(-rotNow);
      context.scale(1, 1 / Math.max(0.001, tiltNow));
      context.font = `${labelSize * invK}px sans-serif`;
      context.lineJoin = "round";
      context.lineWidth = 3 * invK;
      context.strokeStyle = bgColor;
      context.strokeText(hoverLabel, 6 * invK, -6 * invK);
      context.fillStyle = inkColor;
      context.fillText(hoverLabel, 6 * invK, -6 * invK);
      context.restore();
    }
  }

  return { draw };
})();

export default s4HoverOverlay;
