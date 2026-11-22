import test from 'node:test';
import assert from 'node:assert/strict';
import createIncisa, {CYCLE, cyclePosition, splitCyclePosition} from '../src/ui/ghiera-incisa.js';
const mod = n => ((n % 4) + 4) % 4;
test('Il modulo si importa senza DOM, dati o trasporto', () => { assert.equal(typeof createIncisa, 'function'); assert.ok(Object.isFrozen(CYCLE)); });
test('Le quattro viste e la chiusura hanno gli identificatori esistenti', () => { assert.deepEqual(CYCLE, ['map2d', 'diagram2d', 'diagram_axon', 'map_axon']); for (let q = -12; q <= 12; q++) assert.deepEqual(splitCyclePosition(q), {from: CYCLE[mod(q)], to: CYCLE[mod(q)], p: 0}); });
test('Qualunque frazione resta su una sola coppia adiacente, anche oltre il giro', () => {
  for (let turn = -8; turn <= 8; turn++) for (const p of [.125, .333, .499, .75, .999]) {
    const position = turn + p, frame = splitCyclePosition(position);
    assert.equal(frame.from, CYCLE[mod(turn)]); assert.equal(frame.to, CYCLE[mod(turn + 1)]);
    assert.ok(Math.abs(mod(cyclePosition(frame)) - mod(position)) < 1e-7);
  }
});
test('Scambiare gli estremi e invertire p conserva la stessa posizione', () => {
  for (let i = 0; i < CYCLE.length; i++) for (const p of [0, .15, .5, .85, 1]) {
    const a = {from: CYCLE[i], to: CYCLE[mod(i + 1)], p}, b = {from: a.to, to: a.from, p: 1 - p};
    assert.ok(Math.abs(mod(cyclePosition(a)) - mod(cyclePosition(b))) < 1e-7);
  }
});
test('I salti diagonali e gli stati estranei vengono respinti', () => {
  for (let i = 0; i < 4; i++) assert.throws(() => cyclePosition({from: CYCLE[i], to: CYCLE[mod(i + 2)], p: .5}), RangeError);
  assert.throws(() => cyclePosition({from: 'diagram2d_fict', to: 'map2d', p: .5}), TypeError);
});
test('I valori non finiti e le frazioni esterne vengono respinti', () => {
  for (const q of [NaN, Infinity, -Infinity]) assert.throws(() => splitCyclePosition(q), TypeError);
  for (const p of [NaN, Infinity, -.01, 1.01]) assert.throws(() => cyclePosition({from: 'map2d', to: 'diagram2d', p}), TypeError);
});
test('Le funzioni non mutano il frame del trasporto', () => { const frame = Object.freeze({from: 'map2d', to: 'diagram2d', p: .4}); assert.equal(cyclePosition(frame), .4); assert.equal(frame.p, .4); });
