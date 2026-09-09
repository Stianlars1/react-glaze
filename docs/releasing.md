# Releasing React Glaze

The library is the `packages/react` workspace. The root, playground and showcase stay private. Pre-releases use the npm `alpha` dist-tag; do not move `latest` during an alpha release.

1. Update the package version, matching showcase dependency and lockfile when needed. Review the public README and compatibility limits.
2. Run `npm ci` and `npm run check` from a clean checkout.
3. Run `npm run pack:local`. Inspect its archive manifest and install that exact tarball in an independent React application. Check public import, SSR and the relevant browser behavior.
4. Commit the reviewed source and wait for CI. Authenticate with npm locally; never commit a token.
5. Run `npm publish /absolute/path/to/the-reviewed.tgz --tag alpha --access public --registry=https://registry.npmjs.org/`. Complete npm's interactive authentication if requested.
6. Verify the registry version, dist-tag and tarball integrity. Install from the registry in a fresh consumer.
7. Tag the matching source commit `v<VERSION>` and create a GitHub prerelease with the exact archive and release notes.

Publishing a name/version is immutable on npm. If a publish command has an uncertain outcome, inspect the registry before retrying. Do not rebuild or replace an artifact under a version that is already published.

Package metadata sets public access and the alpha tag as defaults. CI verifies source but does not publish automatically or require a stored npm token.
