import test from "node:test";
import assert from "node:assert/strict";
import { createViewportInvalidation } from "../dist/engine/viewport.js";

function fixture(t) {
  let id = 0,
    invalidations = 0;
  const timers = new Map();
  t.mock.method(globalThis, "setTimeout", (fn) => {
    timers.set(++id, fn);
    return id;
  });
  t.mock.method(globalThis, "clearTimeout", (id) => timers.delete(id));
  const layout = { width: 440, height: 796, dpr: 3 };
  const viewport = createViewportInvalidation(layout, () => invalidations++);
  return {
    viewport,
    layout,
    timers,
    get invalidations() {
      return invalidations;
    },
    flush() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((fn) => fn());
    },
  };
}
test("visual-only resize coalesces until document scrolling settles", (t) => {
  const f = fixture(t);
  f.viewport.resize(f.layout);
  for (let i = 0; i < 100; i++) f.viewport.scroll();
  assert.equal(f.invalidations, 0);
  assert.equal(f.timers.size, 1);
  f.flush();
  assert.equal(f.invalidations, 1);
  assert.equal(f.timers.size, 0);
  f.viewport.scroll();
  assert.equal(f.timers.size, 0);
});
test("real layout viewport and DPR changes invalidate immediately", (t) => {
  const f = fixture(t);
  f.viewport.resize(f.layout);
  f.viewport.resize({ ...f.layout, width: 800 });
  assert.equal(f.invalidations, 1);
  assert.equal(f.timers.size, 0);
  f.viewport.resize({ ...f.layout, width: 800, dpr: 2 });
  assert.equal(f.invalidations, 2);
});
test("hidden and disposed viewports cancel deferred capture without idle polling", (t) => {
  const f = fixture(t);
  f.viewport.resize(f.layout);
  f.viewport.cancel();
  assert.equal(f.timers.size, 0);
  f.flush();
  assert.equal(f.invalidations, 0);
  f.viewport.resize(f.layout);
  f.viewport.dispose();
  f.viewport.resize(f.layout);
  f.viewport.scroll();
  assert.equal(f.timers.size, 0);
  assert.equal(f.invalidations, 0);
});
