import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LiquidGlassActions, LiquidGlassMenu } from "../dist/index.js";
import { adjacentItem, directionalItem, edgeItem, typeaheadItem } from "../dist/morph/menu/logic.js";
import * as menuLogic from "../dist/morph/menu/logic.js";
import { menuViewFromRects, rebindBoundaryObserver } from "../dist/morph/menu/use-measurements.js";
import { ANCHOR_ID, TRIGGER_ID, actionSurfaceId, makeMenuLayout } from "../dist/morph/menu/layout.js";

const items = [{ id: "save", label: "Save" }, { id: "share", label: "Share", disabled: true }, { id: "delete", label: "Delete" }];
const render = (Component = LiquidGlassActions, props = {}) => renderToStaticMarkup(h(Component, { label: "Document actions", items, ...props }));
const openingTags = (html, tag) => html.match(new RegExp(`<${tag}\\b[^>]*>`, "g")) ?? [];
const menuButtons = html => openingTags(html, "button").filter(tag => tag.includes('role="menuitem"'));

for (const Component of [LiquidGlassActions, LiquidGlassMenu]) {
  test(`${Component.name} supplies one native trigger, labelled menu items and closed SSR semantics`, () => {
    const html = render(Component);
    const buttons = openingTags(html, "button");
    const trigger = buttons.filter(tag => tag.includes('aria-haspopup="menu"'));
    assert.equal(trigger.length, 1);
    assert.match(trigger[0], /type="button"/);
    assert.match(trigger[0], /aria-label="Document actions"/);
    assert.match(trigger[0], /aria-expanded="false"/);
    assert.equal(menuButtons(html).length, 3);
    assert(menuButtons(html).every(tag => tag.includes('tabindex="-1"')));
    assert.match(html, /role="menu"[^>]*aria-hidden="true"[^>]*inert=""/);
    assert.match(menuButtons(html)[1], /disabled=""/);
    assert.match(html, /backdrop-filter:blur\(12px\)/);
    let depth = 0;
    for (const token of html.match(/<\/?button\b[^>]*>/g) ?? []) {
      depth += token.startsWith("</") ? -1 : 1;
      assert(depth >= 0 && depth <= 1, "Native buttons must not be nested");
    }
    assert.equal(depth, 0);
  });
  test(`${Component.name} handles uncontrolled and controlled initial open state without invoking callbacks`, () => {
    let calls = 0;
    const callbacks = { onOpenChange: () => calls++, items: [{ id: "one", label: "One", onSelect: () => calls++ }] };
    const initial = render(Component, { defaultOpen: true, ...callbacks });
    assert.match(initial, /aria-expanded="true"/);
    assert.match(menuButtons(initial)[0], /tabindex="0"/);
    const controlled = render(Component, { defaultOpen: true, open: false, ...callbacks });
    assert.match(controlled, /aria-expanded="false"/);
    assert.equal(calls, 0);
    assert.match(render(Component, { open: true }), /aria-expanded="true"/);
  });
  test(`${Component.name} disables empty lists and never puts disabled actions in tab order`, () => {
    const empty = render(Component, { items: [], open: true });
    const trigger = openingTags(empty, "button").find(tag => tag.includes('aria-haspopup="menu"'));
    assert.match(trigger, /disabled=""/);
    assert.match(trigger, /aria-expanded="false"/);
    assert.equal(menuButtons(empty).length, 0);
    const allDisabled = render(Component, { open: true, items: items.map(item => ({ ...item, disabled: true })) });
    assert(menuButtons(allDisabled).every(tag => tag.includes('tabindex="-1"')));
  });
}

test("instance IDs and caller IDs cannot collide with each other or the engine trigger", () => {
  const html = renderToStaticMarkup(h("div", null, h(LiquidGlassActions, { label: "First", items }),
    h(LiquidGlassMenu, { label: "Second", items: [{ id: "trigger", label: "Trigger action" }, { id: "glaze:anchor", label: "Anchor action" }] })));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
  assert.equal(controls.length, 2);
  assert(controls.every(id => ids.includes(id)));
  assert.equal(actionSurfaceId("trigger"), "glaze:action:trigger");
});

test("invalid action lists and native interactive content fail with useful errors", () => {
  assert.throws(() => render(LiquidGlassMenu, { label: "" }), /nonempty trigger label/);
  assert.throws(() => render(LiquidGlassActions, { items: Array.from({ length: 7 }, (_, i) => ({ id: `${i}`, label: "Action" })) }), RangeError);
  assert.throws(() => render(LiquidGlassMenu, { items: [items[0], items[0]] }), /nonempty, unique/);
  assert.throws(() => render(LiquidGlassMenu, { items: [{ id: " ", label: "Action" }] }), TypeError);
  assert.throws(() => render(LiquidGlassMenu, { items: [{ id: "ok", label: "" }] }), /nonempty label/);
  assert.throws(() => render(LiquidGlassMenu, { trigger: h("button", null, "Nested") }), /supplies the native button/);
  assert.throws(() => render(LiquidGlassActions, { items: [{ id: "nested", label: "Nested", content: h("a", { href: "/" }, "Link") }] }), /non-interactive/);
});

test("custom content is rendered once and the label remains the accessible name", () => {
  const html = render(LiquidGlassMenu, { open: true, items: [{ id: "custom", label: "Use custom action", content: h("strong", null, "Visible content") }] });
  assert.equal((html.match(/Visible content/g) ?? []).length, 1);
  assert.match(menuButtons(html)[0], /aria-label="Use custom action"/);
});

test("open panels provide an explicit close control while the anchored native trigger is inert", () => {
  const html = render(LiquidGlassMenu, { open: true });
  const buttons = openingTags(html, "button");
  assert.match(buttons.find(tag => tag.includes('aria-haspopup="menu"')), /inert=""/);
  const close = buttons.find(tag => tag.includes('data-glaze-menu-close=""'));
  assert.match(close, /aria-label="Close Document actions"/);
  assert.match(close, /visibility:visible/);
  assert.doesNotMatch(close, /inert=""/);
});

test("native menu overlays are excluded from capture while the normal-flow root keeps its footprint", () => {
  for (const Component of [LiquidGlassActions, LiquidGlassMenu]) {
    const html = render(Component, { open: true });
    const root = openingTags(html, "div").find(tag => tag.includes('data-glaze-menu-root=""'));
    assert.doesNotMatch(root, /data-liquid-overlay|data-liquid-layer/,
      "Excluding the layout root would remove the menu's normal-flow footprint from capture");
    const stack = [];
    let controls = 0;
    for (const match of html.matchAll(/<(\/?)([a-z][a-z0-9-]*)\b[^>]*>/gi)) {
      const [, closing, tag] = match;
      if (closing) { stack.pop(); continue; }
      const excluded = /data-liquid-overlay=|data-liquid-layer=/.test(match[0]);
      if (tag === "button") {
        controls++;
        assert(excluded || stack.some(parent => parent.excluded),
          "Every native overlay button, including the persistent trigger, must be excluded from backdrop capture");
      }
      if (!["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"].includes(tag))
        stack.push({ tag, excluded });
    }
    assert(controls >= 4);
  }
});

test("a closed one-item panel hides native action pixels beneath its trigger", () => {
  const props = { appearance: "labels", items: [{ id: "save", label: "Save" }] };
  const closed = openingTags(render(LiquidGlassMenu, props), "div").find(tag => tag.includes('data-glaze-menu-scroll=""'));
  assert.match(closed, /opacity:0(?:;|\")/, "Closed panel content must be visually hidden, in addition to being inert");
  const open = openingTags(render(LiquidGlassMenu, { ...props, open: true }), "div").find(tag => tag.includes('data-glaze-menu-scroll=""'));
  assert.match(open, /opacity:1(?:;|\")/);
});

test("panel content follows the existing geometry in both directions and is hidden at closed rest", () => {
  assert.equal(typeof menuLogic.panelContentOpacity, "function");
  const target = { x: 0, y: -34, width: 180, height: 140 };
  const half = { x: 0, y: -17, width: 126, height: 106 };
  assert(Math.abs(menuLogic.panelContentOpacity(half, target, 72, true, true) - .5) < .001);
  assert(Math.abs(menuLogic.panelContentOpacity(half, target, 72, false, true) - .5) < .001,
    "Closing should allow the native visual exit to follow the same moving contour");
  assert.equal(menuLogic.panelContentOpacity(target, target, 72, true, false), 1);
  assert.equal(menuLogic.panelContentOpacity({ x: 0, y: 0, width: 72, height: 72 }, target, 72, false, false), 0);
  const smallPanel = { x: 0, y: -2, width: 76, height: 76 };
  assert.equal(menuLogic.panelContentOpacity({ x: 0, y: 0, width: 84, height: 84 }, smallPanel, 72, false, true), 0,
    "A closing trigger pulse must not reveal a one-item grid again");
});

test("page Tab departure enters the checked radio in either traversal direction", () => {
  assert.equal(typeof menuLogic.radioTabStops, "function");
  const tree = {}, form = {};
  const radio = (value, name, checked) => ({ value, radio: { name, checked, tree, form } });
  const candidates = [radio("before-a", "before", false), radio("before-b", "before", true), radio("before-c", "before", false),
    { value: "trigger" }, radio("after-a", "after", false), radio("after-b", "after", true), radio("after-c", "after", false)];
  assert.deepEqual(menuLogic.radioTabStops(candidates, false), ["before-b", "trigger", "after-b"]);
  assert.deepEqual(menuLogic.radioTabStops(candidates, true), ["before-b", "trigger", "after-b"]);
});

test("radio tab stops preserve separate forms, trees, unnamed radios and unchecked-group direction", () => {
  assert.equal(typeof menuLogic.radioTabStops, "function");
  const tree = {}, otherTree = {}, form = {}, otherForm = {};
  const candidates = [
    { value: "a", radio: { name: "choice", checked: false, tree, form } },
    { value: "b", radio: { name: "choice", checked: true, tree, form } },
    { value: "other-form", radio: { name: "choice", checked: true, tree, form: otherForm } },
    { value: "other-tree", radio: { name: "choice", checked: true, tree: otherTree, form } },
    { value: "unnamed-a", radio: { name: "", checked: false, tree, form } },
    { value: "unnamed-b", radio: { name: "", checked: false, tree, form } },
    { value: "unchecked-a", radio: { name: "unchecked", checked: false, tree, form } },
    { value: "unchecked-b", radio: { name: "unchecked", checked: false, tree, form } },
  ];
  assert.deepEqual(menuLogic.radioTabStops(candidates, false), ["b", "other-form", "other-tree", "unnamed-a", "unnamed-b", "unchecked-a"]);
  assert.deepEqual(menuLogic.radioTabStops(candidates, true), ["b", "other-form", "other-tree", "unnamed-a", "unnamed-b", "unchecked-b"]);
});

test("returning focus cancels a refused outside-dismissal reason before direct controlled closure", () => {
  assert.equal(typeof menuLogic.MenuFocusState, "function");
  const focus = new menuLogic.MenuFocusState();
  focus.enter();
  focus.requestClose("outside");
  focus.leave();
  assert.equal(focus.shouldRestore(false), false, "Accepted outside dismissal preserves outside focus");
  // The controlled parent keeps the menu open and the user comes back before a later prop closure.
  focus.enter();
  assert.equal(focus.shouldRestore(true), true, "A later direct controlled close restores the trigger after focus returns");
  focus.closed();
  assert.equal(focus.shouldRestore(false), false);
  focus.enter();
  focus.requestClose("tab");
  focus.leave();
  assert.equal(focus.shouldRestore(false), false, "Tab departure must not jump back to the trigger");
});

test("only the menu root and its designated external controls are associated interactions", () => {
  assert.equal(typeof menuLogic.isMenuInteraction, "function");
  const root = { contains: node => node?.owner === "root" };
  const external = { contains: node => node?.owner === "external" };
  const rootChild = { owner: "root" }, externalChild = { owner: "external" }, unrelated = { owner: "page" };
  assert.equal(menuLogic.isMenuInteraction([rootChild], root, external), true);
  assert.equal(menuLogic.isMenuInteraction([externalChild], root, external), true);
  assert.equal(menuLogic.isMenuInteraction([unrelated], root, external), false);
  assert.equal(menuLogic.isMenuInteraction([external], root, external), true);
  assert.equal(menuLogic.isMenuInteraction([externalChild], root, null), false,
    "Ordinary outside controls retain dismissal behavior without the opt-in ref.");
  const documentElement = { contains: () => true };
  const body = { contains: () => true };
  const document = { documentElement, body };
  documentElement.ownerDocument = document;
  body.ownerDocument = document;
  assert.equal(menuLogic.isMenuInteraction([unrelated], root, documentElement), false);
  assert.equal(menuLogic.isMenuInteraction([unrelated], root, body), false,
    "A whole-document boundary must not suppress normal outside dismissal.");
});

test("focus moving to associated controls is not restored to the menu trigger", () => {
  const focus = new menuLogic.MenuFocusState();
  focus.enter();
  focus.associate();
  assert.equal(focus.shouldRestore(false), false);
  focus.requestClose("outside");
  assert.equal(focus.shouldRestore(false), false);
});

test("controlled opening preserves associated external focus for split and panel menus", () => {
  assert.equal(typeof menuLogic.openingFocusTarget, "function");
  const external = { contains: node => node?.owner === "external" };
  const externalOpen = { owner: "external" };
  const nativeTrigger = { owner: "menu" };
  for (const mode of ["split", "panel"]) {
    const target = menuLogic.openingFocusTarget(undefined, externalOpen, external);
    assert.equal(target, undefined,
      `${mode}: a controlled caption Open button retains focus so Enter can close it again.`);
    assert.equal(target === undefined, true,
      `${mode}: neither an item nor the empty-panel fallback may receive focus.`);
  }
  assert.equal(menuLogic.openingFocusTarget(undefined, nativeTrigger, external), "first",
    "The ordinary native trigger continues to focus the first enabled item.");
  assert.equal(menuLogic.openingFocusTarget("last", externalOpen, external), "last",
    "Explicit native ArrowUp opening keeps its requested menu focus.");
});

test("native trigger footprint follows clamped sizes without reserving expanded menu space", () => {
  assert.match(render(LiquidGlassActions, { triggerSize: 900 }), /data-glaze-menu-root=""[^>]*style="[^"]*width:100px;height:100px/);
  assert.match(render(LiquidGlassMenu, { triggerSize: 2 }), /data-glaze-menu-root=""[^>]*style="[^"]*width:44px;height:44px/);
});

test("menu collision bounds stay stable with a translated stage and change on stage resize", () => {
  const trigger = { left: 360, top: 280, right: 432, bottom: 352, width: 72, height: 72 };
  const stage = { left: 120, top: 80, right: 720, bottom: 580, width: 600, height: 500 };
  const viewport = { left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 };
  const original = menuViewFromRects(trigger, 72, viewport, stage);
  const translated = menuViewFromRects(
    { left: 560, top: 680, right: 632, bottom: 752, width: 72, height: 72 },
    72,
    viewport,
    { left: 320, top: 480, right: 920, bottom: 980, width: 600, height: 500 },
  );
  assert.deepEqual(translated, original, "Shared document translation must not retarget the menu.");
  assert.notDeepEqual(
    menuViewFromRects(trigger, 72, viewport, { ...stage, right: 560, width: 440 }),
    original,
    "Actual stage resize updates the collision area.",
  );
  assert.deepEqual(menuViewFromRects(trigger, 72, viewport), {
    left: -396, top: -316, right: 604, bottom: 484,
  }, "Menus without a boundary retain their visual-viewport fitting.");
});

test("boundary observation follows attachment, replacement and removal through one ref", () => {
  const observed = [], released = [];
  const observer = { observe: node => observed.push(node), unobserve: node => released.push(node) };
  const ref = { current: null };
  const first = { name: "first" }, second = { name: "second" };
  let active = rebindBoundaryObserver(observer, null, ref);
  assert.equal(active, null);
  ref.current = first;
  active = rebindBoundaryObserver(observer, active, ref);
  ref.current = second;
  active = rebindBoundaryObserver(observer, active, ref);
  assert.deepEqual(released, [first], "The detached stage is released before replacement observation.");
  assert.deepEqual(observed, [first, second]);
  const trigger = { left: 360, top: 280, right: 432, bottom: 352, width: 72, height: 72 };
  const viewport = { left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800 };
  const replacementRect = { left: 200, top: 100, right: 600, bottom: 500, width: 400, height: 400 };
  assert.deepEqual(menuViewFromRects(trigger, 72, viewport, replacementRect), {
    left: -196, top: -216, right: 204, bottom: 184,
  }, "The replacement boundary supplies the next fitting view.");
  ref.current = null;
  active = rebindBoundaryObserver(observer, active, ref);
  assert.equal(active, null);
  assert.deepEqual(released, [first, second]);
});

test("linear navigation skips disabled actions, wraps and handles no enabled actions", () => {
  assert.equal(adjacentItem(items, "save", 1), "delete");
  assert.equal(adjacentItem(items, "save", -1), "delete");
  assert.equal(adjacentItem(items, "delete", 1), "save");
  assert.equal(adjacentItem(items, "removed", -1), "delete");
  assert.equal(edgeItem(items, "first"), "save");
  assert.equal(edgeItem(items, "last"), "delete");
  assert.equal(edgeItem([], "first"), undefined);
  assert.equal(adjacentItem(items.map(item => ({ ...item, disabled: true })), "save", 1), undefined);
});

test("split arrows follow visual positions independently of item ordering", () => {
  const points = [{ id: "right", x: 80, y: 0 }, { id: "down", x: 0, y: 80 }, { id: "middle", x: 0, y: 0 }, { id: "left", x: -80, y: 0 }];
  assert.equal(directionalItem(points, "middle", "ArrowRight"), "right");
  assert.equal(directionalItem(points, "middle", "ArrowLeft"), "left");
  assert.equal(directionalItem(points, "middle", "ArrowDown"), "down");
  assert.equal(directionalItem(points, "middle", "ArrowUp"), "middle");
});

test("typeahead supports prefixes, repeated-letter cycling, disabled skips and timeout reset", () => {
  const choices = [{ id: "save", label: "Save" }, { id: "share", label: "Share", disabled: true }, { id: "send", label: "Send" }, { id: "delete", label: "Delete" }];
  const first = typeaheadItem(choices, "delete", "s", 100, { text: "", time: 0 });
  assert.equal(first.id, "save");
  const repeat = typeaheadItem(choices, first.id, "s", 200, first.state);
  assert.equal(repeat.id, "send");
  const prefix = typeaheadItem(choices, first.id, "e", 200, first.state);
  assert.equal(prefix.id, "send");
  const reset = typeaheadItem(choices, "send", "d", 1000, prefix.state);
  assert.equal(reset.id, "delete");
  const symbols = [{ id: "one", label: "😀 One" }, { id: "two", label: "😀 Two" }];
  assert.equal(typeaheadItem(symbols, "one", "😀", 100, { text: "😀", time: 0 }).id, "two");
});

const layoutItems = Array.from({ length: 6 }, (_, index) => ({ id: actionSurfaceId(String(index)), w: 56, h: 56 }));
const arrange = (options = {}) => makeMenuLayout({ mode: "split", trigger: 72, items: layoutItems, layout: "fan",
  direction: "top", distance: 0, labels: false, view: { left: -500, top: -400, right: 500, bottom: 400 }, ...options });
const relative = (layout, surface) => ({ ...surface, x: surface.x - layout.anchor.x, y: surface.y - layout.anchor.y });

test("fully offscreen anchors keep prospective groups local instead of projecting orphan surfaces into view", () => {
  const viewport = { width: 1024, height: 768 };
  for (const distance of [3000, 25000, 120000]) {
    const anchors = [{ x: 512, y: -distance }, { x: 512, y: viewport.height + distance },
      { x: -distance, y: 384 }, { x: viewport.width + distance, y: 384 }];
    for (const anchor of anchors) for (const mode of ["split", "panel"]) for (const arrangement of ["fan", "row", "column"]) {
      const view = { left: -anchor.x, right: viewport.width - anchor.x, top: -anchor.y, bottom: viewport.height - anchor.y };
      const layout = arrange({ mode, layout: arrangement, view });
      assert(layout.width <= 1344 && layout.height <= 1088,
        `${mode}/${arrangement} bounds must depend on local viewport size, not distance down the page`);
      const group = { left: anchor.x - layout.anchor.x, top: anchor.y - layout.anchor.y };
      assert(group.left + layout.width <= 0 || group.left >= viewport.width || group.top + layout.height <= 0 || group.top >= viewport.height,
        "A distant offscreen trigger must not reserve an on-screen graphics group");
      for (const surface of layout.expanded.filter(s => s.width > 0 && s.height > 0)) {
        const x = anchor.x + surface.x - layout.anchor.x, y = anchor.y + surface.y - layout.anchor.y;
        assert(x + surface.width / 2 <= 0 || x - surface.width / 2 >= viewport.width ||
          y + surface.height / 2 <= 0 || y - surface.height / 2 >= viewport.height,
        "Prospective expanded surfaces must remain beside the offscreen trigger");
      }
      const closed = relative(layout, layout.closed.find(s => s.id === TRIGGER_ID));
      assert.equal(closed.x, 0); assert.equal(closed.y, 0);
      assert.equal(closed.width, 72); assert.equal(closed.height, 72);
    }
  }
});

test("offscreen local geometry stays within the public group size limit even with a very large measured viewport", () => {
  const layout = arrange({ mode: "panel", labels: true,
    items: layoutItems.map(item => ({ ...item, w: 60000 })),
    view: { left: -50000, right: 50000, top: 1000000, bottom: 1100000 } });
  assert(layout.width > 0 && layout.width <= 16384);
  assert(layout.height > 0 && layout.height <= 16384);
  assert(layout.panel.contentWidth > layout.panel.w, "Oversized content remains scrollable within the bounded panel");
});

test("partially visible triggers continue to fit panels against the real viewport edges", () => {
  const viewport = { width: 1024, height: 768 };
  const anchors = [{ x: -35, y: 384 }, { x: 1059, y: 384 }, { x: 512, y: -35 }, { x: 512, y: 803 }];
  for (const anchor of anchors) {
    const view = { left: -anchor.x, right: viewport.width - anchor.x, top: -anchor.y, bottom: viewport.height - anchor.y };
    const layout = arrange({ mode: "panel", labels: true, view });
    const pane = relative(layout, layout.expanded.find(s => s.id === TRIGGER_ID));
    assert(pane.x - pane.width / 2 >= view.left + 8 - .01);
    assert(pane.x + pane.width / 2 <= view.right - 8 + .01);
    assert(pane.y - pane.height / 2 >= view.top + 56 - .01);
    assert(pane.y + pane.height / 2 <= view.bottom - 8 + .01);
  }
});

test("fitting respects actual anchor position and flips a horizontal menu away from an edge", () => {
  const view = { left: -740, right: 60, top: -250, bottom: 250 };
  const layout = arrange({ layout: "row", direction: "right", items: layoutItems.slice(0, 3), view });
  assert.equal(layout.mode, "split");
  assert.equal(layout.direction, "left");
  const trigger = relative(layout, layout.expanded.find(s => s.id === TRIGGER_ID));
  assert.equal(trigger.x, 0); assert.equal(trigger.y, 0);
  for (const surface of layout.expanded.filter(s => s.id.startsWith("glaze:action:"))) {
    const s = relative(layout, surface);
    assert(s.x - s.width / 2 >= view.left + 8);
    assert(s.x + s.width / 2 <= view.right - 8);
  }
});

test("negative fan offsets translate the arc rigidly and preserve the trigger anchor", () => {
  const normal = arrange(), close = arrange({ distance: -60 });
  assert.equal(normal.mode, "split"); assert.equal(close.mode, "split");
  const a = normal.expanded.filter(s => s.id.startsWith("glaze:action:"));
  const b = close.expanded.filter(s => s.id.startsWith("glaze:action:"));
  assert(relative(close, b[0]).y > relative(normal, a[0]).y + 1, "Negative top offset must move the arc toward its trigger");
  for (let i = 1; i < a.length; i++) {
    assert(Math.abs((a[i].x - a[0].x) - (b[i].x - b[0].x)) < 1e-6);
    assert(Math.abs((a[i].y - a[0].y) - (b[i].y - b[0].y)) < 1e-6);
  }
  assert.deepEqual(relative(close, close.closed.find(s => s.id === TRIGGER_ID)),
    relative(normal, normal.closed.find(s => s.id === TRIGGER_ID)));
});

test("panel and split keep stable closed/expanded bounds and an invisible anchor marker", () => {
  for (const mode of ["split", "panel"]) {
    const layout = arrange({ mode });
    const marker = layout.expanded.find(s => s.id === ANCHOR_ID);
    assert.equal(marker.width, 0); assert.equal(marker.height, 0);
    assert.deepEqual(marker, layout.closed.find(s => s.id === ANCHOR_ID));
    const trigger = relative(layout, layout.closed.find(s => s.id === TRIGGER_ID));
    assert.equal(trigger.x, 0); assert.equal(trigger.y, 0);
    assert.equal(trigger.width, 72); assert.equal(trigger.height, 72);
  }
});

test("tight viewports retain all actions in a scrollable panel instead of truncating", () => {
  const layout = arrange({ view: { left: -40, top: -80, right: 40, bottom: 80 } });
  assert.equal(layout.mode, "panel");
  assert(layout.panel.contentHeight + 24 > layout.panel.h);
  assert.equal(Math.ceil(layoutItems.length / layout.panel.columns) * 56, layout.panel.contentHeight);
  const pane = relative(layout, layout.expanded.find(s => s.id === TRIGGER_ID));
  assert(pane.x - pane.width / 2 >= -32); assert(pane.x + pane.width / 2 <= 32);
  assert(pane.y - pane.height / 2 >= -24); assert(pane.y + pane.height / 2 <= 72);
});

test("measured wide labels are fitted without overlap or silently lost actions", () => {
  for (const width of [240, 390, 800]) for (const anchor of [36, width / 2, width - 36]) {
    const view = { left: -anchor, right: width - anchor, top: -200, bottom: 350 };
    const source = layoutItems.map((item, index) => ({ ...item, w: 120 + index * 30 }));
    const layout = arrange({ view, labels: true, items: source });
    if (layout.mode === "split") {
      const actions = layout.expanded.filter(s => s.id.startsWith("glaze:action:"));
      assert.equal(actions.length, source.length);
      for (const surface of actions) {
        const s = relative(layout, surface);
        assert(s.x - s.width / 2 >= view.left + 8 - .01);
        assert(s.x + s.width / 2 <= view.right - 8 + .01);
      }
      for (let i = 0; i < actions.length; i++) for (let j = i + 1; j < actions.length; j++) {
        const a = actions[i], b = actions[j];
        assert(Math.abs(a.x - b.x) >= (a.width + b.width) / 2 + 12 - .01 ||
          Math.abs(a.y - b.y) >= (a.height + b.height) / 2 + 12 - .01, "Measured action hit boxes must remain separated");
      }
    } else assert.equal(layout.panel.contentHeight, source.length * 56);
  }
});
