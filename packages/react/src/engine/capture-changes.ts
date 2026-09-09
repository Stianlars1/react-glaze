export function selectorNeedsFullCapture(selector: string) {
  return /:has\s*\(|\[\s*(?:src|srcset|sizes|alt|style)\b/i.test(selector);
}

// Image resource/style changes and nonempty text do not alter ordinary selector
// matching. Relational or attribute-dependent rules invalidate that assumption.
export function permitsRegionalCapture(document: Document): boolean {
  function inspect(rules: CSSRuleList): boolean {
    return Array.from(rules).every((rule) => {
      if (
        rule instanceof CSSStyleRule &&
        selectorNeedsFullCapture(rule.selectorText)
      )
        return false;
      if (
        "conditionText" in rule &&
        /style\s*\(/i.test(String(rule.conditionText))
      )
        return false;
      if (rule instanceof CSSImportRule)
        return rule.styleSheet ? inspect(rule.styleSheet.cssRules) : false;
      if ("cssRules" in rule) return inspect(rule.cssRules as CSSRuleList);
      return true;
    });
  }
  try {
    return [
      ...Array.from(document.styleSheets),
      ...document.adoptedStyleSheets,
    ].every((sheet) => inspect(sheet.cssRules));
  } catch {
    // A stylesheet whose rules cannot be inspected can contain dependencies on
    // the changed attributes. Preserve the full-source route in that case.
    return false;
  }
}

function onlyObjectPositionChanged(
  oldValue: string | null,
  element: HTMLImageElement,
) {
  const before = document.createElement("span").style;
  const after = document.createElement("span").style;
  before.cssText = oldValue ?? "";
  after.cssText = element.getAttribute("style") ?? "";
  before.removeProperty("object-position");
  after.removeProperty("object-position");
  return before.cssText === after.cssText;
}

export function regionalChange(record: MutationRecord): Element | undefined {
  if (
    record.type === "characterData" &&
    record.oldValue?.trim() &&
    record.target.textContent?.trim()
  )
    return record.target.parentElement ?? undefined;
  if (
    record.type !== "attributes" ||
    !(record.target instanceof HTMLImageElement)
  )
    return;
  const name = record.attributeName ?? "";
  if (["src", "srcset", "sizes", "alt"].includes(name)) return record.target;
  if (
    name === "style" &&
    onlyObjectPositionChanged(record.oldValue, record.target)
  )
    return record.target;
}
