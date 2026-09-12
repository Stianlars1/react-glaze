import { useCallback, useState } from "react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { LiquidGlass } from "react-glaze";
import type { GlassOwnProps } from "react-glaze";
import { useControlMaterial } from "./ControlMaterial";
import { CheckIcon } from "./icons";

const controlMaterial = {
  preset: "quiet",
  contentMode: "sharp",
  lighting: "studio",
  thickness: 0.24,
  depth: 0.16,
  ior: 1.25,
  roughness: 0.04,
  attenuationColor: "#ffffff",
  dispersion: 0,
  envMapIntensity: 0.65,
  shadowOpacity: 0.08,
  maxDpr: 1.5,
  rimLight: { mode: "static", strength: 0.3, width: 0.8 },
} as const satisfies GlassOwnProps;

function useMaterialStatus() {
  const enabled = useControlMaterial();
  const [failed, setFailed] = useState(false);
  const onError = useCallback(() => setFailed(true), []);
  return { enabled: enabled && !failed, onError };
}

export function GlassButton({
  children,
  className = "",
  shape = "pill",
  ...props
}: Omit<ComponentPropsWithRef<"button">, "onError"> & {
  shape?: "pill" | "rounded";
}) {
  const material = useMaterialStatus();
  const pressed = props["aria-pressed"];
  return (
    <LiquidGlass
      {...controlMaterial}
      {...material}
      {...props}
      as="button"
      shape={shape}
      className={`glass-control ${className}`}
      enabled={material.enabled && !props.disabled}
    >
      <span className="glass-control-content">
        {children}
        {pressed !== undefined && (
          <span className="control-selection" aria-hidden="true">
            <CheckIcon />
          </span>
        )}
      </span>
      <span
        className="control-focus-ring"
        data-liquid-overlay=""
        aria-hidden="true"
      />
    </LiquidGlass>
  );
}

export function GlassSummary({ children }: { children: ReactNode }) {
  const material = useMaterialStatus();
  return (
    <LiquidGlass
      {...controlMaterial}
      {...material}
      as="span"
      shape="rounded"
      className="glass-control glass-summary"
    >
      <span className="glass-control-content">{children}</span>
    </LiquidGlass>
  );
}
