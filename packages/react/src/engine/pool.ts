import { resolveRadii, isFullEllipse } from "./radii.js";
import * as THREE from "three";
import {
  environment,
  addLights,
  createShadow,
  updateMaterial,
} from "./material.js";
import { WORLD_WIDTH } from "./geometry.js";
import { GeometryCache, layoutDimension } from "./geometry-cache.js";
import { createOpticalMaterial } from "./sampling.js";
import { boundedPixelRatio, drawingBufferSize } from "./resolution.js";
import { sameFrame, type FrameState } from "./frame-state.js";
import type { GlassSettings } from "../types.js";
import type { LiveMediaSource } from "./live-media-source.js";

export interface Snapshot {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  duration: number;
  startedAt: number;
  liveSource?: LiveMediaSource;
}
interface PoolCallbacks {
  onContextLost: () => void;
  onContextRestored: () => void;
  onError: (error: Error) => void;
}
export class RendererPool {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 30);
  private optical = createOpticalMaterial();
  private material = this.optical.material;
  private mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
  private shadow = createShadow();
  private geometries = new GeometryCache();
  private env: THREE.WebGLRenderTarget;
  private abort = new AbortController();
  private disposed = false;
  private contextLost = false;
  private bufferWidth = 0;
  private bufferHeight = 0;
  private frames = new WeakMap<HTMLCanvasElement, FrameState>();
  constructor(
    private callbacks: PoolCallbacks,
    canvas?: HTMLCanvasElement,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "default",
    });
    this.mesh.geometry.dispose();
    this.renderer.setClearColor(0, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.debug.onShaderError = () => {
      throw new Error("LiquidGlass shader compilation failed");
    };
    this.camera.position.z = 12;
    this.env = environment(this.renderer);
    this.scene.environment = this.env.texture;
    this.mesh.position.z = 0.32;
    this.shadow.position.set(0.04, -0.05, -0.52);
    this.scene.add(this.mesh, this.shadow);
    addLights(this.scene);
    const options = { signal: this.abort.signal };
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        this.contextLost = true;
        this.frames = new WeakMap();
        // Release listeners/handles while the old context is lost. Disposing
        // old render targets after restoration is invalid in WebKit.
        this.env.dispose();
        this.geometries.dispose();
        this.material.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.map?.dispose();
        this.shadow.material.dispose();
        this.callbacks.onContextLost();
      },
      options,
    );
    // Three restores its GL state first. Render-target contents (the studio
    // environment) must be regenerated; ordinary textures upload again lazily.
    this.renderer.domElement.addEventListener(
      "webglcontextrestored",
      () => {
        if (this.disposed) return;
        try {
          this.env = environment(this.renderer);
          this.scene.environment = this.env.texture;
          this.material.needsUpdate = true;
          this.bufferWidth = this.bufferHeight = 0;
          this.frames = new WeakMap();
          this.contextLost = false;
          this.callbacks.onContextRestored();
        } catch (error) {
          this.callbacks.onError(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      },
      options,
    );
  }
  get available() {
    return !this.disposed && !this.contextLost;
  }
  draw(
    host: HTMLElement,
    canvas: HTMLCanvasElement,
    root: HTMLElement,
    texture: THREE.CanvasTexture,
    s: GlassSettings,
  ) {
    if (this.disposed || this.contextLost) return;
    const rect = host.getBoundingClientRect(),
      rootRect = root.getBoundingClientRect();
    if (
      rect.width <= 0 ||
      rect.height <= 0 ||
      rootRect.width <= 0 ||
      rootRect.height <= 0
    ) {
      this.forget(canvas);
      return;
    }
    const hostStyle = getComputedStyle(host);
    const radii = resolveRadii(rect.width, rect.height, hostStyle);
    if (s.shape === "lens" && !isFullEllipse(rect.width, rect.height, radii))
      s = { ...s, shape: "rounded" };
    const sourceLens = s.optics === "reference" && s.shape === "lens";
    const lensScaleX =
      sourceLens && rootRect.width < rootRect.height ? 1.1 : 1.08;
    const worldWidth = sourceLens ? 2 * 1.42 * lensScaleX : WORLD_WIDTH;
    const layoutWidth = layoutDimension(rect.width),
      layoutHeight = layoutDimension(rect.height);
    const pad = 24,
      cssWidth = layoutWidth + pad * 2,
      cssHeight = layoutHeight + pad * 2;
    const dpr = boundedPixelRatio(
        cssWidth,
        cssHeight,
        Math.min(devicePixelRatio || 1, s.maxDpr),
      ),
      unit = worldWidth / layoutWidth,
      worldH = layoutHeight * unit;
    const width = Math.max(1, Math.floor(cssWidth * dpr)),
      height = Math.max(1, Math.floor(cssHeight * dpr));
    const repeatX = cssWidth / rootRect.width,
      repeatY = cssHeight / rootRect.height,
      offsetX = (rect.left - pad - rootRect.left) / rootRect.width,
      offsetY =
        1 - (rect.top - pad - rootRect.top + cssHeight) / rootRect.height,
      sceneX =
        (rect.left + rect.width / 2 - rootRect.left - rootRect.width / 2) *
        unit,
      sceneY =
        (rootRect.top + rootRect.height / 2 - rect.top - rect.height / 2) *
        unit;
    const borderLeft = parseFloat(hostStyle.borderLeftWidth),
      borderTop = parseFloat(hostStyle.borderTopWidth);
    const frame: FrameState = {
      host,
      root,
      texture,
      version: texture.version,
      image: texture.image,
      style: canvas.style.cssText,
      settings: s,
      // Preserve exact sampling coordinates; geometry's existing 1/64px
      // normalization must not hide fractional optical movement.
      inputs: [
        rect.width,
        rect.height,
        rootRect.width,
        rootRect.height,
        texture.image.width,
        texture.image.height,
        repeatX,
        repeatY,
        offsetX,
        offsetY,
        sceneX,
        sceneY,
        dpr,
        width,
        height,
        borderLeft,
        borderTop,
        ...radii.flat(),
      ],
    };
    const layerStyle = {
      width: `${cssWidth}px`,
      height: `${cssHeight}px`,
      left: `${-pad - borderLeft}px`,
      top: `${-pad - borderTop}px`,
      right: "auto",
      bottom: "auto",
    };
    if (
      canvas.style.visibility === "visible" &&
      canvas.width === width &&
      canvas.height === height &&
      sameFrame(this.frames.get(canvas), frame)
    )
      return {
        reused: true,
        renderMs: 0,
        copyMs: 0,
        geometryCount: this.geometries.size,
      };
    // A failed draw/copy can clear the previous output. Only successful
    // presentation below may make this destination reusable again.
    this.forget(canvas);
    const direct = canvas === this.renderer.domElement;
    const buffer = direct
      ? { width, height }
      : drawingBufferSize(this.bufferWidth, this.bufferHeight, width, height);
    if (
      buffer.width !== this.bufferWidth ||
      buffer.height !== this.bufferHeight
    ) {
      this.renderer.setDrawingBufferSize(buffer.width, buffer.height, 1);
      this.bufferWidth = buffer.width;
      this.bufferHeight = buffer.height;
    }
    this.renderer.setViewport(0, 0, width, height);
    this.renderer.setScissor(0, 0, width, height);
    this.renderer.setScissorTest(true);
    this.renderer.toneMappingExposure = s.exposure;
    this.camera.left = -worldWidth / 2 - pad * unit;
    this.camera.right = -this.camera.left;
    this.camera.top = worldH / 2 + pad * unit;
    this.camera.bottom = -this.camera.top;
    this.camera.updateProjectionMatrix();
    this.mesh.geometry = this.geometries.get(
      rect.width,
      rect.height,
      s,
      s.shape === "lens" ? undefined : radii,
    );
    if (sourceLens)
      this.mesh.scale.set(
        lensScaleX,
        (lensScaleX * layoutHeight) / layoutWidth,
        s.depth,
      );
    else this.mesh.scale.set(1, 1, 1);
    this.mesh.rotation.z = s.shape === "lens" ? -0.1 : 0;
    updateMaterial(this.material, s);
    this.shadow.material.opacity = s.shadowOpacity;
    if (s.optics === "reference" && s.shape === "lens") {
      this.shadow.scale.set(3.8, 3.8, 1);
      this.shadow.position.set(0.11, -0.13, -0.52);
    } else {
      this.shadow.scale.set(WORLD_WIDTH * 1.15, worldH * 1.2, 1);
      this.shadow.position.set(0.04, -0.05, -0.52);
    }
    texture.repeat.set(repeatX, repeatY);
    texture.offset.set(offsetX, offsetY);
    this.optical.update(texture, s, sceneX, sceneY);
    for (const [key, value] of Object.entries(layerStyle))
      if (canvas.style.getPropertyValue(key) !== value)
        canvas.style.setProperty(key, value);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const start = performance.now();
    this.renderer.render(this.scene, this.camera);
    const renderMs = performance.now() - start;
    if (direct) {
      canvas.style.visibility = "visible";
      this.frames.set(canvas, {
        ...frame,
        settings: { ...s },
        style: canvas.style.cssText,
      });
      return {
        reused: false,
        renderMs,
        copyMs: 0,
        geometryCount: this.geometries.size,
      };
    }
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is unavailable");
    const copyStart = performance.now();
    context.clearRect(0, 0, width, height);
    // WebGL's viewport starts at the bottom; Canvas 2D's image starts at the top.
    context.drawImage(
      this.renderer.domElement,
      0,
      this.bufferHeight - height,
      width,
      height,
      0,
      0,
      width,
      height,
    );
    const copyMs = performance.now() - copyStart;
    if (canvas.style.visibility !== "visible")
      canvas.style.visibility = "visible";
    this.frames.set(canvas, {
      ...frame,
      settings: { ...s },
      style: canvas.style.cssText,
    });
    return {
      reused: false,
      renderMs,
      copyMs,
      geometryCount: this.geometries.size,
    };
  }
  forget(canvas: HTMLCanvasElement) {
    this.frames.delete(canvas);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.frames = new WeakMap();
    this.abort.abort();
    this.geometries.dispose();
    this.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.map?.dispose();
    this.shadow.material.dispose();
    this.env.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
