# Contributing

Use Node.js 24+, pnpm 10.33.2 and `pnpm install --frozen-lockfile`, then `pnpm dev` for the demo app. The landing page, playground, showcase and `/components` guide share one Next.js app. Run `pnpm check` before opening a pull request. Keep the library and demo responsibilities separate.

The demo consumes the built workspace package through `workspace:*`. Its `dev`, `build` and `typecheck` scripts prepare the library's ignored `dist` exports before running Next.js, including from `apps/demo`. Rebuild with `pnpm --filter react-glaze build` after editing library source while the demo server is running.

Use `pnpm pack:local` and an independent consumer that installs the resulting tarball to verify a new package build before release. That archive check verifies packaging separately from workspace development; see the [release procedure](docs/releasing.md).

For optical changes, include a minimal reproduction and before/after browser evidence. Distinguish native Safari, Playwright WebKit, viewport emulation, Simulator and physical devices. Do not infer FPS from JavaScript submission timings.

Preserve native element semantics, keyboard behavior, caller CSS and reduced-motion behavior. Document changes to the public API in `packages/react/README.md`, and add focused regressions for behavior changes. Generated output and local recordings do not belong in commits.

Report issues with browser/device versions, reproduction steps and the smallest useful example. Please do not include credentials or private page content.
