import {html, svg} from 'htl';
import it from '../strings-it.js';
import {FRATTURA_STORY} from './frattura.js';

// Legenda per comando: ogni comando dell'atlante ha la sua nota, con domanda, regola di lettura e chiave grafica.
// Il contenuto viene da una sola fonte (note); le varianti cambiano soltanto dove e come la nota compare:
// 'margine'   nel margine la nota del comando toccato è aperta; sotto, una riga per ogni canale visibile;
// 'cartiglio' nota agganciata al comando toccato con un filo di richiamo, nella banda libera più vicina;
// 'registro'  il margine raccoglie i comandi toccati, l'ultimo aperto, i precedenti in una riga ciascuno.
export default function createContextLegend({container, toggle, variant = 'margine', statusMode = 'glifo', chroma = 'storica', reliefBands, agents, glyphPaths, roleOrder, roleColors, densityColors, determination = null}){
 const names = new Map(agents.map(a => [a.id, a.name]));
 // Ogni terrazza è segnata dal numero di riferimenti da cui comincia: 1, 2, 3, 4, 5, 7, 11, 15, 22+.
 const t = reliefBands.thresholds, bands = t.map((v, i) => i < t.length - 1 ? String(v) : `${v}+`);
 const L = it.notes;
 // Con il margine sinistro la nota resta aperta; senza, sta in una banda libera e si apre quando si tocca un comando.
 const wide = matchMedia('(min-width: 1101px) and (min-aspect-ratio: 1/1)');
 let state = null, topic = null, open = wide.matches;
 const log = [];

 // Chiavi grafiche, disegnate come la figura le rende.
 // Tessera: filo di cella, macchia di densità nella tinta del suo insieme, segno di statuto nell'inchiostro.
 function tile(kind, density = false){
  const fill = kind === 'imported' ? densityColors.reference : densityColors.narrative;
  const ring = 'M3 4 L19 2 L25 12 L20 21 L5 21 L1 12 Z';
  // La macchia di densità compare solo nella chiave della densità; negli statuti la chiave è senza colore.
  const blob = density ? svg`<ellipse cx="13" cy="12" rx="6" ry="4.5" fill=${fill} fill-opacity=${kind === 'narrative' && chroma === 'risparmio' ? 0 : .35} stroke=${fill} stroke-opacity=".7" stroke-width=".8" />` : '';
  let mark = '';
  if (kind !== 'imported' && kind !== 'narrative') {
   if (statusMode === 'glifo') mark = svg`<g transform="translate(7 6) scale(.12)"><path d=${glyphPaths[kind]} class="note-glyph-path" /></g>`;
   else if (statusMode === 'sigla') mark = svg`<text x="13" y="16.5" class="note-sigla">${kind === 'transformed' ? 'T' : 'I'}</text>`;
   else if (kind === 'invented') mark = svg`<path d="M4.4 5.4 L18.6 3.6 L23.4 12 L19.1 19.6 L5.9 19.6 L2.6 12 Z" class="note-reserve" />`;
   else if (statusMode === 'ricalco') mark = svg`<path d="M10 9 L15.5 8.5 L17 12 L14 15 L9.5 14 Z" class="note-mark" />`;
   else mark = svg`<path d="M5.8 6.2 L18.2 4.6 L22.4 12 L18.6 18.6 L6.6 18.6 L3.6 12 Z" class="note-mark" />`;
  }
  // Inventata nei modi senza glifo: nessun poligono di cella, solo la sagoma propria.
  const outline = svg`<path d=${ring} class="note-cell" />`;
  return svg`<svg class="note-tile" viewBox="0 0 26 23" aria-hidden="true">${outline}${blob}${mark}</svg>`;
 }
 const statuses = () => html`<ul class="note-key note-status">
  ${['imported', 'transformed', 'invented'].map(k => html`<li>${tile(k)}<span><b>${L.statusName[k]}</b><small> · ${(['traccia', 'ricalco'].includes(statusMode) ? L.statusTextContour : L.statusText)[k]}</small></span></li>`)}</ul>
  <p class="note-key-caption">${L.statusDensityBy[chroma]}</p>`;
 // Terrazze: nove altezze; sotto, i riferimenti da cui ciascuna comincia (o uno per terrazza con un personaggio).
 function terraces(linear){
  const steps = linear ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : bands;
  return html`<div class="note-key"><div class="note-terraces" aria-hidden="true">${steps.map((s, i) => html`<span><i style=${`height:${4 + i * 3}px`}></i><small>${s}</small></span>`)}</div>
   <p class="note-key-caption">${linear ? L.terracesLinear : L.terracesBands}</p></div>`;
 }
 const density = narrative => html`<ul class="note-key note-status"><li>${tile('imported', true)}${L.densityReference}</li>${narrative ? html`<li>${tile('narrative', true)}${L.densityNarrativeBy[chroma]}</li>` : ''}</ul>`;
 // Determinazione della lettura sul bordo della terrazza: due fili (superiore e inferiore) con i token del renderer,
 // in px CSS. Il dato mancante mostra il bordo ordinario: non è una quinta classe.
 function edgeSample(kind){
  const line = (y, width, dash) => svg`<line x1="2" x2="34" y1=${y} y2=${y} stroke-width=${width} stroke-dasharray=${dash ? dash.join(' ') : 'none'} stroke-linecap=${dash ? 'round' : 'butt'} />`;
  const pair = kind ? [line(3.5, determination.width, determination.dash[kind]), line(10.5, determination.width, determination.dash[kind])]
   : [line(3.5, determination.edge.top), line(10.5, determination.edge.bottom)];
  return svg`<svg class="note-det-sample" viewBox="0 0 36 14" aria-hidden="true">${pair}</svg>`;
 }
 const determinationKey = () => determination ? html`<div class="note-det"><p class="note-det-title">${L.determinationTitle}</p>
  <ul class="note-key note-det-list">${Object.keys(determination.dash).map(k => html`<li>${edgeSample(k)}<span><b>${k}</b> <small>${L.determinationKind[k]}</small></span></li>`)}
  <li>${edgeSample(null)}<span><b>${L.determinationMissing}</b> <small>${L.determinationMissingKind}</small></span></li></ul>
  <p class="note-key-caption">${L.determinationHint}</p></div>` : '';
 const roles = () => html`<ul class="note-key note-roles">${roleOrder.map(r => html`<li>${svg`<svg class="note-tile" viewBox="0 0 26 23" aria-hidden="true"><path d="M3 4 L19 2 L25 12 L20 21 L5 21 L1 12 Z" fill=${roleColors[r]} fill-opacity=".55" stroke=${roleColors[r]} stroke-width=".9" /></svg>`}${r}</li>`)}</ul>`;

 // Una sola fonte del contenuto.
 function note(id, s){
  const who = s.focalizer == null ? null : names.get(s.focalizer) || s.focalizer;
  const view = s.view === 'diagram' ? 'diagram' : 'map', axon = !!s.axon, narrative = view === 'diagram' && !!s.narrative;
  switch (id) {
   case 'view': return {label: L.viewLabel, question: L.viewQuestion, value: it.padName[`${view}${axon ? '_axon' : '2d'}`].join(' '),
    text: axon ? (who ? L.reliefAgent(who) : L.reliefAll(String(reliefBands.logBase).replace('.', ','))) : view === 'diagram' ? L.diagram : L.map,
    key: axon ? html`${terraces(!!who)}${who ? determinationKey() : ''}` : density(narrative)};
   case 'narrative': return {label: L.narrativeLabel, question: L.narrativeQuestion, value: s.narrative ? L.on : L.off,
    text: s.view === 'diagram' ? L.narrative : `${L.narrative} ${L.narrativeOnlyDiagram}`, key: statuses(), hint: statusMode === 'ricalco' ? `${L.ricalcoFallback} ${L.imagined}` : L.imagined};
   case 'focalizer': return {label: L.focalizerLabel, question: it.askWho, value: who || it.allFocalizers,
    text: who ? L.focalizerAgent(who) : L.focalizerAll, key: who ? html`${roles()}${axon ? determinationKey() : ''}` : null, hint: L.focalizerCount(Math.max(0, (anchorOf('focalizer')?.options.length || 1) - 1))};
   case 'chapter': return {label: L.chapterLabel, question: it.askWhen, value: s.mode === 'page' ? it.legendScopePage : it.legendScopeChapter(s.chapter),
    text: L.chapter(s.chapter), key: null, hint: L.chapterHint};
   case 'page': return {label: L.pageLabel, question: it.askWhen, value: s.mode === 'page' ? L.on : L.off, text: L.page, key: null, hint: L.pageHint};
   case 'rotation': return {label: L.rotationLabel, question: it.askHow, value: `${Math.round(s.rotation || 0)}°`, text: L.rotation, key: null};
   case 'order': return {label: L.orderLabel, question: it.askHow, value: s.order === 'role' ? L.byRole : L.byTime, text: L.order, key: roles()};
   case 'roles': return {label: L.rolesLabel, question: it.askWho, value: (s.roles || []).join(', '), text: L.roles, key: roles()};
   case 'historical': return {label: it.historicalToggle, question: it.historicalQuestion, value: '', text: L.historical, key: null, hint: it.historicalCredit};
   case 'grain': return {label: L.pageLabel, question: it.askWhen, value: it.grainLabel, text: L.grain, key: null, hint: L.pageHint};
   case 'tour': return {label: L.tourLabel, question: L.tourQuestion, value: s.tour ? `${s.tour} / ${FRATTURA_STORY.length}` : '', text: L.tour, key: null, hint: L.tourHint};
   case 'index': return {label: L.indexLabel, question: L.indexQuestion, value: '', text: L.index, key: statuses()};
   default: return null;
  }
 }
 // Canali visibili ora: ciascuno resta in legenda finché si vede nella figura.
 function visibleChannels(s){
  const out = ['view'];
  if (s.view === 'diagram' && s.narrative) out.push('narrative');
  if (s.focalizer != null) out.push('focalizer');
  if (s.mode === 'page') out.push('page');
  return out;
 }

 // Resa.
 const body = (n, {label = true, question = true, key = true} = {}) => html`<div class="note-body">
  ${label ? html`<p class="note-label">${n.label}${n.value ? html` · <b>${n.value}</b>` : ''}</p>` : ''}
  ${question ? html`<h3>${n.question}</h3>` : ''}<p>${n.text}</p>${key && n.key || ''}${n.hint ? html`<p class="note-hint">${n.hint}</p>` : ''}</div>`;
 const row = (id, n) => { const b = html`<button type="button" class="note-entry"><span>${n.label}</span><b>${n.value}</b></button>`; b.onclick = () => touch(id); return b; };
 const close = html`<button type="button" class="ctl note-close" aria-label=${L.close}>×</button>`;
 const element = html`<aside class="legend-note" data-variant=${variant} aria-live="polite" aria-label=${L.name}></aside>`;
 const leader = html`<div class="note-leader" aria-hidden="true" hidden></div>`;
 container.append(element, leader);
 close.onclick = () => { setOpen(false); };

 function anchorOf(id){ return document.querySelector(`[data-legend="${id}"]`); }
 function render(){
  if (!state) return;
  element.hidden = !open || (variant === 'cartiglio' && !topic);
  leader.hidden = true;
  container.classList.toggle('has-note', !element.hidden);
  if (element.hidden) return;
  if (variant === 'registro') {
   if (!log.length) { element.replaceChildren(close, body(note('view', state))); return; }
   element.replaceChildren(close, html`<p class="note-kicker">${L.registerTitle}</p>`, ...log.map(id => {
    const n = note(id, state), current = id === log[0];
    const head = html`<button type="button" class="note-entry" aria-expanded=${String(current)}><span>${n.label}</span><b>${n.value}</b></button>`;
    head.onclick = () => { topic = id; log.splice(log.indexOf(id), 1); log.unshift(id); render(); };
    return html`<section class=${current ? 'is-current' : ''}>${head}${current ? body(n, {label: false}) : ''}</section>`;
   }));
   return;
  }
  // Margine: se il comando sta nel pannello «Interrogare», la regola scende sotto il comando (la domanda è già
  // il titolo della sezione) e il margine torna alla vista; restano le righe dei canali visibili.
  const anchor = topic && anchorOf(topic), inPanel = variant === 'margine' && anchor?.closest('.frame-panel:not([hidden])');
  const id = inPanel || !note(topic, state) ? 'view' : topic || 'view', n = note(id, state), touched = note(topic, state) ? topic : 'view';
  if (variant === 'margine') {
   const rows = visibleChannels(state).filter(c => c !== id).map(c => row(c, note(c, state)));
   element.replaceChildren(close, body(n, {label: id !== 'view'}), ...(rows.length ? [html`<div class="note-rows">${rows}</div>`] : []));
   inline.hidden = !inPanel;
   if (inPanel) { inline.replaceChildren(body(note(touched, state), {label: false, question: false, key: touched !== 'focalizer'})); anchor.closest('section, .ctl-field, .ctl-row').after(inline); }
   return;
  }
  element.replaceChildren(close, body(n, {label: id !== 'view'}));
  placeCartouche((anchor?.dataset.legend === 'view' ? anchor.querySelector('.sheet-pad-field') : anchor) || anchorOf('view'));
 }
 const inline = html`<div class="legend-note-inline" hidden></div>`;
 // Cartiglio: nella banda libera più vicina al comando, con un filo che li unisce; mai sopra la figura.
 function placeCartouche(anchor){
  if (!anchor) return;
  const box = container.getBoundingClientRect(), a = anchor.getBoundingClientRect(), w = element.offsetWidth, h = element.offsetHeight;
  const cs = getComputedStyle(container), bandRight = parseFloat(cs.paddingRight), bandLeft = parseFloat(cs.paddingLeft);
  const inRight = a.left - box.left > box.width - bandRight - 8, panel = anchor.closest('.frame-panel');
  let x, y, vertical = false;
  // Nella banda destra il cartiglio sta in alto, sotto i comandi della cornice; il foglio resta libero.
  if (inRight) { x = box.width - w - 16; y = parseFloat(cs.paddingTop); vertical = true; }
  else if (panel) { const p = panel.getBoundingClientRect(); x = p.left - box.left; y = p.bottom - box.top + 28; vertical = true; }
  else { x = Math.max(16, bandLeft - w - 16); y = a.top - box.top + a.height / 2 - h / 2; }
  y = Math.max(parseFloat(cs.paddingTop), Math.min(box.height - h - 16, y)); x = Math.max(16, Math.min(box.width - w - 16, x));
  Object.assign(element.style, {left: `${x}px`, top: `${y}px`});
  if (vertical) {
   const ax = Math.max(x + 12, Math.min(x + w - 12, a.left - box.left + a.width / 2)), top = Math.min(y + h, a.top - box.top), bottom = Math.max(y, a.top - box.top);
   Object.assign(leader.style, {left: `${ax}px`, top: `${y > a.top - box.top ? a.bottom - box.top : y + h}px`, width: '1px', height: `${Math.abs(bottom - top)}px`});
  } else {
   const ax = a.right - box.left, ay = a.top - box.top + a.height / 2, bx = x;
   Object.assign(leader.style, {left: `${Math.min(ax, bx)}px`, top: `${ay}px`, width: `${Math.abs(ax - bx)}px`, height: '1px'});
  }
  leader.hidden = false;
 }
 function setOpen(next){ open = next; toggle.setAttribute('aria-expanded', String(open)); render(); }
 function touch(id){
  if (!id) return;
  topic = id; open = true; toggle.setAttribute('aria-expanded', 'true');
  const i = log.indexOf(id); if (i >= 0) log.splice(i, 1); log.unshift(id); log.length = Math.min(log.length, 5);
  render();
 }
 // Ogni comando dichiara il suo argomento con data-legend; la nota segue l'ultimo comando toccato.
 const onTouch = e => { const el = e.target.closest?.('[data-legend]'); if (el && !element.contains(el)) touch(el.dataset.legend); };
 // Il foglio si trascina senza clic: alla fine del gesto la nota segue la vista.
 const onDrag = e => { if (e.target.closest?.('.sheet-pad-knob')) touch('view'); };
 const onKey = e => { if (e.key === 'Escape' && variant === 'cartiglio' && topic) { topic = null; open = false; render(); } else if (e.key !== 'Escape') onTouch(e); };
 // Al clic, non alla pressione: la nota non sposta i comandi prima che il gesto sia compiuto.
 document.addEventListener('click', onTouch, true);
 document.addEventListener('pointerup', onDrag, true);
 document.addEventListener('change', onTouch, true);
 document.addEventListener('keydown', onKey, true);
 toggle.textContent = it.legendShort;
 if (variant === 'cartiglio') open = false;
 toggle.setAttribute('aria-expanded', String(open));
 toggle.onclick = () => { if (variant === 'cartiglio') { topic = topic ? null : 'view'; open = !!topic; toggle.setAttribute('aria-expanded', String(open)); render(); } else setOpen(!open); };
 return {
  element,
  update(next){ state = next; render(); },
  // Il percorso porta la nota sul comando che il passo esercita (la vista, o il focalizzatore).
  focus(id){ touch(id); },
  dispose(){ document.removeEventListener('click', onTouch, true); document.removeEventListener('pointerup', onDrag, true); document.removeEventListener('change', onTouch, true); document.removeEventListener('keydown', onKey, true); element.remove(); leader.remove(); inline.remove(); container.classList.remove('has-note'); }
 };
}
