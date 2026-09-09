import type { MetadataRoute } from "next";
import { canonicalUrl, PUBLIC_ROUTES } from "../lib/seo.ts";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({ url: canonicalUrl(route) }));
}
