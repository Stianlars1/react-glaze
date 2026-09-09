import { sweepBevel } from "./sweep.js";
import { createCornerGeometry } from "./corner-geometry.js";
import { uniformRadius } from "./radii.js";
import type { CornerRadii } from "./radii.js";
import { BoxGeometry, SphereGeometry } from "three";
import type { GlassSettings } from "../types.js";
export const WORLD_WIDTH = 1.42 * 1.08 * 2;

// Sweep an elliptical bevel around a true rounded rectangle. Analytic normals
// keep the flat face tangent to the bevel, independent of cap triangulation.
export function createGeometry(
  width: number,
  height: number,
  s: GlassSettings,
  radii?: CornerRadii,
) {
  if (s.shape === "lens") {
    const g = new SphereGeometry(1.42, 128, 80);
    if (s.optics !== "reference")
      g.scale(1.08, (1.08 * height) / width, s.depth);
    return g;
  }
  if (radii) {
    const radius = uniformRadius(radii);
    if (radius === undefined)
      return createCornerGeometry(width, height, s, radii, WORLD_WIDTH);
    s = { ...s, radius };
  }
  const w = WORLD_WIDTH,
    h = (w * height) / width;
  const radius = Math.min((s.radius * w) / width, w / 2, h / 2);
  const bevel = Math.min(radius * 0.45, Math.min(w, h) * 0.18, s.depth * 0.6);
  if (bevel <= 0) return new BoxGeometry(w, h, s.depth * 0.8);
  const halfW = w / 2 - bevel,
    halfH = h / 2 - bevel,
    r = radius - bevel;
  const contour: { x: number; y: number; nx: number; ny: number }[] = [];
  const cssRadius = (radius * width) / w;
  // Keep the outer silhouette within 0.1 CSS px of its circular contour.
  // Ordinary controls retain 16 steps; large curves get detail where needed.
  const cornerSteps = Math.max(
    16,
    Math.min(
      64,
      Math.ceil(Math.PI / (4 * Math.acos(1 - 0.1 / Math.max(0.1, cssRadius)))),
    ),
  );
  const bevelSteps = Math.max(
    16,
    Math.min(48, Math.ceil((Math.PI * bevel * width) / w / 12)),
  );
  // Counter-clockwise corner arcs, including both tangent endpoints. The
  // straight edges need no extra vertices because their normals are constant.
  for (let corner = 0; corner < 4; corner++) {
    const angle = (corner * Math.PI) / 2,
      cx = (corner === 0 || corner === 3 ? 1 : -1) * (halfW - r),
      cy = (corner < 2 ? 1 : -1) * (halfH - r);
    for (let i = 0; i <= cornerSteps; i++) {
      const a = angle + ((i / cornerSteps) * Math.PI) / 2,
        nx = Math.cos(a),
        ny = Math.sin(a);
      const p = { x: cx + r * nx, y: cy + r * ny, nx, ny };
      const prev = contour.at(-1);
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 1e-8)
        contour.push(p);
    }
  }
  if (
    Math.hypot(
      contour[0].x - contour.at(-1)!.x,
      contour[0].y - contour.at(-1)!.y,
    ) < 1e-8
  )
    contour.pop();
  return sweepBevel(contour, bevel, s.depth, bevelSteps);
}
