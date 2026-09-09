# LiquidGlass showcase

A real Next.js consumer of `react-glaze`. The English `/showcase` route is Roam, a small Faroe Islands trip planner with real image changes, native interactions and browser-local state. `/` is a minimal entry reserved for the future component generator. The existing `apps/playground` is preserved.

## Run locally

From the workspace root:

```sh
npm install
npm run dev:showcase
```

Open [the showcase](http://127.0.0.1:8801/showcase). The original Vite playground uses port 8798. The new app uses port 8801. Check port ownership before starting a second server.

```sh
npm run lint -w showcase
npm run typecheck -w showcase
npm run build:showcase
npm run start -w showcase
```

The root lockfile owns this npm workspace. `react-glaze` resolves to `packages/react`, and its `dist` must be rebuilt after package changes. Reload the page after changing a production build, and restart `next start` after rebuilding it.

## What works in the app

- Switch among three local photographs with previous/next controls.
- Save/unsave places and filter the collection, including its empty state.
- Open a native dialog, add a stop, close with Escape and restore focus.
- Edit the trip name, add/remove stops and download a real text itinerary.
- Keep validated trip state across reloads using localStorage, with an in-memory fallback if storage is unavailable.
- Follow native anchors and a Next.js route back to the component entry.

This is an illustrative local trip, without live travel, weather or booking data. Photo credits are available in each place dialog and [ASSETS.md](ASSETS.md).

## Structure

- `src/app`: server layout and the two routes.
- `src/components/showcase`: gallery, place card/dialog, itinerary, planner composition, data and browser storage.
- `src/lib/design-system`: the generated tokens and single CSS entry point. Showcase CSS is split into foundation, destination, planner and responsive files.
- `public/images` and `public/fonts`: local media with attribution/license files.

Glass is imported from the actual package. There is no copied engine or CSS glass substitute. Sharp native foregrounds sit above the optical canvas. The card deliberately overrides its corners with ordinary CSS; the navigation/gallery use pills and save buttons use circles. Unlayered application CSS follows the package's `liquid-glass` layer. The package protects its internal optical canvas from responsive-media `max-width` resets; this app needs no internal-canvas CSS override.

## Development diagnostics

Append `?debug=1` for source/render counters. These are diagnostic durations and counts, not display FPS. See the [package contract](../../packages/react/README.md) for alpha limitations and [adoption guide](../../docs/adoption.md) for integration.
