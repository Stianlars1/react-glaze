"use client";
import {
  createElement,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LiquidGlassGroupProps } from "./morph-types.js";
import type {
  MorphController,
  MorphControllerOptions,
} from "./morph/controller.js";
import {
  groupDimension,
  groupMaterial,
  motionOptions,
  normalizeSurfaces,
  publicSurface,
} from "./morph/config.js";
import { MorphContext, type SurfaceRegistration } from "./morph/context.js";
import { morphStyles } from "./morph/styles.js";
import { clamp, type Surface } from "./morph/model.js";

export function LiquidGlassGroup(props: LiquidGlassGroupProps) {
  const {
    width: requestedWidth,
    height: requestedHeight,
    surfaces,
    initialSurfaces,
    children,
    material,
    motion,
    connection = 12,
    refraction = 1,
    reducedMotion = false,
    backdrop,
    onReady,
    onError,
    onFrame,
    onMotionComplete,
    onPlaybackUpdate,
    ref,
    style,
    onPointerMove,
    ...domProps
  } = props;
  const width = groupDimension(requestedWidth, "width"),
    height = groupDimension(requestedHeight, "height");
  const surfaceKey = JSON.stringify(surfaces);
  const targets = useMemo(() => normalizeSurfaces(surfaces), [surfaceKey]);
  const first = useRef<Surface[] | null>(null);
  if (!first.current)
    first.current = normalizeSurfaces(initialSurfaces ?? surfaces);
  const initial = useRef(new Map(first.current.map((s) => [s.id, s])));
  const host = useRef<HTMLDivElement>(null),
    layer = useRef<HTMLDivElement>(null);
  const controller = useRef<MorphController | null>(null);
  const registry = useRef(new Map<string, SurfaceRegistration>());
  const current = useRef<readonly Surface[]>(first.current);
  const pending = useRef(new Map<string, "compress" | "expand">());
  const firstConfiguration = useRef(true);
  const [systemReduced, setSystemReduced] = useState(false);
  const latest = useRef(props);
  latest.current = props;
  const targetMap = useMemo(
    () => new Map(targets.map((s) => [s.id, s])),
    [targets],
  );
  const targetsRef = useRef(targetMap);
  targetsRef.current = targetMap;
  const paint = (frame: readonly Surface[]) => {
    current.current = frame;
    const poses = new Map(frame.map((s) => [s.id, s]));
    for (const [id, registration] of registry.current) {
      const s = poses.get(id),
        target = targetsRef.current.get(id);
      const { node, content } = registration;
      if (!s || s.w <= 0.001 || s.h <= 0.001) {
        node.style.opacity = "0";
        node.style.pointerEvents = "none";
        continue;
      }
      if (target && target.w > 0 && target.h > 0) {
        registration.width = target.w;
        registration.height = target.h;
      }
      const w = Math.max(1, registration.width),
        h = Math.max(1, registration.height);
      const sx = Math.max(0.001, s.w / w),
        sy = Math.max(0.001, s.h / h);
      node.style.width = `${w}px`;
      node.style.height = `${h}px`;
      node.style.transform = `translate(${s.x - w / 2}px,${s.y - h / 2}px) scale(${sx},${sy})`;
      node.style.borderRadius = `${s.r / sx}px / ${s.r / sy}px`;
      node.style.opacity = String(clamp((Math.min(sx, sy) - 0.2) / 0.65));
      node.style.pointerEvents =
        target && target.w > 0 && target.h > 0 ? "auto" : "none";
      content.style.transform =
        registration.contentScale === "fixed"
          ? `scale(${1 / sx},${1 / sy})`
          : "none";
    }
  };
  const paintFallback = (frame: readonly Surface[]) => {
    paint(frame);
    latest.current.onFrame?.({
      surfaces: frame.map(publicSurface),
      elapsed: 0,
      active: false,
    });
  };
  const context = useMemo(
    () => ({
      initial: initial.current,
      targets: targetMap,
      register(id: string, registration: SurfaceRegistration) {
        if (registry.current.has(id))
          throw new Error(
            `Only one LiquidGlassSurface may register '${id}' in a group.`,
          );
        registry.current.set(id, registration);
        paint(current.current);
        return () => {
          if (registry.current.get(id) === registration)
            registry.current.delete(id);
        };
      },
    }),
    [targetMap],
  );
  const options: MorphControllerOptions = {
    width,
    height,
    surfaces: targets,
    material: groupMaterial(material),
    motion: motionOptions(motion),
    connection: Number.isFinite(connection) ? clamp(connection, 0, 48) : 12,
    refraction: Number.isFinite(refraction) ? clamp(refraction, 0, 3) : 1,
    reduced: reducedMotion || systemReduced,
    backdrop: () => latest.current.backdrop?.current,
  };
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const configKey = JSON.stringify({ ...options, backdrop: undefined });
  const layoutKey = JSON.stringify([
    style,
    domProps.className,
    domProps.id,
    domProps.hidden,
  ]);
  useImperativeHandle(
    ref,
    () => ({
      get element() {
        return host.current;
      },
      refresh() {
        controller.current?.refresh();
      },
      pulse(id, kind) {
        if (controller.current) controller.current.pulse(id, kind);
        else pending.current.set(id, kind);
      },
      pause() {
        controller.current?.pause();
      },
      play() {
        controller.current?.play();
      },
      seek(timeMs) {
        controller.current?.seek(timeMs);
      },
      replay() {
        controller.current?.replay();
      },
    }),
    [],
  );
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const changed = () => setSystemReduced(media.matches);
    changed();
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    let cancelled = false;
    let instance: MorphController | undefined;
    import("./morph/controller.js")
      .then(({ MorphController }) => {
        if (cancelled || !host.current || !layer.current) return;
        const settings = {
          ...optionsRef.current,
          reduced:
            optionsRef.current.reduced ||
            matchMedia("(prefers-reduced-motion: reduce)").matches,
        };
        instance = new MorphController(
          host.current,
          layer.current,
          settings,
          {
            paint,
            onFrame: (frame) => latest.current.onFrame?.(frame),
            onReady: () => latest.current.onReady?.(),
            onError: (error) => latest.current.onError?.(error),
            onMotionComplete: () => latest.current.onMotionComplete?.(),
            onPlaybackUpdate: (state) =>
              latest.current.onPlaybackUpdate?.(state),
          },
          [...current.current],
        );
        controller.current = instance;
        for (const [id, kind] of pending.current) instance.pulse(id, kind);
        pending.current.clear();
      })
      .catch((error) => {
        if (cancelled) return;
        if (host.current) host.current.dataset.glazeReady = "false";
        paintFallback(normalizeSurfaces(latest.current.surfaces));
        latest.current.onError?.(
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    return () => {
      cancelled = true;
      instance?.dispose();
      if (controller.current === instance) controller.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    if (controller.current) {
      controller.current.update(optionsRef.current);
      paint(current.current);
    } else if (!firstConfiguration.current)
      paintFallback(optionsRef.current.surfaces);
    firstConfiguration.current = false;
  }, [configKey, layoutKey, backdrop]);
  return (
    <MorphContext.Provider value={context}>
      {createElement(
        "style",
        { href: "react-glaze-morph-v1", precedence: "react-glaze" },
        morphStyles,
      )}
      <div
        {...domProps}
        ref={host}
        data-glaze-group=""
        data-liquid-overlay=""
        style={{
          ...style,
          position: style?.position ?? "relative",
          isolation: "isolate",
          width,
          height,
        }}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          if (!event.defaultPrevented && event.pointerType !== "touch")
            controller.current?.pointer(event.clientX, event.clientY);
        }}
      >
        <div
          ref={layer}
          data-glaze-canvas-layer=""
          data-liquid-layer=""
          aria-hidden="true"
          style={{ width, height }}
        />
        {children}
      </div>
    </MorphContext.Provider>
  );
}
