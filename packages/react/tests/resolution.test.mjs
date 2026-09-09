import test from "node:test";
import assert from "node:assert/strict";
import { boundedPixelRatio } from "../dist/engine/resolution.js";
test("retina sources follow the view budget and large roots have bounded texture memory", () => {
  assert.equal(boundedPixelRatio(390, 720, 1.5), 1.5);
  for (const [w, h] of [
    [1200, 720],
    [4000, 8000],
    [390, 60000],
  ]) {
    const ratio = boundedPixelRatio(w, h, 2);
    assert.ok(w * h * ratio * ratio <= 2097152 + 1e-5);
    assert.ok(Math.max(w, h) * ratio <= 4096 + 1e-5);
  }
});

test("mixed surface sizes reuse a drawing buffer while pathological aspect ratios stay bounded", async () => {
  const { drawingBufferSize } = await import("../dist/engine/resolution.js");
  let buffer = { width: 0, height: 0 };
  for (const [w, h] of [
    [228, 120],
    [254, 132],
    [280, 144],
    [358, 180],
  ])
    buffer = drawingBufferSize(buffer.width, buffer.height, w, h);
  assert.deepEqual(buffer, { width: 358, height: 180 });
  assert.deepEqual(
    drawingBufferSize(buffer.width, buffer.height, 228, 120),
    buffer,
  );
  assert.deepEqual(drawingBufferSize(4000, 100, 100, 4000), {
    width: 100,
    height: 4000,
  });
});
