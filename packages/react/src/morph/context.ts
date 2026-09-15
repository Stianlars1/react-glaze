import { createContext } from "react";
import type { Surface } from "./model.js";
export interface SurfaceRegistration {
  node: HTMLElement;
  content: HTMLSpanElement;
  contentScale: "follow" | "fixed";
  width: number;
  height: number;
}
export interface MorphContextValue {
  initial: ReadonlyMap<string, Surface>;
  targets: ReadonlyMap<string, Surface>;
  register(id: string, registration: SurfaceRegistration): () => void;
}
export const MorphContext = createContext<MorphContextValue | null>(null);
