import type { RimLightSettings } from '../types.js';
import { advanceRim, rimTarget, RIM_REST_DIRECTION, affectsRimGeometry, idleRim } from './rim-light-motion.js';
import type { RimDirection, RimTarget } from './rim-light-motion.js';

interface Entry {
  host: HTMLElement;
  layer: HTMLElement;
  settings: RimLightSettings;
  direction: RimDirection;
  visible: boolean;
  written: Map<string, string>;
}
const coordinators = new WeakMap<Document, RimCoordinator>();

function hasGeometryAnimation(element: Element) {
  return element.getAnimations().some(animation => {
    const effect = animation.effect as KeyframeEffect | null;
    return animation.playState === 'running' && typeof effect?.getKeyframes === 'function' && affectsRimGeometry(effect.getKeyframes());
  });
}

function paint(entry: Entry) {
  const values = [
    ['--rim-x', (-entry.direction.x).toFixed(5)],
    ['--rim-y', (-entry.direction.y).toFixed(5)],
    ['--rim-strength', String(entry.settings.strength)],
    ['--rim-width', `${entry.settings.width}px`],
  ];
  for (const [name, value] of values) {
    if (entry.written.get(name) === value) continue;
    entry.layer.style.setProperty(name, value);
    entry.written.set(name, value);
  }
}

class RimCoordinator {
  private entries = new Set<Entry>();
  private family = new Set<Element>();
  private window: Window;
  private abort = new AbortController();
  private resize: ResizeObserver;
  private intersection: IntersectionObserver;
  private mutation: MutationObserver;
  private reduced: MediaQueryList;
  private finePointer: MediaQueryList;
  private pointer: RimDirection | null = null;
  private frame = 0;
  private previousTime = 0;
  private motion = new Set<Element>();

  constructor(private document: Document) {
    const win = document.defaultView;
    if (!win) throw new Error('Rim lighting requires a browser window');
    this.window = win;
    this.reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    this.finePointer = win.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    this.resize = new ResizeObserver(() => this.geometryChanged());
    this.mutation = new MutationObserver(() => this.geometryChanged());
    this.intersection = new IntersectionObserver(records => {
      for (const record of records) for (const entry of this.entries) {
        if (entry.host !== record.target) continue;
        entry.visible = record.isIntersecting;
        if (!entry.visible) { entry.direction = idleRim(entry.direction, entry.settings.onLeave); paint(entry); }
      }
      if (this.hasVisiblePointer()) this.geometryChanged();
      else this.cancelFrame();
    });
    const opts = { passive: true, signal: this.abort.signal };
    document.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') { this.forgetPointer(true, true); return; }
      if ((event.pointerType !== 'mouse' && event.pointerType !== 'pen') ||
        this.reduced.matches || !this.finePointer.matches || document.hidden) return;
      this.pointer = { x: event.clientX, y: event.clientY };
      if (this.hasVisiblePointer()) this.schedule();
    }, opts);
    document.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') this.forgetPointer(true, true);
    }, opts);
    document.addEventListener('pointercancel', () => this.forgetPointer(true), opts);
    document.addEventListener('pointerout', event => {
      if (!event.relatedTarget) this.forgetPointer(false);
    }, opts);
    win.addEventListener('blur', () => this.forgetPointer(false), opts);
    document.addEventListener('visibilitychange', () => this.forgetPointer(true), opts);
    win.addEventListener('scroll', () => this.geometryChanged(), { ...opts, capture: true });
    win.addEventListener('resize', () => this.geometryChanged(), opts);
    this.reduced.addEventListener('change', () => this.forgetPointer(true, true), opts);
    this.finePointer.addEventListener('change', () => this.forgetPointer(true, true), opts);
    for (const name of ['transitionrun', 'animationstart']) {
      document.addEventListener(name, event => {
        const target = event.target as Element | null;
        if (target && this.family.has(target) && hasGeometryAnimation(target)) { this.motion.add(target); this.geometryChanged(); }
      }, opts);
    }
  }

  add(host: HTMLElement, layer: HTMLElement, settings: RimLightSettings) {
    const entry: Entry = { host, layer, settings: { ...settings }, direction: RIM_REST_DIRECTION, visible: true, written: new Map() };
    this.entries.add(entry);
    this.intersection.observe(host);
    this.observeFamily();
    paint(entry);
    this.geometryChanged();
    let disposed = false;
    return {
      update: (next: RimLightSettings) => {
        if (disposed) return;
        entry.settings = { ...next };
        if (next.mode === 'static') entry.direction = RIM_REST_DIRECTION;
        paint(entry);
        if (this.hasVisiblePointer()) this.schedule();
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        entry.direction = RIM_REST_DIRECTION;
        paint(entry);
        this.entries.delete(entry);
        this.intersection.unobserve(host);
        this.observeFamily();
        if (!this.entries.size) {
          this.cancelFrame();
          this.abort.abort();
          this.resize.disconnect();
          this.intersection.disconnect();
          this.mutation.disconnect();
          coordinators.delete(this.document);
        }
      },
    };
  }

  private observeFamily() {
    this.resize.disconnect();
    this.mutation.disconnect();
    this.family.clear();
    for (const entry of this.entries) for (let node: Element | null = entry.host; node; node = node.parentElement) this.family.add(node);
    for (const node of this.family) {
      this.resize.observe(node);
      this.mutation.observe(node, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      if (hasGeometryAnimation(node)) this.motion.add(node);
    }
    for (const node of this.motion) if (!this.family.has(node)) this.motion.delete(node);
  }

  private hasVisiblePointer() {
    return [...this.entries].some(entry => entry.visible && entry.settings.mode === 'pointer' && entry.host.isConnected);
  }

  private geometryChanged() {
    if ((this.pointer || this.frame) && this.hasVisiblePointer()) this.schedule();
  }

  private forgetPointer(immediate: boolean, fixed = false) {
    this.pointer = null;
    if (immediate || this.document.hidden || this.reduced.matches || !this.finePointer.matches) {
      this.cancelFrame();
      for (const entry of this.entries) { entry.direction = fixed ? RIM_REST_DIRECTION : idleRim(entry.direction, entry.settings.onLeave); paint(entry); }
    } else if (this.hasVisiblePointer()) this.schedule();
  }

  private cancelFrame() {
    if (this.frame) this.window.cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.previousTime = 0;
  }

  private schedule() {
    if (this.frame || this.document.hidden || !this.entries.size) return;
    this.frame = this.window.requestAnimationFrame(time => this.draw(time));
  }

  private draw(time: number) {
    this.frame = 0;
    const dt = this.previousTime ? (time - this.previousTime) / 1000 : 1 / 60;
    this.previousTime = time;
    const targets: { entry: Entry; target: RimTarget; active: boolean }[] = [];
    const canTrack = !!this.pointer && !this.reduced.matches && this.finePointer.matches && !this.document.hidden;
    for (const entry of this.entries) {
      let target = RIM_REST_DIRECTION, active = entry.visible && entry.host.isConnected;
      if (active && canTrack && entry.settings.mode === 'pointer') {
        const rect = entry.host.getBoundingClientRect();
        const style = this.window.getComputedStyle(entry.host);
        active = rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < this.window.innerHeight && rect.right > 0 && rect.left < this.window.innerWidth && style.visibility !== 'hidden' && style.visibility !== 'collapse' && style.opacity !== '0';
        if (active) target = rimTarget(rect, this.pointer, entry.settings.reach, entry.settings.onLeave);
      }
      if (!target.tracking && entry.settings.mode === 'pointer') target = idleRim(entry.direction, entry.settings.onLeave);
      targets.push({ entry, target, active });
    }
    for (const node of this.motion) {
      if (!node.isConnected || !hasGeometryAnimation(node)) this.motion.delete(node);
    }
    const trackingMotion = canTrack && [...this.motion].some(node =>
      targets.some(({ entry, active }) => active && entry.settings.mode === 'pointer' && node.contains(entry.host)),
    );
    let moving = false;
    // Complete geometry/style reads before changing any decorative styles.
    for (const { entry, target, active } of targets) {
      const next = active ? advanceRim(entry.direction, target, dt, target.tracking ? entry.settings.response : 0.22) : { ...target, moving: false };
      entry.direction = next;
      paint(entry);
      moving ||= next.moving;
    }
    if (moving || trackingMotion) this.schedule();
    else this.previousTime = 0;
  }
}

export function mountRimLight(host: HTMLElement, layer: HTMLElement, settings: RimLightSettings) {
  const document = host.ownerDocument;
  let coordinator = coordinators.get(document);
  if (!coordinator) { coordinator = new RimCoordinator(document); coordinators.set(document, coordinator); }
  return coordinator.add(host, layer, settings);
}
