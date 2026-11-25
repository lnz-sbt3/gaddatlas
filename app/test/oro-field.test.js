import test from "node:test";
import assert from "node:assert/strict";
import {kernelValue, buildField, traceLevels, dissolveZoom, chaikin} from "../src/render/oro-field.js";

test("la campana vale B al centro e zero dal bordo in poi", () => {
  assert.equal(kernelValue(0, 10, 7), 7);
  assert.equal(kernelValue(10, 10, 7), 0);
  assert.equal(kernelValue(15, 10, 7), 0);
  assert.ok(kernelValue(5, 10, 7) > 0 && kernelValue(5, 10, 7) < 7);
});

test("il campo fonde a massimo, non a somma", () => {
  const mounds = [{x: 0, y: 0, R: 10, B: 4}, {x: 1, y: 0, R: 10, B: 4}];
  const field = buildField(mounds, {gridKernel: 10});
  let max = 0;
  for (const v of field.grid) if (v > max) max = v;
  assert.ok(max <= 4 + 1e-6, `massimo ${max} oltre B`);
});

test("senza monti o con finestra vuota non c'è campo", () => {
  assert.equal(buildField([]), null);
  const field = buildField([{x: 0, y: 0, R: 5, B: 2}], {window: [100, 100, 200, 200]});
  assert.equal(field, null);
});

test("il passo della griglia segue il kernel più piccolo", () => {
  const field = buildField([{x: 0, y: 0, R: 12, B: 3}], {gridKernel: 6});
  assert.ok(Math.abs(field.h - 2) < 1e-9);
});

test("due monti lontani danno due anelli, vicini uno solo", () => {
  const far = buildField([{x: 0, y: 0, R: 8, B: 3}, {x: 40, y: 0, R: 8, B: 3}], {gridKernel: 8});
  const farL1 = traceLevels(far, [{x: 0, y: 0, B: 3}, {x: 40, y: 0, B: 3}], 1)[0];
  assert.equal(farL1.length, 2);
  const near = buildField([{x: 0, y: 0, R: 8, B: 3}, {x: 6, y: 0, R: 8, B: 3}], {gridKernel: 8});
  const nearL1 = traceLevels(near, [{x: 0, y: 0, B: 3}, {x: 6, y: 0, B: 3}], 1)[0];
  assert.equal(nearL1.length, 1);
});

test("gli anelli sono chiusi: primo e ultimo punto coincidono", () => {
  const field = buildField([{x: 0, y: 0, R: 8, B: 2}], {gridKernel: 8});
  for (const rows of traceLevels(field, [{x: 0, y: 0, B: 2}], 2)) {
    for (const {pts} of rows) {
      const a = pts[0], b = pts[pts.length - 1];
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6);
    }
  }
});

test("il proprietario di un componente ha banda sufficiente per il livello", () => {
  const mounds = [{x: 0, y: 0, R: 8, B: 1}, {x: 5, y: 0, R: 8, B: 4}];
  const field = buildField(mounds, {gridKernel: 8});
  const levels = traceLevels(field, mounds, 4);
  for (let L = 2; L <= 4; L++) {
    for (const {owner} of levels[L - 1]) assert.equal(owner, 1, `livello ${L}`);
  }
});

test("al livello 1 i membri sono i monti dentro l'anello", () => {
  const mounds = [{x: 0, y: 0, R: 8, B: 2}, {x: 6, y: 0, R: 8, B: 3}, {x: 50, y: 0, R: 8, B: 1}];
  const field = buildField(mounds, {gridKernel: 8});
  const L1 = traceLevels(field, mounds, 1)[0];
  const merged = L1.find(r => r.members.length === 2);
  const alone = L1.find(r => r.members.length === 1);
  assert.ok(merged && alone);
  assert.deepEqual(merged.members, [0, 1]);
  assert.deepEqual(alone.members, [2]);
});

test("un picco più alto può coprire uno basso finché non si scioglie", () => {
  // generalizzazione dichiarata: il monte basso dentro il kernel dell'alto
  // non ha un anello proprio al livello 1
  const mounds = [{x: 0, y: 0, R: 20, B: 9}, {x: 3, y: 0, R: 20, B: 1}];
  const field = buildField(mounds, {gridKernel: 10});
  const L1 = traceLevels(field, mounds, 1)[0];
  assert.equal(L1.length, 1);
  assert.deepEqual(L1[0].members, [0, 1]);
});

test("lo zoom di scioglimento inverte il pavimento di schermo", () => {
  const k = dissolveZoom({rEffMin: 2, floorCSS: 12, fit: 0.75, dissolve: 1.2});
  // al zoom k il pavimento in mondo vale floorCSS/(k·fit) = rEffMin·dissolve
  assert.ok(Math.abs(12 / (k * 0.75) - 2 * 1.2) < 1e-9);
});

test("la smussatura raddoppia i punti a ogni passaggio e resta nel guscio convesso", () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const once = chaikin(square, 1);
  assert.equal(once.length, 8);
  const twice = chaikin(square, 2);
  assert.equal(twice.length, 16);
  for (const [x, y] of twice) {
    assert.ok(x >= 0 && x <= 10 && y >= 0 && y <= 10);
  }
});
