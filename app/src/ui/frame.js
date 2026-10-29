import {html} from 'htl';
import it from '../strings-it.js';

// Cornice della pagina: marchio in alto a sinistra, «Orientarsi» e «Interrogare» in alto a
// destra, indice dei luoghi in basso a destra. I comandi dell'atlante passano nel pannello «Interrogare la
// figura», che non è modale: la figura resta visibile mentre si sceglie personaggio, capitolo o vista.
export default function createFrame({container, controls, orient, index, canvas}){
 const wordmark = html`<p class="frame-wordmark">${it.title}<small>${it.subtitle}</small></p>`;
 const ask = html`<button type="button" class="ctl" aria-expanded="false" aria-controls="frame-panel">${it.ask}</button>`;
 const close = html`<button type="button" class="ctl">${it.backToFigure}</button>`;
 const panel = html`<section id="frame-panel" class="frame-panel" aria-labelledby="frame-panel-title" hidden>
  <div class="frame-panel-head">${close}<h2 id="frame-panel-title">${it.askTitle}</h2></div>${controls}</section>`;
 const top = html`<div class="frame-orient">${orient}${ask}</div>`;
 index.className = 'ctl ctl-primary frame-index'; index.textContent = it.placeIndex; index.dataset.legend = 'index';
 // Segni di registro agli angoli della figura, come su una tavola stampata: delimitano senza un secondo filo.
 const marks = html`<div class="frame-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
 container.append(marks, wordmark, top, panel, index);
 const fit = () => {
  // A tutto schermo il riquadro della figura è pubblicato dal renderer; con l'inquadratura 'riquadro' è il canvas.
  const box = canvas.dataset.box?.split(',').map(Number);
  const [left, top, width, height] = box || [canvas.offsetLeft, canvas.offsetTop, canvas.offsetWidth, canvas.offsetHeight];
  Object.assign(marks.style, {left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`});
  // Il riquadro reale della figura, per chi deve registrarsi sul suo filo (regolo e banda della Frattura).
  for (const [k, v] of [['left', left], ['top', top], ['right', left + width], ['bottom', top + height]]) container.style.setProperty(`--canvas-${k}`, `${v}px`);
 };
 const resize = new ResizeObserver(fit); resize.observe(canvas); resize.observe(container); fit();
 // Due fotogrammi: il canvas si rimisura nel primo, i segni lo seguono nel secondo.
 const onResize = () => requestAnimationFrame(() => requestAnimationFrame(fit)); window.addEventListener('resize', onResize);
 function setOpen(open){
  panel.hidden = !open; ask.setAttribute('aria-expanded', String(open));
  if (open) close.focus(); else ask.focus();
 }
 ask.onclick = () => setOpen(panel.hidden);
 close.onclick = () => setOpen(false);
 panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); } });
 return {panel, dispose(){ resize.disconnect(); window.removeEventListener('resize', onResize); marks.remove(); wordmark.remove(); top.remove(); panel.remove(); }};
}
