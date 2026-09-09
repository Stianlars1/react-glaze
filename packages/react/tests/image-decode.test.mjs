import test from "node:test";
import assert from "node:assert/strict";
import { decodedImage } from "../dist/engine/image-decode.js";

test("complete image metadata cannot bypass decoding, and callers share a pending decode", async () => {
  let finish,
    calls = 0;
  const image = {
    currentSrc: "/a",
    naturalWidth: 100,
    naturalHeight: 100,
    complete: true,
    decode() {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
  };
  const entry = decodedImage(image);
  assert.equal(entry.state, "pending");
  assert.equal(decodedImage(image), entry);
  assert.equal(calls, 1);
  finish();
  await entry.promise;
  assert.equal(entry.state, "decoded");
});
test("a replaced responsive source cannot become ready through the previous decode", async () => {
  const finish = [];
  const image = {
    currentSrc: "/a?w=600",
    naturalWidth: 100,
    naturalHeight: 100,
    decode() {
      return new Promise((resolve) => finish.push(resolve));
    },
  };
  const first = decodedImage(image);
  image.currentSrc = "/b?w=1200";
  const second = decodedImage(image);
  finish[0]();
  await first.promise;
  assert.equal(first.state, "stale");
  assert.equal(second.state, "pending");
  finish[1]();
  await second.promise;
  assert.equal(second.state, "decoded");
});
