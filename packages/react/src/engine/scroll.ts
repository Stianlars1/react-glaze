type Position = readonly [number, number];

export function createScrollFollower(
  read: () => Position,
  changed: () => void,
  active: () => boolean = () => true,
) {
  let last = read(),
    frame = 0,
    quietFrames = 0,
    disposed = false;
  const stop = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
  const sample = () => {
    const next = read();
    if (next[0] === last[0] && next[1] === last[1]) return false;
    last = next;
    changed();
    return true;
  };
  const tick = () => {
    frame = 0;
    if (disposed || !active()) return;
    quietFrames = sample() ? 0 : quietFrames + 1;
    if (quietFrames < 12) frame = requestAnimationFrame(tick);
  };
  return {
    notify() {
      if (disposed || !active()) {
        stop();
        return;
      }
      sample();
      quietFrames = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    },
    finish() {
      if (!disposed && active()) sample();
      stop();
    },
    stop,
    dispose() {
      disposed = true;
      stop();
    },
  };
}

const listeners = new Set<{ changed: () => void; active: () => boolean }>();
let cleanup: (() => void) | undefined;

// One follower for the document, shared across all backdrop roots. Native scroll
// events can omit positions that Safari exposes in intervening animation frames.
export function observeDocumentScroll(
  changed: () => void,
  active: () => boolean,
  signal: AbortSignal,
) {
  if (signal.aborted) return;
  const listener = { changed, active };
  listeners.add(listener);
  if (!cleanup) {
    const controller = new AbortController();
    const options = { passive: true, signal: controller.signal };
    const follower = createScrollFollower(
      () => [window.scrollX, window.scrollY],
      () => {
        for (const listener of listeners)
          if (listener.active()) listener.changed();
      },
      () =>
        !document.hidden &&
        [...listeners].some((listener) => listener.active()),
    );
    window.addEventListener(
      "scroll",
      (event) => {
        if (event.target === document || event.target === window)
          follower.notify();
      },
      options,
    );
    document.addEventListener(
      "scrollend",
      (event) => {
        if (event.target === document) follower.finish();
      },
      options,
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        if (document.hidden) follower.stop();
      },
      options,
    );
    cleanup = () => {
      follower.dispose();
      controller.abort();
      cleanup = undefined;
    };
  }
  signal.addEventListener(
    "abort",
    () => {
      listeners.delete(listener);
      if (!listeners.size) cleanup?.();
    },
    { once: true },
  );
}
