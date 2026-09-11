import { createContext, useContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

const solidControlQuery =
  "(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)";
const ControlMaterialContext = createContext(true);
const subscribe = (notify: () => void) => {
  const media = matchMedia(solidControlQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const getSnapshot = () => !matchMedia(solidControlQuery).matches;
const getServerSnapshot = () => false;

export function ControlMaterial({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return (
    <ControlMaterialContext value={enabled}>{children}</ControlMaterialContext>
  );
}

export const useControlMaterial = () => useContext(ControlMaterialContext);
