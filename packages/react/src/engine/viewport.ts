interface LayoutViewport {
  width: number;
  height: number;
  dpr: number;
}

export function readLayoutViewport(): LayoutViewport {
  return {
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    dpr: devicePixelRatio || 1,
  };
}

// Mobile browser chrome can resize the visual viewport while layout stays fixed.
// Keep a final refresh for viewport-dependent paint, without recapturing during the gesture.
export function createViewportInvalidation(
  initial: LayoutViewport,
  invalidate: () => void,
) {
  let viewport = initial;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const defer = () => {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      invalidate();
    }, 250);
  };
  return {
    resize(next: LayoutViewport) {
      if (disposed) return;
      const changed =
        next.width !== viewport.width ||
        next.height !== viewport.height ||
        next.dpr !== viewport.dpr;
      viewport = next;
      if (changed) {
        cancel();
        invalidate();
      } else defer();
    },
    scroll() {
      if (!disposed && timer !== undefined) defer();
    },
    cancel,
    dispose() {
      disposed = true;
      cancel();
    },
  };
}
