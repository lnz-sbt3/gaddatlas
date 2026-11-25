export const CYCLE = Object.freeze(['map2d', 'diagram2d', 'diagram_axon', 'map_axon']);
const TAU = Math.PI * 2;
const EPSILON = 1e-8;
const mod = n => ((n % CYCLE.length) + CYCLE.length) % CYCLE.length;

/** Scompone la posizione angolare in una coppia adiacente e una frazione reversibile. */
export function splitCyclePosition(position) {
  if (!Number.isFinite(position)) throw new TypeError('Posizione della ghiera non valida');
  const nearest = Math.round(position);
  if (Math.abs(position - nearest) < EPSILON) {
    const state = CYCLE[mod(nearest)];
    return {from: state, to: state, p: 0};
  }
  const base = Math.floor(position);
  return {from: CYCLE[mod(base)], to: CYCLE[mod(base + 1)], p: position - base};
}

/** Ricava la posizione dai soli quattro stati delle viste; i narrativi sono indipendenti. */
export function cyclePosition({from, to, p}) {
  const a = CYCLE.indexOf(from), b = CYCLE.indexOf(to);
  if (a < 0 || b < 0 || !Number.isFinite(p) || p < 0 || p > 1) throw new TypeError('Passaggio della ghiera non valido');
  if (a === b) return a;
  const step = mod(b - a);
  if (step !== 1 && step !== CYCLE.length - 1) throw new RangeError('Le viste del passaggio devono essere adiacenti');
  return a + (step === 1 ? p : -p);
}

/**
 * Il trasporto possiede il tempo e lo stato della figura. La ghiera emette intenzioni e riceve
 * update({from, to, p, rest}); rest è l'ultima vista assestata, usata per annullare una presa.
 * Il controller fornisce begin, seek, release, go e cancel. takeControl è facoltativo.
 * Nessuna animazione o valutazione della figura viene eseguita dal componente.
 */
export default function createIncisa({container, controller, labels, tokens, initial = {from: 'map2d', to: 'map2d', p: 0}, size = 'piccola', appearance = 'chiara'}) {
  if (!container?.ownerDocument) throw new TypeError('Contenitore della ghiera non valido');
  for (const method of ['begin', 'seek', 'release', 'go', 'cancel']) {
    if (typeof controller?.[method] !== 'function') throw new TypeError(`Comando della ghiera mancante: ${method}`);
  }
  if (!labels?.names || CYCLE.some(s => !Array.isArray(labels.names[s]))) throw new TypeError('Etichette della ghiera non valide');
  const token = name => {
    const value = parseFloat(tokens?.[name]);
    if (!Number.isFinite(value)) throw new TypeError(`Token della ghiera mancante: ${name}`);
    return value;
  };
  const t = Object.fromEntries(['view', 'hit-outer', 'hit-inner', 'sector-gap', 'rim-inner', 'rim-outer', 'tick-count', 'major-every', 'tick-inner', 'tick-major-inner', 'tick-outer', 'label-radius', 'label-width', 'label-height', 'label-top', 'text-offset', 'line-gap', 'trace-radius', 'trace-half', 'trace-active-half', 'index-top', 'index-bottom', 'index-half', 'cue-radius', 'cue-start', 'cue-end', 'cue-head', 'notch-count', 'hint-duration', 'lock-px', 'flick-per-ms', 'velocity-age', 'release-duration', 'automatic-duration', 'settle-damping'].map(k => [k, token(k)]));
  cyclePosition(initial);
  const doc = container.ownerDocument, win = doc.defaultView;
  const abort = new win.AbortController(), motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const root = doc.createElement('div');
  root.className = 'incisa'; root.dataset.legend = 'view'; container.append(root);
  for (const [key, value] of Object.entries(tokens)) root.style.setProperty(`--incisa-${key}`, String(value));
  function setAppearance(next = {}) {
    if (next.size !== undefined) {
      if (!['piccola', 'media'].includes(next.size)) throw new RangeError('Dimensione della ghiera non valida');
      root.dataset.size = next.size;
    }
    if (next.appearance !== undefined) {
      if (!['chiara', 'scura'].includes(next.appearance)) throw new RangeError('Aspetto della ghiera non valido');
      root.dataset.appearance = next.appearance;
    }
  }
  setAppearance({size, appearance});
  const c = t.view / 2, quarter = TAU / CYCLE.length;
  const svg = (tag, attributes, parent) => {
    const e = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) e.setAttribute(key, String(value));
    parent?.append(e); return e;
  };
  const point = (radius, angle) => [c + radius * Math.cos(angle), c + radius * Math.sin(angle)];
  const arc = (radius, a, b) => `M${point(radius, a)} A${radius} ${radius} 0 0 1 ${point(radius, b)}`;
  const wheel = svg('svg', {class: 'incisa-wheel', viewBox: `0 0 ${t.view} ${t.view}`, role: 'group', tabindex: 0, 'aria-label': labels.keyboard}, root);
  const instrument = svg('g', {class: 'incisa-instrument', 'aria-hidden': true}, wheel);
  for (const radius of [t['rim-inner'], t['rim-outer']]) svg('circle', {cx: c, cy: c, r: radius, class: 'incisa-rim'}, instrument);
  const ticks = svg('g', {class: 'incisa-ticks'}, instrument);
  for (let i = 0; i < t['tick-count']; i++) {
    const major = i % t['major-every'] === 0, angle = i * TAU / t['tick-count'];
    svg('path', {d: `M${point(major ? t['tick-major-inner'] : t['tick-inner'], angle)}L${point(t['tick-outer'], angle)}`, class: major ? 'major' : ''}, ticks);
  }
  const sectors = CYCLE.map((state, index) => {
    const g = svg('g', {class: 'incisa-sector', 'data-incisa-index': index, role: 'button', tabindex: 0}, wheel);
    const hit = svg('path', {class: 'incisa-hit'}, g), trace = svg('path', {class: 'incisa-trace'}, g), notch = svg('path', {class: 'incisa-notch'}, g);
    const plate = svg('rect', {class: 'incisa-plate', width: t['label-width'], height: t['label-height'], rx: 0}, g);
    const text = svg('text', {class: 'incisa-text'}, g);
    const lines = labels.names[state].map((line, row) => {
      const span = svg('tspan', {dy: row ? t['line-gap'] : 0}, text); span.textContent = line; return span;
    });
    return {g, hit, trace, notch, plate, text, lines};
  });
  const north = svg('g', {class: 'incisa-index', 'aria-hidden': true}, wheel);
  svg('path', {d: `M${c} ${t['index-top']}V${t['index-bottom']} M${c - t['index-half']} ${t['index-top']}H${c + t['index-half']}`}, north);
  // Segni di direzione verso le due viste adiacenti: fermi rispetto all'indice, compaiono al passaggio, al focus e con il suggerimento.
  const cues = svg('g', {class: 'incisa-cues', 'aria-hidden': true}, wheel);
  for (const side of [-1, 1]) {
    const from = -Math.PI / 2 + side * t['cue-start'], to = -Math.PI / 2 + side * t['cue-end'], r = t['cue-radius'], h = t['cue-head'];
    const [x, y] = point(r, to), tx = -Math.sin(to) * side, ty = Math.cos(to) * side, nx = Math.cos(to), ny = Math.sin(to);
    svg('path', {d: `M${point(r, from)} A${r} ${r} 0 0 ${side > 0 ? 1 : 0} ${x} ${y} M${x - tx * h + nx * h * .6} ${y - ty * h + ny * h * .6}L${x} ${y}L${x - tx * h - nx * h * .6} ${y - ty * h - ny * h * .6}`}, cues);
  }
  // Suggerimento d'uso: una sola volta per visita, al primo passaggio, al primo tocco o al primo focus da tastiera.
  const hint = doc.createElement('p'); hint.className = 'incisa-hint'; hint.setAttribute('aria-hidden', 'true'); hint.textContent = labels.hint || ''; root.append(hint);
  let hintTimer = 0, hintSeen = !labels.hint;
  function showHint() {
    if (hintSeen) return;
    hintSeen = true;
    try { if (win.sessionStorage.getItem('gaddatlas:incisa-hint')) return; win.sessionStorage.setItem('gaddatlas:incisa-hint', '1'); } catch { /* senza memoria della visita vale la singola pagina */ }
    root.dataset.hint = 'true'; hintTimer = win.setTimeout(() => { root.dataset.hint = 'false'; }, t['hint-duration']);
  }
  const live = doc.createElement('p'); live.className = 'incisa-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true'); root.append(live);
  let position = cyclePosition(initial), rest = initial.rest || CYCLE[mod(Math.round(position))];
  let drag = null, disposed = false, announcement = '';
  const name = state => labels.names[state].join(' ');
  const nearestPosition = canonical => canonical + Math.round((position - canonical) / CYCLE.length) * CYCLE.length;
  const payload = (value, source, extra = {}) => Object.freeze({...splitCyclePosition(value), rest, source, reducedMotion: motion.matches, ...extra});
  function render() {
    const visual = motion.matches ? nearestPosition(CYCLE.indexOf(rest)) : position;
    const selected = mod(Math.round(visual));
    ticks.setAttribute('transform', `rotate(${-360 * visual / CYCLE.length} ${c} ${c})`);
    sectors.forEach(({g, hit, trace, notch, plate, text, lines}, i) => {
      const angle = (i - visual) * quarter - Math.PI / 2, low = angle - quarter / 2 + t['sector-gap'], high = angle + quarter / 2 - t['sector-gap'];
      hit.setAttribute('d', `M${point(t['hit-outer'], low)} A${t['hit-outer']} ${t['hit-outer']} 0 0 1 ${point(t['hit-outer'], high)} L${point(t['hit-inner'], high)} A${t['hit-inner']} ${t['hit-inner']} 0 0 0 ${point(t['hit-inner'], low)} Z`);
      const [x, y] = point(t['label-radius'], angle), here = i === selected, diff = mod(i - Math.round(position)), opposite = diff === CYCLE.length / 2;
      g.classList.toggle('is-current', here); g.dataset.opposite = String(opposite);
      g.setAttribute('tabindex', diff === 0 || opposite ? '-1' : '0'); g.setAttribute('aria-disabled', String(diff === 0 || opposite));
      g.setAttribute('aria-label', diff === 0 ? labels.current(name(CYCLE[i])) : opposite ? labels.opposite(name(CYCLE[i])) : labels.goTo(name(CYCLE[i])));
      text.setAttribute('x', x); text.setAttribute('y', y - t['text-offset']); lines.forEach(span => span.setAttribute('x', x));
      plate.setAttribute('x', x - t['label-width'] / 2); plate.setAttribute('y', y - t['label-top']);
      const half = here ? t['trace-active-half'] : t['trace-half']; trace.setAttribute('d', arc(t['trace-radius'], angle - half, angle + half));
      let marks = '';
      for (let k = -t['notch-count']; k <= t['notch-count']; k++) { const a = angle + k * TAU / t['tick-count']; marks += `M${point(k ? t['tick-inner'] : t['tick-major-inner'], a)}L${point(t['tick-outer'], a)}`; }
      notch.setAttribute('d', marks);
    });
    root.setAttribute('aria-label', labels.group);
  }
  function update(next) {
    if (disposed) return;
    const value = cyclePosition(next);
    const nextRest = next.rest || (next.from === next.to ? next.from : rest);
    if (!CYCLE.includes(nextRest)) throw new TypeError('Vista di riposo della ghiera non valida');
    position = nearestPosition(value); rest = nextRest; render();
    if (next.from === next.to && announcement !== name(next.to)) { announcement = name(next.to); live.textContent = labels.current(announcement); }
  }
  function navigate(delta, source = 'pointer') {
    const from = Math.round(position), target = from + delta;
    controller.go(payload(from, source, {to: CYCLE[mod(target)], direction: delta, durationMs: source === 'keyboard' || motion.matches ? 0 : t['automatic-duration']}));
  }
  function choose(index, source) {
    const diff = mod(index - Math.round(position));
    if (diff === 1) { navigate(1, source); return true; }
    if (diff === CYCLE.length - 1) { navigate(-1, source); return true; }
    return false;
  }
  function cancel() {
    if (!drag) return false;
    const d = drag; drag = null;
    if (wheel.hasPointerCapture(d.id)) wheel.releasePointerCapture(d.id);
    controller.cancel(payload(d.position, 'pointer', {restore: d.rest, durationMs: motion.matches ? 0 : t['release-duration']}));
    root.dataset.dragging = 'false'; root.dataset.turning = 'false'; return true;
  }
  const listen = (type, fn) => wheel.addEventListener(type, fn, {signal: abort.signal});
  // La cornice del focus è riservata alla tastiera: il puntatore (mouse, penna, tocco) la sospende, un tasto la ripristina.
  listen('pointerdown', () => { root.dataset.input = 'pointer'; });
  doc.addEventListener('keydown', () => { root.dataset.input = 'keyboard'; }, {capture: true, signal: abort.signal});
  listen('pointerenter', showHint);
  listen('focusin', () => { if (root.dataset.input !== 'pointer') showHint(); });
  listen('pointerdown', event => {
    if (disposed || drag || event.button > 0 || !event.isPrimary) return;
    event.preventDefault(); controller.takeControl?.({source: 'pointer'});
    if (controller.begin(payload(position, 'pointer')) === false) return;
    const box = wheel.getBoundingClientRect();
    drag = {id: event.pointerId, box, x: event.clientX, y: event.clientY, position, rest, value: position, angle: Math.atan2(event.clientY - box.y - box.height / 2, event.clientX - box.x - box.width / 2), rotation: 0, moved: false, time: event.timeStamp, lastValue: position, velocity: 0, index: event.target.closest('[data-incisa-index]')?.dataset.incisaIndex};
    wheel.focus({preventScroll: true}); wheel.setPointerCapture(event.pointerId); root.dataset.dragging = 'true';
  });
  listen('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const d = drag;
    if (!d.moved && Math.hypot(event.clientX - d.x, event.clientY - d.y) < t['lock-px']) return;
    d.moved = true; root.dataset.turning = 'true';
    const x = event.clientX - d.box.x - d.box.width / 2, y = event.clientY - d.box.y - d.box.height / 2, angle = Math.atan2(y, x);
    let delta = angle - d.angle; if (delta > Math.PI) delta -= TAU; if (delta < -Math.PI) delta += TAU; d.angle = angle;
    if (Math.hypot(x, y) >= t['hit-inner'] * d.box.width / t.view) { d.rotation -= delta; d.value = d.position + d.rotation / quarter; }
    d.velocity = (d.value - d.lastValue) / Math.max(1, event.timeStamp - d.time); d.time = event.timeStamp; d.lastValue = d.value;
    controller.seek(payload(d.value, 'pointer'));
  });
  listen('pointerup', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const d = drag; drag = null; root.dataset.dragging = 'false'; root.dataset.turning = 'false';
    if (wheel.hasPointerCapture(d.id)) wheel.releasePointerCapture(d.id);
    if (!d.moved && d.index !== undefined && choose(Number(d.index), 'pointer')) return;
    const velocity = event.timeStamp - d.time < t['velocity-age'] ? d.velocity : 0;
    const target = Math.abs(velocity) > t['flick-per-ms'] ? velocity > 0 ? Math.ceil(d.value) : Math.floor(d.value) : Math.round(d.value);
    const base = Math.floor(d.value), pair = splitCyclePosition(d.value), end = pair.from === pair.to ? 0 : target > base ? 1 : 0;
    controller.release(payload(d.value, 'pointer', {end, velocity, durationMs: motion.matches ? 0 : t['release-duration']}));
  });
  listen('pointercancel', event => { if (drag?.id === event.pointerId) cancel(); });
  listen('lostpointercapture', event => { if (drag?.id === event.pointerId) cancel(); });
  listen('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Home', 'Escape'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') { if (!cancel()) controller.cancel(payload(position, 'keyboard', {restore: rest, durationMs: 0})); return; }
    if (drag) return;
    controller.takeControl?.({source: 'keyboard'});
    if (event.key === 'Home') {
      const current = mod(Math.round(position)), direction = current > CYCLE.length / 2 ? 1 : -1;
      if (current === 0 && Math.abs(position - Math.round(position)) > EPSILON) {
        controller.go(payload(Math.round(position), 'keyboard', {direction: 0, durationMs: 0})); return;
      }
      const start = Math.round(position);
      for (let i = 0, count = Math.min(current, CYCLE.length - current); i < count; i++) {
        const from = start + i * direction;
        controller.go(payload(from, 'keyboard', {to: CYCLE[mod(from + direction)], direction, durationMs: 0}));
      }
      return;
    }
    const index = event.target.closest('[data-incisa-index]')?.dataset.incisaIndex;
    if (index !== undefined && ['Enter', ' '].includes(event.key)) { choose(Number(index), 'keyboard'); return; }
    navigate(['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1, 'keyboard');
  });
  listen('click', event => {
    event.preventDefault();
    if (event.detail !== 0 || drag) return;
    const index = event.target.closest('[data-incisa-index]')?.dataset.incisaIndex;
    if (index !== undefined) { controller.takeControl?.({source: 'keyboard'}); choose(Number(index), 'keyboard'); }
  });
  win.addEventListener('blur', cancel, {signal: abort.signal});
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) cancel(); }, {signal: abort.signal});
  const onMotion = () => { if (!cancel()) render(); };
  motion.addEventListener('change', onMotion);
  update(initial);
  return {
    element: root, update, setAppearance,
    timings: Object.freeze({releaseMs: t['release-duration'], automaticMs: t['automatic-duration'], damping: t['settle-damping']}),
    dispose() { if (disposed) return; cancel(); disposed = true; win.clearTimeout(hintTimer); abort.abort(); motion.removeEventListener('change', onMotion); root.remove(); },
  };
}
