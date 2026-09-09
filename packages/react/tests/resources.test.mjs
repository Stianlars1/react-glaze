import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForCaptureImages } from '../dist/engine/resources.js';

function fixture(t) {
  const root = new EventTarget();
  let images = [], mutation, observing = false;
  root.querySelectorAll = () => images;
  const original = globalThis.MutationObserver;
  globalThis.MutationObserver = class {
    constructor(callback) { mutation = callback; }
    observe() { observing = true; }
    disconnect() { observing = false; }
  };
  t.after(() => { globalThis.MutationObserver = original; });
  return {
    root,
    setImages(next) { images = next; mutation?.(); },
    get observing() { return observing; },
  };
}
test('capture waits for eager image loading to settle without polling', async t => {
  const f = fixture(t), abort = new AbortController();
  const image = { complete: false, loading: 'eager' };
  f.setImages([image]);
  let ready = false;
  const pending = waitForCaptureImages(f.root, () => true, abort.signal).then(() => ready = true);
  await Promise.resolve();
  assert.equal(ready, false);
  image.complete = true;
  f.root.dispatchEvent(new Event('load'));
  await pending;
  assert.equal(ready, true);
  assert.equal(f.observing, false);
});
test('unloaded lazy images and excluded sharp content do not block capture', async t => {
  const f = fixture(t);
  f.setImages([{complete:false, loading:'lazy'}, {complete:false, excluded:true}]);
  await waitForCaptureImages(f.root, image => !image.excluded, new AbortController().signal);
  assert.equal(f.observing, false);
});
test('removing a pending image releases its wait', async t => {
  const f = fixture(t);
  f.setImages([{complete:false}]);
  const pending = waitForCaptureImages(f.root, () => true, new AbortController().signal);
  f.setImages([]);
  await pending;
  assert.equal(f.observing, false);
});
test('a failed image settles and disposal cancels listeners and the observer', async t => {
  const f = fixture(t), abort = new AbortController();
  const image = {complete:false};
  f.setImages([image]);
  const failed = waitForCaptureImages(f.root, () => true, abort.signal);
  image.complete = true;
  f.root.dispatchEvent(new Event('error'));
  await failed;
  image.complete = false;
  const cancelled = waitForCaptureImages(f.root, () => true, abort.signal);
  abort.abort();
  await assert.rejects(cancelled, {name:'AbortError'});
  assert.equal(f.observing, false);
});
