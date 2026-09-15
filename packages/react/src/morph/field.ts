export const FIELD_GLSL = /* glsl */ `
uniform vec4 uShapes[8];
uniform float uRadii[8];
uniform int uCount;
uniform float uBridge;
vec4 field(vec2 p) {
  vec4 result = vec4(100000.0, 1.0, 1.0, 1.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uCount) break;
    vec4 s = uShapes[i];
    if (min(s.z, s.w) < 0.01) continue;
    float radius = min(uRadii[i], min(s.z, s.w) * 0.5);
    vec2 q = abs(p - s.xy) - s.zw * 0.5 + radius;
    float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
    vec4 next = vec4(distance, s.z, s.w, radius);
    float reach = max(0.001, uBridge);
    float blend = clamp(0.5 + 0.5 * (next.x - result.x) / reach, 0.0, 1.0);
    result = mix(next, result, blend);
    result.x -= reach * blend * (1.0 - blend);
  }
  return result;
}
`;
