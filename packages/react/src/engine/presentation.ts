// A viewport-anchored surface has to repaint as the page scrolls underneath it.
// One dedicated context avoids copying its WebGL output back through Canvas 2D.
// Other surfaces still share the existing renderer and keep their DOM stacking.
export function isViewportAnchored(host: HTMLElement): boolean {
  for (let node: HTMLElement | null = host; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position === "fixed" || style.position === "sticky") return true;
  }
  return false;
}
