import { BoxGeometry } from "three";
import type { GlassSettings } from "../types.js";
import type { CornerRadii } from "./radii.js";
import { sweepBevel } from "./sweep.js";
import type { ContourPoint } from "./sweep.js";

export function createCornerGeometry(
  width: number,
  height: number,
  settings: GlassSettings,
  radii: CornerRadii,
  worldWidth: number,
) {
  const unit = worldWidth / width,
    worldHeight = height * unit;
  // Keep inward parallel curves inside the ellipse's minimum curvature radius.
  const curvature = radii.flatMap(([x, y]) =>
    x > 0 && y > 0 ? [Math.min((x * x) / y, (y * y) / x) * unit] : [],
  );
  const boundedBevel = curvature.length
    ? Math.min(
        ...curvature.map((r) => r * 0.45),
        Math.min(worldWidth, worldHeight) * 0.18,
        settings.depth * 0.6,
      )
    : 0;
  if (!(boundedBevel > 0))
    return new BoxGeometry(worldWidth, worldHeight, settings.depth * 0.8);
  const contour: ContourPoint[] = [];
  const add = (point: ContourPoint) => {
    const previous = contour.at(-1);
    if (
      !previous ||
      Math.hypot(
        point.x - previous.x,
        point.y - previous.y,
        point.nx - previous.nx,
        point.ny - previous.ny,
      ) > 1e-8
    )
      contour.push(point);
  };
  for (let corner = 0; corner < 4; corner++) {
    const [cssX, cssY] = radii[[1, 0, 3, 2][corner]],
      rx = cssX * unit,
      ry = cssY * unit;
    const sx = corner === 0 || corner === 3 ? 1 : -1,
      sy = corner < 2 ? 1 : -1;
    const cx = sx * (worldWidth / 2 - rx),
      cy = sy * (worldHeight / 2 - ry),
      angle = (corner * Math.PI) / 2;
    const largest = Math.max(cssX, cssY);
    const steps =
      largest === 0
        ? 1
        : Math.max(
            16,
            Math.min(
              256,
              Math.ceil(
                Math.PI / (4 * Math.acos(1 - 0.1 / Math.max(0.1, largest))),
              ),
            ),
          );
    for (let i = 0; i <= steps; i++) {
      const a = angle + ((i / steps) * Math.PI) / 2,
        cos = Math.cos(a),
        sin = Math.sin(a);
      const length = rx && ry ? Math.hypot(cos / rx, sin / ry) : 1;
      const nx = rx && ry ? cos / rx / length : cos,
        ny = rx && ry ? sin / ry / length : sin;
      const offsetX = rx && ry ? nx : sx,
        offsetY = rx && ry ? ny : sy;
      // A square corner uses the intersection of the two inward edge offsets.
      // Keep separate face normals at that miter without reversing its contour.
      add({
        x: cx + rx * cos - offsetX * boundedBevel,
        y: cy + ry * sin - offsetY * boundedBevel,
        nx,
        ny,
        offsetX,
        offsetY,
      });
    }
  }
  const first = contour[0],
    last = contour.at(-1)!;
  if (
    Math.hypot(
      first.x - last.x,
      first.y - last.y,
      first.nx - last.nx,
      first.ny - last.ny,
    ) < 1e-8
  )
    contour.pop();
  const bevelSteps = Math.max(
    16,
    Math.min(48, Math.ceil((Math.PI * boundedBevel) / unit / 12)),
  );
  return sweepBevel(contour, boundedBevel, settings.depth, bevelSteps);
}
