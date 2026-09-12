import type { MouseEventHandler } from "react";
import { GlassButton } from "./GlassButton";
import { CheckIcon, CopyIcon } from "./icons";

export function CopyButton({
  label,
  copied,
  onClick,
  className = "",
}: {
  label: string;
  copied: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}) {
  return (
    <GlassButton className={`copy-action ${className}`} onClick={onClick}>
      <span
        className="t-icon-swap"
        data-state={copied ? "b" : "a"}
        aria-hidden="true"
      >
        <span className="t-icon" data-icon="a">
          <CopyIcon />
        </span>
        <span className="t-icon" data-icon="b">
          <CheckIcon />
        </span>
      </span>
      <span>{label}</span>
    </GlassButton>
  );
}
