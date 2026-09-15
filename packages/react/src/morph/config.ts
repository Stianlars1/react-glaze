import { resolveSettings } from "../presets.js";
import type {
  GlassGroupMaterial,
  GlassMotionOptions,
  GlassSurface,
} from "../morph-types.js";
import { MAX_SURFACES, type Surface } from "./model.js";
import {
  DEFAULT_BOUNCE,
  DEFAULT_DURATION,
  MAX_DURATION,
  MIN_DURATION,
} from "./motion-config.js";

export function groupMaterial(material: GlassGroupMaterial = {}) {
  return resolveSettings({
    preset: "reference",
    lighting: "responsive",
    maxDpr: 2,
    ...material,
    shape: "rounded",
    contentMode: "sharp",
  });
}
export function motionOptions(options: GlassMotionOptions = {}) {
  const duration = options.duration ?? DEFAULT_DURATION,
    bounce = options.bounce ?? DEFAULT_BOUNCE;
  return {
    duration: Number.isFinite(duration)
      ? Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration))
      : DEFAULT_DURATION,
    bounce: Number.isFinite(bounce)
      ? Math.max(0, Math.min(1, bounce))
      : DEFAULT_BOUNCE,
  };
}
export function normalizeSurfaces(values: readonly GlassSurface[]): Surface[] {
  if (values.length > MAX_SURFACES)
    throw new RangeError(
      `LiquidGlassGroup supports at most ${MAX_SURFACES} surfaces.`,
    );
  const ids = new Set<string>();
  return values.map((value) => {
    if (!value.id || ids.has(value.id))
      throw new TypeError(
        "LiquidGlassGroup surface IDs must be nonempty and unique.",
      );
    ids.add(value.id);
    const radius = value.radius ?? Math.min(value.width, value.height) / 2;
    if (
      ![value.x, value.y, value.width, value.height, radius].every(
        (n) => Number.isFinite(n) && Math.abs(n) <= 1_000_000,
      )
    )
      throw new RangeError(
        `LiquidGlassGroup surface '${value.id}' must have finite geometry within 1,000,000 CSS pixels.`,
      );
    const w = Math.max(0, value.width),
      h = Math.max(0, value.height);
    return {
      id: value.id,
      x: value.x,
      y: value.y,
      w,
      h,
      r: Math.max(0, Math.min(radius, w / 2, h / 2)),
    };
  });
}
export function drawableSurfaces(
  frame: readonly Surface[],
  targets: readonly Surface[],
) {
  const present = new Set(targets.map((s) => s.id));
  return frame
    .filter((s) => s.w > 0.01 && s.h > 0.01)
    .sort((a, b) => Number(present.has(b.id)) - Number(present.has(a.id)))
    .slice(0, MAX_SURFACES);
}
export function publicSurface(s: Surface): GlassSurface {
  return { id: s.id, x: s.x, y: s.y, width: s.w, height: s.h, radius: s.r };
}
export function groupDimension(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0 || value > 16384)
    throw new RangeError(
      `LiquidGlassGroup ${name} must be a finite CSS pixel size greater than 0 and at most 16384.`,
    );
  return value;
}
