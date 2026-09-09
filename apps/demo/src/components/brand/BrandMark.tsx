import type { SVGProps } from "react";
import { BRAND_MARK_PATH, BRAND_VIEW_BOX } from "@/lib/brand";

export function BrandMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox={BRAND_VIEW_BOX}
      fill="currentColor"
      width="32"
      height="32"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={BRAND_MARK_PATH} />
    </svg>
  );
}
