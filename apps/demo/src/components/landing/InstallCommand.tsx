"use client";

import { useEffect, useId, useRef, useState } from "react";

const command = "npm install react-glaze";

export function InstallCommand() {
  const [status, setStatus] = useState<"idle" | "copying" | "copied" | "failed">("idle");
  const statusId = useId();
  const active = useRef(true);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(resetTimer.current);
    };
  }, []);

  const copy = async () => {
    clearTimeout(resetTimer.current);
    setStatus("copying");
    try {
      await navigator.clipboard.writeText(command);
      if (!active.current) return;
      setStatus("copied");
      resetTimer.current = setTimeout(() => setStatus("idle"), 2200);
    } catch {
      if (active.current) setStatus("failed");
    }
  };

  return (
    <div className="install-command" data-state={status}>
      <code>{command}</code>
      <button
        className="install-command-button"
        type="button"
        aria-label="Copy install command"
        aria-describedby={statusId}
        disabled={status === "copying"}
        onClick={copy}
      >
        <span key={status} className="install-command-label">{status === "copied" ? "Copied" : status === "copying" ? "Copying..." : "Copy"}</span>
      </button>
      <p id={statusId} className="install-command-status" role="status">
        {status === "copied"
          ? "Copied to clipboard."
          : status === "failed"
            ? "Could not copy. Select the command and copy it manually."
            : ""}
      </p>
    </div>
  );
}
