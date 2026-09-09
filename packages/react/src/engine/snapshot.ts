// SVG assembly follows html-to-image 1.11.13 (MIT); see THIRD-PARTY-NOTICES.md.
import type { Options } from "html-to-image/lib/types.js";
import { embedImages } from "html-to-image/lib/embed-images.js";
import { embedWebFonts } from "html-to-image/lib/embed-webfonts.js";
import { applyStyle } from "html-to-image/lib/apply-style.js";
import { nodeToDataURL } from "html-to-image/lib/util.js";
import { cloneNode } from "./clone-node.js";
import type { CaptureRegion } from "./capture-regions.js";

async function prepareSnapshot(
  root: HTMLElement,
  options: Options & {
    width: number;
    height: number;
    imageSource?: (node: HTMLImageElement) => string | undefined;
    onImageClone?: (original: HTMLImageElement, clone: HTMLImageElement) => void;
  },
  region?: CaptureRegion,
) {
  const clone = (await cloneNode(
    root,
    { ...options, prune: region?.prune },
    true,
  ))!;
  await embedWebFonts(clone, options);
  await embedImages(clone, options);
  applyStyle(clone, options);
  return clone;
}

export async function snapshotSvg(
  root: HTMLElement,
  options: Options & { width: number; height: number },
  region?: CaptureRegion,
) {
  const clone = await prepareSnapshot(root, options, region);
  // Keep the HTML viewport unchanged. A translated, region-sized SVG viewport
  // can cull visible text inside foreignObject in WebKit. Crop during drawing.
  return nodeToDataURL(clone, options.width, options.height);
}

export async function snapshotImageControls(
  root: HTMLElement,
  image: HTMLImageElement,
  options: Options & { width: number; height: number },
  sources: readonly string[],
  region?: CaptureRegion,
) {
  const targets: HTMLImageElement[] = [];
  const clone = await prepareSnapshot(root, {
    ...options,
    imageSource: (node) => node === image ? sources[0] : undefined,
    onImageClone: (original, target) => {
      if (original === image) targets.push(target);
    },
  }, region);
  const snapshots: string[] = [];
  for (const source of sources) {
    for (const target of targets) target.src = source;
    // The upstream serializer reparents the clone and reads it asynchronously.
    // Finish that read before another substitution; only strings leave this scope.
    snapshots.push(await nodeToDataURL(clone, options.width, options.height));
  }
  return snapshots;
}
