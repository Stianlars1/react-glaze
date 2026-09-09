"use client";
export { LiquidGlass } from "./LiquidGlass.js";
export {
  REFERENCE,
  PRESETS,
  resolveSettings as normalizeGlassSettings,
} from "./presets.js";
export type {
  LiquidGlassProps,
  GlassSettings,
  GlassShape,
  GlassOwnProps,
  GlassMaterial,
  GlassMetrics,
  GlassPreset,
  GlassTag,
  RimLightSettings,
  RimLightOptions,
} from "./types.js";

export { RIM_LIGHT_DEFAULTS, normalizeRimLight } from "./rim-light.js";

export { SHAPES, hasFixedRadius, isRatioShape } from "./shapes.js";
