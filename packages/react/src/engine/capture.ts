import type { Options } from "html-to-image/lib/types.js";
import { createImage } from "html-to-image/lib/util.js";
import { snapshotSvg, snapshotImageControls } from "./snapshot.js";
import { backdropSize } from "./resolution.js";
import type { CaptureRegion } from "./capture-regions.js";
export type CaptureOptions = Options & {
  imageSource?: (node: HTMLImageElement) => string | undefined;
};

export async function captureBackdrop(
  root: HTMLElement,
  options: CaptureOptions = {},
  region?: CaptureRegion,
) {
  const { width, height } = backdropSize(root);
  const svg = await snapshotSvg(root, { ...options, width, height }, region);
  return rasterizeSnapshot(svg, width, height, options.pixelRatio ?? 1, region);
}

export async function captureImageControls(
  root: HTMLElement,
  image: HTMLImageElement,
  options: CaptureOptions,
  controls: readonly { source: string; region?: CaptureRegion }[],
) {
  const { width, height } = backdropSize(root);
  const groups = new Map<CaptureRegion | undefined, number[]>();
  for (const [index, control] of controls.entries()) {
    const group = groups.get(control.region) ?? [];
    group.push(index);
    groups.set(control.region, group);
  }
  const snapshots: string[] = [];
  for (const [region, indices] of groups) {
    const prepared = await snapshotImageControls(
      root, image, { ...options, width, height },
      indices.map((index) => controls[index].source), region,
    );
    indices.forEach((index, offset) => { snapshots[index] = prepared[offset]; });
  }
  // Each immutable SVG owns its decode, first draw and Safari settling interval.
  // Wait for all siblings even on failure so no completed canvas loses its owner.
  const results = await Promise.allSettled(snapshots.map((svg, index) =>
    rasterizeSnapshot(svg, width, height, options.pixelRatio ?? 1, controls[index].region),
  ));
  const failure = results.find((result) => result.status === "rejected");
  const canvases: HTMLCanvasElement[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    if (failure) result.value.width = result.value.height = 0;
    else canvases.push(result.value);
  }
  if (failure) throw failure.reason;
  return canvases;
}

async function rasterizeSnapshot(
  svg: string,
  width: number,
  height: number,
  pixelRatio: number,
  region?: CaptureRegion,
) {
  const webkit =
    /AppleWebKit/.test(navigator.userAgent) &&
    !/(Chrome|Chromium|Edg)\//.test(navigator.userAgent);
  const image = webkit ? new Image() : await createImage(svg);
  if (webkit) {
    image.decoding = "async";
    image.src = svg;
    await image.decode();
  }
  const canvas = document.createElement("canvas");
  canvas.width =
    region?.width ?? Math.max(1, Math.floor(width * pixelRatio));
  canvas.height =
    region?.height ??
    Math.max(1, Math.floor(height * pixelRatio));
  try {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    const draw = () => {
      if (region) {
        const { left, top, right, bottom } = region.css;
        context.drawImage(
          image, left, top, right - left, bottom - top,
          0, 0, canvas.width, canvas.height,
        );
      } else context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    // Safari may resolve SVG decoding before painting embedded PNGs. Give its
    // image pipeline a bounded settling interval before using the snapshot.
    draw();
    if (webkit) {
      await new Promise<void>((resolve) => setTimeout(resolve, 120));
      context.clearRect(0, 0, canvas.width, canvas.height);
      draw();
    }
    return canvas;
  } catch (error) {
    canvas.width = canvas.height = 0;
    throw error;
  }
}
