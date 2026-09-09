// Opaque controls measure the fixed foreground and coverage. An empty-image
// control also recovers the background, allowing native source-over alpha.
export class CanvasMatte {
  private pending?: { patch: CanvasMatte; x: number; y: number };
  private disposed = false;
  private constructor(
    private base: HTMLCanvasElement,
    private gain: HTMLCanvasElement,
    private background?: HTMLCanvasElement,
    private alpha?: HTMLCanvasElement,
    private ownership = { count: 0 },
  ) { ownership.count++; }
  static create(base: ImageData, white: ImageData, empty?: ImageData) {
    const gain = new ImageData(base.width, base.height);
    const background = empty && new ImageData(base.width, base.height);
    const ink = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height);
    let needsAlpha = false;
    for (let i = 0; i < base.data.length; i += 4) {
      const alpha = base.data[i + 3];
      if (white.data[i + 3] !== alpha || (empty && empty.data[i + 3] !== alpha)) return;
      if (alpha !== 255) needsAlpha = true;
      ink.data[i + 3] = 255;
      for (let c = 0; c < 3; c++) {
        const difference = white.data[i + c] - base.data[i + c];
        if (difference < 0) return;
        gain.data[i + c] = difference;
        if (background && empty)
          background.data[i + c] =
            difference > 0
              ? ((empty.data[i + c] - base.data[i + c]) * 255) / difference
              : 0;
      }
      gain.data[i + 3] = 255;
      if (background) background.data[i + 3] = 255;
    }
    const make = (pixels: ImageData) => {
      const canvas = document.createElement("canvas");
      canvas.width = pixels.width;
      canvas.height = pixels.height;
      canvas.getContext("2d")!.putImageData(pixels, 0, 0);
      return canvas;
    };
    return new CanvasMatte(
      make(ink),
      make(gain),
      background && make(background),
      needsAlpha ? make(base) : undefined,
    );
  }
  prepare(context: CanvasRenderingContext2D) {
    this.applyPatch();
    if (this.background) context.drawImage(this.background, 0, 0);
    else {
      context.fillStyle = "#000000";
      context.fillRect(0, 0, this.base.width, this.base.height);
    }
  }
  fork(
    base: ImageData,
    white: ImageData,
    empty: ImageData | undefined,
    x: number,
    y: number,
  ) {
    if (this.disposed || this.pending) return;
    const patch = CanvasMatte.create(base, white, empty);
    if (!patch) return;
    const result = new CanvasMatte(
      this.base, this.gain, this.background, this.alpha, this.ownership,
    );
    result.pending = { patch, x, y };
    return result;
  }
  private applyPatch() {
    if (!this.pending) return;
    const { patch, x, y } = this.pending;
    const update = (canvas: HTMLCanvasElement, source: HTMLCanvasElement) => {
      const context = canvas.getContext("2d")!;
      context.clearRect(x, y, source.width, source.height);
      context.drawImage(source, x, y);
    };
    try {
      // Applied only when the queued source is committed and first rendered.
      // Discarding an uncommitted source leaves the current layers untouched.
      if (!this.alpha && patch.alpha) {
        this.alpha = document.createElement("canvas");
        this.alpha.width = this.base.width;
        this.alpha.height = this.base.height;
        this.alpha.getContext("2d")!.drawImage(this.base, 0, 0);
      }
      update(this.base, patch.base);
      update(this.gain, patch.gain);
      if (this.background && patch.background) update(this.background, patch.background);
      if (this.alpha) update(this.alpha, patch.alpha ?? patch.base);
    } finally {
      patch.dispose();
      this.pending = undefined;
    }
  }
  compose(context: CanvasRenderingContext2D) {
    context.globalCompositeOperation = "multiply";
    context.drawImage(this.gain, 0, 0);
    context.globalCompositeOperation = "lighter";
    context.drawImage(this.base, 0, 0);
    if (this.alpha) {
      context.globalCompositeOperation = "destination-in";
      context.drawImage(this.alpha, 0, 0);
    }
    context.globalCompositeOperation = "source-over";
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.pending?.patch.dispose();
    this.pending = undefined;
    if (--this.ownership.count) return;
    this.base.width = this.base.height = this.gain.width = this.gain.height = 0;
    if (this.background) this.background.width = this.background.height = 0;
    if (this.alpha) this.alpha.width = this.alpha.height = 0;
  }
}
