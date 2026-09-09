import assert from "node:assert/strict";
import test from "node:test";
import { pageMetadata, serializeJsonLd, siteMetadata, siteStructuredData } from "../src/lib/seo.ts";
import sitemap from "../src/app/sitemap.ts";

test("route canonicals and the sitemap agree on the three query-free production URLs", () => {
  assert.equal(siteMetadata.alternates, undefined);
  const routes = ["/", "/playground", "/showcase"];
  const urls = routes.map((route) => pageMetadata(route).alternates.canonical);
  assert.deepEqual(urls, [
    "https://react-glaze.app",
    "https://react-glaze.app/playground",
    "https://react-glaze.app/showcase",
  ]);
  assert.deepEqual(sitemap().map(({ url }) => url), urls);
  for (const route of routes) {
    assert.equal(pageMetadata(route).openGraph.url, pageMetadata(route).alternates.canonical);
  }
});

test("child titles receive one brand suffix and identify the relevant demo", () => {
  assert.equal(pageMetadata("/playground").title, "Playground");
  assert.equal(pageMetadata("/playground").openGraph.title, "Playground | React Glaze");
  assert.equal(pageMetadata("/showcase").title, "Showcase - Roam");
  assert.equal(pageMetadata("/showcase").twitter.title, "Showcase - Roam | React Glaze");
});

test("child metadata preserves native file image URLs, dimensions and alt text from the parent", () => {
  assert.equal(Object.hasOwn(pageMetadata("/").openGraph, "images"), false);
  assert.equal(Object.hasOwn(pageMetadata("/").twitter, "images"), false);
  const parent = {
    openGraph: {
      images: [{ url: "https://react-glaze.app/opengraph-image.png?build-hash", width: 1200, height: 630, alt: "React Glaze" }],
    },
    twitter: {
      images: [{ url: "https://react-glaze.app/twitter-image.png?build-hash", alt: "React Glaze" }],
    },
  };
  for (const route of ["/playground", "/showcase"]) {
    const metadata = pageMetadata(route, parent);
    assert.deepEqual(metadata.openGraph.images, parent.openGraph.images);
    assert.deepEqual(metadata.twitter.images, parent.twitter.images);
  }
});

test("JSON-LD remains valid JSON while embedded text cannot terminate its script element", () => {
  const value = { ...siteStructuredData, name: "</script><script>alert('test')</script>" };
  const json = serializeJsonLd(value);
  assert.equal(json.includes("<"), false);
  assert.deepEqual(JSON.parse(json), value);
});

test("project structured data identifies its public source and icon without invented reviews or ratings", () => {
  const graph = siteStructuredData["@graph"];
  assert.equal(graph.find((node) => node["@type"] === "WebSite").alternateName, "react-glaze");
  const source = graph.find((node) => node["@type"] === "SoftwareSourceCode");
  assert.equal(source.codeRepository, "https://github.com/Stianlars1/react-glaze");
  assert.equal(source.image, "https://react-glaze.app/brand/icon-512.png");
  assert.doesNotMatch(JSON.stringify(siteStructuredData), /"(?:aggregateRating|review|ratingValue|reviewCount|offers)"/);
});
