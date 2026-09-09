# React Glaze identity

The Join mark was selected by the owner on September 9, 2026. It is one connected silhouette made from two diagonal round lobes and two tangent concave joins. The lower lobe is slightly larger. Keep the shape, angle and negative space together.

## Source and regeneration

- Geometry, 32-unit viewBox and cobalt seed: `src/lib/brand.ts`.
- Decorative React renderer: `src/components/brand/BrandMark.tsx`.
- Outlined Inter wordmark: `src/lib/brand-wordmark.ts`. Its OFL notice remains in `public/fonts/Inter-OFL.txt`.
- Regenerate derived files from the workspace root with `pnpm brand:generate`.
- The README/social artwork includes the real captured glass scene at `public/brand/material-scene.png`.

No font is required to display the exported SVG lockups. Site wordmarks remain live text for clear accessible link names. SVG marks next to them are decorative.

## Exports

| Asset | Files |
| --- | --- |
| Cobalt, dark and white symbol | `public/brand/logo.svg`, `logo-black.svg`, `logo-white.svg` |
| Matching outlined lockups | `public/brand/logo-lockup.svg`, `logo-black-lockup.svg`, `logo-white-lockup.svg` |
| Standard application icons | `public/brand/icon-192.png`, `icon-512.png` |
| Maskable icon | `public/brand/icon-maskable-512.png` |
| Native Next.js icons | `src/app/icon.svg`, `favicon.ico`, `apple-icon.png` |
| README graphic | `public/brand/readme-banner.png` |
| Native social cards | `src/app/opengraph-image.png`, `twitter-image.png`, matching alt-text files |

## Small-size rules

The master has a 4-unit neck, approximately 2px at a 16px viewBox render. Use at 16px or larger. Keep the built-in optical margins, and leave clear space when placing the mark beside other content. For app/home-screen icons use the generated filled tile; use the maskable asset where a platform applies its own shape mask. Do not add thin outlines, shadows, extra dots or gradients to establish recognition. Color variants share identical geometry.

The default cobalt seed is #4655F5. Monochrome symbols inherit text color in the website. Color does not carry identification on its own. The social/README artwork retains a light surface in both document themes so the mark, typography and photograph stay legible.
