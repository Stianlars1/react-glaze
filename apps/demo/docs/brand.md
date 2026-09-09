# React Glaze identity

The Join mark was selected by the owner on September 9, 2026. It is one connected silhouette made from two diagonal round lobes and two tangent concave joins. The lower lobe is slightly larger. Keep the shape, angle and negative space together.

## Source and regeneration

- Geometry, 32-unit viewBox and cobalt seed: `src/lib/brand.ts`.
- Decorative React renderer: `src/components/brand/BrandMark.tsx`.
- Default app artwork: `BRAND_APP_ICON` in `src/lib/brand.ts`; decorative header renderer: `src/components/brand/BrandIcon.tsx`.
- Outlined Inter wordmark: `src/lib/brand-wordmark.ts`. Its OFL notice remains in `public/fonts/Inter-OFL.txt`.
- Regenerate derived files from the workspace root with `pnpm brand:generate`.
- The README/social artwork includes the real captured glass scene at `public/brand/material-scene.png`.

No font is required to display the exported SVG lockups. Site wordmarks remain live text for clear accessible link names. SVG marks next to them are decorative.

## Exports

| Asset | Files |
| --- | --- |
| Cobalt, dark and white symbol | `public/brand/logo.svg`, `logo-black.svg`, `logo-white.svg` |
| Matching outlined lockups | `public/brand/logo-lockup.svg`, `logo-black-lockup.svg`, `logo-white-lockup.svg` |
| Standard application icons, derived from the monochrome Composer master | `public/brand/icon-192.png`, `icon-512.png` |
| Maskable icon | `public/brand/icon-maskable-512.png` |
| Native Next.js icons | `src/app/icon.png`, `favicon.ico`, `apple-icon.png` |
| README graphic | `public/brand/readme-banner.png` |
| Native social cards | `src/app/opengraph-image.png`, `twitter-image.png`, matching alt-text files |

## macOS portfolio artwork

The owner requested a macOS app-icon treatment of the existing Join mark on September 9, 2026. The editable Apple Icon Composer 2 document is `public/brand/react-glaze-macos.icon`. Its SVG retains the original silhouette. The main appearances use the original cobalt fill; Mono has a separate light material for stronger contrast. Native glass effects are applied in Composer.

Six flattened PNGs are in `public/brand/macos/`, all verified as 1024 x 1024 RGBA with transparent outer margins:

- `react-glaze-default-1024.png`
- `react-glaze-dark-1024.png`
- `react-glaze-clear-light-1024.png`
- `react-glaze-clear-dark-1024.png`
- `react-glaze-tinted-light-1024.png`
- `react-glaze-tinted-dark-1024.png`

These are manually authored portfolio assets, separate from `pnpm brand:generate`. To regenerate them, open the `.icon` document in Icon Composer 2 and choose File > Export, Platform **macOS pre-Tahoe** (the separate macOS export option), Appearance **All**, Size **1024pt**, **1x**. Composer exports Default, Dark, Clear Light, Clear Dark, Tinted Light and Tinted Dark; there is no separately named Chrome export. Preserve the current tint when exporting the tinted appearances. Rename the exported PNGs to the paths above without resampling.

The export keeps the app's macOS padding. Glass is flattened into the images; it does not dynamically refract a website background. The assets were visually reviewed after export, including a Mono contrast refinement. Dimension, alpha and checksum evidence is in `work/icon-composer-20260909/verification.json` at the workspace root.

Reference: [Apple's Icon Composer guide](https://developer.apple.com/documentation/xcode/creating-your-app-icon-using-icon-composer).

## Default identity and adoption

The owner subsequently requested black and white as the default. `BRAND_APP_ICON` selects the Clear Dark artwork: a charcoal tile with a silver/white Join mark. The original six Composer filenames retain Apple's export appearance names; "Default" in that archive is the original cobalt variant, not the website's selected default.

`pnpm brand:generate` reads that one master to produce the site's header images, 96px native PNG icon, 16/32/48/64/96px ICO entries, 192/512px manifest icons and the icon in the shared README/social banner. The Apple touch icon removes the outer macOS margin and shadow and fills the square corners because the platform masks it. The maskable icon uses the same monochrome identity with a simplified SVG silhouette inside its safe zone. Do not label the padded macOS export as maskable.

The landing, playground and showcase headers share `BrandIcon`. Its image is decorative, with fixed dimensions and the existing accessible home-link names. The compact showcase footer retains the inherited-color SVG mark. No theme script or animation is needed for the app icon.

The root README uses the repository's `readme-banner.png`; the package README, including published npm 0.1.1, references the same image at the website's public URL. Deploying the updated image updates that shared artwork without publishing a package version. Third-party image caches can delay the visible change.

## Small-size rules

The master has a 4-unit neck, approximately 2px at a 16px viewBox render. Use at 16px or larger. Keep the built-in optical margins, and leave clear space when placing the mark beside other content. For app/home-screen icons use the generated filled tile; use the maskable asset where a platform applies its own shape mask. Do not add thin outlines, shadows, extra dots or gradients to establish recognition. Color variants share identical geometry.

The optional cobalt seed remains #4655F5; the default app presentation is monochrome. Flat monochrome symbols inherit text color in the website. Color does not carry identification on its own. The social/README artwork retains a light surface in both document themes so the mark, typography and photograph stay legible.
