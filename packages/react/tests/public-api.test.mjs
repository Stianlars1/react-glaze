import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  LiquidGlass,
  normalizeGlassSettings,
  REFERENCE,
} from "../dist/index.js";

test("package imports and renders on the server without browser globals", () => {
  assert.equal(typeof document, "undefined");
  const html = renderToStaticMarkup(
    createElement(
      LiquidGlass,
      {
        as: "button",
        disabled: true,
        "aria-label": "Save",
        thickness: 2,
        contentMode: "sharp",
        onClick: () => {},
      },
      "Save",
    ),
  );
  assert.match(html, /<button type="button" disabled="" aria-label="Save"/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, />Save<\/button>/);
  assert.doesNotMatch(html, /thickness=|contentMode=|onClick=/);
});
test("native link, form type, and disabled glass remain native HTML", () => {
  assert.match(
    renderToStaticMarkup(
      createElement(LiquidGlass, { as: "a", href: "/details" }, "Read"),
    ),
    /href="\/details"/,
  );
  assert.match(
    renderToStaticMarkup(
      createElement(LiquidGlass, { as: "button", type: "submit" }, "Submit"),
    ),
    /type="submit"/,
  );
  assert.match(
    renderToStaticMarkup(
      createElement(LiquidGlass, { enabled: false }, "Plain"),
    ),
    /display:none/,
  );
});
test("untrusted configuration cannot create invalid materials or inherited presets", () => {
  const result = normalizeGlassSettings({
    preset: "__proto__",
    ior: 100,
    roughness: -1,
    maxDpr: Infinity,
    depth: NaN,
    color: "<script>",
    shape: "banana",
    enabled: "false",
  });
  assert.equal(result.ior, 2.333);
  assert.equal(result.roughness, 0);
  assert.equal(result.maxDpr, REFERENCE.maxDpr);
  assert.equal(result.depth, REFERENCE.depth);
  assert.equal(result.color, "#ffffff");
  assert.equal(result.shape, "rounded");
  assert.equal(result.enabled, true);
  assert.equal(Object.keys(result).length, Object.keys(REFERENCE).length);
});

test("the default wrapper follows ordinary div layout without imposed sizing or spacing", () => {
  const html = renderToStaticMarkup(
    createElement(
      LiquidGlass,
      null,
      createElement("p", null, "Content defines height"),
    ),
  );
  const hostStyle = html.match(/<div[^>]*style="([^"]*)"/)[1];
  assert.doesNotMatch(
    hostStyle,
    /padding:|display:|align-items:|justify-content:|width:|height:|font:|color:/,
  );
  assert.match(html, /<p>Content defines height<\/p>/);
});

test("Optical Type selects the original optical lens without imposing dimensions", () => {
  const settings = normalizeGlassSettings({ preset: "optical-type" });
  assert.equal(settings.shape, "lens");
  assert.equal(settings.optics, "reference");
  assert.equal(settings.depth, 0.44);
  assert.equal(settings.thickness, 1.25);
  assert.equal(settings.lighting, "studio");
  assert.equal(normalizeGlassSettings({preset: "optical-flow"}).lighting, "responsive");
  assert.equal(normalizeGlassSettings({lighting: "unknown"}).lighting, "studio");
  assert.equal(
    normalizeGlassSettings({ preset: "optical-type", optics: "smooth" }).optics,
    "smooth",
  );
  const html = renderToStaticMarkup(
    createElement(LiquidGlass, { preset: "optical-type", lighting: "responsive" }, "Text"),
  );
  assert.doesNotMatch(html, /optics=|lighting=|preset=/);
  assert.doesNotMatch(html.match(/<div[^>]*style="([^"]*)"/)[1], /width:|height:/);
});

test("caller border radius stays inline and preset geometry defaults do not overwrite it", () => {
  const html = renderToStaticMarkup(createElement(LiquidGlass, {
    shape: "circle", width: 120, style: { borderRadius: "12px 24px", aspectRatio: "2 / 1" },
  }, "Custom"));
  assert.match(html, /border-radius:12px 24px/);
  assert.match(html, /aspect-ratio:2 \/ 1/);
  assert.match(html, /data-liquid-shape="circle"/);
});

test("shape defaults use one deduplicated low-specificity CSS resource", () => {
  const html = renderToStaticMarkup(createElement("main", null,
    createElement(LiquidGlass, {shape: "pill"}, "One"),
    createElement(LiquidGlass, {shape: "square"}, "Two"),
  ));
  assert.equal((html.match(/<style/g) || []).length, 1);
  assert.match(html, /:where\(/);
  for (const style of [...html.matchAll(/<div[^>]*style="([^"]*)"/g)].map(m=>m[1]))
    assert.doesNotMatch(style, /border-radius:|aspect-ratio:/);
});

test("CSS dimension keywords are forwarded without numeric conversion", () => {
  const html = renderToStaticMarkup(createElement(LiquidGlass, {width: "fit-content", height: "auto"}, "Size"));
  assert.match(html, /width:fit-content;height:auto/);
});
