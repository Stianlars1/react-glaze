import { GlassButton } from "./GlassButton";
import { hasFixedRadius, isRatioShape } from "react-glaze";
import type { GlassShape } from "react-glaze";
import type { Dispatch, SetStateAction } from "react";
import { dimensionModes } from "./config";
import type { StudioDimension, StudioState } from "./config";

function DimensionControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: StudioDimension;
  onChange: (value: StudioDimension) => void;
}) {
  const id = "dimension-" + label.toLowerCase();
  return (
    <div className="dimension-control">
      <div className="select-row">
        <label htmlFor={id}>{label}</label>
        <select
          id={id}
          value={typeof value === "number" ? "fixed" : value}
          onChange={(e) =>
            onChange(
              e.target.value === "fixed"
                ? 240
                : (e.target.value as StudioDimension),
            )
          }
        >
          <option value="fixed">Fixed pixels</option>
          {dimensionModes.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {typeof value === "number" && (
        <label className="slider-row" htmlFor={id + "-value"}>
          <span>{label} value</span>
          <output aria-hidden="true" htmlFor={id + "-value"}>
            {Math.round(value)} px
          </output>
          <input
            id={id + "-value"}
            type="range"
            min={label === "Width" ? 64 : 48}
            max={label === "Height" ? 440 : 860}
            step={2}
            value={value}
            aria-valuetext={`${Math.round(value)} pixels`}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}
export function ShapeControls({
  state,
  setState,
}: {
  state: StudioState;
  setState: Dispatch<SetStateAction<StudioState>>;
}) {
  const shape = state.settings.shape,
    ratio = isRatioShape(shape);
  const setShape = (value: GlassShape | "custom") =>
    setState((s) => {
      const shape = value === "custom" ? "rounded" : value;
      const size = Math.max(
        64,
        Math.min(
          typeof s.width === "number" ? s.width : 240,
          typeof s.height === "number" ? s.height : 240,
        ),
      );
      return {
        ...s,
        customShape: value === "custom",
        referenceLayout: false,
        ...(isRatioShape(shape) ? { width: size, height: size } : {}),
        settings: {
          ...s.settings,
          shape,
          radius:
            value === "custom" && hasFixedRadius(s.settings.shape)
              ? s.settings.shape === "rectangle" ||
                s.settings.shape === "square"
                ? 0
                : Math.min(size / 2, 240)
              : s.settings.radius,
        },
      };
    });
  return (
    <>
      <div className="select-row">
        <label htmlFor="shape">Shape</label>
        <select
          id="shape"
          value={state.customShape ? "custom" : shape}
          onChange={(e) => setShape(e.target.value as GlassShape | "custom")}
        >
          <option value="rounded">Rounded</option>
          <option value="rectangle">Rectangle</option>
          <option value="pill">Pill</option>
          <option value="circle">Circle</option>
          <option value="square">Square</option>
          <option value="ellipse">Ellipse</option>
          <option value="lens">Optical lens</option>
          <option value="custom">Custom corners</option>
        </select>
      </div>
      <DimensionControl
        label="Width"
        value={state.width}
        onChange={(width) =>
          setState((s) => ({
            ...s,
            width,
            ...(ratio ? { height: width } : {}),
            referenceLayout: false,
          }))
        }
      />
      {!ratio && (
        <DimensionControl
          label="Height"
          value={state.height}
          onChange={(height) =>
            setState((s) => ({ ...s, height, referenceLayout: false }))
          }
        />
      )}
      {ratio && (
        <p className="control-note">
          Uses a 1:1 aspect ratio. Your own CSS can override it.
        </p>
      )}
      {hasFixedRadius(shape) ? (
        <p className="control-note">
          This shape sets its corner radius.{" "}
          <GlassButton
            type="button"
            className="text-button"
            onClick={() => setShape("custom")}
          >
            Customize corners
          </GlassButton>
        </p>
      ) : (
        <label className="slider-row" htmlFor="setting-corner-radius">
          <span>Corner radius</span>
          <output aria-hidden="true" htmlFor="setting-corner-radius">
            {state.settings.radius} px
          </output>
          <input
            id="setting-corner-radius"
            type="range"
            min={0}
            max={240}
            step={1}
            value={state.settings.radius}
            aria-valuetext={`${state.settings.radius} pixels`}
            onChange={(e) => {
              const radius = Number(e.target.value);
              setState((s) => ({
                ...s,
                customShape: true,
                settings: { ...s.settings, radius },
              }));
            }}
          />
        </label>
      )}
    </>
  );
}
