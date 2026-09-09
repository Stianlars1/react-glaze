// An empty, unpainted wrapper has no foreground pixels to recapture when it
// moves. Be conservative for DOM content, pseudo-elements and box decoration.
export function hasCapturedAppearance(host: HTMLElement): boolean {
  for (const child of host.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim())
      return true;
    if (
      child instanceof Element &&
      !child.matches("[data-liquid-layer], [data-liquid-overlay]")
    )
      return true;
  }
  const style = getComputedStyle(host);
  if (
    !["transparent", "rgba(0, 0, 0, 0)"].includes(style.backgroundColor) ||
    style.backgroundImage !== "none" ||
    style.boxShadow !== "none"
  )
    return true;
  if (
    [
      style.borderTopWidth,
      style.borderRightWidth,
      style.borderBottomWidth,
      style.borderLeftWidth,
    ].some((value) => parseFloat(value) > 0)
  )
    return true;
  if (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0)
    return true;
  return ["::before", "::after"].some((pseudo) => {
    const style = getComputedStyle(host, pseudo);
    return (
      style.display !== "none" && !["none", "normal"].includes(style.content)
    );
  });
}
