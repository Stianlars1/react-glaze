"use client";
import { createElement, useEffect, useRef } from "react";
import type { RefObject } from "react";
import { rimLightStyle } from "./rim-light.js";
import type { RimLightSettings } from "./types.js";

type RimLightHandle = ReturnType<
  (typeof import("./engine/rim-light.js"))["mountRimLight"]
>;

export function RimLight({ host, settings, onError }: {
  host: RefObject<HTMLElement | null>;
  settings: RimLightSettings;
  onError?: (error: Error) => void;
}) {
  const layer = useRef<HTMLSpanElement | null>(null);
  const handle = useRef<RimLightHandle | null>(null);
  const latest = useRef({ settings, onError });
  latest.current = { settings, onError };

  useEffect(() => {
    if (settings.mode !== "pointer") return;
    let cancelled = false;
    let instance: RimLightHandle | undefined;
    import("./engine/rim-light.js")
      .then(({ mountRimLight }) => {
        if (cancelled || latest.current.settings.mode !== "pointer" || !host.current || !layer.current) return;
        instance = mountRimLight(host.current, layer.current, latest.current.settings);
        handle.current = instance;
      })
      .catch((error) => {
        if (!cancelled)
          latest.current.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    return () => {
      cancelled = true;
      instance?.dispose();
      if (handle.current === instance) handle.current = null;
    };
  }, [host, settings.mode]);

  useEffect(() => {
    handle.current?.update(settings);
  }, [settings]);

  return createElement("span", {
    ref: layer,
    "aria-hidden": true,
    "data-liquid-overlay": "",
    "data-liquid-rim": "",
    style: rimLightStyle(settings),
  });
}
