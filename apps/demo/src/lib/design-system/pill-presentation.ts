import type { CSSProperties } from "react";

// Shared by the landing, live editor and generated JSX.
export const pillStyle = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  gap: "var(--space-4, 16px)",
  minHeight: "var(--demo-pill-height, 100px)",
  maxWidth: "var(--demo-pill-max-width, calc(100% - 48px))",
  padding: "var(--space-5, 24px) var(--space-6, 32px)",
  border: 0,
  background: "transparent",
  color: "hsl(var(--landing-photo-ink, 0 0% 100%))",
  fontFamily: '"Glaze Inter", "Helvetica Neue", sans-serif',
  fontWeight: 600,
  fontSize: "var(--demo-pill-font-size, 1.25rem)",
  lineHeight: 1.5,
  letterSpacing: "-.04em",
  textShadow: "0 1px 6px hsl(var(--landing-photo-shade, 0 0% 0%) / .45)",
} satisfies CSSProperties;

export const pillResponsiveCss = `@media (max-width: 768px) {
  .demo-pill {
    --demo-pill-height: 76px;
    --demo-pill-font-size: 1.1rem;
    --demo-pill-max-width: calc(100% - 64px);
  }
}`;
