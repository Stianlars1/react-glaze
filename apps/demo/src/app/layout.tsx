import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "React Glaze - Liquid glass for React",
  description:
    "Give your React interface a little glaze. Explore a configurable liquid glass wrapper, tune it in the playground, and see it in a working app.",
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
