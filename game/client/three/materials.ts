'use client';
import * as THREE from 'three';

/** Shared animated uniforms for wind-swayed foliage, grass and water. */
export const shared = {uTime: {value: 0}, uWind: {value: 1}};

let gradient: THREE.DataTexture | null = null;
/** Smooth, bright falloff: shadows stay soft and luminous (painterly, not hard cel bands). */
export function toonGradient() {
  if (gradient) return gradient;
  const n = 32;
  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const s = t * t * (3 - 2 * t);
    const v = Math.round(150 + (255 - 150) * s);
    data.set([v, v, Math.min(255, v + 6), 255], i * 4);
  }
  gradient = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.LinearFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const cache = new Map<string, THREE.Material>();
export function toon(color: string | number, opts: {emissive?: string; emissiveIntensity?: number; vertexColors?: boolean; transparent?: boolean; opacity?: number; side?: THREE.Side; wind?: number; map?: THREE.Texture} = {}) {
  const key = JSON.stringify([color, opts.emissive, opts.emissiveIntensity, opts.vertexColors, opts.transparent, opts.opacity, opts.side, opts.wind, opts.map?.uuid]);
  const hit = cache.get(key);
  if (hit) return hit as THREE.MeshToonMaterial;
  const material = new THREE.MeshToonMaterial({
    color, gradientMap: toonGradient(), vertexColors: !!opts.vertexColors,
    emissive: opts.emissive ?? '#000000', emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide, map: opts.map ?? null,
  });
  if (opts.wind) windify(material, opts.wind);
  addRim(material);
  cache.set(key, material);
  return material;
}

/** Soft rim light so silhouettes glow a little against the sky. */
function addRim(material: THREE.Material) {
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       float rimV = smoothstep(0.62, 1.0, 1.0 - abs(dot(normalize(-vViewPosition), normal)));
       gl_FragColor.rgb += vec3(1.0, 0.96, 0.88) * rimV * 0.14;`,
    );
  };
  material.customProgramCacheKey = () => `${material.type}-rim-${(material as {userData: {wind?: number}}).userData.wind ?? 0}`;
}

/** Vertex sway driven by world position so neighbouring trees move out of phase. */
export function windify(material: THREE.Material, strength: number) {
  material.userData.wind = strength;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nuniform float uWind;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec4 wpos = modelMatrix * vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        #endif
        float sway = max(transformed.y, 0.0) * ${strength.toFixed(3)} * uWind;
        transformed.x += sin(uTime * 1.6 + wpos.x * 0.35 + wpos.z * 0.2) * sway;
        transformed.z += cos(uTime * 1.3 + wpos.z * 0.33) * sway * 0.6;`);
  };
}

/** Convert a Kenney GLB to the shared toon look, keeping its colormap. */
export function toonify(root: THREE.Object3D, options: {shadows?: boolean; tint?: string} = {}) {
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = options.shadows ?? true;
    mesh.receiveShadow = true;
    const source = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const converted = source.map(m => {
      const std = m as THREE.MeshStandardMaterial;
      const key = `glb-${std.map?.uuid ?? 'none'}-${std.color?.getHexString()}-${options.tint ?? ''}`;
      let out = cache.get(key) as THREE.MeshToonMaterial | undefined;
      if (!out) {
        out = new THREE.MeshToonMaterial({color: std.color?.clone() ?? new THREE.Color('#ffffff'), map: std.map ?? null, gradientMap: toonGradient(), transparent: std.transparent, opacity: std.opacity, vertexColors: std.vertexColors});
        if (out.map) out.map.colorSpace = THREE.SRGBColorSpace;
        if (options.tint) out.color.multiply(new THREE.Color(options.tint));
        addRim(out);
        cache.set(key, out);
      }
      return out;
    });
    mesh.material = Array.isArray(mesh.material) ? converted : converted[0];
  });
  return root;
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
