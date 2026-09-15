"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from "react";
import type {
  GlassPlaybackControls,
  GlassPlaybackState,
} from "react-glaze";

export interface MotionPlaybackHandle {
  update(state: GlassPlaybackState): void;
}

const unavailable: GlassPlaybackState = {
  time: 0,
  duration: 0,
  paused: false,
  playing: false,
  available: false,
};

export const MotionPlayback = forwardRef<
  MotionPlaybackHandle,
  { controls: RefObject<GlassPlaybackControls | null> }
>(function MotionPlayback({ controls }, ref) {
  const [displayed, setDisplayed] = useState(unavailable);
  const latest = useRef(unavailable);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commit = (state: GlassPlaybackState) => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    setDisplayed(state);
  };

  useImperativeHandle(ref, () => ({
    update(state) {
      const previous = latest.current;
      latest.current = state;
      const immediate =
        state.paused ||
        state.available !== previous.available ||
        state.paused !== previous.paused ||
        state.playing !== previous.playing ||
        state.time === 0 ||
        state.time === state.duration;
      if (immediate) commit(state);
      else if (timer.current === undefined)
        timer.current = setTimeout(() => commit(latest.current), 75);
    },
  }), []);

  useEffect(() => () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
  }, []);

  const current = Math.round(displayed.time);
  const duration = Math.round(displayed.duration);
  const status = !displayed.available
    ? "Open the menu to inspect its animation."
    : displayed.playing
      ? "Playing the captured transition."
      : displayed.paused
        ? "Paused for inspection."
        : current >= duration
          ? "Transition complete."
          : "Ready to play.";

  return (
    <details
      className="components-playback"
      onToggle={(event) => {
        if (!event.currentTarget.open) controls.current?.play();
      }}
    >
      <summary>Animation playback</summary>
      <div className="components-playback-body">
        <div className="components-playback-actions">
          <button
            type="button"
            disabled={!displayed.available}
            onClick={() =>
              displayed.playing
                ? controls.current?.pause()
                : controls.current?.play()
            }
          >
            {displayed.playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            disabled={!displayed.available}
            onClick={() => controls.current?.replay()}
          >
            Replay
          </button>
        </div>
        <label className="components-range">
          <span>
            Animation timeline
            <output>{current} ms / {duration} ms</output>
          </span>
          <input
            type="range"
            aria-label="Animation timeline"
            min="0"
            max={Math.max(0, duration)}
            step="1"
            value={Math.min(current, duration)}
            disabled={!displayed.available}
            onChange={(event) => controls.current?.seek(Number(event.target.value))}
          />
        </label>
        <p className="components-playback-status" role="status">{status}</p>
      </div>
    </details>
  );
});
