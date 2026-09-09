// Computed border radii retain percentages and sometimes CSS math. Relative
// units and custom properties have already been resolved by the browser.
export function resolveCssLength(value: string, reference: number): number {
  const tokens =
    value.match(
      /(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?(?:px|%)?|[a-z-]+|[()+*/,-]/gi,
    ) ?? [];
  if (tokens.join("") !== value.replace(/\s/g, "") || !tokens.length)
    throw new Error(`Unsupported computed border radius: ${value}`);
  let index = 0;
  const fail = (): never => {
    throw new Error(`Unsupported computed border radius: ${value}`);
  };
  function atom(): number {
    const token = tokens[index++];
    if (token === "+" || token === "-")
      return (token === "-" ? -1 : 1) * atom();
    if (token === "(") {
      const result = expression();
      if (tokens[index++] !== ")") return fail();
      return result;
    }
    if (token && /^(?:\d|\.)/.test(token)) {
      const number = parseFloat(token);
      return token.endsWith("%") ? (number * reference) / 100 : number;
    }
    if (
      !["calc", "min", "max", "clamp"].includes(token) ||
      tokens[index++] !== "("
    )
      return fail();
    const args = [expression()];
    while (tokens[index] === ",") {
      index++;
      args.push(expression());
    }
    if (tokens[index++] !== ")") return fail();
    if (token === "calc") return args.length === 1 ? args[0] : fail();
    if (token === "min") return Math.min(...args);
    if (token === "max") return Math.max(...args);
    return args.length === 3
      ? Math.max(args[0], Math.min(args[1], args[2]))
      : fail();
  }
  function product(): number {
    let result = atom();
    while (tokens[index] === "*" || tokens[index] === "/") {
      const operator = tokens[index++],
        right = atom();
      result = operator === "*" ? result * right : result / right;
    }
    return result;
  }
  function expression(): number {
    let result = product();
    while (tokens[index] === "+" || tokens[index] === "-") {
      const operator = tokens[index++],
        right = product();
      result = operator === "+" ? result + right : result - right;
    }
    return result;
  }
  const result = expression();
  if (index !== tokens.length || !Number.isFinite(result)) return fail();
  return Math.max(0, result);
}
