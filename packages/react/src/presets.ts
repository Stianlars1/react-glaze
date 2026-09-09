import { SHAPES, hasFixedRadius } from "./shapes.js";
import type { GlassSettings, GlassPreset, GlassOptions } from "./types.js";

export const REFERENCE: Readonly<GlassSettings> = Object.freeze({
  enabled: true,
  shape: "rounded",
  optics: "smooth",
  lighting: "studio",
  radius: 32,
  depth: 0.44,
  contentMode: "sharp",
  color: "#ffffff",
  roughness: 0.015,
  transmission: 1,
  thickness: 1.25,
  ior: 1.48,
  dispersion: 0.028,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  attenuationColor: "#b6e6e7",
  attenuationDistance: 16,
  envMapIntensity: 0.85,
  exposure: 1,
  shadowOpacity: 0.16,
  maxDpr: 1.5,
});
export const PRESETS: Readonly<Record<GlassPreset, Readonly<GlassSettings>>> =
  Object.freeze({
    reference: REFERENCE,
    "optical-type": Object.freeze({
      ...REFERENCE,
      shape: "lens",
      optics: "reference",
      contentMode: "sharp",
    }),
    "optical-flow": Object.freeze({
      ...REFERENCE,
      shape: "lens",
      optics: "reference",
      lighting: "responsive",
    }),
    quiet: Object.freeze({
      ...REFERENCE,
      thickness: 0.45,
      ior: 1.25,
      depth: 0.2,
      envMapIntensity: 0.55,
      shadowOpacity: 0.08,
    }),
    frosted: Object.freeze({
      ...REFERENCE,
      roughness: 0.22,
      thickness: 0.8,
      dispersion: 0,
      attenuationColor: "#d9e6ec",
    }),
  });
const bounds: Partial<Record<keyof GlassSettings, readonly [number, number]>> =
  {
    radius: [0, 1000],
    depth: [0.04, 1],
    roughness: [0, 1],
    transmission: [0, 1],
    thickness: [0, 3],
    ior: [1, 2.333],
    dispersion: [0, 0.25],
    clearcoat: [0, 1],
    clearcoatRoughness: [0, 1],
    attenuationDistance: [0.1, 100],
    envMapIntensity: [0, 3],
    exposure: [0.25, 2],
    shadowOpacity: [0, 0.5],
    maxDpr: [0.5, 2],
  };
export function resolveSettings(props: GlassOptions): GlassSettings {
  const preset =
    props.preset && Object.hasOwn(PRESETS, props.preset)
      ? PRESETS[props.preset]
      : REFERENCE;
  const result = { ...preset };
  for (const key of Object.keys(REFERENCE) as (keyof GlassSettings)[]) {
    const value = props[key];
    if (value === undefined) continue;
    const limit = bounds[key];
    if (limit) {
      if (typeof value === "number" && Number.isFinite(value))
        Object.assign(result, {
          [key]: Math.max(limit[0], Math.min(limit[1], value)),
        });
    } else if (key === "enabled" && typeof value === "boolean")
      result.enabled = value;
    else if (key === "optics" && (value === "smooth" || value === "reference"))
      result.optics = value;
    else if (
      key === "lighting" &&
      (value === "studio" || value === "responsive")
    )
      result.lighting = value;
    else if (
      key === "shape" &&
      SHAPES.includes(value as GlassSettings["shape"])
    )
      result.shape = value as GlassSettings["shape"];
    else if (
      key === "contentMode" &&
      (value === "sharp" || value === "refracted")
    )
      result.contentMode = value;
    else if (
      ["color", "attenuationColor"].includes(key) &&
      typeof value === "string" &&
      /^#[0-9a-f]{6}$/i.test(value)
    )
      Object.assign(result, { [key]: value });
  }
  if (hasFixedRadius(result.shape)) result.radius = REFERENCE.radius;
  return result;
}
