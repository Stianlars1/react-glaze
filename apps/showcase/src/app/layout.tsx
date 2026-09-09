import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LiquidGlass | Component preview",
  description: "A working local showcase for the LiquidGlass React component.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
