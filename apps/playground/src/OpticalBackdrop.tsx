import { useEffect, useRef, useState } from "react";
import { drawOpticalArtwork, loadOpticalFonts } from "./opticalArtwork";
export function OpticalBackdrop() {
  const anchor = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    let disposed = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    let lastSize = "";
    const paint = async () => {
      try {
        await loadOpticalFonts();
        if (disposed || !anchor.current) return;
        const r = anchor.current.getBoundingClientRect();
        const size = [r.width, r.height].join(":");
        if (r.width > 0 && r.height > 0 && size !== lastSize) {
          lastSize = size;
          setSrc(drawOpticalArtwork(r.width, r.height).toDataURL());
        }
      } catch {
        if (!disposed)
          setError("Could not load the reference artwork. Reload to retry.");
      }
    };
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(paint, 80);
    });
    observer.observe(anchor.current!);
    void paint();
    return () => {
      disposed = true;
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);
  return (
    <div ref={anchor} className="optical-backdrop" aria-busy={!src}>
      {error && <p role="alert">{error}</p>}
      {src && (
        <img
          className="wallpaper"
          src={src}
          alt="LOOK AGAIN. A different way of seeing. Drawn To / Perception."
          draggable={false}
        />
      )}
    </div>
  );
}
