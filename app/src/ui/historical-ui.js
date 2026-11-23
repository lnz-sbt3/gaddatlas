import {html} from 'htl';
import it from '../strings-it.js';

// Carta storica nel guscio (solo dove esiste la carta locale). Il comando è un solo cursore, sempre
// visibile: a un'estremità la resa geometrica (tessere e tracce di orientamento), all'altra la carta
// del 1925. Nessun interruttore: a zero resta soltanto la resa geometrica. La posizione vive
// nell'indirizzo come «carta» (onCommit la pubblica al rilascio). Varianti (HISTORICAL_UI.variant):
// 'strato' sotto la ghiera, 'cornice' fra i comandi in alto, 'lente' in riserva (segue il puntatore).
export default function createHistoricalUi({historical, variant = 'strato', container, panel, orient, canvas, lensCSS = 140, onCommit = () => {}}){
 if (!historical) return {dispose(){}};
 historical.element.hidden = true; historical.element.classList.add('is-retired');
 const title = html`<p class="historical-title">${it.historicalToggle}<small>${it.historicalToggleHint}</small></p>`;
 const slider = html`<input class="ctl-range historical-slider" type="range" min="0" max="100" step="1" data-legend="historical" aria-label=${it.historicalSlider}>`;
 const poles = html`<div class="historical-poles" aria-hidden="true"><span>${it.historicalPoleTiles}</span><span>${it.historicalPoleMap}</span></div>`;
 const toggle = html`<div class="historical-control" data-variant=${variant}>${title}${slider}${poles}</div>`;
 // Con la carta visibile il fondo di orientamento è spento, ma il contorno di Roma (OpenStreetMap) resta:
 // la sua attribuzione accompagna il credito della carta.
 const credit = html`<p class="historical-credit" hidden>${it.historicalCredit} · ${it.osmCredit}</p>`;
 container.append(credit);
 // Lo strato sta sotto la ghiera, dopo i luoghi narrativi; nella cornice prima di «Interrogare».
 const place = () => {
  if (variant === 'cornice') { orient.prepend(toggle); return; }
  const pad = container.querySelector('.view-layers'); if (pad && !pad.contains(toggle)) pad.append(toggle);
 };
 place();
 function render(){
  const value = Math.round((historical.opacity ?? 0) * 100);
  slider.value = String(value);
  // Da tastiera la posizione si annuncia con i nomi dei poli, non con il numero nudo.
  slider.setAttribute('aria-valuetext', value === 0 ? it.historicalPoleTiles
   : value === 100 ? it.historicalPoleMap
   : `${value} su 100 verso ${it.historicalPoleMap}`);
  credit.hidden = !(historical.opacity > 0) || historical.failed;
  toggle.hidden = historical.failed;
 }
 slider.oninput = () => { historical.setOpacity(+slider.value / 100); render(); };
 // L'indirizzo si aggiorna al rilascio, non a ogni passo del trascinamento.
 slider.onchange = () => onCommit();
 // Lente (riserva): segue il puntatore e il dito sul canvas.
 const follow = e => { if (variant !== 'lente') return; const r = canvas.getBoundingClientRect(); historical.setLens({x: e.clientX - r.left, y: e.clientY - r.top, r: lensCSS}); };
 canvas.addEventListener('pointermove', follow);
 render();
 return {toggle, credit, place, sync: render, dispose(){ canvas.removeEventListener('pointermove', follow); toggle.remove(); credit.remove(); }};
}
