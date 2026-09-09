import { ShapeControls } from "./ShapeControls";
import { RimLightControls } from "./RimLightControls";
import { Slider } from "./Slider";
import { initialState } from "./config";
import type { GlassSettings, GlassPreset } from "react-glaze";
import type { StudioState } from "./config";

interface Props {
  state: StudioState;
  onPreset: (preset: GlassPreset) => void;
  setState: React.Dispatch<React.SetStateAction<StudioState>>;
}
export function Controls({ state, setState, onPreset }: Props) {
  const set = <K extends keyof GlassSettings>(
    key: K,
    value: GlassSettings[K],
  ) => setState((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  const slider = (
    label: string,
    key: keyof GlassSettings,
    min: number,
    max: number,
    step: number,
    unit = "",
  ) => (
    <Slider
      key={key}
      label={label}
      value={state.settings[key] as number}
      min={min}
      max={max}
      step={step}
      unit={unit}
      onChange={(value) => set(key, value)}
    />
  );
  return (
    <aside className="inspector" aria-label="Settings">
      <div className="inspector-title">
        <h2>Settings</h2>
        <span className="small-label">LIVE</span>
      </div>
      <div className="preset-control">
        <label htmlFor="preset">Material preset</label>
        <div>
          <select
            id="preset"
            value={state.preset}
            onChange={(e) => onPreset(e.target.value as GlassPreset)}
          >
            <option value="reference">Studio glass</option>
            <option value="optical-type">Optical Type · Drawn To</option>
            <option value="optical-flow">Optical Type · responsive</option>
            <option value="quiet">Quiet</option>
            <option value="frosted">Frosted</option>
          </select>
          <button
            onClick={() => setState(initialState)}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="control-section">
        <div className="select-row">
          <label htmlFor="lighting">Reflections</label>
          <select
            id="lighting"
            value={state.settings.lighting}
            onChange={(e) =>
              set("lighting", e.target.value as GlassSettings["lighting"])
            }
          >
            <option value="studio">Original studio</option>
            <option value="responsive">Responsive</option>
          </select>
        </div>

        <ShapeControls state={state} setState={setState} />
        {slider("Thickness", "thickness", 0, 3, 0.01)}
        {slider("Refraction (IOR)", "ior", 1, 2.2, 0.01)}
        <label className="color-row" htmlFor="tint">
          <span>Tint</span>
          <span>
            <input
              id="tint"
              type="color"
              value={state.settings.attenuationColor}
              onChange={(e) => set("attenuationColor", e.target.value)}
            />
            <output>{state.settings.attenuationColor.toUpperCase()}</output>
          </span>
        </label>
      </div>
      <RimLightControls state={state} setState={setState} />
      <details className="control-details">
        <summary>Content and interaction</summary>
        <div className="control-section">
          <div className="select-row">
            <label htmlFor="example">Example</label>
            <select
              id="example"
              value={state.example}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  example: e.target.value as StudioState["example"],
                }))
              }
            >
              <option value="button">Button</option>
              <option value="card">Mixed HTML</option>
              <option value="type">Typography</option>
              <option value="empty">Empty surface</option>
            </select>
          </div>
          <div className="select-row">
            <label htmlFor="content-mode">Content mode</label>
            <select
              id="content-mode"
              value={state.settings.contentMode}
              onChange={(e) =>
                set(
                  "contentMode",
                  e.target.value as GlassSettings["contentMode"],
                )
              }
            >
              <option value="sharp">Sharp foreground</option>
              <option value="refracted">Refracted content</option>
            </select>
          </div>
          <p className="control-note">
            All examples use the same component. Refracted content is
            experimental; hit areas still follow the original DOM layout.
          </p>
        </div>
      </details>
      <details className="control-details">
        <summary>Advanced material</summary>
        <div className="control-section">
          <div className="select-row">
            <label htmlFor="optics">Refraction model</label>
            <select
              id="optics"
              value={state.settings.optics}
              onChange={(e) =>
                set("optics", e.target.value as GlassSettings["optics"])
              }
            >
              <option value="smooth">Smooth · filtered</option>
              <option value="reference">Original · Optical Type</option>
            </select>
          </div>
          {slider("Roughness", "roughness", 0, 0.6, 0.005)}
          {slider("Transmission", "transmission", 0, 1, 0.01)}
          {slider("Dispersion", "dispersion", 0, 0.2, 0.001)}
          {slider("Geometry depth", "depth", 0.04, 1, 0.01)}
          {slider("Clearcoat", "clearcoat", 0, 1, 0.01)}
          {slider("Clearcoat roughness", "clearcoatRoughness", 0, 1, 0.01)}
          {slider("Attenuation distance", "attenuationDistance", 0.1, 50, 0.1)}
          {slider("Environment intensity", "envMapIntensity", 0, 3, 0.05)}
          {slider("Exposure", "exposure", 0.25, 2, 0.05)}
          {slider("Shadow opacity", "shadowOpacity", 0, 0.5, 0.01)}
          {slider("Max DPR", "maxDpr", 0.5, 2, 0.25)}
          <label className="color-row" htmlFor="glass-color">
            <span>Glass color</span>
            <input
              id="glass-color"
              type="color"
              value={state.settings.color}
              onChange={(e) => set("color", e.target.value)}
            />
          </label>
          <p className="control-note">
            Optical Type includes the original lens, material and volume-ray
            model. Shape, proportions and background also affect the appearance.
          </p>
        </div>
      </details>
    </aside>
  );
}
