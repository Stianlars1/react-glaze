import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ReactElement,
  Ref,
} from "react";

export type GlassShape =
  "rounded" | "rectangle" | "pill" | "circle" | "square" | "ellipse" | "lens";

export interface GlassMaterial {
  color: string;
  roughness: number;
  transmission: number;
  thickness: number;
  ior: number;
  dispersion: number;
  clearcoat: number;
  clearcoatRoughness: number;
  attenuationColor: string;
  attenuationDistance: number;
  envMapIntensity: number;
}
export interface GlassSettings extends GlassMaterial {
  enabled: boolean;
  shape: GlassShape;
  optics: "smooth" | "reference";
  lighting: "studio" | "responsive";
  radius: number;
  depth: number;
  contentMode: "sharp" | "refracted";
  exposure: number;
  shadowOpacity: number;
  maxDpr: number;
}
export type GlassPreset =
  "reference" | "optical-type" | "optical-flow" | "quiet" | "frosted";
export interface GlassMetrics {
  renders: number;
  captures: number;
  sourceMs: number;
  /** Wall time submitting WebGL work; not GPU elapsed time. */
  renderMs: number;
  /** Wall time copying to 2D, potentially including GPU synchronization. */
  copyMs: number;
  /** Age of the displayed snapshot measured from capture start. */
  sourceAgeMs: number;
  sourceWidth: number;
  sourceHeight: number;
  geometryCount: number;
  captureAttempts: number;
  discardedCaptures: number;
  backend: "three-webgl2";
}
export interface RimLightSettings {
  readonly mode: "static" | "pointer";
  /** Return to the upper left or hold the last direction after pointer exit. */
  readonly onLeave: "return" | "hold";
  /** Highlight opacity from 0 to 1. */
  readonly strength: number;
  /** Rim width in CSS pixels, from 0.5 to 4. */
  readonly width: number;
  /** Pointer influence beyond the host, in CSS pixels, from 0 to 220. */
  readonly reach: number;
  /** Pointer response time in seconds, from 0.06 to 0.3. */
  readonly response: number;
}
export type RimLightOptions = boolean | Partial<RimLightSettings>;
export interface GlassOptions extends Partial<GlassSettings> {
  preset?: GlassPreset;
  rimLight?: RimLightOptions;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  onReady?: () => void;
  onError?: (error: Error) => void;
  onMetrics?: (metrics: GlassMetrics) => void;
}
type Dimensions = Pick<GlassOptions, "width" | "height">;
type RatioDimensions =
  | { width?: CSSProperties["width"]; height?: never }
  | { width?: never; height?: CSSProperties["height"] };
type ShapeProps =
  | ({
      shape?: "rounded";
      preset?: Exclude<GlassPreset, "optical-type" | "optical-flow">;
      radius?: number;
    } & Dimensions)
  | ({ shape: "rounded"; preset?: GlassPreset; radius?: number } & Dimensions)
  | ({ shape?: never; preset?: GlassPreset; radius?: never } & Dimensions)
  | ({
      shape: "rectangle" | "pill" | "ellipse" | "lens";
      preset?: GlassPreset;
      radius?: never;
    } & Dimensions)
  | ({
      shape: "circle" | "square";
      preset?: GlassPreset;
      radius?: never;
    } & RatioDimensions);
export type GlassOwnProps = Omit<
  GlassOptions,
  "shape" | "radius" | "width" | "height" | "preset"
> &
  ShapeProps;

export type GlassTag = "div" | "button" | "a" | "span" | "section" | "article";
export type LiquidGlassProps<T extends GlassTag = "div"> = GlassOwnProps & {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, keyof GlassOwnProps | "as">;
export type LiquidGlassComponent = <T extends GlassTag = "div">(
  props: LiquidGlassProps<T> & { ref?: Ref<HTMLElementTagNameMap[T]> },
) => ReactElement;
export interface GlassCallbacks {
  onReady?: () => void;
  onError?: (error: Error) => void;
  onMetrics?: (metrics: GlassMetrics) => void;
}
export interface GlassHandle {
  update(settings: GlassSettings, callbacks: GlassCallbacks): void;
  dispose(): void;
}
