# React Glaze demo

One Next.js application for React Glaze, the experimental React 19 liquid glass wrapper. The landing pairs a quiet introduction with three original material scenes and a real draggable glass preview. Click the glass to switch between clear and frosted.

## Run from the workspace root

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:8862.

| Route | Purpose |
| --- | --- |
| `/` | One-screen introduction, real glass demo, installation and links |
| `/components?component=glass` | Material/shape/rim editor, JSX/JSON export, shareable configuration and optional local save |
| `/showcase` | Roam travel demo: photographs, gallery, filters, saved places and native trip-planning dialog |
| `/components` | Interactive split actions, morphing menu, Liquid Glass editor and group/surface examples with copyable TSX |
| `/playground` | Compatibility redirect to `/components?component=glass` |
| `/quality.html` | Preserved optical quality fixture |
| `/research.html` | Preserved material research fixture |

The app consumes `react-glaze` through `workspace:*`, using the library's built exports in `packages/react/dist`. The demo's `dev`, `build` and `typecheck` scripts build that dependency first, including when run directly from `apps/demo` after a fresh workspace install. After editing library source while the dev server is running, run `pnpm --filter react-glaze build` again to update those exports.

Use `pnpm pack:local` and an independently installed tarball consumer to verify the distributable package separately. The workspace demo does not establish that an archive contains everything an external application needs. See the [release procedure](../../docs/releasing.md).

The Liquid Glass editor retains the owner's exact initial/reset configuration. `/components` selects split actions by default; `component=actions|menu|glass` is addressable, and a `config` query without an explicit valid component selects the editor. Explicit `config` query parameters win over a manually saved local configuration. The storage key remains `react-glaze:playground:config:v1`. Save is manual, Reset does not overwrite the saved copy, Delete saved leaves the current preview intact, and uploaded image bytes are not stored. Storage belongs to an origin, so changing host or port does not transfer previous settings. Old `/?config=...` and `/playground` links redirect to `/components?component=glass` with their query values preserved.

Roam retains `liquid-showcase-trip-v1` for its local trip state. Photographs and fonts retain their [source attribution](ASSETS.md).

## Styling

Generated with `@larsen-utvikling/create-next-app@0.6.0`, pnpm and the recommended skills. No Tailwind or utility framework is used.

The single stylesheet chain is `src/app/layout.tsx` -> `globals.css` -> `src/lib/design-system/index.css`. Structural/type/motion tokens come from the template. The color file is the actual Canonical Palette download using #4655F5, automatic secondary, weak neutral tint, shadcn/ui HSL values, media dark mode and no Tailwind integration. [Token guide](DESIGN.md).

The editor and showcase retain their visual identity in scoped route styles. Their palette variables and generic controls cannot leak into the landing page. The editor mounts its browser-only implementation within a client-only loader after its first selection; the Components route retains its own server-rendered metadata.

[Design lock and verification](../../docs/design-locks/2026-09-09-demo.md).

## Verify

Production traffic and adoption actions use Vercel Web Analytics. See the [event definitions, collection boundaries and dashboard](docs/analytics.md).

Run `pnpm check` at the root for package/config/storage tests, type checks and the production build. Use `pnpm --filter demo build` for the site's production build, including its workspace package prerequisite, and `pnpm --filter demo start` to preview it. From `apps/demo`, the equivalent commands are `pnpm build` and `pnpm start`; `pnpm typecheck` also prepares the library before checking the app.

Desktop Chrome, Firefox and Safari are the package targets; iPhone Safari remains experimental. Local builds, browser checks, physical-device checks and deployment are separate evidence. No npm release or site deployment is triggered by these commands.


## Identity and search metadata

The shared Join logo appears in the landing, Components route and showcase branding. [Brand assets and regeneration](docs/brand.md) describe the single SVG geometry source, outlined wordmarks, native icons and README/social graphic.

Next.js file conventions serve `favicon.ico`, `icon.svg`, `apple-icon.png`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, Open Graph and Twitter images. Metadata helpers define each route's title, description and production canonical URL. Child routes preserve the actual native social image metadata from their parent. The safely serialized JSON-LD graph describes the website and the open-source package without invented reviews, ratings or release claims.

The three public routes are included in the sitemap. Historical research and quality fixtures remain accessible with `X-Robots-Tag: noindex, follow`; they are not blocked in robots.txt. The manifest uses browser display and does not promise an offline application. Verification and search-engine indexing are separate outcomes.
