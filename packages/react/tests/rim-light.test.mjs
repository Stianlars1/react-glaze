import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as api from "../dist/index.js";

const defaults = {
  mode: "pointer", onLeave: "return", strength: 0.95, width: 1.8, reach: 100, response: 0.14,
};
const markup = (props = {}) => renderToStaticMarkup(createElement(
  api.LiquidGlass,
  { as: "button", "aria-label": "Save place", ...props },
  "Save place",
));

test("the public rim normalizer keeps absent and invalid configuration disabled", () => {
  assert.equal(typeof api.normalizeRimLight, "function");
  for (const value of [undefined, null, false, 0, 1, "pointer", [], () => {}])
    assert.equal(api.normalizeRimLight(value), null);
});

test("enabling a rim supplies complete settings without mutating the caller", () => {
  assert.equal(typeof api.normalizeRimLight, "function");
  assert.deepEqual(api.RIM_LIGHT_DEFAULTS, defaults);
  assert.deepEqual(api.normalizeRimLight(true), defaults);
  assert.deepEqual(api.normalizeRimLight({}), defaults);
  const input = Object.freeze({ mode: "static", width: 2.6 });
  assert.deepEqual(api.normalizeRimLight(input), { ...defaults, mode: "static", width: 2.6 });
  assert.deepEqual(input, { mode: "static", width: 2.6 });
});

test("rim settings clamp finite bounds and reject non-numeric field values", () => {
  assert.equal(typeof api.normalizeRimLight, "function");
  assert.deepEqual(api.normalizeRimLight({ strength: -2, width: 0, reach: -4, response: 0 }), {
    mode: "pointer", onLeave: "return", strength: 0, width: 0.5, reach: 0, response: 0.06,
  });
  assert.deepEqual(api.normalizeRimLight({ strength: 4, width: 20, reach: 1000, response: 10 }), {
    mode: "pointer", onLeave: "return", strength: 1, width: 4, reach: 220, response: 0.3,
  });
  assert.deepEqual(api.normalizeRimLight({
    mode: "unknown", strength: NaN, width: Infinity, reach: "40", response: null,
  }), defaults);
  assert.deepEqual(api.normalizeRimLight({ strength: 0, width: 0.5, reach: 0, response: 0.06 }), {
    mode: "pointer", onLeave: "return", strength: 0, width: 0.5, reach: 0, response: 0.06,
  });
});

test("normalized settings cannot change a later caller's defaults", () => {
  assert.equal(typeof api.normalizeRimLight, "function");
  const first = api.normalizeRimLight(true);
  try { first.width = 4; } catch {}
  assert.deepEqual(api.normalizeRimLight(true), defaults);
  assert.deepEqual(api.RIM_LIGHT_DEFAULTS, defaults);
});

test("the disabled rim preserves legacy SSR and does not leak a DOM attribute", () => {
  const legacy = markup();
  assert.doesNotMatch(legacy, /data-liquid-rim|data-liquid-overlay/);
  assert.equal(markup({ rimLight: false }), legacy);
  assert.equal(markup({ rimLight: undefined }), legacy);
});

test("enabled rims server-render a pointer-transparent contour with native content intact", () => {
  for (const rimLight of [true, { mode: "static", width: 2.4, strength: 0.6 }]) {
    const html = markup({ rimLight, disabled: true, style: { borderRadius: "12px 28px" } });
    assert.equal((html.match(/data-liquid-rim/g) ?? []).length, 1);
    assert.match(html, /<button type="button" aria-label="Save place" disabled=""/);
    assert.match(html, /border-radius:12px 28px/);
    assert.match(html, /Save place/);
    const layer = html.match(/<span[^>]*data-liquid-rim[^>]*>/)?.[0];
    assert.ok(layer, "the decorative rim has its own span");
    assert.match(layer, /aria-hidden="true"/);
    assert.match(layer, /data-liquid-overlay=""/);
    assert.match(layer, /position:absolute/);
    assert.match(layer, /inset:0/);
    assert.match(layer, /border-radius:inherit/);
    assert.match(layer, /pointer-events:none/);
    assert.match(layer, /z-index:2/);
    assert.match(layer, /--rim-x:0\.70711;--rim-y:0\.70711/);
    assert.match(layer, rimLight === true ? /--rim-width:1\.8px/ : /--rim-width:2\.4px/);
    assert.match(layer, rimLight === true ? /--rim-strength:0\.95/ : /--rim-strength:0\.6/);
    assert.match(layer, /box-shadow:inset/);
    assert.doesNotMatch(html, /rimLight=|rimlight=/);
  }
});

test("disabling glass removes the rim while preserving the caller's native children", () => {
  const html = markup({ rimLight: true, enabled: false });
  assert.doesNotMatch(html, /data-liquid-rim|rimLight=|rimlight=/);
  assert.match(html, /display:none/);
  assert.match(html, />Save place<\/button>/);
});

test("rim configuration stays outside the optical settings contract", () => {
  assert.deepEqual(
    api.normalizeGlassSettings({ rimLight: { strength: 0.4, width: 3 } }),
    api.normalizeGlassSettings({}),
  );
  assert.equal("rimLight" in api.REFERENCE, false);
});

 test("pointer exit behavior defaults to return and explicitly accepts hold", () => {
  assert.equal(api.normalizeRimLight({}).onLeave, "return");
  assert.equal(api.normalizeRimLight({ onLeave: "hold" }).onLeave, "hold");
  assert.equal(api.normalizeRimLight({ onLeave: "unknown" }).onLeave, "return");
});
