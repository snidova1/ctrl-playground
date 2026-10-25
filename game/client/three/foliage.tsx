'use client';
import {useMemo} from 'react';
import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {BEACH_Z, BUILDINGS, TOWN_BOUNDS, heightAt, isPathAt, PLAZA, waterAt, pondValue, distToPolyline, RIVER, RIVER_WIDTH, WATER_Y} from '@/game/core/map';
import {mulberry32} from '@/game/core/rng';
import {canvasTexture, shared, toonGradient, windify} from './materials';

export interface TreeSpec {x: number; z: number; s: number; kind: 'round' | 'pine' | 'blossom' | 'fruit' | 'birch'}

// --- painted textures -----------------------------------------------------------------
let leafTex: THREE.Texture | null = null;
/** A clump of soft leaves on a transparent card (white; tinted per vertex). */
function leafTexture() {
  if (leafTex) return leafTex;
  leafTex = canvasTexture(256, 256, ctx => {
    ctx.clearRect(0, 0, 256, 256);
    const random = mulberry32(3);
    // Dense spray of overlapping ovate leaves (birch / linden), drawn back-to-front:
    // deeper leaves darker, front leaves lighter, each with a soft rim and midrib.
    const leaves: {x: number; y: number; a: number; s: number; k: number}[] = [];
    for (let i = 0; i < 34; i++) {
      const t = i / 34, a = random() * Math.PI * 2, r = Math.sqrt(random()) * 84;
      leaves.push({x: 128 + Math.cos(a) * r, y: 128 + Math.sin(a) * r, a: a + Math.PI / 2 + (random() - 0.5) * 0.9, s: 0.55 + random() * 0.35, k: 0.62 + t * 0.38});
    }
    for (const l of leaves) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.a); ctx.scale(l.s, l.s);
      const v = Math.round(255 * l.k);
      const g = ctx.createLinearGradient(-14, -30, 14, 30);
      g.addColorStop(0, `rgb(${v},${v},${v})`); g.addColorStop(1, `rgb(${Math.round(v * 0.82)},${Math.round(v * 0.82)},${Math.round(v * 0.82)})`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.bezierCurveTo(20, -18, 20, 14, 0, 30); ctx.bezierCurveTo(-20, 14, -20, -18, 0, -34); ctx.fill();
      ctx.strokeStyle = `rgba(${Math.round(v * 0.6)},${Math.round(v * 0.6)},${Math.round(v * 0.6)},0.55)`; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = `rgba(${Math.round(v * 0.7)},${Math.round(v * 0.7)},${Math.round(v * 0.7)},0.6)`; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(0, -28); ctx.lineTo(0, 30); ctx.stroke();
      ctx.restore();
    }
  });
  leafTex.anisotropy = 8;
  return leafTex;
}
let grassTex: THREE.Texture | null = null;
function grassTexture() {
  if (grassTex) return grassTex;
  grassTex = canvasTexture(128, 96, ctx => {
    ctx.clearRect(0, 0, 128, 96);
    const random = mulberry32(8);
    ctx.fillStyle = 'white';
    for (let i = 0; i < 18; i++) {
      const x = 8 + random() * 112, h = 46 + random() * 48, w = 7 + random() * 6, lean = (random() - 0.5) * 28;
      ctx.beginPath(); ctx.moveTo(x - w / 2, 96); ctx.quadraticCurveTo(x + lean * 0.4, 96 - h * 0.6, x + lean, 96 - h); ctx.quadraticCurveTo(x + lean * 0.4 + w * 0.3, 96 - h * 0.5, x + w / 2, 96); ctx.fill();
    }
  });
  return grassTex;
}
let barkTex: THREE.Texture | null = null;
function birchTexture() {
  if (barkTex) return barkTex;
  barkTex = canvasTexture(64, 256, ctx => {
    ctx.fillStyle = '#f3f0ea'; ctx.fillRect(0, 0, 64, 256);
    const random = mulberry32(5);
    for (let i = 0; i < 14; i++) {ctx.fillStyle = '#3a3533'; ctx.beginPath(); ctx.ellipse(random() * 64, random() * 256, 8 + random() * 20, 2.5 + random() * 3, 0, 0, Math.PI * 2); ctx.fill();}
  });
  barkTex.wrapS = barkTex.wrapT = THREE.RepeatWrapping;
  return barkTex;
}

// --- geometry builders ---------------------------------------------------------------------
interface Builder {pos: number[]; nor: number[]; col: number[]; uv: number[]; idx: number[]}
const newBuilder = (): Builder => ({pos: [], nor: [], col: [], uv: [], idx: []});
function toGeometry(b: Builder) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  g.setIndex(b.idx);
  return g;
}
const SHADOW_TEAL = new THREE.Color('#1f5a50'), SUN_GREEN = new THREE.Color('#c4e874');
const BLOSSOM_SHADOW = new THREE.Color('#e08aaa'), BLOSSOM_SUN = new THREE.Color('#fff0f5');
const tmpN = new THREE.Vector3(), tmpU = new THREE.Vector3(), tmpW = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), RIGHT = new THREE.Vector3(1, 0, 0);

/** Leaf cards over a blob, with normals pointing out of the blob for soft round shading. */
function leafBlob(b: Builder, cx: number, cy: number, cz: number, r: number, cards: number, base: THREE.Color, random: () => number, size: number, shadow = SHADOW_TEAL, sun = SUN_GREEN) {
  const c = new THREE.Color();
  for (let i = 0; i < cards; i++) {
    const t = (i + 0.5) / cards;
    const yN = 1 - t * 1.75;
    const rr = Math.sqrt(Math.max(0, 1 - yN * yN));
    const phi = i * 2.399963 + random() * 0.4;
    const n = tmpN.set(Math.cos(phi) * rr, yN, Math.sin(phi) * rr).normalize();
    const k = 0.82 + random() * 0.2;
    const px = cx + n.x * r * k, py = cy + n.y * r * 0.85 * k, pz = cz + n.z * r * k;
    tmpU.crossVectors(Math.abs(n.y) > 0.9 ? RIGHT : UP, n).normalize();
    tmpW.crossVectors(n, tmpU).normalize();
    const roll = random() * Math.PI * 2, cr = Math.cos(roll), sr = Math.sin(roll);
    const ux = tmpU.x * cr + tmpW.x * sr, uy = tmpU.y * cr + tmpW.y * sr, uz = tmpU.z * cr + tmpW.z * sr;
    const vx = tmpW.x * cr - tmpU.x * sr, vy = tmpW.y * cr - tmpU.y * sr, vz = tmpW.z * cr - tmpU.z * sr;
    const s = size * (0.8 + random() * 0.45);
    // Hue-shifted painterly light: warm yellow-green toward the sun, deep teal in shadow.
    const lit = Math.min(1, Math.max(0, 0.5 + 0.5 * (n.y * 0.85 + n.x * 0.35 + n.z * 0.15) + (random() - 0.5) * 0.12));
    c.copy(base).lerp(shadow, 0.55 * (1 - lit)).lerp(sun, 0.4 * lit * lit);
    const start = b.pos.length / 3;
    for (const [a, d, u, v] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
      b.pos.push(px + (ux * a + vx * d) * s, py + (uy * a + vy * d) * s, pz + (uz * a + vz * d) * s);
      b.nor.push(n.x, n.y, n.z);
      b.col.push(c.r, c.g, c.b);
      b.uv.push(u, v);
    }
    b.idx.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
}

function colored(g: THREE.BufferGeometry, color: THREE.Color) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(n.attributes)) if (!['position', 'normal'].includes(name)) n.deleteAttribute(name);
  const col = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < n.attributes.position.count; i++) col.set([color.r, color.g, color.b], i * 3);
  n.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return n;
}

/** Drooping, jagged fir tier: the layered evergreen silhouette. */
function pineTier(x: number, y: number, z: number, radius: number, height: number, color: THREE.Color, random: () => number) {
  const seg = 16, pos: number[] = [], col: number[] = [], idx: number[] = [];
  pos.push(x, y + height, z); col.push(color.r * 1.15, color.g * 1.15, color.b * 1.15);
  for (let i = 0; i <= seg; i++) {
    const a = (i / seg) * Math.PI * 2, r = radius * (i % 2 ? 0.74 : 1) * (0.9 + random() * 0.14);
    pos.push(x + Math.cos(a) * r, y + (i % 2 ? 0.08 : -0.24 * radius), z + Math.sin(a) * r);
    const k = 0.74 + random() * 0.1;
    col.push(color.r * k, color.g * k, color.b * k);
  }
  for (let i = 1; i <= seg; i++) idx.push(0, i + 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

const LEAF_COLORS: Record<string, string[]> = {
  round: ['#62b844', '#71c450', '#58aa3e', '#7ccc5a'],
  fruit: ['#63b947', '#70c252'],
  blossom: ['#ffc2d6', '#ffd0e0', '#ffb0c9'],
  birch: ['#98d45a', '#aadb66', '#86c84e'],
};

/** Whole forest in five draw calls: leaf cards, inner canopy, fir tiers, trunks and birch bark. */
export function Trees({trees, density = 1, height = heightAt}: {trees: TreeSpec[]; density?: number; height?: (x: number, z: number) => number}) {
  const geo = useMemo(() => {
    const random = mulberry32(17);
    const b = newBuilder();
    const inner: THREE.BufferGeometry[] = [], pines: THREE.BufferGeometry[] = [], trunks: THREE.BufferGeometry[] = [], birch: THREE.BufferGeometry[] = [];
    for (const t of trees) {
      const y0 = height(t.x, t.z), s = t.s;
      const kind = t.kind === 'round' && random() < 0.22 ? 'birch' : t.kind;
      if (kind === 'pine') {
        const trunkH = 1.3 * s, total = trunkH + 3.4 * s;
        const tg = new THREE.CylinderGeometry(0.16 * s, 0.28 * s, total, 7);
        tg.translate(t.x, y0 + total / 2, t.z);
        trunks.push(colored(tg, new THREE.Color('#7a5238')));
        const base = new THREE.Color(['#2f7d5d', '#37886a', '#2b7257'][Math.floor(random() * 3)]);
        for (let k = 0; k < 5; k++) pines.push(pineTier(t.x, y0 + trunkH + k * 0.95 * s, t.z, (2.2 - k * 0.4) * s, 1.6 * s, base.clone().offsetHSL(0, 0, k * 0.025), random));
        continue;
      }
      const trunkH = (kind === 'birch' ? 2.7 : 1.7) * s;
      const tg = new THREE.CylinderGeometry(0.14 * s, 0.24 * s, trunkH + 0.6 * s, 8);
      tg.translate(t.x, y0 + (trunkH + 0.6 * s) / 2, t.z);
      if (kind === 'birch') {tg.deleteAttribute('normal'); tg.computeVertexNormals(); birch.push(tg);}
      else trunks.push(colored(tg, new THREE.Color('#8a5f40')));
      const palette = LEAF_COLORS[kind] ?? LEAF_COLORS.round;
      const blobs = kind === 'birch' ? 4 : 5 + Math.floor(random() * 3);
      const top = y0 + trunkH + 0.9 * s;
      for (let k = 0; k < blobs; k++) {
        const r = (kind === 'birch' ? 0.75 + random() * 0.3 : 0.85 + random() * 0.6) * s;
        const a = random() * Math.PI * 2, d = k === 0 ? 0 : (0.7 + random() * 0.4) * s;
        const cx = t.x + Math.cos(a) * d, cy = top + (k === 0 ? 0.55 * s : (random() - 0.3) * 1.1 * s), cz = t.z + Math.sin(a) * d;
        const base = new THREE.Color(palette[Math.floor(random() * palette.length)]);
        const ball = new THREE.IcosahedronGeometry(r * 0.78, 2);
        ball.scale(1, 0.85, 1); ball.translate(cx, cy, cz);
        const blossom = kind === 'blossom';
        inner.push(colored(ball, base.clone().lerp(blossom ? BLOSSOM_SHADOW : SHADOW_TEAL, 0.7)));
        leafBlob(b, cx, cy, cz, r, Math.round(70 * density), base, random, 0.44 * s, blossom ? BLOSSOM_SHADOW : SHADOW_TEAL, blossom ? BLOSSOM_SUN : SUN_GREEN);
      }
      if (kind === 'fruit') for (let k = 0; k < 7; k++) {
        const a = random() * Math.PI * 2;
        const apple = new THREE.IcosahedronGeometry(0.13 * s, 1);
        apple.translate(t.x + Math.cos(a) * 1.15 * s, top + random() * 0.9 * s, t.z + Math.sin(a) * 1.15 * s);
        inner.push(colored(apple, new THREE.Color('#e2473a')));
      }
    }
    return {cards: toGeometry(b), inner: mergeGeometries(inner), pines: pines.length ? mergeGeometries(pines) : null, trunks: mergeGeometries(trunks), birch: birch.length ? mergeGeometries(birch) : null};
  }, [trees, density, height]);
  const mats = useMemo(() => {
    const leaves = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient(), map: leafTexture(), alphaTest: 0.42, side: THREE.DoubleSide});
    windify(leaves, 0.03);
    const innerM = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient()});
    windify(innerM, 0.03);
    const pineM = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide});
    windify(pineM, 0.012);
    const trunkM = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient()});
    const birchM = new THREE.MeshToonMaterial({map: birchTexture(), gradientMap: toonGradient()});
    return {leaves, innerM, pineM, trunkM, birchM};
  }, []);
  return <>
    <mesh geometry={geo.cards} material={mats.leaves} castShadow receiveShadow />
    <mesh geometry={geo.inner} material={mats.innerM} castShadow receiveShadow />
    {geo.pines && <mesh geometry={geo.pines} material={mats.pineM} castShadow receiveShadow />}
    <mesh geometry={geo.trunks} material={mats.trunkM} castShadow />
    {geo.birch && <mesh geometry={geo.birch} material={mats.birchM} castShadow />}
  </>;
}

// --- bushes, hydrangeas, flowers, rocks --------------------------------------------------------
export interface Spot {x: number; z: number}

/** Leafy bushes, many crowned with hydrangea pom-poms. */
export function Bushes({spots, flowerChance = 0.65, height = heightAt}: {spots: Spot[]; flowerChance?: number; height?: (x: number, z: number) => number}) {
  const geo = useMemo(() => {
    const random = mulberry32(61);
    const b = newBuilder();
    const blooms: THREE.BufferGeometry[] = [];
    const hues = ['#8aa2f2', '#a98ff0', '#f2a5cf', '#7fc0f2', '#fdfbff', '#b9a2f5'];
    for (const p of spots) {
      const y = height(p.x, p.z);
      const r = 0.55 + random() * 0.35;
      leafBlob(b, p.x, y + r * 0.7, p.z, r, 40, new THREE.Color(['#5aaa44', '#66b74e', '#4d9b3e'][Math.floor(random() * 3)]), random, 0.3);
      leafBlob(b, p.x + r * 0.6, y + r * 0.55, p.z + r * 0.2, r * 0.7, 24, new THREE.Color('#5fae48'), random, 0.28);
      if (random() < flowerChance) {
        const hue = new THREE.Color(hues[Math.floor(random() * hues.length)]);
        for (let k = 0; k < 5; k++) {
          const a = random() * Math.PI * 2, d = r * (0.25 + random() * 0.6);
          const hx = p.x + Math.cos(a) * d, hy = y + r * 1.05 + random() * 0.25, hz = p.z + Math.sin(a) * d;
          // Each pom-pom is a cluster of little florets, not one smooth ball.
          for (let f = 0; f < 7; f++) {
            const fa = random() * Math.PI * 2, fb = random() * Math.PI;
            const ball = new THREE.IcosahedronGeometry(0.075 + random() * 0.03, 1);
            ball.translate(hx + Math.cos(fa) * Math.sin(fb) * 0.16, hy + Math.cos(fb) * 0.12, hz + Math.sin(fa) * Math.sin(fb) * 0.16);
            blooms.push(colored(ball, hue.clone().offsetHSL((random() - 0.5) * 0.04, 0, (random() - 0.5) * 0.1)));
          }
        }
      }
    }
    return {leaves: toGeometry(b), blooms: blooms.length ? mergeGeometries(blooms) : null};
  }, [spots, flowerChance, height]);
  const mats = useMemo(() => {
    const l = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient(), map: leafTexture(), alphaTest: 0.42, side: THREE.DoubleSide});
    windify(l, 0.05);
    const f = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient()});
    windify(f, 0.05);
    return {l, f};
  }, []);
  return <>
    <mesh geometry={geo.leaves} material={mats.l} castShadow receiveShadow />
    {geo.blooms && <mesh geometry={geo.blooms} material={mats.f} castShadow />}
  </>;
}

/** Drifts of bell flowers (instanced); only blossoms take the instance colour. */
export function FlowerField({patches, count, height = heightAt}: {patches: {x: number; z: number; r: number; color: string}[]; count: number; height?: (x: number, z: number) => number}) {
  const mesh = useMemo(() => {
    const head = new THREE.ConeGeometry(0.1, 0.15, 6, 1, true); head.rotateX(Math.PI); head.translate(0, 0.42, 0);
    const stem = new THREE.CylinderGeometry(0.012, 0.014, 0.4, 4); stem.translate(0, 0.2, 0);
    const leaf = new THREE.SphereGeometry(0.05, 5, 4); leaf.scale(1, 0.4, 2.2); leaf.translate(0.05, 0.12, 0);
    const parts = [head, stem, leaf].map((g, i) => {
      const n = colored(g, i === 0 ? new THREE.Color(1, 1, 1) : new THREE.Color('#4f9a3c'));
      n.setAttribute('isHead', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count).fill(i === 0 ? 1 : 0), 1));
      return n;
    });
    const geometry = mergeGeometries(parts);
    const material = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: toonGradient(), side: THREE.DoubleSide});
    windify(material, 0.25);
    const wind = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      wind.call(material, shader, renderer);
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nattribute float isHead;')
        .replace('#include <color_vertex>', '#include <color_vertex>\n#ifdef USE_INSTANCING_COLOR\n vColor.xyz = mix(color.xyz, instanceColor.xyz, isHead);\n#endif');
    };
    material.customProgramCacheKey = () => 'flower-field';
    const random = mulberry32(91);
    const matrices: THREE.Matrix4[] = [], colors: THREE.Color[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    let tries = 0;
    while (matrices.length < count && tries < count * 4 && patches.length) {
      tries++;
      const p = patches[Math.floor(random() * patches.length)];
      const a = random() * Math.PI * 2, d = Math.sqrt(random()) * p.r;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (height === heightAt && (waterAt(x, z) || isPathAt(x, z, 1.1) || heightAt(x, z) < WATER_Y + 0.1)) continue;
      e.set((random() - 0.5) * 0.3, random() * Math.PI * 2, (random() - 0.5) * 0.3); q.setFromEuler(e);
      const s = 0.8 + random() * 0.6;
      m.compose(new THREE.Vector3(x, height(x, z), z), q, new THREE.Vector3(s, s, s));
      matrices.push(m.clone());
      colors.push(new THREE.Color(p.color).offsetHSL((random() - 0.5) * 0.03, 0, (random() - 0.5) * 0.1));
    }
    const instanced = new THREE.InstancedMesh(geometry, material, Math.max(1, matrices.length));
    matrices.forEach((mat, i) => {instanced.setMatrixAt(i, mat); instanced.setColorAt(i, colors[i]);});
    instanced.count = matrices.length;
    instanced.receiveShadow = true;
    instanced.frustumCulled = false;
    return instanced;
  }, [patches, count, height]);
  return <primitive object={mesh} />;
}

/** Smooth pale granite boulders. */
export function Boulders({rocks, height = heightAt}: {rocks: {x: number; z: number; s: number; r: number}[]; height?: (x: number, z: number) => number}) {
  const geometry = useMemo(() => {
    const random = mulberry32(71);
    return mergeGeometries(rocks.map(rock => {
      const g = new THREE.IcosahedronGeometry(1, 3);
      const p = g.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        v.multiplyScalar(1 + Math.sin(v.x * 3.1 + rock.x) * 0.08 + Math.cos(v.z * 2.7 + rock.z) * 0.08);
        v.y = v.y > 0 ? v.y * 0.72 : v.y * 0.3;
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.scale(rock.s * (1 + random() * 0.4), rock.s, rock.s);
      g.rotateY(rock.r);
      g.translate(rock.x, height(rock.x, rock.z) - 0.1 * rock.s, rock.z);
      g.deleteAttribute('uv');
      g.computeVertexNormals();
      return g;
    }));
  }, [rocks, height]);
  const material = useMemo(() => new THREE.MeshToonMaterial({color: '#e8eaf1', gradientMap: toonGradient()}), []);
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />;
}

// --- grass carpet ---------------------------------------------------------------------------
const grassVertex = `
uniform float uTime; uniform float uWind; attribute vec3 tint; varying vec3 vColor; varying vec2 vUv;
#include <fog_pars_vertex>
void main(){
  vUv = uv;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  float bend = uv.y * uv.y * 0.16 * uWind;
  world.x += sin(uTime * 1.7 + world.x * 0.5 + world.z * 0.3) * bend;
  world.z += cos(uTime * 1.3 + world.z * 0.45) * bend * 0.6;
  vColor = tint;
  vec4 mvPosition = viewMatrix * world;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const grassFragment = `
uniform sampler2D uMap; uniform vec3 uLight; varying vec3 vColor; varying vec2 vUv;
#include <fog_pars_fragment>
void main(){
  if (texture2D(uMap, vUv).a < 0.5) discard;
  vec3 col = mix(vColor * 0.78, vColor * 1.05, smoothstep(0.0, 0.95, vUv.y));
  gl_FragColor = vec4(col * uLight, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Soft grass clumps (crossed painted cards) carpeting the green areas. */
export function Grass({count, light, bounds = TOWN_BOUNDS, town = true, allow}: {count: number; light: THREE.Color; bounds?: {minX: number; maxX: number; minZ: number; maxZ: number}; town?: boolean; allow?: (x: number, z: number) => boolean}) {
  const {mesh, material} = useMemo(() => {
    const quads: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 2; k++) {
      const q = new THREE.PlaneGeometry(0.8, 0.3);
      q.translate(0, 0.15, 0);
      q.rotateY((k / 2) * Math.PI + 0.4);
      q.deleteAttribute('normal');
      quads.push(q);
    }
    const geometry = mergeGeometries(quads);
    const material = new THREE.ShaderMaterial({
      vertexShader: grassVertex, fragmentShader: grassFragment, side: THREE.DoubleSide, fog: true,
      uniforms: {...THREE.UniformsLib.fog, uTime: shared.uTime, uWind: shared.uWind, uMap: {value: grassTexture()}, uLight: {value: new THREE.Color(1, 1, 1)}},
    });
    const random = mulberry32(31);
    const matrices: THREE.Matrix4[] = [], tints: number[] = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const colors = ['#5aaa3e', '#66b546', '#4f9e38', '#72bd4e'].map(c => new THREE.Color(c));
    let tries = 0;
    while (matrices.length < count && tries < count * 5) {
      tries++;
      const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
      const z = bounds.minZ + random() * ((town ? BEACH_Z - 1 : bounds.maxZ) - bounds.minZ);
      if (town) {
        if (waterAt(x, z) || pondValue(x, z) < 1.2 || distToPolyline({x, z}, RIVER) < RIVER_WIDTH / 2 + 0.6) continue;
        if (isPathAt(x, z, 1.25) || Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 0.3) continue;
        if (BUILDINGS.some(bd => Math.abs(x - bd.x) < bd.w / 2 + 0.5 && Math.abs(z - bd.z) < bd.d / 2 + 0.5)) continue;
      }
      if (allow && !allow(x, z)) continue;
      const y = town ? heightAt(x, z) : 0;
      if (town && y < WATER_Y + 0.12) continue;
      e.set(0, random() * Math.PI, 0); q.setFromEuler(e);
      const s = (x < -33 ? 1.25 : 1) * (0.75 + random() * 0.55);
      m.compose(new THREE.Vector3(x, y - 0.03, z), q, new THREE.Vector3(s, s * (0.8 + random() * 0.5), s));
      matrices.push(m.clone());
      const c = colors[Math.floor(random() * colors.length)];
      tints.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('tint', new THREE.InstancedBufferAttribute(new Float32Array(tints), 3));
    const instanced = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((mat, i) => instanced.setMatrixAt(i, mat));
    instanced.frustumCulled = false;
    return {mesh: instanced, material};
  }, [count, bounds, town, allow]);
  material.uniforms.uLight.value.copy(light);
  return <primitive object={mesh} />;
}
