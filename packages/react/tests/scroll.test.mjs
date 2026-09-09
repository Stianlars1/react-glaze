import test from "node:test";
import assert from "node:assert/strict";
import { createScrollFollower } from "../dist/engine/scroll.js";
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
function fixture(t) {
  let id = 0,
    point = [0, 0],
    active = true,
    changes = 0;
  const frames = new Map();
  t.mock.method(
    globalThis,
    "requestAnimationFrame",
    (fn) => {
      frames.set(++id, fn);
      return id;
    },
    { create: true },
  );
  t.mock.method(globalThis, "cancelAnimationFrame", (id) => frames.delete(id), {
    create: true,
  });
  const follower = createScrollFollower(
    () => point,
    () => changes++,
    () => active,
  );
  return {
    follower,
    frames,
    get changes() {
      return changes;
    },
    set point(next) {
      point = next;
    },
    set active(next) {
      active = next;
    },
    tick() {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn());
    },
  };
}
test("document scroll follows positions between native scroll events and then stops", (t) => {
  const f = fixture(t);
  assert.equal(f.frames.size, 0);
  f.point = [0, 10];
  f.follower.notify();
  assert.equal(f.changes, 1);
  f.point = [0, 25];
  f.tick();
  assert.equal(f.changes, 2);
  f.point = [0, 40];
  f.tick();
  assert.equal(f.changes, 3);
  for (let i = 0; i < 12; i++) f.tick();
  assert.equal(f.frames.size, 0);
  assert.equal(f.changes, 3);
});
test("repeated events coalesce and scrollend keeps the final position", (t) => {
  const f = fixture(t);
  f.point = [0, 10];
  for (let i = 0; i < 50; i++) f.follower.notify();
  assert.equal(f.frames.size, 1);
  assert.equal(f.changes, 1);
  f.point = [0, 20];
  f.follower.finish();
  assert.equal(f.changes, 2);
  assert.equal(f.frames.size, 0);
});
test("hidden, inactive and disposed followers leave no polling or callbacks", (t) => {
  const f = fixture(t);
  f.point = [0, 10];
  f.follower.notify();
  f.active = false;
  f.point = [0, 20];
  f.tick();
  assert.equal(f.frames.size, 0);
  assert.equal(f.changes, 1);
  f.active = true;
  f.follower.notify();
  f.follower.dispose();
  f.point = [0, 40];
  f.follower.notify();
  f.tick();
  assert.equal(f.frames.size, 0);
  assert.equal(f.changes, 2);
});
