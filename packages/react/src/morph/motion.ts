import { clamp, lerp, type Surface } from './model.js';
import { DEFAULT_BOUNCE, DEFAULT_DURATION, MAX_DURATION, MIN_DURATION } from './motion-config.js';

export interface Spring {
  value: number;
  velocity: number;
  target: number;
}

export interface MotionOptions {
  duration: number;
  bounce: number;
}

const keys = ['x', 'y', 'w', 'h', 'r'] as const;
type MovingSurface = { id: string } & Record<typeof keys[number], Spring>;
type Pulse = {
  current: Spring;
  start: Spring;
  elapsed: number;
  /** The state immediately before the most recent authored pulse. */
  replayBase: Spring;
  /** The latest authored pulse direction, for retiming a checkpoint. */
  replayImpulse: -1 | 1;
};
export interface MotionSnapshot {
  items: Map<string, MovingSurface>;
  starts: Map<string, MovingSurface>;
  present: Set<string>;
  openness: Spring;
  opennessStart: Spring;
  pulses: Map<string, Pulse>;
  options: MotionOptions;
  geometryElapsed: number;
  elapsed: number;
  moving: boolean;
}

function sampleSpring(spring: Spring, time: number, omega: number, damping: number): Spring {
  const displacement = spring.value - spring.target;
  const decay = damping * omega;
  const envelope = Math.exp(-decay * time);
  if (damping >= 1) {
    const b = spring.velocity + omega * displacement;
    const next = displacement + b * time;
    return {
      target: spring.target,
      value: spring.target + envelope * next,
      velocity: envelope * (b - omega * next),
    };
  }
  const frequency = omega * Math.sqrt(1 - damping * damping);
  const b = (spring.velocity + decay * displacement) / frequency;
  const cosine = Math.cos(frequency * time);
  const sine = Math.sin(frequency * time);
  const next = displacement * cosine + b * sine;
  return {
    target: spring.target,
    value: spring.target + envelope * next,
    velocity: envelope * (-decay * next - displacement * frequency * sine + b * frequency * cosine),
  };
}

function timedSpring(start: Spring, elapsed: number, duration: number, bounce: number): Spring {
  if (elapsed >= duration) return { value: start.target, target: start.target, velocity: 0 };
  const raw = sampleSpring(start, elapsed, 12 / duration, 1 - bounce * 0.8);
  const progress = elapsed / duration;
  // The envelope preserves incoming velocity and reaches rest at the exact deadline.
  const envelope = (1 - progress * progress) ** 2;
  const slope = -4 * progress * (1 - progress * progress) / duration;
  return {
    target: start.target,
    value: start.target + (raw.value - start.target) * envelope,
    velocity: raw.velocity * envelope + (raw.value - start.target) * slope,
  };
}

function advanceElapsed(elapsed: number, delta: number, duration: number) {
  const next = Math.min(duration, elapsed + delta);
  return next >= duration - 1e-9 ? duration : next;
}

function normalizedOptions(options: MotionOptions): MotionOptions {
  return {
    duration: Number.isFinite(options.duration)
      ? clamp(options.duration, MIN_DURATION, MAX_DURATION)
      : DEFAULT_DURATION,
    bounce: Number.isFinite(options.bounce)
      ? clamp(options.bounce)
      : DEFAULT_BOUNCE,
  };
}

function pulseVelocity(options: MotionOptions) {
  return (0.7 + 1.8 * options.bounce) / (options.duration / 1000);
}

function copyPulse(pulse: Pulse): Pulse {
  return {
    current: { ...pulse.current },
    start: { ...pulse.start },
    elapsed: pulse.elapsed,
    replayBase: { ...pulse.replayBase },
    replayImpulse: pulse.replayImpulse,
  };
}

/**
 * Keeps a recorded transition's authored pulse meaningful after its timing
 * configuration changes while it is at rest. Live motion still preserves its
 * current velocity through `configure`.
 */
export function retimeSnapshot(
  snapshot: MotionSnapshot,
  options: MotionOptions,
): MotionSnapshot {
  const next = {
    ...snapshot,
    options: normalizedOptions(options),
    pulses: new Map(
      [...snapshot.pulses].map(([id, pulse]) => [id, copyPulse(pulse)]),
    ),
  };
  const velocity = pulseVelocity(next.options);
  for (const pulse of next.pulses.values()) {
    // Checkpoints are created at a retarget/pulse boundary. If a caller has
    // changed motion while the recorded transition is resting, restart that
    // pulse with the newly configured impulse rather than an old duration.
    if (pulse.elapsed !== 0) continue;
    pulse.current = {
      ...pulse.replayBase,
      velocity: pulse.replayBase.velocity + pulse.replayImpulse * velocity,
    };
    pulse.start = { ...pulse.current };
  }
  return next;
}

function normalizedSurfaces(surfaces: Surface[]): Surface[] {
  const ids = new Set<string>();
  return surfaces.map(surface => {
    if (ids.has(surface.id)) throw new RangeError(`Duplicate morph surface ID: ${surface.id}`);
    if (keys.some(key => !Number.isFinite(surface[key]))) {
      throw new RangeError(`Morph surface ${surface.id} requires finite geometry.`);
    }
    ids.add(surface.id);
    return { ...surface, w: Math.max(0, surface.w), h: Math.max(0, surface.h), r: Math.max(0, surface.r) };
  });
}

function makeItem(surface: Surface): MovingSurface {
  return {
    id: surface.id,
    x: { value: surface.x, velocity: 0, target: surface.x },
    y: { value: surface.y, velocity: 0, target: surface.y },
    w: { value: surface.w, velocity: 0, target: surface.w },
    h: { value: surface.h, velocity: 0, target: surface.h },
    r: { value: surface.r, velocity: 0, target: surface.r },
  };
}

function copyItem(item: MovingSurface): MovingSurface {
  return {
    id: item.id,
    x: { ...item.x },
    y: { ...item.y },
    w: { ...item.w },
    h: { ...item.h },
    r: { ...item.r },
  };
}

export class MotionState {
  readonly items = new Map<string, MovingSurface>();
  readonly openness: Spring = { value: 0, velocity: 0, target: 0 };
  private starts = new Map<string, MovingSurface>();
  private present = new Set<string>();
  private opennessStart = { ...this.openness };
  private pulses = new Map<string, Pulse>();
  private options: MotionOptions = { duration: DEFAULT_DURATION, bounce: DEFAULT_BOUNCE };
  private geometryElapsed = 0;
  private elapsed = 0;
  private moving = false;

  configure(options: MotionOptions) {
    const next = normalizedOptions(options);
    const changed = next.duration !== this.options.duration || next.bounce !== this.options.bounce;
    this.options = next;
    if (!changed) return false;
    if (this.moving) this.begin();
    for (const pulse of this.pulses.values()) {
      pulse.start = { ...pulse.current };
      pulse.elapsed = 0;
    }
    if (this.active) this.elapsed = 0;
    else this.elapsed = this.options.duration / 1000;
    return true;
  }

  private begin() {
    this.starts.clear();
    for (const item of this.items.values()) this.starts.set(item.id, copyItem(item));
    this.opennessStart = { ...this.openness };
    this.geometryElapsed = 0;
    this.elapsed = 0;
    this.moving = this.openness.value !== this.openness.target || this.openness.velocity !== 0 ||
      [...this.items.values()].some(item => keys.some(key =>
        item[key].value !== item[key].target || item[key].velocity !== 0));
    if (!this.moving) this.pruneRemoved();
  }

  retarget(surfaces: Surface[], open = true) {
    const next = normalizedSurfaces(surfaces);
    let changed = this.openness.target !== Number(open);
    this.openness.target = Number(open);
    this.present = new Set(next.map(surface => surface.id));
    for (const [id, item] of this.items) {
      if (this.present.has(id)) continue;
      this.pulses.delete(id);
      for (const key of ['w', 'h', 'r'] as const) {
        if (item[key].target !== 0) changed = true;
        item[key].target = 0;
      }
    }
    for (const surface of next) {
      let item = this.items.get(surface.id);
      if (!item) {
        item = makeItem(surface);
        this.items.set(surface.id, item);
        changed = true;
      }
      for (const key of keys) {
        if (item[key].target !== surface[key]) changed = true;
        item[key].target = surface[key];
      }
    }
    if (changed) this.begin();
    else if (!this.moving) this.pruneRemoved();
    return changed;
  }

  pulse(id: string, kind: 'compress' | 'expand') {
    if (!this.present.has(id)) return false;
    const replayBase = {
      ...(this.pulses.get(id)?.current ?? {
        value: 0,
        velocity: 0,
        target: 0,
      }),
    };
    const replayImpulse = kind === 'compress' ? -1 : 1;
    const current = { ...replayBase };
    current.velocity += replayImpulse * pulseVelocity(this.options);
    if (current.value === 0 && current.velocity === 0) {
      this.pulses.delete(id);
      return true;
    }
    this.pulses.set(id, {
      current,
      start: { ...current },
      elapsed: 0,
      replayBase,
      replayImpulse,
    });
    this.elapsed = 0;
    return true;
  }

  snapshot(): MotionSnapshot {
    return {
      items: new Map([...this.items].map(([id, item]) => [id, copyItem(item)])),
      starts: new Map([...this.starts].map(([id, item]) => [id, copyItem(item)])),
      present: new Set(this.present),
      openness: { ...this.openness },
      opennessStart: { ...this.opennessStart },
      pulses: new Map([...this.pulses].map(([id, pulse]) => [id, copyPulse(pulse)])),
      options: { ...this.options },
      geometryElapsed: this.geometryElapsed,
      elapsed: this.elapsed,
      moving: this.moving,
    };
  }

  restore(snapshot: MotionSnapshot) {
    this.items.clear();
    for (const [id, item] of snapshot.items) this.items.set(id, copyItem(item));
    this.starts.clear();
    for (const [id, item] of snapshot.starts) this.starts.set(id, copyItem(item));
    this.present = new Set(snapshot.present);
    Object.assign(this.openness, snapshot.openness);
    this.opennessStart = { ...snapshot.opennessStart };
    this.pulses = new Map(
      [...snapshot.pulses].map(([id, pulse]) => [id, copyPulse(pulse)]),
    );
    this.options = { ...snapshot.options };
    this.geometryElapsed = snapshot.geometryElapsed;
    this.elapsed = snapshot.elapsed;
    this.moving = snapshot.moving;
  }

  seek(closed: Surface[], open: Surface[], progress: number) {
    const from = new Map(normalizedSurfaces(closed).map(surface => [surface.id, surface]));
    const to = normalizedSurfaces(open);
    const position = Number.isFinite(progress) ? clamp(progress) : 0;
    this.dispose();
    for (const surface of to) {
      const start = from.get(surface.id) ?? surface;
      const item = makeItem(surface);
      for (const key of keys) {
        const value = lerp(start[key], surface[key], position);
        item[key] = { value, target: value, velocity: 0 };
      }
      this.items.set(surface.id, item);
      this.present.add(surface.id);
    }
    this.openness.value = position;
    this.openness.target = position;
  }

  step(dtSeconds: number, reduced = false) {
    if (reduced) {
      for (const item of this.items.values()) for (const key of keys) {
        item[key].value = item[key].target;
        item[key].velocity = 0;
      }
      this.openness.value = this.openness.target;
      this.openness.velocity = 0;
      this.pulses.clear();
      this.starts.clear();
      this.moving = false;
      this.elapsed = 0;
      this.geometryElapsed = 0;
      this.pruneRemoved();
      return;
    }
    if (!this.active) return;
    const delta = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;
    const duration = this.options.duration / 1000;
    this.elapsed = advanceElapsed(this.elapsed, delta, duration);
    if (this.moving) {
      this.geometryElapsed = advanceElapsed(this.geometryElapsed, delta, duration);
      for (const item of this.items.values()) for (const key of keys) {
        const start = this.starts.get(item.id)![key];
        Object.assign(item[key], timedSpring(start, this.geometryElapsed, duration, this.options.bounce));
      }
      Object.assign(this.openness, timedSpring(this.opennessStart, this.geometryElapsed, duration, this.options.bounce));
      if (this.geometryElapsed === duration) {
        this.moving = false;
        this.starts.clear();
        this.pruneRemoved();
      }
    }
    for (const [id, pulse] of this.pulses) {
      pulse.elapsed = advanceElapsed(pulse.elapsed, delta, duration);
      if (pulse.elapsed === duration) this.pulses.delete(id);
      else pulse.current = timedSpring(pulse.start, pulse.elapsed, duration, this.options.bounce);
    }
  }

  private pruneRemoved() {
    for (const id of this.items.keys()) if (!this.present.has(id)) {
      this.items.delete(id);
      this.starts.delete(id);
      this.pulses.delete(id);
    }
  }

  dispose(): void {
    this.items.clear();
    this.starts.clear();
    this.present.clear();
    this.pulses.clear();
    Object.assign(this.openness, { value: 0, velocity: 0, target: 0 });
    this.opennessStart = { ...this.openness };
    this.geometryElapsed = 0;
    this.elapsed = 0;
    this.moving = false;
  }

  get active() { return this.moving || this.pulses.size > 0; }
  get elapsedMs() { return this.elapsed * 1000; }
  get durationMs() { return this.options.duration; }
  get progress() { return clamp(this.openness.value); }

  get surfaces(): Surface[] {
    return [...this.items.values()].map(item => {
      const scale = Math.max(0.1, 1 + (this.pulses.get(item.id)?.current.value ?? 0));
      return {
        id: item.id,
        x: item.x.value,
        y: item.y.value,
        w: Math.max(0, item.w.value * scale),
        h: Math.max(0, item.h.value * scale),
        r: Math.max(0, item.r.value * scale),
      };
    });
  }
}
