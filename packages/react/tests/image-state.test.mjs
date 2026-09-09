import test from 'node:test';
import assert from 'node:assert/strict';
import { rememberImageState, imageStateChanged } from '../dist/engine/image-state.js';

test('a delayed load event for already complete captured pixels needs no new snapshot', () => {
  const image = {currentSrc:'/new.jpg', src:'/fallback.jpg', complete:true, naturalWidth:640, naturalHeight:480};
  const state = rememberImageState(image);
  assert.equal(imageStateChanged(image, state), false);
});
test('loading, responsive source selection and intrinsic size changes invalidate old pixels', () => {
  const image = {currentSrc:'/old.jpg', src:'/fallback.jpg', complete:false, naturalWidth:640, naturalHeight:480};
  const state = rememberImageState(image);
  image.complete = true;
  assert.equal(imageStateChanged(image, state), true);
  const loaded = rememberImageState(image);
  image.currentSrc = '/new.jpg';
  assert.equal(imageStateChanged(image, loaded), true);
  image.currentSrc = '/old.jpg';
  image.naturalHeight = 640;
  assert.equal(imageStateChanged(image, loaded), true);
  assert.equal(imageStateChanged(image), true);
});
