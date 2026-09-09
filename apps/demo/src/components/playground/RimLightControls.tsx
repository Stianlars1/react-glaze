import { RIM_LIGHT_DEFAULTS, normalizeRimLight } from "react-glaze";
import type { RimLightSettings } from "react-glaze";
import type { Dispatch, SetStateAction } from "react";
import type { StudioState } from "./config";
import { Slider } from "./Slider";

export function RimLightControls({
  state,
  setState,
}: {
  state: StudioState;
  setState: Dispatch<SetStateAction<StudioState>>;
}) {
  const set = (patch: Partial<RimLightSettings> | false) =>
    setState((current) => ({
      ...current,
      rimLight:
        patch === false
          ? false
          : (normalizeRimLight({
              ...(current.rimLight || RIM_LIGHT_DEFAULTS),
              ...patch,
            }) ?? false),
    }));

  return (
    <div className="control-section">
      <div className="select-row">
        <label htmlFor="rim-light">Rim light</label>
        <select
          id="rim-light"
          value={state.rimLight ? state.rimLight.mode : "off"}
          onChange={(event) =>
            set(
              event.target.value === "off"
                ? false
                : { mode: event.target.value as RimLightSettings["mode"] },
            )
          }
        >
          <option value="off">Current · no rim</option>
          <option value="static">Fixed rim</option>
          <option value="pointer">Pointer rim</option>
        </select>
      </div>
      {state.rimLight && (
        <>
          {state.rimLight.mode === "pointer" && (
            <div className="select-row">
              <label htmlFor="rim-on-leave">When pointer leaves</label>
              <select
                id="rim-on-leave"
                value={state.rimLight.onLeave}
                onChange={(event) => set({ onLeave: event.target.value as RimLightSettings["onLeave"] })}
              >
                <option value="return">Return to upper left</option>
                <option value="hold">Keep last position</option>
              </select>
            </div>
          )}
          <Slider
            label="Rim strength"
            value={state.rimLight.strength}
            min={0}
            max={1}
            step={0.05}
            onChange={(strength) => set({ strength })}
          />
          <Slider
            label="Rim width"
            value={state.rimLight.width}
            min={0.5}
            max={4}
            step={0.1}
            unit=" px"
            onChange={(width) => set({ width })}
          />
          <Slider
            label="Nearby reach"
            value={state.rimLight.reach}
            min={0}
            max={220}
            step={10}
            unit=" px"
            onChange={(reach) => set({ reach })}
          />
          <Slider
            label="Response"
            value={state.rimLight.response}
            min={0.06}
            max={0.3}
            step={0.02}
            unit=" s"
            onChange={(response) => set({ response })}
          />
        </>
      )}
      <p className="control-note">
        White edge light, separate from studio reflections. Pointer mode follows
        nearby mouse movement; touch and reduced motion keep a fixed upper-left
        light.
      </p>
    </div>
  );
}
