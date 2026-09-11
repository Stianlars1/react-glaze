import type { GlassOwnProps } from "react-glaze";

export const landingPill = {
  shape: "pill",
  width: 280,
  height: "auto",
  preset: "reference",
  lighting: "responsive",
  rimLight: { mode: "pointer", onLeave: "hold" },
  contentMode: "sharp",
  maxDpr: 2,
} as const satisfies GlassOwnProps;

export const landingPillLabel = "A different feeling.";
export const landingPillArrow = "M5 12h14m-5-5 5 5-5 5";
