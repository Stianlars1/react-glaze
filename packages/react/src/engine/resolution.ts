const MAX_SOURCE_PIXELS = 2_097_152;
const MAX_SOURCE_DIMENSION = 4096;

export function boundedPixelRatio(
  width: number,
  height: number,
  requested: number,
) {
  return Math.min(
    requested,
    MAX_SOURCE_DIMENSION / Math.max(1, width, height),
    Math.sqrt(MAX_SOURCE_PIXELS / Math.max(1, width * height)),
  );
}
export function backdropSize(root: HTMLElement) {
  const style = getComputedStyle(root);
  return {
    width:
      root.clientWidth +
      parseFloat(style.borderLeftWidth) +
      parseFloat(style.borderRightWidth),
    height:
      root.clientHeight +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth),
  };
}

export function drawingBufferSize(
  currentWidth: number,
  currentHeight: number,
  width: number,
  height: number,
) {
  const grownWidth = Math.max(currentWidth, width),
    grownHeight = Math.max(currentHeight, height);
  return grownWidth * grownHeight <= MAX_SOURCE_PIXELS
    ? { width: grownWidth, height: grownHeight }
    : { width, height };
}
