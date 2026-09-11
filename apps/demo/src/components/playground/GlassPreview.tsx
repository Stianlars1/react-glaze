import { GlassDetails } from "./GlassDetails";
import { GlassButton } from "./GlassButton";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { LiquidGlass, PRESETS } from "react-glaze";
import type { GlassMetrics, GlassPreset } from "react-glaze";
import { PillLabel } from "../landing/PillLabel";
import { backgrounds, componentProps, getExampleStyle } from "./config";
import type { StudioState } from "./config";
import type { CustomBackground } from "./useCustomBackground";
import { useGlassDrag } from "./useGlassDrag";
import { OpticalBackdrop } from "./OpticalBackdrop";

export function GlassPreview({
  state,
  setState,
  custom,
  onPreset,
  onReference,
  children,
}: {
  state: StudioState;
  setState: Dispatch<SetStateAction<StudioState>>;
  custom: CustomBackground | null;
  onPreset: (preset: GlassPreset) => void;
  onReference: () => void;
  children: ReactNode;
}) {
  const [clicks, setClicks] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loadedImage, setLoadedImage] = useState("");
  const [failedImage, setFailedImage] = useState("");
  const isLandingPill = state.example === "landing-pill";
  const isButton = isLandingPill || state.example === "button";
  const {
    stage: stageRef,
    host: glassRef,
    position,
    dragging,
    reset: resetPosition,
    moveTo,
    bindings,
  } = useGlassDrag(state.example);
  const matchOpticalLayout = useCallback(() => {
    const r = stageRef.current?.getBoundingClientRect();
    if (!r) return;
    const portrait = r.width < r.height,
      width = r.width * ((2 * 1.42 * (portrait ? 1.1 : 1.08)) / 9.7),
      height = width * (portrait ? 1.08 / 1.1 : 0.97 / 1.08);
    setState((s) =>
      Math.abs(Number(s.width) - width) < 0.01 &&
      Math.abs(Number(s.height) - height) < 0.01
        ? s
        : { ...s, width, height },
    );
    moveTo({
      x: 0,
      y: portrait ? r.height * 0.08 : (-r.width * 0.12) / 9.7,
    });
  }, [stageRef, moveTo, setState]);
  const matchReference = () => {
    onReference();
    setState((s) => ({
      ...s,
      preset: "optical-type",
      customShape: false,
      settings: { ...PRESETS["optical-type"], enabled: s.settings.enabled },
      rimLight: false,
      background: "optical-type",
      example: "empty",
      motion: false,
      referenceLayout: true,
    }));
    matchOpticalLayout();
  };
  useEffect(() => {
    if (!state.referenceLayout || !stageRef.current) return;
    const observer = new ResizeObserver(matchOpticalLayout);
    observer.observe(stageRef.current);
    matchOpticalLayout();
    return () => observer.disconnect();
  }, [state.referenceLayout, stageRef, matchOpticalLayout]);
  const metrics = useRef<GlassMetrics | null>(null);
  const onReady = useCallback(() => {
    setReady(true);
    setError("");
  }, []);
  const onError = useCallback((error: Error) => setError(error.message), []);
  const onMetrics = useCallback((value: GlassMetrics) => {
    metrics.current = value;
    (window as Window & { __glassMetrics?: GlassMetrics }).__glassMetrics =
      value;
  }, []);
  const background = backgrounds.find((b) => b.id === state.background);
  const imageSrc =
    (state.background === "custom" ? custom?.src : background?.src) ?? "";
  const imageFailed = imageSrc !== "" && failedImage === imageSrc;
  const imageLoading =
    state.background !== "optical-type" && loadedImage !== imageSrc;
  return (
    <section className="preview-panel" aria-label="Live preview">
      <div className="preview-toolbar">
        <div className="segmented" role="group" aria-label="Glass effect">
          <GlassButton
            aria-pressed={state.settings.enabled}
            onClick={() =>
              setState((s) => ({
                ...s,
                settings: { ...s.settings, enabled: true },
              }))
            }
          >
            With glass
          </GlassButton>
          <GlassButton
            aria-pressed={!state.settings.enabled}
            onClick={() =>
              setState((s) => ({
                ...s,
                settings: { ...s.settings, enabled: false },
              }))
            }
          >
            Without glass
          </GlassButton>
        </div>
        <label className="motion-toggle">
          <input
            type="checkbox"
            checked={state.motion}
            onChange={(e) =>
              setState((s) => ({ ...s, motion: e.target.checked }))
            }
          />
          Animate background
        </label>
      </div>
      <div
        ref={stageRef}
        className="preview"
        data-motion={state.motion}
        data-background={state.background}
      >
        {state.background === "optical-type" ? (
          <OpticalBackdrop />
        ) : (
          <Image
            key={imageSrc}
            fill
            sizes="(max-width: 860px) calc(100vw - 32px), (max-width: 1440px) 65vw, 1100px"
            unoptimized={state.background === "custom"}
            loading="eager"
            className="wallpaper"
            data-motion="decorative"
            onError={() => setFailedImage(imageSrc)}
            onLoad={() => {
              setLoadedImage(imageSrc);
              setFailedImage("");
            }}
            src={imageSrc}
            alt=""
            aria-hidden="true"
          />
        )}
        <LiquidGlass
          ref={glassRef}
          {...bindings}
          data-dragging={dragging}
          tabIndex={0}
          aria-describedby="drag-hint"
          aria-pressed={isLandingPill ? state.preset === "frosted" : undefined}
          as={isButton ? "button" : "div"}
          className={isLandingPill ? "demo-pill" : undefined}
          {...componentProps(state)}
          style={{
            ...getExampleStyle(state.background, state.example, state.height),
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
          onReady={onReady}
          onError={onError}
          onMetrics={onMetrics}
          onClick={
            isButton
              ? () => {
                  setClicks((n) => n + 1);
                  if (isLandingPill)
                    onPreset(
                      state.preset === "frosted" ? "reference" : "frosted",
                    );
                }
              : undefined
          }
          aria-label={
            isLandingPill
              ? "A different feeling. Toggle frosted glass"
              : state.example === "button"
                ? "Explore the glass"
                : "Glass preview"
          }
        >
          {isLandingPill ? (
            <PillLabel />
          ) : state.example === "button" ? (
            "Explore the glass"
          ) : state.example === "card" ? (
            <div>
              <strong style={{ fontSize: 28 }}>A new perspective</strong>
              <p style={{ fontSize: 16 }}>Your own HTML, seen through glass.</p>
            </div>
          ) : state.example === "type" ? (
            <span style={{ fontSize: 72, lineHeight: 0.9, fontWeight: 700 }}>
              LOOK
              <br />
              AGAIN.
            </span>
          ) : null}
          <span
            data-liquid-overlay=""
            aria-hidden="true"
            className="glass-focus-ring"
            style={{
              borderRadius: "inherit",
            }}
          />
        </LiquidGlass>
      </div>
      <div className="drag-toolbar">
        <p id="drag-hint">
          Drag to explore.{isLandingPill ? " Click to frost." : ""}
          <span className="keyboard-hint"> Alt + arrows to move.</span>
        </p>
        <GlassButton
          onClick={resetPosition}
          disabled={position.x === 0 && position.y === 0}
        >
          Center
        </GlassButton>
      </div>
      <div className="preview-status">
        <span role="status">
          {imageFailed
            ? "Image could not load. Choose another scene or reload."
            : error
              ? "Could not render glass. Reload to try again."
              : imageLoading
                ? "Loading scene..."
                : !state.settings.enabled
                  ? "Glass off"
                  : ready
                    ? state.preset === "frosted"
                      ? "Frosted glass"
                      : "Glass ready"
                    : "Preparing glass..."}
        </span>
        <span aria-live="polite">
          {isButton ? `Clicks: ${clicks}` : "Native HTML content"}
        </span>
      </div>
      {children}
      <GlassDetails className="scene-tools" title="Compare with the original">
        {" "}
        <div className="reference-toolbar">
          <GlassButton onClick={matchReference}>Match Optical Type</GlassButton>
          <span>Original artwork, lens proportions and optical preset.</span>
        </div>
      </GlassDetails>
    </section>
  );
}
