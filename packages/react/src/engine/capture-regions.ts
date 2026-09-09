import { includesCaptureNode } from "./capture-filter.js";

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface PaintRecord {
  rect: Rect;
  bounded: boolean;
  opaque: boolean;
}
export interface CaptureScene {
  records: Map<Element, PaintRecord>;
  bounds: Map<Element, Rect | null>;
  width: number;
  height: number;
}
export interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  css: Rect;
  prune: (node: HTMLElement) => boolean;
}
const union = (a: Rect, b: Rect): Rect => ({
  left: Math.min(a.left, b.left),
  top: Math.min(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
});
const intersects = (a: Rect, b: Rect) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// Layout is measured across the source, while only explicitly classified image
// and text mutations may reuse raster pixels. Global/style changes capture fully.
export function scanCaptureScene(
  root: HTMLElement,
  width: number,
  height: number,
): CaptureScene {
  const origin = root.getBoundingClientRect();
  const records = new Map<Element, PaintRecord>();
  const bounds = new Map<Element, Rect | null>();
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    if (!includesCaptureNode(element)) continue;
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const rect = {
      left: box.left - origin.left,
      top: box.top - origin.top,
      right: box.right - origin.left,
      bottom: box.bottom - origin.top,
    };
    const pseudos = ["::before", "::after"].map((pseudo) =>
      getComputedStyle(element, pseudo),
    );
    const bounded =
      !element.shadowRoot &&
      [style.filter, style.boxShadow, style.textShadow].every(
        (value) => value === "none",
      ) &&
      (style.outlineStyle === "none" || parseFloat(style.outlineWidth) === 0) &&
      pseudos.every((pseudo) => ["none", "normal"].includes(pseudo.content)) &&
      style.transform === "none" &&
      style.perspective === "none";
    const color = style.backgroundColor;
    const opaque =
      Number(style.opacity) === 1 &&
      color !== "transparent" &&
      (color.startsWith("rgb(") || /^rgba\([^)]*,\s*1\)$/.test(color));
    records.set(element, { rect, bounded, opaque });
    bounds.set(element, bounded ? rect : null);
  }
  // Include escaped descendants in each branch's paint bounds. Unknown effects
  // keep their branch intact instead of assuming its border box contains paint.
  for (const element of [...records.keys()].reverse()) {
    const parent = element.parentElement;
    if (!parent || !bounds.has(parent)) continue;
    const a = bounds.get(parent),
      b = bounds.get(element);
    bounds.set(parent, a && b ? union(a, b) : null);
  }
  return { records, bounds, width, height };
}

export function planCaptureRegion(
  previous: CaptureScene | undefined,
  next: CaptureScene,
  pixelWidth: number,
  pixelHeight: number,
  changes?: readonly Element[],
): CaptureRegion | undefined {
  if (
    !previous ||
    !changes?.length ||
    previous.width !== next.width ||
    previous.height !== next.height ||
    previous.records.size !== next.records.size
  )
    return;
  let dirty: Rect | undefined;
  for (const element of changes) {
    const current = next.records.get(element),
      old = previous.records.get(element);
    if (!current?.bounded || !old?.bounded) return;
    // An opaque ancestor supplies a generous paint region around changed text,
    // keeping native glyph ink and local overlay content in the same capture.
    let ancestor: Element | null = element;
    while (ancestor && !next.records.get(ancestor)?.opaque)
      ancestor = ancestor.parentElement;
    const currentBounds = ancestor && next.records.get(ancestor);
    const oldBounds = ancestor && previous.records.get(ancestor);
    if (!currentBounds || !oldBounds) return;
    const changed = union(
      union(old.rect, current.rect),
      union(oldBounds.rect, currentBounds.rect),
    );
    dirty = dirty ? union(dirty, changed) : changed;
  }
  for (const [element, current] of next.records) {
    const old = previous.records.get(element);
    if (!old) return;
    if (JSON.stringify(old.rect) === JSON.stringify(current.rect)) continue;
    if (!old.bounded || !current.bounded) return;
    const changed = union(old.rect, current.rect);
    dirty = dirty ? union(dirty, changed) : changed;
  }
  if (!dirty || next.width <= 0 || next.height <= 0) return;
  const sx = pixelWidth / next.width,
    sy = pixelHeight / next.height;
  const x = Math.max(0, Math.floor((dirty.left - 2) * sx));
  const y = Math.max(0, Math.floor((dirty.top - 2) * sy));
  const right = Math.min(pixelWidth, Math.ceil((dirty.right + 2) * sx));
  const bottom = Math.min(pixelHeight, Math.ceil((dirty.bottom + 2) * sy));
  const width = right - x,
    height = bottom - y;
  if (
    width <= 0 ||
    height <= 0 ||
    width * height > pixelWidth * pixelHeight * 0.65
  )
    return;
  const css = {
    left: x / sx,
    top: y / sy,
    right: right / sx,
    bottom: bottom / sy,
  };
  return {
    x,
    y,
    width,
    height,
    css,
    prune: (node) => {
      const bound = next.bounds.get(node);
      return Boolean(bound && !intersects(bound, css));
    },
  };
}
