'use client';
import {useMemo} from 'react';
import * as THREE from 'three';
import {BEACH_Z, BUILDINGS, PATHS, PLAZA, SEA_Z, TOWN_BOUNDS, distToPolyline, heightAt, pondValue, RIVER, RIVER_WIDTH, WATER_Y} from '@/game/core/map';
import {mulberry32} from '@/game/core/rng';
import {canvasTexture, shared, toon} from './materials';

const C = {
  grassA: new THREE.Color('#86cc56'), grassB: new THREE.Color('#6cbb47'), meadow: new THREE.Color('#a6d566'),
  forest: new THREE.Color('#4f8f4a'), sand: new THREE.Color('#f4e2b0'), wetSand: new THREE.Color('#e2c98f'),
  path: new THREE.Color('#e8cf9c'), pathEdge: new THREE.Color('#c9b07a'), bed: new THREE.Color('#d9c8a0'),
};

/** Rolling town ground with painted paths, sand and lakebeds (vertex colours, toon lit). */
export function TownTerrain() {
  const geometry = useMemo(() => {
    const w = TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX, d = TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ + 30;
    const g = new THREE.PlaneGeometry(w, d, Math.round(w * 2), Math.round(d * 2));
    g.rotateX(-Math.PI / 2);
    g.translate((TOWN_BOUNDS.minX + TOWN_BOUNDS.maxX) / 2, 0, (TOWN_BOUNDS.minZ + TOWN_BOUNDS.maxZ + 30) / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const random = mulberry32(5);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const y = heightAt(x, z);
      pos.setY(i, y);
      const n = random();
      c.copy(C.grassA).lerp(C.grassB, 0.35 + Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.35 + n * 0.12);
      if (x < -33) c.lerp(C.meadow, 0.55);
      if (z < -27) c.lerp(C.forest, Math.min(1, (-27 - z) / 6) * 0.8);
      const path = Math.min(...PATHS.map(p => distToPolyline({x, z}, p)));
      if (path < 1.6) c.lerp(path < 1.15 ? C.path : C.pathEdge, path < 1.15 ? 1 : 0.6);
      if (z > BEACH_Z - 1.5) c.lerp(C.sand, Math.min(1, (z - BEACH_Z + 1.5) / 2));
      if (z > SEA_Z - 1.2) c.lerp(C.wetSand, 0.6);
      const shore = Math.min(pondValue(x, z), distToPolyline({x, z}, RIVER) / (RIVER_WIDTH / 2));
      if (shore < 1.25) c.lerp(C.bed, Math.min(1, (1.25 - shore) * 3));
      if (y < WATER_Y - 0.1) c.lerp(C.wetSand, 0.7);
      for (const b of BUILDINGS) if (Math.abs(x - b.x) < b.w / 2 + 0.8 && Math.abs(z - b.z) < b.d / 2 + 0.8) c.lerp(C.path, 0.5);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return <>
    <mesh geometry={geometry} material={toon('#ffffff', {vertexColors: true})} receiveShadow />
    <Plaza />
    <OuterLand />
  </>;
}

/** Cobblestone plaza disc. */
function Plaza() {
  const texture = useMemo(() => {
    const t = canvasTexture(512, 512, ctx => {
      ctx.fillStyle = '#d9ccb2'; ctx.fillRect(0, 0, 512, 512);
      const random = mulberry32(9);
      for (let ring = 0; ring < 11; ring++) {
        const r = 30 + ring * 22, count = Math.round((Math.PI * 2 * r) / 30);
        for (let k = 0; k < count; k++) {
          const a = (k / count) * Math.PI * 2 + ring * 0.2;
          ctx.save(); ctx.translate(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); ctx.rotate(a);
          const tone = 196 + Math.floor(random() * 26);
          ctx.fillStyle = `rgb(${tone},${tone - 12},${tone - 30})`;
          ctx.beginPath(); ctx.roundRect(-12, -9, 24, 18, 6); ctx.fill();
          ctx.restore();
        }
      }
      ctx.strokeStyle = '#d5c3a1'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2); ctx.stroke();
    });
    return t;
  }, []);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PLAZA.x, 0.03, PLAZA.z]} receiveShadow>
    <circleGeometry args={[PLAZA.r, 64]} />
    <meshToonMaterial map={texture} />
  </mesh>;
}

/** Hills beyond the playable edge so the horizon never looks empty. */
function OuterLand() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(320, 320, 80, 80);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const inside = x > TOWN_BOUNDS.minX - 1 && x < TOWN_BOUNDS.maxX + 1 && z > TOWN_BOUNDS.minZ - 1;
      const edge = Math.max(TOWN_BOUNDS.minX - x, x - TOWN_BOUNDS.maxX, TOWN_BOUNDS.minZ - z, 0);
      let y = inside ? -3 : Math.min(9, edge * 0.35) * (0.6 + 0.4 * Math.sin(x * 0.08) * Math.cos(z * 0.07)) + 0.3;
      if (z > SEA_Z + 2) y = -3;
      pos.setY(i, y);
      c.set('#86c46a').lerp(new THREE.Color('#5d9e5a'), Math.min(1, edge / 40));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geometry} material={toon('#ffffff', {vertexColors: true})} />;
}

// --- Water ------------------------------------------------------------------
const waterVertex = `
uniform float uTime; varying vec2 vUv; varying vec3 vWorld;
#include <fog_pars_vertex>
void main(){
  vUv = uv; vec3 p = position;
  vec4 world = modelMatrix * vec4(p, 1.0);
  world.y += sin(world.x * 0.6 + uTime * 1.3) * 0.025 + cos(world.z * 0.5 + uTime) * 0.025;
  vWorld = world.xyz;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const waterFragment = `
uniform float uTime; uniform sampler2D uDepth; uniform vec4 uBounds; uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uSky; uniform float uNight;
varying vec2 vUv; varying vec3 vWorld;
#include <fog_pars_fragment>
float n2(vec2 p){ return sin(p.x) * sin(p.y); }
void main(){
  vec2 duv = (vWorld.xz - uBounds.xy) / uBounds.zw;
  float depth = (duv.x < 0.0 || duv.x > 1.0 || duv.y < 0.0 || duv.y > 1.0) ? 1.0 : texture2D(uDepth, duv).r;
  vec3 col = mix(uShallow, uDeep, smoothstep(0.02, 0.7, depth));
  col = mix(col, uSky, 0.06);
  float ripple = n2(vWorld.xz * 1.7 + vec2(uTime * 0.8, uTime * 0.5)) * n2(vWorld.xz * 2.3 - vec2(uTime * 0.6, -uTime * 0.4));
  col += vec3(0.85, 0.95, 1.0) * smoothstep(0.55, 0.9, ripple) * 0.35 * (1.0 - uNight * 0.6);
  float foamLine = smoothstep(0.09, 0.0, depth + sin(uTime * 2.0 + vWorld.x * 2.0 + vWorld.z) * 0.012);
  col = mix(col, vec3(1.0), foamLine * 0.85);
  col *= 1.0 - uNight * 0.45;
  float alpha = mix(0.82, 0.96, smoothstep(0.0, 0.5, depth));
  gl_FragColor = vec4(col, max(alpha, foamLine));
  #include <fog_fragment>
}`;

export function Water({night = 0}: {night?: number}) {
  const material = useMemo(() => {
    const size = 256;
    const bounds = {x: TOWN_BOUNDS.minX, z: TOWN_BOUNDS.minZ, w: TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX, d: TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ + 20};
    const data = new Uint8Array(size * size * 4);
    for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
      const x = bounds.x + (i / (size - 1)) * bounds.w, z = bounds.z + (j / (size - 1)) * bounds.d;
      const depth = Math.max(0, Math.min(1, (WATER_Y - heightAt(x, z)) / 1.0));
      data.set([depth * 255, 0, 0, 255], (j * size + i) * 4);
    }
    const depthTex = new THREE.DataTexture(data, size, size);
    depthTex.magFilter = depthTex.minFilter = THREE.LinearFilter;
    depthTex.needsUpdate = true;
    return new THREE.ShaderMaterial({
      vertexShader: waterVertex, fragmentShader: waterFragment, transparent: true, fog: true, depthWrite: false,
      uniforms: {
        ...THREE.UniformsLib.fog, uTime: shared.uTime, uDepth: {value: depthTex}, uBounds: {value: new THREE.Vector4(bounds.x, bounds.z, bounds.w, bounds.d)},
        uShallow: {value: new THREE.Color('#79e3e6')}, uDeep: {value: new THREE.Color('#22a9d9')}, uSky: {value: new THREE.Color('#bfe3f7')}, uNight: {value: 0},
      },
    });
  }, []);
  material.uniforms.uNight.value = night;
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WATER_Y, 40]} material={material} renderOrder={2}>
    <planeGeometry args={[420, 300, 120, 80]} />
  </mesh>;
}
