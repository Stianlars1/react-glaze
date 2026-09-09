import test from "node:test";
import assert from "node:assert/strict";
import { GeometryCache } from "../dist/engine/geometry-cache.js";
import { REFERENCE } from "../dist/presets.js";

test("fractional translation and alternating sizes reuse geometry; eviction releases exactly once", () => {
  const cache = new GeometryCache(2);
  const a = cache.get(660, 280, REFERENCE);
  let aDisposals = 0,
    bDisposals = 0;
  a.addEventListener("dispose", () => aDisposals++);
  const b = cache.get(240, 64, REFERENCE);
  b.addEventListener("dispose", () => bDisposals++);
  assert.equal(cache.get(660.0000000001, 279.9999999999, REFERENCE), a);
  assert.equal(cache.get(660, 280, { ...REFERENCE, roughness: 0.7 }), a);
  cache.get(420, 200, REFERENCE);
  assert.equal(bDisposals, 1);
  assert.equal(aDisposals, 0);
  assert.equal(cache.size, 2);
  cache.dispose();
  cache.dispose();
  assert.equal(aDisposals, 1);
  assert.equal(bDisposals, 1);
  assert.equal(cache.size, 0);
});

test("subpixel DOM measurement noise cannot change the drawing-buffer width", async () => {
  const { layoutDimension } = await import("../dist/engine/geometry-cache.js");
  for (const width of [660, 660.00000000001, 659.99999999999])
    assert.equal(Math.floor((layoutDimension(width) + 48) * 1.5), 1062);
});

test("switching between baked and model-scaled lenses cannot reuse the wrong geometry", () => {
  const cache = new GeometryCache();
  const a = cache.get(320, 288, {
      ...REFERENCE,
      shape: "lens",
      optics: "smooth",
    }),
    b = cache.get(320, 288, {
      ...REFERENCE,
      shape: "lens",
      optics: "reference",
    });
  assert.notEqual(a, b);
  a.computeBoundingBox();
  b.computeBoundingBox();
  assert.ok(Math.abs(a.boundingBox.max.z - 1.42 * REFERENCE.depth) < 1e-5);
  assert.ok(Math.abs(b.boundingBox.max.z - 1.42) < 1e-5);
  cache.dispose();
});

test('cache keys include the effective CSS corners, not only the radius prop',()=>{
  const cache=new GeometryCache();
  const a=cache.get(200,120,REFERENCE,[[10,10],[20,20],[30,30],[40,40]]);
  const b=cache.get(200,120,REFERENCE,[[10,10],[20,20],[30,30],[41,41]]);
  assert.notEqual(a,b);
  assert.equal(a,cache.get(200.000000001,120,REFERENCE,[[10,10],[20,20],[30,30],[40.000000001,40]]));
  cache.dispose();
});
