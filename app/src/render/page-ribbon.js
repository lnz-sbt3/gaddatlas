import it from "../strings-it.js";
import * as d3 from "d3";

// Registro per pagina delle occorrenze, con filtri, cardinalita' e cursore corrente.
const s4PageRibbon = (() => {
  const NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }
  const coarse = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

  // Lente di pagina: ingrandimento locale sopra la pila di una pagina. Non sposta nulla nel nastro (le distanze
  // fra le pagine restano quelle del testo); porta ogni riga della pagina a un bersaglio pieno (28 px al puntatore,
  // 44 px al tocco), in ordine di testo. Si apre al passaggio, al tocco della pagina e al fuoco da tastiera.
  function lensOf(wrap) {
    if (wrap.__lens) return wrap.__lens;
    const node = document.createElement("div");
    node.className = "ribbon-lens"; node.hidden = true; node.setAttribute("role", "group");
    const title = document.createElement("p"); title.className = "ribbon-lens-title";
    const grid = document.createElement("div"); grid.className = "ribbon-lens-grid";
    node.append(title, grid); wrap.append(node);
    const lens = {node, title, grid, page: null, timer: 0, pinned: false};
    lens.close = () => { clearTimeout(lens.timer); lens.page = null; lens.pinned = false; node.hidden = true; };
    lens.later = () => { clearTimeout(lens.timer); if (!lens.pinned) lens.timer = setTimeout(lens.close, 260); };
    node.addEventListener("pointerenter", () => clearTimeout(lens.timer));
    node.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") lens.later(); });
    wrap.addEventListener("keydown", e => { if (e.key === "Escape" && !node.hidden) { lens.close(); e.stopPropagation(); } });
    document.addEventListener("pointerdown", e => { if (!node.hidden && !wrap.contains(e.target)) lens.close(); }, true);
    wrap.__lens = lens;
    return lens;
  }

  function update({
    pageRibbon, pageRibbonWrap, seqMode, rows, stateKey, chapter, focalizer, seqPos,
    width, inkColor, roleColors, gapMin, blockDelta, seqPage, effRoleName, setSeqPos,
    focalDimAlpha, allData, roleMaskKey, style = 'quadratini', cellRings = null, grain = 'page',
    spacing = 'compressa', pile = 'fissa', lens: lensOn = false, markCSS = 8, minMarkCSS = 6, gapCSS = 2, maxPileCSS = 150
  }) {
    // Quattro forme dei segni (config RIBBON.style), stessi dati e stessi comandi: 'quadratini'; 'tessere'
    // la sagoma ridotta della tessera del luogo citato (cerchio per i luoghi senza sagoma, come nel diagramma);
    // 'densita' una barra per pagina divisa in righe; 'filo' punti infilati su un filo verticale per pagina.
    // Spaziatura (RIBBON.spacing): 'distanza' conserva la distanza fra le pagine del testo; 'compressa'
    // accorcia i vuoti. Pile (RIBBON.pile): 'adattiva' alza il nastro fino alla pila più alta del capitolo.
    if (!pageRibbon) return {stateKey, currentRibbonTick: null};

    // Con un focalizzatore attivo, il resto del corpus rimane visibile ma attenuato.
    const visible = seqMode;
    pageRibbon.style.display = visible ? "block" : "none";
    if (pageRibbonWrap) pageRibbonWrap.style.display = visible ? "block" : "none";
    const lens = pageRibbonWrap && lensOn ? lensOf(pageRibbonWrap) : null;
    if (!visible) { lens?.close(); return {stateKey: "", currentRibbonTick: null}; }

    const filtered = focalizer != null;
    const countRows = filtered ? rows.filter(row => row.agentId === focalizer) : rows;
    const rowsByPage = d3.group(rows, d => seqPage(d));
    const countRowsByPage = d3.group(countRows, d => seqPage(d));
    const pages = Array.from(rowsByPage.keys()).sort(d3.ascending);
    const pageKey = pages.join(",");
    const key = [
      filtered ? "filtered" : "neutral",
      chapter,
      focalizer || "",
      seqPos,
      rows.length,
      countRows.length,
      roleMaskKey || "", style, grain, spacing, pile, lensOn, Math.round(pageRibbon.getBoundingClientRect().width) || width, innerHeight,
      pageKey,
      rows[0]?.pos ?? -1,
      rows[rows.length - 1]?.pos ?? -1
    ].join("|");
    if (key === stateKey) return {stateKey, currentRibbonTick: null, unchanged: true};

    pageRibbon.replaceChildren();
    if (!rows.length) { lens?.close(); return {stateKey: key, currentRibbonTick: null}; }

    // Il nastro si disegna in px CSS: segni rotondi restano rotondi e i bersagli misurano davvero 44 px.
    const W = Math.round(pageRibbon.getBoundingClientRect().width) || width;
    // Margini pari alle frecce del nastro (44 px) più un respiro: nessuna etichetta finisce sotto un comando.
    const margin = {l: 56, r: 56};
    const innerW = W - margin.l - margin.r;
    const pMin = pages[0], pMax = pages[pages.length - 1];
    const linear = spacing === 'distanza';
    // Sagome: con la spaziatura per distanza il passo dei segni viene dai token del nastro.
    const shape = linear ? [markCSS, gapCSS, 0] : ({quadratini: [9, 3, 6], tessere: [10, 2, 6], densita: [4, 1, 14], filo: [6, 3, 7]}[style] || [9, 3, 6]);
    let [tickSize, stackGap, maxTicksPerColumn] = shape;
    const minReadableTickWidth = 5;
    // Sagoma normalizzata della tessera di un luogo (centro e raggio massimo a 1), in cache per indice.
    const shapeCache = new Map();
    // Per distanza la sagoma è a parità d'area (l'area di un cerchio di raggio 1), con il raggio massimo limitato
    // a 1,15: le tessere allungate non diventano schegge e non invadono il segno vicino.
    const tileShape = i => { if (shapeCache.has(i)) return shapeCache.get(i); const cr = cellRings?.[i]; let pts = null;
      if (cr?.ring?.length > 2) { const r = Math.max(...cr.ring.map(([x, y]) => Math.hypot(x - cr.gx, y - cr.gy))) || 1; pts = cr.ring.map(([x, y]) => [(x - cr.gx) / r, (y - cr.gy) / r]);
        if (linear) { const area = Math.abs(d3.polygonArea(pts)) || Math.PI, k = Math.min(1.15, Math.sqrt(Math.PI / area)); pts = pts.map(([x, y]) => [x * k, y * k]); } }
      shapeCache.set(i, pts); return pts; };

    // Posizione delle pagine.
    const xByPage = new Map();
    let slotW;
    if (linear) {
      // Una pagina, uno spazio: la distanza sul nastro è la distanza nel testo.
      slotW = innerW / (pMax - pMin + 1);
      for (const p of pages) xByPage.set(p, margin.l + slotW * (p - pMin + 0.5));
    } else {
      let gapUnits = 0;
      const gapUnitsBefore = [];
      for (let j = 0; j < pages.length; j++) {
        gapUnitsBefore[j] = gapUnits;
        if (j < pages.length - 1) gapUnits += Math.max(0, Math.min(3, Math.log2(Math.max(1, pages[j + 1] - pages[j]))));
      }
      slotW = innerW / Math.max(1, pages.length + gapUnits);
      for (let j = 0; j < pages.length; j++) xByPage.set(pages[j], margin.l + slotW * (j + 0.5 + gapUnitsBefore[j]));
    }
    const xOfPage = p => xByPage.get(p) ?? margin.l + innerW / 2;

    // Pile: colonne per pagina dentro lo spazio della pagina.
    // Con la spaziatura per distanza una pagina impila le sue righe in tante colonne quante ne entrano nel suo
    // spazio; il nastro si alza fino alla pila più alta del capitolo (fino a maxPileCSS), poi i segni si
    // riducono fino a minMarkCSS. Nessuna pila invade lo spazio della pagina vicina.
    let colsOf = () => 1, pileH = 70;
    if (linear) {
      const fit = s => {
        const k = Math.max(1, Math.floor((slotW - 2 + gapCSS) / (s + gapCSS)));
        return {k, h: Math.max(...pages.map(p => Math.ceil(rowsByPage.get(p).length / k))) * (s + gapCSS)};
      };
      let s = markCSS, f = fit(s);
      // 'fissa': altezza costante (70 px) e segni che si riducono quanto serve.
      // Sugli schermi bassi la pila non supera il 17% dell'altezza della finestra: la figura resta la protagonista.
      const cap = pile === 'adattiva' ? Math.min(maxPileCSS, Math.round(innerHeight * .17)) : 70, floor = pile === 'adattiva' ? minMarkCSS : 3;
      while (f.h > cap && s > floor) { s = Math.max(floor, s - .5); f = fit(s); }
      tickSize = s; stackGap = gapCSS; maxTicksPerColumn = Math.ceil(Math.max(...pages.map(p => rowsByPage.get(p).length)) / f.k);
      colsOf = n => Math.min(f.k, Math.max(1, Math.ceil(n / maxTicksPerColumn)));
      pileH = Math.max(40, f.h);
    }
    const top = 22, axisY = top + pileH + 8, H = axisY + 54;

    pageRibbon.setAttribute("viewBox", `0 0 ${W} ${H}`);
    pageRibbon.setAttribute("preserveAspectRatio", "none");
    pageRibbon.style.height = `${H}px`;
    pageRibbonWrap?.style.setProperty("--ribbon-axis", `${axisY}px`);

    // Linea di pagina.
    pageRibbon.appendChild(el("line", {
      x1: margin.l, x2: W - margin.r, y1: axisY, y2: axisY,
      stroke: inkColor, "stroke-opacity": "0.45", "stroke-width": "1"
    }));
    // Con la spaziatura per distanza ogni pagina ha una tacca sull'asse: i vuoti si contano senza scritte.
    if (linear) for (let p = pMin; p <= pMax; p++) {
      const x = margin.l + slotW * (p - pMin + .5), major = p % 5 === 0;
      pageRibbon.appendChild(el("line", {x1: x, x2: x, y1: axisY, y2: axisY + (major ? 5 : 3), stroke: inkColor, "stroke-opacity": major ? ".55" : ".3", "stroke-width": "1"}));
    }

    // Pagine mute: i vuoti sono parte del segnale.
    for (let j = 1; j < pages.length; j++) {
      const gap = pages[j] - pages[j - 1];
      if (gap < gapMin) continue;
      const x1 = xOfPage(pages[j - 1]) + tickSize, x2 = xOfPage(pages[j]) - tickSize;
      // Per distanza il vuoto si vede da sé: resta solo il numero, sobrio, se c'è spazio per scriverlo.
      if (!linear) pageRibbon.appendChild(el("line", {
        x1, x2, y1: axisY + 14, y2: axisY + 14,
        stroke: inkColor, "stroke-opacity": "0.38", "stroke-dasharray": "4 5"
      }));
      if (linear && x2 - x1 < 70) continue;
      const label = el("text", {
        x: (x1 + x2) / 2, y: axisY + (linear ? 30 : 27), "text-anchor": "middle",
        "font-size": "10", fill: inkColor, "fill-opacity": linear ? "0.6" : "0.75", "font-style": linear ? "italic" : "normal"
      });
      label.textContent = it.mutePages(gap-1);
      pageRibbon.appendChild(label);
    }

    // Blocchi testuali.
    const blocks = [];
    let blockStart = 0;
    for (let j = 1; j <= rows.length; j++) {
      const prev = rows[j - 1], cur = rows[j];
      if (!cur || Math.abs(seqPage(cur) - seqPage(prev)) > blockDelta) {
        if (j - blockStart > 1) blocks.push(rows.slice(blockStart, j));
        blockStart = j;
      }
    }
    for (const block of blocks) {
      const x1 = xOfPage(seqPage(block[0])), x2 = xOfPage(seqPage(block[block.length - 1]));
      if (Math.abs(x2 - x1) < tickSize) continue;
      const y = axisY + 38;
      pageRibbon.appendChild(el("path", {
        d: `M${x1},${y - 5} L${x1},${y} L${x2},${y} L${x2},${y - 5}`,
        fill: "none", stroke: inkColor, "stroke-opacity": "0.58", "stroke-width": "1"
      }));
    }

    // Cursore verticale.
    const cursorRow = rows.find(row => row.pos === seqPos && (!filtered || row.agentId === focalizer));
    const cursorPage = cursorRow ? seqPage(cursorRow) : null;
    const cartiglio = el("text", {
      x: margin.l, y: 14, "text-anchor": "start",
      "font-size": "11", fill: inkColor, "font-weight": "600"
    });
    if (cursorRow) {
      const toponym = allData?.[cursorRow.tileIndex]?.properties?.Toponym || "";
      const role = effRoleName(cursorRow);
      const lead = el("tspan", {});
      lead.textContent = it.pagePlace(cursorPage,toponym);
      cartiglio.appendChild(lead);
      if (filtered && role) {
        const roleSpan = el("tspan", {fill: roleColors[role] || inkColor});
        roleSpan.textContent = it.roleSuffix(role);
        cartiglio.appendChild(roleSpan);
      }
      // Contatore della pagina del cursore: una sola cifra, nel cartiglio, invece di una per pagina sull'asse.
      if (linear) { const n = el("tspan", {"font-weight": "400", "fill-opacity": ".75"}); n.textContent = it.pageRows(countRowsByPage.get(cursorPage)?.length || 0); cartiglio.appendChild(n); }
    }
    pageRibbon.appendChild(cartiglio);
    if (cursorPage != null) {
      const x = xOfPage(cursorPage);
      // Per distanza il cursore è un filo d'inchiostro: nessuna ombra sotto la pila, la riga corrente ha l'anello.
      if (!linear) pageRibbon.appendChild(el("rect", {
        x: x - (tickSize + 3) / 2 - 2, y: 4,
        width: tickSize + 7, height: axisY - 2,
        fill: inkColor, "fill-opacity": "0.10", rx: 2
      }));
      pageRibbon.appendChild(el("line", {
        x1: x, x2: x, y1: linear ? 18 : 4, y2: linear ? axisY + 8 : H - 10,
        stroke: inkColor, "stroke-width": linear ? "1" : "1.4"
      }));
    }

    // Barre: una colonna per pagina, altezza = occorrenze.
    let currentRibbonTick = null;
    const focusRing = linear ? el("rect", {class: "ribbon-focus", fill: "none", stroke: inkColor, "stroke-width": "1.5", rx: 2, visibility: "hidden"}) : null;
    const pileTop = new Map();
    const openLens = (page, focusPos = null, pinned = false) => {
      if (!lens) return;
      clearTimeout(lens.timer); lens.page = page; lens.pinned = pinned || lens.pinned; lens.focusPos = focusPos;
      renderLens();
    };
    function renderLens() {
      if (!lens || lens.page == null || !rowsByPage.has(lens.page)) { lens?.close(); return; }
      const page = lens.page, stack = rowsByPage.get(page).slice().sort((a, b) => d3.ascending(a.pos, b.pos));
      const cell = coarse() ? 44 : 28, cols = Math.min(stack.length, Math.max(4, Math.ceil(Math.sqrt(stack.length * 1.6))));
      lens.title.textContent = it.lensTitle(page, (countRowsByPage.get(page) || []).length);
      lens.node.setAttribute("aria-label", it.lensTitle(page, stack.length));
      lens.grid.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
      lens.grid.replaceChildren(...stack.map(row => {
        const b = document.createElement("button"), inFilter = !filtered || row.agentId === focalizer;
        b.type = "button"; b.tabIndex = -1; b.className = "ribbon-lens-cell"; b.disabled = !inFilter;
        b.style.width = b.style.height = `${cell}px`;
        b.setAttribute("aria-label", it.ribbonReference(page, allData[row.tileIndex].properties.Toponym));
        b.title = allData[row.tileIndex].properties.Toponym;
        if (row.pos === seqPos) b.setAttribute("aria-current", "true");
        if (row.pos === lens.focusPos) b.dataset.focus = "true";
        // Nella lente la sagoma del luogo è leggibile qualunque sia la forma dei segni del nastro.
        const poly = tileShape(row.tileIndex), c = cell / 2, r = cell * (cell > 30 ? .3 : .34);
        const fill = filtered && inFilter ? (roleColors[effRoleName(row)] || inkColor) : inkColor;
        const s = el("svg", {viewBox: `0 0 ${cell} ${cell}`, width: cell, height: cell, "aria-hidden": "true"});
        s.appendChild(poly ? el("path", {d: "M" + poly.map(([px, py]) => `${(c + px * r).toFixed(1)},${(c + py * r).toFixed(1)}`).join("L") + "Z", fill, "fill-opacity": inFilter ? ".9" : String(focalDimAlpha)})
          : el("circle", {cx: c, cy: c, r: r * .8, fill, "fill-opacity": inFilter ? ".9" : String(focalDimAlpha)}));
        b.append(s);
        b.addEventListener("click", () => { lens.pinned = true; setSeqPos(row.pos); });
        return b;
      }));
      // La lente sta sopra la pila della sua pagina, dentro la larghezza del nastro.
      lens.node.hidden = false;
      const svgW = pageRibbon.getBoundingClientRect().width || W, scale = svgW / W, lw = lens.node.offsetWidth;
      const left = Math.max(0, Math.min(svgW - lw, xOfPage(page) * scale - lw / 2));
      lens.node.style.left = `${left + pageRibbon.getBoundingClientRect().left - pageRibbonWrap.getBoundingClientRect().left}px`;
      lens.node.style.bottom = `${H - (pileTop.get(page) ?? axisY) + 8}px`;
    }

    for (const page of pages) {
      const stack = rowsByPage.get(page).slice().sort((a, b) => d3.ascending(a.pos, b.pos));
      const x = xOfPage(page);
      // Bersaglio al tocco della pagina: almeno 44 px, porta il cursore all'ultima riga della pagina.
      // Le tacche restano sopra, per scegliere la singola riga.
      const pageTarget = [...stack].reverse().find(row => !filtered || row.agentId === focalizer);
      if (pageTarget) {
        const hitW = Math.max(44, slotW || 0);
        const hit = el("rect", {x: x - hitW / 2, y: Math.min(4, axisY - 44), width: hitW, height: Math.max(44, axisY - 4), fill: "transparent", "pointer-events": "all", "data-page": page});
        hit.style.cursor = "pointer";
        hit.addEventListener("click", () => setSeqPos(pageTarget.pos));
        if (lens) {
          hit.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") openLens(page); });
          hit.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") lens.later(); });
          hit.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") openLens(page, null, true); });
        }
        pageRibbon.appendChild(hit);
      }
      const isCursorPage = page === cursorPage;
      const columnCount = linear ? colsOf(stack.length) : Math.max(1, Math.ceil(stack.length / maxTicksPerColumn));
      const maxGroupWidth = slotW || (columnCount * (tickSize + stackGap));
      const naturalGroupWidth = columnCount * tickSize + (columnCount - 1) * stackGap;
      const tickWidth = linear || naturalGroupWidth <= maxGroupWidth
        ? tickSize
        : Math.max(minReadableTickWidth, Math.min(tickSize, maxGroupWidth / columnCount));
      const columnStride = columnCount <= 1
        ? 0
        : linear ? tickSize + stackGap : Math.max(0, Math.min(tickWidth + stackGap, (maxGroupWidth - tickWidth) / (columnCount - 1)));
      const groupWidth = columnCount <= 1 ? tickWidth : tickWidth + columnStride * (columnCount - 1);
      const perColumn = linear ? Math.ceil(stack.length / columnCount) : maxTicksPerColumn;
      pileTop.set(page, axisY - tickSize - (Math.min(stack.length, perColumn) - 1) * (tickSize + stackGap) - 4);

      // Filo: un tratto verticale per pagina, su cui le righe sono infilate.
      // Con più colonne per pagina, un filo per colonna.
      if (style === 'filo' && stack.length) for (let col = 0; col < columnCount; col++) {
        const n = Math.min(perColumn, stack.length - col * perColumn), cx = x - groupWidth / 2 + tickWidth / 2 + col * columnStride;
        if (n > 0) pageRibbon.appendChild(el("line", {x1: cx, x2: cx, y1: axisY, y2: axisY - tickSize - (n - 1) * (tickSize + stackGap) - tickSize / 2, stroke: inkColor, "stroke-opacity": ".45", "stroke-width": ".8"}));
      }
      stack.forEach((row, j) => {
        const col = Math.floor(j / perColumn);
        const rowInCol = j % perColumn;
        const tx = x - groupWidth / 2 + tickWidth / 2 + col * columnStride;
        const y = axisY - tickSize - rowInCol * (tickSize + stackGap);
        const isCursor = row.pos === seqPos;
        const tickScale = isCursor ? (linear ? 1.3 : 1.45) : 1;
        const drawTickWidth = tickWidth * tickScale;
        const drawTickSize = tickSize * tickScale;
        const inFilter = !filtered || row.agentId === focalizer;
        const rowFill = filtered
          ? (inFilter ? (roleColors[effRoleName(row)] || inkColor) : inkColor)
          : inkColor;
        if (isCursor && !linear) {
          // alone dell'occorrenza di riferimento
          pageRibbon.appendChild(el("rect", {
            x: tx - drawTickWidth / 2 - 3, y: y + tickSize / 2 - drawTickSize / 2 - 3,
            width: drawTickWidth + 6, height: drawTickSize + 6,
            fill: rowFill,
            "fill-opacity": "0.30", rx: 2
          }));
        }
        const common = {fill: rowFill, stroke: inkColor, "stroke-width": isCursor ? (linear ? "1.5" : "1.8") : (linear ? "0" : "0.5"),
          "fill-opacity": inFilter ? (isCursorPage || isCursor ? "1" : "0.85") : String(focalDimAlpha), class: "ribbon-mark"};
        const cy = y + tickSize / 2, poly = style === 'tessere' ? tileShape(row.tileIndex) : null;
        // Tessere: la sagoma del luogo; i luoghi senza sagoma (oltre 100 km, i luoghi del romanzo) sono cerchi.
        const tick = poly
          ? el("path", {...common, d: "M" + poly.map(([px, py]) => `${(tx + px * drawTickWidth * (linear ? .5 : .62)).toFixed(2)},${(cy + py * drawTickSize * (linear ? .5 : .62)).toFixed(2)}`).join("L") + "Z"})
          : style === 'filo' || (style === 'tessere' && linear)
            ? el("circle", {...common, cx: tx, cy, r: drawTickSize / 2 * (style === 'tessere' ? .82 : 1)})
            : el("rect", {...common, x: tx - drawTickWidth / 2, y: cy - drawTickSize / 2, width: drawTickWidth, height: drawTickSize});
        if (style === 'densita') { tick.setAttribute("stroke-width", isCursor ? "1.6" : "0"); tick.setAttribute("width", String(Math.min(14, Math.max(6, slotW * .7)) * (isCursor ? 1.15 : 1))); tick.setAttribute("x", String(tx - Math.min(14, Math.max(6, slotW * .7)) * (isCursor ? 1.15 : 1) / 2)); }
        // Riga corrente: anello di carta sotto l'inchiostro, come la tessera consultata nella figura.
        if (isCursor && linear) { const halo = tick.cloneNode(); halo.setAttribute("stroke", "var(--surface)"); halo.setAttribute("stroke-width", "4.5"); halo.removeAttribute("class"); pageRibbon.appendChild(halo); }
        if (inFilter) {
          tick.style.cursor = "pointer";
          tick.setAttribute('role','button');tick.setAttribute('tabindex',isCursor?'0':'-1');
          tick.setAttribute('data-pos',row.pos);tick.setAttribute('aria-label',it.ribbonReference(page,allData[row.tileIndex].properties.Toponym));
          tick.addEventListener("click", () => setSeqPos(row.pos));
          if (lens) {
            tick.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") openLens(page); });
            tick.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") lens.later(); });
            tick.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") openLens(page, null, true); });
          }
          if (focusRing) {
            tick.addEventListener("focus", () => { const b = tick.getBBox(); focusRing.setAttribute("x", b.x - 3); focusRing.setAttribute("y", b.y - 3); focusRing.setAttribute("width", b.width + 6); focusRing.setAttribute("height", b.height + 6); focusRing.setAttribute("visibility", tick.matches(":focus-visible") ? "visible" : "hidden"); if (tick.matches(":focus-visible")) openLens(page, row.pos); });
            tick.addEventListener("blur", () => focusRing.setAttribute("visibility", "hidden"));
          }
          // Tastiera, in ordine di testo: frecce per riga, Pagina su/giù per pagina, Inizio e Fine del capitolo.
          tick.addEventListener('keydown',event=>{
            const index=countRows.findIndex(r=>r.pos===row.pos);let target=null;
            const pageStep=d=>{const pg=seqPage(row);const next=d>0?countRows.find(r=>seqPage(r)>pg):[...countRows].reverse().find(r=>seqPage(r)<pg);return next?.pos;};
            if(event.key==='Enter'||event.key===' ')target=row.pos;
            else if(event.key==='ArrowRight'||event.key==='ArrowDown')target=countRows[Math.min(countRows.length-1,index+1)]?.pos;
            else if(event.key==='ArrowLeft'||event.key==='ArrowUp')target=countRows[Math.max(0,index-1)]?.pos;
            else if(event.key==='PageDown')target=pageStep(1);
            else if(event.key==='PageUp')target=pageStep(-1);
            else if(event.key==='Home')target=countRows[0]?.pos;
            else if(event.key==='End')target=countRows.at(-1)?.pos;
            if(target==null)return;event.preventDefault();setSeqPos(target);
            queueMicrotask(()=>pageRibbon.querySelector(`[data-pos="${target}"]`)?.focus());
          });
        }
        pageRibbon.appendChild(tick);

        if (isCursor && inFilter) {
          if (!linear) pageRibbon.appendChild(el("circle", {cx: x, cy: y - 7, r: "3", fill: inkColor}));
          currentRibbonTick = {x, y: y + tickSize / 2, page, tileIndex: row.tileIndex, pos: row.pos};
        }
      });

    }
    if (focusRing) pageRibbon.appendChild(focusRing);

    // Etichette di pagina: per distanza i numeri cadono sulle tacche maggiori (ogni 5 pagine) e sulla pagina del
    // cursore; il conteggio sta nel cartiglio. Nella spaziatura compressa resta «pagina · righe».
    let lastLabelX = -Infinity;
    const labelPages = linear ? [...new Set([...d3.range(Math.ceil(pMin / 5) * 5, pMax + 1, 5), ...(cursorPage != null ? [cursorPage] : [])])].sort(d3.ascending) : pages;
    const cursorX = cursorPage != null ? xOfPage(cursorPage) : null;
    for (const page of labelPages) {
      const x = linear ? margin.l + slotW * (page - pMin + .5) : xOfPage(page);
      const isCursorPage = page === cursorPage;
      if (!isCursorPage && (x - lastLabelX < 36 || (linear && cursorX != null && Math.abs(x - cursorX) < 30))) continue;
      const counted = countRowsByPage.get(page)?.length || 0;
      const label = el("text", {
        x, y: axisY + (linear ? 16 : 11), "text-anchor": "middle", "font-size": linear ? "10" : "9",
        fill: inkColor, "fill-opacity": isCursorPage ? "1" : "0.6",
        "font-weight": isCursorPage ? "700" : "400", "font-variant-numeric": "tabular-nums"
      });
      label.textContent = linear ? String(page) : it.pageCount(page,counted);
      pageRibbon.appendChild(label);
      lastLabelX = x;
    }

    // Estremi di pagina.
    for (const [p, anchor, dx] of [[pMin, "start", 0], [pMax, "end", 0]]) {
      const t = el("text", {
        x: xOfPage(p) + dx, y: H - 4, "text-anchor": anchor,
        "font-size": "10", fill: inkColor, "fill-opacity": "0.7"
      });
      t.textContent = it.page(p);
      pageRibbon.appendChild(t);
    }

    // Trascinamento: dalla x sul nastro alla pagina più vicina (ultima riga, o la riga più vicina per riga).
    pageRibbon.__pick = (px, wantRow) => {
      let best = pages[0], bestD = Infinity;
      for (const p of pages) { const d = Math.abs(xOfPage(p) - px); if (d < bestD) { bestD = d; best = p; } }
      const stack = (countRowsByPage.get(best) || rowsByPage.get(best) || []).slice().sort((a, b) => a.pos - b.pos);
      return wantRow ? null : stack.at(-1)?.pos;
    };
    pageRibbon.__width = W;
    pageRibbon.__layout = {slotW, tickSize, pileH, linear};
    // La lente segue il cursore: ridisegnata a ogni cambio, chiusa se la sua pagina non c'è più.
    if (lens && lens.page != null) renderLens();
    return {stateKey: key, currentRibbonTick};
  }

  return { update };
})();

export default s4PageRibbon;
