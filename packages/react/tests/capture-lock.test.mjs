import test from "node:test";
import assert from "node:assert/strict";
import { withCaptureLock } from "../dist/engine/capture-lock.js";

test("different roots serialize capture, cancelled waiting work is skipped, and errors release the lock", async () => {
  const a = new AbortController(),
    b = new AbortController(),
    c = new AbortController();
  let finish;
  const events = [];
  const one = withCaptureLock(a.signal, async () => {
    events.push("one");
    await new Promise((r) => (finish = r));
    throw new Error("capture failed");
  });
  const failed = assert.rejects(one, /capture failed/);
  const two = withCaptureLock(b.signal, async () => events.push("two"));
  const cancelled = assert.rejects(two, { name: "AbortError" });
  const three = withCaptureLock(c.signal, async () => events.push("three"));
  await Promise.resolve();
  assert.deepEqual(events, ["one"]);
  b.abort();
  finish();
  await Promise.all([failed, cancelled, three]);
  assert.deepEqual(events, ["one", "three"]);
});
