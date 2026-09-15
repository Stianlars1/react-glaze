import test from "node:test";
import assert from "node:assert/strict";
import { MorphController } from "../dist/morph/controller.js";
import { MorphSource } from "../dist/morph/source.js";
import { groupMaterial } from "../dist/morph/config.js";
import { withCaptureLock } from "../dist/engine/capture-lock.js";

// Real controller, queue and motion logic; browser observation/graphics are ports.
function browser(t) {
  const observers = [], frames = new Map();
  const cleanups = [], restores = [];
  let frameId = 0;
  class Element extends EventTarget {
    constructor(parentElement = null) {
      super();
      this.parentElement = parentElement;
      this.dataset = {};
      this.visibility = "";
      this.isConnected = true;
    }
    contains(node) {
      for (; node; node = node.parentElement) if (node === this) return true;
      return false;
    }
    closest() {
      for (let node = this; node; node = node.parentElement)
        if (node.overlay) return node;
      return null;
    }
    getBoundingClientRect() {
      return { x: 10, y: 10, left: 10, top: 10, right: 210, bottom: 110, width: 200, height: 100 };
    }
    querySelectorAll() { return []; }
  }
  class Observer {
    nodes = new Map();
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(node, options = {}) { this.nodes.set(node, options); }
    disconnect() { this.nodes.clear(); }
  }
  const document = Object.assign(new EventTarget(), {
    hidden: false,
    documentElement: new Element(),
    fonts: Object.assign(new EventTarget(), { ready: Promise.resolve() }),
    animations: [],
    getAnimations() { return this.animations; },
  });
  document.body = new Element(document.documentElement);
  const ancestor = new Element(document.body), host = new Element(ancestor);
  const globals = {
    document, window: new EventTarget(), Element,
    MutationObserver: Observer, IntersectionObserver: Observer, ResizeObserver: Observer,
    innerWidth: 900, innerHeight: 900, devicePixelRatio: 2,
    getComputedStyle(node) {
      for (; node; node = node.parentElement)
        if (node.visibility) return { visibility: node.visibility };
      return { visibility: "visible" };
    },
    requestAnimationFrame(callback) { frames.set(++frameId, callback); return frameId; },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  for (const [name, value] of Object.entries(globals)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    restores.push(() => descriptor ? Object.defineProperty(globalThis, name, descriptor) : delete globalThis[name]);
  }
  t.after(() => { cleanups.forEach(cleanup => cleanup()); restores.forEach(restore => restore()); });
  return {
    document, ancestor, host, Element, frames,
    cleanup(callback) { cleanups.push(callback); },
    mutate(target, attributeName = "style") {
      for (const observer of observers) {
        if ([...observer.nodes].some(([node, opts]) => opts.attributes &&
          (node === target || opts.subtree && node.contains(target)) &&
          (!opts.attributeFilter || opts.attributeFilter.includes(attributeName))))
          observer.callback([{ target, type: "attributes", attributeName }]);
      }
    },
    flush() {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(callback => callback(performance.now()));
    },
    async settle() { for (let i = 0; i < 12; i++) await Promise.resolve(); },
  };
}

function controller(t, { hidden = false, backdrop = () => undefined } = {}) {
  const f = browser(t);
  f.ancestor.visibility = hidden ? "hidden" : "visible";
  const options = {
    width: 200, height: 100,
    surfaces: [{ id: "one", x: 50, y: 50, w: 40, h: 40, r: 20 }],
    material: groupMaterial({ enabled: false, maxDpr: 1 }),
    motion: { duration: 500, bounce: 0.5 }, connection: 12, refraction: 1,
    reduced: false, backdrop,
  };
  const errors = [], ready = [], playback = [], completions = [];
  const instance = new MorphController(f.host, {}, options, {
    paint() {}, onFrame() {}, onReady() { ready.push(true); },
    onError(error) { errors.push(error); }, onMotionComplete() { completions.push(true); },
    onPlaybackUpdate(state) { playback.push(state); },
  }, options.surfaces);
  instance.paint(false);
  f.cleanup(() => instance.dispose());
  return { ...f, instance, options, errors, ready, playback, completions };
}

function graphics(f) {
  const activity = { refresh: 0, sourceDisposed: 0, rendererDisposed: 0, removed: 0, draws: 0, sizes: [] };
  f.options.material.enabled = true;
  f.instance.renderer = {
    available: true, configure() {}, setLight() {},
    resize(size) { activity.sizes.push(size); },
    draw() { activity.draws++; return true; },
    dispose() { activity.rendererDisposed++; },
  };
  f.instance.source = {
    refresh() { activity.refresh++; }, setActive() {},
    dispose() { activity.sourceDisposed++; },
  };
  f.instance.canvas = { remove() { activity.removed++; } };
  f.instance.ready = f.instance.sourceValid = true;
  f.host.dataset.glazeReady = "true";
  return activity;
}

test("an initially hidden group observes ancestor visibility without a source", t => {
  const f = controller(t, { hidden: true });
  let resumed = 0;
  t.mock.method(f.instance, "initializeRenderer", () => { resumed++; });
  f.ancestor.visibility = "visible";
  f.mutate(f.ancestor);
  assert.equal(resumed, 1);
  assert.equal(f.instance.visible, true);
  f.instance.dispose();
  f.ancestor.visibility = "hidden";
  f.mutate(f.ancestor);
  assert.equal(f.instance.visible, true, "disposed visibility observation is disconnected");
});

test("hiding a ready ancestor releases its source, renderer and owned canvas", t => {
  const f = controller(t), activity = graphics(f);
  f.ancestor.visibility = "hidden";
  f.mutate(f.ancestor, "class");
  assert.equal(f.host.dataset.glazeReady, "false");
  assert.equal(activity.sourceDisposed, 1);
  assert.equal(activity.rendererDisposed, 1);
  assert.equal(activity.removed, 1);
  assert.equal(f.frames.size, 0);
});

test("per-frame overlay mutations and readiness writes do not invalidate visibility", t => {
  const f = controller(t), activity = graphics(f);
  const overlay = new f.Element(f.host);
  overlay.overlay = true;
  f.mutate(overlay);
  f.mutate(f.host, "data-glaze-ready");
  f.mutate(f.ancestor, "data-unrelated");
  assert.equal(activity.refresh, 0);
  assert.equal(activity.rendererDisposed, 0);
});

test("a live backdrop getter invalidates its prior resolved identity at stable bounds", t => {
  let selected = { id: "first" };
  const f = controller(t, { backdrop: () => selected }), activity = graphics(f);
  selected = { id: "second" };
  f.instance.update({ ...f.options });
  assert.equal(activity.refresh, 1);
  assert.equal(f.host.dataset.glazeReady, "false");
  f.instance.update({ ...f.options });
  assert.equal(activity.refresh, 1, "unchanged resolved source is not recaptured");
  f.flush();
  assert.equal(activity.draws, 0, "the old texture cannot restore readiness");
});

test("capture DPR updates recapture without restarting an in-flight morph", t => {
  const f = controller(t), activity = graphics(f);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 130 }] };
  f.instance.update(next);
  f.instance.motion.step(0.1);
  const elapsed = f.instance.motion.elapsedMs;
  const position = f.instance.motion.surfaces[0].x;
  f.instance.update({ ...next, material: { ...next.material, maxDpr: 2 } });
  assert.equal(activity.refresh, 1);
  assert.equal(f.instance.motion.elapsedMs, elapsed);
  assert.equal(f.instance.motion.surfaces[0].x, position);
  assert.equal(f.instance.motion.active, true);
});

test("a failed source stays hidden through material redraws and source replacement", t => {
  let selected = { id: "first" };
  const f = controller(t, { backdrop: () => selected }), activity = graphics(f);
  f.instance.fail(new Error("Capture failed"));
  f.instance.update({ ...f.options, refraction: 2 });
  f.flush();
  selected = { id: "replacement" };
  f.instance.update({ ...f.options });
  f.flush();
  assert.equal(activity.draws, 0);
  assert.equal(f.host.dataset.glazeReady, "false");
  assert.equal(f.ready.length, 0);
  assert.equal(f.errors.length, 1);
});

for (const [kind, expected] of [
  ["unrelated", false], ["background child", true], ["background ancestor", true],
  ["host", true], ["host ancestor", true], ["overlay child", false],
]) test(`capture motion scope: ${kind}`, t => {
  const f = browser(t);
  const rootAncestor = new f.Element(f.document.body), root = new f.Element(rootAncestor);
  const source = new MorphSource(f.host, () => ({ backdrop: root, maxDpr: 1 }), () => {}, assert.fail);
  f.cleanup(() => source.dispose());
  const target = kind === "host" ? f.host : kind === "host ancestor" ? f.ancestor :
    kind === "background ancestor" ? rootAncestor :
    new f.Element(kind === "unrelated" ? f.document.body : root);
  target.overlay = kind === "overlay child";
  f.document.animations = [{ playState: "running", effect: { target } }];
  const invalidations = [];
  t.mock.method(source.queue, "sourceChanged", continuous => invalidations.push(continuous));
  source.trackMotion();
  assert.deepEqual(invalidations, expected ? [true] : []);
});

test("a backdrop replaced while waiting for the capture lock cannot capture its old root", async t => {
  const f = browser(t);
  const first = new f.Element(f.document.body), second = new f.Element(f.document.body);
  let selected = first, oldRootReads = 0, release;
  const errors = [];
  first.getBoundingClientRect = () => { oldRootReads++; return f.host.getBoundingClientRect(); };
  const blocker = withCaptureLock(new AbortController().signal,
    () => new Promise(resolve => { release = resolve; }));
  await f.settle();
  const source = new MorphSource(f.host, () => ({ backdrop: selected, maxDpr: 1 }), () => {}, error => errors.push(error));
  f.cleanup(() => source.dispose());
  f.flush();
  await f.settle();
  selected = second;
  source.refresh();
  release();
  await blocker;
  await f.settle();
  assert.equal(oldRootReads, 0);
  assert.deepEqual(errors, []);
  assert.equal(source.queue.metrics.discardedCaptures, 1);
});

test("pause and play resume elapsed motion without adding paused wall-clock time", t => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const f = controller(t);
  f.instance.update({ ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] });
  f.instance.tick(200);
  assert.equal(f.instance.motion.elapsedMs, 100);
  f.instance.pause();
  const paused = f.instance.motion.surfaces;
  now = 1200;
  f.instance.tick(now);
  assert.equal(f.instance.motion.elapsedMs, 100);
  assert.deepEqual(f.instance.motion.surfaces, paused);
  f.instance.play();
  f.instance.tick(1250);
  assert.ok(Math.abs(f.instance.motion.elapsedMs - 150) < 1e-8);
  assert.equal(f.playback.at(-1).playing, true);
});

test("a paused inspected frame survives hidden material updates without a background frame", t => {
  const f = controller(t);
  const opened = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(opened);
  f.instance.seek(250);
  const surfaces = f.instance.motion.surfaces;
  const elapsed = f.instance.motion.elapsedMs;
  f.ancestor.visibility = "hidden";
  f.mutate(f.ancestor);
  assert.equal(f.frames.size, 0, "A hidden paused controller must not retain a RAF.");
  f.instance.update({ ...opened, connection: 24, refraction: 2 });
  assert.equal(f.frames.size, 0, "Material-only updates stay dormant while hidden.");
  f.ancestor.visibility = "visible";
  f.mutate(f.ancestor);
  assert.deepEqual(f.instance.motion.surfaces, surfaces);
  assert.equal(f.instance.motion.elapsedMs, elapsed);
  assert.deepEqual(f.playback.at(-1), {
    time: 250, duration: 500, paused: true, playing: false, available: true,
  });
  assert.deepEqual(f.completions, []);
});

test("visibility suspension preserves a settled endpoint time", t => {
  const settled = controller(t);
  const opened = { ...settled.options, surfaces: [{ ...settled.options.surfaces[0], x: 150 }] };
  settled.instance.update(opened);
  settled.instance.tick(600);
  settled.ancestor.visibility = "hidden";
  settled.mutate(settled.ancestor);
  settled.ancestor.visibility = "visible";
  settled.mutate(settled.ancestor);
  assert.deepEqual(settled.playback.at(-1), {
    time: 500, duration: 500, paused: false, playing: false, available: true,
  });
});

test("unpaused visibility suspension completes motion without a background frame", t => {
  const active = controller(t);
  const next = { ...active.options, surfaces: [{ ...active.options.surfaces[0], x: 150 }] };
  active.instance.update(next);
  active.ancestor.visibility = "hidden";
  active.mutate(active.ancestor);
  assert.equal(active.instance.motion.surfaces[0].x, 150);
  assert.equal(active.instance.motion.elapsedMs, 500);
  assert.equal(active.frames.size, 0, "Offscreen work is released after reaching the endpoint.");
});

test("seek clamps to exact endpoints without reporting normal completion", t => {
  const f = controller(t);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(next);
  f.instance.seek(-100);
  assert.equal(f.instance.motion.surfaces[0].x, 50);
  assert.deepEqual(f.playback.at(-1), { time: 0, duration: 500, paused: true, playing: false, available: true });
  f.instance.seek(9999);
  assert.equal(f.instance.motion.surfaces[0].x, 150);
  assert.equal(f.playback.at(-1).time, 500);
  assert.deepEqual(f.completions, []);
});

test("replay restores the last completed transition and material updates do not replace it", t => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const f = controller(t);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(next);
  f.instance.seek(500);
  f.instance.update({ ...next, refraction: 2 });
  f.instance.replay();
  assert.equal(f.instance.motion.surfaces[0].x, 50);
  assert.deepEqual(f.playback.at(-1), { time: 0, duration: 500, paused: false, playing: true, available: true });
  f.instance.tick(600);
  assert.equal(f.instance.motion.surfaces[0].x, 150);
  assert.equal(f.completions.length, 1);
});

test("geometry and trigger pulse share the same replay checkpoint", t => {
  const f = controller(t);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(next);
  f.instance.pulse("one", "compress");
  f.instance.seek(50);
  const pulsedWidth = f.instance.motion.surfaces[0].w;
  f.instance.replay();
  f.instance.seek(50);
  assert.equal(f.instance.motion.surfaces[0].w, pulsedWidth);
  assert.ok(pulsedWidth < 40);
});

test("resting playback checkpoints adopt changed duration and bounce consistently", t => {
  const f = controller(t);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(next);
  f.instance.seek(500);
  const configured = { ...next, motion: { duration: 800, bounce: 0.2 } };
  f.instance.update(configured);
  assert.equal(f.playback.at(-1).duration, 800);
  f.instance.replay();
  f.instance.seek(400);

  const expected = new (f.instance.motion.constructor)();
  expected.configure(configured.motion);
  expected.retarget(f.options.surfaces, false);
  expected.retarget(next.surfaces);
  expected.step(0.4);
  assert.ok(Math.abs(f.instance.motion.surfaces[0].x - expected.surfaces[0].x) < 1e-8);
  assert.equal(f.playback.at(-1).duration, 800);
});

test("settled playback moves its timeline endpoint when duration changes", t => {
  let now = 100;
  t.mock.method(performance, "now", () => now);
  const f = controller(t);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(next);
  f.instance.tick(600);
  assert.equal(f.instance.motion.surfaces[0].x, 150);
  assert.equal(f.completions.length, 1);

  f.instance.update({ ...next, motion: { duration: 800, bounce: 0.2 } });
  assert.deepEqual(f.playback.at(-1), {
    time: 800, duration: 800, paused: false, playing: false, available: true,
  });
  assert.equal(f.completions.length, 1, "A configuration update is not a completion.");
  f.instance.play();
  assert.deepEqual(f.playback.at(-1), {
    time: 800, duration: 800, paused: false, playing: false, available: true,
  });
  assert.equal(f.completions.length, 1, "Play at the settled endpoint is inert.");
});

test("paused playback at its former endpoint retimes without starting a new transition", t => {
  const f = controller(t);
  const next = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(next);
  f.instance.seek(500);
  f.instance.update({ ...next, motion: { duration: 800, bounce: 0.2 } });
  assert.equal(f.instance.motion.surfaces[0].x, 150);
  assert.deepEqual(f.playback.at(-1), {
    time: 800, duration: 800, paused: true, playing: false, available: true,
  });
  assert.deepEqual(f.completions, []);
});

test("automatic geometry fitting preserves an explicit playback pause", t => {
  const f = controller(t);
  const opened = { ...f.options, surfaces: [{ ...f.options.surfaces[0], x: 150 }] };
  f.instance.update(opened);
  f.instance.seek(100);
  const pausedX = f.instance.motion.surfaces[0].x;
  const fitted = { ...opened, surfaces: [{ ...opened.surfaces[0], x: 160 }] };
  f.instance.update(fitted);
  assert.deepEqual(f.playback.at(-1), {
    time: 0, duration: 500, paused: true, playing: false, available: true,
  });
  f.instance.seek(0);
  assert.equal(f.instance.motion.surfaces[0].x, pausedX);
  assert.deepEqual(f.playback.at(-1), {
    time: 0, duration: 500, paused: true, playing: false, available: true,
  });
});

test("resting pulse checkpoints recompute their impulse with changed motion settings", t => {
  const f = controller(t);
  f.instance.pulse("one", "compress");
  f.instance.seek(500);
  const configured = { ...f.options, motion: { duration: 800, bounce: 0.2 } };
  f.instance.update(configured);
  f.instance.replay();
  f.instance.seek(50);

  const expected = new (f.instance.motion.constructor)();
  expected.seek(f.options.surfaces, f.options.surfaces, 1);
  expected.configure(configured.motion);
  expected.pulse("one", "compress");
  expected.step(0.05);
  assert.ok(Math.abs(f.instance.motion.surfaces[0].w - expected.surfaces[0].w) < 1e-8);
  assert.equal(f.playback.at(-1).duration, 800);
});
