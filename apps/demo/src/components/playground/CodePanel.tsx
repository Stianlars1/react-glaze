import { CopyButton } from "./CopyButton";
import { GlassButton } from "./GlassButton";
import { useState } from "react";
import { trackDemoEvent } from "@/lib/analytics";
import { componentCode, componentProps, shareableState } from "./config";
import type { StudioState } from "./config";
import { useCopyFeedback } from "./useCopyFeedback";

export function CodePanel({ state }: { state: StudioState }) {
  const [format, setFormat] = useState<"jsx" | "json">("jsx");
  const clipboard = useCopyFeedback();
  const [copiedFormat, setCopiedFormat] = useState(format);
  const code =
    format === "jsx"
      ? componentCode(state)
      : JSON.stringify(
          {
            component: componentProps(state),
            playground: {
              background: shareableState(state).background,
              motion: state.motion,
              example: state.example,
            },
          },
          null,
          2,
        );
  return (
    <section className="code-panel" id="code" aria-labelledby="code-title">
      <div className="code-header">
        <h2 id="code-title">Make it yours.</h2>
        <div className="code-tabs" role="group" aria-label="Code format">
          {(["jsx", "json"] as const).map((value) => (
            <GlassButton
              key={value}
              aria-pressed={format === value}
              onClick={() => setFormat(value)}
            >
              {value.toUpperCase()}
            </GlassButton>
          ))}
        </div>
        <CopyButton
          label="Copy code"
          copied={clipboard.status === "copied" && clipboard.value === code}
          className="copy"
          onClick={async () => {
            if (await clipboard.copy(code)) {
              setCopiedFormat(format);
              trackDemoEvent({
                name: "playground_code_copied",
                properties: { format },
              });
            }
          }}
        />
      </div>
      <pre tabIndex={0} aria-label={`${format.toUpperCase()} code`}>
        <code>{code}</code>
      </pre>
      <p
        className="copy-feedback"
        role="status"
        data-empty={clipboard.status === "idle"}
      >
        <span key={clipboard.revision}>
          {clipboard.status === "failed"
            ? "Could not copy. Select the code above and copy it manually."
            : clipboard.status === "copied"
              ? `${copiedFormat.toUpperCase()} copied to clipboard.`
              : ""}
        </span>
      </p>
      <p className="code-note">
        The background is your page. The glass is <code>react-glaze</code>. Keep
        the styling or bring your own.
      </p>
    </section>
  );
}
