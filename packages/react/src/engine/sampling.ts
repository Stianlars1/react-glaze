import { responsiveReflections } from "./reflections.js";
import { MeshPhysicalMaterial, ShaderChunk, Vector2, Vector4 } from "three";
import type { CanvasTexture } from "three";
import type { GlassSettings } from "../types.js";

// Direct sampling of the automatic DOM snapshot. The stock PBR
// lighting/Fresnel/dispersion/attenuation remain; no screen-sized opaque pass.
export function createOpticalMaterial() {
  const material = new MeshPhysicalMaterial();
  const uniforms = {
    liquidBackdrop: { value: null as CanvasTexture | null },
    liquidUv: { value: new Vector4() },
    liquidSize: { value: new Vector2() },
    liquidReference: { value: 0 },
    liquidResponsive: { value: 0 },
    liquidSceneOffset: { value: new Vector2() },
    transmission: { value: 1 },
    thickness: { value: 1.25 },
    attenuationDistance: { value: 16 },
    attenuationColor: { value: material.attenuationColor },
    dispersion: { value: 0.028 },
  };
  material.defines = {
    ...material.defines,
    USE_TRANSMISSION: "",
  };
  material.customProgramCacheKey = () => "liquid-direct-reflections-v2";
  material.onBeforeCompile = (shader) => {
    // Three is pinned; fail visibly if a future upgrade changes these chunks.
    if (
      !ShaderChunk.transmission_pars_fragment.includes(
        "return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );",
      ) ||
      !ShaderChunk.transmission_fragment.includes(
        "vec3 v = normalize( cameraPosition - pos );",
      )
    ) {
      throw new Error(
        "Unsupported Three.js transmission shader; verify the pinned engine version",
      );
    }
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader =
      "uniform sampler2D liquidBackdrop; uniform vec4 liquidUv; uniform vec2 liquidSize; uniform float liquidReference; uniform vec2 liquidSceneOffset; uniform float liquidResponsive;\n" +
      responsiveReflections(shader.fragmentShader);
    const pars = ShaderChunk.transmission_pars_fragment.replace(
      "return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );",
      `vec2 uv = fragCoord.xy * liquidUv.zw + liquidUv.xy;
     vec2 dx = dFdx(uv), dy = dFdy(uv);
     float footprint = max(length(dx * liquidSize), length(dy * liquidSize));
     float roughLod = log2(liquidSize.x) * applyIorToRoughness(roughness, ior);
     float sourceLod = liquidReference > 0.5 ? roughLod : max(log2(max(1.0, footprint)), roughLod);
     float lastMip = floor(log2(max(liquidSize.x, liquidSize.y)));
     if (sourceLod >= lastMip) return textureLod(liquidBackdrop, uv, lastMip);
     return textureBicubic(liquidBackdrop, uv, sourceLod);`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <transmission_fragment>",
      ShaderChunk.transmission_fragment.replace(
        "vec3 v = normalize( cameraPosition - pos );",
        "vec3 v = liquidReference > 0.5 ? normalize(cameraPosition - pos - vec3(liquidSceneOffset, 0.0)) : (isOrthographic ? transformNormalByInverseViewMatrix(vec3(0.0, 0.0, 1.0), viewMatrix) : normalize(cameraPosition - pos));",
      ),
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <transmission_pars_fragment>",
      pars,
    );
  };
  return {
    material,
    update(texture: CanvasTexture, s: GlassSettings, offsetX = 0, offsetY = 0) {
      uniforms.liquidResponsive.value = s.lighting === "responsive" ? 1 : 0;
      uniforms.liquidReference.value = s.optics === "reference" ? 1 : 0;
      uniforms.liquidSceneOffset.value.set(offsetX, offsetY);
      uniforms.transmission.value = s.transmission;
      uniforms.thickness.value = s.thickness;
      uniforms.attenuationDistance.value = s.attenuationDistance;
      uniforms.dispersion.value = s.dispersion;
      uniforms.liquidBackdrop.value = texture;
      uniforms.liquidUv.value.set(
        texture.offset.x,
        texture.offset.y,
        texture.repeat.x,
        texture.repeat.y,
      );
      uniforms.liquidSize.value.set(texture.image.width, texture.image.height);
    },
  };
}
