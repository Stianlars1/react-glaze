/* eslint-disable @next/next/no-img-element -- Preview uploaded and local background sources directly. */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandMark";
import { LiquidGlass, PRESETS } from "react-glaze";
import type { GlassMetrics } from "react-glaze";
import {
  backgrounds,
  componentCode,
  componentProps,
  getExampleStyle,
  shareableState,
} from "./config";
import { Controls } from "./Controls";
import { SavedConfiguration } from "./SavedConfiguration";
import { readPlaygroundState } from "./saved-config";
import { useGlassDrag } from "./useGlassDrag";
import { CopyIcon } from "./icons";

import { OpticalBackdrop } from "./OpticalBackdrop";
import { BackgroundPicker } from "./BackgroundPicker";
import { useCustomBackground } from "./useCustomBackground";
import type { StudioState } from "./config";
import type { GlassPreset } from "react-glaze";

export function App() {
  const [state, setState] = useState(readPlaygroundState),
    [clicks, setClicks] = useState(0),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [codeTab, setCodeTab] = useState<"jsx" | "json">("jsx"),
    [copied, setCopied] = useState(false);
  const {
    stage: stageRef,
    host: glassRef,
    position,
    dragging,
    reset: resetPosition,
    moveTo,
    bindings,
  } = useGlassDrag(state.example);
  const custom = useCustomBackground();
  const backgroundRevision = useRef(0);
  const chooseBackground = (background: StudioState["background"]) => {
    backgroundRevision.current++;
    setState((s) => ({ ...s, background }));
  };
  const choosePreset = (preset: GlassPreset) =>
    setState((s) => ({
      ...s,
      preset,
      settings: {
        ...PRESETS[preset],
        enabled: s.settings.enabled,
        shape: s.settings.shape,
        radius: s.settings.radius,
      },
    }));
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
  }, [stageRef, moveTo]);
  const matchReference = () => {
    backgroundRevision.current++;
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
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("config", JSON.stringify(shareableState(state)));
    history.replaceState(null, "", url);
  }, [state]);
  const code =
    codeTab === "jsx"
      ? componentCode(state)
      : JSON.stringify(
          {
            component: componentProps(state),
            playground: {
              background: shareableState(state).background,
              motion: state.motion,
              example: state.example,
            },
          },
          null,
          2,
        );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      setCopied(copied);
    }
  };
  const shuffle = () => {
    backgroundRevision.current++;
    const choices = backgrounds.filter((b) => b.id !== state.background);
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    setState((s) => ({
      ...s,
      background: choices[value[0] % choices.length].id,
    }));
  };
  return (
    <div className="playground-shell">
      <header className="app-header">
        <h1>
          <Link href="/" aria-label="React Glaze home">
            <BrandMark className="brand-mark" />
            React Glaze
          </Link>
        </h1>
        <nav aria-label="Main navigation">
          <a href="#playground" aria-current="page">
            Playground
          </a>
          <Link href="/showcase">Showcase</Link>
        </nav>
        <span className="alpha">Alpha preview</span>
      </header>
      <main id="playground" className="workspace">
        <div className="main-column">
          <section className="preview-panel" aria-label="Live preview">
            <div className="preview-toolbar">
              <div className="segmented" role="group" aria-label="Glass effect">
                <button
                  aria-pressed={state.settings.enabled}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, enabled: true },
                    }))
                  }
                >
                  With glass
                </button>
                <button
                  aria-pressed={!state.settings.enabled}
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      settings: { ...s.settings, enabled: false },
                    }))
                  }
                >
                  Without glass
                </button>
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
                <img
                  className="wallpaper"
                  src={
                    state.background === "custom"
                      ? custom.image?.src
                      : background?.src
                  }
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
                as={state.example === "button" ? "button" : "div"}
                {...componentProps(state)}
                style={{
                  ...getExampleStyle(state.background),
                  transform: `translate(${position.x}px, ${position.y}px)`,
                }}
                onReady={onReady}
                onError={onError}
                onMetrics={onMetrics}
                onClick={
                  state.example === "button"
                    ? () => setClicks((n) => n + 1)
                    : undefined
                }
                aria-label={
                  state.example === "button" ? "Explore the glass" : undefined
                }
              >
                {state.example === "button" ? (
                  "Explore the glass"
                ) : state.example === "card" ? (
                  <div>
                    <strong style={{ fontSize: 28 }}>A new perspective</strong>
                    <p style={{ fontSize: 16 }}>
                      Your own HTML, seen through glass.
                    </p>
                  </div>
                ) : state.example === "type" ? (
                  <span
                    style={{ fontSize: 72, lineHeight: 0.9, fontWeight: 700 }}
                  >
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
              <p id="drag-hint">Drag the glass · Alt + arrow keys</p>
              <button
                onClick={resetPosition}
                disabled={position.x === 0 && position.y === 0}
              >
                Center
              </button>
            </div>
            <div className="reference-toolbar">
              <button onClick={matchReference}>Match Optical Type</button>
              <span>
                Original artwork, lens proportions and optical preset.
              </span>
            </div>
            <BackgroundPicker
              selected={state.background}
              custom={custom.image}
              loading={custom.loading}
              error={custom.error}
              onSelect={chooseBackground}
              onUpload={async (file) => {
                const selection = ++backgroundRevision.current;
                if (
                  (await custom.load(file)) &&
                  selection === backgroundRevision.current
                )
                  setState((s) => ({ ...s, background: "custom" }));
              }}
              onRemove={() => {
                backgroundRevision.current++;
                custom.remove();
                setState((s) => ({
                  ...s,
                  background:
                    s.background === "custom" ? "spectrum" : s.background,
                }));
              }}
              onShuffle={shuffle}
            />
            <div className="preview-status">
              <span role="status">
                {error
                  ? "Could not render glass. Reload to try again."
                  : !state.settings.enabled
                    ? "Glass off · Same background and content."
                    : ready
                      ? "Glass on · Automatic background."
                      : "Preparing glass…"}
              </span>
              <span aria-live="polite">
                {state.example === "button"
                  ? `Clicks: ${clicks}`
                  : "Native HTML content"}
              </span>
            </div>
          </section>
          <SavedConfiguration state={state} onLoad={(next) => {
            backgroundRevision.current++;
            setState(next);
          }} />
          <section
            className="code-panel"
            aria-label="Code for this configuration"
          >
            <div className="code-header">
              <h2>Code</h2>
              <div className="code-tabs" role="group" aria-label="Code format">
                <button
                  aria-pressed={codeTab === "jsx"}
                  onClick={() => setCodeTab("jsx")}
                >
                  JSX
                </button>
                <button
                  aria-pressed={codeTab === "json"}
                  onClick={() => setCodeTab("json")}
                >
                  JSON
                </button>
              </div>
              <button className="copy" onClick={copy}>
                <CopyIcon />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre>
              <code>{code}</code>
            </pre>
            <p className="code-note">
              The background is regular page HTML.{" "}
              Package: <code>react-glaze</code>.
            </p>
          </section>
          <footer className="workspace-footer">
            <a href="/research.html" target="_blank" rel="noopener">
              Research notes
            </a>
            <a href="/quality.html" target="_blank" rel="noopener">
              Edge smoothing: before/after
            </a>
            <span>Original AI-generated wallpapers.</span>
            <a
              href="https://support.apple.com/guide/mac-help/mchlp3013/mac"
              target="_blank"
              rel="noopener"
            >
              About macOS wallpapers
            </a>
          </footer>
        </div>
        <Controls state={state} setState={setState} onPreset={choosePreset} />
      </main>
    </div>
  );
}
