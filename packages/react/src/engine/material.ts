import * as THREE from "three";
import type { GlassSettings } from "../types.js";

// Adapted from the frozen Drawn To studio. See THIRD-PARTY-NOTICES.md.
export function environment(renderer: THREE.WebGLRenderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color("#1b2028");
  const panels: [number, number, number, number, number, string, number][] = [
    [-4, 5, 4, 3.4, 7, "#fff9ef", 3.4],
    [4, 2, 3, 0.7, 6, "#c9e6ff", 2.7],
    [0, 6, -2, 7, 1.8, "#ffffff", 3],
    [-3, -2, -4, 4, 3, "#aeb5be", 1.3],
    [3, 1, -4, 3.5, 6, "#e7ecf4", 2.5],
  ];
  for (const [x, y, z, w, h, color, intensity] of panels) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
      }),
    );
    panel.position.set(x, y, z);
    panel.lookAt(0, 0, 0);
    room.add(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer),
    target = generator.fromScene(room, 0.015, 0.1, 25);
  generator.dispose();
  room.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      (node.material as THREE.Material).dispose();
    }
  });
  return target;
}
export function addLights(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight("#d9e9fb", "#222832", 0.42));
  const key = new THREE.DirectionalLight("#fff8ed", 2.4);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#b9d5fc", 0.7);
  fill.position.set(4, 1, -2);
  scene.add(fill);
}
export function createShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 125);
  g.addColorStop(0, "rgba(10,17,20,1)");
  g.addColorStop(0.45, "rgba(10,17,20,.42)");
  g.addColorStop(1, "rgba(10,17,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
}
export function updateMaterial(
  material: THREE.MeshPhysicalMaterial,
  s: GlassSettings,
) {
  material.color.set(s.color);
  material.metalness = 0;
  material.roughness = s.roughness;
  material.thickness = s.thickness;
  material.ior = s.ior;
  material.dispersion = s.dispersion;
  material.clearcoat = s.clearcoat;
  material.clearcoatRoughness = s.clearcoatRoughness;
  material.attenuationColor.set(s.attenuationColor);
  material.attenuationDistance = s.attenuationDistance;
  material.envMapIntensity = s.envMapIntensity;
}
