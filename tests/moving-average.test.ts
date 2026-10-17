import assert from "node:assert/strict";
import { test } from "node:test";
import { sma } from "../src/analysis/moving-average.js";

test("sma averages a trailing window and pads warm-up with null", () => {
  assert.deepEqual(sma([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
});

test("sma with period 1 is the input", () => {
  assert.deepEqual(sma([5, 7], 1), [5, 7]);
});

test("sma rejects non-positive or fractional periods", () => {
  assert.throws(() => sma([1], 0), RangeError);
  assert.throws(() => sma([1], 1.5), RangeError);
});
