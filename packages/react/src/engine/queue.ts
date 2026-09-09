import { engineFrames } from "./frames.js";

interface QueueOptions<T> {
  capture: (begin: () => void) => Promise<T>;
  captureInterval?: number;
  commit: (value: T) => void;
  render: () => void;
  release: (value: T) => void;
  onError: (error: unknown) => void;
}
export function createQueue<T>({
  capture,
  captureInterval = 0,
  commit,
  render,
  release,
  onError,
}: QueueOptions<T>) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let nextCaptureAt = 0;
  const metrics = { captureAttempts: 0, discardedCaptures: 0 };
  const cancelled = new Error("Capture is no longer active");
  const discard = (value: T) => {
    metrics.discardedCaptures++;
    release(value);
  };
  let raf = 0,
    revision = 0,
    dirty = false,
    viewDirty = false,
    inFlight = false,
    disposed = false,
    active = true;
  let staged: { revision: number; value: T } | null = null;
  function schedule() {
    if (disposed || !active || raf) return;
    if (staged || viewDirty) {
      raf = engineFrames.request(flush);
      return;
    }
    if (!dirty || inFlight || timer) return;
    const delay = nextCaptureAt - performance.now();
    if (delay > 0)
      timer = setTimeout(() => {
        timer = undefined;
        schedule();
      }, delay);
    else raf = engineFrames.request(flush);
  }
  function flush() {
    raf = 0;
    if (disposed || !active) return;
    if (staged) {
      const next = staged;
      staged = null;
      if (next.revision === revision) {
        commit(next.value);
        viewDirty = true;
      } else discard(next.value);
    }
    if (dirty && !inFlight && performance.now() >= nextCaptureAt) {
      dirty = false;
      inFlight = true;
      let version = revision;
      capture(() => {
        if (disposed || !active) throw cancelled;
        // A root can wait for resources and the global lock. Changes during
        // that wait belong to the snapshot about to start, not a stale one.
        version = revision;
        dirty = false;
        nextCaptureAt = performance.now() + captureInterval;
        metrics.captureAttempts++;
      }).then(
        (value) => {
          inFlight = false;
          if (disposed) {
            discard(value);
            return;
          }
          if (!active || version !== revision) {
            discard(value);
            dirty = true;
          } else staged = { revision: version, value };
          schedule();
        },
        (error) => {
          inFlight = false;
          if (!disposed) {
            if (error !== cancelled) onError(error);
            schedule();
          }
        },
      );
    }
    if (viewDirty) {
      viewDirty = false;
      render();
    }
    schedule();
  }
  return {
    get metrics() {
      return { ...metrics };
    },
    sourceChanged(continuous = false) {
      if (disposed) return;
      if (!continuous) revision++;
      dirty = true;
      schedule();
    },
    viewChanged() {
      if (disposed) return;
      viewDirty = true;
      schedule();
    },
    setActive(next: boolean) {
      if (disposed || active === next) return;
      active = next;
      revision++;
      dirty = true;
      viewDirty = false;
      if (staged) discard(staged.value);
      staged = null;
      if (!active && timer) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (!active && raf) {
        engineFrames.cancel(raf);
        raf = 0;
      }
      schedule();
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (raf) engineFrames.cancel(raf);
      raf = 0;
      if (staged) discard(staged.value);
      staged = null;
    },
  };
}
