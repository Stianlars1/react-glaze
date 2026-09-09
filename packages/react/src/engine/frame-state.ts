import type { CanvasTexture } from "three";
import type { GlassSettings } from "../types.js";

// Describes one successfully presented image, not the shared renderer's
// mutable uniforms or drawing buffer. No additional pixels are retained.
export interface FrameState {
  host: HTMLElement;
  root: HTMLElement;
  texture: CanvasTexture;
  version: number;
  image: CanvasTexture["image"];
  style: string;
  inputs: readonly number[];
  settings: GlassSettings;
}

export function sameFrame(previous: FrameState | undefined, next: FrameState) {
  return Boolean(
    previous &&
    previous.host === next.host &&
    previous.root === next.root &&
    previous.texture === next.texture &&
    previous.version === next.version &&
    previous.image === next.image &&
    previous.style === next.style &&
    previous.inputs.length === next.inputs.length &&
    next.inputs.every((value, index) => value === previous.inputs[index]) &&
    (Object.keys(next.settings) as (keyof GlassSettings)[]).every(
      (key) => previous.settings[key] === next.settings[key],
    ),
  );
}
