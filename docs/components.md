# Morph components

React Glaze provides a configurable wrapper, composable glass surfaces, split actions and a morphing menu. All imports come from `react-glaze`; there is no global provider or stylesheet to install. Use React 19 and put event handlers in a client component when using Next.js.

The interactive guide is at `/components`: split actions are the default selection, with `component=menu` for the morphing menu and `component=glass` for the Liquid Glass editor. `/playground` redirects to the editor for compatibility.

## Choose a component

| Component                                 | Responsibility                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `LiquidGlass`                             | Wrap ordinary HTML with configurable glass. Existing layout, shape and rim-light API. |
| `LiquidGlassActions`                      | A trigger opens separate native action buttons in a row, column or fan.               |
| `LiquidGlassMenu`                         | One trigger surface becomes a panel of native menu items.                             |
| `LiquidGlassGroup` + `LiquidGlassSurface` | Build a custom interaction from identified surfaces and target geometry.              |

## Split actions

```tsx
"use client";
import { LiquidGlassActions } from "react-glaze";

export function Actions() {
  return (
    <LiquidGlassActions
      label="Document actions"
      items={[
        { id: "save", label: "Save", onSelect: () => console.log("Save") },
        { id: "share", label: "Share", onSelect: () => console.log("Share") },
        { id: "export", label: "Export", disabled: true },
      ]}
      appearance="labels"
      layout="fan"
      direction="right"
      actionSize={56}
      distance={-40}
      motion={{ duration: 500, bounce: 0.5 }}
      refraction={1.5}
    />
  );
}
```

`items` contains at most six actions. Every action has a stable, unique nonempty `id` and a nonempty accessible `label`. Add `icon` for an icon element; in `appearance="icons"`, items without an icon still show their label. `appearance="labels"` shows icon and label. `content` supplies custom visible content while `label` continues to name the button. Content must be presentational: do not nest links, buttons, inputs or other controls in these slots. The application owns `onSelect`; the library does not save data, copy text or perform navigation itself.

Use `trigger` for custom presentational trigger content. The default split trigger changes from dots to a close icon while open. `className`/`style` style the root, and `triggerClassName`/`itemClassName` style the native controls. Typography and foreground color inherit from the application. Keep sufficient foreground contrast over your backgrounds and test the native fallback too.

`layout` accepts `row`, `column` and `fan`. `direction` accepts `left`, `top`, `right` and `bottom`. A row uses the horizontal axis and a column the vertical axis; fitting can adapt when available space requires it. `distance` is a rigid offset of the whole action group, from -160 to +120 CSS pixels. Zero is the recommended placement. Negative values bring the group closer without compressing its arc or changing distances between actions. The implementation limits movement before trigger hit regions overlap. `actionSize` is the action diameter/height, from 44 to 100px; real labels or custom content can widen the buttons. `triggerSize` is independently configurable from 44 to 100px, default 72.

The trigger keeps its normal-flow anchor. Fitting considers its actual viewport position, flips or wraps when possible, and can use a scrolling panel in tight space. No actions are silently discarded. An empty list disables the trigger. More than six actions or invalid IDs/labels are configuration errors.

## A morphing panel

Use `LiquidGlassMenu` with the same item, material and motion options:

```tsx
<LiquidGlassMenu
  label="Document actions"
  items={items}
  appearance="labels"
  direction="bottom"
  motion={{ duration: 420, bounce: 0.35 }}
/>
```

The trigger's glass becomes one panel. Its native trigger remains anchored but is hidden and inert while the panel is open. Use the close control, Escape, Tab or outside dismissal to return. The panel can scroll when its content is larger than the available space.

## State and keyboard behavior

Both components support `defaultOpen` for local state, or `open` plus `onOpenChange` for application-owned state. A controlled parent decides whether a requested change takes effect. `disabled` disables the trigger; item-level `disabled` keeps an action visible without allowing selection.

Enter/Space activate native buttons. Trigger Up/Down opens at the last/first enabled item. Panel Up/Down cycles enabled items; split arrows follow visible positions. Home/End choose the first/last enabled item, and printable characters search labels. Escape closes and returns focus to the trigger. Tab/Shift+Tab leave the menu in page order; outside dismissal preserves outside focus. Hidden and closing actions leave the keyboard order immediately, while their visual exit can finish.

Menus render in place. Ancestor `overflow`, clipping and stacking still apply; this release does not create a portal or top-layer popover. Keep the control outside clipping ancestors when it must extend beyond them, or clip only the background artwork. Test unusually constrained layouts, custom content, shadow-root focus boundaries and assistive technology in your application.

Controls outside the menu root normally dismiss an open menu on pointer or focus entry. If a bounded toolbar, caption or inspector operates the menu, pass its ref through `externalControls`. Pointer and focus events within that one element are then treated as associated menu interactions. Tab can move from the menu into those controls without dismissing it; moving to unrelated page controls keeps the normal close policy. Do not pass a document-wide element.

Menus fit against the visual viewport by default. To contain actions within a preview stage, pass a positive-size stage ref as `boundary`. The menu measures that stage relative to its trigger, so a shared page scroll does not change the fitting input. The boundary is only for collision fitting; it does not change clipping, stacking or outside-dismissal behavior.

```tsx
const stage = useRef<HTMLDivElement>(null);

<div ref={stage} className="preview-stage">
  <LiquidGlassActions boundary={stage} {...menuProps} />
</div>
```

```tsx
const menu = useRef<GlassMenuHandle>(null);
const controls = useRef<HTMLDivElement>(null);

return (
  <>
    <LiquidGlassMenu ref={menu} externalControls={controls} {...menuProps} />
    <div ref={controls}>
      <button onClick={() => menu.current?.replay()}>Replay</button>
    </div>
  </>
);
```

## Material and motion

The group-based components share:

| Prop                 | Meaning                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `motion.duration`    | Total timeline duration in milliseconds, including settling. 100-3000, default 500. A new target starts a new interval from current position and velocity.                                        |
| `motion.bounce`      | Independent overshoot, 0-1, default 0.5.                                                                                                                                                          |
| `connection`         | Smoothing reach between nearby surfaces in CSS pixels, 0-48, default 12.                                                                                                                          |
| `refraction`         | Multiplier of the material's thickness, 0-3, default 1. Zero removes background bending while retaining lighting.                                                                                 |
| `material`           | Existing optical material fields, plus preset, enabled, optics, lighting, depth, exposure, shadowOpacity and maxDpr. Default starts from the landing reference material with responsive lighting. |
| `reducedMotion`      | Forces reduced motion when true. The system preference is always respected.                                                                                                                       |
| `backdrop`           | Optional ref to an explicit background element. Otherwise a containing opaque ancestor is selected.                                                                                               |
| `onReady`, `onError` | Optical readiness and capture/graphics errors. Native controls remain available.                                                                                                                  |

The finite spring model is authored for React Glaze. It preserves momentum when interrupted and reaches the exact target with zero velocity at the configured deadline. The timeline does not guarantee a displayed frame at an arbitrary exact millisecond. Hidden/offscreen groups do not keep animating; an explicitly paused sampled frame and a settled endpoint retain their time when the group resumes, while unpaused motion completes before resources are released. Reduced motion removes movement and pulses.

## Optional playback inspection

`GlassGroupHandle` includes `pause()`, `play()`, `seek(timeMs)` and `replay()`. Menu refs use the smaller `GlassMenuHandle`, which exposes the same playback methods and the menu root `element`. Calls made before the controller exists, after disposal or before any authored transition are safe no-ops. `seek()` clamps finite input to the current duration, samples the actual elapsed spring and trigger pulse, paints native hit geometry and GPU geometry together, and pauses at that frame. `play()` resumes from the inspected time without adding paused wall-clock time. `replay()` restores the most recent authored geometry or pulse transition, including a closing transition.

Use `onPlaybackUpdate` to receive `{ time, duration, paused, playing, available }`. Values are finite and bounded. Frame callbacks can arrive at animation-frame frequency, so update inspector text at a lower rate and handle paused, replayed and completed states immediately. Inspection seeks do not repeatedly call `onMotionComplete`; normal playback and replay still report completion. Material, capture and pointer-light updates do not replace the replay checkpoint. Duration or bounce changes keep sampling and reported duration on the same motion configuration. Reduced motion continues to snap instead of exposing an animated inspection timeline.

## Compose custom surfaces

```tsx
"use client";
import { useState } from "react";
import { LiquidGlassGroup, LiquidGlassSurface } from "react-glaze";

export function CustomInteraction() {
  const [separated, setSeparated] = useState(false);
  const surfaces = [
    { id: "one", x: separated ? 100 : 140, y: 90, width: 64, height: 64 },
    { id: "two", x: separated ? 220 : 180, y: 90, width: 64, height: 64 },
  ];
  return (
    <LiquidGlassGroup width={320} height={180} surfaces={surfaces}>
      <LiquidGlassSurface
        as="button"
        surfaceId="one"
        onClick={() => setSeparated((value) => !value)}
      >
        Move
      </LiquidGlassSurface>
      <LiquidGlassSurface as="a" surfaceId="two" href="/details">
        Read
      </LiquidGlassSurface>
    </LiquidGlassGroup>
  );
}
```

A group has explicit CSS-pixel `width`/`height` and up to eight identified surface geometries. `x` and `y` are center coordinates within that group; `width`, `height` and optional `radius` describe its contour. Radius defaults to half the smaller dimension. Zero dimensions hide a surface. Geometry must be finite and bounded; group dimensions are at most 16,384px and geometry values at most 1,000,000px in magnitude. Use stable IDs to preserve continuity. Current targets take precedence over outgoing retired IDs if replacing many IDs exceeds the eight-surface rendering budget.

`LiquidGlassSurface` binds native content to a surface ID. It supports the wrapper's native tags (`div`, `button`, `a`, `span`, `section`, `article`), native props and typed DOM refs. Geometry controls its position, dimensions and corners; keep typography, padding and content styles in your CSS. `contentScale="follow"` scales content with the surface; `"fixed"` keeps content at its destination scale. Native hit regions share the current animated geometry. Raw group composition does not provide menu roles, open state or keyboard policy; those belong to your interaction.

`initialSurfaces` supplies an optional initial pose. A `GlassGroupHandle` ref exposes `element`, `refresh()` for background invalidation, `pulse(id, 'compress' | 'expand')` and the optional playback controls described above. `onFrame` receives current public geometry, elapsed timeline milliseconds and active state; use it for imperative composition rather than setting React state on every frame. `onMotionComplete` reports when the group's active motion has settled.

## Backgrounds and compatibility

Backgrounds remain ordinary application DOM. The group observes source mutations, image loads, input/focus changes, scrolling, resizing and visible CSS motion. It uses the package's existing snapshot adapter and serialized, bounded capture jobs; snapshots are asynchronous. An explicit small `backdrop` root can reduce capture cost. `refresh()` is available for changes that the browser does not expose through those observations.

No GPU work is required for static SSR fallback. Each visible group owns one graphics context. Hidden, offscreen and disabled groups release it and reacquire it when needed; keep related surfaces in a single group and avoid large numbers of simultaneously visible groups. Native fallback remains when the browser reaches its graphics-context limit. Context loss keeps native controls usable; restoration requests a new source and material environment. Unmount releases observers, listeners, pending capture ownership, motion tracks and GPU resources.

The existing snapshot restrictions still apply: arbitrary video/canvas frames, foreign iframes, inaccessible cross-origin images, complex masks/blending, transformed ancestors and every CSSOM/shadow-DOM composition are not guaranteed. This is an experimental library. Desktop Chrome/Firefox/Safari are targets, not evidence for every version or the new components on untested devices. Physical iPhone and native assistive-technology testing remain application-level acceptance work. See the [package limits](../packages/react/README.md#known-limits).
