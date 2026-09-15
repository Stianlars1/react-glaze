import { captureBackdrop } from "../engine/capture.js";
import { withCaptureLock } from "../engine/capture-lock.js";
import { includesCaptureNode } from "../engine/capture-filter.js";
import { boundedPixelRatio } from "../engine/resolution.js";
import { waitForCaptureImages } from "../engine/resources.js";
import { createQueue } from "../engine/queue.js";
import type { CaptureRegion } from "../engine/capture-regions.js";

const overlay = "[data-liquid-layer], [data-liquid-overlay]";
function opaque(element: HTMLElement) {
  const style = getComputedStyle(element),
    color = style.backgroundColor;
  return (
    Number(style.opacity) === 1 &&
    color !== "transparent" &&
    (color.startsWith("rgb(") || /^rgba\([^)]*,\s*1\)$/.test(color))
  );
}
export function groupBackdrop(
  host: HTMLElement,
  explicit?: HTMLElement | null,
): HTMLElement {
  if (explicit?.isConnected && explicit !== host && !host.contains(explicit))
    return explicit;
  const bounds = host.getBoundingClientRect();
  for (
    let node = host.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const rect = node.getBoundingClientRect();
    if (
      !node.closest(overlay) &&
      opaque(node) &&
      rect.left <= bounds.left &&
      rect.top <= bounds.top &&
      rect.right >= bounds.right &&
      rect.bottom >= bounds.bottom
    )
      return node;
  }
  return document.body;
}

export class MorphSource {
  private abort = new AbortController();
  private mutation: MutationObserver;
  private resize: ResizeObserver;
  private motionFrame = 0;
  private active = true;
  private disposed = false;
  private queue;

  constructor(
    private host: HTMLElement,
    private options: () => { backdrop?: HTMLElement | null; maxDpr: number },
    onSource: (canvas: HTMLCanvasElement) => void,
    onError: (error: unknown) => void,
  ) {
    this.queue = createQueue<HTMLCanvasElement | undefined>({
      captureInterval: 1000 / 12,
      capture: async (begin) => {
        await document.fonts.ready;
        this.abort.signal.throwIfAborted();
        const root = groupBackdrop(this.host, this.options().backdrop);
        const bounds = this.host.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const visibleImage = (image: HTMLElement) => {
          if (!includesCaptureNode(image)) return false;
          const box = image.getBoundingClientRect();
          return (
            box.right > bounds.left &&
            box.left < bounds.right &&
            box.bottom > bounds.top &&
            box.top < bounds.bottom
          );
        };
        await waitForCaptureImages(root, visibleImage, this.abort.signal);
        return withCaptureLock(this.abort.signal, async () => {
          begin();
          if (root !== groupBackdrop(this.host, this.options().backdrop)) {
            this.refresh();
            return;
          }
          const box = this.host.getBoundingClientRect(),
            origin = root.getBoundingClientRect();
          if (box.width <= 0 || box.height <= 0) return;
          const ratio = boundedPixelRatio(
            box.width,
            box.height,
            Math.min(devicePixelRatio || 1, this.options().maxDpr),
          );
          const region: CaptureRegion = {
            x: 0,
            y: 0,
            width: Math.max(1, Math.floor(box.width * ratio)),
            height: Math.max(1, Math.floor(box.height * ratio)),
            css: {
              left: box.left - origin.left,
              top: box.top - origin.top,
              right: box.right - origin.left,
              bottom: box.bottom - origin.top,
            },
            prune: () => false,
          };
          return captureBackdrop(
            root,
            {
              pixelRatio: ratio,
              filter: includesCaptureNode,
              fontEmbedCSS: "",
            },
            region,
          );
        });
      },
      commit: (canvas) => {
        if (canvas) onSource(canvas);
      },
      render: () => {},
      release: (canvas) => {
        if (canvas) canvas.width = canvas.height = 0;
      },
      onError,
    });
    const refresh = () => this.refresh();
    const changed = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && !target.closest(overlay)) this.refresh();
    };
    const opts = { signal: this.abort.signal };
    this.mutation = new MutationObserver((records) => {
      if (
        records.some((record) => {
          const node =
            record.target instanceof Element
              ? record.target
              : record.target.parentElement;
          return node && !node.closest(overlay);
        })
      ) {
        this.refresh();
        this.trackMotion();
      }
    });
    this.mutation.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      childList: true,
      characterData: true,
    });
    this.resize = new ResizeObserver(refresh);
    this.resize.observe(host);
    this.resize.observe(document.documentElement);
    document.addEventListener("scroll", refresh, {
      ...opts,
      capture: true,
      passive: true,
    });
    for (const name of [
      "load",
      "error",
      "input",
      "change",
      "focusin",
      "focusout",
      "pointerover",
      "pointerout",
    ])
      document.addEventListener(name, changed, { ...opts, capture: true });
    window.addEventListener("resize", refresh, opts);
    document.fonts.addEventListener("loadingdone", refresh, opts);
    for (const name of [
      "animationstart",
      "animationend",
      "animationcancel",
      "transitionrun",
      "transitionend",
      "transitioncancel",
    ])
      document.addEventListener(
        name,
        () => {
          this.refresh();
          this.trackMotion();
        },
        { ...opts, capture: true },
      );
    this.refresh();
    this.trackMotion();
  }
  private trackMotion = () => {
    if (this.disposed || !this.active || this.motionFrame) return;
    const root = groupBackdrop(this.host, this.options().backdrop);
    const moving = document.getAnimations().some((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      return (
        animation.playState === "running" &&
        target instanceof Element &&
        (target.contains(this.host) ||
          (!target.closest(overlay) &&
            (root.contains(target) || target.contains(root))))
      );
    });
    if (!moving) return;
    this.queue.sourceChanged(true);
    this.motionFrame = requestAnimationFrame(() => {
      this.motionFrame = 0;
      this.trackMotion();
    });
  };
  refresh(continuous = false) {
    if (!this.disposed) this.queue.sourceChanged(continuous);
  }
  setActive(active: boolean) {
    this.active = active;
    this.queue.setActive(active);
    if (!active) {
      cancelAnimationFrame(this.motionFrame);
      this.motionFrame = 0;
    } else this.trackMotion();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.mutation.disconnect();
    this.resize.disconnect();
    cancelAnimationFrame(this.motionFrame);
    this.queue.dispose();
  }
}
