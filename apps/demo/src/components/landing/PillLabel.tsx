import { landingPillArrow, landingPillLabel } from "@/lib/landing-pill";

export function PillLabel() {
  return (
    <>
      <span>{landingPillLabel}</span>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        style={{ flex: "none" }}
      >
        <path
          d={landingPillArrow}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}
