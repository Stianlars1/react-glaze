import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SURFACES } from '../dist/morph/model.js';
import { MotionState } from '../dist/morph/motion.js';
import { arrangementDirection, arrangementDirections, makeSplitLayout } from '../dist/morph/split-layout.js';

const directions = ['left', 'top', 'right', 'bottom'];
const arrangements = ['row', 'column', 'fan'];
const keys = ['x', 'y', 'w', 'h', 'r'];
const views = [{ w: 882, h: 510 }, { w: 358, h: 520 }, { w: 472, h: 420 }];
const measuredWidths = [98, 124, 146, 112, 108, 120, 104];
const closed = [
  { id: 'trigger', x: 0, y: 0, w: 72, h: 72, r: 36 },
  { id: 'save', x: 0, y: 0, w: 0, h: 0, r: 0 },
];
const opened = [closed[0], { id: 'save', x: 160, y: 0, w: 56, h: 56, r: 28 }];

function actions(count, size = 58, labels = false) {
  return Array.from({ length: count }, (_, index) => ({
    id: `action-${index}`,
    w: labels ? Math.max(size, measuredWidths[index]) : size,
    h: size,
  }));
}

function layout(view, arrangement, direction, count = 3, size = 58, labels = false, distance = 0) {
  return makeSplitLayout(view, view.w < 600 ? 58 : 72,
    actions(count, size, labels), arrangement, direction, distance);
}

function assertClose(actual, expected, tolerance = 1e-8) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
}

function assertSafe(result, view, count, triggerGap = 12) {
  assert.equal(result.surfaces.length, count + 1);
  assert.equal(result.fits, true, JSON.stringify({ result, view }));
  for (const surface of result.surfaces) {
    assert.ok(surface.x - surface.w / 2 >= 20 - 1e-5);
    assert.ok(surface.x + surface.w / 2 <= view.w - 20 + 1e-5);
    assert.ok(surface.y - surface.h / 2 >= 20 - 1e-5);
    assert.ok(surface.y + surface.h / 2 <= view.h - 20 + 1e-5);
  }
  for (let i = 0; i < result.surfaces.length; i++) for (let j = i + 1; j < result.surfaces.length; j++) {
    const a = result.surfaces[i], b = result.surfaces[j];
    const gap = i === 0 ? triggerGap : 12;
    const dx = Math.abs(a.x - b.x) - (a.w + b.w) / 2;
    const dy = Math.abs(a.y - b.y) - (a.h + b.h) / 2;
    assert.ok(dx >= gap - 1e-5 || dy >= gap - 1e-5, JSON.stringify({ a, b, gap, dx, dy }));
  }
}

function assertRigid(before, after) {
  for (let i = 1; i < before.surfaces.length; i++) for (let j = i + 1; j < before.surfaces.length; j++) {
    for (const axis of ['x', 'y']) {
      assertClose(after.surfaces[i][axis] - after.surfaces[j][axis],
        before.surfaces[i][axis] - before.surfaces[j][axis]);
    }
  }
}

function motion(duration = 500, bounce = 0.5) {
  const state = new MotionState();
  state.configure({ duration, bounce });
  state.retarget(closed, false);
  state.retarget(opened);
  return state;
}

function settled(surfaces = opened) {
  const state = new MotionState();
  state.seek(surfaces, surfaces, 1);
  return state;
}

function assertRest(state, surfaces) {
  assert.equal(state.active, false);
  assert.deepEqual(state.surfaces, surfaces);
  assert.equal(state.openness.velocity, 0);
  for (const item of state.items.values()) for (const key of keys) {
    assert.equal(item[key].velocity, 0);
    assert.equal(item[key].value, item[key].target);
  }
}

function assertSurfacesClose(actual, expected, tolerance = 1e-8) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < actual.length; index++) {
    assert.equal(actual[index].id, expected[index].id);
    for (const key of ['x', 'y', 'w', 'h', 'r'])
      assertClose(actual[index][key], expected[index][key], tolerance);
  }
}

test('row and column use their compatible directions and preserve a 12px gap', () => {
  assert.deepEqual(arrangementDirections('row'), ['left', 'right']);
  assert.deepEqual(arrangementDirections('column'), ['top', 'bottom']);
  assert.deepEqual(arrangementDirections('fan'), directions);
  assert.equal(arrangementDirection('row', 'top'), 'right');
  assert.equal(arrangementDirection('column', 'left'), 'top');
  for (const arrangement of ['row', 'column']) for (const direction of arrangementDirections(arrangement)) {
    const result = layout({ w: 900, h: 700 }, arrangement, direction);
    const axis = arrangement === 'row' ? 'y' : 'x';
    assert.equal(result.direction, direction);
    assert.equal(result.wrapped, false);
    assert.ok(result.surfaces.every(surface => surface[axis] === result.surfaces[0][axis]));
    assertSafe(result, { w: 900, h: 700 }, 3);
  }
});

test('three-action fan keeps the approved 116-degree sweep in every direction', () => {
  for (const direction of directions) {
    const result = layout({ w: 900, h: 700 }, 'fan', direction, 3);
    const [trigger, a, b, c] = result.surfaces;
    const axis = direction === 'top' || direction === 'bottom' ? 'x' : 'y';
    const outward = axis === 'x' ? 'y' : 'x';
    const sign = direction === 'top' || direction === 'left' ? -1 : 1;
    assert.equal(result.direction, direction);
    assert.equal(result.wrapped, false);
    assertClose(b[axis], trigger[axis]);
    assertClose((a[axis] + c[axis]) / 2, trigger[axis]);
    assert.ok(sign * (b[outward] - trigger[outward]) > sign * (a[outward] - trigger[outward]));
    const dot = (a.x - trigger.x) * (c.x - trigger.x) + (a.y - trigger.y) * (c.y - trigger.y);
    const lengths = Math.hypot(a.x - trigger.x, a.y - trigger.y) * Math.hypot(c.x - trigger.x, c.y - trigger.y);
    assertClose(Math.acos(dot / lengths) * 180 / Math.PI, 116);
  }
});

test('fan fits the count, direction, measured-label and viewport matrix', () => {
  for (const view of views) for (const count of [1, 2, 3, 4, 5, 6])
    for (const labels of [false, true]) for (const direction of directions) {
      const result = layout(view, 'fan', direction, count, 58, labels);
      assertSafe(result, view, count);
      for (let i = 1; i < result.surfaces.length; i++) {
        assert.equal(result.surfaces[i].w, labels ? measuredWidths[i - 1] : 58);
      }
    }
});

test('the field capacity is eight surfaces and layout can retain seven actions', () => {
  assert.equal(MAX_SURFACES, 8);
  assertSafe(layout({ w: 1200, h: 900 }, 'fan', 'right', 7), { w: 1200, h: 900 }, 7);
});

test('large labeled actions wrap safely without shrinking or losing requested items', () => {
  const view = { w: 472, h: 420 };
  const items = Array.from({ length: 6 }, (_, index) => ({ id: `long-${index}`, w: 160, h: 58 }));
  const result = makeSplitLayout(view, 58, items, 'row', 'right', 120);
  assert.equal(result.wrapped, true);
  assert.equal(result.distance, 0);
  assertSafe(result, view, 6);
  assert.ok(result.surfaces.slice(1).every(surface => surface.w === 160 && surface.h === 58));
});

test('impossible bounds report fits false and an empty menu only retains its trigger', () => {
  const impossible = makeSplitLayout({ w: 100, h: 100 }, 72, actions(2, 100), 'row', 'right');
  assert.equal(impossible.fits, false);
  assert.equal(impossible.wrapped, true);
  assert.equal(impossible.surfaces.length, 3);
  const empty = makeSplitLayout({ w: 300, h: 300 }, 72, [], 'fan', 'top', -160);
  assert.equal(empty.distance, 0);
  assert.deepEqual(empty.surfaces, [{ id: 'trigger', x: 150, y: 150, w: 72, h: 72, r: 36 }]);
});

test('action size is independent of trigger size', () => {
  const small = layout(views[0], 'fan', 'top', 3, 44);
  const large = layout(views[0], 'fan', 'top', 3, 88);
  assert.equal(small.surfaces[0].w, large.surfaces[0].w);
  assert.ok(small.surfaces.slice(1).every(surface => surface.w === 44 && surface.h === 44));
  assert.ok(large.surfaces.slice(1).every(surface => surface.w === 88 && surface.h === 88));
});

test('positive and negative offsets translate the action group rigidly', () => {
  for (const direction of directions) {
    const view = { w: 1000, h: 1000 };
    const original = layout(view, 'fan', direction, 5, 44);
    for (const distance of [-60, 40, 120]) {
      const moved = layout(view, 'fan', direction, 5, 44, false, distance);
      const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
      const sign = direction === 'left' || direction === 'top' ? -1 : 1;
      assert.equal(moved.direction, direction);
      assert.equal(moved.distance, distance);
      assertRigid(original, moved);
      for (let i = 1; i < moved.surfaces.length; i++) {
        assertClose(sign * ((moved.surfaces[i][axis] - moved.surfaces[0][axis]) -
          (original.surfaces[i][axis] - original.surfaces[0][axis])), distance);
      }
    }
  }
});

test('the five-action reference moves 60px closer and stops at the 8px trigger gap', () => {
  const view = { w: 882, h: 580 };
  const original = layout(view, 'fan', 'right', 5, 44);
  const moved = layout(view, 'fan', 'right', 5, 44, false, -60);
  const limit = layout(view, 'fan', 'right', 5, 44, false, -160);
  const gap = result => result.surfaces[3].x - result.surfaces[3].w / 2 -
    result.surfaces[0].x - result.surfaces[0].w / 2;
  assert.equal(moved.distance, -60);
  assertClose(gap(original) - gap(moved), 60);
  assertClose(gap(limit), 8);
  assertRigid(original, limit);
});

test('negative offsets preserve bounds and trigger/action clearances throughout the matrix', () => {
  for (const view of views.slice(0, 2)) for (const arrangement of arrangements)
    for (const direction of directions) for (const count of [1, 3, 5, 6])
      for (const size of [44, 56, 100]) for (const labels of [false, true]) {
        const result = layout(view, arrangement, direction, count, size, labels, -160);
        assert.ok(result.distance >= -160 && result.distance <= 0);
        assertSafe(result, view, count, 8);
      }
});

test('size and positive-distance matrix fits with the approved 20px boundary margin', () => {
  for (const view of views) for (const arrangement of arrangements) for (const count of [1, 3, 6])
    for (const size of [44, 56, 100]) for (const distance of [0, 60, 120]) {
      const result = layout(view, arrangement, 'right', count, size, true, distance);
      assert.ok(result.distance >= 0 && result.distance <= distance);
      assertSafe(result, view, count);
    }
});

test('layout clamps the signed offset and rejects invalid measured sizes', () => {
  const view = { w: 1000, h: 1000 };
  assert.deepEqual(layout(view, 'fan', 'right', 5, 44, false, 900), layout(view, 'fan', 'right', 5, 44, false, 120));
  assert.deepEqual(layout(view, 'fan', 'right', 5, 44, false, -900), layout(view, 'fan', 'right', 5, 44, false, -160));
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.deepEqual(layout(view, 'fan', 'right', 5, 44, false, invalid), layout(view, 'fan', 'right', 5, 44));
    assert.throws(() => makeSplitLayout(view, 72, [{ id: 'invalid', w: invalid, h: 44 }], 'row', 'right'), RangeError);
  }
});

test('configured duration includes settling at every bounce amount', () => {
  for (const duration of [100, 180, 500, 1234, 3000]) for (const bounce of [0, 0.5, 1]) {
    const state = motion(duration, bounce);
    state.step(duration / 1000 - 0.001);
    assert.equal(state.active, true);
    state.step(0.001);
    assertRest(state, opened);
    assert.equal(state.elapsedMs, duration);
    state.retarget(closed, false);
    state.step(duration / 1000);
    assertRest(state, closed);
  }
});

test('bounce changes overshoot independently of duration', () => {
  const quiet = motion(600, 0), bouncy = motion(600, 0.7);
  let quietMaximum = 0, bouncyMaximum = 0;
  for (let frame = 0; frame < 60; frame++) {
    quiet.step(0.01);
    bouncy.step(0.01);
    quietMaximum = Math.max(quietMaximum, quiet.surfaces[1].x);
    bouncyMaximum = Math.max(bouncyMaximum, bouncy.surfaces[1].x);
  }
  assert.ok(quietMaximum <= 160);
  assert.ok(bouncyMaximum > 175);
  assertRest(quiet, opened);
  assertRest(bouncy, opened);
});

test('geometry and velocity are independent of frame partitions and catch up after a slow frame', () => {
  const slow = motion(700, 0.6), fast = motion(700, 0.6);
  for (let frame = 0; frame < 6; frame++) slow.step(1 / 30);
  for (let frame = 0; frame < 24; frame++) fast.step(1 / 120);
  for (const [id, item] of slow.items) for (const key of keys) for (const value of ['value', 'velocity']) {
    assertClose(item[key][value], fast.items.get(id)[key][value]);
  }
  assertClose(slow.openness.velocity, fast.openness.velocity);
  slow.step(2);
  assertRest(slow, opened);
  assert.equal(slow.elapsedMs, 700);
});

test('floating point frame accumulation lands on the exact deadline', () => {
  const state = motion(500, 1);
  for (let frame = 0; frame < 30; frame++) state.step(1 / 60);
  assertRest(state, opened);
  assert.equal(state.elapsedMs, 500);
});

test('reversals preserve current geometry and velocity before beginning a fresh interval', () => {
  const state = motion(500, 0.6);
  state.step(0.08);
  const before = structuredClone([...state.items]);
  state.retarget(closed, false);
  for (const [id, item] of before) for (const key of keys) {
    assert.equal(state.items.get(id)[key].value, item[key].value);
    assert.equal(state.items.get(id)[key].velocity, item[key].velocity);
  }
  state.step(0.499);
  assert.equal(state.active, true);
  state.step(0.001);
  assertRest(state, closed);
});

test('identical configuration and targets do not restart active geometry or pulse intervals', () => {
  const state = motion(500, 0.6);
  state.pulse('trigger', 'compress');
  state.step(0.2);
  state.configure({ duration: 500, bounce: 0.6 });
  state.retarget(opened);
  assert.equal(state.elapsedMs, 200);
  state.step(0.3);
  assertRest(state, opened);
});

test('changed configuration retains position and velocity and uses the new duration', () => {
  const state = motion();
  state.step(0.12);
  const before = structuredClone([...state.items]);
  state.configure({ duration: 900, bounce: 0.8 });
  assert.deepEqual([...state.items], before);
  state.step(0.899);
  assert.equal(state.active, true);
  state.step(0.001);
  assertRest(state, opened);
});

test('retarget does not create a pulse; explicit compression and expansion settle exactly', () => {
  const state = motion();
  state.step(0.05);
  assert.equal(state.surfaces[0].w, 72);
  for (const kind of ['compress', 'expand']) {
    const pulse = settled();
    pulse.pulse('trigger', kind);
    pulse.step(0.05);
    assert.ok(kind === 'compress' ? pulse.surfaces[0].w < 72 : pulse.surfaces[0].w > 72);
    assert.deepEqual(pulse.surfaces[1], opened[1]);
    pulse.step(0.45);
    assertRest(pulse, opened);
  }
});

test('an arbitrary ID pulse affects only that surface and leaves geometry timing intact', () => {
  const custom = { id: 'toolbar:custom-action', x: 80, y: 120, w: 64, h: 64, r: 32 };
  const state = settled([...opened, custom]);
  state.pulse(custom.id, 'compress');
  state.step(0.05);
  assert.deepEqual(state.surfaces.slice(0, 2), opened);
  assert.ok(state.surfaces[2].w < custom.w);
  state.step(0.45);
  assertRest(state, [...opened, custom]);

  const pulsed = motion(), control = motion();
  pulsed.step(0.2);
  control.step(0.2);
  pulsed.pulse('save', 'expand');
  pulsed.step(0.3);
  control.step(0.3);
  assert.deepEqual([...pulsed.items], [...control.items]);
  assert.equal(pulsed.active, true);
  pulsed.step(0.2);
  assertRest(pulsed, opened);
});

test('pulse interruption keeps its value and adds the approved velocity impulse', () => {
  const state = settled(), control = settled();
  for (const candidate of [state, control]) {
    candidate.pulse('trigger', 'expand');
    candidate.step(0.07);
  }
  const before = state.surfaces[0].w;
  state.pulse('trigger', 'compress');
  assert.equal(state.surfaces[0].w, before);
  const delta = 1e-7;
  state.step(delta);
  control.step(delta);
  const velocityChange = (state.surfaces[0].w - control.surfaces[0].w) / delta;
  assertClose(velocityChange, -72 * (0.7 + 1.8 * 0.5) / 0.5, 0.002);
  state.step(0.5);
  assertRest(state, opened);
});

test('opposing pulses before a frame cancel without leaving an active track', () => {
  const state = settled();
  state.pulse('trigger', 'compress');
  state.pulse('trigger', 'expand');
  assertRest(state, opened);
});

test('multiple pulse IDs retain independent intervals and are frame partition independent', () => {
  const slow = settled(), fast = settled();
  for (const candidate of [slow, fast]) {
    candidate.pulse('trigger', 'compress');
    candidate.step(0.1);
    candidate.pulse('save', 'expand');
  }
  for (let frame = 0; frame < 6; frame++) slow.step(1 / 30);
  for (let frame = 0; frame < 24; frame++) fast.step(1 / 120);
  for (let i = 0; i < opened.length; i++) for (const key of keys) {
    assertClose(slow.surfaces[i][key], fast.surfaces[i][key]);
  }
  slow.step(0.2);
  assert.deepEqual(slow.surfaces[0], opened[0]);
  assert.equal(slow.active, true);
  slow.step(0.1);
  assertRest(slow, opened);
});

test('reduced motion snaps geometry and removes every pulse immediately', () => {
  const state = motion();
  state.pulse('trigger', 'compress');
  state.pulse('save', 'expand');
  state.step(0.06);
  state.step(0, true);
  assertRest(state, opened);
  state.step(10);
  assertRest(state, opened);
});

test('seek clears pulses and tracks while keeping the interpolated geometry', () => {
  const state = motion();
  state.pulse('trigger', 'compress');
  state.step(0.08);
  state.seek(closed, opened, 0.5);
  assert.equal(state.progress, 0.5);
  assert.equal(state.active, false);
  assert.deepEqual(state.surfaces, [closed[0], { id: 'save', x: 80, y: 0, w: 28, h: 28, r: 14 }]);
  state.retarget(opened);
  state.step(0.5);
  assertRest(state, opened);
  for (const [progress, expected] of [[-1, 0], [2, 1], [NaN, 0], [Infinity, 0]]) {
    state.seek(closed, opened, progress);
    assert.equal(state.progress, expected);
    assertRest(state, expected ? opened : closed);
  }
});

test('new IDs can join an active transition without missing motion tracks', () => {
  const state = motion();
  state.step(0.1);
  const added = { id: 'new', x: 240, y: 80, w: 44, h: 44, r: 22 };
  state.retarget([...opened, added]);
  assert.doesNotThrow(() => state.step(0.01));
  state.step(0.49);
  assertRest(state, [...opened, added]);
});

test('removed IDs release settled tracks and never revive old pulses when reintroduced', () => {
  const state = settled();
  state.pulse('save', 'expand');
  state.step(0.05);
  state.retarget([opened[0]]);
  state.step(0.5);
  assertRest(state, [opened[0]]);
  assert.equal(state.items.has('save'), false);
  state.pulse('save', 'expand');
  assert.equal(state.active, false);
  const replacement = { ...opened[1], x: 300, w: 40, h: 40, r: 20 };
  state.retarget([opened[0], replacement]);
  state.step(0.05);
  assertRest(state, [opened[0], replacement]);
});

test('removing and reintroducing an ID mid-transition clears its old pulse', () => {
  const pulsed = motion(), control = motion();
  pulsed.pulse('save', 'expand');
  for (const candidate of [pulsed, control]) {
    candidate.step(0.08);
    candidate.retarget([opened[0]]);
    candidate.step(0.05);
    candidate.retarget(opened);
    candidate.step(0.04);
  }
  assert.deepEqual(pulsed.surfaces, control.surfaces);
  pulsed.step(0, true);
  assertRest(pulsed, opened);
  pulsed.retarget([opened[0]]);
  pulsed.step(0, true);
  assertRest(pulsed, [opened[0]]);
});

test('disposal removes geometry, pulses and progress and permits clean reuse', () => {
  const state = motion();
  state.pulse('trigger', 'compress');
  state.step(0.05);
  state.dispose();
  assertRest(state, []);
  assert.equal(state.progress, 0);
  assert.equal(state.elapsedMs, 0);
  state.step(0.5);
  state.retarget(closed, false);
  assertRest(state, closed);
});

test('non-finite deltas and configuration cannot poison or extend a transition', () => {
  const state = motion(NaN, Infinity);
  state.step(0.2);
  const before = state.surfaces;
  for (const delta of [NaN, Infinity, -Infinity, -1]) state.step(delta);
  assert.deepEqual(state.surfaces, before);
  assert.equal(state.elapsedMs, 200);
  state.step(0.3);
  assertRest(state, opened);
  for (const [duration, expected] of [[1, 100], [9000, 3000]]) {
    const candidate = motion(duration, -1);
    candidate.step(expected / 1000);
    assertRest(candidate, opened);
    assert.equal(candidate.elapsedMs, expected);
  }
  const low = motion(500, -1), zero = motion(500, 0), high = motion(500, 2), one = motion(500, 1);
  for (const candidate of [low, zero, high, one]) candidate.step(0.1);
  assert.deepEqual(low.surfaces, zero.surfaces);
  assert.deepEqual(high.surfaces, one.surfaces);
});

test('invalid geometry fails atomically and cannot leave a partly retargeted state', () => {
  const state = motion();
  state.step(0.1);
  const before = structuredClone([...state.items]);
  for (const invalid of [NaN, Infinity, -Infinity]) {
    assert.throws(() => state.retarget([closed[0], { ...opened[1], x: invalid }], false), RangeError);
    assert.throws(() => state.seek(closed, [{ ...opened[1], w: invalid }], 0.5), RangeError);
    assert.deepEqual([...state.items], before);
  }
  assert.throws(() => state.retarget([opened[0], opened[0]]), RangeError);
  state.step(0.4);
  assertRest(state, opened);
});

test('a checkpoint samples the same elapsed spring as ordinary stepping at several times', () => {
  const sampled = motion(600, 0.7);
  sampled.pulse('trigger', 'compress');
  const checkpoint = sampled.snapshot();
  for (const time of [0, 0.08, 0.3, 0.599, 0.6]) {
    const ordinary = motion(600, 0.7);
    ordinary.pulse('trigger', 'compress');
    ordinary.step(time);
    sampled.restore(checkpoint);
    sampled.step(time);
    assertSurfacesClose(sampled.surfaces, ordinary.surfaces);
    assertClose(sampled.openness.value, ordinary.openness.value);
    assert.equal(sampled.elapsedMs, time * 1000);
  }
});

test('checkpoint sampling can move backward and reaches exact authored endpoints', () => {
  const state = motion(500, 0.5);
  const checkpoint = state.snapshot();
  state.restore(checkpoint);
  state.step(0.42);
  const later = state.surfaces;
  state.restore(checkpoint);
  state.step(0.12);
  const earlier = state.surfaces;
  const expectedEarlier = motion(500, 0.5);
  expectedEarlier.step(0.12);
  assertSurfacesClose(earlier, expectedEarlier.surfaces);
  assert.notDeepEqual(earlier, later);
  state.restore(checkpoint);
  assertSurfacesClose(state.surfaces, closed);
  assert.equal(state.elapsedMs, 0);
  state.step(0.5);
  assertRest(state, opened);
  assert.equal(state.elapsedMs, 500);
});

test('a checkpoint retains independent trigger pulse state and incoming geometry velocity', () => {
  const state = motion(500, 0.8);
  state.step(0.08);
  state.retarget(closed, false);
  state.pulse('trigger', 'expand');
  const checkpoint = state.snapshot();
  const expected = state.surfaces;
  state.step(0.2);
  state.restore(checkpoint);
  assertSurfacesClose(state.surfaces, expected);
  state.step(0.04);
  const replayed = state.surfaces;

  const control = motion(500, 0.8);
  control.step(0.08);
  control.retarget(closed, false);
  control.pulse('trigger', 'expand');
  control.step(0.04);
  assertSurfacesClose(replayed, control.surfaces);
  assert.ok(replayed[0].w > state.items.get('trigger').w.value,
    'The independent trigger pulse remains present in sampled output.');
});
