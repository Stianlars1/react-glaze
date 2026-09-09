import type { GlassShape } from "./types.js";

export const SHAPES = [
  "rounded",
  "rectangle",
  "pill",
  "circle",
  "square",
  "ellipse",
  "lens",
] as const;
export function isRatioShape(shape: GlassShape): shape is "circle" | "square" {
  return shape === "circle" || shape === "square";
}
export function hasFixedRadius(
  shape: GlassShape,
): shape is Exclude<GlassShape, "rounded"> {
  return shape !== "rounded";
}

// Zero specificity lets ordinary element/class rules override shape defaults.
// React hoists and deduplicates this static stylesheet for SSR and client mounts.
export const shapeStyles = `
@layer liquid-glass {
:where([data-liquid-host]) { position: relative; border-radius: var(--liquid-radius, 32px); }
:where([data-liquid-shape="rectangle"], [data-liquid-shape="square"]) { border-radius: 0; }
:where([data-liquid-shape="pill"]) { border-radius: 999999px; }
:where([data-liquid-shape="circle"], [data-liquid-shape="ellipse"], [data-liquid-shape="lens"]) { border-radius: 50%; }
:where([data-liquid-shape="circle"], [data-liquid-shape="square"]) { aspect-ratio: 1; }
}
`;
