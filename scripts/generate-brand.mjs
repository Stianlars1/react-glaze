import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, dirname, join } from "node:path";
import sharp from "sharp";
import { BRAND_APP_ICON, BRAND_COLOR, BRAND_MARK_PATH } from "../apps/demo/src/lib/brand.ts";
import { WORDMARK_PATH, WORDMARK_WIDTH } from "../apps/demo/src/lib/brand-wordmark.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brand = join(root, "apps/demo/public/brand");
const app = join(root, "apps/demo/src/app");
await mkdir(brand, { recursive: true });
const svg = (body, width = 32, height = width) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${body}</svg>`;
const mark = (color) => `<path fill="${color}" d="${BRAND_MARK_PATH}"/>`;
const maskableTile = svg(`<rect width="32" height="32" fill="#292929"/>
  <g transform="translate(4 4) scale(.75)">${mark("#fff")}</g>`);
const png = (source, width) => sharp(Buffer.from(source), { density: 192 }).resize(width, width).png().toBuffer();
const appIcon = await readFile(join(root, "apps/demo/public", BRAND_APP_ICON));
const appIconPng = (width) => sharp(appIcon).resize(width, width).png().toBuffer();

for (const [name, color] of [["logo", BRAND_COLOR], ["logo-black", "#17181b"], ["logo-white", "#fff"]]) {
  await writeFile(join(brand, `${name}.svg`), svg(`<title>React Glaze</title>${mark(color)}`) + "\n");
  const lockup = svg(`<title>React Glaze</title><g transform="translate(0 4)">${mark(color)}</g><path transform="translate(42 0)" fill="${color}" d="${WORDMARK_PATH}"/>`, Math.ceil(WORDMARK_WIDTH + 42), 40);
  await writeFile(join(brand, `${name}-lockup.svg`), lockup + "\n");
}
await writeFile(join(app, "icon.png"), await appIconPng(96));
for (const size of [192, 512]) await writeFile(join(brand, `icon-${size}.png`), await appIconPng(size));
await writeFile(join(brand, "icon-maskable-512.png"), await png(maskableTile, 512));
// Apple applies its own mask: trim the transparent margin and soft outer shadow.
await writeFile(join(app, "apple-icon.png"), await sharp(appIcon)
  .trim({ background: "#00000000", threshold: 128 })
  .flatten({ background: "#292929" }).resize(180, 180).png().toBuffer());

// PNG entries in an ICO container preserve the exact small-size renders.
const sizes = [16, 32, 48, 64, 96];
const entries = await Promise.all(sizes.map(appIconPng));
const header = Buffer.alloc(6 + 16 * entries.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
for (const [i, data] of entries.entries()) {
  const entry = 6 + i * 16;
  header[entry] = sizes[i]; header[entry + 1] = sizes[i];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
}
await writeFile(join(app, "favicon.ico"), Buffer.concat([header, ...entries]));

// The hero uses a real screenshot of the live glass scene, supplied after browser QA.
const screenshot = join(brand, "material-scene.png");
try {
  const photo = await sharp(await readFile(screenshot)).resize(554, 550, { fit: "cover" }).png().toBuffer();
  const bannerIcon = await appIconPng(144);
  const background = svg(`<rect width="1200" height="630" fill="#fafafb"/>
    <path transform="translate(64 266) scale(2.15)" fill="#17181b" d="${WORDMARK_PATH}"/>
    <text x="64" y="372" font-family="Helvetica,Arial,sans-serif" font-size="26" fill="#4d4f58">Liquid glass for React.</text>
    <text x="64" y="468" font-family="monospace" font-size="17" fill="#4d4f58">npm install react-glaze</text>`, 1200, 630);
  const banner = await sharp(Buffer.from(background)).composite([
    { input: bannerIcon, left: 50, top: 104 },
    { input: photo, left: 606, top: 40 },
  ]).png().toBuffer();
  await writeFile(join(brand, "readme-banner.png"), banner);
  await writeFile(join(app, "opengraph-image.png"), banner);
  await writeFile(join(app, "twitter-image.png"), banner);
  const alt = "React Glaze - Liquid glass for React. A black app icon with the silver Join mark beside a real glass component over a cobalt ceramic and coral textile scene.\n";
  await writeFile(join(app, "opengraph-image.alt.txt"), alt);
  await writeFile(join(app, "twitter-image.alt.txt"), alt);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  console.log("Icons and logos generated. Add public/brand/material-scene.png, then rerun for README/social images.");
}
console.log("Generated React Glaze brand assets from the shared Join mark.");
