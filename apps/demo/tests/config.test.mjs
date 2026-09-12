import assert from "node:assert/strict";
import test from "node:test";
import { RIM_LIGHT_DEFAULTS } from "react-glaze";
import {
  componentCode,
  componentProps,
  initialState,
  readInitialState,
  shareableState,
} from "../src/components/playground/config.ts";

const searchFor = (value) =>
  `?${new URLSearchParams({ config: JSON.stringify(value) })}`;

test("legacy share URLs retain shape behavior and leave rim light off", () => {
  const state = readInitialState(
    searchFor({
      preset: "quiet",
      settings: { shape: "circle" },
      width: 160,
      height: 220,
      background: "alpine",
      motion: true,
      example: "card",
    }),
  );

  assert.equal(state.rimLight, false);
  assert.equal(state.background, "alpine");
  assert.equal(state.motion, true);
  assert.equal(state.example, "card");
  const props = componentProps(state);
  assert.equal(props.shape, "circle");
  assert.equal(props.width, 160);
  assert.equal("height" in props, false);
  assert.equal("radius" in props, false);
  assert.equal("rimLight" in props, false);
});

for (const mode of ["static", "pointer"]) {
  test(`${mode} rim settings survive URL and JSON component export`, () => {
    const rimLight = {
      mode,
      onLeave: "hold",
      strength: 0.65,
      width: 2.4,
      reach: 140,
      response: 0.22,
    };
    const state = {
      ...initialState,
      rimLight,
      width: "fit-content",
      height: "auto",
    };

    const restored = readInitialState(searchFor(shareableState(state)));
    assert.deepEqual(restored.rimLight, rimLight);
    assert.equal(restored.width, "fit-content");
    assert.equal(restored.height, "auto");
    assert.equal("rimLight" in restored.settings, false);

    const exported = JSON.parse(
      JSON.stringify({ component: componentProps(restored) }),
    );
    assert.deepEqual(exported.component.rimLight, rimLight);
  });
}

test("boolean and partial URL props use the package's rim defaults", () => {
  assert.deepEqual(
    readInitialState(searchFor({ rimLight: true })).rimLight,
    RIM_LIGHT_DEFAULTS,
  );
  assert.deepEqual(
    readInitialState(searchFor({ rimLight: { mode: "static", reach: 0 } }))
      .rimLight,
    { ...RIM_LIGHT_DEFAULTS, mode: "static", reach: 0 },
  );
});

test("out-of-range shared rim values normalize before live props and export", () => {
  const restored = readInitialState(
    searchFor({
      rimLight: {
        mode: "pointer",
        strength: 8,
        width: 0,
        reach: 500,
        response: 2,
      },
    }),
  );

  assert.deepEqual(componentProps(restored).rimLight, {
    mode: "pointer",
    onLeave: "return",
    strength: 1,
    width: 0.5,
    reach: 220,
    response: 0.3,
  });
});

test("JSX exports rim settings as an object expression", () => {
  const rimLight = { ...RIM_LIGHT_DEFAULTS, mode: "static", width: 3 };
  const code = componentCode({ ...initialState, rimLight });
  const expression = code.match(/\brimLight=\{(\{[^\n]+\})\}/)?.[1];

  assert.ok(expression, "expected rimLight={{ ... }} in the generated JSX");
  assert.deepEqual(JSON.parse(expression), rimLight);
  assert.doesNotMatch(code, /\[object Object\]/);
});

test("rim changes leave material settings and the existing JSX export intact", () => {
  const baseline = readInitialState(
    searchFor({ ...shareableState(initialState), rimLight: false }),
  );
  const withRim = readInitialState(
    searchFor({
      ...shareableState(baseline),
      rimLight: { ...RIM_LIGHT_DEFAULTS, mode: "static" },
    }),
  );

  assert.deepEqual(withRim.settings, baseline.settings);
  const { rimLight, ...existingProps } = componentProps(withRim);
  assert.ok(rimLight);
  assert.deepEqual(existingProps, componentProps(baseline));
  assert.equal(
    componentCode(withRim).replace(/^\s*rimLight=\{\{[^\n]+\}\}\n/m, ""),
    componentCode(baseline),
  );
});

test("explicit off and legacy URLs preserve the default-off export", () => {
  for (const search of [searchFor({}), searchFor({ rimLight: false })]) {
    const restored = readInitialState(search);
    assert.equal(restored.rimLight, false);
    assert.equal("rimLight" in componentProps(restored), false);
    assert.doesNotMatch(componentCode(restored), /\brimLight=/);
  }
});

test("custom background fallback keeps the selected rim configuration", () => {
  const rimLight = { ...RIM_LIGHT_DEFAULTS, strength: 0.4 };
  const shared = shareableState({
    ...initialState,
    background: "custom",
    rimLight,
  });

  assert.equal(shared.background, "spectrum");
  assert.deepEqual(readInitialState(searchFor(shared)).rimLight, rimLight);
});

test("fresh and malformed queries use the exact landing pill material", () => {
  for (const search of ["", "?config={"]) {
    const state = readInitialState(search);
    assert.equal(state.preset, "reference");
    assert.equal(state.background, "soft");
    assert.equal(state.width, 280);
    assert.equal(state.height, "auto");
    assert.equal(state.example, "landing-pill");
    assert.equal(state.settings.shape, "pill");
    assert.equal(state.settings.lighting, "responsive");
    assert.equal(state.settings.contentMode, "sharp");
    assert.equal(state.settings.maxDpr, 2);
    assert.deepEqual(state.rimLight, {
      ...RIM_LIGHT_DEFAULTS,
      mode: "pointer",
      onLeave: "hold",
    });
    assert.deepEqual(readInitialState(searchFor(shareableState(state))), state);
  }
});

test("all landing artworks survive shared links", () => {
  for (const background of ["soft", "metal", "garden"]) {
    const state = { ...initialState, background };
    assert.deepEqual(readInitialState(searchFor(shareableState(state))), state);
  }
});

test("previous button configurations keep their original content and presentation", () => {
  const legacy = readInitialState(
    searchFor({
      preset: "frosted",
      example: "button",
      background: "optical-type",
      width: "fit-content",
      height: "fit-content",
      settings: {
        shape: "pill",
        roughness: 0.345,
        thickness: 0.52,
        ior: 1.27,
        lighting: "responsive",
      },
      rimLight: { ...RIM_LIGHT_DEFAULTS, strength: 0.45, onLeave: "return" },
    }),
  );
  assert.equal(legacy.example, "button");
  assert.equal(legacy.background, "optical-type");
  assert.equal(legacy.settings.thickness, 0.52);
  assert.equal(legacy.settings.roughness, 0.345);
  const code = componentCode(legacy);
  assert.match(code, /Explore the glass/);
  assert.match(code, /fontSize: 32/);
  assert.doesNotMatch(code, /demo-pill|A different feeling/);
});

test("landing pill JSX contains its presentation, responsive size, label and arrow", () => {
  const code = componentCode(initialState);
  assert.match(code, /as="button"/);
  assert.match(code, /type="button"/);
  assert.match(code, /className="demo-pill"/);
  assert.match(code, /A different feeling/);
  assert.match(code, /<svg/);
  assert.match(code, /--demo-pill-height: 76px/);
  assert.match(code, /minHeight: "var\(--demo-pill-height, 100px\)"/);
  assert.match(code, /inter-600.ttf/);
  assert.match(code, /"onLeave":"hold"/);
});
