import {
  imageKey,
  opaqueImage,
  supportsLiveImage,
} from "./live-media-image.js";
import { captureImageControls, type CaptureOptions } from "./capture.js";
import { backdropSize } from "./resolution.js";
import { scanCaptureScene } from "./capture-regions.js";
import type { CaptureRegion, CaptureScene } from "./capture-regions.js";
import { composeMatte } from "./matte-composition.js";
import { decodedImage } from "./image-decode.js";
import { CanvasMatte } from "./canvas-matte.js";

function solid(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d")!;
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  return canvas.toDataURL();
}
const black = () => solid("#000000"),
  white = () => solid("#ffffff"),
  clear = () => solid("#00000000");

type Composition =
  | { kind: "canvas"; matte: CanvasMatte; hasEmpty: boolean }
  | {
      kind: "pixels";
      base: ImageData;
      white: ImageData;
      empty?: ImageData;
      output: ImageData;
    };

function createComposition(
  base: ImageData,
  white: ImageData,
  empty?: ImageData,
): Composition {
  const matte = CanvasMatte.create(base, white, empty);
  return matte
    ? { kind: "canvas", matte, hasEmpty: Boolean(empty) }
    : {
        kind: "pixels", base, white, empty,
        output: new ImageData(base.width, base.height),
      };
}

function patchedPixels(source: ImageData, patch: ImageData, x: number, y: number) {
  const result = new ImageData(
    new Uint8ClampedArray(source.data), source.width, source.height,
  );
  for (let row = 0; row < patch.height; row++)
    result.data.set(
      patch.data.subarray(row * patch.width * 4, (row + 1) * patch.width * 4),
      ((y + row) * source.width + x) * 4,
    );
  return result;
}

// Browser-painted controls separate a cover image from the layers above and
// below it. Native image pixels can then update without SVG serialization.
// Nonlocal filters, blending and unsupported image layouts use ordinary capture.
export class LiveMediaSource {
  readonly scratch = document.createElement("canvas");
  private lastKey = "";
  private pendingDecode = "";
  private disposed = false;
  onImageReady?: () => void;
  private constructor(
    readonly canvas: HTMLCanvasElement,
    readonly image: HTMLImageElement,
    readonly root: HTMLElement,
    readonly region: CaptureRegion,
    private readonly composition: Composition,
    readonly rootWidth: number,
    readonly rootHeight: number,
    readonly scene: CaptureScene,
    private readonly ownership = { count: 0 },
  ) {
    ownership.count++;
    this.scratch.width = region.width;
    this.scratch.height = region.height;
  }
  static async create(
    root: HTMLElement,
    image: HTMLImageElement,
    options: CaptureOptions,
  ) {
    if (!supportsLiveImage(root, image)) return undefined;
    const decoded = decodedImage(image);
    await decoded.promise;
    if (decoded.state !== "decoded") return undefined;
    const size = backdropSize(root);
    const scene = scanCaptureScene(root, size.width, size.height);
    const r = image.getBoundingClientRect(),
      origin = root.getBoundingClientRect();
    const pixelWidth = Math.max(
      1,
      Math.floor(size.width * (options.pixelRatio ?? 1)),
    );
    const pixelHeight = Math.max(
      1,
      Math.floor(size.height * (options.pixelRatio ?? 1)),
    );
    const sx = pixelWidth / size.width,
      sy = pixelHeight / size.height;
    const x = Math.max(0, Math.floor((r.left - origin.left - 2) * sx));
    const y = Math.max(0, Math.floor((r.top - origin.top - 2) * sy));
    const width =
      Math.min(pixelWidth, Math.ceil((r.right - origin.left + 2) * sx)) - x;
    const height =
      Math.min(pixelHeight, Math.ceil((r.bottom - origin.top + 2) * sy)) - y;
    if (width <= 0 || height <= 0) return undefined;
    const css = {
      left: x / sx,
      top: y / sy,
      right: (x + width) / sx,
      bottom: (y + height) / sy,
    };
    const region: CaptureRegion = {
      x,
      y,
      width,
      height,
      css,
      prune: (node) => {
        const bound = scene.bounds.get(node);
        return Boolean(
          bound &&
            (bound.right <= css.left ||
              bound.left >= css.right ||
              bound.bottom <= css.top ||
              bound.top >= css.bottom),
        );
      },
    };
    const [baseCanvas, whiteCanvas, emptyCanvas] = await captureImageControls(
      root, image, options,
      [
        { source: black() },
        { source: white(), region },
        { source: clear(), region },
      ],
    );
    try {
      const base = baseCanvas
        .getContext("2d")!
        .getImageData(x, y, width, height);
      const whitePixels = whiteCanvas
        .getContext("2d")!
        .getImageData(0, 0, width, height);
      const empty = emptyCanvas
        .getContext("2d")!
        .getImageData(0, 0, width, height);
      const result = new LiveMediaSource(
        baseCanvas,
        image,
        root,
        region,
        createComposition(base, whitePixels, empty),
        size.width,
        size.height,
        scene,
      );
      if (result.render() !== "updated") {
        result.dispose();
        return undefined;
      }
      return result;
    } catch (error) {
      baseCanvas.width = baseCanvas.height = 0;
      throw error;
    } finally {
      if (whiteCanvas) whiteCanvas.width = whiteCanvas.height = 0;
      if (emptyCanvas) emptyCanvas.width = emptyCanvas.height = 0;
    }
  }
  async refresh(options: CaptureOptions, changes: readonly Element[]) {
    if (
      this.disposed || !changes.length || !supportsLiveImage(this.root, this.image)
    ) return;
    const size = backdropSize(this.root);
    if (size.width !== this.rootWidth || size.height !== this.rootHeight)
      return;
    const next = scanCaptureScene(this.root, size.width, size.height);
    if (next.records.size !== this.scene.records.size) return;
    const media = next.records.get(this.image)?.rect;
    const previousMedia = this.scene.records.get(this.image)?.rect;
    if (!media || JSON.stringify(media) !== JSON.stringify(previousMedia))
      return;
    let left = Infinity,
      top = Infinity,
      right = -Infinity,
      bottom = -Infinity;
    const include = (box: {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }) => {
      left = Math.min(left, box.left);
      top = Math.min(top, box.top);
      right = Math.max(right, box.right);
      bottom = Math.max(bottom, box.bottom);
    };
    for (const element of changes) {
      if (element === this.image) continue;
      // Capture the local row/block around changed text, including native ink.
      const node = element.parentElement ?? element;
      const before = this.scene.records.get(node),
        after = next.records.get(node);
      if (!before?.bounded || !after?.bounded) return;
      include(before.rect);
      include(after.rect);
    }
    for (const [element, current] of next.records) {
      const previous = this.scene.records.get(element);
      if (!previous) return;
      if (JSON.stringify(previous.rect) === JSON.stringify(current.rect))
        continue;
      if (!previous.bounded || !current.bounded) return;
      include(previous.rect);
      include(current.rect);
    }
    if (
      !Number.isFinite(left) ||
      left < media.left ||
      top < media.top ||
      right > media.right ||
      bottom > media.bottom
    )
      return;
    const sx = this.canvas.width / size.width,
      sy = this.canvas.height / size.height;
    const x = Math.max(this.region.x, Math.floor((left - 2) * sx));
    const y = Math.max(this.region.y, Math.floor((top - 2) * sy));
    const width =
      Math.min(this.region.x + this.region.width, Math.ceil((right + 2) * sx)) -
      x;
    const height =
      Math.min(
        this.region.y + this.region.height,
        Math.ceil((bottom + 2) * sy),
      ) - y;
    if (width * height > this.region.width * this.region.height * 0.5) return;
    const css = {
      left: x / sx,
      top: y / sy,
      right: (x + width) / sx,
      bottom: (y + height) / sy,
    };
    const region: CaptureRegion = {
      x,
      y,
      width,
      height,
      css,
      prune: (node) => {
        const bound = next.bounds.get(node);
        return Boolean(
          bound &&
            (bound.right <= css.left ||
              bound.left >= css.right ||
              bound.bottom <= css.top ||
              bound.top >= css.bottom),
        );
      },
    };
    const current = this.composition;
    const hasEmpty = current.kind === "canvas" ? current.hasEmpty : Boolean(current.empty);
    const [darkCanvas, lightCanvas, emptyCanvas] = await captureImageControls(
      this.root, this.image, options,
      [
        { source: black(), region },
        { source: white(), region },
        ...(hasEmpty ? [{ source: clear(), region }] : []),
      ],
    );
    try {
      if (this.disposed) return;
      const pixels = (canvas: HTMLCanvasElement) =>
        canvas.getContext("2d")!.getImageData(0, 0, width, height);
      const basePatch = pixels(darkCanvas);
      const whitePatch = pixels(lightCanvas);
      const emptyPatch = emptyCanvas && pixels(emptyCanvas);
      const dx = x - this.region.x,
        dy = y - this.region.y;
      if (current.kind === "canvas") {
        const matte = current.matte.fork(
          basePatch, whitePatch, emptyPatch, dx, dy,
        );
        // Incompatible controls need a fresh template and its normal fallback.
        if (!matte) return;
        // Neither the shared layers nor output are changed until first render
        // after commit. A discarded candidate releases only its own ownership.
        return new LiveMediaSource(
          this.canvas, this.image, this.root, this.region,
          { kind: "canvas", matte, hasEmpty: current.hasEmpty },
          size.width, size.height, next, this.ownership,
        );
      }
      const base = patchedPixels(current.base, basePatch, dx, dy);
      const white = patchedPixels(current.white, whitePatch, dx, dy);
      const empty = current.empty && emptyPatch &&
        patchedPixels(current.empty, emptyPatch, dx, dy);
      const canvas = document.createElement("canvas");
      canvas.width = this.canvas.width;
      canvas.height = this.canvas.height;
      try {
        canvas.getContext("2d")!.drawImage(this.canvas, 0, 0);
        return new LiveMediaSource(
          canvas, this.image, this.root, this.region,
          createComposition(base, white, empty), size.width, size.height, next,
        );
      } catch (error) {
        canvas.width = canvas.height = 0;
        throw error;
      }
    } finally {
      darkCanvas.width = darkCanvas.height = 0;
      if (lightCanvas) lightCanvas.width = lightCanvas.height = 0;
      if (emptyCanvas) emptyCanvas.width = emptyCanvas.height = 0;
    }
  }
  render(): "updated" | "unchanged" | "pending" | "unsupported" {
    if (this.disposed) return "unsupported";
    if (!this.image.complete) return "pending";
    if (!this.image.naturalWidth) return "unsupported";
    const key = imageKey(this.image);
    if (key === this.lastKey) return "unchanged";
    const decoded = decodedImage(this.image);
    if (decoded.state !== "decoded") {
      if (decoded.state === "failed") return "unsupported";
      if (this.pendingDecode !== decoded.key) {
        this.pendingDecode = decoded.key;
        void decoded.promise.then(() => {
          if (!this.disposed) this.onImageReady?.();
        });
      }
      return "pending";
    }
    const state = this.composition;
    const supported = supportsLiveImage(this.root, this.image),
      opaque = (state.kind === "canvas" && state.hasEmpty) ||
        opaqueImage(this.image);
    if (!supported || !opaque) return "unsupported";
    const { image, region, canvas, scratch, root } = this;
    const style = getComputedStyle(image);

    const position = style.objectPosition.trim().split(/\s+/);

    const r = image.getBoundingClientRect(),
      origin = root.getBoundingClientRect();
    const box = this.scene.records.get(image)?.rect;
    if (
      !box ||
      Math.abs(r.left - origin.left - box.left) > 0.01 ||
      Math.abs(r.top - origin.top - box.top) > 0.01 ||
      Math.abs(r.width - (box.right - box.left)) > 0.01 ||
      Math.abs(r.height - (box.bottom - box.top)) > 0.01
    )
      return "unsupported";
    const fit = Math.max(
      r.width / image.naturalWidth,
      r.height / image.naturalHeight,
    );
    const w = image.naturalWidth * fit,
      h = image.naturalHeight * fit;
    const x =
      r.left - origin.left + ((r.width - w) * parseFloat(position[0])) / 100;
    const y =
      r.top - origin.top + ((r.height - h) * parseFloat(position[1])) / 100;
    const sx = canvas.width / this.rootWidth,
      sy = canvas.height / this.rootHeight;
    const context = scratch.getContext("2d", {
      willReadFrequently: state.kind === "pixels",
    })!;
    if (state.kind === "canvas") {
      state.matte.prepare(context);
    } else context.clearRect(0, 0, scratch.width, scratch.height);
    context.drawImage(
      image,
      x * sx - region.x,
      y * sy - region.y,
      w * sx,
      h * sy,
    );
    if (state.kind === "canvas") {
      state.matte.compose(context);
      const target = canvas.getContext("2d")!;
      target.clearRect(region.x, region.y, region.width, region.height);
      target.drawImage(scratch, region.x, region.y);
    } else {
      const pixels = context.getImageData(
        0,
        0,
        scratch.width,
        scratch.height,
      ).data;
      composeMatte(state.base.data, state.white.data, pixels, state.output.data);
      canvas.getContext("2d")!.putImageData(state.output, region.x, region.y);
    }
    this.lastKey = key;
    return "updated";
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.onImageReady = undefined;
    if (this.composition.kind === "canvas") this.composition.matte.dispose();
    this.scratch.width = this.scratch.height = 0;
    if (--this.ownership.count === 0) this.canvas.width = this.canvas.height = 0;
  }
}
