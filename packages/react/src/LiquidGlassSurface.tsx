"use client";
import {
  createElement,
  forwardRef,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type { LiquidGlassSurfaceComponent } from "./morph-types.js";
import type { GlassTag } from "./types.js";
import { MorphContext } from "./morph/context.js";

type Props = HTMLAttributes<HTMLElement> & {
  as?: GlassTag;
  surfaceId: string;
  children?: ReactNode;
  contentScale?: "follow" | "fixed";
};
export const LiquidGlassSurface = forwardRef<HTMLElement, Props>(
  function LiquidGlassSurface(
    {
      as = "div",
      surfaceId,
      children,
      contentScale = "follow",
      style,
      inert,
      ...props
    },
    forwardedRef,
  ) {
    const context = useContext(MorphContext);
    if (!context)
      throw new Error("LiquidGlassSurface must be inside LiquidGlassGroup.");
    const host = useRef<HTMLElement | null>(null),
      content = useRef<HTMLSpanElement | null>(null);
    const target = context.targets.get(surfaceId);
    const start = useRef(context.initial.get(surfaceId) ?? target);
    const initial = start.current;
    useLayoutEffect(() => {
      if (!host.current || !content.current) return;
      return context.register(surfaceId, {
        node: host.current,
        content: content.current,
        contentScale,
        width: target?.w || initial?.w || 1,
        height: target?.h || initial?.h || 1,
      });
    }, [context, surfaceId, contentScale, as]);
    return createElement(
      as,
      {
        ...(as === "button" ? { type: "button" } : {}),
        ...props,
        ref: (node: HTMLElement | null) => {
          host.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        },
        "data-glaze-surface": surfaceId,
        inert: inert || !target || target.w <= 0 || target.h <= 0,
        style: {
          ...style,
          position: "absolute",
          width: initial?.w ?? 0,
          height: initial?.h ?? 0,
          transform: `translate(${(initial?.x ?? 0) - (initial?.w ?? 0) / 2}px,${(initial?.y ?? 0) - (initial?.h ?? 0) / 2}px)`,
          borderRadius: initial?.r ?? 0,
          opacity: initial && initial.w > 0 && initial.h > 0 ? 1 : 0,
        },
      },
      createElement(
        "span",
        { ref: content, "data-glaze-content": "" },
        children,
      ),
    );
  },
) as LiquidGlassSurfaceComponent;
