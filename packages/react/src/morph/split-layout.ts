import { clamp, type Direction, type Size, type SplitArrangement, type Surface } from './model.js';

type Item = Pick<Surface, 'id' | 'w' | 'h'>;
interface SplitResult { surfaces: Surface[]; direction: Direction; fits: boolean; wrapped: boolean; distance: number }
const GAP = 12;
const TRIGGER_GAP = 8;
const MARGIN = 20;
const FAN_SWEEP = 116 * Math.PI / 180;

export function arrangementDirections(arrangement: SplitArrangement): Direction[] {
  return arrangement === 'row' ? ['left', 'right'] :
    arrangement === 'column' ? ['top', 'bottom'] : ['left', 'top', 'right', 'bottom'];
}
export function arrangementDirection(arrangement: SplitArrangement, direction: Direction): Direction {
  return arrangementDirections(arrangement).includes(direction) ? direction :
    arrangement === 'row' ? 'right' : 'top';
}

function centered(surfaces: Surface[], view: Size) {
  const left = Math.min(...surfaces.map(s => s.x - s.w / 2));
  const right = Math.max(...surfaces.map(s => s.x + s.w / 2));
  const top = Math.min(...surfaces.map(s => s.y - s.h / 2));
  const bottom = Math.max(...surfaces.map(s => s.y + s.h / 2));
  const dx = (view.w - left - right) / 2, dy = (view.h - top - bottom) / 2;
  return {
    surfaces: surfaces.map(s => ({ ...s, x: s.x + dx, y: s.y + dy })),
    fits: right - left <= view.w - MARGIN * 2 && bottom - top <= view.h - MARGIN * 2,
  };
}

function linear(items: Item[], direction: Direction) {
  const row = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'top' ? -1 : 1;
  let offset = 0;
  return items.map((item, i): Surface => {
    const along = row ? item.w : item.h;
    if (i) offset += (row ? items[i - 1].w : items[i - 1].h) / 2 + GAP + along / 2;
    return { ...item, x: row ? sign * offset : 0, y: row ? 0 : sign * offset, r: item.h / 2 };
  });
}

function wrapped(items: Item[], arrangement: SplitArrangement, direction: Direction, view: Size) {
  const columnFirst = arrangement === 'column';
  const available = (columnFirst ? view.h : view.w) - MARGIN * 2;
  const lines: Item[][] = [[]];
  let used = 0;
  for (const item of items) {
    const length = columnFirst ? item.h : item.w;
    if (lines.at(-1)!.length && used + GAP + length > available) {
      lines.push([]); used = 0;
    }
    const line = lines.at(-1)!;
    used += (line.length ? GAP : 0) + length; line.push(item);
  }
  const surfaces: Surface[] = [];
  let cross = 0;
  for (const line of lines) {
    const thickness = Math.max(...line.map(s => columnFirst ? s.w : s.h));
    let along = 0;
    for (const item of line) {
      const length = columnFirst ? item.h : item.w;
      surfaces.push({ ...item,
        x: columnFirst ? cross + thickness / 2 : along + length / 2,
        y: columnFirst ? along + length / 2 : cross + thickness / 2,
        r: item.h / 2 });
      along += length + GAP;
    }
    cross += thickness + GAP;
  }
  return surfaces.map(s => ({ ...s, x: direction === 'left' ? -s.x : s.x,
    y: direction === 'top' ? -s.y : s.y }));
}

function fan(items: Item[], direction: Direction, sweep: number): Surface[] {
  const count = items.length - 1;
  const angle = ({ top: -Math.PI / 2, right: 0, bottom: Math.PI / 2, left: Math.PI })[direction];
  const unit = items.map((_, i) => {
    if (!i) return { x: 0, y: 0 };
    const theta = angle + (count === 1 ? 0 : ((i - 1) / (count - 1) - 0.5) * sweep);
    return { x: Math.cos(theta), y: Math.sin(theta) };
  });
  let radius = 0;
  // Find the radius that separates measured hit boxes, including the trigger.
  // A pair clears when either its horizontal or vertical gap is sufficient.
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const dx = Math.abs(unit[i].x - unit[j].x), dy = Math.abs(unit[i].y - unit[j].y);
    const neededX = ((items[i].w + items[j].w) / 2 + GAP) / Math.max(dx, 1e-9);
    const neededY = ((items[i].h + items[j].h) / 2 + GAP) / Math.max(dy, 1e-9);
    radius = Math.max(radius, Math.min(neededX, neededY));
  }
  return items.map((s, i) => ({ ...s, x: unit[i].x * radius, y: unit[i].y * radius, r: s.h / 2 }));
}

function fitDistance(view: Size, surfaces: Surface[], direction: Direction, requested: number) {
  const compact = centered(surfaces, view);
  if (!compact.fits) return undefined;
  const row = direction === 'left' || direction === 'right';
  const sign = direction === 'left' || direction === 'top' ? -1 : 1;
  const along = row ? 'x' : 'y', across = row ? 'y' : 'x';
  const length = row ? 'w' : 'h', breadth = row ? 'h' : 'w';
  const trigger = surfaces[0];
  let minimum = -160;
  for (const action of surfaces.slice(1)) {
    if (Math.abs(action[across] - trigger[across]) >= (action[breadth] + trigger[breadth]) / 2 + TRIGGER_GAP) continue;
    minimum = Math.max(minimum, (action[length] + trigger[length]) / 2 + TRIGGER_GAP - sign * (action[along] - trigger[along]));
  }
  const offset = Math.max(minimum, requested);
  const generate = (distance: number) => surfaces.map((s, i) => i ? { ...s, [along]: s[along] + sign * distance } : s);
  const full = centered(generate(offset), view);
  if (full.fits) return { ...full, distance: offset };
  let low = 0, high = 1;
  for (let i = 0; i < 20; i++) {
    const middle = (low + high) / 2;
    if (centered(generate(middle * offset), view).fits) low = middle; else high = middle;
  }
  const distance = Math.trunc(low * offset * 100) / 100;
  return { ...centered(generate(distance), view), distance };
}

export function makeSplitLayout(view: Size, button: number, actions: Item[],
  arrangement: SplitArrangement, requestedDirection: Direction, distance = 0): SplitResult {
  if (![view.w, view.h, button, ...actions.flatMap(action => [action.w, action.h])]
    .every(value => Number.isFinite(value) && value >= 0)) {
    throw new RangeError('Split layout requires finite, non-negative sizes.');
  }
  distance = actions.length && Number.isFinite(distance) ? clamp(distance, -160, 120) : 0;
  const direction = arrangementDirection(arrangement, requestedDirection);
  const items: Item[] = [{ id: 'trigger', w: button, h: button }, ...actions];
  if (arrangement === 'fan') {
    const compactSweep = Math.min(FAN_SWEEP, Math.max(0, actions.length - 1) * FAN_SWEEP / 2);
    const directions = [direction, ...(['top', 'right', 'bottom', 'left'] as const).filter(d => d !== direction)];
    const sweeps = [...new Set([compactSweep, Math.max(compactSweep, Math.PI * 0.8), Math.PI])];
    for (const candidate of directions) for (const sweep of sweeps) {
      const result = fitDistance(view, fan(items, candidate, sweep), candidate, distance);
      if (result) return { ...result, direction: candidate, wrapped: false };
    }
  } else {
    const result = fitDistance(view, linear(items, direction), direction, distance);
    if (result) return { ...result, direction, wrapped: false };
  }
  const result = centered(wrapped(items, arrangement, direction, view), view);
  return { ...result, direction, wrapped: true, distance: 0 };
}
