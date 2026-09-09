import type { CSSProperties } from "react";
import {
  PRESETS,
  normalizeGlassSettings,
  normalizeRimLight,
  hasFixedRadius,
  isRatioShape,
} from "react-glaze";
import type {
  GlassSettings,
  GlassPreset,
  GlassOwnProps,
  RimLightSettings,
} from "react-glaze";

export const exampleStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  padding: "16px 24px",
  background: "transparent",
  border: 0,
  font: "inherit",
  color: "#fff",
  fontSize: 32,
  fontWeight: 600,
  maxWidth: "calc(100% - 64px)",
} satisfies CSSProperties;

export function getExampleStyle(background: BackgroundId) {
  return {
    ...exampleStyle,
    color: background === "optical-type" ? "#20231f" : "#fff",
  };
}
export const backgrounds = [
  {
    id: "optical-type",
    name: "Optical Type",
    src: "",
    description: "The original LOOK / AGAIN artwork from Drawn To",
  },
  {
    id: "spectrum",
    name: "Spectrum",
    src: "/backgrounds/spectrum.png",
    description: "Vibrant colors and flowing curves",
  },
  {
    id: "alpine",
    name: "Alpine lake",
    src: "/backgrounds/alpine.png",
    description: "Mountain detail, reflections and light",
  },
  {
    id: "dunes",
    name: "Dunes",
    src: "/backgrounds/dunes.png",
    description: "Warm ridges and deep shadows",
  },
] as const;
export type BackgroundId = (typeof backgrounds)[number]["id"] | "custom";
export const dimensionModes = [
  ["auto", "Auto"],
  ["fit-content", "Fit content"],
  ["min-content", "Min content"],
  ["max-content", "Max content"],
  ["100%", "Fill available space"],
] as const;
export type StudioDimension = number | (typeof dimensionModes)[number][0];
export interface StudioState {
  settings: GlassSettings;
  rimLight: RimLightSettings | false;
  preset: GlassPreset;
  width: StudioDimension;
  height: StudioDimension;
  customShape: boolean;
  background: BackgroundId;
  motion: boolean;
  referenceLayout: boolean;
  example: "button" | "card" | "type" | "empty";
}
export const initialState: StudioState = {
  settings: {
    enabled: true, shape: "pill", optics: "smooth", lighting: "responsive",
    radius: 32, depth: 0.42, contentMode: "sharp", color: "#ffffff",
    roughness: 0.345, transmission: 0.84, thickness: 0.52, ior: 1.27,
    dispersion: 0.2, clearcoat: 0, clearcoatRoughness: 0.86,
    attenuationColor: "#ffffff", attenuationDistance: 50,
    envMapIntensity: 1.25, exposure: 1.25, shadowOpacity: 0.38, maxDpr: 2,
  },
  rimLight: { mode: "pointer", onLeave: "return", strength: 0.45, width: 2, reach: 100, response: 0.16 },
  preset: "frosted",
  customShape: false,
  width: "fit-content",
  height: "fit-content",
  background: "optical-type",
  motion: false,
  referenceLayout: false,
  example: "button",
};

const dimension = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): StudioDimension =>
  typeof value === "string" && dimensionModes.some(([mode]) => mode === value)
    ? (value as StudioDimension)
    : typeof value === "number" && Number.isFinite(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;
export function readInitialState(search = location.search): StudioState {
  try {
    const raw = new URLSearchParams(search).get("config");
    if (!raw) return initialState;
    const value = JSON.parse(raw);
    const preset: GlassPreset = [
      "reference",
      "optical-type",
      "optical-flow",
      "quiet",
      "frosted",
    ].includes(value.preset)
      ? value.preset
      : "reference";
    const settings = normalizeGlassSettings({ ...value.settings, preset });
    return {
      preset,
      settings,
      rimLight: normalizeRimLight(value.rimLight) ?? false,
      customShape: settings.shape === "rounded" && value.customShape === true,
      width: dimension(value.width, 64, 860, 520),
      height: dimension(value.height, 48, 440, 240),
      background: backgrounds.some((b) => b.id === value.background)
        ? value.background
        : "spectrum",
      motion: value.motion === true,
      referenceLayout: value.referenceLayout === true,
      example: ["button", "card", "type", "empty"].includes(value.example)
        ? value.example
        : "button",
    };
  } catch {
    return initialState;
  }
}
export function componentProps(state: StudioState): GlassOwnProps {
  const { shape, radius, ...material } = state.settings;
  const common = {
    ...material,
    preset: state.preset,
    ...(state.rimLight ? { rimLight: state.rimLight } : {}),
  };
  if (isRatioShape(shape)) return { ...common, shape, width: state.width };
  if (hasFixedRadius(shape))
    return { ...common, shape, width: state.width, height: state.height };
  return { ...common, shape, radius, width: state.width, height: state.height };
}
export function componentCode(state: StudioState) {
  const base = PRESETS[state.preset],
    values = componentProps(state);
  const props = [`as="${state.example === "button" ? "button" : "div"}"`];
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (
      key in base &&
      value === base[key as keyof GlassSettings] &&
      !["shape", "radius", "enabled", "contentMode"].includes(key)
    )
      continue;
    props.push(
      typeof value === "string"
        ? `${key}=${JSON.stringify(value)}`
        : `${key}={${JSON.stringify(value)}}`,
    );
  }
  const content =
    state.example === "card"
      ? "<div><strong style={{ fontSize: 28 }}>A new perspective</strong><p style={{ fontSize: 16 }}>Your own HTML, seen through glass.</p></div>"
      : state.example === "type"
        ? "<span style={{ fontSize: 72, lineHeight: 0.9, fontWeight: 700 }}>LOOK<br />AGAIN.</span>"
        : state.example === "empty"
          ? ""
          : "Explore the glass";
  const clickable = state.example === "button";
  const styleCode = Object.entries(getExampleStyle(state.background))
    .map(([key, value]) => `          ${key}: ${JSON.stringify(value)},`)
    .join("\n");
  return `'use client';\n\n${clickable ? "import { useState } from 'react';\n" : ""}import { LiquidGlass } from 'react-glaze';\n\nexport function GlassExample() {\n${clickable ? "  const [clicks, setClicks] = useState(0);\n" : ""}  return (\n    <>\n      <LiquidGlass\n        ${props.join("\n        ")}\n        style={{\n${styleCode}\n        }}${clickable ? "\n        onClick={() => setClicks(n => n + 1)}" : ""}\n      >\n        ${content}\n      </LiquidGlass>${clickable ? '\n      <p aria-live="polite">Clicks: {clicks}</p>' : ""}\n    </>\n  );\n}`;
}

export function shareableState(state: StudioState) {
  return {
    ...state,
    background: state.background === "custom" ? "spectrum" : state.background,
  };
}
