/* eslint-disable @next/next/no-img-element -- Uploaded thumbnails use browser-local image sources. */
import { useRef } from "react";
import { backgrounds } from "./config";
import type { BackgroundId } from "./config";
import type { CustomBackground } from "./useCustomBackground";
import { ShuffleIcon } from "./icons";
interface Props {
  selected: BackgroundId;
  custom: CustomBackground | null;
  loading: boolean;
  error: string;
  onSelect: (id: BackgroundId) => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onShuffle: () => void;
}
export function BackgroundPicker({
  selected,
  custom,
  loading,
  error,
  onSelect,
  onUpload,
  onRemove,
  onShuffle,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="wallpaper-tray">
        <div
          className="wallpaper-options"
          role="group"
          aria-label="Choose a background"
        >
          {backgrounds.map((b) => (
            <button
              key={b.id}
              className="wallpaper-option"
              aria-pressed={selected === b.id}
              title={b.description}
              onClick={() => onSelect(b.id)}
            >
              {b.id === "optical-type" ? (
                <span className="optical-thumbnail" aria-hidden="true">
                  LOOK
                  <br />
                  AGAIN.
                </span>
              ) : (
                <img src={b.src} alt="" />
              )}
              <span>{b.name}</span>
            </button>
          ))}
          {custom && (
            <button
              className="wallpaper-option"
              aria-pressed={selected === "custom"}
              title={custom.name}
              onClick={() => onSelect("custom")}
            >
              <img src={custom.src} alt="" />
              <span>Your image</span>
            </button>
          )}
        </div>
        <div className="background-actions">
          <input
            ref={input}
            className="visually-hidden"
            tabIndex={-1}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            aria-label="Choose a custom background image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onUpload(file);
            }}
          />
          <button onClick={() => input.current?.click()} disabled={loading}>
            {loading
              ? "Reading image…"
              : custom
                ? "Replace image"
                : "Upload image"}
          </button>
          <button className="shuffle" onClick={onShuffle}>
            <ShuffleIcon />
            Shuffle
          </button>
        </div>
      </div>
      <div className="background-note">
        <span>
          Custom images stay in this tab and are not included in shared URLs.
        </span>
        {custom && <button onClick={onRemove}>Remove image</button>}
      </div>
      {error && (
        <p className="background-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
