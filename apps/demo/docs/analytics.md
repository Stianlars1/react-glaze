# Demo analytics

Vercel Web Analytics measures the public demo's traffic and a small set of adoption actions. The owner approved this setup on September 9, 2026 for the existing Vercel Pro project.

## Events

| Event | Properties | Trigger |
| --- | --- | --- |
| Page view | Vercel's standard route and traffic dimensions | Initial load and client navigation |
| `install_command_copied` | None | Successful clipboard write on the landing page |
| `playground_code_copied` | `format`: `jsx` or `json` | Successful clipboard write, including the legacy fallback |
| `resource_link_clicked` | `destination`: `github` or `documentation` | Activation of the corresponding landing-page link |

Copying is an indication of interest, not proof of installation. No glass-setting changes, rendered frames, uploaded images or copied code contents are tracked. The npm package has no analytics dependency or telemetry.

## Collection

The shared layout mounts one Next.js analytics component. Both the component and custom events are enabled only when `NEXT_PUBLIC_VERCEL_ENV` is `production`, supplied by Vercel at build time. Local development and preview deployments do not collect data.

The `beforeSend` callback removes every `config` query parameter and URL fragments from pageviews and custom events. Other parameters are retained so campaign context is not discarded. Custom properties are limited to the values in the table.

The Next.js routes `/`, `/playground` and `/showcase` are covered. Standalone legacy HTML research/quality fixtures do not use the shared layout.

## Dashboard and verification

Open [React Glaze Analytics](https://vercel.com/stians-applications/react-glaze/analytics). Web Analytics must be enabled for that project before deploying the integration. Traffic appears in the standard panels; the three event names above appear under custom events after being received.

Verify real browser page transitions and successful/failed clipboard actions. Inspect outgoing payloads to ensure configuration is absent and each successful action produces one event. Run `pnpm check` for the workspace checks, including URL redaction tests. A successful build alone does not prove ingestion; check the production requests and dashboard separately.

September 9, 2026: full workspace checks and the production-enabled build pass. Local Chromium checks confirm install copying, both resource destinations, JSX/JSON copying, failed-copy exclusion and both outcomes of the legacy clipboard fallback. These browser checks intercept the analytics script to avoid sending test traffic. Vercel project activation was confirmed through the API; live ingestion is verified separately after deployment.
