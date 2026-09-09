import type { CSSProperties } from "react";
import type { RimLightSettings } from "./types.js";

export const RIM_LIGHT_DEFAULTS: RimLightSettings = Object.freeze({
  mode: "pointer",
  onLeave: "return",
  strength: 0.95,
  width: 1.8,
  reach: 100,
  response: 0.14,
});

function finite(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

export function normalizeRimLight(value: unknown): RimLightSettings | null {
  if (value === true) return RIM_LIGHT_DEFAULTS;
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const options = value as Partial<RimLightSettings>;
  return Object.freeze({
    mode: options.mode === "static" ? "static" : "pointer",
    onLeave: options.onLeave === "hold" ? "hold" : "return",
    strength: finite(options.strength, 0, 1, RIM_LIGHT_DEFAULTS.strength),
    width: finite(options.width, 0.5, 4, RIM_LIGHT_DEFAULTS.width),
    reach: finite(options.reach, 0, 220, RIM_LIGHT_DEFAULTS.reach),
    response: finite(options.response, 0.06, 0.3, RIM_LIGHT_DEFAULTS.response),
  });
}

type RimLightStyle = CSSProperties & {
  "--rim-x": string;
  "--rim-y": string;
  "--rim-width": string;
  "--rim-strength": number;
};

export function rimLightStyle(settings: RimLightSettings): RimLightStyle {
  return {
    position: "absolute",
    inset: 0,
    borderRadius: "inherit",
    zIndex: 2,
    pointerEvents: "none",
    "--rim-x": "0.70711",
    "--rim-y": "0.70711",
    "--rim-width": `${settings.width}px`,
    "--rim-strength": settings.strength,
    boxShadow:
      "inset calc(var(--rim-x) * var(--rim-width)) calc(var(--rim-y) * var(--rim-width)) calc(var(--rim-width) * .45) rgb(255 255 255 / var(--rim-strength)), " +
      "inset calc(var(--rim-x) * var(--rim-width) * -.65) calc(var(--rim-y) * var(--rim-width) * -.65) calc(var(--rim-width) * 1.4) rgb(255 255 255 / calc(var(--rim-strength) * .12))",
  };
}
