import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiquidGlassGroup, LiquidGlassSurface } from "../dist/index.js";
import { drawableSurfaces } from "../dist/morph/config.js";

const surface = { id: "save", x: 50, y: 50, width: 60, height: 60 };
const render = (
  props = {},
  child = h(
    LiquidGlassSurface,
    { surfaceId: "save", as: "button", "aria-label": "Save" },
    "Save",
  ),
) =>
  renderToStaticMarkup(
    h(
      LiquidGlassGroup,
      { width: 100, height: 100, surfaces: [surface], ...props },
      child,
    ),
  );

test("group and native surface render on the server with usable fallback", () => {
  assert.equal(typeof document, "undefined");
  const html = render();
  assert.match(html, /<button type="button" aria-label="Save"/);
  assert.match(html, /data-glaze-surface="save"/);
  assert.match(html, /backdrop-filter:blur\(12px\)/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /visibility:hidden/);
  assert.doesNotMatch(html, /surfaces=|connection=|refraction=|motion=/);
});
test("hidden surfaces are inert and native attributes pass through", () => {
  const html = render(
    { surfaces: [{ ...surface, width: 0, height: 0 }] },
    h(
      LiquidGlassSurface,
      { surfaceId: "save", as: "a", href: "/saved" },
      "Saved",
    ),
  );
  assert.match(html, /href="\/saved"/);
  assert.match(html, /inert=""/);
});
test("invalid public geometry fails before producing malformed CSS", () => {
  assert.throws(() => render({ width: NaN }), /finite CSS pixel size/);
  assert.throws(() => render({ surfaces: [surface, surface] }), /unique/);
  assert.throws(
    () => render({ surfaces: [{ ...surface, x: Infinity }] }),
    /finite geometry/,
  );
  assert.throws(
    () => render({ surfaces: [{ ...surface, x: Number.MAX_VALUE }] }),
    /finite geometry/,
  );
  assert.throws(
    () =>
      render({
        surfaces: Array.from({ length: 9 }, (_, i) => ({
          ...surface,
          id: String(i),
        })),
      }),
    /at most 8/,
  );
});
test("replaced surfaces cannot consume the new controls' rendering slots", () => {
  const old = Array.from({ length: 8 }, (_, i) => ({
    id: `old-${i}`,
    x: 20,
    y: 20,
    w: 30,
    h: 30,
    r: 15,
  }));
  const current = old.map((s, i) => ({ ...s, id: `new-${i}` }));
  assert.deepEqual(
    drawableSurfaces([...old, ...current], current).map((s) => s.id),
    current.map((s) => s.id),
  );
  assert.deepEqual(drawableSurfaces([], []), []);
});
test("group fallback styles deduplicate without changing existing wrapper CSS", () => {
  const html = renderToStaticMarkup(
    h(
      "main",
      null,
      h(
        LiquidGlassGroup,
        { width: 100, height: 100, surfaces: [surface] },
        h(LiquidGlassSurface, { surfaceId: "save" }, "One"),
      ),
      h(
        LiquidGlassGroup,
        { width: 100, height: 100, surfaces: [surface] },
        h(LiquidGlassSurface, { surfaceId: "save" }, "Two"),
      ),
    ),
  );
  assert.equal((html.match(/<style/g) || []).length, 1);
});
test("surfaces require a group context", () => {
  assert.throws(
    () =>
      renderToStaticMarkup(
        h(LiquidGlassSurface, { surfaceId: "save" }, "Save"),
      ),
    /must be inside/,
  );
});
