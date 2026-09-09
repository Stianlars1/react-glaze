let tail: Promise<unknown> = Promise.resolve();

// Serialise DOM reconstruction across backdrop roots, not just within a root.
// Rejections must not poison the queue; unmounted work never starts capturing.
export function withCaptureLock<T>(
  signal: AbortSignal,
  capture: () => Promise<T>,
): Promise<T> {
  const next = tail.then(() => {
    signal.throwIfAborted();
    return capture();
  });
  tail = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
