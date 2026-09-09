import type { RimLightSettings } from '../types.js';
export interface RimDirection { readonly x: number; readonly y: number }
export interface RimTarget extends RimDirection { readonly tracking: boolean }
export interface RimBounds {
  readonly left: number; readonly top: number; readonly right: number;
  readonly bottom: number; readonly width: number; readonly height: number;
}
export const RIM_REST_DIRECTION: Readonly<RimTarget> = Object.freeze({
  x: -Math.SQRT1_2, y: -Math.SQRT1_2, tracking: false,
});

export function affectsRimGeometry(frames: readonly Record<string, unknown>[]) {
  return frames.some(frame => Object.keys(frame).some(property =>
    /^(transform|transformOrigin|translate|rotate|scale|left|right|top|bottom|width|height|minWidth|minHeight|maxWidth|maxHeight|margin.*|padding.*|border.*Width|fontSize|lineHeight|flex.*|gap|rowGap|columnGap|gridTemplate.*|offsetDistance|offsetPath|offsetRotate)$/.test(property),
  ));
}

export function idleRim(current: RimDirection, onLeave: RimLightSettings['onLeave']): RimTarget {
  return onLeave === 'hold' ? { x: current.x, y: current.y, tracking: false } : RIM_REST_DIRECTION;
}

export function rimTarget(bounds: RimBounds, pointer: RimDirection | null, reach: number, onLeave: RimLightSettings['onLeave'] = 'return'): RimTarget {
  if (!pointer || bounds.width <= 0 || bounds.height <= 0 ||
    ![bounds.left, bounds.top, bounds.right, bounds.bottom, bounds.width, bounds.height, pointer.x, pointer.y].every(Number.isFinite)) return RIM_REST_DIRECTION;
  const distance = Math.hypot(
    Math.max(bounds.left - pointer.x, 0, pointer.x - bounds.right),
    Math.max(bounds.top - pointer.y, 0, pointer.y - bounds.bottom),
  );
  if (distance > 0 && distance >= Math.max(0, reach)) return RIM_REST_DIRECTION;
  const t = Math.min(1, distance / Math.max(1, reach));
  const influence = onLeave === 'hold' ? 1 : 1 - t * t * (3 - 2 * t);
  const x = pointer.x - (bounds.left + bounds.width / 2);
  const y = pointer.y - (bounds.top + bounds.height / 2);
  const height = Math.max(24, Math.min(bounds.width, bounds.height) * 0.35);
  const length = Math.hypot(x, y, height);
  return {
    x: RIM_REST_DIRECTION.x + (x / length - RIM_REST_DIRECTION.x) * influence,
    y: RIM_REST_DIRECTION.y + (y / length - RIM_REST_DIRECTION.y) * influence,
    tracking: true,
  };
}

export function advanceRim(current: RimDirection, target: RimDirection, dt: number, response: number) {
  const alpha = 1 - Math.exp(-Math.max(0, Math.min(0.05, dt)) / response);
  const x = current.x + (target.x - current.x) * alpha;
  const y = current.y + (target.y - current.y) * alpha;
  const moving = Math.hypot(target.x - x, target.y - y) >= 0.001;
  return moving ? { x, y, moving } : { x: target.x, y: target.y, moving: false };
}
