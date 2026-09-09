# Releasing React Glaze

The library is the `packages/react` workspace. The root and demo app stay private. Releases use ordinary numeric versions, such as `0.1.0` and `0.2.0`, and the npm `latest` dist-tag. Users install with `npm install react-glaze`.

1. Update the package version and refresh the root lockfile when needed. Keep the demo pinned to an existing published version until the new release is available. Review the public README and compatibility limits.
2. Run `pnpm install --frozen-lockfile` and `pnpm check` from a clean checkout.
3. Run `pnpm pack:local`. Inspect its archive manifest and install that exact tarball in an independent React application. Check public import, SSR and the relevant browser behavior.
4. Commit the reviewed source and wait for CI. Authenticate with npm locally; never commit a token.
5. Run `npm publish /absolute/path/to/the-reviewed.tgz --tag latest --access public --registry=https://registry.npmjs.org/`. Complete npm's interactive authentication if requested.
6. Verify the registry version, `latest` tag and tarball integrity. Install from the registry in a fresh consumer. Then update the demo to the exact published version, refresh the lockfile and verify its build and browser behavior.
7. Tag the matching package source commit `v<VERSION>` and create a GitHub release with the exact archive and release notes.

Publishing a name/version is immutable on npm. If a publish command has an uncertain outcome, inspect the registry before retrying. Do not rebuild or replace an artifact under a version that is already published.

Package metadata sets public access and the `latest` tag as defaults. CI verifies source but does not publish automatically or require a stored npm token. Changing a local version or creating a local archive does not publish it.
