export function includesCaptureNode(input: HTMLElement): boolean {
  const node: Node = input;
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return true;
  if (element.closest("[data-liquid-layer], [data-liquid-overlay]")) return false;
  const host = element.closest<HTMLElement>("[data-liquid-host]");
  return !(
    host && node !== host &&
    host.dataset.liquidEnabled === "true" && host.dataset.liquidMode === "sharp"
  );
}
