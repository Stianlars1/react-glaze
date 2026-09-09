import test from "node:test";
import assert from "node:assert/strict";
import { CanvasTexture } from "three";
import { createOpticalMaterial } from "../dist/engine/sampling.js";
import { updateMaterial } from "../dist/engine/material.js";
import { REFERENCE } from "../dist/presets.js";

test("unchanged optical settings do not invalidate the shader program on each draw", () => {
  const optical = createOpticalMaterial(),
    texture = new CanvasTexture({ width: 1200, height: 720 });
  updateMaterial(optical.material, REFERENCE);
  optical.update(texture, REFERENCE);
  const version = optical.material.version;
  for (let i = 0; i < 50; i++) {
    updateMaterial(optical.material, REFERENCE);
    optical.update(texture, REFERENCE);
  }
  assert.equal(optical.material.version, version);
  assert.equal(
    optical.material.transmission,
    0,
    "The custom sampler should not schedule an opaque transmission pass",
  );
  const next = { ...REFERENCE, dispersion: 0 };
  updateMaterial(optical.material, next);
  optical.update(texture, next);
  assert.ok(optical.material.version > version);
  assert.equal(optical.material.dispersion, 0);
  optical.material.dispose();
  texture.dispose();
});
