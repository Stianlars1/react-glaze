import test from 'node:test';
import assert from 'node:assert/strict';
import { RIM_REST_DIRECTION, rimTarget, advanceRim, affectsRimGeometry, idleRim } from '../dist/engine/rim-light-motion.js';

const rect = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };

test('rim light rests without a pointer and outside its local reach', () => {
  assert.deepEqual(rimTarget(rect, null, 100), RIM_REST_DIRECTION);
  assert.deepEqual(rimTarget(rect, { x: 201, y: 50 }, 100), RIM_REST_DIRECTION);
  assert.deepEqual(rimTarget(rect, { x: 200, y: 50 }, 100), RIM_REST_DIRECTION);
  assert.deepEqual(rimTarget(rect, { x: 101, y: 50 }, 0), RIM_REST_DIRECTION);
});

test('the pointer controls the facing edge and fades continuously through nearby space', () => {
  const inside = rimTarget(rect, { x: 100, y: 50 }, 100);
  const nearby = rimTarget(rect, { x: 145, y: 50 }, 100);
  assert.ok(inside.x > 0.7);
  assert.equal(inside.y, 0);
  assert.ok(nearby.x < inside.x && nearby.x > RIM_REST_DIRECTION.x);
  const atCenter = rimTarget(rect, { x: 50, y: 50 }, 100);
  assert.equal(atCenter.x, 0);
  assert.equal(atCenter.y, 0);
});

test('nearby falloff has no angular seam opposite the resting light', () => {
  const above = rimTarget(rect, { x: 135, y: 135 - 0.0001 }, 100);
  const below = rimTarget(rect, { x: 135, y: 135 + 0.0001 }, 100);
  assert.ok(Math.hypot(above.x - below.x, above.y - below.y) < 0.00001);
});

test('damping follows elapsed time consistently at 60 and 120 Hz', () => {
  const target = rimTarget(rect, { x: 100, y: 50 }, 100);
  const run = hz => {
    let value = RIM_REST_DIRECTION;
    for (let i = 0; i < hz / 2; i++) value = advanceRim(value, target, 1 / hz, 0.14);
    return value;
  };
  const a = run(60), b = run(120);
  assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-10);
});

test('the light settles exactly without overshooting or needing an idle loop', () => {
  let value = { x: 0.9, y: 0.2 };
  for (let i = 0; i < 240; i++) {
    value = advanceRim(value, RIM_REST_DIRECTION, 1 / 60, 0.22);
    assert.ok(value.x >= RIM_REST_DIRECTION.x && value.x <= 0.9);
  }
  assert.equal(value.x, RIM_REST_DIRECTION.x);
  assert.equal(value.y, RIM_REST_DIRECTION.y);
  assert.equal(value.moving, false);
});

test('empty or invalid bounds cannot create invalid lighting values', () => {
  for (const bounds of [{ ...rect, width: 0 }, { ...rect, left: NaN }, { ...rect, height: Infinity }]) {
    assert.deepEqual(rimTarget(bounds, { x: 50, y: 50 }, 100), RIM_REST_DIRECTION);
  }
});

test('decorative animations cannot keep pointer lighting active indefinitely', () => {
  assert.equal(affectsRimGeometry([{ offset: 0, backgroundColor: 'red', opacity: 1 }, { offset: 1, backgroundColor: 'blue', opacity: 0.5 }]), false);
  assert.equal(affectsRimGeometry([{ boxShadow: '0 0 4px white', borderRadius: '50%' }]), false);
  assert.equal(affectsRimGeometry([{ transform: 'translateX(20px)' }]), true);
  assert.equal(affectsRimGeometry([{ marginTop: '12px', width: '20px' }]), true);
});

 test('hold keeps the actual displayed direction when tracking ends without idle motion', () => {
  const current = { x: 0.81, y: -0.14 };
  const target = idleRim(current, 'hold');
  assert.deepEqual(target, { ...current, tracking: false });
  assert.deepEqual(advanceRim(current, target, 1 / 60, 0.22), { ...current, moving: false });
  assert.deepEqual(idleRim(current, 'return'), RIM_REST_DIRECTION);
});

 test('hold does not fade back to upper left while approaching the reach boundary', () => {
  const target = rimTarget(rect, { x: 199, y: 50 }, 100, 'hold');
  assert.ok(target.x > 0.9);
  assert.equal(target.y, 0);
  assert.equal(target.tracking, true);
  assert.equal(rimTarget(rect, { x: 200, y: 50 }, 100, 'hold').tracking, false);
});
