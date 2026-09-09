import { LiquidGlass } from "../../src/index.js";
<LiquidGlass shape="circle" width={120} />;
<LiquidGlass shape="square" height="fit-content" />;
<LiquidGlass shape="pill" width="fit-content" height="auto" />;
<LiquidGlass
  shape="ellipse"
  style={{ width: 200, height: 100, borderRadius: 12 }}
/>;
<LiquidGlass shape="rectangle" className="custom" />;
<LiquidGlass radius={24} width="min-content" />;
<LiquidGlass
  as="a"
  href="/test"
  shape="circle"
  style={{ borderRadius: "20%" }}
/>;
<LiquidGlass
  as="button"
  onClick={(e) => e.currentTarget.focus()}
  shape="pill"
/>;
<LiquidGlass preset="optical-type" optics="smooth" className="custom-lens" />;
// @ts-expect-error Fixed shapes own their radius convenience.
<LiquidGlass shape="circle" radius={10} />;
// @ts-expect-error Pill owns its radius convenience.
<LiquidGlass shape="pill" radius={10} />;
// @ts-expect-error Lens does not use a numeric radius convenience.
<LiquidGlass shape="lens" radius={10} />;
// @ts-expect-error Use CSS for deliberately unequal dimensions of a circle.
<LiquidGlass shape="circle" width={120} height={80} />;
// @ts-expect-error Keep native attribute checking.
<LiquidGlass as="button" href="/invalid" />;
<LiquidGlass preset="optical-type" shape="rounded" radius={20} />;
// @ts-expect-error Optical Type without an explicit shape uses a lens.
<LiquidGlass preset="optical-type" radius={20} />;

import type { GlassPreset } from "../../src/index.js";
declare const selectedPreset: GlassPreset;
<LiquidGlass preset={selectedPreset} />;
