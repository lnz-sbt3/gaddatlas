import { html } from "htl";

// ===== CELLA: s4ChartShell =====
// -- CELLA: s4ChartShell --
// Costruzione DOM dei controlli e degli overlay. Gli handler restano in chartS4,
// cosi' lo stato mutabile non attraversa celle Observable.
const s4ChartShell = (() => {
  function create({canvas, width, nChapters, inkColor, bgColor, terrainAgents, sequenceLength, roleOrder, roleColors, rolePluralColor}) {
    const PLAY_ICON = "▶";
    const PAUSE_ICON = "❚❚";
    const SLIDER_STYLE = "flex:1 1 130px;min-width:80px;max-width:220px";
    const slider = html`<input type=range min=1 max=${nChapters} step=1 value=1 style="${SLIDER_STYLE}">`;
    const chLabel = html`<span>1</span>`;
    const btn = html`<button style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 10px;cursor:pointer">${PLAY_ICON}</button>`;
    const stagePrevBtn = html`<button style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 8px;cursor:pointer">indietro</button>`;
    const stageNextBtn = html`<button style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 8px;cursor:pointer">avanti</button>`;
    const stageLabel = html`<span style="font:12px sans-serif;min-width:15em;font-weight:600">1/6 · Mappa di Roma</span>`;
    const shortcutStyle = `font:11px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 8px;cursor:pointer;opacity:.72`;
    const mapBtn = html`<button style="${shortcutStyle}">Mappa di Roma</button>`;
    const pasticciaccioBtn = html`<button style="${shortcutStyle}">Mappa del Pasticciaccio</button>`;
    const focalizerSelect = html`<select style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 6px;max-width:150px">
      ${terrainAgents.filter((a, j) => j === 0 || a.total >= 10).map(a => html`<option value=${a.id == null ? "" : a.id}>${a.name}</option>`)}
    </select>`;
    const seqModeToggle = html`<span style="display:inline-flex;border:1px solid ${inkColor};border-radius:4px;overflow:hidden;opacity:.45">
      <button style="font:12px sans-serif;border:0;border-right:1px solid ${inkColor};background:${inkColor};color:${bgColor};padding:2px 8px;cursor:pointer">per capitolo</button>
      <button style="font:12px sans-serif;border:0;background:${bgColor};color:${inkColor};padding:2px 8px;cursor:pointer">per pagina</button>
    </span>`;
    const seqChapterBtn = seqModeToggle.querySelector("button:first-child");
    const seqPageBtn = seqModeToggle.querySelector("button:last-child");
    const orderBtn = html`<button disabled style="font:12px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;padding:2px 10px;cursor:pointer;opacity:.45">ordine: cronologico</button>`;
    const seqSlider = html`<input type=range min=0 max=${Math.max(0, sequenceLength - 1)} step=1 value=0 style="${SLIDER_STYLE};display:none">`;
    const seqLabel = html`<span style="display:none;min-width:7.5em;text-align:left">p. - (cap. -)</span>`;
    const roleLegend = html`<span style="display:none;gap:8px;align-items:center">
      ${roleOrder.map(r => html`<button type=button data-role=${r} style="font:12px sans-serif;border:0;background:transparent;color:${inkColor};padding:0;display:inline-flex;gap:4px;align-items:center;white-space:nowrap;cursor:pointer"><span style="width:12px;height:12px;background:${roleColors[r]};border:1px solid ${inkColor};display:inline-block"></span><span>${r}</span></button>`)}
      <span style="display:inline-flex;gap:4px;align-items:center;white-space:nowrap"><span style="width:12px;height:12px;background:${rolePluralColor};border:1px solid ${inkColor};display:inline-block"></span>ruolo plurale</span>
    </span>`;
    const roleButtons = Array.from(roleLegend.querySelectorAll("button[data-role]"));
    const rotSlider = html`<input type=range min=0 max=360 step=1 value=0 style="${SLIDER_STYLE}">`;
    const reliefBtn = html`<button disabled style="${shortcutStyle};opacity:.45">Rilievo Narrativo</button>`;

    const VIEW_CLIP_PX = 640;
    const viewBox = document.createElement("div");
    viewBox.style.position = "relative";
    viewBox.style.overflow = "hidden";
    viewBox.style.width = "100%";
    viewBox.style.height = VIEW_CLIP_PX + "px";
    viewBox.style.display = "flex";
    viewBox.style.alignItems = "center";
    viewBox.style.justifyContent = "center";
    canvas.style.flexShrink = "0";
    viewBox.appendChild(canvas);

    const svgNs = "http://www.w3.org/2000/svg";
    const pageRibbon = document.createElementNS(svgNs, "svg");
    pageRibbon.style.display = "none";
    pageRibbon.style.width = `${width}px`;
    pageRibbon.style.maxWidth = "100%";
    pageRibbon.style.margin = "0 auto";
    pageRibbon.style.overflow = "visible";
    pageRibbon.style.font = "12px sans-serif";
    const ribbonPrevBtn = html`<button style="position:absolute;left:0;top:78px;transform:translateY(-50%);font:18px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;width:24px;height:28px;line-height:20px;cursor:pointer">‹</button>`;
    const ribbonNextBtn = html`<button style="position:absolute;right:0;top:78px;transform:translateY(-50%);font:18px sans-serif;border:1px solid ${inkColor};background:${bgColor};color:${inkColor};border-radius:4px;width:24px;height:28px;line-height:20px;cursor:pointer">›</button>`;
    const ribbonWrap = html`<div style="position:relative;width:${width}px;max-width:100%;margin:4px auto 0;display:none">
      ${ribbonPrevBtn}${pageRibbon}${ribbonNextBtn}
    </div>`;

    const ROW = `display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:6px;font:12px sans-serif;color:${inkColor}`;
    const lodLabel = html`<span style="opacity:.7;white-space:nowrap"></span>`;

    const rowProgress = html`<div style="${ROW}">
      ${stagePrevBtn}${stageNextBtn}${stageLabel}
    </div>`;
    const rowPlayback = html`<div style="${ROW}">
      ${btn}${seqModeToggle}${seqSlider}${seqLabel}
      <span>Cap.</span>${slider}<span style="min-width:1.5em;text-align:right">${chLabel}</span>
      <span>personaggio</span>${focalizerSelect}${orderBtn}
      <span>rot.</span>${rotSlider}
    </div>`;
    const rowShortcuts = html`<div style="${ROW};opacity:.78">
      ${mapBtn}${pasticciaccioBtn}${reliefBtn}${lodLabel}
    </div>`;
    const legendRow = html`<div style="${ROW};display:none">${roleLegend}</div>`;

    const wrap = html`<div style="position:relative">
      ${viewBox}
      ${ribbonWrap}
      ${rowProgress}
      ${rowPlayback}
      ${rowShortcuts}
      ${legendRow}
    </div>`;

    return {
      PLAY_ICON, PAUSE_ICON, wrap,
      slider, chLabel, btn, stagePrevBtn, stageNextBtn, stageLabel,
      mapBtn, pasticciaccioBtn, reliefBtn,
      focalizerSelect, seqModeToggle, seqChapterBtn, seqPageBtn, orderBtn, seqSlider, seqLabel, roleLegend,
      roleButtons, rotSlider, pageRibbon, ribbonWrap, ribbonPrevBtn, ribbonNextBtn, legendRow, lodLabel
    };
  }

  return { create };
})();

export default s4ChartShell;
