import {html} from 'htl';
import it from '../strings-it.js';

// Pannello dei testi agganciabile. Tre posizioni: agganciato a sinistra (iniziale), a destra (iniziale dove la
// figura è inquadrata a sinistra), oppure libero. Si sposta trascinando la testata o con i comandi della testata;
// si ridimensiona dai bordi o con «Allarga» e «Riduci». Regole di precedenza:
// - non copre mai gli strumenti della vista (ghiera e strati) né il pannello «Interrogare»: se ci finisce sopra
//   si sposta di lato, e solo se non c'è posto si accorcia;
// - durante il percorso guidato cede la sponda sinistra alla colonna, che è legata all'inquadratura della
//   figura e non può spostarsi: il pannello passa a destra e torna al suo posto quando il percorso si chiude;
// - cede la sponda sinistra anche alla nota di legenda quando il lettore la chiede con «Come si legge»;
// - resta sempre dentro la finestra e sopra la riga dei crediti.
// In verticale è un foglio dal basso, accanto alla ghiera, con l'altezza regolabile a scatti.
export default function createTextDock({panel, layout, figure, tokens: T, reducedMotion, storageKey = 'gaddatlas:text-dock'}){
 const L = it.dock, header = panel.querySelector('header'), close = header.querySelector('button');
 const portrait = matchMedia('(max-aspect-ratio: 1/1)'), narrow = matchMedia('(max-width: 1100px)');
 const button = (act, glyph) => html`<button type="button" class="ctl ctl-icon" data-dock=${act}>${glyph}</button>`;
 const toLeft = button('left', '←'), toRight = button('right', '→'), smaller = button('narrower', '−'), larger = button('wider', '+'), reset = button('reset', '↺');
 const group = html`<div class="text-dock-tools" role="group" aria-label=${L.group}>${toLeft}${toRight}${smaller}${larger}${reset}</div>`;
 const bar = html`<div class="text-dock-bar">${group}</div>`;
 const status = html`<p class="text-dock-status" role="status"></p>`;
 header.prepend(bar); bar.append(close); header.append(status);
 const grips = ['e', 'w', 'se'].map(edge => html`<div class="text-dock-grip" data-edge=${edge} aria-hidden="true"></div>`);
 panel.append(...grips);

 // Scelte del lettore, ricordate per la visita: posizione, misure, scatto del foglio.
 let state = {};
 try { state = JSON.parse(sessionStorage.getItem(storageKey) || '{}') || {}; } catch { state = {}; }
 const save = () => { try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* senza memoria della visita vale la singola pagina */ } };
 let ceded = false, dragging = null, frame = 0, last = null;
 const clamp = (v, a, b) => Math.max(a, Math.min(Math.max(a, b), v));
 const rectOf = sel => { const e = figure.querySelector(sel); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility === 'visible' ? r : null; };
 const hits = (a, b, gap = 0) => b && a.x < b.right + gap && a.x + a.w > b.left - gap && a.y < b.bottom + gap && a.y + a.h > b.top - gap;
 const reserve = () => parseFloat(getComputedStyle(document.body).getPropertyValue('--credit-reserve')) || 44;
 const defaultMode = () => narrow.matches ? 'right' : 'left';
 const story = () => figure.classList.contains('is-story');
 // Posizione effettiva: quella indicata dal lettore, salvo le cessioni della sponda sinistra.
 const mode = () => { const m = state.mode || defaultMode(); return m === 'left' && (ceded || story()) ? 'right' : m; };

 function compute(){
  const W = innerWidth, H = innerHeight, G = T.gap, base = reserve();
  if (portrait.matches) {
   // Foglio dal basso: lascia libera la ghiera, a destra, e la riga dei crediti.
   // Con «Interrogare» aperto il foglio non sale oltre lo scatto di mezzo: il pannello gli sta sopra.
   const dial = rectOf('.incisa'), top = rectOf('.frame-panel') ? Math.min(1, T.sheetSnaps.length - 1) : T.sheetSnaps.length - 1, snap = clamp(state.snap ?? T.sheetInitial, 0, top), h = Math.round(T.sheetSnaps[snap] * H);
   const w = dial && dial.bottom > H - base - h ? Math.max(T.minWidth, dial.left - G) : W;
   return {dock: 'sheet', x: 0, y: H - base - h, w, h, snap};
  }
  const tools = rectOf('.view-dock'), ask = rectOf('.frame-panel'), help = rectOf('.frame-help'), orient = rectOf('.frame-orient');
  const w = Math.round(clamp(state.w ?? Math.min(T.width, W * T.widthShare), T.minWidth, W * T.maxWidthShare)), m = mode();
  if (m === 'left') { const y = Math.round((help ? help.bottom : 0) + G); return {dock: 'left', x: 0, y, w, h: H - base - y}; }
  if (m === 'right') {
   // Accanto a «Interrogare» se è aperto; sopra gli strumenti della vista, o al loro fianco se resterebbe troppo basso.
   const y = Math.round((orient ? orient.bottom : 0) + G + 4);
   let x = W - w - (ask ? W - ask.left + G : 0), h = H - base - y, width = w;
   if (x < 0) { width = Math.max(T.minWidth, w + x); x = Math.max(0, W - width - (ask ? W - ask.left + G : 0)); }
   if (tools && x + width > tools.left - G) { const above = tools.top - G - y; if (above >= T.minHeight) h = above; else x = Math.max(0, tools.left - G - width); }
   return {dock: 'right', x: Math.round(x), y, w: width, h: Math.round(h)};
  }
  // Libero: dentro la finestra; se tocca un ostacolo scivola di lato, e solo in mancanza di posto sale o si accorcia.
  let h = Math.round(clamp(state.h ?? H * T.floatHeightShare, T.minHeight, Math.min(H * T.maxHeightShare, H - base)));
  let x = clamp(state.x ?? (W - w) / 2, 0, W - w), y = clamp(state.y ?? (H - h) / 2, 0, H - base - h);
  for (const ob of [tools, ask]) {
   if (!hits({x, y, w, h}, ob, G - 1)) continue;
   const left = ob.left - G - w, right = ob.right + G, options = [left >= 0 ? left : null, right <= W - w ? right : null].filter(v => v != null);
   if (options.length) x = options.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
   else if (ob.top - G - T.minHeight >= 0) { h = Math.min(h, ob.top - G); y = Math.max(0, ob.top - G - h); h = ob.top - G - y; }
   else y = Math.min(H - base - h, ob.bottom + G);
  }
  return {dock: 'float', x: Math.round(x), y: Math.round(y), w, h};
 }

 const duration = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--t-turn')) || 380;
 function apply(box, animate){
  const before = animate && last && !reducedMotion.matches ? panel.getBoundingClientRect() : null;
  Object.assign(panel.style, {left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px`, right: 'auto', bottom: 'auto'});
  panel.dataset.dock = box.dock; layout.dataset.testi = box.dock;
  layout.style.setProperty('--text-sheet', box.dock === 'sheet' ? `${box.h + reserve()}px` : '0px');
  const sheet = box.dock === 'sheet';
  toLeft.hidden = toRight.hidden = sheet;
  toLeft.setAttribute('aria-pressed', String(box.dock === 'left')); toRight.setAttribute('aria-pressed', String(box.dock === 'right'));
  for (const [b, label, glyph] of [[toLeft, L.left, '←'], [toRight, L.right, '→'], [smaller, sheet ? L.shorter : L.narrower, sheet ? '↓' : '−'], [larger, sheet ? L.taller : L.wider, sheet ? '↑' : '+'], [reset, L.reset, '↺']]) { b.setAttribute('aria-label', label); b.title = label; b.textContent = glyph; }
  smaller.disabled = sheet ? box.snap === 0 : box.w <= T.minWidth; larger.disabled = sheet ? box.snap === T.sheetSnaps.length - 1 : box.w >= Math.floor(innerWidth * T.maxWidthShare);
  if (!last || last.dock !== box.dock) status.textContent = L.state[box.dock];
  // Aggancio: il pannello arriva al suo posto dal punto in cui era; mai con movimento ridotto né da tastiera.
  if (before) { const dx = before.left - box.x, dy = before.top - box.y; if (Math.abs(dx) + Math.abs(dy) > 2) panel.animate([{transform: `translate(${dx}px, ${dy}px)`}, {transform: 'none'}], {duration: duration(), easing: 'cubic-bezier(.16, 1, .3, 1)'}); }
  last = box;
 }
 function place(animate = false){
  if (panel.hidden) { delete layout.dataset.testi; layout.style.removeProperty('--text-sheet'); last = null; ceded = false; return; }
  apply(compute(), animate);
 }
 const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (!dragging) place(); }); };

 // Comandi della testata: l'alternativa da tastiera al trascinamento.
 group.addEventListener('click', event => {
  const act = event.target.closest('[data-dock]')?.dataset.dock; if (!act) return;
  const sheet = portrait.matches, W = innerWidth, width = last?.w ?? T.width;
  if (act === 'left' || act === 'right') { state.mode = act; ceded = false; }
  else if (act === 'reset') { state = {}; ceded = false; }
  else if (sheet) state.snap = clamp((state.snap ?? T.sheetInitial) + (act === 'wider' ? 1 : -1), 0, T.sheetSnaps.length - 1);
  else state.w = clamp(width + (act === 'wider' ? T.step : -T.step), T.minWidth, W * T.maxWidthShare);
  save(); place(event.detail > 0);
 });
 header.addEventListener('dblclick', event => { if (event.target.closest('button, a')) return; state = {}; ceded = false; save(); place(true); });

 // Trascinamento dalla testata e ridimensionamento dai bordi. Il puntatore resta catturato dal pannello: nessun
 // evento raggiunge la figura.
 function begin(event, kind, edge){
  if (event.button > 0 || !last) return;
  event.preventDefault(); event.stopPropagation();
  const target = event.currentTarget; target.setPointerCapture(event.pointerId);
  dragging = {kind, edge, id: event.pointerId, px: event.clientX, py: event.clientY, box: {...last}, moved: false};
  panel.dataset.dragging = kind;
  const move = e => {
   if (!dragging || e.pointerId !== dragging.id) return;
   const d = dragging, dx = e.clientX - d.px, dy = e.clientY - d.py, W = innerWidth, H = innerHeight, base = reserve(), b = d.box;
   if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
   if (!d.moved) return;
   if (d.box.dock === 'sheet') {
    // Il foglio segue il dito in altezza e al rilascio si ferma sullo scatto più vicino.
    const h = clamp(b.h - dy, T.sheetSnaps[0] * H, T.sheetSnaps.at(-1) * H); d.h = h;
    Object.assign(panel.style, {top: `${H - base - h}px`, height: `${h}px`}); return;
   }
   if (d.kind === 'move') { d.x = clamp(b.x + dx, 0, W - b.w); d.y = clamp(b.y + dy, 0, H - base - Math.min(b.h, H * T.maxHeightShare)); Object.assign(panel.style, {left: `${d.x}px`, top: `${d.y}px`}); return; }
   const maxW = W * T.maxWidthShare, maxH = Math.min(H * T.maxHeightShare, H - base - b.y);
   if (d.edge === 'w') { d.w = clamp(b.w - dx, T.minWidth, Math.min(maxW, b.x + b.w)); d.x = b.x + b.w - d.w; Object.assign(panel.style, {left: `${d.x}px`, width: `${d.w}px`}); }
   else { d.w = clamp(b.w + dx, T.minWidth, Math.min(maxW, W - b.x)); panel.style.width = `${d.w}px`; if (d.edge === 'se') { d.h = clamp(b.h + dy, T.minHeight, maxH); panel.style.height = `${d.h}px`; } }
  };
  const end = e => {
   if (!dragging || e.pointerId !== dragging.id) return;
   const d = dragging, W = innerWidth, H = innerHeight; dragging = null; delete panel.dataset.dragging;
   target.removeEventListener('pointermove', move); target.removeEventListener('pointerup', end); target.removeEventListener('pointercancel', end);
   if (d.moved && e.type !== 'pointercancel') {
    if (d.box.dock === 'sheet') { const share = (d.h ?? d.box.h) / H; state.snap = T.sheetSnaps.reduce((best, s, i) => Math.abs(s - share) < Math.abs(T.sheetSnaps[best] - share) ? i : best, 0); }
    else if (d.kind === 'move') {
     // Vicino a un bordo il pannello si aggancia; altrove resta libero, con l'altezza dei pannelli liberi.
     if (d.x <= T.snapEdge) state.mode = 'left'; else if (d.x + d.box.w >= W - T.snapEdge) state.mode = 'right';
     else { if (d.box.dock !== 'float') state.h = Math.min(d.box.h, H * T.floatHeightShare); state.mode = 'float'; state.x = d.x; state.y = d.y; }
     ceded = false;
    } else { state.w = d.w ?? d.box.w; if (d.box.dock === 'float') { if (d.x != null) state.x = d.x; if (d.h != null) state.h = d.h; } }
    save();
   }
   place(d.moved);
  };
  target.addEventListener('pointermove', move); target.addEventListener('pointerup', end); target.addEventListener('pointercancel', end);
 }
 header.addEventListener('pointerdown', event => { if (!event.target.closest('button, a, summary')) begin(event, 'move'); });
 for (const grip of grips) grip.addEventListener('pointerdown', event => begin(event, 'resize', grip.dataset.edge));

 // Tutto ciò che cambia lo spazio disponibile rimette il pannello al suo posto.
 const observer = new MutationObserver(schedule);
 observer.observe(panel, {attributes: true, attributeFilter: ['hidden']});
 observer.observe(figure, {attributes: true, attributeFilter: ['class']});
 const askPanel = figure.querySelector('.frame-panel'); if (askPanel) observer.observe(askPanel, {attributes: true, attributeFilter: ['hidden']});
 const sizes = new ResizeObserver(schedule);
 for (const sel of ['.frame-panel', '.view-dock', '.frame-help', '.frame-orient']) { const e = figure.querySelector(sel); if (e) sizes.observe(e); }
 window.addEventListener('resize', schedule);
 for (const q of [portrait, narrow]) q.addEventListener('change', schedule);
 place();
 return {
  get side(){ return panel.hidden ? null : last?.dock ?? null; },
  // La sponda sinistra passa a chi la chiede: il pannello, che può muoversi, va a destra finché resta aperto.
  cede(){ if (panel.hidden || last?.dock !== 'left') return false; ceded = true; place(true); return true; },
  refresh: place,
  dispose(){ observer.disconnect(); sizes.disconnect(); window.removeEventListener('resize', schedule); cancelAnimationFrame(frame); bar.remove(); status.remove(); for (const g of grips) g.remove(); }
 };
}
