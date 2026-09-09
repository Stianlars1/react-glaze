import { hasCapturedAppearance } from "./appearance.js";
import { CanvasTexture, SRGBColorSpace, LinearMipmapLinearFilter } from "three";
import { captureBackdrop } from "./capture.js";
import { permitsRegionalCapture, regionalChange } from "./capture-changes.js";
import { LiveMediaSource } from "./live-media-source.js";
import { findLiveImage } from "./live-media-image.js";
import { includesCaptureNode } from "./capture-filter.js";
import { waitForCaptureImages } from "./resources.js";
import { imageStateChanged, rememberImageState } from "./image-state.js";
import { withCaptureLock } from "./capture-lock.js";
import { backdropSize, boundedPixelRatio } from "./resolution.js";
import { createQueue } from "./queue.js";
import { createViewportInvalidation, readLayoutViewport } from "./viewport.js";
import { observeDocumentScroll } from "./scroll.js";
import { RendererPool } from "./pool.js";
import { isViewportAnchored } from "./presentation.js";
import type { Snapshot } from "./pool.js";
import type { GlassSettings, GlassCallbacks, GlassHandle } from "../types.js";

interface View {
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  settings: GlassSettings;
  callbacks: GlassCallbacks;
  visible: boolean;
  ready: boolean;
  renders: number;
  lastMetrics: number;
  renderer?: RendererPool;
  presentationSelected?: boolean;
}
let pool: RendererPool | undefined;
let directOwner: View | undefined;
const groups = new Map<HTMLElement, Backdrop>();
export function findBackdrop(host: HTMLElement): HTMLElement {
  for (
    let node = host.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const style = getComputedStyle(node),
      color = style.backgroundColor;
    const alpha = color.startsWith("rgba")
      ? Number(color.match(/[\d.]+/g)?.[3])
      : color.includes("/")
        ? Number(color.split("/")[1].replace(")", "").trim())
        : color === "transparent"
          ? 0
          : 1;
    if (alpha === 1 && Number(style.opacity) === 1) return node;
  }
  return document.body;
}
function releaseSource(canvas?: HTMLCanvasElement, liveSource?: LiveMediaSource) {
  if (liveSource) liveSource.dispose();
  else if (canvas) canvas.width = canvas.height = 0;
}

class Backdrop {
  views = new Set<View>();
  private texture: CanvasTexture | undefined;
  private abort = new AbortController();
  private mutation: MutationObserver;
  private resize: ResizeObserver;
  private intersection: IntersectionObserver;
  private captures = 0;
  private sourceMs = 0;
  private sourceStartedAt = 0;
  private sourceValid = false;
  private liveSource: LiveMediaSource | undefined;
  private liveSourceAllowed = false;
  private preparingLiveSource = false;
  private templateChanges = new Set<Element>();
  private pendingPresentation:
    { promise: Promise<void>; resolve: () => void } | undefined;
  private appearance = new WeakMap<HTMLElement, boolean>();
  private imageStates = new WeakMap<
    HTMLImageElement,
    ReturnType<typeof rememberImageState>
  >();
  private contextAvailable = pool?.available ?? true;
  private motionFrame = 0;
  private animations: { animation: Animation; source: boolean }[] = [];
  private active = true;
  private disposed = false;
  private media = matchMedia("(prefers-reduced-motion: reduce)");
  private viewportUpdates: ReturnType<typeof createViewportInvalidation>;
  private queue = createQueue<Snapshot>({
    captureInterval: 1000 / 12,
    capture: async (begin) => {
      await document.fonts.ready;
      await waitForCaptureImages(
        this.root,
        includesCaptureNode,
        this.abort.signal,
      );
      // Present the ready native image before starting a caption/template job.
      // This wait owns no global capture lock and is released on hide/disposal.
      await this.pendingPresentation?.promise;
      return withCaptureLock(this.abort.signal, () => {
        begin();
        return this.capture();
      });
    },
    commit: (s) => this.commit(s),
    render: () => this.render(),
    release: (s) => {
      releaseSource(s.canvas, s.liveSource);
    },
    onError: (e) => this.fail(e),
  });
  constructor(readonly root: HTMLElement) {
    const opts = { signal: this.abort.signal };
    this.viewportUpdates = createViewportInvalidation(
      readLayoutViewport(),
      () => this.sourceChanged(),
    );
    observeDocumentScroll(
      () => {
        this.viewportUpdates.scroll();
        this.queue.viewChanged();
      },
      () => this.active,
      this.abort.signal,
    );
    this.mutation = new MutationObserver((records) => {
      let source = false,
        hardChange = false,
        outside = false,
        motionChanged = false,
        view = false;
      const regional: Element[] = [];
      let localChangesOnly = true;
      for (const record of records) {
        const node =
          record.target instanceof Element
            ? record.target
            : record.target.parentElement;
        if (!node || node.closest("[data-liquid-layer], [data-liquid-overlay]"))
          continue;
        const host = node.closest<HTMLElement>("[data-liquid-host]");
        if (host) {
          if (host.dataset.liquidMode === "sharp") {
            view = true;
            continue;
          }
          const current = hasCapturedAppearance(host),
            previous = this.appearance.get(host) ?? true;
          this.appearance.set(host, current);
          if (current !== previous) motionChanged = true;
          if (!current && !previous) {
            view = true;
            continue;
          }
        }
        source = true;
        const changed = regionalChange(record);
        if (changed) regional.push(changed);
        else localChangesOnly = false;
        if (!host) outside = true;
        if (
          record.type === "attributes" &&
          ["src", "srcset", "href"].includes(record.attributeName ?? "")
        )
          hardChange = true;
      }
      if (outside) this.refreshAppearance();
      if (outside || motionChanged) this.detectMotion();
      if (source)
        this.sourceChanged(
          !hardChange,
          localChangesOnly ? regional : undefined,
        );
      if (view) this.queue.viewChanged();
    });
    this.mutation.observe(root, {
      subtree: true,
      attributes: true,
      characterData: true,
      childList: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    });
    for (
      let ancestor = root.parentElement;
      ancestor;
      ancestor = ancestor.parentElement
    )
      this.mutation.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    if (!root.contains(document.head))
      this.mutation.observe(document.head, {
        subtree: true,
        childList: true,
        characterData: true,
      });
    for (const event of [
      "pointerover",
      "pointerout",
      "pointerdown",
      "pointerup",
      "focusin",
      "focusout",
    ])
      root.addEventListener(event, () => this.queue.viewChanged(), opts);
    this.resize = new ResizeObserver(() => {
      if (this.refreshAppearance()) this.detectMotion();
      this.sourceChanged();
      this.queue.viewChanged();
    });
    this.resize.observe(root);
    this.intersection = new IntersectionObserver((entries) => {
      const wasActive = this.active;
      let appeared = false;
      for (const e of entries) {
        for (const v of this.views)
          if (v.host === e.target) {
            appeared ||= e.isIntersecting && !v.visible;
            v.visible = e.isIntersecting;
          }
      }
      this.visibility();
      // Another visible view may keep the queue active through this transition.
      if (appeared && wasActive) this.queue.viewChanged();
    });
    root.addEventListener(
      "load",
      (event) => {
        if (event.target instanceof HTMLImageElement) {
          const image = event.target;
          if (
            !includesCaptureNode(image) ||
            !imageStateChanged(image, this.imageStates.get(image))
          )
            return;
          this.sourceChanged(false, [image]);
          return;
        }
        this.sourceChanged();
      },
      {
        ...opts,
        capture: true,
      },
    );
    root.addEventListener("input", () => this.sourceChanged(), opts);
    root.addEventListener(
      "error",
      (event) => {
        if (
          event.target instanceof HTMLImageElement &&
          includesCaptureNode(event.target)
        )
          this.sourceChanged();
      },
      { ...opts, capture: true },
    );
    const settleMotion = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      const host = target?.closest<HTMLElement>("[data-liquid-host]");
      const current = host ? hasCapturedAppearance(host) : true;
      const previous = host ? (this.appearance.get(host) ?? true) : true;
      if (host) this.appearance.set(host, current);
      if (
        host &&
        (host.dataset.liquidMode === "sharp" || (!current && !previous))
      ) {
        if (target === host) this.queue.viewChanged();
      } else this.sourceChanged(true);
      this.detectMotion();
    };
    root.addEventListener("animationstart", () => this.detectMotion(), opts);
    root.addEventListener("transitionrun", () => this.detectMotion(), opts);
    for (const name of [
      "animationend",
      "animationcancel",
      "transitionend",
      "transitioncancel",
    ])
      root.addEventListener(name, settleMotion, opts);
    window.addEventListener(
      "resize",
      () => {
        if (!this.active) {
          this.viewportUpdates.cancel();
          return;
        }
        if (this.refreshAppearance()) this.detectMotion();
        this.viewportUpdates.resize(readLayoutViewport());
        this.queue.viewChanged();
      },
      opts,
    );
    window.addEventListener(
      "scroll",
      (e) => {
        if (
          e.target !== document &&
          e.target !== window &&
          root.contains(e.target as Node)
        )
          this.sourceChanged();
      },
      { ...opts, passive: true, capture: true },
    );
    document.addEventListener(
      "visibilitychange",
      () => this.visibility(),
      opts,
    );
    document.fonts.addEventListener(
      "loadingdone",
      () => this.sourceChanged(),
      opts,
    );
    this.media.addEventListener("change", () => this.detectMotion(), opts);
  }
  add(view: View) {
    this.views.add(view);
    this.appearance.set(view.host, hasCapturedAppearance(view.host));
    this.resize.observe(view.host);
    this.intersection.observe(view.host);
    this.sourceChanged();
    this.visibility();
    this.detectMotion();
  }
  attachPresentation(view: View) {
    if (view.presentationSelected) return;
    view.presentationSelected = true;
    if (directOwner || !isViewportAnchored(view.host)) return;
    const fail = (error: Error) => {
      view.canvas.style.visibility = "hidden";
      view.ready = false;
      view.callbacks.onError?.(error);
    };
    view.renderer = new RendererPool(
      {
        onContextLost: () =>
          fail(new Error("WebGL context lost; waiting for restoration")),
        onContextRestored: () => this.queue.viewChanged(),
        onError: fail,
      },
      view.canvas,
    );
    directOwner = view;
  }
  update(view: View, next: GlassSettings, callbacks: GlassCallbacks) {
    const changed = Object.keys(next).some(
      (key) =>
        next[key as keyof GlassSettings] !==
        view.settings[key as keyof GlassSettings],
    );
    const source =
      view.settings.contentMode !== next.contentMode ||
      view.settings.enabled !== next.enabled ||
      view.settings.maxDpr !== next.maxDpr;
    view.settings = next;
    view.callbacks = callbacks;
    if (!next.enabled) view.canvas.style.visibility = "hidden";
    if (source) this.sourceChanged();
    if (changed) this.queue.viewChanged();
    this.visibility();
  }
  remove(view: View) {
    (view.renderer ?? pool)?.forget(view.canvas);
    view.renderer?.dispose();
    if (directOwner === view) directOwner = undefined;
    this.views.delete(view);
    this.appearance.delete(view.host);
    this.resize.unobserve(view.host);
    this.intersection.unobserve(view.host);
    if (!this.views.size) this.dispose();
    else {
      this.sourceChanged();
      this.visibility();
    }
  }
  private visibility() {
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    this.active =
      this.contextAvailable &&
      !document.hidden &&
      !connection?.saveData &&
      [...this.views].some((v) => v.visible && v.settings.enabled);
    this.queue.setActive(this.active);
    if (!this.active) {
      this.viewportUpdates.cancel();
      this.finishPresentation();
    }
    for (const v of this.views)
      if (!this.active || !v.visible || !v.settings.enabled) {
        (v.renderer ?? pool)?.forget(v.canvas);
        v.canvas.style.visibility = "hidden";
      }
    this.detectMotion();
  }
  private refreshAppearance() {
    let changed = false;
    for (const view of this.views) {
      const current = hasCapturedAppearance(view.host);
      if (current !== this.appearance.get(view.host)) changed = true;
      this.appearance.set(view.host, current);
    }
    return changed;
  }
  private placementAnimation(animation: Animation) {
    if (!(animation.effect instanceof KeyframeEffect)) return false;
    const keys = new Set([
      "offset",
      "computedOffset",
      "easing",
      "composite",
      "transform",
      "translate",
      "scale",
      "rotate",
      "borderRadius",
      "borderTopLeftRadius",
      "borderTopRightRadius",
      "borderBottomLeftRadius",
      "borderBottomRightRadius",
    ]);
    return animation.effect
      .getKeyframes()
      .every((frame) => Object.keys(frame).every((key) => keys.has(key)));
  }
  private detectMotion() {
    if (this.motionFrame) {
      cancelAnimationFrame(this.motionFrame);
      this.motionFrame = 0;
    }
    if (!this.active || this.media.matches || this.disposed) return;
    this.animations = this.root
      .getAnimations({ subtree: true })
      .flatMap<{ animation: Animation; source: boolean }>((animation) => {
        if (animation.playState !== "running") return [];
        const target =
          animation.effect instanceof KeyframeEffect
            ? animation.effect.target
            : null;
        if (target instanceof Element) {
          if (target.closest("[data-liquid-layer], [data-liquid-overlay]"))
            return [];
          const host = target.closest<HTMLElement>("[data-liquid-host]");
          if (
            host &&
            (host.dataset.liquidMode === "sharp" ||
              (!hasCapturedAppearance(host) &&
                this.placementAnimation(animation)))
          )
            return target === host ? [{ animation, source: false }] : [];
        }
        return [{ animation, source: true }];
      });
    if (this.animations.length)
      this.motionFrame = requestAnimationFrame(() => this.tickMotion());
  }
  private tickMotion() {
    this.motionFrame = 0;
    if (this.disposed || !this.active || this.media.matches) return;
    const running = this.animations.filter(
      ({ animation }) => animation.playState === "running",
    );
    if (running.some((a) => a.source)) this.sourceChanged(true);
    if (running.some((a) => !a.source)) this.queue.viewChanged();
    if (running.length)
      this.motionFrame = requestAnimationFrame(() => this.tickMotion());
  }
  private sourceChanged(continuous = false, elements?: Element[]) {
    if (
      this.liveSource &&
      this.liveSourceAllowed &&
      elements?.length &&
      permitsRegionalCapture(document)
    ) {
      if (
        elements.includes(this.liveSource.image) &&
        !this.pendingPresentation &&
        this.active
      ) {
        let resolve!: () => void;
        const promise = new Promise<void>((done) => {
          resolve = done;
        });
        this.pendingPresentation = { promise, resolve };
      }
      for (const element of elements)
        if (element !== this.liveSource.image)
          this.templateChanges.add(element);
      this.queue.viewChanged();
      // The selected decoded image is a live input. Text changes in the same
      // batch still refresh the browser-painted template asynchronously.
      if (elements.every((element) => element === this.liveSource!.image))
        return;
    } else {
      this.liveSourceAllowed = false;
      this.templateChanges.clear();
      this.finishPresentation();
    }
    this.queue.sourceChanged(
      continuous && !this.preparingLiveSource && !this.liveSource,
    );
  }
  private finishPresentation() {
    this.pendingPresentation?.resolve();
    this.pendingPresentation = undefined;
  }
  private async capture(): Promise<Snapshot> {
    const start = performance.now();
    this.imageStates = new WeakMap(
      [...this.root.querySelectorAll("img")]
        .filter(includesCaptureNode)
        .map((image) => [image, rememberImageState(image)]),
    );
    const size = backdropSize(this.root);
    const requested = Math.max(
      ...[...this.views]
        .filter((v) => v.visible && v.settings.enabled)
        .map((v) => Math.min(devicePixelRatio || 1, v.settings.maxDpr)),
      0.5,
    );
    const pixelRatio = boundedPixelRatio(size.width, size.height, requested);
    const width = Math.max(1, Math.floor(size.width * pixelRatio));
    const height = Math.max(1, Math.floor(size.height * pixelRatio));
    const options = {
      // Optimizers such as Next Image identify distinct resources in the query.
      includeQueryParams: true,
      pixelRatio,
      filter: includesCaptureNode,
    };
    const image =
      !this.animations.some((animation) => animation.source) &&
      permitsRegionalCapture(document)
        ? findLiveImage(this.root)
        : undefined;
    this.preparingLiveSource = Boolean(image);
    let liveSource =
      this.liveSource &&
      image === this.liveSource.image &&
      this.liveSourceAllowed
        ? await this.liveSource.refresh(options, [...this.templateChanges])
        : undefined;
    if (this.abort.signal.aborted) {
      liveSource?.dispose();
      this.abort.signal.throwIfAborted();
    }
    if (!liveSource && image) {
      liveSource = await LiveMediaSource.create(this.root, image, options);
      if (this.abort.signal.aborted) {
        liveSource?.dispose();
        this.abort.signal.throwIfAborted();
      }
    }
    const canvas =
      liveSource?.canvas ?? (await captureBackdrop(this.root, options));
    return {
      canvas,
      width,
      height,
      liveSource,
      duration: performance.now() - start,
      startedAt: start,
    };
  }
  private commit(snapshot: Snapshot) {
    const previous = this.texture?.image;
    if (
      this.texture &&
      this.texture.image.width === snapshot.width &&
      this.texture.image.height === snapshot.height
    ) {
      this.texture.image = snapshot.canvas;
      this.texture.needsUpdate = true;
    } else {
      this.texture?.dispose();
      this.texture = new CanvasTexture(snapshot.canvas);
      this.texture.colorSpace = SRGBColorSpace;
      this.texture.anisotropy = 1;
      this.texture.generateMipmaps = true;
      this.texture.minFilter = LinearMipmapLinearFilter;
    }
    releaseSource(previous, this.liveSource);
    this.liveSource = snapshot.liveSource;
    if (this.liveSource)
      this.liveSource.onImageReady = () => this.queue.viewChanged();
    this.liveSourceAllowed = Boolean(this.liveSource);
    this.preparingLiveSource = false;
    this.templateChanges.clear();
    this.captures++;
    if (this.liveSource)
      this.imageStates.set(
        this.liveSource.image,
        rememberImageState(this.liveSource.image),
      );
    if (this.refreshAppearance()) this.detectMotion();
    this.sourceMs = snapshot.duration;
    this.sourceStartedAt = snapshot.startedAt;
    this.sourceValid = true;
  }
  private render() {
    if (!this.texture || !this.sourceValid || !this.active || this.disposed)
      return;
    try {
      let mediaReady = false;
      if (this.liveSource && this.liveSourceAllowed) {
        const result = this.liveSource.render();
        mediaReady = result === "updated" || result === "unchanged";
        if (result === "updated") {
          this.texture.needsUpdate = true;
          this.imageStates.set(
            this.liveSource.image,
            rememberImageState(this.liveSource.image),
          );
        } else if (result === "unsupported") this.sourceChanged();
      }
      for (const view of this.views)
        if (view.visible && view.settings.enabled)
          this.attachPresentation(view);
      if ([...this.views].some((view) => !view.renderer))
        pool ??= new RendererPool({
          onContextLost: () => {
            for (const group of groups.values()) {
              group.contextAvailable = false;
              group.fail(
                new Error("WebGL context lost; waiting for restoration"),
              );
              group.visibility();
            }
          },
          onContextRestored: () => {
            for (const group of groups.values()) {
              group.contextAvailable = true;
              group.sourceChanged();
              group.queue.viewChanged();
              group.visibility();
            }
          },
          onError: (error) => {
            for (const group of groups.values()) group.fail(error);
          },
        });
      for (const view of this.views) {
        if (!view.visible || !view.settings.enabled) continue;
        const result = (view.renderer ?? pool)?.draw(
          view.host,
          view.canvas,
          this.root,
          this.texture,
          view.settings,
        );
        if (!result) continue;
        const { reused, ...timing } = result;
        if (mediaReady) this.finishPresentation();
        if (!reused) view.renders++;
        if (!view.ready) {
          view.ready = true;
          view.callbacks.onReady?.();
        }
        if (performance.now() - view.lastMetrics > 500) {
          view.lastMetrics = performance.now();
          view.callbacks.onMetrics?.({
            renders: view.renders,
            captures: this.captures,
            sourceMs: this.sourceMs,
            sourceAgeMs: performance.now() - this.sourceStartedAt,
            sourceWidth: this.texture.image.width,
            sourceHeight: this.texture.image.height,
            ...timing,
            ...this.queue.metrics,
            backend: "three-webgl2",
          });
        }
      }
    } catch (e) {
      this.fail(e, false);
    }
  }
  private disposeSource() {
    releaseSource(this.texture?.image, this.liveSource);
    this.liveSource = undefined;
    this.texture?.dispose();
    this.texture = undefined;
  }
  private fail(error: unknown, invalidateSource = true) {
    this.finishPresentation();
    if (invalidateSource) {
      this.sourceValid = false;
      this.disposeSource();
      this.liveSourceAllowed = false;
      this.preparingLiveSource = false;
      this.imageStates = new WeakMap();
    }
    const e =
      error instanceof Error ? error : new Error("Background capture failed");
    for (const view of this.views) {
      (view.renderer ?? pool)?.forget(view.canvas);
      view.canvas.style.visibility = "hidden";
      view.ready = false;
      view.callbacks.onError?.(e);
    }
  }
  private dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.finishPresentation();
    this.queue.dispose();
    this.viewportUpdates.dispose();
    this.abort.abort();
    this.mutation.disconnect();
    this.resize.disconnect();
    this.intersection.disconnect();
    this.disposeSource();
    if (this.motionFrame) cancelAnimationFrame(this.motionFrame);
    groups.delete(this.root);
    if (!groups.size) {
      pool?.dispose();
      pool = undefined;
    }
  }
}
export function mountGlass(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  settings: GlassSettings,
  callbacks: GlassCallbacks,
): GlassHandle {
  const root = findBackdrop(host);
  let group = groups.get(root);
  if (!group) {
    group = new Backdrop(root);
    groups.set(root, group);
  }
  const view: View = {
    host,
    canvas,
    settings,
    callbacks,
    visible: true,
    ready: false,
    renders: 0,
    lastMetrics: -Infinity,
  };
  group.add(view);
  let disposed = false;
  return {
    update(next, cb) {
      if (!disposed) group.update(view, next, cb);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      group.remove(view);
    },
  };
}
