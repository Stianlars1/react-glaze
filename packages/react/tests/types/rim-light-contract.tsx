import { createRef } from "react";
import {
  LiquidGlass,
  RIM_LIGHT_DEFAULTS,
  normalizeRimLight,
  type RimLightOptions,
  type RimLightSettings,
  type GlassSettings,
} from "../../src/index.js";

const options: RimLightOptions = { mode: "pointer", onLeave: "hold", strength: 0.8, reach: 80 };
const complete: RimLightSettings = RIM_LIGHT_DEFAULTS;
<LiquidGlass rimLight />;
<LiquidGlass rimLight={false} />;
<LiquidGlass rimLight={{ mode: "static", width: 2, response: 0.12 }} />;
<LiquidGlass as="button" ref={createRef<HTMLButtonElement>()} rimLight={options}
  onClick={(event) => { event.currentTarget.disabled = true; }} />;
<LiquidGlass as="a" href="/places" rimLight={{}} />;

const resolved: RimLightSettings | null = normalizeRimLight(options);
if (resolved) {
  // @ts-expect-error Resolved settings are readonly.
  resolved.width = 2;
}
// @ts-expect-error Exported defaults are readonly.
complete.strength = 0;
// @ts-expect-error Rim configuration does not accept optical material fields.
<LiquidGlass rimLight={{ ior: 1.4 }} />;
// @ts-expect-error Only static and pointer modes are supported.
<LiquidGlass rimLight={{ mode: "spin" }} />;
// @ts-expect-error Numeric CSS pixels, not a CSS length string.
<LiquidGlass rimLight={{ width: "2px" }} />;
// @ts-expect-error Native element attribute checking is preserved.
<LiquidGlass as="button" rimLight href="/invalid" />;
// @ts-expect-error Rim state is independent of the optical settings/frame cache.
const opticalKey: keyof GlassSettings = "rimLight";

// @ts-expect-error Pointer exit behavior is return or hold.
<LiquidGlass rimLight={{ onLeave: "spin" }} />;
