'use client';
import {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {BEACH_Z, BUILDINGS, TOWN_BOUNDS, heightAt, isPathAt, PLAZA, waterAt, pondValue, distToPolyline, RIVER, RIVER_WIDTH, WATER_Y} from '@/game/core/map';
import {mulberry32} from '@/game/core/rng';
import {shared, toon, windify} from './materials';

export interface TreeSpec {x: number; z: number; s: number; kind: 'round' | 'pine' | 'blossom' | 'fruit'}

const PALETTES: Record<TreeSpec['kind'], string[]> = {
  round: ['#79c35a', '#8fd166', '#6db552', '#9bd46e'],
  pine: ['#4f9a5c', '#5aa866', '#478d55'],
  blossom: ['#f7b8cc', '#fbc9d8', '#f3a6bf', '#fde0e8'],
  fruit: ['#7cc35c', '#88cc62', '#6fb956'],
};

function colored(g: THREE.BufferGeometry, color: THREE.Color, jitter: () => number) {
  const geo = g.index ? g.toNonIndexed() : g;
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    c.copy(color).offsetHSL(0, 0, (jitter() - 0.5) * 0.04 + (geo.attributes.position.getY(i) > 0 ? 0.03 : -0.03));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  return geo;
}

/** All trees in two merged meshes (canopies + trunks): two draw calls for a whole forest. */
export function Trees({trees}: {trees: TreeSpec[]}) {
  const {canopy, trunk} = useMemo(() => {
    const random = mulberry32(17);
    const canopies: THREE.BufferGeometry[] = [], trunks: THREE.BufferGeometry[] = [];
    const brown = new THREE.Color('#9a6b45');
    for (const t of trees) {
      const y0 = heightAt(t.x, t.z);
      const s = t.s;
      const trunkH = (t.kind === 'pine' ? 1.0 : 1.5) * s;
      const tg = new THREE.CylinderGeometry(0.13 * s, 0.2 * s, trunkH, 7);
      tg.translate(t.x, y0 + trunkH / 2, t.z);
      trunks.push(colored(tg, brown, random));
      const palette = PALETTES[t.kind];
      if (t.kind === 'pine') {
        for (let k = 0; k < 3; k++) {
          const cone = new THREE.ConeGeometry((1.25 - k * 0.3) * s, 1.3 * s, 9);
          cone.translate(t.x, y0 + trunkH + (0.45 + k * 0.7) * s, t.z);
          canopies.push(colored(cone, new THREE.Color(palette[k % palette.length]), random));
        }
      } else {
        const blobs = 4 + Math.floor(random() * 3);
        for (let k = 0; k < blobs; k++) {
          const r = (0.75 + random() * 0.45) * s;
          const a = random() * Math.PI * 2, d = k === 0 ? 0 : (0.55 + random() * 0.35) * s;
          const ball = new THREE.IcosahedronGeometry(r, 1);
          ball.scale(1, 0.85, 1);
          ball.translate(t.x + Math.cos(a) * d, y0 + trunkH + 0.55 * s + (k === 0 ? 0.35 * s : random() * 0.6 * s), t.z + Math.sin(a) * d);
          canopies.push(colored(ball, new THREE.Color(palette[Math.floor(random() * palette.length)]), random));
        }
        if (t.kind === 'fruit') for (let k = 0; k < 6; k++) {
          const a = random() * Math.PI * 2;
          const apple = new THREE.IcosahedronGeometry(0.13 * s, 0);
          apple.translate(t.x + Math.cos(a) * 0.95 * s, y0 + trunkH + 0.3 * s + random() * 0.8 * s, t.z + Math.sin(a) * 0.95 * s);
          canopies.push(colored(apple, new THREE.Color('#e2473a'), random));
        }
      }
    }
    return {canopy: mergeGeometries(canopies.map(g => {g.deleteAttribute('normal'); g.computeVertexNormals(); return g;})), trunk: mergeGeometries(trunks)};
  }, [trees]);
  const canopyMat = useMemo(() => {
    const m = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: (toon('#fff') as THREE.MeshToonMaterial).gradientMap});
    windify(m, 0.025);
    return m;
  }, []);
  return <>
    <mesh geometry={canopy} material={canopyMat} castShadow receiveShadow />
    <mesh geometry={trunk} material={toon('#ffffff', {vertexColors: true})} castShadow />
  </>;
}

// --- grass ---------------------------------------------------------------------
const grassVertex = `
uniform float uTime; uniform float uWind; attribute vec3 tint; varying vec3 vColor; varying float vH;
#include <fog_pars_vertex>
void main(){
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  float h = position.y;
  float bend = h * h * 0.9 * uWind;
  world.x += sin(uTime * 1.8 + world.x * 0.45 + world.z * 0.3) * bend * 0.35;
  world.z += cos(uTime * 1.4 + world.z * 0.4) * bend * 0.2;
  vH = h; vColor = tint;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const grassFragment = `
uniform vec3 uLight; varying vec3 vColor; varying float vH;
#include <fog_pars_fragment>
void main(){
  vec3 col = mix(vColor * 0.78, vColor * 1.12, smoothstep(0.0, 0.42, vH));
  gl_FragColor = vec4(col * uLight, 1.0);
  #include <fog_fragment>
}`;

/** Instanced swaying grass tufts and tiny flowers across the green areas. */
export function Grass({count, light}: {count: number; light: THREE.Color}) {
  const {geometry, material, matrices, tints, n} = useMemo(() => {
    // A tuft: three crossed tapered blades.
    const blades: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k++) {
      const blade = new THREE.BufferGeometry();
      blade.setAttribute('position', new THREE.Float32BufferAttribute([-0.055, 0, 0, 0.055, 0, 0, 0, 0.42, 0.03], 3));
      blade.rotateY((k / 3) * Math.PI + 0.3);
      blade.translate(Math.cos(k * 2.1) * 0.06, 0, Math.sin(k * 2.1) * 0.06);
      blades.push(blade);
    }
    const geometry = mergeGeometries(blades);
    const material = new THREE.ShaderMaterial({
      vertexShader: grassVertex, fragmentShader: grassFragment, side: THREE.DoubleSide, fog: true,
      uniforms: {...THREE.UniformsLib.fog, uTime: shared.uTime, uWind: shared.uWind, uLight: {value: new THREE.Color(1, 1, 1)}},
    });
    const random = mulberry32(31);
    const matrices: THREE.Matrix4[] = [], tints: number[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const colors = [new THREE.Color('#9fd86a'), new THREE.Color('#b3e27a'), new THREE.Color('#8fcf62'), new THREE.Color('#c6e88a')];
    const flowers = [new THREE.Color('#ffffff'), new THREE.Color('#ffd84a'), new THREE.Color('#f7a1c4'), new THREE.Color('#b9a3ff')];
    let tries = 0;
    while (matrices.length < count && tries < count * 6) {
      tries++;
      const x = TOWN_BOUNDS.minX + random() * (TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX);
      const z = TOWN_BOUNDS.minZ + random() * (BEACH_Z - 1 - TOWN_BOUNDS.minZ);
      if (waterAt(x, z) || pondValue(x, z) < 1.3 || distToPolyline({x, z}, RIVER) < RIVER_WIDTH / 2 + 0.8) continue;
      if (isPathAt(x, z, 1.5) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 0.5) continue;
      if (BUILDINGS.some(b => Math.abs(x - b.x) < b.w / 2 + 0.6 && Math.abs(z - b.z) < b.d / 2 + 0.6)) continue;
      const y = heightAt(x, z);
      if (y < WATER_Y + 0.15) continue;
      const meadow = x < -33 ? 1.35 : 1;
      e.set(0, random() * Math.PI, 0); q.setFromEuler(e);
      const s = (0.38 + random() * 0.4) * meadow;
      m.compose(new THREE.Vector3(x, y - 0.02, z), q, new THREE.Vector3(s, s * (0.8 + random() * 0.6), s));
      matrices.push(m.clone());
      const flower = random() < (x < -33 ? 0.12 : 0.04);
      const c = flower ? flowers[Math.floor(random() * flowers.length)] : colors[Math.floor(random() * colors.length)];
      tints.push(c.r, c.g, c.b);
    }
    return {geometry, material, matrices, tints, n: matrices.length};
  }, [count]);
  material.uniforms.uLight.value.copy(light);
  const mesh = useMemo(() => {
    const instanced = new THREE.InstancedMesh(geometry, material, n);
    matrices.forEach((matrix, i) => instanced.setMatrixAt(i, matrix));
    geometry.setAttribute('tint', new THREE.InstancedBufferAttribute(new Float32Array(tints), 3));
    instanced.frustumCulled = false;
    return instanced;
  }, [geometry, material, matrices, tints, n]);
  return <primitive object={mesh} />;
}
