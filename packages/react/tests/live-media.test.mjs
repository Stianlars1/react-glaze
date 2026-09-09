import test from "node:test";
import assert from "node:assert/strict";
import { composeMatte } from "../dist/engine/matte-composition.js";
import { selectorNeedsFullCapture } from "../dist/engine/capture-changes.js";

test("native media changes cannot overwrite an opaque foreground or its alpha", () => {
  const result = new Uint8ClampedArray(8);
  composeMatte(
    new Uint8ClampedArray([40, 80, 120, 180, 0, 0, 0, 255]),
    new Uint8ClampedArray([40, 80, 120, 180, 255, 255, 255, 255]),
    new Uint8ClampedArray([255, 0, 180, 255, 50, 100, 200, 255]),
    result,
  );
  assert.deepEqual([...result], [40, 80, 120, 180, 50, 100, 200, 255]);
});
test("a translucent colored overlay preserves its contribution as the image changes", () => {
  const result = new Uint8ClampedArray(4);
  composeMatte(
    new Uint8ClampedArray([20, 40, 80, 255]),
    new Uint8ClampedArray([148, 168, 208, 255]),
    new Uint8ClampedArray([200, 100, 50, 255]),
    result,
  );
  assert.deepEqual([...result], [120, 90, 105, 255]);
});
test("attribute-dependent and relational CSS prevent reuse of a media template", () => {
  for (const selector of [
    "body:has(img)",
    'img[src*="dark"] ~ p',
    "[ STYLE ] + label",
    ":is([alt], .x)",
  ])
    assert.equal(selectorNeedsFullCapture(selector), true, selector);
  for (const selector of [
    ".gallery > img",
    ".notice:empty",
    ".card:nth-child(2)",
    '[data-theme="dark"] img',
  ])
    assert.equal(selectorNeedsFullCapture(selector), false, selector);
});
