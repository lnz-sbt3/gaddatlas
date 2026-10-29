import it from '../strings-it.js';

// Foglio a quattro quadranti: un piccolo elemento quadrangolare mosso come un joystick.
// Orizzontale = relazioni ↔ geografia, verticale = rilievo ↔ pianta. Il gesto blocca un asse nei primi
// pixel e tiene il progresso del passaggio della regia D; al rilascio completa o ritorna. Un clic su un
// quadrante avvia la transizione in automatico. Tre varianti:
// 'piega'   la cella dello stato corrente è invertita e si trascina sulle altre;
// 'bussola' il centro resta fermo, i quattro bracci sono i poli fissi dei due assi;
// 'mirino'  quattro miniature della figura, un mirino d'inchiostro le inquadra.
const QUADRANTS = {diagram_axon: [0, 0], map_axon: [1, 0], diagram2d: [0, 1], map2d: [1, 1]};
const KEY = {diagram_axon: 'diagram_axon', map_axon: 'map_axon', diagram2d: 'diagram', map2d: 'map2d'};
const DIR = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]};
// Bussola: ogni braccio è il polo di un asse; il polo corrente si legge, l'altro si raggiunge.
const POLE = {left: [0, null], right: [1, null], up: [null, 0], down: [null, 1]};
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, cls, attrs = {}) => { const e = document.createElement(tag); if (cls) e.className = cls; for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const nameOf = q => { const [view, plane] = it.padName[q], s = el('span', 'sheet-pad-name'); s.append(el('b'), el('span')); s.firstChild.textContent = view; s.lastChild.textContent = plane; return s; };

export default function createSheetPad({container, obstacle = null, config, controller, variant = 'piega', miniature: data = null}){
 const {lockCSS, flickCSSPerMs} = config.pad;
 let cellW = 0, cellH = 0;
 const root = el('div', 'sheet-pad', {'data-variant': variant, 'data-legend': 'view'});
 const field = el('div', 'sheet-pad-field', {role: 'group', 'aria-label': it.padGroup});
 const knob = el('button', 'sheet-pad-knob', {type: 'button', 'aria-label': it.padKnob, 'aria-describedby': 'sheet-pad-help'});
 const help = el('p', 'sheet-pad-help', {id: 'sheet-pad-help'});
 const caption = el('p', 'sheet-pad-caption', {'aria-hidden': 'true'});
 const narrative = el('button', 'sheet-pad-narrative', {type: 'button', 'aria-pressed': 'false', 'data-legend': 'narrative'});
 const reason = el('small');
 narrative.append(document.createTextNode(it.padNarrative), reason); reason.textContent = it.padNarrativeReason;
 const cells = {}, arms = {};
 let mini = null;

 if (variant === 'bussola') {
  for (const [name, col, row] of [['up', 1, 0], ['left', 0, 1], ['right', 2, 1], ['down', 1, 2], ['diagonal', 0, 0]]) {
   // La cella in diagonale è soltanto una legenda: nomina lo stato opposto, senza clic, fuoco né area di tocco.
   const b = name === 'diagonal' ? el('span', 'sheet-pad-arm sheet-pad-arm-diagonal', {'data-legend-only': '', 'aria-hidden': 'true'})
    : el('button', `sheet-pad-arm sheet-pad-arm-${name}`, {type: 'button', 'data-arm': name, tabindex: '-1'});
   b.style.gridArea = `${row + 1} / ${col + 1}`;
   const label = el('span', 'sheet-pad-arm-label'); label.textContent = name === 'diagonal' ? '' : it.padPole[name];
   b.append(label); field.append(b); arms[name] = {button: b, label};
  }
  // Il pomo è un quadrato d'inchiostro pieno: lo stato si legge dai bracci pieni, non da un'icona.
  mini = svg('svg', {viewBox: '0 0 20 20', class: 'sheet-pad-mini', 'aria-hidden': 'true'});
 } else {
  for (const [q, [c, r]] of Object.entries(QUADRANTS)) {
   const b = el('button', 'sheet-pad-cell', {type: 'button', 'data-q': q, tabindex: '-1', 'aria-label': it.padGoto(it.padStates[q])});
   b.style.gridArea = `${r + 1} / ${c + 1}`;
   b.append(variant === 'mirino' ? miniature(q, data) : nameOf(q));
   field.append(b); cells[q] = b;
  }
  if (variant === 'mirino') for (const corner of ['tl', 'tr', 'bl', 'br']) knob.append(el('i', `sheet-pad-crop sheet-pad-crop-${corner}`));
 }
 field.append(knob);
 // Mirino: le miniature hanno intestazioni come una tavola, colonne per la vista e righe per il piano.
 let board = field;
 if (variant === 'mirino') {
  board = el('div', 'sheet-pad-board');
  const head = (cls, text) => { const h = el('span', cls, {'aria-hidden': 'true'}); h.textContent = text; return h; };
  board.append(head('sheet-pad-col', it.padPole.left), head('sheet-pad-col', it.padPole.right), head('sheet-pad-row', it.padPlane.up), head('sheet-pad-row', it.padPlane.down), field);
  caption.hidden = true;
 }
 root.append(help, board, caption, narrative);
 container.append(root);

 // Geometria.
 const centerOf = q => { const [c, r] = QUADRANTS[q]; return [(c + .5) * cellW, (r + .5) * cellH]; };
 const home = () => variant === 'bussola' ? [1.5 * cellW, 1.5 * cellH] : centerOf(state.stage);
 const travelOf = d => d === 'left' || d === 'right' ? cellW : cellH;
 // Quadrante raggiunto da un braccio: il polo indicato sul suo asse, l'altro asse resta com'è. Se la figura è già
 // in quel polo il quadrante è lo stesso: ripremere il braccio non fa nulla.
 function targetOf(d, from = state.stage){
  const [sc, sr] = QUADRANTS[from], [pc, pr] = POLE[d];
  const c = pc ?? sc, r = pr ?? sr;
  return Object.keys(QUADRANTS).find(k => QUADRANTS[k][0] === c && QUADRANTS[k][1] === r);
 }
 function available(q){ const [c, r] = QUADRANTS[q]; return {left: c === 1, right: c === 0, up: r === 1, down: r === 0}; }
 function neighbour(q, d){ const [c, r] = QUADRANTS[q], [dx, dy] = DIR[d]; return Object.keys(QUADRANTS).find(k => QUADRANTS[k][0] === c + dx && QUADRANTS[k][1] === r + dy); }
 function diagonalOf(q){ const [c, r] = QUADRANTS[q]; return Object.keys(QUADRANTS).find(k => QUADRANTS[k][0] === 1 - c && QUADRANTS[k][1] === 1 - r); }

 let state = {stage: 'map2d', from: 'map2d', to: 'map2d', p: 0, moving: false, narrative: false}, drag = null, shown = '', named = '', lastArm = null, sweep = null;
 // Le misure delle celle vengono dai token (--pad-w, --pad-h), che cambiano con la banda della cornice.
 function measure(){ const cs = getComputedStyle(root); cellW = parseFloat(cs.getPropertyValue('--pad-w')); cellH = parseFloat(cs.getPropertyValue('--pad-h')); }
 function position(){
  const bottom = obstacle && !obstacle.hidden ? obstacle.offsetHeight : 0;
  root.style.bottom = `calc(${bottom}px + var(--pad-bottom))`;
 }
 // Al cambio di layout si rileggono le misure e si ridisegna.
 function place(){ measure(); position(); shown = ''; render(); }
 function knobAt(x, y){ knob.style.transform = `translate(${x}px, ${y}px)`; }
 function render(){
  const s = state;
  root.dataset.moving = String(s.moving || !!drag);
  narrative.setAttribute('aria-pressed', String(!!s.narrative));
  narrative.disabled = !s.stage.startsWith('diagram');
  if (variant === 'bussola') {
   const [sc, sr] = QUADRANTS[s.stage], avail = available(s.stage);
   for (const [d, {button, label}] of Object.entries(arms)) {
    if (d === 'diagonal') {
     const target = diagonalOf(s.stage);
     button.dataset.target = target; button.style.gridArea = `${sr === 1 ? 1 : 3} / ${sc === 1 ? 1 : 3}`;
     button.dataset.corner = `${sr === 1 ? 't' : 'b'}${sc === 1 ? 'l' : 'r'}`;
     label.textContent = it.padName[target].join(' ');
     continue;
    }
    // Il polo in cui si trova la figura ha l'etichetta in neretto e una tacca; ripremerlo non fa nulla.
    // Nero è soltanto l'ultimo braccio attivato.
    const [pc, pr] = POLE[d], here = pc === sc || pr === sr, target = targetOf(d);
    button.toggleAttribute('aria-current', here); button.setAttribute('aria-disabled', String(here));
    button.dataset.target = target; button.setAttribute('aria-label', here ? it.padHere(it.padPole[d]) : it.padGoto(it.padStates[target]));
   }
   for (const [d, {button}] of Object.entries(arms)) button.dataset.active = String(d === lastArm);
   for (const r of mini.querySelectorAll('rect')) r.classList.toggle('on', r.dataset.q === s.stage);
   if (!drag) {
    const [fc, fr] = QUADRANTS[s.from], [tc, tr] = QUADRANTS[s.to];
    knobAt(1.5 * cellW + (tc - fc) * s.p * cellW, 1.5 * cellH + (tr - fr) * s.p * cellH);
   }
  } else {
   for (const [q, b] of Object.entries(cells)) b.toggleAttribute('aria-current', q === s.stage);
   if (!drag) {
    // Durante il percorso guidato il quadrato non si ferma fra due celle: scatta a metà del passaggio.
    const a = centerOf(s.from), b = centerOf(s.to), p = container.classList.contains('is-story') ? +(s.p >= .5) : s.p;
    knobAt(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p);
   }
   // Piega: la cella invertita porta il nome dello stato corrente, o della meta mentre si muove.
   const shownName = s.moving ? s.to : s.stage;
   if (variant === 'piega' && named !== shownName) { named = shownName; knob.replaceChildren(nameOf(shownName)); }
   knob.dataset.toward = s.moving ? s.to : '';
  }
  caption.textContent = s.moving ? it.padMoving(it.padStates[s.to]) : it.padName[s.stage].join(' ');
  // Nella Bussola l'istruzione non cambia durante il passaggio: un testo di altra lunghezza sposterebbe la croce.
  help.textContent = s.moving && variant !== 'bussola' ? it.padMoving(it.padStates[s.to]) : it.padHelp[variant];
 }
 function update(next){
  const key = `${next.stage}|${next.from}|${next.to}|${next.p.toFixed(3)}|${next.narrative}|${obstacle?.hidden}`;
  // L'ultimo braccio attivato è quello del polo appena raggiunto, da qualunque comando venga la mossa.
  if (next.stage !== state.stage) {
   const [a, b] = [QUADRANTS[state.stage], QUADRANTS[next.stage]], dc = a[0] !== b[0], dr = a[1] !== b[1];
   lastArm = dc && dr ? 'diagonal' : dc ? (b[0] === 0 ? 'left' : 'right') : dr ? (b[1] === 0 ? 'up' : 'down') : lastArm;
  }
  state = next; if (key === shown) return; shown = key; render(); position();
 }

 // Gesto.
 knob.addEventListener('pointerdown', e => {
  if (e.button > 0 || drag) return; e.preventDefault(); knob.setPointerCapture(e.pointerId);
  drag = {id: e.pointerId, x: e.clientX, y: e.clientY, dir: null, ok: false, last: [e.clientX, e.clientY, e.timeStamp], v: 0, home: home(), from: state.stage};
  root.dataset.moving = 'true';
 });
 knob.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  // Bussola: se il dito lascia l'asse bloccato ed entra in un altro braccio, il gesto diventa uno scorrimento
  // fra i poli (come premendo un braccio): il passaggio in corso si chiude e conta il braccio sotto il dito.
  if (variant === 'bussola' && drag.dir) {
   const region = regionAt(e.clientX, e.clientY);
   if (region && region !== drag.dir && region !== 'center') {
    const d = drag; drag = null; if (d.ok) controller.end(0);
    knob.releasePointerCapture?.(d.id); field.setPointerCapture(d.id);
    sweep = {id: d.id, from: d.from, last: null}; glide(region); render(); return;
   }
  }
  if (!drag.dir && Math.hypot(dx, dy) >= lockCSS) {
   const d = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
   drag.dir = d; drag.ok = available(state.stage)[d] && controller.start(d);
  }
  // Direzione chiusa: il quadrato resiste e torna al rilascio.
  if (!drag.ok) { knobAt(drag.home[0] + dx * .15, drag.home[1] + dy * .15); return; }
  const [ux, uy] = DIR[drag.dir], travel = travelOf(drag.dir), raw = dx * ux + dy * uy, along = Math.max(0, Math.min(travel, raw)), dt = Math.max(1, e.timeStamp - drag.last[2]);
  drag.v = ((e.clientX - drag.last[0]) * ux + (e.clientY - drag.last[1]) * uy) / dt; drag.last = [e.clientX, e.clientY, e.timeStamp];
  const over = Math.max(0, raw - along) * .15;
  knobAt(drag.home[0] + ux * (along + over), drag.home[1] + uy * (along + over));
  controller.move(along / travel);
 });
 function finish(e){
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null; shown = '';
  const v = e.timeStamp - d.last[2] > 80 ? 0 : d.v;
  if (d.ok) controller.end(v > flickCSSPerMs ? 1 : v < -flickCSSPerMs ? -1 : 0);
  render();
 }
 knob.addEventListener('pointerup', finish); knob.addEventListener('pointercancel', finish);
 knob.addEventListener('keydown', e => { if (controller.key(e.key)) { e.preventDefault(); e.stopPropagation(); } });
 knob.addEventListener('click', e => e.preventDefault());
 // Dopo il primo uso l'istruzione si ritira: resta come descrizione accessibile del pomo.
 const used = () => { root.dataset.used = 'true'; };
 for (const t of ['pointerdown', 'keydown']) field.addEventListener(t, used);
 // Gesto continuo sui bracci: si preme un braccio e, senza rilasciare, si scorre sugli altri. Ogni braccio porta
 // al suo polo a partire dallo stato in cui il gesto è cominciato; il centro riporta a quello stato. Così il dito
 // va e torna fra le viste prima di rilasciare, e al rilascio resta la vista sotto il dito. La posizione si legge
 // dalla geometria della croce, non dall'elemento sotto il puntatore (etichette e pomo non la falsano); vale per
 // mouse, tocco e penna. Un clic semplice attiva il braccio premuto; ripremere il polo corrente non fa nulla.
 function regionAt(x, y){
  const r = field.getBoundingClientRect(), c = Math.floor((x - r.left) / cellW), w = Math.floor((y - r.top) / cellH);
  // Il centro conta solo vicino al pomo: attraversandone l'angolo da un braccio all'altro non si torna indietro.
  if (c === 1 && w === 1) return Math.hypot(x - r.left - 1.5 * cellW, y - r.top - 1.5 * cellH) < .4 * cellW ? 'center' : null;
  return c === 1 && w === 0 ? 'up' : c === 1 && w === 2 ? 'down' : w === 1 && c === 0 ? 'left' : w === 1 && c === 2 ? 'right' : null;
 }
 function glide(region){
  if (!sweep || region === sweep.last || region == null) return;
  sweep.last = region;
  const q = region === 'center' ? sweep.from : targetOf(region, sweep.from);
  if (q && q !== state.stage) controller.goto(KEY[q]);
 }
 function activate(arm){
  const d = arm.dataset.arm, q = d ? targetOf(d) : arm.dataset.q;
  if (q && q !== state.stage) controller.goto(KEY[q]);
 }
 field.addEventListener('pointerdown', e => {
  const arm = e.target.closest('.sheet-pad-arm[data-arm]'); if (!arm || e.button > 0 || variant !== 'bussola') return;
  e.preventDefault(); field.setPointerCapture(e.pointerId); sweep = {id: e.pointerId, from: state.stage, last: null};
  glide(arm.dataset.arm);
 });
 field.addEventListener('pointermove', e => { if (sweep && e.pointerId === sweep.id) glide(regionAt(e.clientX, e.clientY)); });
 const endSweep = e => { if (sweep && e.pointerId === sweep.id) { sweep.done = true; setTimeout(() => { sweep = null; }, 0); } };
 field.addEventListener('pointerup', endSweep); field.addEventListener('pointercancel', endSweep);
 field.addEventListener('click', e => {
  const t = e.target.closest('[data-q],[data-arm]'); if (!t || t === knob) return;
  // Il clic che chiude un gesto è già stato attivato alla pressione; resta il clic da tastiera (detail 0).
  if (sweep?.done || (e.detail > 0 && variant === 'bussola')) return;
  if (t.dataset.arm) activate(t); else controller.goto(KEY[t.dataset.q]);
 });
 narrative.addEventListener('click', () => controller.toggleNarrative());
 // Le celle cambiano misura con la cornice (percorso, pannello, banda): il campo si rimisura da sé.
 const resize = new ResizeObserver(() => place()); resize.observe(field);
 measure(); render();
 return {element: root, update, place, dispose(){ resize.disconnect(); root.remove(); }};
}

// Miniature della figura (variante 'mirino'): estratti nelle coordinate del canvas. In geografia il contorno di Roma
// e i generatori; nelle relazioni l'azimut dal polo e il rango della distanza; in rilievo lo stesso piano inclinato.
function miniature(q, data){
 const {width, height} = data, axon = q.endsWith('axon'), diagram = q.startsWith('diagram');
 // In geografia l'estratto inquadra Roma, come la figura alla prima apertura; nelle relazioni tutto il campo.
 const [[x0, y0], [x1, y1]] = data.outlineBounds, pad = .35 * Math.max(x1 - x0, y1 - y0);
 const box = diagram ? [0, 0, width, height] : [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, (x1 - x0 + 2 * pad) * .75];
 const s = svg('svg', {viewBox: box.join(' '), class: 'sheet-pad-miniature', 'aria-hidden': 'true'});
 const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2, R = Math.min(box[2], box[3]) * .46, unit = box[2] / 70;
 let points;
 if (diagram) {
  const order = data.polar.map((p, i) => i).sort((a, b) => data.polar[a][1] - data.polar[b][1]), rank = new Array(order.length);
  order.forEach((i, r) => { rank[i] = (r + 1) / order.length; });
  points = data.polar.map(([a], i) => [cx + Math.cos(a) * R * rank[i], cy - Math.sin(a) * R * rank[i]]);
 } else points = data.points;
 const g = svg('g', {transform: axon ? `translate(0 ${cy * .45}) scale(1 .55)` : ''});
 if (diagram) for (const f of [.33, .66, 1]) g.append(svg('circle', {cx, cy, r: R * f, class: 'ring'}));
 else g.append(svg('path', {d: data.outline, class: 'shape'}));
 // In geografia i generatori sono sfoltiti: il contorno di Roma resta la forma che si riconosce.
 for (const [x, y] of diagram ? points : points.filter((p, i) => i % 2 === 0)) g.append(svg('circle', {cx: x, cy: y, r: unit * .55, class: 'dot'}));
 s.append(g);
 // In rilievo ogni luogo si alza: un filo verticale per generatore, sullo stesso piano inclinato.
 if (axon) for (const [x, y] of points.filter((p, i) => i % 3 === 0)) { const ty = cy * .45 + y * .55; s.append(svg('line', {x1: x, x2: x, y1: ty, y2: ty - unit * 3.5, class: 'stem'})); }
 return s;
}
