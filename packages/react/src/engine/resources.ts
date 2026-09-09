export async function waitForCaptureImages(
  root: HTMLElement,
  includes: (node: HTMLElement) => boolean,
  signal: AbortSignal,
): Promise<void> {
  signal.throwIfAborted();
  while ([...root.querySelectorAll("img")].some(
    image => !image.complete && image.loading !== "lazy" && includes(image),
  )) {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        observer.disconnect();
        root.removeEventListener("load", changed, true);
        root.removeEventListener("error", changed, true);
        signal.removeEventListener("abort", cancelled);
      };
      const changed = () => { cleanup(); resolve(); };
      const cancelled = () => { cleanup(); reject(signal.reason); };
      const observer = new MutationObserver(changed);
      observer.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["src", "srcset", "sizes", "loading"],
      });
      root.addEventListener("load", changed, true);
      root.addEventListener("error", changed, true);
      signal.addEventListener("abort", cancelled, { once: true });
    });
    signal.throwIfAborted();
  }
}
