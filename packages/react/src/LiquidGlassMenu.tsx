"use client";
import type { LiquidGlassMenuProps } from "./morph-types.js";
import { GlassMenu } from "./morph/menu/Menu.js";

export function LiquidGlassMenu(props: LiquidGlassMenuProps) {
  return <GlassMenu {...props} mode="panel" />;
}
