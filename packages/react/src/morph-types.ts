import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ReactElement,
  ReactNode,
  Ref,
  RefObject,
} from "react";
import type {
  GlassMaterial,
  GlassPreset,
  GlassSettings,
  GlassTag,
} from "./types.js";

/** Coordinates are CSS pixels; x and y are the surface center in its group. */
export interface GlassSurface {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}
export interface GlassMotionOptions {
  /** Total animation time, including settling, in milliseconds (100-3000). */
  duration?: number;
  /** Overshoot, from 0 (none) to 1. */
  bounce?: number;
}
export type GlassGroupMaterial = Partial<
  GlassMaterial &
    Pick<
      GlassSettings,
      | "enabled"
      | "optics"
      | "lighting"
      | "depth"
      | "exposure"
      | "shadowOpacity"
      | "maxDpr"
    >
> & { preset?: GlassPreset };
export interface GlassMorphFrame {
  surfaces: readonly GlassSurface[];
  elapsed: number;
  active: boolean;
}
export interface GlassPlaybackState {
  time: number;
  duration: number;
  paused: boolean;
  playing: boolean;
  available: boolean;
}
export interface GlassPlaybackControls {
  pause(): void;
  play(): void;
  seek(timeMs: number): void;
  replay(): void;
}
export interface GlassGroupHandle extends GlassPlaybackControls {
  readonly element: HTMLDivElement | null;
  refresh(): void;
  pulse(id: string, kind: "compress" | "expand"): void;
}
export interface GlassMenuHandle extends GlassPlaybackControls {
  readonly element: HTMLDivElement | null;
}
export interface GlassGroupOptions {
  material?: GlassGroupMaterial;
  motion?: GlassMotionOptions;
  /** Smoothing distance between surfaces, in CSS pixels (0-48). */
  connection?: number;
  /** Multiplier of the material's thickness, from 0 to 3. */
  refraction?: number;
  /** Force reduced motion. The system preference is always respected. */
  reducedMotion?: boolean;
  /** Optional explicit backdrop root. Defaults to a containing opaque ancestor. */
  backdrop?: RefObject<HTMLElement | null>;
  onReady?: () => void;
  onError?: (error: Error) => void;
  onPlaybackUpdate?: (state: GlassPlaybackState) => void;
}
export type LiquidGlassGroupProps = GlassGroupOptions &
  Omit<
    ComponentPropsWithoutRef<"div">,
    keyof GlassGroupOptions | "children"
  > & {
    width: number;
    height: number;
    surfaces: readonly GlassSurface[];
    initialSurfaces?: readonly GlassSurface[];
    children?: ReactNode;
    onFrame?: (frame: GlassMorphFrame) => void;
    onMotionComplete?: () => void;
    ref?: Ref<GlassGroupHandle>;
  };
export type LiquidGlassSurfaceProps<T extends GlassTag = "div"> = {
  as?: T;
  surfaceId: string;
  children?: ReactNode;
  /** Keep content at its final size while the contour moves around it. */
  contentScale?: "follow" | "fixed";
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children">;
export type LiquidGlassSurfaceComponent = <T extends GlassTag = "div">(
  props: LiquidGlassSurfaceProps<T> & { ref?: Ref<HTMLElementTagNameMap[T]> },
) => ReactElement;

export interface GlassAction {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Optional custom visible content; label still supplies the accessible name. */
  content?: ReactNode;
  disabled?: boolean;
  onSelect?: () => void;
}
export type GlassDirection = "left" | "top" | "right" | "bottom";
export type GlassActionLayout = "row" | "column" | "fan";
export interface GlassMenuBaseProps extends GlassGroupOptions {
  /** Accessible name for the trigger. */
  label: string;
  trigger?: ReactNode;
  /** Up to six actions. Empty lists disable the trigger. */
  items: readonly GlassAction[];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Trigger diameter in CSS pixels, from 44 to 100. */
  triggerSize?: number;
  appearance?: "icons" | "labels";
  className?: string;
  style?: CSSProperties;
  triggerClassName?: string;
  itemClassName?: string;
  disabled?: boolean;
  /** Associate a bounded element containing controls that operate this menu. */
  externalControls?: RefObject<HTMLElement | null>;
  /** Optional collision boundary. Defaults to the visual viewport. */
  boundary?: RefObject<HTMLElement | null>;
  ref?: Ref<GlassMenuHandle>;
}
export interface LiquidGlassActionsProps extends GlassMenuBaseProps {
  layout?: GlassActionLayout;
  direction?: GlassDirection;
  /** Rigid group offset from recommended placement, in CSS pixels (-160 to 120). */
  distance?: number;
  /** Action diameter/height in CSS pixels (44-100); labels may widen it. */
  actionSize?: number;
}
export interface LiquidGlassMenuProps extends GlassMenuBaseProps {
  direction?: GlassDirection;
}
