import { ShaderChunk } from "three";

// A finite-eye view and a bounded spherical light-probe proxy. The prefiltered
// studio texture is reused; no environment rendering or idle animation occurs.
export function responsiveReflections(fragment: string) {
  const projection = `
 vec3 liquidProbeDirection(vec3 direction) {
   if (liquidResponsive < 0.5) return direction;
   vec3 origin = cameraPosition - (vec4(vViewPosition,0.0) * viewMatrix).xyz + vec3(liquidSceneOffset,0.0);
   origin *= 6.0 / sqrt(36.0 + dot(origin,origin));
   float b = dot(origin,direction);
   float t = -b + sqrt(max(0.01,b*b + 64.0 - dot(origin,origin)));
   return normalize(origin + direction*t);
 }
 `;
  const view =
    "vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );";
  const radiance = "envMapRotation * reflectVec";
  if (
    !ShaderChunk.lights_fragment_begin.includes(view) ||
    !ShaderChunk.envmap_physical_pars_fragment.includes(radiance)
  )
    throw new Error("Unsupported Three.js reflection shader");
  return fragment
    .replace(
      "#include <envmap_physical_pars_fragment>",
      projection +
        ShaderChunk.envmap_physical_pars_fragment.replace(
          radiance,
          "envMapRotation * liquidProbeDirection(reflectVec)",
        ),
    )
    .replace(
      "#include <lights_fragment_begin>",
      ShaderChunk.lights_fragment_begin.replace(
        view,
        view +
          "\nif(liquidResponsive > 0.5) geometryViewDir = normalize(vViewPosition - mat3(viewMatrix)*vec3(liquidSceneOffset,0.0));",
      ),
    );
}
