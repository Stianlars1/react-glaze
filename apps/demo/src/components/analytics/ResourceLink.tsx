"use client";

import type { ComponentProps } from "react";
import { trackDemoEvent } from "@/lib/analytics";

type ResourceLinkProps = ComponentProps<"a"> & {
  destination: "github" | "documentation";
};

export function ResourceLink({ destination, onClick, ...props }: ResourceLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          trackDemoEvent({
            name: "resource_link_clicked",
            properties: { destination },
          });
        }
      }}
    />
  );
}
