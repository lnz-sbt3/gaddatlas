import * as d3 from "d3";
import atlasConfig from "../model/config.js";
import {chaikin} from "./oro-field.js";

// Fabbrica di primitive pittoriche senza stato di frame: il context e le costanti
// sono dipendenze statiche, mentre scala, rotazione, quote e buffer correnti
// arrivano sempre dal parametro frame costruito in draw().
export default function atlasPainters(atlasEntities, atlasChapters, atlasVoronoi) {
  const {
    BG_COLOR, FICT_HUE_RGB, ISO_WIDTH,
    FICT_GLYPH_WIDTH, FICT_GLYPH_PATHS, FICT_GLYPH_BOX,
    FICT_GLYPH_GAIN, INK_COLOR, GRID_COLOR, ISO_ANGLES, ISO_WOBBLE, ISO_DRIFT,
    ISO_ECC_DAMP, ISO_OUTER, ISO_INNER, ISO_MARGIN, AXON_STACK_ALIGN, TER_SLOPE,
    TER_BANDS_SPAN, AXON_TREAD_TINT,
    AXON_EDGE_TOP, AXON_EDGE_PICK, CONSTELLATION_RADIUS_GAIN,
    HALO_ALPHA_PEAK, HALO_FALLOFF_GAMMA, HALO_FALLOFF_STOPS, HALO_POOL_OFFSET,
    ROLE_MIX_BASE, ROLE_MIX_TOP, OROGRAFIA
  } = atlasConfig;
  const { N_GEO, N_INMAP } = atlasEntities;
  const { BANDS_MAX } = atlasChapters;
  const { reliefReferenceRadius } = atlasVoronoi;
  function hexToRgb(hex) {
    const h = String(hex || "#000000").replace("#", "");
    const v = h.length === 3
      ? h.split("").map(c => c + c).join("")
      : h.padEnd(6, "0").slice(0, 6);
    return [0, 2, 4].map(o => parseInt(v.slice(o, o + 2), 16) || 0);
  }
  const TER_STEP_FRAC = (ISO_OUTER - ISO_INNER) / TER_BANDS_SPAN;
  // Riferimento globale per le misure del livello di dettaglio: la quota di un
  // livello su una tessera di raggio mediano cognitivo, a pavimento spento.
  const AXON_Z_STEP = TER_SLOPE * TER_STEP_FRAC * d3.median(reliefReferenceRadius.slice(0, N_INMAP));
  // Quota di un livello per tessera: rapporto·max(raggio dell'impronta, pavimento)/9.
  // Il raggio è nelle unità della figura (scala della vista compresa); il pavimento
  // è in px CSS, convertito con zoom e adattamento, e svanisce verso il diagramma.
  function tileRise(rMedDisplay, k, fitScale, crimpEased) {
    const floorW = OROGRAFIA.pavimentoCSS / Math.max(1e-9, k * (fitScale || 1)) * (1 - (crimpEased || 0));
    return OROGRAFIA.rapporto * Math.max(rMedDisplay || 0, floorW) / TER_BANDS_SPAN;
  }
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
    const ROLE_RGB = atlasConfig.ROLE_ORDER.map(r => hexToRgb(atlasConfig.ROLE_COLORS[r]));
    const ROLE_PLURAL_RGB = hexToRgb(atlasConfig.ROLE_PLURAL_COLOR);
    function mixRgb(a, b, t) {
      return a.map((v, j) => Math.round(v + (b[j] - v) * t));
    }

    // La luminosita' e' normalizzata sulla quota assoluta, non sulla singola tessera.
    function roleTreadRgb(idx, k) {
      if (!(idx >= 0) || idx >= ROLE_RGB.length) return treadRgb(k);
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      // Attenuazione minima della tinta (TERRACE.roleTintScale) perché la carta storica resti percepibile.
      const mix = (ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t) * (atlasConfig.TERRACE.roleTintScale ?? 1);
      return mixRgb(BG_RGB, ROLE_RGB[idx], mix);
    }

    function rolePluralTreadRgb(k) {
      const t = BANDS_MAX <= 1 ? 0 : Math.min(1, Math.max(0, (k - 1) / (BANDS_MAX - 1)));
      const mix = (ROLE_MIX_BASE + (ROLE_MIX_TOP - ROLE_MIX_BASE) * t) * (atlasConfig.TERRACE.roleTintScale ?? 1);
      return mixRgb(BG_RGB, ROLE_PLURAL_RGB, mix);
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
      return capPath;
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
      const dash = kind == null ? null : atlasConfig.DETERMINATION.dash[kind];
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
      const margin = Math.min(atlasConfig.DETERMINATION.corridorPx / sMin, 1.9 / column);
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
      const DET = atlasConfig.DETERMINATION, devPaint = import.meta.env.DEV ? DET.devPaint : null;
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

    // Carta sulla pedata sommitale: consegna al disegno della carta il ritaglio della faccia appena
    // campita, con lo scostamento dell'estrusione e il riquadro della faccia (coordinate della figura),
    // così il frammento proiettato è quello geografico del luogo. Le facce con la tinta del ruolo
    // restano pure: lì la carta sta solo a terra.
    function offerTreadPaper(frame, i, pts, z, capPath, faceAlpha) {
      if (!frame.treadPaper || !capPath || !pts || pts.length < 3) return;
      const off = zPoint(frame, 0, 0, z);
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      frame.treadPaper(i, capPath, [x0 + off[0], y0 + off[1], x1 + off[0], y1 + off[1]], off, faceAlpha);
    }

    function drawAxonReliefTile(frame,...args) {
      const mix=frame.lodMix;
      if(mix==null)return paintAxonReliefTile(frame,...args);
      const tint=args[13];
      if(mix<1){context.save();context.globalAlpha*=1-mix;const values=args.slice();if(tint?.collapsed)values[13]=tint.collapsed;paintAxonReliefTile({...frame,lodCollapse:true},...values);context.restore();}
      if(mix>0){context.save();context.globalAlpha*=mix;const values=args.slice();if(tint?.full)values[13]=tint.full;paintAxonReliefTile({...frame,lodCollapse:false},...values);context.restore();}
    }
    // Resa a plastico inciso: calotte di carta sovrapposte senza pareti, un velo
    // di pendio sotto ogni calotta, un filo d'inchiostro per quota, un'ombra
    // leggera a terra. La sagoma è la tessera (il tetto d'impronta sta nel
    // profilo delle isoipse): le curve viste dall'alto sono i terrazzamenti.
    function paintAxonReliefTile(frame, traceIsoline, isoFillAlpha, i, B, px, py, radii, rMin, sCell, rMed, seed, packing, isFict, bandTint = null, roleMarks = null) {
      const focalAlpha = frame.contentAlpha ? frame.contentAlpha(i) : (frame.focalEased ? frame.focalEased[i] : 1);
      // In modalita' ruolo il contorno resta neutro: il colore e' gia' sulla terrazza.
      let strokeRgb = (frame.roleMode || !isFict) ? rgbString(INK_RGB) : FICT_HUE_RGB;
      let strokeAlpha = focalAlpha;
      const motionGeometry = frame.motionGeometry || (import.meta.env.DEV ? frame.devMotion : null);
      if (motionGeometry) {
        strokeRgb = rgbString(mixRgb(motionGeometry.planarRgb, (frame.roleMode || !isFict) ? INK_RGB : motionGeometry.planarRgb, frame.tiltEased));
        strokeAlpha *= motionGeometry.planarStroke + (1 - motionGeometry.planarStroke) * frame.tiltEased;
      }
      const stackAlign = AXON_STACK_ALIGN * frame.tiltEased;
      // Frazione della quota a regime: chiusura dei tre tempi e del passaggio
      // pianta/rilievo. La scala della vista è già nel raggio dell'impronta.
      const phase = frame.zScaleDraw / Math.max(0.001, frame.zScaleNow);
      const dz = tileRise(rMed, 1 / Math.max(1e-9, frame.invK), frame.fitScale, frame.crimpEased) * phase;
      const fillAlphaNow = (axonAlpha, planarAlpha) =>
        (motionGeometry ? false : frame.tiltEased >= 0.999) ? axonAlpha : planarAlpha + (axonAlpha - planarAlpha) * frame.tiltEased;
      const strokeGroups = new Map();
      // Con un personaggio la terrazza individuale porta la determinazione della sua riga (mai la silhouette LOD).
      const determinationOf = atlasConfig.DETERMINATION.mode !== "off" && frame.roleMode && !frame.lodCollapse ? roleMarks?.determination : null;
      if (determinationOf) { strokeGroups.coding = true; strokeGroups.coded = []; }
      // La smussatura agisce sulla geometria: tratti, determinazione, corridoio
      // e picking lavorano sugli stessi punti del disegno.
      const liscia = pts => OROGRAFIA.smussatura > 0 ? chaikin(pts, OROGRAFIA.smussatura) : pts;
      const curves = [liscia(baseContourPts(frame, px, py, rMin, radii, sCell, rMed, seed, stackAlign))];
      for (let k = 1; k <= B; k++) {
        const outPts = [];
        const axonLevel = axonLevelForBand(k, packing);
        const level2D = planarLevelForBand(k, B);
        const level = (motionGeometry ? false : frame.tiltEased >= 0.999) ? axonLevel : level2D + (axonLevel - level2D) * frame.tiltEased;
        const traceT0 = frame.profile ? performance.now() : 0;
        if (traceIsoline(null, null, px, py, radii, rMin, sCell, rMin, rMed, seed, level, packing, outPts, stackAlign)) {
          curves.push(liscia(outPts));
        }
        if (frame.profile) frame.profile.traceMs += performance.now() - traceT0;
      }
      if (frame.stashCurves) frame.stashCurves(i, curves, dz);
      const filoWidth = Math.max(OROGRAFIA.filoCSS * frame.invK / (frame.fitScale || 1), ISO_WIDTH * frame.invK);
      const baseWidth = ISO_WIDTH * 0.9 * frame.invK;
      const veloRgb = rgbString(shadeRgb(BG_RGB, OROGRAFIA.pendio));
      if (B <= 0) {
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        flushStrokeGroups(frame, strokeGroups, true);
        return;
      }
      // Ombra a terra, sul lato opposto all'estrusione: il monte si stacca dalla
      // carta. Leggermente ristretta, così sul lato in ombra non orla il contorno.
      const shadowAlpha = OROGRAFIA.ombra * focalAlpha * fillAlphaNow(1, 0) * Math.min(1, phase);
      if (shadowAlpha > 0.004) {
        const sx = rMed * 0.12 * frame.rotSinNow, sy = rMed * 0.12 * frame.rotCosNow;
        fillClosedContour(frame, curves[0].map(p => [px + (p[0] - px) * 0.94 + sx, py + (p[1] - py) * 0.94 + sy]), 0, rgbString(INK_RGB), shadowAlpha);
      }
      // A basso dettaglio la stratigrafia collassa in una sintesi a due quote:
      // velo sotto la vetta e calotta sommitale ristretta, senza pareti. Vale
      // nel diagramma, dove i monti sono molti e minuti, e in geografia per i
      // soli monti piccoli sullo schermo: da ~14 px CSS di raggio in su la
      // stratigrafia resta per esteso (i gradini vi si leggono).
      const rMedCss = rMed * (frame.fitScale || 1) / Math.max(1e-9, frame.invK);
      if (frame.lodCollapse && (frame.crimpEased > 0.5 || rMedCss < 14)) {
        const zTop = B * dz;
        const tread = bandTint ? bandTint(1, B) : treadRgb(0);
        const collapsedAlpha = fillAlphaNow(focalAlpha, isoFillAlpha(B) * focalAlpha);
        // Qui il velo resta pieno: è il corpo del monte nella sintesi, e i
        // monti del diagramma sono minuti.
        fillClosedContour(frame, curves[0], Math.max(0, zTop - dz), veloRgb, OROGRAFIA.veloAlpha * collapsedAlpha);
        const topPts = [];
        const capTop = traceIsoline(null, null, px, py, radii, rMin, sCell, rMin, rMed, seed, 0.55, packing, topPts, stackAlign) ? liscia(topPts) : curves[0];
        const collapsedCap = fillClosedContour(frame, capTop, zTop, rgbString(tread), collapsedAlpha);
        const collapsedPaper = bandTint ? (atlasConfig.HISTORICAL.overTint || 0) : 1;
        if (collapsedPaper) offerTreadPaper(frame, i, capTop, zTop, collapsedCap, collapsedAlpha * collapsedPaper);
        strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, strokeAlpha, baseWidth);
        strokePts(frame, strokeGroups, capTop, zTop, strokeRgb, strokeAlpha, bandTint ? AXON_EDGE_TOP * frame.invK : filoWidth);
        flushStrokeGroups(frame, strokeGroups, true);
        return;
      }
      strokePts(frame, strokeGroups, curves[0], 0, strokeRgb, 0.55 * strokeAlpha, baseWidth);
      // Sotto il pixel il filo di quota si dirada: niente accumulo d'inchiostro.
      const edgeFade = Math.min(1, (TER_STEP_FRAC * rMed * (frame.fitScale || 1)) / Math.max(1e-9, 1.2 * frame.invK));
      let topCap = null, topZ = 0, topAlpha = 1, topPaper = 0;
      for (let k = 1; k < curves.length; k++) {
        const z0 = (k - 1) * dz, z1 = k * dz;
        const tint = bandTint ? bandTint(k, B) : null;
        // La terrazza interrogata varia per luminosita' e spessore, non per colore.
        const isPicked = roleMarks && roleMarks.terrace === k;
        let tread = tint || treadRgb(k);
        if (roleMarks?.isolate) {
          if (!isPicked) tread = mixRgb(tread, BG_RGB, 0.45);
        } else if (isPicked) {
          tread = mixRgb(tread, INK_RGB, 0.06);
        }
        const planarAlpha = isoFillAlpha(B - k + 1) * focalAlpha;
        // Velo di pendio: il fianco del gradino, cioè la mezzaluna fra la
        // calotta alla quota inferiore e la stessa calotta sollevata, nel tono
        // ombreggiato della pedata che sostiene. La differenza pari-dispari
        // rasterizza la sola mezzaluna, non l'intera faccia.
        const veloAlphaNow = OROGRAFIA.veloAlpha * fillAlphaNow(focalAlpha, 0);
        if (veloAlphaNow > 0.004) {
          const slopeRgb = tint ? rgbString(shadeRgb(tread, OROGRAFIA.pendio)) : veloRgb;
          const velo = new Path2D();
          addClosedPolygon(velo, curves[k], z0, false, frame);
          addClosedPolygon(velo, curves[k], z1, true, frame);
          context.fillStyle = `rgba(${slopeRgb},${veloAlphaNow})`;
          context.fill(velo, "evenodd");
          if (frame.profile) frame.profile.fillCalls++;
        }
        const capAlpha = fillAlphaNow(focalAlpha, planarAlpha);
        const cap = fillClosedContour(frame, curves[k], z1, rgbString(tread), capAlpha);
        if (k === curves.length - 1) {
          topCap = cap; topZ = z1; topAlpha = capAlpha;
          // La pedata sommitale conserva il proprio ritaglio: porta il frammento di carta del luogo.
          // Sulle facce con la tinta del ruolo la carta entra solo con HISTORICAL.overTint > 0, attenuata.
          topPaper = tint ? (atlasConfig.HISTORICAL.overTint || 0) : 1;
        }
        // Ritmo della riga della terrazza: la classe sostituisce il filo continuo della quota.
        const kind = determinationOf ? determinationOf(k) : null;
        const w = isPicked ? AXON_EDGE_PICK * frame.invK : (tint ? AXON_EDGE_TOP * frame.invK : filoWidth);
        strokePts(frame, strokeGroups, curves[k], z1, isPicked ? rgbString(INK_RGB) : strokeRgb, strokeAlpha * (isPicked ? 1 : edgeFade), w, kind);
      }
      // La carta sale sulla pedata prima dei tratti, che restano incisi sopra di essa.
      if (topPaper && topCap) offerTreadPaper(frame, i, curves[curves.length - 1], topZ, topCap, topAlpha * topPaper);
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
        addClosedPolygon(top, curves[curves.length - 1], (curves.length - 1) * dz, false, frame);
        context.stroke(top);
        context.restore();
      }
    }

    return {
      drawFictGlyph, drawStatusMark, drawGroundHalo, drawAxonReliefTile, zPoint,
      mixRgb, roleTreadRgb, rolePluralTreadRgb, tileRise
    };
  }

  // Le costanti di quota sono condivise con il calcolo del livello di dettaglio.
  return { makePainters, AXON_Z_STEP, TER_STEP_FRAC, tileRise };
}
