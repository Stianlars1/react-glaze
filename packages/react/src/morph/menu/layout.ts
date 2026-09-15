import type { GlassActionLayout, GlassDirection, GlassSurface } from "../../morph-types.js";
import { arrangementDirection, makeSplitLayout } from "../split-layout.js";
import type { Size, Surface } from "../model.js";

export const ANCHOR_ID = "glaze:anchor";
export const TRIGGER_ID = "glaze:trigger";
export const actionSurfaceId = (id: string) => `glaze:action:${id}`;
const MARGIN = 8, PADDING = 12, MAX_OVERSCAN = 160;
const directions: GlassDirection[] = ["top", "right", "bottom", "left"];
const opposite = { top: "bottom", right: "left", bottom: "top", left: "right" } as const;

export interface ViewportBox { left: number; top: number; right: number; bottom: number }
export interface MenuItemSize extends Size { id: string }
export interface MenuLayout {
  mode: "split" | "panel";
  direction: GlassDirection;
  wrapped: boolean;
  width: number;
  height: number;
  anchor: { x: number; y: number };
  closed: GlassSurface[];
  expanded: GlassSurface[];
  panel: Size & { columns: number; contentHeight: number; contentWidth: number };
}

function fittingViewport(view: ViewportBox, trigger: number): ViewportBox {
  const half = trigger / 2;
  if (view.left < half && view.right > -half && view.top < half && view.bottom > -half) return view;
  // An offscreen anchor must not pull its future menu back onto the visible page.
  // Reserve overscan inside the group's public 16384px dimension limit.
  const maximum = 16384 - MAX_OVERSCAN * 2;
  const width = Math.max(1, Math.min(maximum, view.right - view.left));
  const height = Math.max(1, Math.min(maximum, view.bottom - view.top));
  return { left: -width / 2, right: width / 2, top: -height / 2, bottom: height / 2 };
}

function extents(surfaces: Surface[]) {
  return {
    left: Math.min(...surfaces.map(s => s.x - s.w / 2)), right: Math.max(...surfaces.map(s => s.x + s.w / 2)),
    top: Math.min(...surfaces.map(s => s.y - s.h / 2)), bottom: Math.max(...surfaces.map(s => s.y + s.h / 2)),
  };
}

function fits(surfaces: Surface[], view: ViewportBox) {
  return surfaces.every(s => s.x - s.w / 2 >= view.left + MARGIN - .01 &&
    s.x + s.w / 2 <= view.right - MARGIN + .01 && s.y - s.h / 2 >= view.top + MARGIN - .01 &&
    s.y + s.h / 2 <= view.bottom - MARGIN + .01);
}

function clearTrigger(surface: Surface, trigger: Surface) {
  return Math.abs(surface.x) >= (surface.w + trigger.w) / 2 + 8 - .01 ||
    Math.abs(surface.y) >= (surface.h + trigger.h) / 2 + 8 - .01;
}

function anchorSplit(surfaces: Surface[], direction: GlassDirection, view: ViewportBox) {
  const origin = surfaces[0];
  let placed = surfaces.map((s, index) => ({ ...s, id: index ? s.id : TRIGGER_ID, x: s.x - origin.x, y: s.y - origin.y }));
  if (fits(placed.slice(1), view)) return placed;
  const actions = placed.slice(1), bounds = extents(actions);
  const cross = direction === "top" || direction === "bottom";
  const min = cross ? view.left + MARGIN - bounds.left : view.top + MARGIN - bounds.top;
  const max = cross ? view.right - MARGIN - bounds.right : view.bottom - MARGIN - bounds.bottom;
  if (min > max) return undefined;
  const shift = Math.max(min, Math.min(max, 0));
  placed = placed.map((s, index) => index ? { ...s, x: s.x + (cross ? shift : 0), y: s.y + (cross ? 0 : shift) } : s);
  return fits(placed.slice(1), view) && placed.slice(1).every(s => clearTrigger(s, placed[0])) ? placed : undefined;
}

function split(items: MenuItemSize[], trigger: number, layout: GlassActionLayout, preferred: GlassDirection,
  distance: number, view: ViewportBox) {
  const first = arrangementDirection(layout, preferred);
  const choices = [first, opposite[first], ...directions.filter(d => d !== first && d !== opposite[first])];
  for (const candidate of choices) {
    const arrangement = layout === "fan" ? "fan" : candidate === "left" || candidate === "right" ? "row" : "column";
    const result = makeSplitLayout({ w: 32768, h: 32768 }, trigger, items, arrangement, candidate, distance);
    const surfaces = anchorSplit(result.surfaces, result.direction, view);
    if (surfaces) return { surfaces, direction: result.direction, wrapped: candidate !== first && arrangement !== layout };
  }
  // Let the core compact or wrap in actual available space, then anchor-check the result.
  const size = { w: Math.max(0, view.right - view.left), h: Math.max(0, view.bottom - view.top) };
  for (const candidate of choices) {
    const result = makeSplitLayout(size, trigger, items, layout, candidate, distance);
    const surfaces = anchorSplit(result.surfaces, result.direction, view);
    if (surfaces) return { surfaces, direction: result.direction, wrapped: result.wrapped };
  }
  return undefined;
}

function panel(items: MenuItemSize[], trigger: number, labels: boolean, preferred: GlassDirection, view: ViewportBox) {
  const availableWidth = Math.max(1, view.right - view.left - MARGIN * 2);
  const availableHeight = Math.max(1, view.bottom - view.top - MARGIN * 2 - 48);
  const cellWidth = Math.max(44, ...items.map(s => s.w));
  const cellHeight = Math.max(44, ...items.map(s => s.h));
  const columns = labels ? 1 : Math.max(1, Math.min(items.length || 1,
    Math.floor(Math.max(1, availableWidth - PADDING * 2) / cellWidth)));
  const contentWidth = columns * cellWidth, contentHeight = Math.ceil(items.length / columns) * cellHeight;
  const w = Math.min(availableWidth, contentWidth + PADDING * 2);
  const h = Math.min(availableHeight, contentHeight + PADDING * 2);
  const minX = view.left + MARGIN + w / 2, maxX = view.right - MARGIN - w / 2;
  const minY = view.top + MARGIN + 48 + h / 2, maxY = view.bottom - MARGIN - h / 2;
  const choices = [preferred, opposite[preferred], ...directions.filter(d => d !== preferred && d !== opposite[preferred])];
  const candidates = choices.map(direction => {
    const intendedX = direction === "left" ? -(w - trigger) / 2 : direction === "right" ? (w - trigger) / 2 : 0;
    const intendedY = direction === "top" ? -(h - trigger) / 2 : direction === "bottom" ? (h - trigger) / 2 : 0;
    const x = Math.max(minX, Math.min(maxX, intendedX)), y = Math.max(minY, Math.min(maxY, intendedY));
    return { direction, x, y, correction: Math.abs(x - intendedX) + Math.abs(y - intendedY) };
  });
  // Prefer the requested growth direction, flipping when it avoids clipping the panel.
  candidates.sort((a, b) => a.correction - b.correction);
  const { direction, x, y } = candidates[0];
  return { surface: { id: TRIGGER_ID, x, y, w, h, r: labels || columns < items.length ? 30 : h / 2 },
    direction, size: { w, h, columns, contentWidth, contentHeight } };
}

export function makeMenuLayout(options: { mode: "split" | "panel"; items: MenuItemSize[]; trigger: number;
  layout: GlassActionLayout; direction: GlassDirection; distance: number; labels: boolean; view: ViewportBox }): MenuLayout {
  const { items, trigger, direction } = options;
  const view = fittingViewport(options.view, trigger);
  const arranged = options.mode === "split" && items.length ? split(items, trigger, options.layout, direction, options.distance, view) : undefined;
  const pane = panel(items, trigger, options.labels, direction, view);
  const mode = options.mode === "split" && (arranged || !items.length) ? "split" : "panel";
  const expanded = mode === "split" ? arranged?.surfaces ?? [{ id: TRIGGER_ID, x: 0, y: 0, w: trigger, h: trigger, r: trigger / 2 }] : [pane.surface];
  const closed = expanded.map((s, index) => ({ ...s, x: 0, y: 0, w: index ? 0 : trigger, h: index ? 0 : trigger, r: index ? 0 : trigger / 2 }));
  const bounds = extents([...expanded, ...closed]);
  // Both states share bounds. The invisible marker only moves when fitting/settings change.
  const overscan = Math.max(24, Math.min(MAX_OVERSCAN, Math.max(bounds.right - bounds.left, bounds.bottom - bounds.top) * .22));
  const anchor = { x: overscan - bounds.left, y: overscan - bounds.top };
  const convert = (surfaces: Surface[]): GlassSurface[] => [...surfaces.map(s => ({ id: s.id,
    x: s.x + anchor.x, y: s.y + anchor.y, width: s.w, height: s.h, radius: s.r })),
  { id: ANCHOR_ID, ...anchor, width: 0, height: 0 }];
  return { mode, direction: arranged?.direction ?? pane.direction, wrapped: arranged?.wrapped ?? options.mode === "split",
    width: bounds.right - bounds.left + overscan * 2, height: bounds.bottom - bounds.top + overscan * 2,
    anchor, closed: convert(closed), expanded: convert(expanded), panel: pane.size };
}
