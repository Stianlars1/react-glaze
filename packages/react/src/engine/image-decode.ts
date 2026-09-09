interface ImageDecode {
  key: string;
  state: "pending" | "decoded" | "failed" | "stale";
  promise: Promise<void>;
}
const entries = new WeakMap<HTMLImageElement, ImageDecode>();
function key(image: HTMLImageElement) {
  return `${image.currentSrc}|${image.naturalWidth}|${image.naturalHeight}|${image.src}|${image.srcset}|${image.sizes}`;
}
export function decodedImage(image: HTMLImageElement): ImageDecode {
  const identity = key(image),
    previous = entries.get(image);
  if (previous?.key === identity) return previous;
  const entry: ImageDecode = {
    key: identity,
    state: "pending",
    promise: Promise.resolve(),
  };
  entries.set(image, entry);
  entry.promise = image.decode().then(
    () => {
      entry.state = key(image) === identity ? "decoded" : "stale";
    },
    () => {
      entry.state = "failed";
    },
  );
  return entry;
}
