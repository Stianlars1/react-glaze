# React Glaze

Liquid glass for React.

A configurable React 19 component that refracts the page behind your content. Use a native button, link or ordinary wrapper, keep your own CSS, and adjust the material, shape and optional pointer-driven rim light.

**Experimental alpha.** Desktop Chrome, Firefox and Safari are the targets; iPhone Safari is experimental. Background capture is asynchronous and has [documented limitations](packages/react/README.md#known-alpha-limits).

## Install

```sh
npm install react-glaze@alpha
```

```tsx
'use client';

import { LiquidGlass } from 'react-glaze';

export function SaveButton() {
  return (
    <LiquidGlass
      as="button"
      preset="quiet"
      shape="pill"
      rimLight={{ onLeave: 'hold' }}
      style={{ padding: '12px 24px' }}
      onClick={() => console.log('Saved')}
    >
      Save this moment
    </LiquidGlass>
  );
}
```

No provider, background image prop or stylesheet import is required. Your content controls the size; your CSS controls layout and typography. Next.js App Router can render the library's client boundary from a server component. Event handlers belong in your own client component.

## Customize

- **Materials:** reference, quiet, frosted and Optical Type presets, with individual optical controls.
- **Shapes:** rounded surfaces, pills, circles and lenses, plus caller-defined CSS corners.
- **Foreground:** sharp native content by default; refracted content is experimental.
- **Rim light:** optional static or nearby-pointer light. Choose `onLeave: 'return'` or `'hold'` and adjust strength, width, reach and response. Touch and reduced motion keep a fixed upper-left light.

[Full component API](packages/react/README.md) · [Adoption guide](docs/adoption.md)

## Try locally

Use Node.js 24 or newer:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:8798. The playground includes material/rim controls, custom backgrounds, generated JSX/JSON and shareable URLs. Save one configuration locally for your next visit; explicit shared URLs take priority. Uploaded images stay in the current tab.

For the realistic Next.js showcase:

```sh
npm run dev:showcase
```

Open http://127.0.0.1:8801/showcase. It exercises image changes, navigation, native dialogs and forms over real page content.

## Develop and verify

```sh
npm run check
npm run pack:local
```

`packages/react` contains the library. `apps/playground` and `apps/showcase` consume it through the workspace package. The checks cover package tests and public types, playground configuration/storage tests, workspace type checks and both app builds. Local archives are written to unique directories so previous builds remain available.

[Contributing](CONTRIBUTING.md) · [Release procedure](docs/releasing.md) · [Issues](https://github.com/Stianlars1/react-glaze/issues)

## License and credits

[MIT](LICENSE), © Stian Larsen. The optical material and original Optical Type artwork derive from the MIT-licensed [Drawn To](https://github.com/Stianlars1/drawn-to) reference. [Third-party notices](packages/react/THIRD-PARTY-NOTICES.md) include Drawn To, Three.js and html-to-image. Fonts retain their OFL notices; showcase photographs retain [source credits](apps/showcase/ASSETS.md).

React Glaze is an independent project and is not affiliated with Apple or Raycast.
