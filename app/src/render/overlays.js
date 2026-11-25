import it from "../strings-it.js";
import * as d3 from "d3";
import atlasConfig from "../model/config.js";
import atlasRouteHoverDrawing from "./route-hover.js";
import atlasHoverOverlay from "./hover-overlay.js";
import atlasProfileLog from "../dev/profile-log.js";

  // Disegni di overlay in coda al disegno dell'atlante (createAtlas): pulse, punti generatori,
  // righello, polo, route-hover e label hover.
  const atlasOverlays = (() => {
  const radiusCache = new WeakMap();
  function draw({
    context, PROFILE, profileRulerMs, profileT0, profileFrame, campo,
    crimpEased, transform, K2, chapter, pulse, N_INMAP, N_GEO,
    geoData, allData, pts, displayPts, birthEased, fictBirthEased,
    BIRTH_EPSILON, HUE_RGB, GRID_COLOR, INK_COLOR, BG_COLOR,
    PULSE_R, DOT_RADIUS, LABEL_SIZE, GLOW_WIDTH, GLOW_BLUR,
    invK, contentAlpha, alphaBucket, metricTicks, cogCenter, cogScaleDyn,
    poleIndex, routeStepPoints, routeHoverEased, rotNow, tiltNow, routeRgb,
    roleMode, occSeq, occEased, hostIndex, hoverTerrace, roleBands, roleSortTarget,
    sequence, effRoleName, cellRings, cellPoint, frame,
    profileTiles, profileCurves, profileFills, profileStrokes,
    profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
    profileTickMs, profileHitMs, seqOccCallsPerSecond,
    formatMetricIsoline, cssUnit = invK, paperLever = 0
  }) {
    // Le annotazioni della figura hanno corpo costante in px CSS (cssUnit), qualunque sia il riquadro o lo zoom.
    const {rulerCSS, poleCSS, family} = atlasConfig.ANNOTATION;
    // ink < 1 attenua il solo inchiostro: l'alone di carta resta pieno e continua a staccare il testo dal fondo.
    function drawUprightText(text, x, y, ink = 1) {
      context.lineJoin = "round";
      context.lineWidth = 3 * cssUnit;
      context.strokeStyle = BG_COLOR;
      context.strokeText(text, x, y);
      if (ink < 1) { const alpha = context.globalAlpha; context.globalAlpha = alpha * ink; context.fillText(text, x, y); context.globalAlpha = alpha; }
      else context.fillText(text, x, y);
    }

    function withUprightAnnotation(drawFn) {
      context.save();
      context.translate(cogCenter[0], cogCenter[1]);
      context.rotate(-rotNow);
      context.translate(-cogCenter[0], -cogCenter[1]);
      drawFn();
      context.restore();
    }

    if (crimpEased <= 0.01) {
      const cur = chapter - 1;
      const pulseAlpha = 0.35 + 0.45 * pulse;
      const pulseGroups = new Map();
      for (let i = 0; i < N_INMAP; i++) {
        if ((geoData[i].properties.mentionsByChapter[cur] || 0) <= 0) continue;
        const alpha = alphaBucket(pulseAlpha * contentAlpha(i));
        if (alpha <= BIRTH_EPSILON) continue;
        let path = pulseGroups.get(alpha);
        if (!path) { path = new Path2D(); pulseGroups.set(alpha, path); }
        const [x, y] = displayPts[i];
        const r = (PULSE_R * (0.7 + 0.6 * pulse)) * invK;
        path.moveTo(x + r, y); path.arc(x, y, r, 0, 2 * Math.PI);
      }
      for (const [alpha, path] of pulseGroups) {
        context.fillStyle = `rgba(${HUE_RGB},${alpha})`;
        context.fill(path);
      }
    }

    const profileRulerT0 = PROFILE ? performance.now() : 0;
    if (crimpEased > 0.01 && metricTicks.length) {
      const rulerX = cogCenter[0];
      const labelX = rulerX + 10 * cssUnit;
      const tickHalf = 4 * cssUnit;
      const maxR = d3.max(metricTicks, d => d.rMetric) * cogScaleDyn;
      const poleName = poleIndex >= 0 ? allData[poleIndex].properties.Toponym : it.poleFallback;
      // L'asse segue l'attenuazione delle corone. Le etichette si dispongono dalla più esterna: tace quella che
      // toccherebbe la precedente o il nome del polo. Il titolo fa da seconda riga all'etichetta più esterna,
      // dentro la corona: così non sale mai verso i margini della figura né sotto i testi di cornice.
      const R = atlasConfig.RINGS, visibility = Math.max(0, Math.min(1, R.visibility)), fade = Math.sqrt(visibility);
      const ink = R.labelFloor + (1 - R.labelFloor) * visibility;
      const titleDrop = (rulerCSS / 2 + R.titleGapCSS) * cssUnit, titleClear = titleDrop + (rulerCSS * 1.5 + R.labelGapCSS) * cssUnit;
      const clear = (rulerCSS + R.labelGapCSS) * cssUnit, poleClear = (poleCSS + 7 + rulerCSS / 2 + R.labelGapCSS) * cssUnit;
      context.save();
      context.globalAlpha = crimpEased;
      withUprightAnnotation(() => {
        context.strokeStyle = `rgba(${GRID_COLOR},${0.55 * fade * crimpEased})`;
        context.lineWidth = 0.7 * fade * invK;
        context.beginPath();
        context.moveTo(rulerX, cogCenter[1]);
        context.lineTo(rulerX, cogCenter[1] - maxR);
        context.stroke();
        context.font = `500 ${rulerCSS * cssUnit}px ${family}`;
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillStyle = INK_COLOR;
        // Ingombri delle etichette a 45° sulle corone, nel piano della figura: un'etichetta dell'asse che ne
        // toccherebbe una tace (accade solo con corone molto strette, a figura intera su schermi piccoli).
        const squash = Math.max(.2, tiltNow), gap = R.labelGapCSS * cssUnit;
        const diagonal = R.levels[R.level]?.labels ? metricTicks.map(({dKm, rMetric}) => {
          const d = rMetric * cogScaleDyn * Math.SQRT1_2, x = rulerX + d + 4 * cssUnit;
          return [x, x + context.measureText(formatMetricIsoline(dKm)).width, cogCenter[1] - d, rulerCSS * cssUnit / 2 / squash];
        }) : [];
        const meets = (x0, x1, y, half) => diagonal.some(([a0, a1, b, h]) => x0 < a1 + gap && x1 > a0 - gap && Math.abs(y - b) < half + h + gap);
        let outer = Infinity, titled = 0;
        for (let n = metricTicks.length - 1; n >= 0; n--) {
          const {dKm, rMetric} = metricTicks[n], r = rMetric * cogScaleDyn;
          const y = cogCenter[1] - r;
          context.beginPath();
          context.moveTo(rulerX - tickHalf, y);
          context.lineTo(rulerX + tickHalf, y);
          context.stroke();
          if (outer - r < (titled === 1 ? titleClear : clear) || r < poleClear) continue;
          const label = formatMetricIsoline(dKm);
          if (meets(labelX, labelX + context.measureText(label).width, y, rulerCSS * cssUnit / 2)) continue;
          outer = r;
          drawUprightText(label, labelX, y, ink);
          if (titled++ === 0 && r > poleClear + titleClear) {
            context.textBaseline = "top";
            drawUprightText(it.metricAxisTitle(poleName), labelX, y + titleDrop, ink);
            context.textBaseline = "middle";
          } else if (titled === 1) titled = 2;
        }
      });
      context.restore();
    }
    if (PROFILE) profileRulerMs = performance.now() - profileRulerT0;

    if (crimpEased > 0.01 && poleIndex >= 0 && birthEased[poleIndex] > BIRTH_EPSILON) {
      const [x, y] = displayPts[poleIndex];
      const m = 5 * invK;
      context.save();
      context.globalAlpha = crimpEased;
      withUprightAnnotation(() => {
        context.strokeStyle = INK_COLOR;
        context.lineWidth = 0.8 * invK;
        context.beginPath();
        context.moveTo(x - m, y);
        context.lineTo(x + m, y);
        context.moveTo(x, y - m);
        context.lineTo(x, y + m);
        context.stroke();
        context.font = `600 ${poleCSS * cssUnit}px ${family}`;
        context.textAlign = "left";
        context.textBaseline = "bottom";
        context.fillStyle = INK_COLOR;
        drawUprightText(allData[poleIndex].properties.Toponym, x + 7 * cssUnit, y - 7 * cssUnit);
      });
      context.restore();
    }

    atlasRouteHoverDrawing.drawArcs({
      context, routeStepPoints, routeHoverEased, routeRgb, frame
    });
    atlasRouteHoverDrawing.drawJoints({
      context, routeHoverEased, routeRgb, rotNow, tiltNow, invK
    });
    atlasRouteHoverDrawing.drawOrdinals({
      context, routeStepPoints, routeHoverEased, rotNow, tiltNow,
      labelSize: LABEL_SIZE, invK, bgColor: BG_COLOR, routeRgb
    });
    // Durante la regia di un passaggio l'etichetta di passaggio del puntatore tace: le tessere si muovono sotto di esso.
    if (!frame.transition) atlasHoverOverlay.draw({
      context, hostIndex, crimpEased, transform, K2, allData, N_GEO,
      birthEased, fictBirthEased, BIRTH_EPSILON, cellRings, cellPoint, displayPts,
      roleMode, occSeq, occEased,
      terraceInfo: (() => {
        if (frame.lodCollapse) return null;
        if (!roleMode || hostIndex < 0 || hoverTerrace < 1) return null;
        const pos = roleBands.posOfBand(hostIndex, hoverTerrace, roleSortTarget > 0.5);
        const row = pos >= 0 ? sequence[pos] : null;
        return row ? {band: hoverTerrace, page: row.page, role: effRoleName(row), referenceId: row.referenceId} : null;
      })(),
      roleSummary: (() => {
        if (!frame.lodCollapse || !roleMode || hostIndex < 0 || roleBands.dominantRoleOf[hostIndex] !== -2) return null;
        return roleBands.roleMixOf[hostIndex]
          .map((count, roleIndex) => ({count, roleIndex}))
          .filter(d => d.count > 0)
          .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.roleIndex, b.roleIndex))
          .map(d => `${d.count} ${atlasConfig.ROLE_ORDER[d.roleIndex]}`);
      })(),
      rotNow, tiltNow, invK, glowWidth: GLOW_WIDTH, glowBlur: GLOW_BLUR,
      inkColor: INK_COLOR, bgColor: BG_COLOR, labelSize: LABEL_SIZE
    });
    if (K2 !== Infinity) {
      let radii = radiusCache.get(cellRings);
      if (!radii) {
        radii = cellRings.map(cr => cr?.ring ? Math.max(...cr.ring.map(p => Math.hypot(p[0]-cr.gx,p[1]-cr.gy))) : 0);
        radiusCache.set(cellRings,radii);
      }
      const matrix = context.getTransform();
      const density = context.canvas.width / parseFloat(context.canvas.style.width);
      const cellScale = Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d)) / density;
      const r = atlasConfig.CENTER_MARKER.radiusCSS;
      const inverse = matrix.inverse();
      const dots = [];
      for (let i = 0; i < pts.length; i++) {
        if (crimpEased > 0.01 && birthEased[i] <= BIRTH_EPSILON) continue;
        if (!radii[i] || radii[i]*frame.displayCellScale[i]*cellScale < atlasConfig.CENTER_MARKER.minimumCellRadiusCSS) continue;
        const alpha = alphaBucket(contentAlpha(i));
        if (alpha <= BIRTH_EPSILON) continue;
        const point = matrix.transformPoint(new DOMPoint(...displayPts[i]));
        const x = point.x/density, y = point.y/density;
        const dot = new Path2D(); dot.arc(x*density,y*density,r*density,0,2*Math.PI);
        const path = new Path2D(); path.addPath(dot,inverse);
        // Riserva di carta sotto il marcatore: sugli inchiostri della carta il punto resta leggibile
        // senza aggiungere inchiostro alla figura.
        let halo = null;
        if (paperLever > 0.01) {
          const h = new Path2D(); h.arc(x*density,y*density,r*density*2,0,2*Math.PI);
          halo = new Path2D(); halo.addPath(h,inverse);
        }
        dots.push({alpha,path,halo});
      }
      for (const {alpha,halo} of dots) {
        if (!halo) continue;
        context.fillStyle = `rgba(${BG_COLOR.slice(1).match(/../g).map(v=>parseInt(v,16)).join(',')},${(0.9*Math.min(1,paperLever*1.2)*alpha).toFixed(3)})`;
        context.fill(halo);
      }
      for (const {alpha,path} of dots) {
        context.fillStyle = alpha >= 0.999 ? `rgb(${HUE_RGB})` : `rgba(${HUE_RGB},${alpha})`;
        context.fill(path);
      }
    }

    if (PROFILE) {
      profileFrame = atlasProfileLog.atlas({
        profileFrame, profileTiles, profileCurves, profileFills, profileStrokes,
        profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
        profileRulerMs, profileTickMs, profileHitMs, seqOccCallsPerSecond, frame, profileT0, campo
      });
    }
    return {profileFrame, profileRulerMs};
  }

  return { draw };
})();

export default atlasOverlays;
