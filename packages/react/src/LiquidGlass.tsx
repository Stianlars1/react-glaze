"use client";
import {
  createElement,
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { REFERENCE, resolveSettings } from "./presets.js";
import { normalizeRimLight } from "./rim-light.js";
import { RimLight } from "./RimLight.js";
import type {
  GlassOptions,
  GlassTag,
  GlassHandle,
  GlassCallbacks,
  LiquidGlassComponent,
} from "./types.js";

import { isRatioShape, shapeStyles } from "./shapes.js";

const ownKeys = [
  ...Object.keys(REFERENCE),
  "preset",
  "rimLight",
  "width",
  "height",
  "onReady",
  "onError",
  "onMetrics",
  "as",
  "children",
];
type InternalProps = GlassOptions &
  HTMLAttributes<HTMLElement> & { as?: GlassTag; children?: ReactNode };
export const LiquidGlass = forwardRef<HTMLElement, InternalProps>(
  function LiquidGlass(props, forwardedRef) {
    const {
      as = "div",
      width,
      height,
      children,
      style,
      onReady,
      onError,
      onMetrics,
      rimLight,
    } = props;
    const host = useRef<HTMLElement | null>(null),
      canvas = useRef<HTMLCanvasElement | null>(null),
      handle = useRef<GlassHandle | null>(null);
    const settingsKey = JSON.stringify(resolveSettings(props));
    const settings = useMemo(() => resolveSettings(props), [settingsKey]);
    const rimKey = JSON.stringify(normalizeRimLight(rimLight));
    const rimSettings = useMemo(() => normalizeRimLight(rimLight), [rimKey]);
    const latest = useRef({
      settings,
      callbacks: { onReady, onError, onMetrics } as GlassCallbacks,
    });
    latest.current = { settings, callbacks: { onReady, onError, onMetrics } };
    const setHost = useCallback(
      (node: HTMLElement | null) => {
        host.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );
    useEffect(() => {
      let cancelled = false;
      let instance: GlassHandle | undefined;
      import("./engine/index.js")
        .then(({ mountGlass }) => {
          if (cancelled || !host.current || !canvas.current) return;
          instance = mountGlass(
            host.current,
            canvas.current,
            latest.current.settings,
            latest.current.callbacks,
          );
          handle.current = instance;
        })
        .catch((error) => {
          if (!cancelled)
            latest.current.callbacks.onError?.(
              error instanceof Error ? error : new Error(String(error)),
            );
        });
      return () => {
        cancelled = true;
        instance?.dispose();
        if (handle.current === instance) handle.current = null;
      };
    }, [as]);
    useEffect(() => {
      handle.current?.update(settings, { onReady, onError, onMetrics });
    }, [settings, onReady, onError, onMetrics]);
    const domProps = { ...props } as Record<string, unknown>;
    for (const key of ownKeys) delete domProps[key];
    const hostStyle: CSSProperties & { "--liquid-radius": string } = {
      "--liquid-radius": `${settings.radius}px`,
      width,
      height:
        isRatioShape(settings.shape) && width !== undefined
          ? undefined
          : height,
      ...style,
      isolation: "isolate",
    };
    const element = createElement(
      as,
      {
        ...(as === "button" ? { type: "button" } : {}),
        ...domProps,
        ref: setHost,
        style: hostStyle,
        "data-liquid-host": "",
        "data-liquid-shape": settings.shape,
        "data-liquid-mode": settings.contentMode,
        "data-liquid-enabled": String(settings.enabled),
      },
      createElement("canvas", {
        ref: canvas,
        "data-liquid-layer": "",
        "aria-hidden": true,
        style: {
          position: "absolute",
          inset: -24,
          width: "calc(100% + 48px)",
          height: "calc(100% + 48px)",
          maxWidth: "none",
          pointerEvents: "none",
          zIndex: settings.contentMode === "sharp" ? -1 : 1,
          display: settings.enabled ? "block" : "none",
        },
      }),
      children,
      settings.enabled && rimSettings
        ? createElement(RimLight, { host, settings: rimSettings, onError })
        : null,
    );
    return createElement(
      Fragment,
      null,
      createElement(
        "style",
        { href: "liquid-glass-shapes-v1", precedence: "liquid-glass" },
        shapeStyles,
      ),
      element,
    );
  },
) as LiquidGlassComponent;
