import { BufferGeometry, Float32BufferAttribute } from "three";
export interface ContourPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
  offsetX?: number;
  offsetY?: number;
}
export function sweepBevel(
  contour: ContourPoint[],
  bevel: number,
  depth: number,
  bevelSteps: number,
) {
  const positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  const add = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
  ) => {
    positions.push(x, y, z);
    normals.push(nx, ny, nz);
  };
  const rings: { offset: number; z: number; radial: number; nz: number }[] = [];
  const thickness = depth * 0.32;
  for (const sign of [1, -1])
    for (let k = 0; k <= bevelSteps; k++) {
      const a =
        (((sign === 1 ? k : bevelSteps - k) / bevelSteps) * Math.PI) / 2;
      const radial = thickness * Math.sin(a),
        nz = bevel * Math.cos(a),
        length = Math.hypot(radial, nz);
      rings.push({
        offset: bevel * Math.sin(a),
        z: sign * (depth * 0.4 + thickness * Math.cos(a)),
        radial: radial / length,
        nz: (sign * nz) / length,
      });
    }
  const n = contour.length;
  const hasEdge = (i: number) => {
    const a = contour[i],
      b = contour[(i + 1) % n];
    return Math.hypot(a.x - b.x, a.y - b.y) > 1e-8;
  };
  for (const ring of rings)
    for (const p of contour)
      add(
        p.x + (p.offsetX ?? p.nx) * ring.offset,
        p.y + (p.offsetY ?? p.ny) * ring.offset,
        ring.z,
        p.nx * ring.radial,
        p.ny * ring.radial,
        ring.nz,
      );
  for (let row = 0; row < rings.length - 1; row++)
    for (let i = 0; i < n; i++) {
      if (!hasEdge(i)) continue;
      const a = row * n + i,
        b = row * n + ((i + 1) % n),
        c = a + n,
        d = b + n;
      indices.push(a, c, b, b, c, d);
    }
  const top = positions.length / 3;
  add(0, 0, rings[0].z, 0, 0, 1);
  const bottom = positions.length / 3;
  add(0, 0, rings.at(-1)!.z, 0, 0, -1);
  for (let i = 0; i < n; i++) {
    if (!hasEdge(i)) continue;
    indices.push(top, i, (i + 1) % n);
    const offset = (rings.length - 1) * n;
    indices.push(bottom, offset + ((i + 1) % n), offset + i);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  g.setIndex(indices);
  return g;
}
