export type Direction = 'left' | 'top' | 'right' | 'bottom';
export type SplitArrangement = 'row' | 'column' | 'fan';

export interface Size {
  w: number;
  h: number;
}

export interface Surface extends Size {
  id: string;
  x: number;
  y: number;
  r: number;
}

export const MAX_SURFACES = 8;
export const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.max(minimum, Math.min(maximum, value));
export const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;
