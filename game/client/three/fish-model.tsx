'use client';
import {useMemo} from 'react';
import * as THREE from 'three';
import {fishLook, type FishLook} from '@/game/core/fish-looks';
import {toonGradient} from './materials';

const cache = new Map<string, THREE.Group>();
const DIMS: Record<FishLook['shape'], [number, number, number]> = {
  // length (z), height (y), width (x)
  carp: [1, 0.52, 0.3], slim: [1, 0.32, 0.2], round: [0.78, 0.72, 0.7], flat: [1, 0.14, 0.7],
  whisker: [1, 0.36, 0.38], tuna: [1.15, 0.42, 0.36], fancy: [0.72, 0.56, 0.4],
};

function hash(x: number, y: number) {const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s);}

/** Body colour from position: belly, back and the species pattern, so no UV mapping is needed. */
function bodyColor(look: FishLook, x: number, y: number, z: number, out: THREE.Color) {
  const body = new THREE.Color(look.body), belly = new THREE.Color(look.belly), accent = new THREE.Color(look.accent);
  out.copy(body).lerp(belly, THREE.MathUtils.smoothstep(-y, 0.0, 0.22));
  if (y > 0.12) out.lerp(accent, 0.18);
  switch (look.pattern) {
    case 'stripes': if (y > -0.02 && Math.sin(z * 26) > 0.35) out.lerp(accent, 0.85); break;
    case 'bands': if (y > 0.06) out.lerp(accent, 0.75); if (Math.abs(y) < 0.03) out.lerp(new THREE.Color('#9fd0e8'), 0.6); break;
    case 'spots': if (y > -0.05 && hash(Math.floor(z * 14), Math.floor(y * 14 + x * 6)) > 0.72) out.lerp(accent, 0.7); break;
    case 'speckle': if (y > -0.08 && hash(Math.floor(z * 30), Math.floor(y * 30 + x * 9)) > 0.8) out.lerp(accent, 0.8); break;
    case 'koi': {const n = Math.sin(z * 7 + 1.3) + Math.sin(y * 9 + z * 3) * 0.8; if (y > -0.1 && n > 0.4) out.copy(accent); if (y > 0 && hash(Math.floor(z * 6), Math.floor(y * 6)) > 0.86) out.set('#2b2b30'); break;}
    case 'gold': out.lerp(accent, THREE.MathUtils.smoothstep(Math.abs(y) < 0.04 ? 1 : 0, 0, 1) * 0.6); break;
    default: break;
  }
}

function finShape(points: [number, number][]) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

export function buildFish(species: string): THREE.Group {
  const hit = cache.get(species);
  if (hit) return hit.clone();
  const look = fishLook(species);
  const [L, H, W] = DIMS[look.shape];
  const group = new THREE.Group();
  const gradient = toonGradient();
  // Body: a sphere stretched along z and tapered toward the tail.
  const geo = new THREE.SphereGeometry(0.5, 36, 24);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = z + 0.5; // 0 tail → 1 head
    const taper = look.shape === 'round' ? 1 : 0.35 + 0.65 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62 + 0.25);
    x *= W * 2 * taper; y *= H * 2 * taper; z *= L;
    if (look.shape === 'flat') y += Math.max(0, x) * 0.05;
    pos.setXYZ(i, x, y, z);
    bodyColor(look, x / (W * 2), y / (H * 2), z / L, c);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const bodyMat = new THREE.MeshToonMaterial({vertexColors: true, gradientMap: gradient});
  group.add(new THREE.Mesh(geo, bodyMat));
  const finMat = new THREE.MeshToonMaterial({color: look.fin, gradientMap: gradient, side: THREE.DoubleSide, transparent: true, opacity: 0.92});
  const tailZ = -L / 2 + 0.04;
  // Tail fin, rotated to stand vertically behind the body.
  const tailPts: [number, number][] = look.shape === 'tuna' ? [[0, 0], [-0.32, 0.34], [-0.22, 0.02], [-0.32, -0.34]]
    : look.shape === 'fancy' ? [[0, 0], [-0.5, 0.42], [-0.62, 0.05], [-0.5, -0.42]]
    : look.shape === 'round' ? [[0, 0], [-0.18, 0.18], [-0.18, -0.18]]
    : [[0, 0], [-0.3, 0.28], [-0.22, 0], [-0.3, -0.28]];
  const tail = new THREE.Mesh(finShape(tailPts.map(([u, v]) => [u * L, v * Math.max(H, 0.3) * 1.6])), finMat);
  tail.rotation.y = Math.PI / 2; tail.position.z = tailZ;
  if (look.shape === 'flat') {tail.rotation.z = Math.PI / 2;}
  group.add(tail);
  if (look.shape === 'fancy') {const t2 = tail.clone(); t2.rotation.x = 0.5; group.add(t2); const t3 = tail.clone(); t3.rotation.x = -0.5; group.add(t3);}
  // Dorsal fin.
  if (look.shape !== 'flat') {
    const dorsal = new THREE.Mesh(finShape([[-0.22, 0], [0.05, 0.22], [0.2, 0]].map(([u, v]) => [u * L, v * H * 1.2])), finMat);
    dorsal.rotation.y = Math.PI / 2; dorsal.position.set(0, H * 0.82, 0.02);
    group.add(dorsal);
  }
  // Pectoral fins.
  for (const s of [-1, 1]) {
    const fin = new THREE.Mesh(finShape([[0, 0], [-0.14, 0.06], [-0.12, -0.06]]), finMat);
    fin.position.set(s * W * 0.95, -H * 0.15, L * 0.12); fin.rotation.set(0, s * 0.9, s * 0.4);
    group.add(fin);
  }
  // Eyes.
  const white = new THREE.MeshBasicMaterial({color: '#ffffff'}), black = new THREE.MeshBasicMaterial({color: '#1d1d22'});
  const eyeR = Math.max(0.035, H * 0.11);
  for (const s of look.shape === 'flat' ? [1] : [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 8), white);
    const ey = look.shape === 'flat' ? H * 0.6 : H * 0.18;
    e.position.set(look.shape === 'flat' ? 0.08 : s * W * 0.78, ey, L * 0.34);
    group.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.6, 10, 8), black);
    p.position.copy(e.position).add(new THREE.Vector3(look.shape === 'flat' ? 0 : s * eyeR * 0.5, look.shape === 'flat' ? eyeR * 0.5 : 0, eyeR * 0.35));
    group.add(p);
  }
  // Species details.
  if (look.shape === 'round') {
    const spineMat = new THREE.MeshToonMaterial({color: look.accent, gradientMap: gradient});
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, b = (i % 5) / 5 * Math.PI - Math.PI / 2;
      const n = new THREE.Vector3(Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b));
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 5), spineMat);
      spine.position.copy(n).multiply(new THREE.Vector3(W, H, L * 0.5));
      spine.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      group.add(spine);
    }
  }
  if (look.shape === 'whisker') {
    const barbel = new THREE.MeshToonMaterial({color: '#3f3a32', gradientMap: gradient});
    for (const s of [-1, 1]) for (const k of [0, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.32, 4), barbel);
      w.position.set(s * W * 0.5, -H * 0.05 - k * 0.06, L * 0.5);
      w.rotation.set(Math.PI / 2 - 0.4 - k * 0.3, 0, s * (0.7 + k * 0.3));
      group.add(w);
    }
  }
  if (look.shape === 'tuna') {
    const finlet = new THREE.MeshToonMaterial({color: '#f2c84a', gradientMap: gradient, side: THREE.DoubleSide});
    for (let i = 0; i < 5; i++) for (const s of [1, -1]) {
      const f = new THREE.Mesh(finShape([[0, 0], [0.03, 0.05], [0.06, 0]]), finlet);
      f.rotation.y = Math.PI / 2; f.position.set(0, s * H * 0.55 * (0.8 - i * 0.12), -0.15 - i * 0.07);
      if (s < 0) f.rotation.x = Math.PI;
      group.add(f);
    }
  }
  group.traverse(o => {o.castShadow = true;});
  cache.set(species, group);
  return group.clone();
}

/** A caught fish, scaled by its real length (exaggerated a little so small fish still read). */
export function Fish3D({species, sizeCm = 30, position, rotation}: {species: string; sizeCm?: number; position?: [number, number, number]; rotation?: [number, number, number]}) {
  const object = useMemo(() => buildFish(species), [species]);
  const scale = THREE.MathUtils.clamp((sizeCm / 100) * 1.35, 0.22, 1.6);
  return <group position={position} rotation={rotation} scale={scale}><primitive object={object} /></group>;
}
