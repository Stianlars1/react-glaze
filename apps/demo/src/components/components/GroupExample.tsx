"use client";
import { useEffect, useRef, useState } from "react";
import {
  LiquidGlassGroup,
  LiquidGlassSurface,
  type GlassGroupHandle,
  type GlassSurface,
} from "react-glaze";

export function GroupExample() {
  const stage = useRef<HTMLDivElement>(null),
    group = useRef<GlassGroupHandle>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [width, setWidth] = useState(320),
    [expanded, setExpanded] = useState(false);
  const [backdrop, setBackdrop] = useState(false),
    [word, setWord] = useState(false);
  const [mounted, setMounted] = useState(true),
    [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState("Ready to compose."),
    [error, setError] = useState("");
  useEffect(() => {
    if (!stage.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(200, Math.min(680, entry.contentRect.width))),
    );
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => () => clearTimeout(recoveryTimer.current), []);
  const testRecovery = () => {
    const canvas = group.current?.element?.querySelector("canvas");
    if (!canvas) {
      setStatus("Bring the group into view before testing graphics recovery.");
      return;
    }
    const context = canvas?.getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context");
    if (!extension) {
      setStatus("This browser does not expose the graphics recovery check.");
      return;
    }
    clearTimeout(recoveryTimer.current);
    extension.loseContext();
    setStatus("Testing native fallback and graphics recovery.");
    recoveryTimer.current = setTimeout(() => {
      if (canvas?.isConnected) {
        extension.restoreContext();
        setStatus("Graphics recovery requested.");
      }
    }, 900);
  };
  const x = width / 2;
  const surfaces: GlassSurface[] = [
    { id: "origin", x, y: 250, width: 72, height: 72 },
    {
      id: "first",
      x: expanded ? x - 74 : x,
      y: expanded ? 180 : 250,
      width: expanded ? 56 : 0,
      height: expanded ? 56 : 0,
    },
    {
      id: "second",
      x,
      y: expanded ? 144 : 250,
      width: expanded ? 56 : 0,
      height: expanded ? 56 : 0,
    },
    {
      id: "third",
      x: expanded ? x + 74 : x,
      y: expanded ? 180 : 250,
      width: expanded ? 56 : 0,
      height: expanded ? 56 : 0,
    },
  ];
  return (
    <section
      className="components-core-example"
      aria-labelledby="group-heading"
    >
      <div className="components-section-copy">
        <p className="components-eyebrow">COMPOSE YOUR OWN</p>
        <h2 id="group-heading">The material is yours.</h2>
        <p>
          Give each surface an identity and a destination. Your content stays
          native, and the group handles the shared glass and motion.
        </p>
      </div>
      <div
        ref={stage}
        className={`components-core-stage ${backdrop ? "alternate" : ""}`}
      >
        <div className="components-core-copy">
          <span>YOUR CONTENT, YOUR INTERACTION</span>
          <strong>{word ? "Stay curious." : "Make a move."}</strong>
        </div>
        {mounted && (
          <LiquidGlassGroup
            ref={group}
            width={width}
            height={360}
            surfaces={surfaces}
            material={{ enabled }}
            refraction={1.5}
            onReady={() => setError("")}
            onError={(e) => setError(e.message)}
          >
            <LiquidGlassSurface
              surfaceId="origin"
              as="button"
              aria-label="Toggle composed group"
              aria-expanded={expanded}
              onClick={() => {
                group.current?.pulse(
                  "origin",
                  expanded ? "expand" : "compress",
                );
                setExpanded(!expanded);
              }}
            >
              <span aria-hidden="true">{expanded ? "×" : "+"}</span>
            </LiquidGlassSurface>
            {["first", "second", "third"].map((id, i) => (
              <LiquidGlassSurface
                key={id}
                surfaceId={id}
                as="button"
                aria-label={`Choose surface ${i + 1}`}
                disabled={!expanded}
                onClick={() => setStatus(`Surface ${i + 1} selected.`)}
              >
                {i + 1}
              </LiquidGlassSurface>
            ))}
          </LiquidGlassGroup>
        )}
      </div>
      <div className="components-example-tools">
        <button type="button" onClick={() => setBackdrop((v) => !v)}>
          Change backdrop
        </button>
        <button type="button" onClick={() => setWord((v) => !v)}>
          Change text
        </button>
        <button type="button" onClick={() => setEnabled((v) => !v)}>
          {enabled ? "Show fallback" : "Show glass"}
        </button>
        <button type="button" onClick={() => setMounted((v) => !v)}>
          {mounted ? "Remove group" : "Mount group"}
        </button>
      </div>
      <p className="components-example-status" role="status">
        {status}
      </p>
      <details className="components-runtime">
        <summary>Native fallback and recovery</summary>
        <p>
          The controls remain usable when graphics are unavailable. This check
          briefly releases the graphics context, then asks the browser to
          restore it.
        </p>
        <button
          type="button"
          disabled={!mounted || !enabled}
          onClick={testRecovery}
        >
          Test graphics recovery
        </button>
      </details>
      {error && (
        <p className="components-error" role="alert">
          The native controls are available. Glass could not be drawn: {error}
        </p>
      )}
    </section>
  );
}
