# Contributing

Use Node.js 24+, pnpm 10.33.2 and `pnpm install --frozen-lockfile`, then `pnpm dev` for the demo app. The landing page, playground and showcase share one Next.js app. Run `pnpm check` before opening a pull request. Keep the library and demo responsibilities separate.

The demo deliberately consumes the pinned public alpha from npm. Local library edits do not change that installed demo version. Use `pnpm pack:local` and an independent consumer to verify a new package build before release. Do not silently replace the demo's published dependency with a source alias.

For optical changes, include a minimal reproduction and before/after browser evidence. Distinguish native Safari, Playwright WebKit, viewport emulation, Simulator and physical devices. Do not infer FPS from JavaScript submission timings.

Preserve native element semantics, keyboard behavior, caller CSS and reduced-motion behavior. Document changes to the public API in `packages/react/README.md`, and add focused regressions for behavior changes. Generated output and local recordings do not belong in commits.

Report issues with browser/device versions, reproduction steps and the smallest useful example. Please do not include credentials or private page content.
