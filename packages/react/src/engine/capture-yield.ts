// Async clone traversal otherwise stays in one long microtask chain. Let input
// and pending glass draws run between bounded batches of DOM/style work.
export function captureYield() {
  let start = performance.now();
  return async () => {
    if (performance.now() - start < 6) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    start = performance.now();
  };
}
