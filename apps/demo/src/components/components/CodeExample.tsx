"use client";
import { useCopyFeedback } from "@/components/playground/useCopyFeedback";
export function CodeExample({
  code,
  label = "React",
}: {
  code: string;
  label?: string;
}) {
  const { copy, status, value } = useCopyFeedback();
  const copied = status === "copied" && value === code;
  return (
    <div className="components-code">
      <div>
        <span>{label}</span>
        <button type="button" onClick={() => void copy(code)}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
      {status === "failed" && (
        <p role="status">Select the code and copy it manually.</p>
      )}
    </div>
  );
}
