import * as d3 from "d3";
import s4Config from "../model/config.js";

// Fabbrica di primitive pittoriche senza stato di frame: il context e le costanti
// sono dipendenze statiche, mentre scala, rotazione, quote e buffer correnti
// arrivano sempre dal parametro frame costruito in draw().
export default function s4Painters(s4Entities, s4Chapters, s4Voronoi) {
  const {
    BG_COLOR, HUE_RGB, FICT_HUE_RGB, ISO_ALPHA, ISO_WIDTH, ISO_FILL,
    FICT_GLYPH_WIDTH, FICT_RELIEF_ALPHA, FICT_GLYPH_PATHS, FICT_GLYPH_BOX,
    FICT_GLYPH_GAIN, INK_COLOR, GRID_COLOR, ISO_ANGLES, ISO_WOBBLE, ISO_DRIFT,
    ISO_ECC_DAMP, ISO_OUTER, ISO_INNER, ISO_MARGIN, AXON_STACK_ALIGN, TER_SLOPE,
    TER_BANDS_SPAN, AXON_OPAQUE, AXON_SOLID_CAPS, AXON_TREAD_TINT, AXON_WALL_SHADE, AXON_WALL_MIN_LUM,
    AXON_EDGE_TOP, AXON_EDGE_BOT, AXON_EDGE_PICK, CONSTELLATION_RADIUS_GAIN,
    HALO_ALPHA_PEAK, HALO_FALLOFF_GAMMA, HALO_FALLOFF_STOPS, HALO_POOL_OFFSET,
    AXON_MAP_FOOTPRINT_MAX, ROLE_MIX_BASE, ROLE_MIX_TOP
  } = s4Config;
  const { N_GEO, N_INMAP } = s4Entities;
  const { BANDS_MAX } = s4Chapters;
  const { reliefReferenceRadius } = s4Voronoi;
  function hexToRgb(hex) {
    const h = String(hex || "#000000").replace("#", "");
    const v = h.length === 3
      ? h.split("").map(c => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
    return [0, 2, 4].map(o => parseInt(v.slice(o, o + 2), 16) || 0);
  }
  const TER_STEP_FRAC = (ISO_OUTER - ISO_INNER) / TER_BANDS_SPAN;
  // La quota assonometrica deriva da una pendenza globale uniforme.
  const AXON_Z_STEP = TER_SLOPE * TER_STEP_FRAC * d3.median(reliefReferenceRadius.slice(0, N_INMAP));
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
      // Attenuazione minima della tinta (TERRACE.roleTintScale) perché la carta storica resti percepibile.
      const mix = (ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t) * (s4Config.TERRACE.roleTintScale ?? 1);
      return mixRgb(BG_RGB, ROLE_RGB[idx], mix);
    }

    function rolePluralTreadRgb(k) {
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      const mix = (ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t) * (s4Config.TERRACE.roleTintScale ?? 1);
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

    // Impronta in mappa delle forme 'tumuli' e 'curve': raccolta entro un raggio massimo e arrotondata
    // verso la mediana; pesata da (1 - crimpEased), così nel diagramma resta la sagoma della tessera.
    const REF_RGB_ARR = s4Config.HUE_RGB.split(',').map(Number), FICT_RGB_ARR = s4Config.FICT_HUE_RGB.split(',').map(Number);
    const MAP_MEDIAN_R = d3.median(reliefReferenceRadius.slice(0, N_INMAP));
    function gatherFootprint(frame, radii) {
      const T = s4Config.TERRACE, w = 1 - frame.crimpEased;
      if (!(w > 0) || (T.footprint == null && !T.roundness)) return radii;
      const cap = T.footprint == null ? Infinity : T.footprint * MAP_MEDIAN_R, med = Math.min(cap, d3.median(radii));
      return radii.map(r => { const g = Math.min(r, cap), q = g + (med - g) * (T.roundness || 0); return r + (q - r) * w; });
    }
    function mapFootprintRadius(frame, rawR) {
      if (AXON_MAP_FOOTPRINT_MAX == null) return rawR;
      const cap = AXON_MAP_FOOTPRINT_MAX * frame.invK;
      if (!(rawR > cap)) return rawR;
      return cap + (rawR - cap) * frame.crimpEased;
    }

    const footprintCache=new WeakMap();
    function axonFootprint(frame, radii, rConst, sCell) {
      if (!radii) {
        const r = mapFootprintRadius(frame, rConst);
        return {radii: null, rMin: r, rMed: r, sCell: 1};
      }
      const previous=footprintCache.get(radii);
      if(previous&&previous.sCell===sCell&&previous.crimp===frame.crimpEased&&previous.invK===frame.invK)return previous.value;
      const out = new Float64Array(radii.length);
      for (let k = 0; k < radii.length; k++) out[k] = mapFootprintRadius(frame, radii[k] * sCell);
      const gathered = gatherFootprint(frame, out); if (gathered !== out) out.set(gathered);
      const value={radii: out, rMin: Math.min(...out), rMed: d3.median(out), sCell: 1};
      footprintCache.set(radii,{sCell,crimp:frame.crimpEased,invK:frame.invK,value});
      return value;
    }

    function drawFictGlyph(frame, cx, cy, r, status, inscribe = null) {
      // Nessun ripiego: gli statuti sono validati al caricamento in
      // model/entities.js, quindi uno statuto sconosciuto qui e' un errore.
      if (!FICT_GLYPH_PATHS[status]) throw new Error(`statuto di realtà senza glifo: ${JSON.stringify(status)}`);
      const key = status;
      const box = FICT_GLYPH_BOX[key];
      const gain = FICT_GLYPH_GAIN[key] ?? 1;
      if (inscribe) r = Math.min(r, inscribe.radius / gain);
      const s = (r * gain) / box.half;
      context.save();
      if (inscribe) context.clip(inscribe.clip);
      context.translate(cx, cy);
      context.scale(s, s);
      context.translate(-box.cx, -box.cy);
      context.setLineDash([]);
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = (inscribe ? inscribe.width : FICT_GLYPH_WIDTH * frame.invK) / s;
      context.strokeStyle = INK_COLOR;
      context.stroke(fictGlyphPath2D[key]);
      context.restore();
    }

    // Statuto senza glifo aggiunto: la relazione della tessera con la traccia geografica.
    // ring: vertici della tessera alla quota del segno; host: traccia del luogo reale, già centrata e scalata.
    function drawStatusMark(frame, mode, status, cx, cy, ring, inscribe, host, options) {
      const invented = status !== 'transformed';
      // Invented: nessuna traccia interna; un filo di carta appena dentro il contorno lo ritaglia dal fondo.
      if (invented && mode !== 'sigla') {
        context.save(); if (inscribe) context.clip(inscribe.clip);
        context.lineJoin = "round"; context.setLineDash([]);
        context.lineWidth = options.reservePx; context.strokeStyle = BG_COLOR;
        context.beginPath(); ring.forEach(([x, y], k) => k ? context.lineTo(x, y) : context.moveTo(x, y)); context.closePath(); context.stroke();
        context.restore(); return;
      }
      // Nelle tessere troppo strette due linee non restano distinte: il secondo contorno non si disegna.
      if (mode !== 'sigla' && inscribe && inscribe.radius < options.minInscribedPx) return;
      context.save();
      if (inscribe) context.clip(inscribe.clip);
      context.setLineDash([]);
      context.lineJoin = "round";
      context.lineCap = "round";
      // Stesso peso del filo di cella, tono un poco più scuro: il segno non supera la densità.
      context.lineWidth = options.lineWidth * options.markWeight;
      context.strokeStyle = `rgba(${GRID_COLOR},${options.markAlpha})`;
      context.fillStyle = `rgba(${GRID_COLOR},${options.markAlpha})`;
      const polygon = pts => { context.beginPath(); pts.forEach(([x, y], k) => k ? context.lineTo(x, y) : context.moveTo(x, y)); context.closePath(); context.stroke(); };
      // Secondo contorno parallelo al bordo, a distanza fissa: ogni lato si sposta verso l'interno lungo la sua
      // normale e i vertici sono le intersezioni dei lati spostati (celle convesse).
      const offset = (pts, d) => {
        const n = pts.length, area = pts.reduce((s, p, k) => s + p[0] * pts[(k + 1) % n][1] - pts[(k + 1) % n][0] * p[1], 0), sign = area > 0 ? 1 : -1;
        const lines = pts.map((p, k) => { const q = pts[(k + 1) % n], ex = q[0] - p[0], ey = q[1] - p[1], l = Math.hypot(ex, ey) || 1, nx = -ey / l * sign, ny = ex / l * sign; return [p[0] + nx * d, p[1] + ny * d, ex, ey]; });
        return lines.map((a, k) => {
          const b = lines[(k + n - 1) % n], den = a[2] * b[3] - a[3] * b[2];
          if (Math.abs(den) < 1e-9) return [a[0], a[1]];
          const t = ((b[0] - a[0]) * b[3] - (b[1] - a[1]) * b[2]) / den; return [a[0] + a[2] * t, a[1] + a[3] * t];
        });
      };
      if (mode === 'sigla') {
        // Sigla tonda con alone di carta e corpo minimo: leggibile anche sulle facce grigie del rilievo.
        const size = Math.max((inscribe ? inscribe.radius : 6 * frame.invK) * options.siglaScale * (options.axon ? .7 : 1), options.siglaMinPx);
        context.font = `600 ${size}px "Bodoni Moda", Georgia, serif`;
        context.textAlign = "center"; context.textBaseline = "middle";
        context.lineWidth = size * .22; context.strokeStyle = BG_COLOR; context.strokeText(invented ? "I" : "T", cx, cy + size * 0.04);
        context.fillStyle = INK_COLOR; context.globalAlpha *= .8; context.fillText(invented ? "I" : "T", cx, cy + size * 0.04);
      } else if (mode === 'ricalco' && host) polygon(options.axon ? host.map(([x, y]) => [cx + (x - cx) * .6, cy + (y - cy) * .6]) : host);
      else {
        const radius = inscribe ? inscribe.radius / 0.8 : 8 * frame.invK, d = Math.min(options.offsetPx, radius * .45);
        polygon(options.axon ? ring.map(([x, y]) => [cx + (x - cx) * options.axonInset, cy + (y - cy) * options.axonInset]) : offset(ring, d));
      }
      context.restore();
    }

    function baseContourPts(frame, px, py, r, radii, sCell, rMed, seed, align = 0) {
      const motionGeometry=frame.motionGeometry||(import.meta.env.DEV?frame.devMotion:null);
      if(motionGeometry)return motionGeometry.baseContour(frame,px,py,r,radii,sCell,rMed,seed,align);
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
      const motionGeometry=frame.motionGeometry||(import.meta.env.DEV?frame.devMotion:null);
      if(motionGeometry)return motionGeometry.quadStrip(frame,a,za,b,zb,rgb,alpha,cullBackfaces);
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
      const motionGeometry=frame.motionGeometry||(import.meta.env.DEV?frame.devMotion:null);
      if(motionGeometry)return motionGeometry.closedPolygon(path,pts,z,reverse,frame);
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

    // determination: classe della riga a cui appartiene il contorno, o null. Con strokeGroups.coding ogni
    // sottopercorso resta anche nei punti, per il corridoio e per il ritmo; il path aggregato non cambia.
    function strokePts(frame, strokeGroups, pts, z, rgb, alpha, width = ISO_WIDTH * frame.invK, determination = null) {
      const motionGeometry=frame.motionGeometry||(import.meta.env.DEV?frame.devMotion:null);
      if(motionGeometry){motionGeometry.strokePoints(frame,strokeGroups,pts,z,rgb,alpha,width);if(strokeGroups.coding&&pts&&pts.length>=2)noteSubpath(strokeGroups,strokeGroups.get(`${rgb}|${alpha}|${width}`),pts.map(([x,y])=>zPoint(frame,x,y,z)),determination);return;}
      if (!pts || pts.length < 2) return;
      const t0 = frame.profile ? performance.now() : 0;
      const key = `${rgb}|${alpha}|${width}`;
      let group = strokeGroups.get(key);
      if (!group) {
        group = {rgb, alpha, width, path: new Path2D()};
        strokeGroups.set(key, group);
      }
      const kept = strokeGroups.coding ? [] : null;
      const p0 = zPoint(frame, pts[0][0], pts[0][1], z);
      group.path.moveTo(p0[0], p0[1]);
      if (kept) kept.push(p0);
      for (let j = 1; j < pts.length; j++) {
        const p = zPoint(frame, pts[j][0], pts[j][1], z);
        group.path.lineTo(p[0], p[1]);
        if (kept) kept.push(p);
      }
      group.path.closePath();
      if (kept) noteSubpath(strokeGroups, group, kept, determination);
      if (frame.profile) frame.profile.strokePtsMs += performance.now() - t0;
    }

    function noteSubpath(strokeGroups, group, pts, kind) {
      const dash = kind == null ? null : s4Config.DETERMINATION.dash[kind];
      if (kind != null && !dash) throw new Error(`determinazione non ammessa: ${JSON.stringify(kind)}`);
      const sub = {pts, kind, dash, rgb: group.rgb, alpha: group.alpha};
      (group.subs ??= []).push(sub);
      if (dash) { group.coded = true; strokeGroups.coded.push(sub); }
    }

    // Determinazione: i gruppi di tratti della tessera si tracciano identici, senza clip, così la copertura antialias
    // dei tratti invariati non cambia. Prima dei tratti si copia una volta il fondo; dopo, solo dentro il corridoio
    // dei contorni con classe (mezzo tratto + corridorPx), si rimette il fondo e si ritracciano, nell'ordine dei
    // gruppi, i contorni senza classe. Il ritmo si disegna alla fine. Fuori dal corridoio nessun pixel è toccato.
    let scratch = null;
    function corridorOf(groups) {
      const m = context.getTransform(), {a, b, c, d, e, f} = m;
      const sum = a * a + b * b + c * c + d * d, det = Math.abs(a * d - b * c), root = Math.sqrt(Math.max(0, sum * sum / 4 - det * det));
      const sMin = Math.sqrt(Math.max(1e-12, sum / 2 - root)), sMax = Math.sqrt(sum / 2 + root);
      const column = Math.max(1e-6, Math.min(Math.hypot(a, b), Math.hypot(c, d)));
      // Il margine resta sotto i 2 px per lato del contorno conservativo.
      const margin = Math.min(s4Config.DETERMINATION.corridorPx / sMin, 1.9 / column);
      const W = context.canvas.width, H = context.canvas.height;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, padMax = 0;
      const path = new Path2D();
      // Unione nonzero di quadrilateri con lo stesso verso: il tratto a giunzioni tonde, allargato. Nelle svolte lievi
      // (fino a 30°) il quadrilatero si allunga di half·tan(θ/2), che copre il raccordo restando entro 1,04 half; nelle
      // svolte più strette si aggiunge il disco del vertice.
      const TURN = Math.cos(Math.PI / 6);
      for (const group of groups) {
        if (!group.coded) continue;
        const half = group.width / 2 + margin, pad = half * sMax + 2;
        for (const sub of group.subs) {
          if (!sub.dash) continue;
          const pts = sub.pts, n = pts.length;
          // Un contorno interamente fuori dal canvas non ha pixel da riparare: resta fuori dal corridoio.
          let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity;
          for (const [px, py] of pts) { const X = a * px + c * py + e, Y = b * px + d * py + f; if (X < sx0) sx0 = X; if (X > sx1) sx1 = X; if (Y < sy0) sy0 = Y; if (Y > sy1) sy1 = Y; }
          if (sx1 + pad < 0 || sy1 + pad < 0 || sx0 - pad > W || sy0 - pad > H) continue;
          x0 = Math.min(x0, sx0); y0 = Math.min(y0, sy0); x1 = Math.max(x1, sx1); y1 = Math.max(y1, sy1); padMax = Math.max(padMax, pad);
          const ux = new Float64Array(n), uy = new Float64Array(n), len = new Float64Array(n);
          for (let j = 0; j < n; j++) {
            const [px, py] = pts[j], [qx, qy] = pts[(j + 1) % n], l = Math.hypot(qx - px, qy - py);
            len[j] = l; ux[j] = l > 1e-9 ? (qx - px) / l : 0; uy[j] = l > 1e-9 ? (qy - py) / l : 0;
          }
          // Allungamento al vertice j fra il lato j-1 e il lato j; 0 con il disco, quando la svolta è stretta.
          const reach = j => {
            const i = (j + n - 1) % n, cos = ux[i] * ux[j] + uy[i] * uy[j];
            if (!(len[i] > 1e-9 && len[j] > 1e-9) || cos < TURN) { path.moveTo(pts[j][0] + half, pts[j][1]); path.arc(pts[j][0], pts[j][1], half, 0, 2 * Math.PI); path.closePath(); return 0; }
            return half * Math.sqrt(Math.max(0, (1 - cos) / (1 + cos)));
          };
          const ext = Array.from({length: n}, (_, j) => reach(j));
          for (let j = 0; j < n; j++) {
            if (!(len[j] > 1e-9)) continue;
            const [px, py] = pts[j], [qx, qy] = pts[(j + 1) % n], ep = ext[j], eq = ext[(j + 1) % n];
            const sx = px - ux[j] * ep, sy = py - uy[j] * ep, tx = qx + ux[j] * eq, ty = qy + uy[j] * eq, nx = -uy[j] * half, ny = ux[j] * half;
            path.moveTo(sx + nx, sy + ny); path.lineTo(sx - nx, sy - ny); path.lineTo(tx - nx, ty - ny); path.lineTo(tx + nx, ty + ny); path.closePath();
          }
        }
      }
      const X0 = Math.max(0, Math.floor(x0 - padMax)), Y0 = Math.max(0, Math.floor(y0 - padMax)), X1 = Math.min(W, Math.ceil(x1 + padMax)), Y1 = Math.min(H, Math.ceil(y1 + padMax));
      return X1 > X0 && Y1 > Y0 ? {path, matrix: m, x: X0, y: Y0, w: X1 - X0, h: Y1 - Y0} : null;
    }
    function copyUnder(corridor) {
      scratch ??= document.createElement("canvas");
      if (scratch.width < corridor.w) scratch.width = corridor.w;
      if (scratch.height < corridor.h) scratch.height = corridor.h;
      // Copia fra tele: sul percorso accelerato resta sulla GPU (getImageData la rileggerebbe, molto più lento).
      const s = scratch.getContext("2d");
      s.globalCompositeOperation = "copy";
      s.drawImage(context.canvas, corridor.x, corridor.y, corridor.w, corridor.h, 0, 0, corridor.w, corridor.h);
    }
    function repairCorridor(frame, groups, corridor, paper) {
      const alpha = context.globalAlpha;
      context.save();
      context.clip(corridor.path);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.imageSmoothingEnabled = false;
      context.drawImage(scratch, 0, 0, corridor.w, corridor.h, corridor.x, corridor.y, corridor.w, corridor.h);
      context.setTransform(corridor.matrix);
      context.globalAlpha = alpha;
      for (const group of groups) {
        const rest = group.coded ? new Path2D() : group.path;
        if (group.coded) for (const sub of group.subs) {
          if (sub.dash) continue;
          const pts = sub.pts;
          rest.moveTo(pts[0][0], pts[0][1]);
          for (let j = 1; j < pts.length; j++) rest.lineTo(pts[j][0], pts[j][1]);
          rest.closePath();
        }
        if (paper) {
          context.save(); paper.clip(context); context.globalAlpha *= paper.alpha;
          context.lineWidth = group.width + paper.width; context.strokeStyle = BG_COLOR; context.stroke(group.path);
          context.restore();
        }
        context.lineWidth = group.width;
        context.strokeStyle = `rgba(${group.rgb},${group.alpha})`;
        context.stroke(rest);
      }
      context.restore();
      if (frame.profile) { frame.profile.determinationCopies = (frame.profile.determinationCopies || 0) + 1; frame.profile.determinationPixels = (frame.profile.determinationPixels || 0) + corridor.w * corridor.h; }
    }
    // Ritmo della lettura in px CSS: un contorno per volta, estremità e giunzioni tonde.
    function paintDeterminations(frame, coded) {
      const DET = s4Config.DETERMINATION, devPaint = import.meta.env.DEV ? DET.devPaint : null;
      const m = context.getTransform(), {a, b, c, d, e, f} = m, css = context.canvas.width / parseFloat(context.canvas.style.width);
      context.save();
      context.setTransform(css, 0, 0, css, 0, 0);
      context.lineWidth = DET.width; context.lineCap = "round"; context.lineJoin = "round";
      const W = context.canvas.width / css + 2, H = context.canvas.height / css + 2;
      for (const sub of coded) {
        const points = sub.pts.map(([x, y]) => [(a * x + c * y + e) / css, (b * x + d * y + f) / css]);
        // Fuori dal canvas il ritmo non tocca pixel: non si traccia.
        if (points.every(([x]) => x < -2) || points.every(([x]) => x > W) || points.every(([, y]) => y < -2) || points.every(([, y]) => y > H)) continue;
        context.strokeStyle = `rgba(${sub.rgb},${sub.alpha})`;
        if (devPaint) { devPaint(context, points, sub.kind, DET.mode); continue; }
        context.setLineDash(sub.dash);
        context.beginPath();
        points.forEach(([x, y], j) => j ? context.lineTo(x, y) : context.moveTo(x, y));
        context.closePath();
        context.stroke();
      }
      context.restore();
      if (frame.profile) frame.profile.determinationStrokes = (frame.profile.determinationStrokes || 0) + coded.length;
    }

    function flushStrokeGroups(frame, strokeGroups, reserve = false) {
      const paper = reserve ? frame.historicalReserve : null;
      const corridor = strokeGroups.coded?.length ? corridorOf(strokeGroups.values()) : null;
      if (corridor) { copyUnder(corridor); frame.reapplyTransform?.(); }
      for (const group of strokeGroups.values()) {
        if (paper) {
          // Riserva di carta: sottotratto nel colore di fondo, solo dove la carta storica è visibile.
          context.save();
          paper.clip(context);
          context.globalAlpha *= paper.alpha;
          context.lineWidth = group.width + paper.width;
          context.strokeStyle = BG_COLOR;
          context.stroke(group.path);
          context.restore();
          if (frame.profile) frame.profile.reserveStrokes++;
        }
        context.lineWidth = group.width;
        context.strokeStyle = `rgba(${group.rgb},${group.alpha})`;
        context.stroke(group.path);
        if (frame.profile) frame.profile.strokeCalls++;
      }
      if (corridor) repairCorridor(frame, [...strokeGroups.values()], corridor, paper);
      if (strokeGroups.coded?.length) paintDeterminations(frame, strokeGroups.coded);
    }

    function drawAxonReliefTile(frame,...args) {
      const mix=frame.lodMix;
      if(mix==null)return paintAxonReliefTile(frame,...args);
      const tint=args[13];
      if(mix<1){context.save();context.globalAlpha*=1-mix;const values=args.slice();if(tint?.collapsed)values[13]=tint.collapsed;paintAxonReliefTile({...frame,lodCollapse:true},...values);context.restore();}
      if(mix>0){context.save();context.globalAlpha*=mix;const values=args.slice();if(tint?.full)values[13]=tint.full;paintAxonReliefTile({...frame,lodCollapse:false},...values);context.restore();}
    }
    function paintAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint = null, roleMarks = null) {
      const focalAlpha = frame.contentAlpha ? frame.contentAlpha(i) : (frame.focalEased ? frame.focalEased[i] : 1);
      // In modalita' ruolo il contorno resta neutro: il colore e' gia' sulla terrazza.
      let strokeRgb = (frame.roleMode || !isFict) ? rgbString(INK_RGB) : FICT_HUE_RGB;
      let strokeAlpha = focalAlpha;
      if(frame.motionGeometry||(import.meta.env.DEV&&frame.devMotion)){
        const geometry=frame.motionGeometry||(import.meta.env.DEV?frame.devMotion:null);
        strokeRgb=rgbString(mixRgb(geometry.planarRgb,(frame.roleMode||!isFict)?INK_RGB:geometry.planarRgb,frame.tiltEased));
        strokeAlpha*=geometry.planarStroke+(1-geometry.planarStroke)*frame.tiltEased;
      }
      const stackAlign = AXON_STACK_ALIGN * frame.tiltEased;
      const zScale = frame.zScaleDraw;
      const fillAlphaNow = (axonAlpha, planarAlpha) =>
        ((frame.motionGeometry||(import.meta.env.DEV&&frame.devMotion))?false:frame.tiltEased >= 0.999) ? axonAlpha : planarAlpha + (axonAlpha - planarAlpha) * frame.tiltEased;
      const strokeGroups = new Map();
      // Con un personaggio la terrazza individuale porta la determinazione della sua riga (mai la silhouette LOD).
      const determinationOf = s4Config.DETERMINATION.mode !== "off" && frame.roleMode && !frame.lodCollapse ? roleMarks?.determination : null;
      if (determinationOf) { strokeGroups.coding = true; strokeGroups.coded = []; }
      const footprint = axonFootprint(frame, radii, rMin, sCell);
      const axRadii = footprint.radii, axRMin = footprint.rMin, axRMed = footprint.rMed, axSCell = footprint.sCell;
      const curves = [baseContourPts(frame, px, py, axRMin, axRadii, axSCell, axRMed, seed, stackAlign)];
      for (let k = 1; k <= B; k++) {
        const outPts = [];
        const axonLevel = axonLevelForBand(k, packing);
        const level2D = planarLevelForBand(k, B);
        const level = ((frame.motionGeometry||(import.meta.env.DEV&&frame.devMotion))?false:frame.tiltEased >= 0.999) ? axonLevel : level2D + (axonLevel - level2D) * frame.tiltEased;
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
        flushStrokeGroups(frame, strokeGroups, true);
        return;
      }
      // A basso dettaglio la stratigrafia collassa in una silhouette del ruolo dominante.
      if (frame.lodCollapse && B > 0) {
        const zTop = axonZOf(B) * zScale;
        const tint = bandTint ? bandTint(1, B) : null;
        let tread = tint ? tint[0] : treadRgb(0);
        let wall = tint ? tint[1] : wallRgb(0);
        // Stessa regola della tinta del ruolo anche nella sagoma a basso dettaglio (TERRACE.roleFace).
        const roleFace = s4Config.TERRACE.roleFace, ring = tint && roleFace && roleFace !== 'campitura' ? tint[0] : null;
        if (ring) { tread = mixRgb(tint[0], BG_RGB, .86); if (roleFace === 'anello') wall = wallRgb(0); }
        const collapsedAlpha = fillAlphaNow(focalAlpha, isoFillAlpha(B) * focalAlpha);
        fillQuadStrip(frame, curves[0], 0, curves[0], zTop, rgbString(wall), collapsedAlpha, true);
        fillClosedContour(frame, curves[0], zTop, rgbString(tread), collapsedAlpha);
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        strokePts(frame, strokeGroups, curves[0], zTop, ring ? rgbString(ring) : strokeRgb, strokeAlpha, ring ? (roleFace === 'anello' ? 2.4 : 1.4) * frame.invK : edgeTopWidth);
        flushStrokeGroups(frame, strokeGroups, true);
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
        const terraceStrokeRgb = strokeRgb, style = s4Config.TERRACE;
        // Tinta del ruolo (TERRACE.roleFace): 'campitura' faccia piena; 'alzate' faccia quasi carta,
        // tinta sulle alzate e sul bordo superiore; 'anello' faccia quasi carta e pareti neutre, anello colorato sul bordo.
        let ringRgb = null;
        if (tint && style.roleFace && style.roleFace !== 'campitura') {
          ringRgb = tint[0]; tread = mixRgb(tint[0], BG_RGB, .86);
          if (style.roleFace === 'anello') wall = wallRgb(k);
        }
        // 'carta': fianchi e pedate del colore del fondo (occludono), il disegno è affidato ai fili delle quote.
        if (style.walls === 'carta' && !tint) { tread = BG_RGB; wall = BG_RGB; }
        // 'tinta': il corpo del tumulo prende la tinta della densità del suo insieme, più piena a ogni quota.
        if (style.walls === 'tinta' && !tint) { tread = mixRgb(BG_RGB, isFict ? FICT_RGB_ARR : REF_RGB_ARR, style.tintBase + style.tintStep * k); wall = wallFromTreadRgb(tread); }
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
        // 'cima': solo il bordo della terrazza più alta e la base; 'quote': un filo per quota; 'tutte': tutti i fili.
        const edges = style.edges, lastLevel = k === curves.length - 1;
        // Ritmo della riga della terrazza: la classe sostituisce il contributo continuo dei due contorni.
        const kind = determinationOf ? determinationOf(k) : null;
        if (edges === 'tutte' || isPicked) strokePts(frame, strokeGroups, k === 1 ? curves[0] : curves[k], z0, cBot, strokeAlpha, wBot, kind);
        if (edges !== 'cima' || lastLevel || isPicked) strokePts(frame, strokeGroups, curves[k], z1, cBot, strokeAlpha, edges === 'cima' && !isPicked ? wTop * .8 : wTop, kind);
        if (ringRgb) strokePts(frame, strokeGroups, curves[k], z1, rgbString(ringRgb), strokeAlpha, (style.roleFace === 'anello' ? 2.4 : 1.4) * frame.invK);
      }
      flushStrokeGroups(frame, strokeGroups, true);
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
      drawFictGlyph, drawStatusMark, drawGroundHalo, drawAxonReliefTile, zPoint,
      mixRgb, roleTreadRgb, rolePluralTreadRgb, wallFromTreadRgb,
      axonZOf
    };
  }

  // Le costanti di quota sono condivise con il calcolo del livello di dettaglio.
  return { makePainters, AXON_Z_STEP, TER_STEP_FRAC };
}
