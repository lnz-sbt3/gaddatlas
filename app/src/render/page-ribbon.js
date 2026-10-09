import * as d3 from "d3";

// ===== CELLA: s4PageRibbon =====
// -- CELLA: s4PageRibbon --
// Registro per pagina delle occorrenze, con filtri, cardinalita' e cursore corrente.
const s4PageRibbon = (() => {
  const NS = "http://www.w3.org/2000/svg";

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function update({
    pageRibbon, pageRibbonWrap, seqMode, rows, stateKey, chapter, focalizer, seqPos,
    width, inkColor, roleColors, gapMin, blockDelta, seqPage, effRoleName, setSeqPos,
    focalDimAlpha, allData, roleMaskKey
  }) {
    if (!pageRibbon) return {stateKey, currentRibbonTick: null};

    // Con un focalizzatore attivo, il resto del corpus rimane visibile ma attenuato.
    const visible = seqMode;
    pageRibbon.style.display = visible ? "block" : "none";
    if (pageRibbonWrap) pageRibbonWrap.style.display = visible ? "block" : "none";
    if (!visible) return {stateKey: "", currentRibbonTick: null};

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
      roleMaskKey || "",
      pageKey,
      rows[0]?.pos ?? -1,
      rows[rows.length - 1]?.pos ?? -1
    ].join("|");
    if (key === stateKey) return {stateKey, currentRibbonTick: null, unchanged: true};

    pageRibbon.replaceChildren();
    if (!rows.length) return {stateKey: key, currentRibbonTick: null};

    const W = width, H = 132;
    const margin = {l: 28, r: 28};
    const axisY = 78;                 // asse piu' in basso: le barre crescono sopra
    const tickSize = 9, stackGap = 3, maxTicksPerColumn = 6, minReadableTickWidth = 5;
    const pMin = pages[0], pMax = pages[pages.length - 1];
    const innerW = W - margin.l - margin.r;
    const xByPage = new Map();
    let gapUnits = 0;
    const gapUnitsBefore = [];
    for (let j = 0; j < pages.length; j++) {
      gapUnitsBefore[j] = gapUnits;
      if (j < pages.length - 1) {
        const gap = pages[j + 1] - pages[j];
        gapUnits += Math.max(0, Math.min(3, Math.log2(Math.max(1, gap))));
      }
    }
    const slotUnits = pages.length + gapUnits;
    const slotW = innerW / Math.max(1, slotUnits);
    for (let j = 0; j < pages.length; j++) {
      xByPage.set(pages[j], margin.l + slotW * (j + 0.5 + gapUnitsBefore[j]));
    }
    const xOfPage = p => xByPage.get(p) ?? margin.l + innerW / 2;

    pageRibbon.setAttribute("viewBox", `0 0 ${W} ${H}`);
    pageRibbon.setAttribute("preserveAspectRatio", "none");
    pageRibbon.style.height = `${H}px`;

    // -- linea di pagina -------------------------------------------------
    pageRibbon.appendChild(el("line", {
      x1: margin.l, x2: W - margin.r, y1: axisY, y2: axisY,
      stroke: inkColor, "stroke-opacity": "0.45", "stroke-width": "1"
    }));

    // -- pagine mute: i vuoti sono parte del segnale ----------------------
    for (let j = 1; j < pages.length; j++) {
      const gap = pages[j] - pages[j - 1];
      if (gap < gapMin) continue;
      const x1 = xOfPage(pages[j - 1]) + tickSize, x2 = xOfPage(pages[j]) - tickSize;
      pageRibbon.appendChild(el("line", {
        x1, x2, y1: axisY + 14, y2: axisY + 14,
        stroke: inkColor, "stroke-opacity": "0.38", "stroke-dasharray": "4 5"
      }));
      const label = el("text", {
        x: (x1 + x2) / 2, y: axisY + 27, "text-anchor": "middle",
        "font-size": "10", fill: inkColor, "fill-opacity": "0.75"
      });
      label.textContent = `${gap} pagine mute`;
      pageRibbon.appendChild(label);
    }

    // -- blocchi testuali --------------------------------------------------
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

    // -- cursore verticale -------------------------------------------------
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
      lead.textContent = `p. ${cursorPage} · ${toponym}`;
      cartiglio.appendChild(lead);
      if (filtered && role) {
        const roleSpan = el("tspan", {fill: roleColors[role] || inkColor});
        roleSpan.textContent = ` · ${role}`;
        cartiglio.appendChild(roleSpan);
      }
    }
    pageRibbon.appendChild(cartiglio);
    if (cursorPage != null) {
      const x = xOfPage(cursorPage);
      // La retroilluminazione precede le tacche per non coprirle.
      pageRibbon.appendChild(el("rect", {
        x: x - (tickSize + 3) / 2 - 2, y: 4,
        width: tickSize + 7, height: axisY - 2,
        fill: inkColor, "fill-opacity": "0.10", rx: 2
      }));
      pageRibbon.appendChild(el("line", {
        x1: x, x2: x, y1: 4, y2: H - 10,
        stroke: inkColor, "stroke-width": "1.4"
      }));
    }

    // -- barre: una colonna per pagina, altezza = occorrenze ---------------
    let currentRibbonTick = null;

    for (const page of pages) {
      const stack = rowsByPage.get(page).slice().sort((a, b) => d3.ascending(a.pos, b.pos));
      const x = xOfPage(page);
      const isCursorPage = page === cursorPage;
      const columnCount = Math.max(1, Math.ceil(stack.length / maxTicksPerColumn));
      const maxGroupWidth = slotW || (columnCount * (tickSize + stackGap));
      const naturalGroupWidth = columnCount * tickSize + (columnCount - 1) * stackGap;
      const tickWidth = naturalGroupWidth <= maxGroupWidth
        ? tickSize
        : Math.max(minReadableTickWidth, Math.min(tickSize, maxGroupWidth / columnCount));
      const columnStride = columnCount <= 1
        ? 0
        : Math.max(0, Math.min(tickWidth + stackGap, (maxGroupWidth - tickWidth) / (columnCount - 1)));
      const groupWidth = columnCount <= 1 ? tickWidth : tickWidth + columnStride * (columnCount - 1);

      stack.forEach((row, j) => {
        const col = Math.floor(j / maxTicksPerColumn);
        const rowInCol = j % maxTicksPerColumn;
        const tx = x - groupWidth / 2 + tickWidth / 2 + col * columnStride;
        const y = axisY - tickSize - rowInCol * (tickSize + stackGap);
        const isCursor = row.pos === seqPos;
        const tickScale = isCursor ? 1.45 : 1;
        const drawTickWidth = tickWidth * tickScale;
        const drawTickSize = tickSize * tickScale;
        const inFilter = !filtered || row.agentId === focalizer;
        const rowFill = filtered
          ? (inFilter ? (roleColors[effRoleName(row)] || inkColor) : inkColor)
          : inkColor;
        if (isCursor) {
          // alone dell'occorrenza di riferimento
          pageRibbon.appendChild(el("rect", {
            x: tx - drawTickWidth / 2 - 3, y: y + tickSize / 2 - drawTickSize / 2 - 3,
            width: drawTickWidth + 6, height: drawTickSize + 6,
            fill: rowFill,
            "fill-opacity": "0.30", rx: 2
          }));
        }
        const tick = el("rect", {
          x: tx - drawTickWidth / 2, y: y + tickSize / 2 - drawTickSize / 2,
          width: drawTickWidth, height: drawTickSize,
          fill: rowFill,
          stroke: inkColor,
          "stroke-width": isCursor ? "1.8" : "0.5",
          "fill-opacity": inFilter ? (isCursorPage || isCursor ? "1" : "0.85") : String(focalDimAlpha)
        });
        if (inFilter) {
          tick.style.cursor = "pointer";
          tick.addEventListener("click", () => setSeqPos(row.pos));
        }
        pageRibbon.appendChild(tick);

        if (isCursor && inFilter) {
          pageRibbon.appendChild(el("circle", {cx: x, cy: y - 7, r: "3", fill: inkColor}));
          currentRibbonTick = {x, y: y + tickSize / 2, page, tileIndex: row.tileIndex, pos: row.pos};
        }
      });

    }

    let lastLabelX = -Infinity;
    for (const page of pages) {
      const x = xOfPage(page);
      const isCursorPage = page === cursorPage;
      if (!isCursorPage && x - lastLabelX < 36) continue;
      const counted = countRowsByPage.get(page)?.length || 0;
      const label = el("text", {
        x, y: axisY + 11, "text-anchor": "middle", "font-size": "9",
        fill: inkColor, "fill-opacity": isCursorPage ? "1" : "0.6",
        "font-weight": isCursorPage ? "700" : "400"
      });
      label.textContent = counted > 1 ? `${page} · ${counted}` : String(page);
      pageRibbon.appendChild(label);
      lastLabelX = x;
    }

    // -- estremi di pagina --------------------------------------------------
    for (const [p, anchor, dx] of [[pMin, "start", 0], [pMax, "end", 0]]) {
      const t = el("text", {
        x: xOfPage(p) + dx, y: H - 4, "text-anchor": anchor,
        "font-size": "10", fill: inkColor, "fill-opacity": "0.7"
      });
      t.textContent = `p. ${p}`;
      pageRibbon.appendChild(t);
    }

    return {stateKey: key, currentRibbonTick};
  }

  return { update };
})();

export default s4PageRibbon;
