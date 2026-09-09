import test from "node:test";
import assert from "node:assert/strict";
import { createQueue } from "../dist/engine/queue.js";

function fixture(t, options = {}) {
  let id = 0,
    draws = 0;
  const frames = new Map(),
    requests = [],
    commits = [],
    released = [],
    errors = [];
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
  const queue = createQueue({
    ...options,
    capture: (begin) => {
      if (!options.deferStart) begin?.();
      return new Promise((resolve, reject) => requests.push({ resolve, reject, begin }));
    },
    commit: (value) => commits.push(value),
    render: () => draws++,
    release: (value) => released.push(value),
    onError: (e) => errors.push(e),
  });
  t.after(() => queue.dispose());
  return {
    queue,
    requests,
    commits,
    released,
    errors,
    frames,
    get draws() {
      return draws;
    },
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((f) => f());
    },
    async settle() {
      await Promise.resolve();
    },
  };
}
// The scheduler is exercised without browser timing or a GPU.
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
test("many view changes produce one draw and no capture", (t) => {
  const f = fixture(t);
  for (let i = 0; i < 100; i++) f.queue.viewChanged();
  f.flush();
  assert.equal(f.draws, 1);
  assert.equal(f.requests.length, 0);
  assert.equal(f.frames.size, 0);
});
test("stale captures never commit after a real source change", async (t) => {
  const f = fixture(t);
  f.queue.sourceChanged();
  f.flush();
  f.queue.sourceChanged();
  f.requests[0].resolve("old");
  await f.settle();
  f.flush();
  assert.deepEqual(f.released, ["old"]);
  f.requests[1].resolve("new");
  await f.settle();
  f.flush();
  assert.deepEqual(f.commits, ["new"]);
});
test("changes while waiting for another root coalesce into the capture that actually starts", async (t) => {
  const f = fixture(t, { deferStart: true });
  f.queue.sourceChanged();
  f.flush();
  f.queue.sourceChanged();
  f.requests[0].begin?.();
  f.requests[0].resolve("latest image");
  await f.settle();
  f.flush();
  assert.deepEqual(f.commits, ["latest image"]);
  assert.deepEqual(f.released, []);
  assert.equal(f.requests.length, 1);
  assert.equal(f.frames.size, 0);
});
test("a resource change after actual capture start still discards its old pixels", async (t) => {
  const f = fixture(t, { deferStart: true });
  f.queue.sourceChanged();
  f.flush();
  f.requests[0].begin?.();
  f.queue.sourceChanged();
  f.requests[0].resolve("old image");
  await f.settle();
  f.flush();
  assert.deepEqual(f.commits, []);
  assert.deepEqual(f.released, ["old image"]);
  f.requests[1].begin?.();
  f.requests[1].resolve("new image");
  await f.settle();
  f.flush();
  assert.deepEqual(f.commits, ["new image"]);
});
test("a hidden root waiting to start captures no pixels and reports no error", async (t) => {
  let enter;
  const frames = new Map(), errors = [];
  let id = 0, captures = 0;
  t.mock.method(globalThis, "requestAnimationFrame", fn => {frames.set(++id, fn); return id;});
  t.mock.method(globalThis, "cancelAnimationFrame", id => frames.delete(id));
  const queue = createQueue({
    capture: async begin => {
      await new Promise(resolve => {enter = resolve;});
      begin();
      captures++;
      return "pixels";
    },
    commit: () => assert.fail("inactive capture committed"),
    render: () => {}, release: () => {}, onError: error => errors.push(error),
  });
  t.after(() => queue.dispose());
  queue.sourceChanged();
  const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn());
  queue.setActive(false);
  enter();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(captures, 0);
  assert.equal(queue.metrics.captureAttempts, 0);
  assert.deepEqual(errors, []);
  assert.equal(frames.size, 0);
});
test("continuous animation makes progress while at most one capture is in flight", async (t) => {
  const f = fixture(t);
  f.queue.sourceChanged();
  f.flush();
  for (let i = 0; i < 40; i++) {
    f.queue.sourceChanged(true);
    f.flush();
  }
  assert.equal(f.requests.length, 1);
  f.requests[0].resolve("frame");
  await f.settle();
  f.flush();
  assert.deepEqual(f.commits, ["frame"]);
  assert.equal(f.requests.length, 2);
});
test("invisible scene stops work, discards pending results and refreshes on return", async (t) => {
  const f = fixture(t);
  f.queue.sourceChanged();
  f.flush();
  f.queue.setActive(false);
  f.requests[0].resolve("hidden");
  await f.settle();
  assert.equal(f.frames.size, 0);
  assert.deepEqual(f.released, ["hidden"]);
  f.queue.setActive(true);
  f.flush();
  assert.equal(f.requests.length, 2);
});
test("unmount releases a late capture without drawing or callbacks", async (t) => {
  const f = fixture(t);
  f.queue.sourceChanged();
  f.flush();
  f.queue.dispose();
  f.requests[0].resolve("late");
  await f.settle();
  f.flush();
  assert.deepEqual(f.released, ["late"]);
  assert.equal(f.draws, 0);
  assert.deepEqual(f.commits, []);
});
test("capture failure reports once and can recover on the next change", async (t) => {
  const f = fixture(t);
  f.queue.sourceChanged();
  f.flush();
  f.requests[0].reject(new Error("unavailable"));
  await f.settle();
  assert.equal(f.errors.length, 1);
  assert.equal(f.frames.size, 0);
  f.queue.sourceChanged();
  f.flush();
  f.requests[1].resolve("recovered");
  await f.settle();
  f.flush();
  assert.deepEqual(f.commits, ["recovered"]);
});

test("capture cooldown does not block moving glass and stops its timer when hidden", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let now = 0;
  t.mock.method(performance, "now", () => now);
  const f = fixture(t, { captureInterval: 100 });
  f.queue.sourceChanged();
  f.flush();
  f.queue.sourceChanged(true);
  f.requests[0].resolve("first");
  await f.settle();
  f.flush();
  assert.equal(f.requests.length, 1);
  assert.equal(f.draws, 1);
  f.queue.viewChanged();
  f.flush();
  assert.equal(f.draws, 2);
  assert.equal(f.requests.length, 1);
  now = 100;
  t.mock.timers.tick(100);
  f.flush();
  assert.equal(f.requests.length, 2);
  f.queue.sourceChanged(true);
  f.queue.setActive(false);
  f.requests[1].resolve("hidden");
  await f.settle();
  now = 1000;
  t.mock.timers.tick(900);
  f.flush();
  assert.equal(f.requests.length, 2);
  assert.equal(f.frames.size, 0);
  assert.equal(f.queue.metrics.captureAttempts, 2);
  assert.equal(f.queue.metrics.discardedCaptures, 1);
});
