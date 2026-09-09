# Use LiquidGlass in another application

React Glaze is an experimental React 19 library licensed under MIT. The owner-selected product name is React Glaze and its npm package name is `react-glaze`. No background image prop, global provider or CSS import is required. The [package contract](../packages/react/README.md) documents the desktop Chrome/Firefox/Safari targets and experimental iPhone scope.

## Install

```sh
npm install react-glaze
```

For a local build before publishing:

From the Liquid workspace, run:

```sh
pnpm pack:local
```

The command builds the package and prints a new archive path under `work/package-packs/`. Each run gets a separate directory. In your own React 19 or Next.js application:

```sh
npm install /absolute/path/to/react-glaze-0.1.0.tgz
```

The installed library must be a real package directory, not a workspace symlink. Do not import from this workspace's source or copy its engine into the application. For a new archive with the same local version, install its new absolute path and restart the consuming app.

## Start with ordinary HTML and CSS

In a Next.js App Router page, a server component can render the library's client boundary directly:

```tsx
import { LiquidGlass } from 'react-glaze';

export default function Page() {
  return (
    <main className="scene">
      <LiquidGlass className="card" preset="reference">
        <h1>A quieter place.</h1>
        <p>Your content defines the size.</p>
        <a href="/places">Explore places</a>
      </LiquidGlass>
    </main>
  );
}
```

```css
.scene {
  min-height: 100vh;
  padding: 32px;
  color: white;
  background: #16405e;
}

.card {
  max-width: 32rem;
  padding: 24px;
  border-radius: 28px 8px 40px 0;
}
```

The wrapper adds no dimensions, padding, alignment, typography or foreground colors. Its nearest opaque ancestor becomes the automatic capture root; otherwise it uses the document body. A photograph, gradient or text in that ancestor remains application content. Keeping related content in a naturally scoped opaque section can reduce capture cost, but does not require a special library container.

To add the optional pointer-driven white edge, use `<LiquidGlass rimLight>…</LiquidGlass>`. For a fixed upper-left light, use `rimLight={{ mode: 'static' }}`. Touch and reduced motion remain static. The [rim configuration](../packages/react/README.md#optional-rim-light) controls its strength, width, nearby reach and response independently from the optical material. The default remains off.

The React 19 style resource supplies overridable shape defaults. If you use CSS cascade layers, declare `liquid-glass` before the application layer that should override it. Ordinary unlayered CSS overrides the defaults directly.

## Keep interaction native

For an event handler or DOM ref in Next.js, put the interactive component in a client module:

```tsx
'use client';
import { useRef, useState } from 'react';
import { LiquidGlass } from 'react-glaze';

export function SaveButton() {
  const button = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState(false);
  return (
    <LiquidGlass
      as="button"
      ref={button}
      shape="pill"
      disabled={saved}
      onClick={() => setSaved(true)}
      style={{ padding: '12px 24px' }}
    >
      {saved ? 'Saved' : 'Save place'}
    </LiquidGlass>
  );
}
```

Buttons default to `type="button"`. Set `type="submit"` inside a native form when submission is intended. `enabled={false}` disables the optical effect and preserves the content; `disabled` controls a native button. Links retain `href` and keyboard behavior.

The default `contentMode="sharp"` keeps foreground text and controls in the DOM. `refracted` includes that content in the optical snapshot, while native selection, caret and hit regions retain their original positions. It remains experimental; use sharp content for precise interaction.

## Images and updates

The capture adapter uses the browser-selected `currentSrc` for responsive images and preserves query parameters. This includes Next Image URLs and the selected source of a `<picture>`. It does not pick a smaller image, change the component DPR, or alter the application's source elements. Selection follows the browser.

Eager images that are still loading settle before their root enters the global capture lock. Unloaded lazy images do not block that preparation. Resource changes after an actual capture starts still invalidate obsolete work. A delayed `load` event for already captured, complete pixels does not start redundant work.

Updates remain asynchronous. A large capture root costs more than a small one, multiple roots share a serial capture path, and WebKit retains its bounded 120 ms embedded-image painting workaround. Source/render/copy counters are not display FPS. See the [source update study](../packages/react/README.md#responsive-images-and-asynchronous-capture) for measured scope.

## Failure and lifecycle behavior

Native HTML is server-rendered before the optical engine loads. `onReady` reports optical readiness, `onError` reports capture/render errors, and `onMetrics` provides throttled local counters. Errors hide the optical layer; original content remains. A successful refresh or WebGL context restoration can make it ready again.

Hidden, offscreen and disabled surfaces pause. Final unmount releases observers, queues, source canvases, textures and the shared renderer. No idle animation loop is required. Data saving and reduced motion have their documented effects in the [package contract](../packages/react/README.md).

## Current boundaries

The tested showcase covers native page scrolling, fixed navigation, image changes, CSS overrides, dialogs, forms, route transitions and independent archive installation in the recorded browser versions. It is not a guarantee for every DOM composition.

Video/canvas frames, foreign iframes, cross-origin images without CORS, complex masks/blending, nested scrolling, transformed ancestors, closed shadow DOM, CSSOM/WAAPI-only changes and recursive glass still need separate work. Changing bytes at an unchanged image URL is not automatically observable. Root selection occurs at mount; reparenting requires a remount.

The runnable examples are the actual [showcase](../apps/demo/README.md) and [playground](../README.md). Public publication and deployment are separate from successful local use.
