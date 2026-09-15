import type { GlassSettings } from "../types.js";
import type { GlassMorphFrame, GlassPlaybackState } from "../morph-types.js";
import {
  MotionState,
  retimeSnapshot,
  type MotionOptions,
  type MotionSnapshot,
} from "./motion.js";
import type { Surface } from "./model.js";
import { drawableSurfaces, publicSurface } from "./config.js";
import { MorphRenderer } from "./renderer.js";
import { MorphSource } from "./source.js";

export interface MorphControllerOptions {
  width: number;
  height: number;
  surfaces: Surface[];
  material: GlassSettings;
  motion: MotionOptions;
  connection: number;
  refraction: number;
  reduced: boolean;
  backdrop: () => HTMLElement | null | undefined;
}
export interface MorphControllerCallbacks {
  paint: (surfaces: readonly Surface[]) => void;
  onFrame: (frame: GlassMorphFrame) => void;
  onReady: () => void;
  onError: (error: Error) => void;
  onMotionComplete: () => void;
  onPlaybackUpdate?: (state: GlassPlaybackState) => void;
}
export class MorphController {
  private motion = new MotionState();
  private renderer?: MorphRenderer;
  private canvas?: HTMLCanvasElement;
  private source?: MorphSource;
  private intersection: IntersectionObserver;
  private visibilityMutation: MutationObserver;
  private abort = new AbortController();
  private raf = 0;
  private previous = 0;
  private visible = false;
  private disposed = false;
  private ready = false;
  private sourceValid = false;
  private pendingComplete = false;
  private movedSource = false;
  private bounds = "";
  private rendererAttempted = false;
  private dpr = 0;
  private backdrop?: HTMLElement | null;
  private captureMaxDpr = 0;
  private light = { x: -1, y: -1 };
  private checkpoint?: MotionSnapshot;
  private playbackPaused = false;

  constructor(
    private host: HTMLDivElement,
    private layer: HTMLDivElement,
    private options: MorphControllerOptions,
    private callbacks: MorphControllerCallbacks,
    initial: Surface[],
  ) {
    this.motion.configure(options.motion);
    this.motion.retarget(initial);
    this.motion.step(0, true);
    this.visible = this.inViewport();
    this.intersection = new IntersectionObserver(() => this.updateVisibility());
    this.intersection.observe(host);
    this.visibilityMutation = new MutationObserver((records) => {
      if (
        records.some(
          (record) =>
            record.target !== this.host ||
            record.attributeName !== "data-glaze-ready",
        ) &&
        this.inViewport() !== this.visible
      )
        this.updateVisibility();
    });
    // Ancestor attributes can hide the group while no graphics/source exists.
    // Observe each element itself, excluding per-frame descendant overlays.
    for (let node: HTMLElement | null = host; node; node = node.parentElement)
      this.visibilityMutation.observe(node, { attributes: true });
    const settings = { signal: this.abort.signal };
    document.addEventListener(
      "visibilitychange",
      () => this.updateVisibility(),
      settings,
    );
    window.addEventListener("resize", () => this.updateVisibility(), settings);
    this.update(options);
    this.emitPlayback();
  }
  private inViewport() {
    const rect = this.host.getBoundingClientRect(),
      viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0,
      top = viewport?.offsetTop ?? 0;
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      rect.right > left &&
      rect.bottom > top &&
      rect.left < left + (viewport?.width ?? innerWidth) &&
      rect.top < top + (viewport?.height ?? innerHeight) &&
      getComputedStyle(this.host).visibility === "visible"
    );
  }
  private initializeRenderer() {
    if (
      this.renderer ||
      this.rendererAttempted ||
      !this.options.material.enabled ||
      !this.visible ||
      document.hidden
    )
      return;
    if (
      ![...this.motion.surfaces, ...this.options.surfaces].some(
        (s) => s.w > 0.01 && s.h > 0.01,
      )
    )
      return;
    this.rendererAttempted = true;
    const options = this.options;
    const canvas = this.host.ownerDocument.createElement("canvas");
    canvas.dataset.glazeCanvas = "";
    canvas.dataset.liquidLayer = "";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.layer.append(canvas);
    this.canvas = canvas;
    try {
      this.renderer = new MorphRenderer(
        canvas,
        options.material,
        (message) => this.fail(new Error(message)),
        () => {
          this.source?.setActive(
            this.visible && !document.hidden && this.options.material.enabled,
          );
          this.refresh();
          this.wake();
        },
      );
      this.renderer.configure(options.material, options.refraction);
      this.renderer.setLight(this.light.x, this.light.y);
      this.resizeRenderer();
      this.source = new MorphSource(
        this.host,
        () => ({
          backdrop: this.options.backdrop(),
          maxDpr: this.options.material.maxDpr,
        }),
        (source) => {
          this.renderer?.setSource(source);
          this.sourceValid = true;
          this.wake();
        },
        (error) => this.fail(error),
      );
    } catch (error) {
      this.releaseRenderer();
      this.rendererAttempted = true;
      this.fail(error);
    }
  }
  private resizeRenderer() {
    this.renderer?.resize({ w: this.options.width, h: this.options.height });
    this.dpr = devicePixelRatio || 1;
  }
  private clearReady() {
    this.ready = false;
    this.sourceValid = false;
    this.host.dataset.glazeReady = "false";
  }
  private releaseRenderer() {
    this.clearReady();
    this.source?.dispose();
    this.source = undefined;
    this.renderer?.dispose();
    this.renderer = undefined;
    this.canvas?.remove();
    this.canvas = undefined;
    this.rendererAttempted = false;
    this.bounds = "";
    this.movedSource = false;
  }
  private fail(error: unknown) {
    if (this.disposed) return;
    this.clearReady();
    if (this.renderer && !this.renderer.available)
      this.source?.setActive(false);
    this.callbacks.onError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
  update(options: MorphControllerOptions) {
    if (this.disposed) return;
    const backdrop = options.backdrop();
    const sourceChanged =
      backdrop !== this.backdrop ||
      options.material.maxDpr !== this.captureMaxDpr;
    // The previous options getter can already resolve the new React ref.
    this.backdrop = backdrop;
    this.captureMaxDpr = options.material.maxDpr;
    const configChanged =
      JSON.stringify(this.options.motion) !== JSON.stringify(options.motion);
    const resized =
      options.width !== this.options.width ||
      options.height !== this.options.height ||
      options.material.maxDpr !== this.options.material.maxDpr;
    const active = this.motion.active;
    if (!this.options.material.enabled && options.material.enabled)
      this.rendererAttempted = false;
    this.options = options;
    const motionChanged = this.motion.configure(options.motion);
    const geometryChanged = this.motion.retarget(options.surfaces);
    if (geometryChanged || (motionChanged && this.motion.active))
      this.beginPlayback(!this.playbackPaused);
    else if (motionChanged && this.checkpoint)
      this.checkpoint = retimeSnapshot(
        this.checkpoint,
        this.motion.snapshot().options,
      );
    if (!active || configChanged) this.previous = performance.now();
    this.pendingComplete ||= this.motion.active;
    if (options.reduced) {
      this.motion.step(0, true);
      this.light = { x: -1, y: -1 };
    }
    this.paint(false);
    this.visible = this.inViewport();
    if (!this.visible || document.hidden) {
      this.suspend();
      return;
    }
    if (!options.material.enabled) this.releaseRenderer();
    else this.initializeRenderer();
    this.renderer?.configure(options.material, options.refraction);
    this.renderer?.setLight(this.light.x, this.light.y);
    if (resized || this.dpr !== (devicePixelRatio || 1)) this.resizeRenderer();
    this.source?.setActive(this.renderer?.available ?? false);
    if (sourceChanged) {
      this.clearReady();
      this.source?.refresh();
    }
    this.wake();
  }
  refresh() {
    if (!this.visible && this.inViewport()) {
      this.visible = true;
      this.initializeRenderer();
    }
    this.source?.refresh();
  }
  pulse(id: string, kind: "compress" | "expand") {
    if (
      this.disposed ||
      this.options.reduced ||
      !this.visible ||
      document.hidden
    )
      return;
    if (!this.motion.pulse(id, kind)) return;
    this.beginPlayback();
    this.previous = performance.now();
    this.pendingComplete = this.motion.active;
    this.wake();
  }
  pause() {
    if (this.disposed || !this.checkpoint || this.options.reduced) return;
    this.playbackPaused = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.previous = 0;
    this.emitPlayback();
  }
  play() {
    if (this.disposed || !this.checkpoint || this.options.reduced) return;
    this.playbackPaused = false;
    this.previous = performance.now();
    this.pendingComplete ||= this.motion.active;
    this.emitPlayback();
    if (this.motion.active) this.wake();
  }
  seek(timeMs: number) {
    if (this.disposed || !this.checkpoint || this.options.reduced) return;
    const time = Number.isFinite(timeMs)
      ? Math.min(this.motion.durationMs, Math.max(0, timeMs))
      : 0;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.previous = 0;
    this.playbackPaused = true;
    this.pendingComplete = false;
    this.motion.restore(this.checkpoint);
    this.motion.step(time / 1000);
    this.paint(true);
  }
  replay() {
    if (this.disposed || !this.checkpoint || this.options.reduced) return;
    this.motion.restore(this.checkpoint);
    this.playbackPaused = false;
    this.previous = performance.now();
    this.pendingComplete = this.motion.active;
    this.paint(true);
    if (this.motion.active) this.wake();
  }
  private beginPlayback(resume = true) {
    if (this.options.reduced) {
      this.checkpoint = undefined;
      this.playbackPaused = false;
      return;
    }
    this.checkpoint = this.motion.snapshot();
    if (resume) this.playbackPaused = false;
  }
  private playbackState(): GlassPlaybackState {
    const duration = Number.isFinite(this.motion.durationMs)
      ? Math.max(0, this.motion.durationMs)
      : 0;
    const time = Number.isFinite(this.motion.elapsedMs)
      ? Math.min(duration, Math.max(0, this.motion.elapsedMs))
      : 0;
    const available = !!this.checkpoint && !this.options.reduced;
    return {
      time,
      duration,
      paused: available && this.playbackPaused,
      playing: available && !this.playbackPaused && this.motion.active,
      available,
    };
  }
  private emitPlayback() {
    this.callbacks.onPlaybackUpdate?.(this.playbackState());
  }
  pointer(x: number, y: number) {
    if (this.options.reduced || !this.renderer) return;
    const rect = this.host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = ((x - rect.left) * this.options.width) / rect.width,
      py = ((y - rect.top) * this.options.height) / rect.height;
    const nearest = this.motion.surfaces
      .filter((s) => s.w > 0)
      .sort(
        (a, b) =>
          Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py),
      )[0];
    if (nearest) {
      this.light = { x: px - nearest.x, y: py - nearest.y };
      this.renderer.setLight(this.light.x, this.light.y);
      this.wake();
    }
  }
  private suspend() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.previous = 0;
    if (!this.playbackPaused)
      this.motion.step(this.motion.durationMs / 1000);
    this.releaseRenderer();
    this.paint(false);
  }
  private updateVisibility() {
    if (this.disposed) return;
    this.visible = this.inViewport();
    if (!this.visible || document.hidden) {
      this.suspend();
      return;
    }
    this.initializeRenderer();
    if (this.dpr !== (devicePixelRatio || 1)) this.resizeRenderer();
    this.source?.setActive(
      this.options.material.enabled && (this.renderer?.available ?? false),
    );
    this.refresh();
    this.wake();
  }
  private wake() {
    if (!this.disposed && !this.raf && this.visible && !document.hidden)
      this.raf = requestAnimationFrame(this.tick);
  }
  private paint(render: boolean) {
    const surfaces = this.motion.surfaces;
    this.callbacks.paint(surfaces);
    if (
      render &&
      this.sourceValid &&
      this.renderer?.draw(
        drawableSurfaces(surfaces, this.options.surfaces),
        this.options.connection,
      ) &&
      !this.ready
    ) {
      this.ready = true;
      this.host.dataset.glazeReady = "true";
      this.callbacks.onReady();
    }
    this.callbacks.onFrame({
      surfaces: surfaces.map(publicSurface),
      elapsed: this.motion.elapsedMs,
      active: this.motion.active,
    });
    const rect = this.host.getBoundingClientRect(),
      bounds = `${rect.x},${rect.y},${rect.width},${rect.height}`;
    if (bounds !== this.bounds) {
      this.bounds = bounds;
      this.movedSource ||= this.motion.active;
      this.source?.refresh(this.motion.active);
    }
    if (!this.motion.active && this.pendingComplete) {
      this.pendingComplete = false;
      if (this.movedSource) {
        this.movedSource = false;
        this.source?.refresh();
      }
      this.callbacks.onMotionComplete();
    }
    this.emitPlayback();
  }
  private tick = (now: number) => {
    this.raf = 0;
    if (this.disposed) return;
    const dt = this.previous ? Math.max(0, (now - this.previous) / 1000) : 0;
    this.previous = now;
    if (!this.playbackPaused) this.motion.step(dt, this.options.reduced);
    this.paint(true);
    if (this.motion.active && !this.playbackPaused) this.wake();
    else this.previous = 0;
  };
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.intersection.disconnect();
    this.visibilityMutation.disconnect();
    cancelAnimationFrame(this.raf);
    this.releaseRenderer();
    this.motion.dispose();
    this.checkpoint = undefined;
  }
}
