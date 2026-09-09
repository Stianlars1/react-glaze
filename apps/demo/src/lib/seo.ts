import type { Metadata, ResolvedMetadata } from "next";

export const SITE_URL = "https://react-glaze.vercel.app";
export const SITE_NAME = "React Glaze";
export const REPOSITORY_URL = "https://github.com/Stianlars1/react-glaze";
export const PACKAGE_URL = "https://www.npmjs.com/package/react-glaze";

export const PUBLIC_ROUTES = ["/", "/playground", "/showcase"] as const;
type PublicRoute = (typeof PUBLIC_ROUTES)[number];

const pages = {
  "/": {
    title: "React Glaze - Liquid glass for React",
    description:
      "A configurable liquid glass wrapper for React 19 and Next.js. Keep your content and CSS, tune the material in the playground, and explore a working showcase.",
  },
  "/playground": {
    title: "Playground",
    description:
      "Tune React Glaze materials, shapes and rim lighting over different backgrounds. Try your own image, save a configuration, and copy the React code.",
  },
  "/showcase": {
    title: "Showcase - Roam",
    description:
      "Explore React Glaze in Roam, an interactive Faroe Islands trip planner with responsive photographs, native controls, dialogs and liquid glass.",
  },
} satisfies Record<PublicRoute, { title: string; description: string }>;

export function canonicalUrl(route: PublicRoute): string {
  return route === "/" ? SITE_URL : new URL(route, SITE_URL).href;
}

export function pageMetadata(
  route: PublicRoute,
  parent?: Pick<ResolvedMetadata, "openGraph" | "twitter">,
): Metadata {
  const { title, description } = pages[route];
  const socialTitle = route === "/" ? title : `${title} | ${SITE_NAME}`;

  return {
    title: route === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: canonicalUrl(route) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: socialTitle,
      description,
      url: canonicalUrl(route),
      ...(parent?.openGraph?.images ? { images: parent.openGraph.images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      ...(parent?.twitter?.images ? { images: parent.twitter.images } : {}),
    },
  };
}

export const siteMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  description: pages["/"].description,
  title: {
    default: pages["/"].title,
    template: `%s | ${SITE_NAME}`,
  },
  robots: { index: true, follow: true },
};

export const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: "react-glaze",
      url: canonicalUrl("/"),
      description: pages["/"].description,
      inLanguage: "en",
      about: { "@id": `${SITE_URL}/#source-code` },
    },
    {
      "@type": "SoftwareSourceCode",
      "@id": `${SITE_URL}/#source-code`,
      name: SITE_NAME,
      description: pages["/"].description,
      url: canonicalUrl("/"),
      codeRepository: REPOSITORY_URL,
      image: `${SITE_URL}/brand/icon-512.png`,
      programmingLanguage: "TypeScript",
      runtimePlatform: "React 19",
      license: `${REPOSITORY_URL}/blob/main/LICENSE`,
      sameAs: [PACKAGE_URL],
      author: { "@type": "Person", name: "Stian Larsen" },
    },
  ],
};

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
