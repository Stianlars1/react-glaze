"use client";

import { useState, useSyncExternalStore } from "react";
import type { GlassMetrics } from "react-glaze";

const samples: Record<string, GlassMetrics> = {};
const errors: string[] = [];
const callbacks = new Map<string, (metrics: GlassMetrics) => void>();
export function recordGlassMetrics(name: string) {
  if (!callbacks.has(name))
    callbacks.set(name, (metrics) => {
      samples[name] = metrics;
    });
  return callbacks.get(name)!;
}
export function recordGlassError(error: Error) {
  errors.push(error.message);
  console.error("LiquidGlass:", error);
}
const subscribe = () => () => {};

export function GlassDebug() {
  const enabled = useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(location.search).has("debug"),
    () => false,
  );
  const [snapshot, setSnapshot] = useState("");
  if (!enabled) return null;
  return (
    <details className="glass-debug" data-liquid-overlay="">
      <summary>Local glass diagnostics</summary>
      <button
        className="small-button"
        onClick={() =>
          setSnapshot(JSON.stringify({ samples, errors }, null, 2))
        }
      >
        Read current counters
      </button>
      <p>
        Snapshot wall time is not GPU time or display FPS. Counters are sampled
        by the package, not polled.
      </p>
      <pre>{snapshot || "No diagnostic snapshot requested."}</pre>
    </details>
  );
}
