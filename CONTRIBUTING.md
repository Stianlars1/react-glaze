# Contributing

Use Node.js 24+ and `npm ci`, then `npm run dev` for the playground. Run `npm run check` before opening a pull request. Keep the library, playground and showcase responsibilities separate.

For optical changes, include a minimal reproduction and before/after browser evidence. Distinguish native Safari, Playwright WebKit, viewport emulation, Simulator and physical devices. Do not infer FPS from JavaScript submission timings.

Preserve native element semantics, keyboard behavior, caller CSS and reduced-motion behavior. Document changes to the public API in `packages/react/README.md`, and add focused regressions for behavior changes. Generated output and local recordings do not belong in commits.

Report issues with browser/device versions, reproduction steps and the smallest useful example. Please do not include credentials or private page content.
