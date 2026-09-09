import { useEffect, useRef, useState } from "react";
export interface CustomBackground {
  src: string;
  name: string;
  width: number;
  height: number;
}
const accepted = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/avif",
]);
export function useCustomBackground() {
  const [image, setImage] = useState<CustomBackground | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const revision = useRef(0);
  useEffect(
    () => () => {
      revision.current++;
    },
    [],
  );
  const load = async (file: File) => {
    const id = ++revision.current;
    setError("");
    if (!accepted.has(file.type)) {
      setLoading(false);
      setError("Choose a PNG, JPG, WebP or AVIF image.");
      return false;
    }
    if (file.size > 12 * 1024 * 1024) {
      setLoading(false);
      setError("Choose an image smaller than 12 MB.");
      return false;
    }
    setLoading(true);
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      if (!img.naturalWidth || !img.naturalHeight)
        throw new Error("Empty image");
      const scale = Math.min(
        1,
        4096 / Math.max(img.naturalWidth, img.naturalHeight),
        Math.sqrt(4194304 / (img.naturalWidth * img.naturalHeight)),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.floor(img.naturalHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const next = {
        src: canvas.toDataURL("image/png"),
        name: file.name,
        width: canvas.width,
        height: canvas.height,
      };
      canvas.width = canvas.height = 0;
      if (id !== revision.current) return false;
      setImage(next);
      return true;
    } catch {
      if (id === revision.current)
        setError("This image could not be decoded. Try another file.");
      return false;
    } finally {
      URL.revokeObjectURL(url);
      if (id === revision.current) setLoading(false);
    }
  };
  return {
    image,
    error,
    loading,
    load,
    remove() {
      revision.current++;
      setImage(null);
      setError("");
      setLoading(false);
    },
  };
}
