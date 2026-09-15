import assert from "node:assert/strict";
import test from "node:test";
import {
  componentsHref,
  redirectToComponents,
  selectedComponent,
} from "../src/lib/components-navigation.ts";
import { initialState, shareableState } from "../src/components/playground/config.ts";

test("explicit component choices take precedence over a retained editor configuration", () => {
  const search = new URLSearchParams({
    component: "menu",
    config: JSON.stringify(shareableState(initialState)),
  });

  assert.equal(selectedComponent(search), "menu");
  assert.equal(selectedComponent(new URLSearchParams("config=%7B%7D")), "glass");
});

test("invalid and missing component choices fall back without dropping a configuration", () => {
  assert.equal(selectedComponent(new URLSearchParams("component=unknown")), "actions");
  assert.equal(
    selectedComponent(new URLSearchParams("component=unknown&config=%7B%7D")),
    "glass",
  );
});

test("legacy redirects preserve repeated query values while selecting the editor", () => {
  const href = redirectToComponents({
    config: ["first", "second"],
    source: ["newsletter", "partner"],
  });
  const target = new URL(href, "https://react-glaze.app");

  assert.equal(target.pathname, "/components");
  assert.equal(target.searchParams.get("component"), "glass");
  assert.deepEqual(target.searchParams.getAll("config"), ["first", "second"]);
  assert.deepEqual(target.searchParams.getAll("source"), ["newsletter", "partner"]);
});

test("shared editor links select Liquid Glass and omit uploaded image state", () => {
  const state = { ...initialState, background: "custom" };
  const href = componentsHref(
    new URLSearchParams({ config: JSON.stringify(shareableState(state)) }),
    "glass",
  );
  const target = new URL(href, "https://react-glaze.app");

  assert.equal(target.searchParams.get("component"), "glass");
  assert.equal(
    JSON.parse(target.searchParams.get("config")).background,
    "spectrum",
  );
});
