"use client";
import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  LiquidGlassActions,
  LiquidGlassMenu,
  type GlassAction,
  type GlassActionLayout,
  type GlassDirection,
  type GlassMenuHandle,
  type GlassPlaybackState,
} from "react-glaze";
import { materialScenes } from "@/lib/material-scenes";
import { CodeExample } from "./CodeExample";
import { ActionIcon, actionIconPaths } from "./icons";
import { MotionPlayback, type MotionPlaybackHandle } from "./MotionPlayback";

const initial = {
  count: 5,
  layout: "fan" as GlassActionLayout,
  direction: "right" as GlassDirection,
  size: 44,
  distance: -80,
  connection: 12,
  duration: 500,
  bounce: 0.5,
  refraction: 0.4,
  labels: false,
};
const choices = [
  { id: "save", label: "Save" },
  { id: "favorite", label: "Favorite" },
  { id: "copy", label: "Copy link" },
  { id: "reset", label: "Reset" },
  { id: "info", label: "Details" },
  { id: "disabled", label: "Unavailable" },
];
function Duration({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const text = draft ?? String(value),
      next = Number(text);
    const safe =
      text.trim() && Number.isFinite(next)
        ? Math.max(100, Math.min(3000, Math.round(next)))
        : value;
    setDraft(null);
    onChange(safe);
  };
  return (
    <label className="components-control-row">
      Duration{" "}
      <span>
        <input
          aria-label="Duration in milliseconds"
          type="number"
          min="100"
          max="3000"
          step="1"
          value={draft ?? value}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />{" "}
        ms
      </span>
    </label>
  );
}
export function MenuPlayground({
  kind,
  active,
}: {
  kind: "actions" | "menu";
  active: boolean;
}) {
  const [config, setConfig] = useState(initial);
  const view = `${active}:${kind}`;
  const [previousView, setPreviousView] = useState(view);
  const [open, setOpen] = useState(false),
    [scene, setScene] = useState(0),
    [saved, setSaved] = useState(false),
    [favorite, setFavorite] = useState(false);
  const [message, setMessage] = useState("Open the glass to choose an action."),
    [error, setError] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const menu = useRef<GlassMenuHandle>(null);
  const playback = useRef<MotionPlaybackHandle>(null);
  const externalControls = useRef<HTMLDivElement>(null);
  if (view !== previousView) {
    setPreviousView(view);
    setOpen(false);
  }
  const patch = (value: Partial<typeof initial>) =>
    setConfig((c) => ({ ...c, ...value }));
  const reset = () => {
    setConfig(initial);
    setOpen(false);
    setError("");
  };
  const items = useMemo<GlassAction[]>(
    () =>
      choices.slice(0, config.count).map((item) => ({
        ...item,
        icon: <ActionIcon name={item.id} />,
        disabled: item.id === "disabled",
        onSelect: () => {
          if (item.id === "save") {
            setSaved((v) => !v);
            setMessage(
              saved ? "Bookmark removed." : "Bookmarked for this session.",
            );
          } else if (item.id === "favorite") {
            setFavorite((v) => !v);
            setMessage(
              favorite ? "Removed from favorites." : "Added to favorites.",
            );
          } else if (item.id === "copy") {
            void navigator.clipboard.writeText(location.href).then(
              () => setMessage("Link copied."),
              () => setMessage("Copy the address bar to share this page."),
            );
          } else if (item.id === "reset") {
            setConfig(initial);
            setMessage("Back to the starting point.");
          } else
            setMessage(
              "These are native buttons. Their behavior belongs to your app.",
            );
        },
      })),
    [config.count, saved, favorite],
  );
  const directions: GlassDirection[] =
    config.layout === "row"
      ? ["left", "right"]
      : config.layout === "column"
        ? ["top", "bottom"]
        : ["left", "top", "right", "bottom"];
  const component =
    kind === "actions" ? "LiquidGlassActions" : "LiquidGlassMenu";
  const code = `'use client';\n\nimport { ${component} } from "react-glaze";\n\nexport function PhotoActions() {\n  return (\n    <${component}\n      label="Photo actions"\n      items={[\n${choices
    .slice(0, config.count)
    .map(
      (item) =>
        `        { id: "${item.id}", label: "${item.label}", icon: <Icon path="${actionIconPaths[item.id]}" />,${item.id === "disabled" ? " disabled: true," : ""} onSelect: () => console.log("${item.id}") },`,
    )
    .join(
      "\n",
    )}\n      ]}${kind === "actions" ? `\n      layout="${config.layout}"\n      direction="${config.direction}"\n      actionSize={${config.size}}\n      distance={${config.distance}}\n      connection={${config.connection}}` : `\n      direction="${config.direction}"`}\n      appearance="${config.labels ? "labels" : "icons"}"\n      motion={{ duration: ${config.duration}, bounce: ${config.bounce} }}\n      refraction={${config.refraction}}\n    />\n  );\n}\n\nfunction Icon({ path }: { path: string }) {\n  return <svg width="22" height="22" viewBox="0 0 24 24"\n    fill="none" stroke="currentColor" strokeWidth="1.7"\n    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">\n    <path d={path} />\n  </svg>;\n}`;
  const common = {
    label: "Photo actions",
    items,
    open,
    onOpenChange: setOpen,
    appearance: config.labels ? ("labels" as const) : ("icons" as const),
    motion: { duration: config.duration, bounce: config.bounce },
    refraction: config.refraction,
    direction: config.direction,
    onError: (e: Error) => setError(e.message),
    onReady: () => setError(""),
    ref: menu,
    externalControls,
    onPlaybackUpdate: (state: GlassPlaybackState) =>
      playback.current?.update(state),
  };
  if (!active) return null;

  return (
    <section
      ref={externalControls}
      className="components-playground"
      aria-label="Explore the components"
      onKeyDown={(event) => {
        if (open && !event.defaultPrevented && event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
        }
      }}
    >
      <div className="components-workspace">
        <div className="components-preview">
          <div
            ref={stage}
            className={`components-material-stage ${scene === 3 ? "type-study" : ""}`}
            onPointerDown={(event) => {
              if (
                open &&
                !(event.target instanceof Element && event.target.closest("button"))
              )
                setOpen(false);
            }}
          >
            {scene < 3 ? (
              <Image
                src={materialScenes[scene].src}
                alt=""
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 900px"
                className="components-art"
              />
            ) : (
              <div className="components-type-copy">
                <span>SHAPES OF THINGS</span>
                <strong>
                  Always
                  <br />
                  in motion.
                </strong>
              </div>
            )}
            <span className="components-scene-label">
              {scene === 3
                ? "04 / TYPE STUDY"
                : `0${scene + 1} / ${materialScenes[scene].name.toUpperCase()}`}
            </span>
            <div className="components-menu-anchor">
              {kind === "actions" ? (
                <LiquidGlassActions
                  {...common}
                  boundary={stage}
                  layout={config.layout}
                  actionSize={config.size}
                  distance={config.distance}
                  connection={config.connection}
                />
              ) : (
                <LiquidGlassMenu {...common} boundary={stage} />
              )}
            </div>
          </div>
          <div data-liquid-overlay="">
            <div className="components-preview-caption">
              <p role="status">{message}</p>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
              >
                {open ? "Close" : "Open"}
              </button>
            </div>
            <MotionPlayback ref={playback} controls={menu} />
          </div>
          {error && (
            <p className="components-error" role="alert">
              Native controls are available. Glass could not be drawn: {error}
            </p>
          )}
        </div>
        <aside className="components-controls" aria-label="Component settings">
          <div className="components-controls-heading">
            <h2>Make it yours.</h2>
            <button type="button" onClick={reset}>
              Reset
            </button>
          </div>
          <fieldset>
            <legend>Composition</legend>
            <label className="components-control-row">
              Actions
              <select
                aria-label="Action count"
                value={config.count}
                onChange={(e) => patch({ count: Number(e.target.value) })}
              >
                {choices.map((_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            {kind === "actions" && (
              <label className="components-control-row">
                Layout
                <select
                  aria-label="Action layout"
                  value={config.layout}
                  onChange={(e) => {
                    const layout = e.target.value as GlassActionLayout;
                    patch({
                      layout,
                      direction: layout === "row" ? "right" : "top",
                    });
                  }}
                >
                  <option value="fan">Fan / around</option>
                  <option value="row">Row</option>
                  <option value="column">Column</option>
                </select>
              </label>
            )}
            <label className="components-control-row">
              Direction
              <select
                aria-label="Opening direction"
                value={config.direction}
                onChange={(e) =>
                  patch({ direction: e.target.value as GlassDirection })
                }
              >
                {(kind === "menu"
                  ? ["top", "right", "bottom", "left"]
                  : directions
                ).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {kind === "actions" && (
              <>
                <label className="components-range">
                  <span>
                    Action size <output>{config.size}px</output>
                  </span>
                  <input
                    aria-label="Action size"
                    type="range"
                    min="44"
                    max="100"
                    step="2"
                    value={config.size}
                    onChange={(e) => patch({ size: Number(e.target.value) })}
                  />
                </label>
                <label className="components-range">
                  <span>
                    Trigger distance <output>{config.distance}px</output>
                  </span>
                  <input
                    aria-label="Trigger distance"
                    type="range"
                    min="-160"
                    max="120"
                    step="2"
                    value={config.distance}
                    onChange={(e) =>
                      patch({ distance: Number(e.target.value) })
                    }
                  />
                </label>
                <p className="components-control-note">
                  Negative moves the group closer. Spacing between actions stays
                  the same.
                </p>
              </>
            )}
            <label className="components-control-row">
              Show labels
              <input
                type="checkbox"
                checked={config.labels}
                onChange={(e) => patch({ labels: e.target.checked })}
              />
            </label>
          </fieldset>
          <fieldset>
            <legend>Material and motion</legend>
            <Duration
              value={config.duration}
              onChange={(duration) => patch({ duration })}
            />
            {kind === "actions" && (
              <>
                <label className="components-range">
                  <span>
                    Connection reach <output>{config.connection}px</output>
                  </span>
                  <input
                    aria-label="Connection reach"
                    type="range"
                    min="0"
                    max="48"
                    step="1"
                    value={config.connection}
                    onChange={(e) =>
                      patch({ connection: Number(e.target.value) })
                    }
                  />
                </label>
                <p className="components-control-note">
                  How far nearby glass surfaces reach toward each other.
                </p>
              </>
            )}
            <label className="components-range">
              <span>
                Bounce <output>{Math.round(config.bounce * 100)}%</output>
              </span>
              <input
                aria-label="Bounce"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={config.bounce}
                onChange={(e) => patch({ bounce: Number(e.target.value) })}
              />
            </label>
            <label className="components-range">
              <span>
                Refraction{" "}
                <output>{Math.round(config.refraction * 100)}%</output>
              </span>
              <input
                aria-label="Refraction"
                type="range"
                min="0"
                max="3"
                step=".05"
                value={config.refraction}
                onChange={(e) => patch({ refraction: Number(e.target.value) })}
              />
            </label>
            <p className="components-control-note">
              Duration includes the spring settling. Your system&apos;s
              reduced-motion preference is respected.
            </p>
          </fieldset>
          <fieldset>
            <legend>Behind the glass</legend>
            <div className="components-backdrops">
              {["Soft forms", "Hard light", "Small world", "Typography"].map(
                (label, index) => (
                  <button
                    type="button"
                    key={label}
                    aria-label={label}
                    aria-pressed={scene === index}
                    onClick={() => setScene(index)}
                    style={
                      index < 3
                        ? {
                            backgroundImage: `url(${materialScenes[index].src})`,
                          }
                        : undefined
                    }
                  >
                    {index === 3 ? "Aa" : null}
                  </button>
                ),
              )}
            </div>
          </fieldset>
        </aside>
      </div>
      <CodeExample code={code} />
    </section>
  );
}
