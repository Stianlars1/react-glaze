const edges = ["top", "right", "bottom", "left"] as const;

export function preserveAutoMargins(
  source: HTMLElement,
  resolved: CSSStyleDeclaration,
  target: CSSStyleDeclaration,
) {
  if (typeof source.computedStyleMap !== "function") return;
  const computed = source.computedStyleMap();
  const automatic = edges.map(
    (edge) => String(computed.get(`margin-${edge}`)) === "auto",
  );
  if (!automatic.some(Boolean)) return;

  // Resolved auto margins can report zero after layout while the actual box
  // stays centered. Preserve the computed keyword and let the clone lay it out.
  const values = edges.map((edge, index) =>
    automatic[index] ? "auto" : resolved.getPropertyValue(`margin-${edge}`),
  );
  // Logical declarations copied later in CSS order must not override these
  // physical edges, including RTL and vertical writing modes.
  for (const name of [
    "margin-block", "margin-block-start", "margin-block-end",
    "margin-inline", "margin-inline-start", "margin-inline-end",
    "-webkit-margin-before", "-webkit-margin-after",
    "-webkit-margin-start", "-webkit-margin-end",
  ]) target.removeProperty(name);
  target.setProperty("margin", values.join(" "));
}
