import type { CornerRadii } from "./radii.js";
import type { BufferGeometry } from "three";
import type { GlassSettings } from "../types.js";
import { createGeometry } from "./geometry.js";

export const layoutDimension = (value: number) =>
  Math.max(1 / 64, Math.round(value * 64) / 64);

// DOM layout uses fractional coordinates. Translation must not turn floating
// point noise in getBoundingClientRect() into geometry allocations.
export class GeometryCache {
  private entries = new Map<string, BufferGeometry>();
  constructor(private capacity = 16) {}
  get size() {
    return this.entries.size;
  }
  get(
    width: number,
    height: number,
    settings: GlassSettings,
    radii?: CornerRadii,
  ) {
    const w = layoutDimension(width),
      h = layoutDimension(height);
    const key = [
      settings.shape,
      settings.optics,
      w,
      h,
      settings.radius,
      settings.depth,
      ...(radii?.flat().map((value) => Math.round(value * 64) / 64) ?? []),
    ].join(":");
    let geometry = this.entries.get(key);
    if (geometry) this.entries.delete(key);
    else
      geometry = createGeometry(
        Math.max(1 / 64, w),
        Math.max(1 / 64, h),
        settings,
        radii,
      );
    this.entries.set(key, geometry);
    if (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value!;
      this.entries.get(oldest)!.dispose();
      this.entries.delete(oldest);
    }
    return geometry;
  }
  dispose() {
    for (const geometry of this.entries.values()) geometry.dispose();
    this.entries.clear();
  }
}
