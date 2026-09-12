import { useState } from "react";
import type { ReactNode } from "react";
import { GlassSummary } from "./GlassButton";
import { ChevronIcon } from "./icons";

export function GlassDetails({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className={className}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <GlassSummary>
          <span>{title}</span>
          {description && <span className="summary-detail">{description}</span>}
          <span
            className="t-icon-swap disclosure-icon"
            data-state={open ? "b" : "a"}
            aria-hidden="true"
          >
            <span className="t-icon" data-icon="a">
              <ChevronIcon />
            </span>
            <span className="t-icon" data-icon="b">
              <ChevronIcon up />
            </span>
          </span>
        </GlassSummary>
      </summary>
      {children}
    </details>
  );
}
