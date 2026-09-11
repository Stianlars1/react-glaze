import { useState } from "react";

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const active = document.activeElement;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
    document.body.append(textarea);
    try {
      textarea.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      textarea.remove();
      if (active instanceof HTMLElement) active.focus({ preventScroll: true });
    }
  }
}

export function useCopyFeedback() {
  const [result, setResult] = useState<{
    status: "idle" | "copied" | "failed";
    value: string;
    revision: number;
  }>({ status: "idle", value: "", revision: 0 });
  const copy = async (text: string) => {
    const succeeded = await writeClipboard(text);
    setResult((previous) => ({
      status: succeeded ? "copied" : "failed",
      value: text,
      revision: previous.revision + 1,
    }));
    return succeeded;
  };
  return { ...result, copy };
}
