"use client";
import type { LiquidGlassActionsProps } from "./morph-types.js";
import { GlassMenu } from "./morph/menu/Menu.js";

export function LiquidGlassActions(props: LiquidGlassActionsProps) {
  return <GlassMenu {...props} mode="split" />;
}
