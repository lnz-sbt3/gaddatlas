import {html} from 'htl';
import it from '../strings-it.js';

// Cornice della pagina, in due sponde. A sinistra si legge: marchio e, sotto, i comandi di aiuto («Come si
// legge», «Orientarsi»). A destra si agisce: «Indice dei luoghi» e «Interrogare» in alto, e sotto il suo comando
// il pannello «Interrogare la figura», che non è modale: la figura resta visibile mentre si sceglie personaggio,
// capitolo o vista. L'ordine nel documento è l'ordine di tabulazione: intestazione e pannello prima della figura.
export default function createFrame({container, controls, orient, index, canvas}){
 const wordmark = html`<p class="frame-wordmark">${it.title}<small>${it.subtitle}</small></p>`;
 const ask = html`<button type="button" class="ctl" aria-expanded="false" aria-controls="frame-panel">${it.ask}</button>`;
 const close = html`<button type="button" class="ctl">${it.backToFigure}</button>`;
 const panel = html`<section id="frame-panel" class="frame-panel" aria-labelledby="frame-panel-title" hidden>
  <div class="frame-panel-head">${close}<h2 id="frame-panel-title">${it.askTitle}</h2></div>${controls}</section>`;
 index.className = 'ctl ctl-primary frame-index'; index.textContent = it.placeIndex; index.dataset.legend = 'index';
 const help = html`<div class="frame-help" role="group" aria-label=${it.helpGroup}>${orient}</div>`;
 const top = html`<div class="frame-orient" role="group" aria-label=${it.toolsGroup}>${index}${ask}</div>`;
 // Segni di registro agli angoli della figura, come su una tavola stampata: delimitano senza un secondo filo.
 const marks = html`<div class="frame-marks" aria-hidden="true"><i></i><i></i><i></i><i></i></div>`;
 container.prepend(wordmark, help, top, panel); container.append(marks);
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
 // Quando il pannello cambia altezza (nastro delle pagine, sezioni che compaiono) il comando in uso resta in vista.
 const keepInView = new ResizeObserver(() => { const s = panel.contains(document.activeElement) && document.activeElement.closest('section'); if (s) s.scrollIntoView({block: 'nearest'}); });
 keepInView.observe(panel); keepInView.observe(container);
 function setOpen(open){
  panel.hidden = !open; ask.setAttribute('aria-expanded', String(open));
  if (open) close.focus(); else ask.focus();
 }
 ask.onclick = () => setOpen(panel.hidden);
 close.onclick = () => setOpen(false);
 panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); } });
 return {panel, help, dispose(){ resize.disconnect(); keepInView.disconnect(); help.remove(); window.removeEventListener('resize', onResize); marks.remove(); wordmark.remove(); top.remove(); panel.remove(); }};
}
