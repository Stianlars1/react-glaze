# Asset provenance

## Roam photographs

Photographs were downloaded on 2026-09-07 at 2000px width, JPEG quality 85, and are served locally. Next.js supplies responsive optimized variants. These are ordinary page images; they are not pre-rendered glass backgrounds.

| Local file | Photographer | Source |
| --- | --- | --- |
| `public/images/funningur.jpg` | Lachlan Gowen | https://unsplash.com/photos/i16MLz7WmBQ |
| `public/images/gasadalur.jpg` | Marc Zimmer | https://unsplash.com/photos/o7FDNTDJOZg |
| `public/images/lighthouse.jpg` | Agnieszka Blaszczyk | https://unsplash.com/photos/DzVgE9gfugM |

The source pages identify the photos as free under the [Unsplash License](https://unsplash.com/license). The lighthouse item is explicitly inspiration, without an asserted exact route or geolocation.

## Playground artwork

`public/backgrounds/spectrum.png`, `alpine.png` and `dunes.png` are original AI-generated wallpaper assets created for this project on 2026-09-07. The migration preserves the original files without alteration. No Apple wallpaper is distributed.

The Optical Type background is drawn locally from the pinned Drawn To artwork instructions. Its Inter and Geist Mono text is rasterized by the playground; the glass is rendered by `react-glaze`. Drawn To attribution and its MIT notice are retained in the [package notices](../../packages/react/THIRD-PARTY-NOTICES.md).

## Fonts and icons

The two original apps contained byte-identical font files and OFL notices. The demo shares one copy of each under `public/fonts/`:

| Font | File | License notice |
| --- | --- | --- |
| Inter 600 | `inter-600.ttf` | `Inter-OFL.txt` |
| Geist Mono 400 | `geist-mono-400.ttf` | `Geist-Mono-OFL.txt` |

Roam registers Inter as `Roam Inter` to isolate its font family from the playground's canvas font registration. Roam's body uses the system's Helvetica/Arial stack.

Icons are small project-authored inline SVG paths, rendered with currentColor. No external icon service, remote font request or runtime image host is required.


## Landing artwork

The three original material studies in `public/art/soft.png`, `metal.png` and `garden.png` were generated with OpenAI's built-in image generation tool on September 9, 2026 for React Glaze. They are artworks, not photographs of existing products or simulated environments. No text, interface or glass overlay is painted into them. The actual `LiquidGlass` component supplies the interactive refraction in the app.

[Art direction and generation prompts](docs/art-direction.md). The generated source files are retained unchanged; Next Image provides responsive delivery. The original generated files also remain in the local Codex output directory.
