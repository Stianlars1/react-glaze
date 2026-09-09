import { resolveCssLength } from "./css-length.js";
export type Radius = readonly [number, number];
// CSS order: top-left, top-right, bottom-right, bottom-left.
export type CornerRadii = readonly [Radius, Radius, Radius, Radius];
const properties = [
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomRightRadius",
  "borderBottomLeftRadius",
] as const;
type RadiusStyle = Pick<CSSStyleDeclaration, (typeof properties)[number]>;

function axes(value: string): string[] {
  let depth = 0,
    start = 0;
  const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === "(") depth++;
    if (value[i] === ")") depth--;
    if (/\s/.test(value[i]) && depth === 0) {
      if (i > start) result.push(value.slice(start, i));
      start = i + 1;
    }
  }
  if (start < value.length) result.push(value.slice(start));
  if (depth !== 0 || result.length < 1 || result.length > 2)
    throw new Error(`Unsupported computed border radius: ${value}`);
  return result;
}
export function resolveRadii(
  width: number,
  height: number,
  style: RadiusStyle,
): CornerRadii {
  const radii = properties.map((key) => {
    const [horizontal, vertical = horizontal] = axes(style[key]);
    const x = resolveCssLength(horizontal, width),
      y = resolveCssLength(vertical, height);
    return x === 0 || y === 0 ? [0, 0] : [x, y];
  });
  const ratio = (size: number, sum: number) => (sum === 0 ? 1 : size / sum);
  const factor = Math.min(
    1,
    ratio(width, radii[0][0] + radii[1][0]),
    ratio(width, radii[3][0] + radii[2][0]),
    ratio(height, radii[0][1] + radii[3][1]),
    ratio(height, radii[1][1] + radii[2][1]),
  );
  const scale = ([x, y]: number[]): Radius => [x * factor, y * factor];
  return [scale(radii[0]), scale(radii[1]), scale(radii[2]), scale(radii[3])];
}
export function uniformRadius(radii: CornerRadii): number | undefined {
  const first = radii[0][0];
  return radii.every(
    ([x, y]) => Math.abs(x - first) < 1e-6 && Math.abs(y - first) < 1e-6,
  )
    ? first
    : undefined;
}
export function isFullEllipse(
  width: number,
  height: number,
  radii: CornerRadii,
): boolean {
  return radii.every(
    ([x, y]) =>
      Math.abs(x - width / 2) < 0.01 && Math.abs(y - height / 2) < 0.01,
  );
}
