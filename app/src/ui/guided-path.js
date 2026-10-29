import {html} from 'htl';
import it from '../strings-it.js';

// Frattura: percorso guidato facoltativo sullo stesso motore del foglio. Ogni passo porta la vista in uno
// stato citabile e seleziona un luogo documentato; le didascalie descrivono l'operazione, non il testo.
// Il lettore interrompe con qualunque presa sull'atlante, riavvolge, riprende o esce in ogni momento.
export const FRATTURA_STEPS = [
 {id: 'mappa', state: {view: 'map', axon: 0, narrative: 0}, place: 'gaz_via_merulana'},
 {id: 'relazioni', state: {view: 'diagram', axon: 0, narrative: 0}, place: 'gaz_via_merulana'},
 {id: 'narrativi', state: {view: 'diagram', axon: 0, narrative: 1}, place: 'palazzo_219'},
 {id: 'rilievo', state: {view: 'diagram', axon: 1, narrative: 1}, place: 'gaz_due_santi'},
 {id: 'rilievoMappa', state: {view: 'map', axon: 1, narrative: 0}, place: 'gaz_castel_savello'},
 {id: 'trasformato', state: {view: 'diagram', axon: 0, narrative: 1}, place: 'robine_vecchie'},
];

export default function createGuidedPath({container, steps = FRATTURA_STEPS, stepMs, reducedMotion, go, onExit = () => {}}){
 const entry = html`<button type="button" class="frattura-entry">${it.tourStart}</button>`;
 const counter = html`<p class="frattura-counter"></p>`, title = html`<h2 id="frattura-title"></h2>`, text = html`<p class="frattura-text"></p>`, status = html`<p class="frattura-status" role="status"></p>`;
 const back = html`<button type="button">${it.tourBack}</button>`, toggle = html`<button type="button"></button>`, next = html`<button type="button">${it.tourNext}</button>`, exit = html`<button type="button">${it.tourExit}</button>`;
 const panel = html`<section class="frattura" aria-labelledby="frattura-title" hidden>${counter}${title}${text}${status}<div class="frattura-controls">${back}${toggle}${next}${exit}</div></section>`;
 // L'ingresso precede il canvas nell'ordine di tabulazione, come nella lettura dall'alto a sinistra.
 container.prepend(entry); container.append(panel);
 let index = -1, playing = false, timer = null;
 const automatic = () => !reducedMotion.matches;
 function schedule(){
  clearTimeout(timer); timer = null;
  if (playing && automatic() && index < steps.length - 1) timer = setTimeout(() => show(index + 1), stepMs);
 }
 function render(){
  const step = steps[index], copy = it.tourSteps[step.id];
  counter.textContent = it.tourCounter(index + 1, steps.length); title.textContent = copy.title; text.textContent = copy.text;
  back.disabled = index === 0; next.disabled = index === steps.length - 1;
  toggle.textContent = playing ? it.tourPause : it.tourResume;
  toggle.disabled = !automatic() || (!playing && index === steps.length - 1);
  status.textContent = index === steps.length - 1 ? it.tourEnd : playing || !automatic() ? '' : it.tourPaused(index + 1);
 }
 function show(i){ index = Math.max(0, Math.min(steps.length - 1, i)); go(steps[index]); if (index === steps.length - 1) playing = false; render(); schedule(); }
 function start(){ panel.hidden = false; entry.hidden = true; playing = automatic(); show(0); toggle.focus(); }
 function pause(){ if (!playing) return; playing = false; schedule(); render(); }
 function stop(){ clearTimeout(timer); timer = null; playing = false; index = -1; panel.hidden = true; entry.hidden = false; entry.focus(); onExit(); }
 entry.onclick = start;
 back.onclick = () => show(index - 1);
 next.onclick = () => show(index + 1);
 // Riprendere riporta la vista al passo corrente, poi l'avanzamento continua.
 toggle.onclick = () => { if (playing) pause(); else { playing = true; show(index); } };
 exit.onclick = stop;
 panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); stop(); } });
 return {
  entry, panel,
  get active(){ return index >= 0; },
  get playing(){ return playing; },
  contains: node => entry.contains(node) || panel.contains(node),
  // Una presa del lettore sull'atlante sospende il percorso: la vista resta sua finché non riprende.
  interrupt(){ if (index >= 0) pause(); },
  stop,
  dispose(){ clearTimeout(timer); entry.remove(); panel.remove(); }
 };
}
