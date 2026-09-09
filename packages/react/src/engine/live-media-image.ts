const opacityCache = new WeakMap<
  HTMLImageElement,
  { key: string; opaque: boolean }
>();
export function imageKey(image: HTMLImageElement) {
  return `${image.currentSrc}|${image.naturalWidth}|${image.naturalHeight}|${image.src}|${image.srcset}|${image.sizes}|${image.getAttribute("style")}`;
}
export function opaqueImage(image: HTMLImageElement) {
  const key = `${image.currentSrc}|${image.naturalWidth}|${image.naturalHeight}`;
  const cached = opacityCache.get(image);
  if (cached?.key === key) return cached.opaque;
  if (
    !image.complete ||
    !image.naturalWidth ||
    image.naturalWidth * image.naturalHeight > 4_194_304
  )
    return false;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  let opaque = false;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    opaque = true;
    for (let i = 3; i < pixels.length; i += 4)
      if (pixels[i] !== 255) {
        opaque = false;
        break;
      }
  } catch {
    /* Native media without origin-clean pixels retains the SVG source path. */
  } finally {
    canvas.width = canvas.height = 0;
  }
  opacityCache.set(image, { key, opaque });
  return opaque;
}
export function supportsLiveImage(root: HTMLElement, image: HTMLImageElement) {
  if (!root.contains(image) || !image.complete || !image.naturalWidth)
    return false;
  const source = new URL(image.currentSrc || image.src, image.baseURI);
  if (
    source.protocol !== "data:" &&
    source.origin !== location.origin &&
    !image.hasAttribute("crossorigin")
  )
    return false;
  const style = getComputedStyle(image);
  if (
    style.objectFit !== "cover" ||
    style.imageRendering !== "auto" ||
    !/^-?[\d.]+%\s+-?[\d.]+%$/.test(style.objectPosition)
  )
    return false;
  if (
    [
      style.paddingTop,
      style.paddingRight,
      style.paddingBottom,
      style.paddingLeft,
      style.borderTopWidth,
      style.borderRightWidth,
      style.borderBottomWidth,
      style.borderLeftWidth,
    ].some((value) => parseFloat(value) !== 0)
  )
    return false;
  for (let node: HTMLElement | null = image; node; node = node.parentElement) {
    const s = getComputedStyle(node);
    if (
      s.position === "fixed" ||
      s.position === "sticky" ||
      s.transform !== "none" ||
      s.perspective !== "none" ||
      s.filter !== "none" ||
      s.mixBlendMode !== "normal" ||
      (s.backdropFilter && s.backdropFilter !== "none")
    )
      return false;
    if (node === root) break;
  }
  return true;
}
export function findLiveImage(root: HTMLElement) {
  // A single sizeable media plane bounds template memory and preparation cost.
  const candidates = [...root.querySelectorAll("img")]
    .filter((image) => {
      if (
        image.closest(
          "[data-liquid-host], [data-liquid-overlay], [data-liquid-layer]",
        )
      )
        return false;
      const rect = image.getBoundingClientRect();
      return (
        rect.width * rect.height >= 100_000 && supportsLiveImage(root, image)
      );
    })
    .sort(
      (a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight,
    );
  if (!candidates.length) return undefined;
  // A backdrop filter or nonlinear blend can make pixels outside the media box
  // depend on that image. There is no local affine reconstruction in that case.
  for (const node of root.querySelectorAll("*")) {
    if (node.closest("[data-liquid-layer], [data-liquid-overlay]")) continue;
    const style = getComputedStyle(node);
    if (
      style.mixBlendMode !== "normal" ||
      (style.backdropFilter && style.backdropFilter !== "none")
    )
      return undefined;
  }
  return candidates[0];
}
