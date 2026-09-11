import { ControlMaterial } from "./ControlMaterial";
import { CopyButton } from "./CopyButton";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandIcon } from "@/components/brand/BrandIcon";
import { PRESETS } from "react-glaze";
import type { GlassPreset } from "react-glaze";
import { backgrounds, initialState, shareableState } from "./config";
import type { StudioState } from "./config";
import { Controls } from "./Controls";
import { SavedConfiguration } from "./SavedConfiguration";
import { readPlaygroundState } from "./saved-config";
import { BackgroundPicker } from "./BackgroundPicker";
import { useCustomBackground } from "./useCustomBackground";
import { useCopyFeedback } from "./useCopyFeedback";
import { GlassPreview } from "./GlassPreview";
import { CodePanel } from "./CodePanel";

export function App() {
  const [state, setState] = useState(readPlaygroundState);
  const [previewRevision, setPreviewRevision] = useState(0);
  const custom = useCustomBackground();
  const linkCopy = useCopyFeedback();
  const backgroundRevision = useRef(0);
  const chooseBackground = (background: StudioState["background"]) => {
    backgroundRevision.current++;
    setState((s) => ({ ...s, background, referenceLayout: false }));
  };
  const replaceState = (next: StudioState) => {
    backgroundRevision.current++;
    setState(next);
    setPreviewRevision((value) => value + 1);
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
        ...(s.example === "landing-pill"
          ? { lighting: s.settings.lighting }
          : {}),
      },
    }));
  const shareUrl = new URL(location.href);
  shareUrl.searchParams.set("config", JSON.stringify(shareableState(state)));
  const shareHref = shareUrl.href;
  useEffect(() => {
    history.replaceState(null, "", shareHref);
  }, [shareHref]);
  const shuffle = () => {
    const choices = backgrounds.filter((b) => b.id !== state.background);
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    chooseBackground(choices[value[0] % choices.length].id);
  };
  return (
    <ControlMaterial>
      <div className="playground-shell">
        <a className="skip-link" href="#playground">
          Skip to playground
        </a>
        <header className="app-header">
          <Link
            className="playground-brand"
            href="/"
            aria-label="React Glaze home"
          >
            <BrandIcon />
            React Glaze
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">Home</Link>
            <a href="#playground" aria-current="page">
              Playground
            </a>
            <Link href="/showcase">Showcase</Link>
          </nav>
        </header>
        <main id="playground" className="workspace" tabIndex={-1}>
          <div className="workspace-intro">
            <div>
              <h1>A different feeling. Your own.</h1>
              <p>Choose a scene. Shape the glass. Take it with you.</p>
            </div>
            <div className="workspace-actions">
              <a href="#code">Get the code</a>
              <CopyButton
                label="Copy link"
                copied={
                  linkCopy.status === "copied" && linkCopy.value === shareHref
                }
                onClick={() => void linkCopy.copy(shareHref)}
              />
              <span
                className="link-feedback"
                role="status"
                data-empty={linkCopy.status === "idle"}
              >
                <span key={linkCopy.revision}>
                  {linkCopy.status === "failed"
                    ? "Could not copy. Copy the URL from the address bar."
                    : linkCopy.status === "copied"
                      ? "Share link copied."
                      : ""}
                </span>
              </span>
            </div>
          </div>
          <div className="editor-layout">
            <GlassPreview
              key={previewRevision}
              state={state}
              setState={setState}
              custom={custom.image}
              onPreset={choosePreset}
              onReference={() => {
                backgroundRevision.current++;
              }}
            >
              <BackgroundPicker
                selected={state.background}
                custom={custom.image}
                loading={custom.loading}
                error={custom.error}
                onSelect={chooseBackground}
                onShuffle={shuffle}
                onUpload={async (file) => {
                  const selection = ++backgroundRevision.current;
                  if (
                    (await custom.load(file)) &&
                    selection === backgroundRevision.current
                  )
                    setState((s) => ({
                      ...s,
                      background: "custom",
                      referenceLayout: false,
                    }));
                }}
                onRemove={() => {
                  backgroundRevision.current++;
                  custom.remove();
                  setState((s) => ({
                    ...s,
                    background:
                      s.background === "custom" ? "soft" : s.background,
                  }));
                }}
              />
            </GlassPreview>
            <Controls
              state={state}
              setState={setState}
              onPreset={choosePreset}
              onReset={() => replaceState(initialState)}
            />
          </div>
          <div className="workspace-output">
            <CodePanel state={state} />
            <SavedConfiguration state={state} onLoad={replaceState} />
          </div>
        </main>
        <footer className="workspace-footer">
          <span>
            An open-source project by{" "}
            <a href="https://stianlarsen.com/">Stian Larsen</a>.
          </span>
          <div>
            <a href="/research.html" target="_blank" rel="noopener">
              Research notes
            </a>
            <a href="/quality.html" target="_blank" rel="noopener">
              Before / after
            </a>
            <a href="https://github.com/Stianlars1/react-glaze#readme">
              Documentation
            </a>
          </div>
        </footer>
      </div>
    </ControlMaterial>
  );
}
