import test from "node:test";
import assert from "node:assert/strict";
import { createFrameBatch } from "../dist/engine/frames.js";

test("all roots draw before a capture promise continuation can run", async (t) => {
  const original = globalThis.requestAnimationFrame;
  t.after(() => {
    globalThis.requestAnimationFrame = original;
  });
  const scheduled = [];
  globalThis.requestAnimationFrame = (callback) => {
    scheduled.push(callback);
    return scheduled.length;
  };
  const frames = createFrameBatch(),
    events = [];
  frames.request(() => {
    events.push("first draw");
    Promise.resolve().then(() => events.push("capture"));
  });
  frames.request(() => events.push("second draw"));
  assert.equal(scheduled.length, 1);
  scheduled.shift()();
  await Promise.resolve();
  assert.deepEqual(events, ["first draw", "second draw", "capture"]);
  assert.equal(scheduled.length, 0);
});
test("unmounting another root during a draw cancels its pending work", (t) => {
  const original = globalThis.requestAnimationFrame;
  t.after(() => {
    globalThis.requestAnimationFrame = original;
  });
  let run;
  globalThis.requestAnimationFrame = (callback) => {
    run = callback;
    return 1;
  };
  const frames = createFrameBatch();
  let drew = false;
  frames.request(() => frames.cancel(other));
  const other = frames.request(() => {
    drew = true;
  });
  run();
  assert.equal(drew, false);
});
