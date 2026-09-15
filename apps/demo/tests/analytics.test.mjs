import assert from "node:assert/strict";
import test from "node:test";
import { redactAnalyticsUrl } from "../src/lib/analytics.ts";

test("pageviews and custom events exclude editor configuration and URL fragments", () => {
  for (const type of ["pageview", "event"]) {
    const event = {
      type,
      url: "https://react-glaze.app/playground?config=%7B%22background%22%3A%22private%22%7D&utm_source=github&config=second#preview",
    };
    assert.deepEqual(redactAnalyticsUrl(event), {
      type,
      url: "https://react-glaze.app/playground?utm_source=github",
    });
    assert.match(event.url, /private/);
  }

  const componentEvent = {
    type: "pageview",
    url: "https://react-glaze.app/components?component=glass&config=%7B%22background%22%3A%22private%22%7D#code",
  };
  assert.deepEqual(redactAnalyticsUrl(componentEvent), {
    type: "pageview",
    url: "https://react-glaze.app/components?component=glass",
  });
});

test("ordinary route URLs are preserved", () => {
  for (const path of ["/", "/components", "/showcase"]) {
    const event = { type: "pageview", url: `https://react-glaze.app${path}` };
    assert.deepEqual(redactAnalyticsUrl(event), event);
  }
});
