import {html, svg} from 'htl';
import it from '../strings-it.js';

// Legenda unica: una riga persistente dichiara l'unità del regime corrente; lo schema completo si apre a
// richiesta. Spiega soltanto i canali esistenti (quantità, filtro, legge dell'altezza, statuto), senza nuovi segni.
export default function createLegend({container, reliefBands, agents, glyphPaths, variant = 'unica'}){
 const thresholds = reliefBands.thresholds, bands = thresholds.map((v, i) => i < thresholds.length - 1 ? (thresholds[i + 1] - 1 > v ? `${v}–${thresholds[i + 1] - 1}` : String(v)) : `${v}+`);
 const names = new Map(agents.map(a => [a.id, a.name]));
 const glyph = d => svg`<svg class="legend-glyph" viewBox="-6 -6 112 112" aria-hidden="true"><path d=${d} /></svg>`;
 const status = html`<p class="legend-status-line"></p>`, unit = html`<p class="legend-unit"></p>`;
 const toggle = html`<button type="button" class="ctl legend-toggle" aria-expanded="false" aria-controls="legend-sheet">${it.legendShort}</button>`;
 const quantity = html`<p></p>`, close = html`<button type="button" class="ctl legend-close">${it.close}</button>`;
 const sheet = html`<section id="legend-sheet" class="legend-sheet" aria-labelledby="legend-title" hidden>
  <div class="legend-head"><h2 id="legend-title">${it.legendTitle}</h2>${close}</div>
  <h3>${it.legendQuantity}</h3>${quantity}
  <h3>${it.legendFilter}</h3><p>${it.legendFilterText}</p>
  <h3>${it.legendStatus}</h3>
  <ul class="legend-status">
   <li>${it.legendImported}</li>
   <li>${glyph(glyphPaths.transformed)}${it.legendTransformed}</li>
   <li>${glyph(glyphPaths.invented)}${it.legendInvented}</li>
   <li>${it.legendImagined}</li>
  </ul>
  <h3>${it.legendDetermination}</h3><p>${it.legendDeterminationText}</p>
  <h3>${it.legendOther}</h3><p>${it.legendDistance}</p><p>${it.legendRibbon}</p><p>${it.legendColours}</p>
 </section>`;
 const element = html`<div class="legend-dock">${status}${unit}</div>`;
 container.append(element);
 if (variant === 'unica') container.append(sheet);
 const orient = container.querySelector('.frame-orient'); if (orient) orient.prepend(toggle); else element.append(toggle);
 function setOpen(open, restore = true){
  sheet.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); 
  if (open) close.focus(); else if (restore) toggle.focus();
 }
 // Le varianti per comando gestiscono il comando da sé (legend-context.js).
 if (variant === 'unica') toggle.onclick = () => setOpen(sheet.hidden);
 close.onclick = () => setOpen(false);
 sheet.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); } });
 // Lo stato pubblico dell'atlante decide il regime: un personaggio rende lineare il conteggio.
 function update(state){
  const who = state.focalizer == null ? null : names.get(state.focalizer) || state.focalizer;
  // Nome della vista e portata del conteggio: una riga in basso, due righe nella didascalia a margine.
  const [name, scope] = it.statusLine(it.statusView[state.view], state.axon, state.chapter, state.mode === 'page').split(' · ');
  status.replaceChildren(html`<span>${name}</span>`, html`<span class="sep"> · </span>`, html`<span>${scope}</span>`);
  unit.textContent = who ? it.legendUnitAgent(who, state.axon) : it.legendUnitAll(state.axon);
  quantity.textContent = who ? it.legendQuantityAgent(who) : it.legendQuantityAll(reliefBands.logBase, bands.join(' · '));
 }
 return {element, sheet, toggle, update, dispose(){ element.remove(); sheet.remove(); toggle.remove(); }};
}
