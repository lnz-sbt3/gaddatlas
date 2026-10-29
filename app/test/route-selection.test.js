import test from "node:test";
import assert from "node:assert/strict";
import selection from "../src/interaction/route-selection.js";

test("la terrazza apre il riferimento anche senza una route", () => {
  const selected = [];
  const state = selection.create({
    getFocalizer: () => "ingravallo", getLodEased: () => 1,
    getHostIndex: () => 248, getHoverTerrace: () => 2,
    getRoleSortTarget: () => 1,
    roleBands: {posOfBand(i, k, grouped) {
      assert.deepEqual([i, k, grouped], [248, 2, true]);
      return 0;
    }},
    sequence: [{referenceId: "ref_00007"}], routeIdByReferenceId: new Map(),
    onReferenceSelect: (...args) => selected.push(args),
  });
  state.selectFromTerrace();
  assert.deepEqual(selected, [[248, "ref_00007"]]);
  assert.equal(state.id, null);
});

test("una terrazza non indirizzabile non apre un riferimento", () => {
  const state = selection.create({
    getFocalizer: () => null, getLodEased: () => 1,
    getHostIndex: () => 248, getHoverTerrace: () => 2,
    onReferenceSelect: () => assert.fail("callback inattesa"),
  });
  state.selectFromTerrace();
  assert.equal(state.id, null);
});
