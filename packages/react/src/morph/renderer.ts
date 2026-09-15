import * as THREE from "three";
import { createOpticalMaterial } from "../engine/sampling.js";
import { environment, addLights, updateMaterial } from "../engine/material.js";
import type { GlassSettings } from "../types.js";
import { boundedPixelRatio } from "../engine/resolution.js";
import { FIELD_GLSL } from "./field.js";
import { MAX_SURFACES, type Size, type Surface } from "./model.js";

const UNIT = (1.42 * 1.08 * 2) / 280;
const sharedVertex = /* glsl */ `
uniform vec2 uSize;
varying vec2 vPoint;
void main() {
  vPoint = vec2(uv.x * uSize.x, (1.0 - uv.y) * uSize.y);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export class MorphRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 40);
  readonly optical = createOpticalMaterial();
  readonly settings: GlassSettings;
  private baseThickness: number;
  readonly uniforms = {
    uShapes: {
      value: Array.from({ length: MAX_SURFACES }, () => new THREE.Vector4()),
    },
    uRadii: { value: Array.from({ length: MAX_SURFACES }, () => 0) },
    uCount: { value: 0 },
    uBridge: { value: 22 },
    uSize: { value: new THREE.Vector2(1, 1) },
    uDepth: { value: 0.44 },
    uRim: { value: 0.95 },
    uLight: { value: new THREE.Vector2(-0.707, 0.707) },
    uFlat: { value: 0 },
    uBodyLens: { value: 1 },
    uShadowOpacity: { value: 0.16 },
  };
  private env: THREE.WebGLRenderTarget;
  private mesh: THREE.Mesh;
  private shadow: THREE.Mesh;
  private source?: THREE.CanvasTexture;
  private disposed = false;
  private size: Size = { w: 1, h: 1 };
  private lost = false;
  private failed = false;
  private abort = new AbortController();
  frames = 0;
  lastSubmissionMs = 0;

  constructor(
    canvas: HTMLCanvasElement,
    settings: GlassSettings,
    onError: (message: string) => void,
    onRestore: () => void,
  ) {
    this.settings = { ...settings };
    this.baseThickness = settings.thickness;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "default",
    });
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.settings.exposure;
    this.renderer.autoClear = false;
    this.renderer.debug.onShaderError = (gl, program, vertex, fragment) => {
      this.failed = true;
      onError(
        gl.getShaderInfoLog(fragment) ||
          gl.getShaderInfoLog(vertex) ||
          gl.getProgramInfoLog(program) ||
          "Shader compilation failed",
      );
    };
    this.camera.position.z = 12;
    this.env = environment(this.renderer);
    this.scene.environment = this.env.texture;
    addLights(this.scene);
    const material = this.optical.material;
    updateMaterial(material, this.settings);
    material.transparent = true;
    material.depthWrite = false;
    material.side = THREE.FrontSide;
    const original = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      original(shader, renderer);
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader =
        "uniform vec2 uSize; varying vec2 vPoint;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvPoint = vec2(uv.x * uSize.x, (1.0 - uv.y) * uSize.y);",
      );
      shader.fragmentShader =
        FIELD_GLSL +
        `
varying vec2 vPoint;
uniform float uDepth;
uniform float uRim;
uniform vec2 uLight;
uniform float uFlat;
uniform float uBodyLens;
` +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_begin>",
        `
vec4 surface = field(vPoint);
float edgeAA = max(0.5, fwidth(surface.x));
if (surface.x > edgeAA) discard;
diffuseColor.a *= 1.0 - smoothstep(-edgeAA, edgeAA, surface.x);
#include <normal_fragment_begin>
float epsilon = 0.35;
vec2 gradient = vec2(
  field(vPoint + vec2(epsilon, 0.0)).x - field(vPoint - vec2(epsilon, 0.0)).x,
  field(vPoint + vec2(0.0, epsilon)).x - field(vPoint - vec2(0.0, epsilon)).x
);
float gradientLength = length(gradient);
gradient /= max(gradientLength, 0.00001);
float localUnit = 3.0672 / max(30.0, surface.y);
float bevel = max(0.5, min(min(surface.w * 0.45, min(surface.y, surface.z) * 0.18), uDepth * 0.6 / localUnit));
float q = clamp(1.0 + surface.x / bevel, 0.0, 0.9999);
float radial = uDepth * 0.32 * q;
float nz = bevel * localUnit * sqrt(max(0.00001, 1.0 - q * q));
normal = normalize(vec3(gradient.x * radial, -gradient.y * radial, nz));
float bodyRadius = max(1.0, min(surface.y, surface.z) * 0.5);
float bodySlope = 0.24 * clamp(1.0 + surface.x / bodyRadius, 0.0, 1.0) * uBodyLens;
normal = normalize(vec3(normal.xy + vec2(gradient.x, -gradient.y) * normal.z * bodySlope, normal.z));
nonPerturbedNormal = normal;
`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `
#include <emissivemap_fragment>
float rim = exp(-abs(surface.x + 0.7) / 1.15);
float directional = pow(max(0.0, dot(vec2(gradient.x, -gradient.y), uLight)), 2.0);
totalEmissiveRadiance += vec3(0.94, 0.97, 1.0) * rim * (0.08 + directional * 0.8) * uRim;
`,
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        `
if (uFlat > 0.5) outgoingLight = vec3(0.68, 0.79, 0.92) + vec3(0.18) * normal.z;
#include <opaque_fragment>
`,
      );
    };
    material.customProgramCacheKey = () => "react-glaze-morph-field-v1";
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    this.mesh.position.z = 0.32 + this.settings.depth * 0.72;
    const shadowMaterial = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: sharedVertex,
      fragmentShader:
        FIELD_GLSL +
        `
varying vec2 vPoint;
uniform float uShadowOpacity;
void main() {
  float d = field(vPoint - vec2(2.5, 8.0)).x;
  float alpha = exp(-pow(max(0.0, d) / 12.0, 2.0)) * uShadowOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(0.025, 0.04, 0.06, alpha);
}
`,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMaterial);
    this.shadow.position.z = -0.5;
    this.shadow.renderOrder = 0;
    this.mesh.renderOrder = 1;
    this.scene.add(this.shadow, this.mesh);
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        this.lost = true;
        onError("Graphics context lost; native controls remain available.");
      },
      { signal: this.abort.signal },
    );
    canvas.addEventListener(
      "webglcontextrestored",
      () => {
        if (this.disposed) return;
        try {
          this.lost = false;
          this.failed = false;
          this.env.dispose();
          this.env = environment(this.renderer);
          this.scene.environment = this.env.texture;
          if (this.source) this.source.needsUpdate = true;
          onRestore();
        } catch (error) {
          this.failed = true;
          onError(String(error));
        }
      },
      { signal: this.abort.signal },
    );
  }

  resize(size: Size) {
    if (this.disposed || size.w < 1 || size.h < 1) return;
    this.size = size;
    const dpr = boundedPixelRatio(
      size.w,
      size.h,
      Math.min(devicePixelRatio || 1, this.settings.maxDpr),
    );
    this.renderer.setDrawingBufferSize(
      Math.round(size.w * dpr),
      Math.round(size.h * dpr),
      1,
    );
    this.uniforms.uSize.value.set(size.w, size.h);
    this.camera.left = (-size.w * UNIT) / 2;
    this.camera.right = -this.camera.left;
    this.camera.top = (size.h * UNIT) / 2;
    this.camera.bottom = -this.camera.top;
    this.camera.updateProjectionMatrix();
    for (const mesh of [this.mesh, this.shadow]) {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(size.w * UNIT, size.h * UNIT);
    }
  }

  setSource(canvas: HTMLCanvasElement) {
    if (this.disposed) {
      canvas.width = canvas.height = 0;
      return;
    }
    const old = this.source;
    this.source = new THREE.CanvasTexture(canvas);
    this.source.colorSpace = THREE.SRGBColorSpace;
    this.source.minFilter = THREE.LinearMipmapLinearFilter;
    this.source.magFilter = THREE.LinearFilter;
    this.source.generateMipmaps = true;
    this.source.needsUpdate = true;
    old?.dispose();
    if (old?.image) old.image.width = old.image.height = 0;
  }

  setLight(x: number, y: number) {
    if (Math.hypot(x, y) > 0.1)
      this.uniforms.uLight.value.set(x, -y).normalize();
  }

  get available() {
    return !this.disposed && !this.lost && !this.failed;
  }

  configure(settings: GlassSettings, refraction: number) {
    Object.assign(this.settings, settings);
    this.baseThickness = settings.thickness;
    updateMaterial(this.optical.material, this.settings);
    this.renderer.toneMappingExposure = settings.exposure;
    this.uniforms.uDepth.value = settings.depth;
    this.uniforms.uShadowOpacity.value = settings.shadowOpacity;
    this.mesh.position.z = 0.32 + settings.depth * 0.72;
    this.setRefraction(refraction);
  }

  setRefraction(strength: number) {
    const normalized = Number.isFinite(strength)
      ? Math.max(0, Math.min(3, strength))
      : 1;
    this.settings.thickness = this.baseThickness * normalized;
    this.optical.material.thickness = this.settings.thickness;
  }

  draw(surfaces: Surface[], bridge: number, flat = false) {
    if (!this.available || !this.source || !this.settings.enabled) return false;
    const visible = surfaces
      .filter((s) => s.w > 0.01 && s.h > 0.01)
      .slice(0, MAX_SURFACES);
    this.uniforms.uCount.value = visible.length;
    this.uniforms.uBridge.value = bridge;
    this.uniforms.uFlat.value = Number(flat);
    visible.forEach((s, i) => {
      this.uniforms.uShapes.value[i].set(s.x, s.y, s.w, s.h);
      this.uniforms.uRadii.value[i] = s.r;
    });
    const center = visible[0] ?? { x: this.size.w / 2, y: this.size.h / 2 };
    this.optical.update(
      this.source,
      this.settings,
      (center.x - this.size.w / 2) * UNIT,
      (this.size.h / 2 - center.y) * UNIT,
    );
    const dpr = this.renderer.domElement.width / this.size.w;
    const padding = bridge + 38;
    const left = Math.max(
      0,
      Math.min(...visible.map((s) => s.x - s.w / 2)) - padding,
    );
    const right = Math.min(
      this.size.w,
      Math.max(...visible.map((s) => s.x + s.w / 2)) + padding,
    );
    const top = Math.max(
      0,
      Math.min(...visible.map((s) => s.y - s.h / 2)) - padding,
    );
    const bottom = Math.min(
      this.size.h,
      Math.max(...visible.map((s) => s.y + s.h / 2)) + padding,
    );
    this.renderer.setScissorTest(false);
    this.renderer.clear();
    if (!visible.length || right <= left || bottom <= top) return true;
    this.renderer.setScissor(
      Math.floor(left * dpr),
      Math.floor((this.size.h - bottom) * dpr),
      Math.ceil((right - left) * dpr),
      Math.ceil((bottom - top) * dpr),
    );
    this.renderer.setScissorTest(true);
    const started = performance.now();
    this.renderer.render(this.scene, this.camera);
    this.lastSubmissionMs = performance.now() - started;
    this.frames++;
    return this.available;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.abort.abort();
    this.mesh.geometry.dispose();
    this.optical.material.dispose();
    this.shadow.geometry.dispose();
    (this.shadow.material as THREE.Material).dispose();
    this.env.dispose();
    this.source?.dispose();
    if (this.source?.image)
      this.source.image.width = this.source.image.height = 0;
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
