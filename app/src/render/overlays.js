import * as d3 from "d3";
import s4Config from "../model/config.js";
import s4RouteHoverDrawing from "./route-hover.js";
import s4HoverOverlay from "./hover-overlay.js";
import s4ProfileLog from "../dev/profile-log.js";

// ===== CELLA: s4ChartOverlays =====
  // -- CELLA: s4ChartOverlays --
  // Disegni di overlay in coda a chartS4.draw(): pulse, punti generatori,
  // righello, polo, route-hover e label hover.
  const s4ChartOverlays = (() => {
  function draw({
    context, PROFILE, profileRulerMs, profileT0, profileFrame,
    crimpEased, transform, K2, chapter, t0, N_INMAP, N_GEO,
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
    formatMetricIsoline
  }) {
    function drawUprightText(text, x, y) {
      context.lineJoin = "round";
      context.lineWidth = 3 * invK;
      context.strokeStyle = BG_COLOR;
      context.strokeText(text, x, y);
      context.fillText(text, x, y);
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
      const pulse = 0.5 + 0.5 * Math.sin((performance.now() - t0) / 380);
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

    if (transform.k >= K2) {
      const r = DOT_RADIUS * invK;
      const dotGroups = new Map();
      for (let i = 0; i < pts.length; i++) {
        if (crimpEased > 0.01 && birthEased[i] <= BIRTH_EPSILON) continue;
        const alpha = alphaBucket(contentAlpha(i));
        if (alpha <= BIRTH_EPSILON) continue;
        const [x, y] = displayPts[i];
        let path = dotGroups.get(alpha);
        if (!path) { path = new Path2D(); dotGroups.set(alpha, path); }
        path.moveTo(x + r, y); path.arc(x, y, r, 0, 2 * Math.PI);
      }
      for (const [alpha, path] of dotGroups) {
        context.fillStyle = alpha >= 0.999 ? `rgb(${HUE_RGB})` : `rgba(${HUE_RGB},${alpha})`;
        context.fill(path);
      }
    }

    const profileRulerT0 = PROFILE ? performance.now() : 0;
    if (crimpEased > 0.01 && metricTicks.length) {
      const rulerX = cogCenter[0];
      const labelX = rulerX + 14 * invK;
      const tickHalf = 5 * invK;
      const maxR = d3.max(metricTicks, d => d.rMetric) * cogScaleDyn;
      const poleName = poleIndex >= 0 ? allData[poleIndex].properties.Toponym : "via Merulana";
      context.save();
      context.globalAlpha = crimpEased;
      withUprightAnnotation(() => {
        context.strokeStyle = `rgba(${GRID_COLOR},${0.55 * crimpEased})`;
        context.lineWidth = 0.7 * invK;
        context.beginPath();
        context.moveTo(rulerX, cogCenter[1]);
        context.lineTo(rulerX, cogCenter[1] - maxR);
        context.stroke();
        context.font = `600 ${10 * invK}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "middle";
        context.fillStyle = INK_COLOR;
        for (const {dKm, rMetric} of metricTicks) {
          const y = cogCenter[1] - rMetric * cogScaleDyn;
          context.strokeStyle = `rgba(${GRID_COLOR},${0.55 * crimpEased})`;
          context.lineWidth = 0.7 * invK;
          context.beginPath();
          context.moveTo(rulerX - tickHalf, y);
          context.lineTo(rulerX + tickHalf, y);
          context.stroke();
          drawUprightText(formatMetricIsoline(dKm), labelX, y);
        }
        context.textBaseline = "bottom";
        drawUprightText(`distanza da ${poleName}`, labelX, cogCenter[1] - maxR - 6 * invK);
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
        context.font = `700 ${LABEL_SIZE * invK}px sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "bottom";
        context.fillStyle = INK_COLOR;
        drawUprightText(allData[poleIndex].properties.Toponym, x + 7 * invK, y - 7 * invK);
      });
      context.restore();
    }

    s4RouteHoverDrawing.drawArcs({
      context, routeStepPoints, routeHoverEased, routeRgb, frame
    });
    s4RouteHoverDrawing.drawJoints({
      context, routeHoverEased, routeRgb, rotNow, tiltNow, invK
    });
    s4RouteHoverDrawing.drawOrdinals({
      context, routeStepPoints, routeHoverEased, rotNow, tiltNow,
      labelSize: LABEL_SIZE, invK, bgColor: BG_COLOR, routeRgb
    });
    s4HoverOverlay.draw({
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
          .map(d => `${d.count} ${s4Config.ROLE_ORDER[d.roleIndex]}`);
      })(),
      rotNow, tiltNow, invK, glowWidth: GLOW_WIDTH, glowBlur: GLOW_BLUR,
      inkColor: INK_COLOR, bgColor: BG_COLOR, labelSize: LABEL_SIZE
    });
    if (PROFILE) {
      profileFrame = s4ProfileLog.chartS4({
        profileFrame, profileTiles, profileCurves, profileFills, profileStrokes,
        profileDisplayMs, profileDrawOrderMs, profileReliefMs, profileBordersMs,
        profileRulerMs, profileTickMs, profileHitMs, seqOccCallsPerSecond, frame, profileT0
      });
    }
    return {profileFrame, profileRulerMs};
  }

  return { draw };
})();

export default s4ChartOverlays;
