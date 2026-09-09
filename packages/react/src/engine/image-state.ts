export function rememberImageState(image: HTMLImageElement) {
  return {
    src: image.currentSrc || image.src,
    complete: image.complete,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}
export function imageStateChanged(
  image: HTMLImageElement,
  previous?: ReturnType<typeof rememberImageState>,
) {
  const current = rememberImageState(image);
  return !previous || current.src !== previous.src ||
    current.complete !== previous.complete || current.width !== previous.width ||
    current.height !== previous.height;
}
