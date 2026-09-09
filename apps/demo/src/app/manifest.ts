import type { MetadataRoute } from "next";
import { SITE_NAME } from "../lib/seo.ts";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Liquid glass for React. Explore the playground and showcase.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "browser",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/brand/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
