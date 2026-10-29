import { html } from "htl";
import it from "../strings-it.js";
import atlasConfig from "../model/config.js";

// Costruzione DOM dei controlli e degli overlay; gli handler restano in createAtlas.
const atlasShell = (() => {
  function create({canvas, width, nChapters, inkColor, bgColor, terrainAgents, sequenceLength, roleOrder, roleColors, rolePluralColor}) {
    const PLAY_ICON = it.playIcon;
    const PAUSE_ICON = it.pauseIcon;
    // Comandi a spigolo vivo con filo d'inchiostro; lo stato attivo inverte i colori.
    const slider = html`<input class="ctl-range" data-legend="chapter" type=range min=1 max=${nChapters} step=1 value=1>`;
    const chLabel = html`<span class="ctl-value">1</span>`;
    const btn = html`<button type=button class="ctl ctl-icon" data-legend="chapter">${PLAY_ICON}</button>`;
    const stagePrevBtn = html`<button type=button class="ctl">${it.previous}</button>`;
    const stageNextBtn = html`<button type=button class="ctl">${it.next}</button>`;
    const stageLabel = html`<span class="ctl-stage">${it.initialStage}</span>`;
    const mapBtn = html`<button type=button class="ctl">${it.map}</button>`;
    const pasticciaccioBtn = html`<button type=button class="ctl">${it.diagram}</button>`;
    const focalizerSelect = html`<select class="ctl-select" data-legend="focalizer">
      ${terrainAgents.filter((a, j) => j === 0 || a.total >= 10).map(a => html`<option value=${a.id == null ? "" : a.id}>${a.name}</option>`)}
    </select>`;
    const seqModeToggle = html`<span class="ctl-pair" data-legend="page">
      <button type=button class="ctl">${it.perChapter}</button><button type=button class="ctl">${it.perPage}</button>
    </span>`;
    const seqChapterBtn = seqModeToggle.querySelector("button:first-child");
    const seqPageBtn = seqModeToggle.querySelector("button:last-child");
    // Variante «tre tempi»: capitolo, pagina, riga in un solo gruppo (il terzo bottone vive accanto agli altri due).
    const orderBtn = html`<button type=button class="ctl" data-legend="order" disabled>${it.chronologicalOrder}</button>`;
    const seqSlider = html`<input class="ctl-range" data-legend="page" type=range min=0 max=${Math.max(0, sequenceLength - 1)} step=1 value=0 style="display:none">`;
    const seqLabel = html`<span class="ctl-value" style="display:none">${it.emptyCursor}</span>`;
    // Forma dei filtri di ruolo (config ROLE_BUTTONS.style): 'quadrati' | 'filetto' | 'tacca' | 'etichetta'.
    const roleLegend = html`<span class="ctl-roles" data-legend="roles" data-style=${atlasConfig.ROLE_BUTTONS.style} style="display:none">
      ${roleOrder.map(r => html`<button type=button class="ctl-role" data-role=${r}><span class="ctl-swatch" style="background:${roleColors[r]}"></span><span>${r}</span></button>`)}
      <span class="ctl-role"><span class="ctl-swatch" style="background:${rolePluralColor}"></span>${it.pluralRole}</span>
    </span>`;
    const roleButtons = Array.from(roleLegend.querySelectorAll("button[data-role]"));
    const rotSlider = html`<input class="ctl-range" data-legend="rotation" type=range min=0 max=360 step=1 value=0>`;
    // Rotazione: scatti di 15°, ritorno al nord e ago d'orientamento (il nord della carta, ruotato con il piano).
    const rotLeftBtn = html`<button type=button class="ctl ctl-icon" data-legend="rotation" aria-label=${it.rotateLeft}>⟲</button>`;
    const rotRightBtn = html`<button type=button class="ctl ctl-icon" data-legend="rotation" aria-label=${it.rotateRight}>⟳</button>`;
    const rotResetBtn = html`<button type=button class="ctl" data-legend="rotation">${it.rotateReset}</button>`;
    const rotNeedle = html`<svg class="ctl-needle" viewBox="-20 -20 40 40" role="img" aria-label=${it.rotationIndicator(0)}><circle r="18"/><g><path d="M0 -15 L4 0 L0 3 L-4 0 Z" class="north"/><path d="M0 15 L4 0 L0 3 L-4 0 Z"/><text y="-7.5" text-anchor="middle">N</text></g></svg>`;
    // Granularità del cursore per pagina: tre forme (config GRAIN.variant), un solo motore.
    const grainToggle = html`<span class="ctl-pair ctl-grain" data-legend="grain" role="group" aria-label=${it.grainLabel}><button type=button class="ctl" data-grain="page">${it.grainPage}</button><button type=button class="ctl" data-grain="row">${it.grainRow}</button></span>`;
    const seqRowBtn = html`<button type=button class="ctl" data-grain="row" hidden>${it.perRow}</button>`;
    const reliefBtn = html`<button type=button class="ctl" disabled style="opacity:.45">${it.relief}</button>`;

    slider.setAttribute('aria-label',it.chapter);seqSlider.setAttribute('aria-label',it.cursor);
    rotSlider.setAttribute('aria-label',it.rotation);focalizerSelect.setAttribute('aria-label',it.focalizer);
    btn.setAttribute('aria-label',it.play);stagePrevBtn.setAttribute('aria-label',it.previousView);stageNextBtn.setAttribute('aria-label',it.nextView);
    const viewBox = document.createElement("div");
    viewBox.className = "atlas-figure";
    viewBox.style.position = "relative";
    viewBox.style.overflow = "auto";
    viewBox.style.width = "100%";
    canvas.style.display = "block";
    canvas.style.margin = "0 auto";
    viewBox.appendChild(canvas);

    const svgNs = "http://www.w3.org/2000/svg";
    const pageRibbon = document.createElementNS(svgNs, "svg");
    pageRibbon.style.display = "none";
    pageRibbon.style.width = `${width}px`;
    pageRibbon.style.maxWidth = "100%";
    pageRibbon.style.margin = "0 auto";
    pageRibbon.style.overflow = "visible";
    pageRibbon.style.font = "12px var(--font-ui)";
    const ribbonPrevBtn = html`<button type=button class="ctl ctl-ribbon" style="left:0">${it.previousIcon}</button>`;
    const ribbonNextBtn = html`<button type=button class="ctl ctl-ribbon" style="right:0">${it.nextIcon}</button>`;
    const ribbonWrap = html`<div class="atlas-ribbon" data-legend="page" style="width:${width}px;display:none">
      ${ribbonPrevBtn}${pageRibbon}${ribbonNextBtn}
    </div>`;

    ribbonPrevBtn.setAttribute('aria-label',it.previousChapter);ribbonNextBtn.setAttribute('aria-label',it.nextChapter);
    const lodLabel = html`<span class="ctl-note"></span>`;

    // Tre domande, come nel pannello «Interrogare la figura»; la cornice decide dove mostrarle.
    const rowProgress = html`<div class="ctl-row">${stagePrevBtn}${stageNextBtn}${stageLabel}</div>`;
    const rowShortcuts = html`<div class="ctl-row">${mapBtn}${pasticciaccioBtn}${reliefBtn}</div>`;
    seqModeToggle.append(seqRowBtn);
    const rowRelief = html`<div class="ctl-row"><span class="ctl-label">${it.rotationAbbr}</span>${rotSlider}</div>`;
    const rowRotate = html`<div class="ctl-row ctl-rotate">${rotNeedle}${rotLeftBtn}${rotRightBtn}${rotResetBtn}</div>`;
    const rowOrder = html`<div class="ctl-row">${orderBtn}${lodLabel}</div>`;
    const rowPlayback = html`<div class="ctl-row">${btn}${seqModeToggle}</div>`;
    const rowCursor = html`<div class="ctl-row ctl-timeline"><span class="ctl-label">${it.chapterAbbr}</span>${seqSlider}${seqLabel}${slider}${chLabel}</div>`;
    const rowGrain = html`<div class="ctl-row" hidden><span class="ctl-label">${it.grainLabel}</span>${grainToggle}</div>`;
    const legendRow = html`<div class="ctl-row" style="display:none">${roleLegend}</div>`;
    const controls = html`<div class="atlas-controls">
      <section><h3>${it.askWho}</h3><label class="ctl-field"><span>${it.character}</span>${focalizerSelect}</label>${legendRow}</section>
      <section><h3>${it.askWhen}</h3>${rowPlayback}${rowCursor}${rowGrain}</section>
      <section hidden><h3>${it.askHow}</h3>${rowRelief}${rowRotate}${rowOrder}</section>
    </div>`;

    // Scorciatoie fra i cinque stadi: restano collegate ai gestori ma fuori dalla pagina, il foglio le sostituisce.
    const shortcuts = html`<div hidden>${rowShortcuts}${rowProgress}</div>`;
    const wrap = html`<div class="atlas-wrap" style="position:relative">
      ${viewBox}
      ${ribbonWrap}
      ${controls}
      ${shortcuts}
    </div>`;

    return {
      PLAY_ICON, PAUSE_ICON, wrap, viewBox,
      slider, chLabel, btn, stagePrevBtn, stageNextBtn, stageLabel,
      mapBtn, pasticciaccioBtn, reliefBtn,
      focalizerSelect, seqModeToggle, seqChapterBtn, seqPageBtn, orderBtn, seqSlider, seqLabel, roleLegend,
      roleButtons, rotSlider, pageRibbon, ribbonWrap, ribbonPrevBtn, ribbonNextBtn, legendRow, lodLabel, controls,
      rotLeftBtn, rotRightBtn, rotResetBtn, rotNeedle, grainToggle, rowGrain, seqRowBtn
    };
  }

  return { create };
})();

export default atlasShell;
