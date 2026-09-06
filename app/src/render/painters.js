import * as d3 from "d3";
import s4Config from "../model/config.js";

// ===== CELLA: s4Painters =====
// -- CELLA: s4Painters --
// Fabbrica di primitive pittoriche senza stato di frame: il context e le costanti
// sono dipendenze statiche, mentre scala, rotazione, quote e buffer correnti
// arrivano sempre dal parametro frame costruito in draw().
export default function s4Painters(s4Entities, s4Chapters, s4Voronoi) {
  const {
    BG_COLOR, HUE_RGB, FICT_HUE_RGB, ISO_ALPHA, ISO_WIDTH, ISO_FILL,
    FICT_GLYPH_WIDTH, FICT_RELIEF_ALPHA, FICT_GLYPH_PATHS, FICT_GLYPH_BOX,
    FICT_GLYPH_GAIN, INK_COLOR, ISO_ANGLES, ISO_WOBBLE, ISO_DRIFT,
    ISO_ECC_DAMP, ISO_OUTER, ISO_INNER, ISO_MARGIN, AXON_STACK_ALIGN, TER_SLOPE,
    TER_BANDS_SPAN, AXON_OPAQUE, AXON_SOLID_CAPS, AXON_TREAD_TINT, AXON_WALL_SHADE, AXON_WALL_MIN_LUM,
    AXON_EDGE_TOP, AXON_EDGE_BOT, AXON_EDGE_PICK, CONSTELLATION_RADIUS_GAIN,
    HALO_ALPHA_PEAK, HALO_FALLOFF_GAMMA, HALO_FALLOFF_STOPS, HALO_POOL_OFFSET,
    AXON_MAP_FOOTPRINT_MAX, ROLE_MIX_BASE, ROLE_MIX_TOP
  } = s4Config;
  const { N_GEO, N_INMAP } = s4Entities;
  const { BANDS_MAX } = s4Chapters;
  const { cognitiveTileRadius } = s4Voronoi;
  function hexToRgb(hex) {
    const h = String(hex || "#000000").replace("#", "");
    const v = h.length === 3
      ? h.split("").map(c => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
    return [0, 2, 4].map(o => parseInt(v.slice(o, o + 2), 16) || 0);
  }
  const TER_STEP_FRAC = (ISO_OUTER - ISO_INNER) / TER_BANDS_SPAN;
  // La quota assonometrica deriva da una pendenza globale uniforme.
  const AXON_Z_STEP = TER_SLOPE * TER_STEP_FRAC * d3.median(cognitiveTileRadius.slice(0, N_INMAP));
  const BG_RGB = hexToRgb(BG_COLOR);
  const INK_RGB = hexToRgb(INK_COLOR);

  function makePainters(context) {
    const fictGlyphPath2D = Object.fromEntries(
      Object.entries(FICT_GLYPH_PATHS).map(([k, d]) => [k, new Path2D(d)])
    );

    function zPoint(frame, x, y, z) {
      const dz = (z || 0) / Math.max(0.001, frame.tiltNow);
      return [x - dz * frame.rotSinNow, y - dz * frame.rotCosNow];
    }

    function rgbString(rgb) {
      return `${rgb[0]},${rgb[1]},${rgb[2]}`;
    }

    function shadeRgb(rgb, amount) {
      const f = Math.max(0, Math.min(1, 1 - amount));
      return rgb.map(v => Math.max(0, Math.min(255, Math.round(v * f))));
    }

    function treadRgb(k) {
      return shadeRgb(BG_RGB, AXON_TREAD_TINT * Math.max(0, TER_BANDS_SPAN - k));
    }

    // Il colore codifica il ruolo e la luminosita' la quota.
    const ROLE_RGB = s4Config.ROLE_ORDER.map(r => hexToRgb(s4Config.ROLE_COLORS[r]));
    const ROLE_PLURAL_RGB = hexToRgb(s4Config.ROLE_PLURAL_COLOR);
    function mixRgb(a, b, t) {
      return a.map((v, j) => Math.round(v + (b[j] - v) * t));
    }

    function relLum(rgb) {
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function shadeWall(rgb) {
      const shaded = shadeRgb(rgb, AXON_WALL_SHADE);
      const minLum = AXON_WALL_MIN_LUM * relLum(BG_RGB);
      const lum = relLum(shaded);
      if (lum >= minLum) return shaded;
      const bgLum = relLum(BG_RGB);
      const t = (minLum - lum) / Math.max(0.001, bgLum - lum);
      return mixRgb(shaded, BG_RGB, Math.max(0, Math.min(1, t)));
    }

    function wallRgb(k) {
      return shadeWall(treadRgb(k));
    }
    // La luminosita' e' normalizzata sulla quota assoluta, non sulla singola tessera.
    function roleTreadRgb(idx, k) {
      if (!(idx >= 0) || idx >= ROLE_RGB.length) return treadRgb(k);
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      const mix = ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t;
      return mixRgb(BG_RGB, ROLE_RGB[idx], mix);
    }

    function rolePluralTreadRgb(k) {
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      const mix = ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t;
      return mixRgb(BG_RGB, ROLE_PLURAL_RGB, mix);
    }

    function wallFromTreadRgb(rgb) {
      return shadeWall(rgb);
    }

    function drawGroundHalo(frame, cx, cy, radius, color, strength) {
      if (!(strength > 0.01) || !(radius > 0)) return;
      const rgb = hexToRgb(color || INK_COLOR);
      const ink = rgbString(rgb);
      const r = radius * CONSTELLATION_RADIUS_GAIN;
      // B -- l'estrusione va verso (-rotSin, -rotCos): la pozza scivola
      // sull'opposto, dove nessuna parete la copre. Resta nel piano di terra
      // (nessuna divisione per tiltNow): e' un oggetto steso sul suolo, non
      // una quota. A tilt=0 l'offset si annulla e la pozza torna concentrica.
      const off = radius * HALO_POOL_OFFSET * frame.tiltEased;
      const px = cx + off * frame.rotSinNow;
      const py = cy + off * frame.rotCosNow;
      // A -- plateau fino al bordo VICINO del tassello, poi decadimento gamma.
      const tEdge = Math.max(0.05, Math.min(0.88, (radius - off) / r));
      const a0 = HALO_ALPHA_PEAK * strength;
      const g = context.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${ink},${a0})`);
      g.addColorStop(tEdge, `rgba(${ink},${a0})`);
      for (let s = 1; s <= HALO_FALLOFF_STOPS; s++) {
        const u = s / HALO_FALLOFF_STOPS;
        const a = a0 * Math.pow(1 - u, HALO_FALLOFF_GAMMA);
        g.addColorStop(tEdge + (1 - tEdge) * u, `rgba(${ink},${a})`);
      }
      context.save();
      context.beginPath();
      context.ellipse(px, py, r, r, 0, 0, Math.PI * 2);
      context.fillStyle = g;
      context.fill();
      context.restore();
    }

    function axonZOf(k) {
      return k * AXON_Z_STEP;
    }

    function axonLevelForBand(k, packing) {
      const inner = ISO_OUTER - (ISO_OUTER - ISO_INNER) * packing;
      const target = Math.max(ISO_INNER, ISO_OUTER - (k - 1) * TER_STEP_FRAC);
      const denom = ISO_OUTER - inner;
      if (denom <= 1e-9) return 1;
      return Math.max(0, Math.min(1, (target - inner) / denom));
    }

    function planarLevelForBand(k, B) {
      return B > 0 ? (B - k + 1) / B : 1;
    }

    function mapFootprintRadius(frame, rawR) {
      if (AXON_MAP_FOOTPRINT_MAX == null) return rawR;
      const cap = AXON_MAP_FOOTPRINT_MAX * frame.invK;
      if (!(rawR > cap)) return rawR;
      return cap + (rawR - cap) * frame.crimpEased;
    }

    function axonFootprint(frame, radii, rConst, sCell) {
      if (!radii) {
        const r = mapFootprintRadius(frame, rConst);
        return {radii: null, rMin: r, rMed: r, sCell: 1};
      }
      const out = new Float64Array(radii.length);
      for (let k = 0; k < radii.length; k++) out[k] = mapFootprintRadius(frame, radii[k] * sCell);
      return {radii: out, rMin: Math.min(...out), rMed: d3.median(out), sCell: 1};
    }

    function drawFictGlyph(frame, cx, cy, r, status) {
      const key = FICT_GLYPH_PATHS[status] ? status : "invented";
      const box = FICT_GLYPH_BOX[key];
      const gain = FICT_GLYPH_GAIN[key] ?? 1;
      const s = (r * gain) / box.half;
      context.save();
      context.translate(cx, cy);
      context.scale(s, s);
      context.translate(-box.cx, -box.cy);
      context.setLineDash([]);
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = (FICT_GLYPH_WIDTH * frame.invK) / s;
      context.strokeStyle = INK_COLOR;
      context.stroke(fictGlyphPath2D[key]);
      context.restore();
    }

    function baseContourPts(frame, px, py, r, radii, sCell, rMed, seed, align = 0) {
      const t0 = frame.profile ? performance.now() : 0;
      const aAlign = Math.max(0, Math.min(1, align || 0));
      const p = seed * 6.2831853;
      const d = ISO_DRIFT * 6.2831853 * (1 - aAlign);
      const f1 = p + d, f2 = p*1.7 - d*0.6, f3 = p*2.3 + d*1.4;
      const sf1 = Math.sin(f1), cf1 = Math.cos(f1);
      const sf2 = Math.sin(f2), cf2 = Math.cos(f2);
      const sf3 = Math.sin(f3), cf3 = Math.cos(f3);
      const wobbleAmp = ISO_WOBBLE;
      const pts = Array.from({length: ISO_ANGLES}, (_, k) => {
        const a = (k / ISO_ANGLES) * 6.2831853;
        const ca = Math.cos(a), sa = Math.sin(a);
        const rBound = radii ? radii[k] * sCell : r;
        const rShape = rMed + (rBound - rMed) * ISO_ECC_DAMP;
        const noise = (Math.sin(a*2)*cf1 + Math.cos(a*2)*sf1) * 0.5
                    + (Math.sin(a*3)*cf2 + Math.cos(a*3)*sf2) * 0.32
                    + (Math.sin(a*5)*cf3 + Math.cos(a*5)*sf3) * 0.18;
        let rr = rShape * (1 + noise * wobbleAmp);
        const budget = rBound * ISO_MARGIN;
        if (rr > budget) rr = budget;
        return [px + ca * rr, py + sa * rr];
      });
      if (frame.profile) frame.profile.baseContourMs += performance.now() - t0;
      return pts;
    }

    function fillQuadStrip(frame, a, za, b, zb, rgb, alpha, cullBackfaces = false) {
      const n = Math.min(a.length, b.length);
      if (n < 2 || alpha <= 0) return;
      const buildT0 = frame.profile ? performance.now() : 0;
      const stripPath = new Path2D();
      const area = cullBackfaces ? d3.polygonArea(a) : 0;
      let drawn = 0;
      context.fillStyle = `rgba(${rgb},${alpha})`;
      for (let j = 0; j < n; j++) {
        const j2 = (j + 1) % n;
        if (cullBackfaces) {
          const dx = a[j2][0] - a[j][0], dy = a[j2][1] - a[j][1];
          const nx = area >= 0 ? dy : -dy;
          const ny = area >= 0 ? -dx : dx;
          const screenNy = frame.tiltNow * (nx * frame.rotSinNow + ny * frame.rotCosNow);
          if (screenNy <= 0) continue;
        }
        const aj = zPoint(frame, a[j][0], a[j][1], za);
        const aj2 = zPoint(frame, a[j2][0], a[j2][1], za);
        const bj2 = zPoint(frame, b[j2][0], b[j2][1], zb);
        const bj = zPoint(frame, b[j][0], b[j][1], zb);
        stripPath.moveTo(aj[0], aj[1]);
        stripPath.lineTo(aj2[0], aj2[1]);
        stripPath.lineTo(bj2[0], bj2[1]);
        stripPath.lineTo(bj[0], bj[1]);
        stripPath.closePath();
        drawn++;
      }
      if (!drawn) return;
      if (frame.profile) {
        frame.profile.quadCount += drawn;
        frame.profile.fillLenASum += a.length;
        frame.profile.fillLenBSum += b.length;
        frame.profile.fillLenCalls++;
      }
      const fillT0 = frame.profile ? performance.now() : 0;
      if (frame.profile) frame.profile.fillBuildMs += fillT0 - buildT0;
      context.fill(stripPath);
      if (frame.profile) {
        frame.profile.fillRasterMs += performance.now() - fillT0;
        frame.profile.fillCalls++;
      }
    }

    function addClosedPolygon(path, pts, z, reverse, frame) {
      const n = pts.length;
      if (n < 2) return false;
      const first = reverse ? pts[n - 1] : pts[0];
      const p0 = zPoint(frame, first[0], first[1], z);
      path.moveTo(p0[0], p0[1]);
      for (let j = 1; j < n; j++) {
        const src = reverse ? pts[n - 1 - j] : pts[j];
        const p = zPoint(frame, src[0], src[1], z);
        path.lineTo(p[0], p[1]);
      }
      path.closePath();
      return true;
    }

    function annulusLooksNested(outer, inner) {
      if (!outer || !inner || outer.length < 3 || inner.length < 3) return false;
      for (const p of inner) {
        if (!d3.polygonContains(outer, p)) return false;
      }
      return true;
    }

    function fillNestedBand(frame, outer, inner, z, rgb, alpha) {
      if (!outer || !inner || outer.length < 2 || inner.length < 2 || alpha <= 0) return;
      if (!annulusLooksNested(outer, inner)) {
        if (frame.profile) frame.profile.nestedFallbacks++;
        fillQuadStrip(frame, outer, z, inner, z, rgb, alpha);
        return;
      }
      if (frame.profile) {
        frame.profile.nestedBandCount++;
        frame.profile.fillLenASum += outer.length;
        frame.profile.fillLenBSum += inner.length;
        frame.profile.fillLenCalls++;
      }
      const buildT0 = frame.profile ? performance.now() : 0;
      const bandPath = new Path2D();
      addClosedPolygon(bandPath, outer, z, false, frame);
      addClosedPolygon(bandPath, inner, z, true, frame);
      const fillT0 = frame.profile ? performance.now() : 0;
      if (frame.profile) frame.profile.fillBuildMs += fillT0 - buildT0;
      context.fillStyle = `rgba(${rgb},${alpha})`;
      context.fill(bandPath, "evenodd");
      if (frame.profile) {
        frame.profile.fillRasterMs += performance.now() - fillT0;
        frame.profile.fillCalls++;
      }
    }

    function fillClosedContour(frame, pts, z, rgb, alpha) {
      if (!pts || pts.length < 3 || alpha <= 0) return;
      if (frame.profile) {
        frame.profile.nestedBandCount++;
        frame.profile.fillLenASum += pts.length;
        frame.profile.fillLenBSum += 0;
        frame.profile.fillLenCalls++;
      }
      const buildT0 = frame.profile ? performance.now() : 0;
      const capPath = new Path2D();
      addClosedPolygon(capPath, pts, z, false, frame);
      const fillT0 = frame.profile ? performance.now() : 0;
      if (frame.profile) frame.profile.fillBuildMs += fillT0 - buildT0;
      context.fillStyle = `rgba(${rgb},${alpha})`;
      context.fill(capPath);
      if (frame.profile) {
        frame.profile.fillRasterMs += performance.now() - fillT0;
        frame.profile.fillCalls++;
      }
    }

    function strokePts(frame, strokeGroups, pts, z, rgb, alpha, width = ISO_WIDTH * frame.invK) {
      if (!pts || pts.length < 2) return;
      const t0 = frame.profile ? performance.now() : 0;
      const key = `${rgb}|${alpha}|${width}`;
      let group = strokeGroups.get(key);
      if (!group) {
        group = {rgb, alpha, width, path: new Path2D()};
        strokeGroups.set(key, group);
      }
      const p0 = zPoint(frame, pts[0][0], pts[0][1], z);
      group.path.moveTo(p0[0], p0[1]);
      for (let j = 1; j < pts.length; j++) {
        const p = zPoint(frame, pts[j][0], pts[j][1], z);
        group.path.lineTo(p[0], p[1]);
      }
      group.path.closePath();
      if (frame.profile) frame.profile.strokePtsMs += performance.now() - t0;
    }

    function flushStrokeGroups(frame, strokeGroups) {
      for (const group of strokeGroups.values()) {
        context.lineWidth = group.width;
        context.strokeStyle = `rgba(${group.rgb},${group.alpha})`;
        context.stroke(group.path);
        if (frame.profile) frame.profile.strokeCalls++;
      }
    }

    function drawAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint = null, roleMarks = null) {
      const focalAlpha = frame.contentAlpha ? frame.contentAlpha(i) : (frame.focalEased ? frame.focalEased[i] : 1);
      // In modalita' ruolo il contorno resta neutro: il colore e' gia' sulla terrazza.
      const strokeRgb = (frame.roleMode || !isFict) ? rgbString(INK_RGB) : FICT_HUE_RGB;
      const strokeAlpha = focalAlpha;
      const stackAlign = AXON_STACK_ALIGN * frame.tiltEased;
      const zScale = frame.zScaleDraw;
      const fillAlphaNow = (axonAlpha, planarAlpha) =>
        frame.tiltEased >= 0.999 ? axonAlpha : planarAlpha + (axonAlpha - planarAlpha) * frame.tiltEased;
      const strokeGroups = new Map();
      const footprint = axonFootprint(frame, radii, rMin, sCell);
      const axRadii = footprint.radii, axRMin = footprint.rMin, axRMed = footprint.rMed, axSCell = footprint.sCell;
      const curves = [baseContourPts(frame, px, py, axRMin, axRadii, axSCell, axRMed, seed, stackAlign)];
      for (let k = 1; k <= B; k++) {
        const outPts = [];
        const axonLevel = axonLevelForBand(k, packing);
        const level2D = planarLevelForBand(k, B);
        const level = frame.tiltEased >= 0.999 ? axonLevel : level2D + (axonLevel - level2D) * frame.tiltEased;
        const traceT0 = frame.profile ? performance.now() : 0;
        if (traceIsoline(null, null, px, py, axRadii, axRMin, axSCell, axRMin, axRMed, seed, level, packing, outPts, stackAlign)) {
          curves.push(outPts);
        }
        if (frame.profile) frame.profile.traceMs += performance.now() - traceT0;
      }
      if (frame.stashCurves) frame.stashCurves(i, curves);
      const edgeTopWidth = (bandTint ? AXON_EDGE_TOP : ISO_WIDTH * 0.9) * frame.invK;
      const edgeBotWidth = (bandTint ? AXON_EDGE_BOT : ISO_WIDTH * 0.65) * frame.invK;
      const baseWidth = ISO_WIDTH * 0.9 * frame.invK;
      if (B <= 0) {
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        flushStrokeGroups(frame, strokeGroups);
        return;
      }
      // A basso dettaglio la stratigrafia collassa in una silhouette del ruolo dominante.
      if (frame.lodCollapse && B > 0) {
        const zTop = axonZOf(B) * zScale;
        const tint = bandTint ? bandTint(1, B) : null;
        const tread = tint ? tint[0] : treadRgb(0);
        const wall = tint ? tint[1] : wallRgb(0);
        const collapsedAlpha = fillAlphaNow(focalAlpha, isoFillAlpha(B) * focalAlpha);
        fillQuadStrip(frame, curves[0], 0, curves[0], zTop, rgbString(wall), collapsedAlpha, true);
        fillClosedContour(frame, curves[0], zTop, rgbString(tread), collapsedAlpha);
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        strokePts(frame, strokeGroups, curves[0], zTop, strokeRgb, strokeAlpha, edgeTopWidth);
        flushStrokeGroups(frame, strokeGroups);
        return;
      }
      const solidCaps = AXON_SOLID_CAPS && AXON_OPAQUE && focalAlpha > 0.98;
      if (ISO_FILL && curves.length > 1) {
        const baseRgb = rgbString(shadeRgb(BG_RGB, 0.10));
        const baseAlpha = fillAlphaNow(AXON_OPAQUE ? focalAlpha : isoFillAlpha(1) * focalAlpha, isoFillAlpha(B) * focalAlpha);
        if (solidCaps) fillClosedContour(frame, curves[0], 0, baseRgb, baseAlpha);
        else fillNestedBand(frame, curves[0], curves[1], 0, baseRgb, baseAlpha);
      }
      strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, 0.55 * strokeAlpha, baseWidth);
      for (let k = 1; k < curves.length; k++) {
        const z0 = axonZOf(k - 1) * zScale, z1 = axonZOf(k) * zScale;
        const tint = bandTint ? bandTint(k, B) : null;
        // La terrazza interrogata varia per luminosita' e spessore, non per colore.
        const isPicked = roleMarks && roleMarks.terrace === k;
        let tread = tint ? tint[0] : treadRgb(k);
        let wall = tint ? tint[1] : wallRgb(k);
        if (roleMarks?.isolate) {
          if (!isPicked) {
            tread = mixRgb(tread, BG_RGB, 0.45);
            wall = wallFromTreadRgb(tread);
          }
        } else if (isPicked) {
          tread = mixRgb(tread, BG_RGB, 0.34);
          wall = wallFromTreadRgb(tread);
        }
        const terraceStrokeRgb = strokeRgb;
        const planarAlpha = isoFillAlpha(B - k + 1) * focalAlpha;
        fillQuadStrip(frame, k === 1 ? curves[0] : curves[k], z0, curves[k], z1, rgbString(wall), fillAlphaNow(focalAlpha, planarAlpha), true);
        if (ISO_FILL) {
          const fillAlpha = fillAlphaNow(AXON_OPAQUE ? focalAlpha : isoFillAlpha(k + 1) * focalAlpha, planarAlpha);
          if (solidCaps) {
            fillClosedContour(frame, curves[k], z1, rgbString(tread), fillAlpha);
          } else if (k < curves.length - 1) {
            fillNestedBand(frame, curves[k], curves[k + 1], z1, rgbString(tread), fillAlpha);
          } else {
            fillClosedContour(frame, curves[k], z1, rgbString(tread), fillAlphaNow(AXON_OPAQUE ? focalAlpha : isoFillAlpha(k) * focalAlpha, planarAlpha));
          }
        }
        const wBot = isPicked ? AXON_EDGE_PICK * frame.invK : edgeBotWidth;
        const wTop = isPicked ? AXON_EDGE_PICK * frame.invK : edgeTopWidth;
        const cBot = isPicked ? rgbString(INK_RGB) : terraceStrokeRgb;
        strokePts(frame, strokeGroups, k === 1 ? curves[0] : curves[k], z0, cBot, strokeAlpha, wBot);
        strokePts(frame, strokeGroups, curves[k], z1, cBot, strokeAlpha, wTop);
      }
      flushStrokeGroups(frame, strokeGroups);
      if (roleMarks && roleMarks.isRouteHot && curves.length) {
        const ring = new Path2D();
        addClosedPolygon(ring, curves[0], 0, false, frame);
        context.save();
        context.lineJoin = "round";
        context.globalAlpha = 0.95 * focalAlpha;
        context.lineWidth = 3.2 * frame.invK;
        context.strokeStyle = roleMarks.routeRgb;
        context.shadowColor = roleMarks.routeRgb;
        context.shadowBlur = 16;
        context.stroke(ring);
        const top = new Path2D();
        addClosedPolygon(top, curves[curves.length - 1], axonZOf(curves.length - 1) * zScale, false, frame);
        context.stroke(top);
        context.restore();
      }
    }

    return {
      drawFictGlyph, drawGroundHalo, drawAxonReliefTile, zPoint,
      mixRgb, roleTreadRgb, rolePluralTreadRgb, wallFromTreadRgb,
      axonZOf
    };
  }

  // Le costanti di quota sono condivise con il calcolo del livello di dettaglio.
  return { makePainters, AXON_Z_STEP, TER_STEP_FRAC };
}
