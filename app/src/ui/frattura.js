import {html} from 'htl';
import it from '../strings-it.js';

// Frattura: percorso guidato facoltativo, scritto come una colonna da scorrere. Ogni soglia porta la figura in
// uno stato citabile dello stesso motore del Foglio; una presa del lettore sulla figura sospende il percorso.
// Tre varianti:
// 'colonna' passi a pagina intera sopra la figura, titoli monumentali alternati, numerali nel margine;
// 'margine' una colonna di lettura accanto alla figura, che resta esplorabile mentre si legge;
// 'sipario' lo scorrimento tiene il passaggio fra due soglie: la figura si trasforma alla velocità del lettore.
// Sei passi, un'operazione ciascuno; il quinto è interattivo. 'state' è uno stato citabile del motore; 'place' e 'reference' aprono il passo.
export const FRATTURA_STORY = [
 {id: 'corpus', stage: 'map2d', state: {view: 'map', axon: 0, narrative: 0}},
 {id: 'polo', stage: 'diagram2d', state: {view: 'diagram', axon: 0, narrative: 0}},
 {id: 'narrativi', stage: 'diagram2d_fict', state: {view: 'diagram', axon: 0, narrative: 1}},
 {id: 'rilievo', stage: 'diagram_axon', state: {view: 'diagram', axon: 1, narrative: 1}},
 // Passo interattivo: il percorso si ferma, filtri e tessere sono del lettore; il personaggio scelto resta al passo 6.
 {id: 'prova', stage: 'diagram_axon', state: {view: 'diagram', axon: 1, narrative: 1}, interactive: true, keepFocalizer: true},
 {id: 'ritorno', stage: 'map_axon', state: {view: 'map', axon: 1, narrative: 1}, keepFocalizer: true},
];
// Uno stato del lettore corrisponde a un passo se coincidono vista, piano, narrativi (nelle relazioni) e focalizzatore.
const matches = (step, s) => step.state.view === s.view && !!step.state.axon === !!s.axon &&
 (s.view !== 'diagram' || !!step.state.narrative === !!s.narrative) && (step.keepFocalizer || (step.state.focalizer ?? null) === (s.focalizer ?? null));

export default function createFrattura({container, layout, variant = 'colonna', drive = 'scorrimento', settleMs = 420, steps = FRATTURA_STORY, reducedMotion, go, passage, onMark = () => {}, onExit = () => {}, onSuspend = () => {}}){
 // Nella colonna lo scorrimento tiene il passaggio fra due passi, come nel sipario; 'soglia' scatta al passo.
 const scrubbing = variant === 'sipario' || (variant === 'colonna' && drive === 'scorrimento');
 const copy = it.story, n = steps.length;
 const entry = html`<button type="button" class="ctl frattura-entry" aria-expanded="false" data-legend="tour">${it.tourStart}</button>`;
 const rewind = html`<button type="button" class="ctl frattura-rewind" data-legend="tour" hidden>${copy.rewind}</button>`;
 // Comandi del percorso nella cornice: aprire e chiudere, e riavvolgere mentre è aperto.
 const controls = html`<span class="frattura-controls">${rewind}${entry}</span>`;
 // Nel sipario il titolo corre su una riga; nelle altre varianti va a capo come nelle tavole.
 const title = (s, i) => { const [a, b] = copy.steps[s.id].title, h = variant === 'sipario' ? html`<h2 tabindex="-1" class="frattura-title">${a} ${b}</h2>` : html`<h2 tabindex="-1" class="frattura-title">${a}<br>${b}</h2>`; h.classList.toggle('is-first', i === 0); return h; };
 const enterButton = i => steps[i].interactive
  ? html`<span class="frattura-try"><button type="button" class="ctl frattura-ask">${copy.openAsk}</button><button type="button" class="ctl ctl-primary frattura-next">${copy.next}</button></span>`
  : html`<button type="button" class="ctl frattura-enter">${i === n - 1 ? copy.last : copy.enter}</button>`;
 const sections = steps.map((s, i) => html`<article class="frattura-step" data-step=${i}>
  <div class="frattura-copy">
   ${variant === 'margine' ? html`<p class="frattura-numeral" aria-hidden="true">${i + 1}</p>` : ''}
   ${title(s, i)}
   <p class="frattura-text">${copy.steps[s.id].text}</p>
   ${variant === 'margine' ? html`<p class="frattura-state">${copy.states[s.stage]}</p>` : ''}
   ${variant === 'colonna' ? enterButton(i) : variant === 'margine' && i === n - 1 ? enterButton(i) : ''}
   ${variant === 'margine' ? '' : html`<p class="frattura-counter">${i + 1} / ${n} · ${copy.steps[s.id].hint}</p>`}
  </div></article>`);
 const nav = html`<nav class="frattura-nav" aria-label=${copy.nav}>${steps.map((s, i) => html`<button type="button" data-step=${i} aria-label=${copy.goTo(i + 1, copy.steps[s.id].title.join(' '))}><span>${i + 1}</span></button>`)}${variant === 'sipario' ? html`<i class="frattura-marker" aria-hidden="true"></i>` : ''}</nav>`;
 const banner = html`<div class="frattura-suspended" hidden><p></p><button type="button" class="ctl">${copy.resumeHere}</button></div>`;
 const close = html`<button type="button" class="ctl frattura-close">${copy.exit}</button>`;
 const scroller = html`<div class="frattura-scroll" tabindex="-1">${variant === 'margine' ? html`<header class="frattura-head"><p>${copy.kicker}</p>${close}</header>` : ''}${sections}${variant === 'margine' ? html`<div class="frattura-tail"></div>` : ''}</div>`;
 const leave = html`<button type="button" class="ctl frattura-enter frattura-leave">${copy.enter}</button>`;
 // Sipario: i testi non scorrono sopra la figura; stanno fermi nella banda e si sostituiscono per dissolvenza.
 // Il collegamento d'uscita sta nella banda, sulla riga dei testi.
 const band = variant === 'sipario' ? html`<div class="frattura-band">${sections.map(s => s.querySelector('.frattura-copy'))}${leave}</div>` : '';
 const panel = html`<section class="frattura-story" data-variant=${variant} data-drive=${scrubbing ? 'scorrimento' : 'soglia'} aria-label=${copy.name} aria-describedby="frattura-keys" hidden><p id="frattura-keys" class="frattura-keys">${copy.keys}</p>${variant === 'margine' ? banner : ''}${scroller}${band}${nav}</section>`;
 const titles = [...panel.querySelectorAll('.frattura-title')], copies = [...panel.querySelectorAll('.frattura-copy')];
 // Segnalibro: quando il lettore prende la figura il percorso si ferma, ma soglia e titolo restano a vista.
 const bookmark = html`<aside class="frattura-bookmark" hidden><p></p><h3></h3><div class="frattura-bookmark-actions"><button type="button" class="ctl ctl-primary" data-act="resume">${copy.resumeHere}</button><button type="button" class="ctl" data-act="rewind">${copy.rewind}</button><button type="button" class="ctl" data-act="exit">${copy.exit}</button></div></aside>`;
 // La colonna di margine entra nel layout come il pannello del testo; le altre stanno sopra la figura.
 (variant === 'margine' ? layout : container).append(panel);
 if (variant !== 'margine') container.append(bookmark);
 let index = -1, active = false, suspended = false, held = null, settleTimer = 0, syncing = false, shownMark = -1;
 const reduce = () => reducedMotion.matches;
 // Aprire o chiudere il percorso cambia i margini della figura: il canvas si rimisura.
 const relayout = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
 const stepHeight = () => sections[1].offsetTop - sections[0].offsetTop;

 function mark(i){
  markCopy(i);
  for (const b of nav.querySelectorAll('button')) b.toggleAttribute('aria-current', Number(b.dataset.step) === i);
  const p = banner.querySelector('p'); p.textContent = copy.suspended(i + 1);
 }
 // Testi della soglia: nel sipario cambiano a metà strada; il numerale solo a soglia raggiunta.
 function markCopy(i){
  // Solo il passo corrente è raggiungibile da tastiera e al tocco: gli altri sono inerti finché non diventano correnti.
  // Il fuoco che stava nella colonna segue il passo corrente, prima che il passo lasciato diventi inerte.
  const hadFocus = panel.contains(document.activeElement) && !nav.contains(document.activeElement);
  if (hadFocus && titles[i]) titles[i].focus({preventScroll: true});
  for (const s of sections) { const on = Number(s.dataset.step) === i; s.classList.toggle('is-current', on); s.inert = variant !== 'margine' && !on; }
  copies.forEach((c, k) => c.classList.toggle('is-current', k === i));
 }
 function show(i){
  if (i === index && !suspended) return;
  index = i; mark(i); nav.style.setProperty('--progress', String(i / (n - 1)));
  if (!held) go(steps[i]);
 }
 function scrollTo(i, smooth = !reduce()){
  // Durante uno scorrimento comandato la figura non viene trattenuta: la soglia è già decisa.
  syncing = true; clearTimeout(scrollTo.timer);
  scroller.scrollTo({top: sections[i].offsetTop - sections[0].offsetTop, behavior: smooth ? 'smooth' : 'instant'});
  scrollTo.timer = setTimeout(() => { syncing = false; }, smooth ? 900 : 200);
 }
 // Colonna e margine: la soglia che attraversa la linea di lettura diventa la soglia corrente.
 const observer = new IntersectionObserver(entries => {
  if (!active || suspended || scrubbing) return;
  for (const e of entries) if (e.isIntersecting) show(Number(e.target.dataset.step));
 }, {root: scroller, rootMargin: variant === 'margine' ? '-35% 0px -60% 0px' : '-50% 0px -50% 0px'});
 if (!scrubbing) for (const s of sections) observer.observe(s);

 // Sipario: fra due soglie il passaggio è trattenuto alla frazione di scorrimento; al riposo si completa.
 function scrub(){
  if (!active || suspended || syncing) return;
  const pos = Math.max(0, Math.min(n - 1, scroller.scrollTop / Math.max(1, stepHeight())));
  // Regolo, banda, foglio e didascalia cambiano insieme, a metà strada fra due soglie.
  const near = Math.round(pos); nav.style.setProperty('--progress', String(pos / (n - 1)));
  if (near !== shownMark) { shownMark = near; markCopy(near); onMark(steps[near]); }
  clearTimeout(settleTimer); settleTimer = setTimeout(settle, settleMs);
  // Con movimento ridotto non si tiene il passaggio: la figura salta alla soglia quando il lettore si ferma.
  if (reduce()) return;
  const a = Math.min(n - 2, Math.floor(pos)), f = pos - a;
  if (held && held.a !== a) { passage.end(0); held = null; }
  if (!held && f > .01 && f < .99) {
   const from = passage.stage === steps[a + 1].stage ? a + 1 : a, target = from === a ? a + 1 : a;
   // La presa è dichiarata prima di chiederla: la pubblicazione che ne segue lascia ferma la didascalia.
   held = {a, target}; if (!passage.holdToward(steps[target].stage)) held = null;
  }
  if (held) passage.seek(held.target === a + 1 ? f : 1 - f);
 }
 function settle(){
  if (syncing) { settleTimer = setTimeout(settle, settleMs); return; }
  const pos = scroller.scrollTop / Math.max(1, stepHeight()), i = Math.round(pos);
  if (held) { passage.end(0); held = null; }
  // Quando il lettore si ferma, figura e testo si assestano sulla soglia più vicina.
  const k = Math.max(0, Math.min(n - 1, i)); index = -1; show(k);
  if (Math.abs(pos - k) > .01) scrollTo(k);
 }
 if (scrubbing) scroller.addEventListener('scroll', scrub, {passive: true});

 function start(){
  active = true; suspended = false; panel.hidden = false; panel.classList.remove('is-suspended'); banner.hidden = true;
  entry.setAttribute('aria-expanded', 'true'); entry.textContent = copy.exit; rewind.hidden = false; container.classList.add('is-story'); bookmark.hidden = true;
  const i = Math.max(0, index); index = -1; show(i); relayout();
  // La colonna si misura dopo essere comparsa: lo scorrimento al passo aspetta il fotogramma successivo.
  requestAnimationFrame(() => { scrollTo(i, false); titles[i].focus({preventScroll: true}); });
 }
 function suspend(){
  if (!active || suspended) return;
  suspended = true; if (held) { passage.end(0); held = null; }
  if (variant === 'margine') { banner.hidden = false; panel.classList.add('is-suspended'); onSuspend(); return; }
  panel.hidden = true; container.classList.remove('is-story');
  entry.setAttribute('aria-expanded', 'false'); entry.textContent = it.tourStart; rewind.hidden = true;
  bookmark.querySelector('p').textContent = copy.bookmark(index + 1, n); bookmark.querySelector('h3').textContent = copy.steps[steps[index].id].title.join(' '); bookmark.hidden = false; relayout();
  onSuspend();
 }
 function resume(){ suspended = false; banner.hidden = true; panel.classList.remove('is-suspended'); const i = index; index = -1; show(i); }
 function stop(){
  active = false; suspended = false; if (held) { passage.end(0); held = null; }
  panel.hidden = true; bookmark.hidden = true; container.classList.remove('is-story'); entry.setAttribute('aria-expanded', 'false'); entry.textContent = it.tourStart; rewind.hidden = true; index = -1; relayout();
  onExit();
 }
 entry.onclick = () => { if (active && !suspended) { stop(); entry.focus(); } else start(); };
 close.onclick = () => { stop(); entry.focus(); };
 banner.querySelector('button').onclick = resume;
 // Riavvolgere riporta al primo passo, con la sua transizione; dal segnalibro riapre il percorso dal principio.
 function toFirst(){ if (!active || suspended) { index = 0; start(); } else { show(0); scrollTo(0); } }
 rewind.onclick = toFirst;
 bookmark.addEventListener('click', e => { const a = e.target.closest('[data-act]')?.dataset.act; if (a === 'resume') start(); else if (a === 'rewind') toFirst(); else if (a === 'exit') { stop(); entry.focus(); } });
 // Tastiera nella colonna: un passo per volta, come lo scorrimento; Inizio e Fine agli estremi.
 // Esc e i passi da tastiera valgono finché il percorso guida, anche con il fuoco sui suoi comandi nella cornice.
 const onDocKey = e => {
  if (!active || suspended || e.defaultPrevented) return;
  const inside = panel.contains(e.target) || controls.contains(e.target);
  if (e.key === 'Escape' && (inside || e.target === document.body)) { e.preventDefault(); stop(); entry.focus(); }
  else if ((e.target === document.body || (inside && !panel.contains(e.target))) && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(e.key)) { e.preventDefault(); scroller.dispatchEvent(new KeyboardEvent('keydown', {key: e.key, bubbles: true})); }
 };
 document.addEventListener('keydown', onDocKey);
 const here = () => Math.max(0, Math.min(n - 1, Math.round(scroller.scrollTop / Math.max(1, stepHeight()))));
 scroller.addEventListener('keydown', e => {
  const k = {ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1}[e.key], target = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : k ? here() + k : null;
  if (target == null || variant === 'margine') return;
  e.preventDefault(); const i = Math.max(0, Math.min(n - 1, target)); show(i); scrollTo(i);
 });
 // Scorrere di nuovo la colonna di margine riprende il percorso.
 if (variant === 'margine') scroller.addEventListener('wheel', () => { if (suspended) resume(); }, {passive: true});
 nav.addEventListener('click', e => { const b = e.target.closest('button[data-step]'); if (!b) return; const i = Number(b.dataset.step); show(i); scrollTo(i); });
 panel.addEventListener('click', e => {
  if (e.target.closest('.frattura-enter')) { stop(); container.querySelector('canvas')?.focus(); }
  else if (e.target.closest('.frattura-next')) { const i = Math.min(n - 1, here() + 1); show(i); scrollTo(i); }
  else if (e.target.closest('.frattura-ask')) container.querySelector('.frame-orient .ctl[aria-controls="frame-panel"]')?.click();
 });
 panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); entry.focus(); } });
 // La Bussola sposta la figura mentre il percorso è fermo: il segnalibro segue il passo che coincide con lo stato.
 function sync(state){
  if (!active || !suspended) return;
  let best = -1;
  steps.forEach((step, k) => { if (matches(step, state) && (best < 0 || Math.abs(k - index) < Math.abs(best - index))) best = k; });
  if (best < 0 || best === index) return;
  index = best; mark(best);
  bookmark.querySelector('p').textContent = copy.synced(best + 1, n); bookmark.querySelector('h3').textContent = copy.steps[steps[best].id].title.join(' ');
 }
 // Apertura da un indirizzo con il passo: stessa apertura del comando, al passo indicato.
 function open(i){ index = Math.max(0, Math.min(n - 1, i)); start(); }
 return {
  entry: controls, panel, sync, open,
  get step(){ return active && !suspended && index >= 0 ? index + 1 : null; },
  // Al passo interattivo filtri e tessere non sospendono il percorso.
  get interactive(){ return active && !suspended && !!steps[index]?.interactive; },
  get active(){ return active && !suspended; },
  get playing(){ return active && !suspended; },
  get holding(){ return !!held; },
  contains: node => controls.contains(node) || panel.contains(node) || bookmark.contains(node),
  interrupt: suspend,
  stop,
  dispose(){ document.removeEventListener('keydown', onDocKey); observer.disconnect(); clearTimeout(settleTimer); controls.remove(); panel.remove(); bookmark.remove(); container.classList.remove('is-story'); }
 };
}
