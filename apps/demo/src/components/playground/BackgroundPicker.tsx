import { GlassDetails } from "./GlassDetails";
import { GlassButton } from "./GlassButton";
/* eslint-disable @next/next/no-img-element -- Uploaded thumbnails use browser-local image sources. */
import { useRef } from "react";
import { backgrounds } from "./config";
import type { BackgroundId } from "./config";
import type { CustomBackground } from "./useCustomBackground";
import { materialScenes } from "@/lib/material-scenes";
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
      <div className="scene-options" role="group" aria-label="Choose a scene">
        {materialScenes.map((scene, index) => (
          <GlassButton
            key={scene.id}
            aria-pressed={selected === scene.id}
            onClick={() => onSelect(scene.id)}
          >
            <span className="scene-number" aria-hidden="true">
              0{index + 1}
            </span>
            {scene.name}
          </GlassButton>
        ))}
      </div>
      <GlassDetails
        className="scene-tools"
        title="More backgrounds"
        description="4 scenes + your image"
      >
        <div className="wallpaper-tray">
          <div
            className="wallpaper-options"
            role="group"
            aria-label="Choose a background"
          >
            {backgrounds
              .filter((b) => !materialScenes.some((scene) => scene.id === b.id))
              .map((b) => (
                <GlassButton
                  key={b.id}
                  className="wallpaper-option"
                  shape="rounded"
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
                </GlassButton>
              ))}
            {custom && (
              <GlassButton
                className="wallpaper-option"
                shape="rounded"
                aria-pressed={selected === "custom"}
                title={custom.name}
                onClick={() => onSelect("custom")}
              >
                <img src={custom.src} alt="" />
                <span>Your image</span>
              </GlassButton>
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
            <GlassButton
              onClick={() => input.current?.click()}
              disabled={loading}
            >
              {loading
                ? "Reading image…"
                : custom
                  ? "Replace image"
                  : "Upload image"}
            </GlassButton>
            <GlassButton className="shuffle" onClick={onShuffle}>
              Shuffle
            </GlassButton>
          </div>
        </div>
        <div className="background-note">
          <span>
            Custom images stay in this tab and are not included in shared URLs.
          </span>
          {custom && <GlassButton onClick={onRemove}>Remove image</GlassButton>}
        </div>
      </GlassDetails>
      {error && (
        <p className="background-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
