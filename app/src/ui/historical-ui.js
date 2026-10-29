import {html} from 'htl';
import it from '../strings-it.js';

// Carta storica nel guscio (solo dove esiste la carta locale). Tre varianti (config HISTORICAL_UI.variant):
// 'strato'  un interruttore «Carta 1925» sotto la Bussola, accanto ai luoghi narrativi: due strati della figura;
// 'cornice' lo stesso interruttore fra i comandi in alto a destra;
// 'lente'   l'interruttore accende una lente: la carta si vede solo attorno al puntatore (o al dito).
// In tutte, «Interrogare» ha la domanda «Su quale carta?» con trattamento e visibilità, e il credito compare
// sotto la didascalia quando la carta è visibile.
export default function createHistoricalUi({historical, variant = 'strato', container, panel, orient, canvas, lensCSS = 140}){
 if (!historical) return {dispose(){}};
 historical.element.hidden = true; historical.element.classList.add('is-retired');
 let on = true, remembered = Math.max(.35, historical.opacity || 1);
 const button = html`<button type="button" class=${variant === 'cornice' ? 'ctl historical-toggle' : 'sheet-pad-narrative historical-toggle'} aria-pressed="true" data-legend="historical">${it.historicalToggle}${variant === 'cornice' ? '' : html`<small>${variant === 'lente' ? it.historicalLensHint : it.historicalToggleHint}</small>`}</button>`;
 // Il cursore della visibilità sta nello stesso comando che accende la carta: compare a carta accesa, sparisce
 // a carta spenta, così comparsa e scomparsa si misurano nello stesso punto.
 const slider = html`<input class="ctl-range historical-slider" type="range" min="0" max="100" step="1" data-legend="historical" aria-label=${it.historicalSlider}>`;
 const toggle = html`<div class="historical-control" data-variant=${variant}>${button}${slider}</div>`;
 const names = {tenue: it.historicalTreatments.tenue, leggibile: it.historicalTreatments.leggibile, minimo: it.historicalTreatments.minimo};
 const treatments = html`<span class="ctl-pair historical-treatments" role="group" aria-label=${it.historicalTreatmentLabel}>${historical.treatments.map(t => html`<button type="button" class="ctl" data-treatment=${t} data-legend="historical">${names[t] || t}</button>`)}</span>`;
 const section = html`<section class="historical-section"><h3>${it.historicalQuestion}</h3><div class="ctl-row">${treatments}</div></section>`;
 // Con la carta accesa il fondo di orientamento è spento, ma il contorno di Roma (OpenStreetMap) resta: la sua
 // attribuzione accompagna il credito della carta.
 const credit = html`<p class="historical-credit" hidden>${it.historicalCredit} · ${it.osmCredit}</p>`;
 panel?.querySelector('.atlas-controls')?.append(section);
 container.append(credit);
 // Lo strato sta sotto la Bussola, dopo i luoghi narrativi; nella cornice prima di «Interrogare».
 const place = () => {
  if (variant === 'cornice') { orient.prepend(toggle); return; }
  const pad = container.querySelector('.sheet-pad'); if (pad && !pad.contains(toggle)) pad.append(toggle);
 };
 place();
 function render(){
  button.setAttribute('aria-pressed', String(on)); slider.hidden = !on;
  for (const b of treatments.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.treatment === historical.treatment));
  slider.value = String(Math.round((on ? historical.opacity : 0) * 100));
  credit.hidden = !on || historical.failed;
  section.hidden = historical.failed;
 }
 button.onclick = () => {
  on = !on;
  if (variant === 'lente') historical.setLens(on ? {x: canvas.clientWidth / 2, y: canvas.clientHeight / 2, r: lensCSS} : null);
  if (on) historical.setOpacity(remembered); else { remembered = historical.opacity || remembered; historical.setOpacity(0); }
  render();
 };
 treatments.onclick = e => { const b = e.target.closest('[data-treatment]'); if (b) { historical.setTreatment(b.dataset.treatment); render(); } };
 // Portare il cursore a zero spegne la carta: il cursore sparisce e il comando torna a «Carta 1925» spenta.
 slider.oninput = () => { const v = +slider.value / 100; if (v > 0) remembered = v; historical.setOpacity(v); if (v === 0) { on = false; render(); button.focus(); } };
 // Lente: segue il puntatore e il dito sul canvas.
 const follow = e => { if (variant !== 'lente' || !on) return; const r = canvas.getBoundingClientRect(); historical.setLens({x: e.clientX - r.left, y: e.clientY - r.top, r: lensCSS}); };
 canvas.addEventListener('pointermove', follow);
 if (variant === 'lente') { on = false; historical.setOpacity(0); }
 render();
 return {toggle, section, credit, place, dispose(){ canvas.removeEventListener('pointermove', follow); toggle.remove(); section.remove(); credit.remove(); }};
}
