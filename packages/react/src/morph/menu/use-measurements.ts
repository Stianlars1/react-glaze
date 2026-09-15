import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { GlassAction } from "../../morph-types.js";
import { actionSurfaceId, type MenuItemSize, type ViewportBox } from "./layout.js";

interface Measurements { sizes: MenuItemSize[]; view: ViewportBox }
type Rect = Pick<DOMRectReadOnly, "left" | "top" | "right" | "bottom" | "width" | "height">;
type BoundaryObserver = Pick<ResizeObserver, "observe" | "unobserve">;

export function menuViewFromRects(
  trigger: Rect,
  triggerSize: number,
  viewport: Rect,
  boundary?: Rect,
): ViewportBox {
  const bounds = boundary && boundary.width > 0 && boundary.height > 0 ? boundary : viewport;
  const x = trigger.left + trigger.width / 2, y = trigger.top + trigger.height / 2;
  const scaleX = trigger.width / triggerSize || 1, scaleY = trigger.height / triggerSize || 1;
  return {
    left: (bounds.left - x) / scaleX,
    top: (bounds.top - y) / scaleY,
    right: (bounds.right - x) / scaleX,
    bottom: (bounds.bottom - y) / scaleY,
  };
}

export function rebindBoundaryObserver(
  observer: BoundaryObserver | undefined,
  observed: HTMLElement | null,
  boundary?: RefObject<HTMLElement | null>,
) {
  const next = boundary?.current ?? null;
  if (next === observed) return observed;
  if (observed) observer?.unobserve(observed);
  if (next) observer?.observe(next);
  return next;
}

export function useMenuMeasurements(
  items: readonly GlassAction[],
  size: number,
  labels: boolean,
  triggerSize: number,
  boundary?: RefObject<HTMLElement | null>,
) {
  const root = useRef<HTMLDivElement>(null);
  const contents = useRef(new Map<string, HTMLSpanElement>());
  const resizeObserver = useRef<ResizeObserver | undefined>(undefined);
  const boundaryObserver = useRef<ResizeObserver | undefined>(undefined);
  const observedBoundary = useRef<HTMLElement | null>(null);
  const refresh = useRef<() => void>(() => {});
  const latest = useRef({ items, size, labels, triggerSize, boundary });
  latest.current = { items, size, labels, triggerSize, boundary };
  const [measured, setMeasured] = useState<Measurements>();
  const signature = JSON.stringify(items.map(item => [item.id, item.label, item.icon !== undefined, item.content !== undefined]));
  useLayoutEffect(() => {
    let disposed = false;
    const measure = () => {
      if (disposed || !root.current) return;
      const current = latest.current, box = root.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? document.documentElement.clientWidth;
      const height = viewport?.height ?? document.documentElement.clientHeight;
      const viewportRect = { left, top, right: left + width, bottom: top + height, width, height };
      const boundaryElement = rebindBoundaryObserver(
        boundaryObserver.current,
        observedBoundary.current,
        current.boundary,
      );
      observedBoundary.current = boundaryElement;
      const boundaryRect = boundaryElement?.isConnected ? boundaryElement.getBoundingClientRect() : undefined;
      const view = menuViewFromRects(box, current.triggerSize, viewportRect, boundaryRect);
      const sizes = current.items.map(item => {
        const content = contents.current.get(item.id);
        const padding = current.labels || item.content !== undefined || item.icon === undefined ? 32 : 0;
        return { id: actionSurfaceId(item.id), w: Math.max(current.size, Math.ceil(content?.offsetWidth ?? 0) + padding),
          h: Math.max(current.size, Math.ceil(content?.offsetHeight ?? 0) + 16) };
      });
      const next = { sizes, view };
      setMeasured(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    const boundaryResizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    refresh.current = measure;
    resizeObserver.current = observer;
    boundaryObserver.current = boundaryResizeObserver;
    if (root.current) observer?.observe(root.current);
    for (const content of contents.current.values()) observer?.observe(content);
    const viewport = window.visualViewport;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    viewport?.addEventListener("resize", measure);
    viewport?.addEventListener("scroll", measure);
    const fonts = document.fonts;
    fonts?.addEventListener("loadingdone", measure);
    void fonts?.ready.then(measure);
    measure();
    return () => {
      disposed = true; observer?.disconnect();
      if (resizeObserver.current === observer) resizeObserver.current = undefined;
      boundaryResizeObserver?.disconnect();
      if (boundaryObserver.current === boundaryResizeObserver) boundaryObserver.current = undefined;
      observedBoundary.current = null;
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      viewport?.removeEventListener("resize", measure);
      viewport?.removeEventListener("scroll", measure);
      fonts?.removeEventListener("loadingdone", measure);
    };
  }, [signature, size, labels, triggerSize, boundary]);
  useLayoutEffect(() => {
    if (observedBoundary.current !== boundary?.current) refresh.current();
  });
  const byId = new Map(measured?.sizes.map(item => [item.id, item]));
  return { root,
    refresh: () => refresh.current(),
    registerContent(id: string, node: HTMLSpanElement | null) {
      const previous = contents.current.get(id);
      if (previous) resizeObserver.current?.unobserve(previous);
      if (node) { contents.current.set(id, node); resizeObserver.current?.observe(node); }
      else contents.current.delete(id);
    },
    sizes: items.map(item => byId.get(actionSurfaceId(item.id)) ?? {
      id: actionSurfaceId(item.id), w: labels || (!item.icon && !item.content) ? Math.max(size, item.label.length * 8 + 32) : size,
      h: size,
    }),
    // Server rendering has no viewport. This is replaced before the first browser paint.
    view: measured?.view ?? { left: -512, right: 512, top: -384, bottom: 384 } };
}
