// One callback for the engine keeps promise continuations from starting a DOM
// capture between two roots' draws in the same rendering opportunity.
export function createFrameBatch() {
  const pending = new Map<number, () => void>();
  let frame = 0,
    token = 0,
    flushing = false;
  const schedule = () => {
    if (frame || flushing || !pending.size) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      flushing = true;
      try {
        for (const [id, callback] of [...pending]) {
          if (!pending.delete(id)) continue;
          try {
            callback();
          } catch (error) {
            queueMicrotask(() => {
              throw error;
            });
          }
        }
      } finally {
        flushing = false;
        schedule();
      }
    });
  };
  return {
    request(callback: () => void) {
      const id = ++token;
      pending.set(id, callback);
      schedule();
      return id;
    },
    cancel(id: number) {
      pending.delete(id);
      if (!pending.size && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
  };
}
export const engineFrames = createFrameBatch();
