import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import type { GlassAction, GlassSurface } from "../../morph-types.js";

export function validateActions(items: readonly GlassAction[]) {
  if (!Array.isArray(items)) throw new TypeError("Glass menu items must be an array of actions.");
  if (items.length > 6) throw new RangeError("Glass menus support at most 6 actions. Use a larger menu for longer lists.");
  const ids = new Set<string>();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || !item.id.trim() || ids.has(item.id))
      throw new TypeError("Glass menu action IDs must be nonempty, unique strings.");
    if (typeof item.label !== "string" || !item.label.trim())
      throw new TypeError(`Glass menu action '${item.id}' needs a nonempty label.`);
    if (item.onSelect !== undefined && typeof item.onSelect !== "function")
      throw new TypeError(`Glass menu action '${item.id}' onSelect must be a function.`);
    ids.add(item.id);
    validateContent(item.content ?? item.icon, `Action '${item.id}'`);
  }
}

/** Native controls are supplied by the menu; content slots must not nest controls. */
export function validateContent(content: ReactNode, name: string) {
  Children.forEach(content, child => {
    if (!isValidElement<{ children?: ReactNode; href?: string; tabIndex?: number; contentEditable?: unknown }>(child)) return;
    if (typeof child.type === "string" && (["button", "input", "select", "textarea", "summary"].includes(child.type) ||
      (child.type === "a" && child.props.href !== undefined) || child.props.contentEditable === true ||
      (child.props.tabIndex !== undefined && child.props.tabIndex >= 0)))
      throw new TypeError(`${name} must contain non-interactive content. The glass menu supplies the native button.`);
    validateContent(child.props.children, name);
  });
}

export function edgeItem(items: readonly GlassAction[], edge: "first" | "last") {
  const enabled = items.filter(item => !item.disabled);
  return (edge === "first" ? enabled[0] : enabled.at(-1))?.id;
}

export function adjacentItem(items: readonly GlassAction[], current: string | undefined, step: number) {
  const enabled = items.filter(item => !item.disabled);
  if (!enabled.length) return undefined;
  const index = enabled.findIndex(item => item.id === current);
  if (index < 0) return enabled[step < 0 ? enabled.length - 1 : 0].id;
  return enabled[(index + step + enabled.length) % enabled.length].id;
}

export interface MenuPoint { id: string; x: number; y: number }
export function directionalItem(points: readonly MenuPoint[], current: string | undefined, key: string) {
  const direction = ({ ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] } as
    Record<string, number[]>)[key];
  const origin = points.find(point => point.id === current);
  if (!direction || !origin) return current;
  let closest = current, score = Infinity;
  for (const point of points) {
    const dx = point.x - origin.x, dy = point.y - origin.y;
    const forward = dx * direction[0] + dy * direction[1];
    if (point.id === current || forward <= 1) continue;
    const candidate = forward + Math.abs(dx * direction[1] - dy * direction[0]) * 3;
    if (candidate < score) { closest = point.id; score = candidate; }
  }
  return closest;
}

export interface TypeaheadState { text: string; time: number }
export function typeaheadItem(items: readonly GlassAction[], current: string | undefined,
  key: string, time: number, previous: TypeaheadState) {
  const text = `${time - previous.time > 500 ? "" : previous.text}${key}`.toLocaleLowerCase();
  const characters = [...text];
  const query = characters.every(letter => letter === characters[0]) ? characters[0] : text;
  const enabled = items.filter(item => !item.disabled);
  const from = enabled.findIndex(item => item.id === current);
  const order = [...enabled.slice(from + 1), ...enabled.slice(0, from + 1)];
  return { id: order.find(item => item.label.trim().toLocaleLowerCase().startsWith(query))?.id,
    state: { text, time } };
}

export function boundedSize(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value) ? Math.max(44, Math.min(100, value)) : fallback;
}

type PanelPose = Pick<GlassSurface, "x" | "y" | "width" | "height">;
export function panelContentOpacity(pose: PanelPose, expanded: PanelPose, triggerSize: number, open: boolean, active: boolean) {
  if (!active) return Number(open);
  const travel = expanded.x ** 2 + expanded.y ** 2;
  const width = expanded.width - triggerSize, height = expanded.height - triggerSize;
  const growth = width ** 2 + height ** 2;
  // Position excludes the trigger's scale pulse, including almost trigger-sized panels.
  const progress = travel > .01 ? (pose.x * expanded.x + pose.y * expanded.y) / travel :
    growth > .01 ? ((pose.width - triggerSize) * width + (pose.height - triggerSize) * height) / growth : Number(open);
  return Math.max(0, Math.min(1, (progress - .2) / .6));
}

interface PageTabStop<T> {
  value: T;
  radio?: { name: string; checked: boolean; form: object | null; tree: object };
}
export function radioTabStops<T>(candidates: readonly PageTabStop<T>[], backwards: boolean): T[] {
  return candidates.filter(candidate => {
    const radio = candidate.radio;
    if (!radio?.name) return true;
    const group = candidates.filter(other => other.radio?.name === radio.name &&
      other.radio.form === radio.form && other.radio.tree === radio.tree);
    const selected = group.find(other => other.radio?.checked) ?? (backwards ? group.at(-1) : group[0]);
    return selected === candidate;
  }).map(candidate => candidate.value);
}

export function isMenuInteraction(
  path: readonly EventTarget[],
  root: HTMLElement | null,
  external: HTMLElement | null = null,
) {
  const ownerDocument = external?.ownerDocument;
  const associated = external === ownerDocument?.body ||
    external === ownerDocument?.documentElement ? null : external;
  return [root, associated].some(boundary => boundary && path.some(target => {
    if (target === boundary) return true;
    if (!target || typeof target !== "object") return false;
    try { return boundary.contains(target as Node); }
    catch { return false; }
  }));
}

/**
 * A controlled menu can be opened by an associated toolbar without passing
 * through the menu's own request handler. Keep that toolbar's focus in place,
 * while an explicit trigger request still directs focus into the menu.
 */
export function openingFocusTarget(
  pending: "first" | "last" | string | undefined,
  active: EventTarget | null,
  external: HTMLElement | null,
) {
  if (pending !== undefined) return pending;
  return isMenuInteraction(active ? [active] : [], null, external)
    ? undefined
    : "first";
}

export class MenuFocusState {
  owned = false;
  private closing: "return" | "outside" | "tab" | undefined;

  enter() { this.owned = true; this.cancelClose(); }
  associate() { this.owned = false; this.cancelClose(); }
  leave() { this.owned = false; }
  requestClose(reason: "return" | "outside" | "tab") { this.closing = reason; }
  cancelClose() { this.closing = undefined; }
  shouldRestore(activeInside: boolean) {
    return (this.closing ?? "return") === "return" && (this.owned || activeInside);
  }
  closed() { this.owned = false; this.cancelClose(); }
}
