'use client';
import {useMemo} from 'react';
import * as THREE from 'three';
import type {Building} from '@/game/core/map';
import {heightAt} from '@/game/core/map';
import {canvasTexture, toon} from './materials';

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
const half = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI);

export interface CottageStyle {
  siding: number; roofStyle: number; windows: number; door: string; porch: boolean; chimney: boolean; flowerBoxes: boolean;
}
const DEFAULT_STYLE: CottageStyle = {siding: 0, roofStyle: 0, windows: 0, door: '#a8774c', porch: false, chimney: true, flowerBoxes: true};

/** Roof cross-section for gable, steep gable or barn (gambrel), with a soft overhang. */
function roofShape(w: number, h: number, style: number) {
  const o = 0.45, t = 0.2, s = new THREE.Shape();
  if (style === 2) {
    const k = w * 0.32;
    s.moveTo(-w / 2 - o, 0); s.lineTo(-k, h * 0.72); s.lineTo(0, h); s.lineTo(k, h * 0.72); s.lineTo(w / 2 + o, 0);
    s.lineTo(w / 2 + o, -t); s.lineTo(k, h * 0.72 - t); s.lineTo(0, h - t); s.lineTo(-k, h * 0.72 - t); s.lineTo(-w / 2 - o, -t);
  } else {
    s.moveTo(-w / 2 - o, 0); s.lineTo(0, h); s.lineTo(w / 2 + o, 0); s.lineTo(w / 2 + o, -t); s.lineTo(0, h - t); s.lineTo(-w / 2 - o, -t);
  }
  s.closePath();
  return s;
}
function roofGeometry(w: number, d: number, h: number, style: number) {
  const g = new THREE.ExtrudeGeometry(roofShape(w, h, style), {depth: d + 0.7, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2});
  g.translate(0, 0, -(d + 0.7) / 2);
  return g;
}
function gableGeometry(w: number, h: number, style: number) {
  const s = new THREE.Shape();
  if (style === 2) {const k = w * 0.32; s.moveTo(-w / 2, 0); s.lineTo(-k, h * 0.72); s.lineTo(0, h); s.lineTo(k, h * 0.72); s.lineTo(w / 2, 0);}
  else {s.moveTo(-w / 2, 0); s.lineTo(0, h); s.lineTo(w / 2, 0);}
  s.closePath();
  return new THREE.ShapeGeometry(s);
}

function signTexture(text: string, color: string) {
  return canvasTexture(512, 128, ctx => {
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.roundRect(6, 6, 500, 116, 40); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = '#6b4a35'; ctx.font = '800 54px "Nunito", ui-rounded, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
  });
}
function awningTexture(a: string, b: string) {
  return canvasTexture(256, 64, ctx => {for (let i = 0; i < 8; i++) {ctx.fillStyle = i % 2 ? a : b; ctx.fillRect(i * 32, 0, 32, 64);}});
}

const wallTextures: (THREE.Texture | null)[] = [null, null, null, null];
/** Wall finishes (white, tinted by colour): clapboard, brick, stucco, log. */
function wallTexture(kind: number) {
  const hit = wallTextures[kind];
  if (hit) return hit;
  const tex = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    if (kind === 0) for (let y = 0; y < 256; y += 21) {const g = ctx.createLinearGradient(0, y, 0, y + 21); g.addColorStop(0, '#ffffff'); g.addColorStop(0.85, '#ece8e4'); g.addColorStop(1, '#b9b2ac'); ctx.fillStyle = g; ctx.fillRect(0, y, 256, 21);}
    if (kind === 1) {
      ctx.fillStyle = '#d9d2cc'; ctx.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 16; row++) for (let i = -1; i < 9; i++) {
        const x = i * 32 + (row % 2) * 16, y = row * 16;
        ctx.fillStyle = ['#ffffff', '#f2eeea', '#e8e2dc'][(row * 7 + i * 3) % 3]; ctx.beginPath(); ctx.roundRect(x + 1.5, y + 1.5, 29, 13, 3); ctx.fill();
      }
    }
    if (kind === 2) {
      let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 900; i++) {const v = 225 + Math.floor(rnd() * 30); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.beginPath(); ctx.arc(rnd() * 256, rnd() * 256, 2 + rnd() * 5, 0, Math.PI * 2); ctx.fill();}
    }
    if (kind === 3) for (let y = 0; y < 256; y += 32) {const g = ctx.createLinearGradient(0, y, 0, y + 32); g.addColorStop(0, '#d7cfc6'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.8, '#e7e0d8'); g.addColorStop(1, '#a99f95'); ctx.fillStyle = g; ctx.fillRect(0, y, 256, 32);}
  });
  wallTextures[kind] = tex;
  return tex;
}
let shingles: THREE.Texture | null = null;
function shingleTexture() {
  if (!shingles) {
    shingles = canvasTexture(128, 128, ctx => {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) for (let i = -1; i < 5; i++) {
        const x = i * 32 + (row % 2) * 16, y = row * 16;
        ctx.fillStyle = row % 2 ? '#e9e9e9' : '#f6f6f6'; ctx.beginPath(); ctx.roundRect(x + 1, y, 30, 18, [0, 0, 8, 8]); ctx.fill();
        ctx.strokeStyle = '#bdbdbd'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    });
    shingles.wrapS = shingles.wrapT = THREE.RepeatWrapping; shingles.repeat.set(0.6, 0.6);
  }
  return shingles;
}

const FACING: Record<Building['facing'], number> = {south: 0, north: Math.PI, east: Math.PI / 2, west: -Math.PI / 2};

function Window({shape, mat, trim, box: bx}: {shape: number; mat: THREE.Material; trim: THREE.Material; box: THREE.BufferGeometry}) {
  if (shape === 1) return <group>
    <mesh geometry={cyl} material={trim} rotation={[Math.PI / 2, 0, 0]} scale={[0.52, 0.08, 0.52]} />
    <mesh geometry={cyl} material={mat} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} scale={[0.42, 0.04, 0.42]} />
    <mesh geometry={bx} material={trim} position={[0, 0, 0.06]} scale={[0.06, 0.84, 0.03]} />
    <mesh geometry={bx} material={trim} position={[0, 0, 0.06]} scale={[0.84, 0.06, 0.03]} />
  </group>;
  if (shape === 2) return <group>
    <mesh geometry={bx} material={trim} position={[0, -0.12, 0]} scale={[0.95, 0.85, 0.08]} />
    <mesh geometry={half} material={trim} position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[0.475, 0.08, 0.475]} />
    <mesh geometry={bx} material={mat} position={[0, -0.12, 0.03]} scale={[0.75, 0.7, 0.04]} />
    <mesh geometry={half} material={mat} position={[0, 0.23, 0.03]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[0.375, 0.04, 0.375]} />
    <mesh geometry={bx} material={trim} position={[0, 0, 0.06]} scale={[0.06, 1, 0.03]} />
  </group>;
  return <group>
    <mesh geometry={bx} material={trim} scale={[1.05, 1.05, 0.08]} />
    <mesh geometry={bx} material={mat} position={[0, 0, 0.03]} scale={[0.85, 0.85, 0.04]} />
    <mesh geometry={bx} material={trim} position={[0, 0, 0.06]} scale={[0.07, 0.85, 0.03]} />
    <mesh geometry={bx} material={trim} position={[0, 0, 0.06]} scale={[0.85, 0.07, 0.03]} />
  </group>;
}

/** A cosy cottage built from soft toon blocks. Fully restyleable for Habitat renovations. */
export function Cottage({b, night, style: input}: {b: Building; night: number; style?: Partial<CottageStyle>}) {
  const style = {...DEFAULT_STYLE, ...input};
  const wallH = b.kind === 'hall' ? 3.4 : 2.7;
  const roofH = Math.min(b.w, b.d) * (style.roofStyle === 1 ? 0.7 : style.roofStyle === 2 ? 0.55 : 0.42);
  const [w, d] = b.facing === 'east' || b.facing === 'west' ? [b.d, b.w] : [b.w, b.d];
  const roof = useMemo(() => roofGeometry(w, d, roofH, style.roofStyle), [w, d, roofH, style.roofStyle]);
  const gable = useMemo(() => gableGeometry(w, roofH, style.roofStyle), [w, roofH, style.roofStyle]);
  const sign = useMemo(() => (b.sign ? signTexture(b.sign, b.roof) : null), [b.sign, b.roof]);
  const awning = useMemo(() => (b.kind === 'shop' || b.kind === 'cafe' || b.kind === 'florist' ? awningTexture(b.roof, '#ffffff') : null), [b.kind, b.roof]);
  const glow = night > 0.3 ? 0.9 : 0;
  const windowMat = useMemo(() => new THREE.MeshToonMaterial({color: '#bfe6ff', emissive: '#ffcf7a', emissiveIntensity: 0}), []);
  windowMat.emissiveIntensity = glow; windowMat.color.set(glow ? '#ffe7b0' : '#bfe6ff');
  const y = (b.kind === 'home' && b.id === 'my-house' ? 0 : heightAt(b.x, b.z)) - 0.05;
  const wall = toon(b.wall, {map: wallTexture(style.siding)}), trim = toon(b.trim), roofMat = toon(b.roof, {map: shingleTexture()});
  const doorMat = toon(style.door), stone = toon('#d8cfc2'), wood = toon('#b58556');
  const windows: number[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(w / 3)); i++) windows.push(-w / 2 + 1.1 + i * 2.1);
  return <group position={[b.x, y, b.z]} rotation={[0, FACING[b.facing], 0]}>
    <mesh geometry={box} material={stone} position={[0, 0.2, 0]} scale={[w + 0.3, 0.4, d + 0.3]} castShadow receiveShadow />
    <mesh geometry={box} material={wall} position={[0, 0.4 + wallH / 2, 0]} scale={[w, wallH, d]} castShadow receiveShadow />
    {[-1, 1].map(s => <mesh key={s} geometry={box} material={trim} position={[s * w / 2, 0.4 + wallH / 2, d / 2]} scale={[0.22, wallH, 0.22]} castShadow />)}
    <mesh geometry={box} material={trim} position={[0, 0.4 + wallH, 0]} scale={[w + 0.15, 0.16, d + 0.15]} />
    <mesh geometry={roof} material={roofMat} position={[0, 0.4 + wallH, 0]} castShadow />
    {[-1, 1].map(s => <mesh key={s} geometry={gable} material={wall} position={[0, 0.4 + wallH, s * (d / 2 + 0.001)]} rotation={[0, s < 0 ? Math.PI : 0, 0]} />)}
    {style.chimney && <mesh geometry={box} material={toon('#c98a6a')} position={[w * 0.25, 0.4 + wallH + roofH * 0.65, -d * 0.15]} scale={[0.5, roofH * 0.95, 0.5]} castShadow />}
    {/* door */}
    <group position={[0, 0.4, d / 2 + 0.02]}>
      <mesh geometry={box} material={doorMat} position={[0, 0.9, 0]} scale={[1.1, 1.8, 0.1]} />
      <mesh geometry={half} material={doorMat} position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} scale={[0.55, 0.1, 0.55]} />
      <mesh geometry={box} material={trim} position={[0, 0.9, 0.04]} scale={[0.08, 1.6, 0.04]} />
      <mesh geometry={cyl} material={toon('#f2c14e')} position={[0.34, 0.9, 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.05, 0.06]} />
      <mesh geometry={box} material={stone} position={[0, -0.18, 0.5]} scale={[1.6, 0.18, 0.9]} receiveShadow />
    </group>
    {style.porch && <group position={[0, 0.4, d / 2 + 1.05]}>
      <mesh geometry={box} material={wood} position={[0, -0.05, 0]} scale={[3.4, 0.14, 1.9]} receiveShadow castShadow />
      {[-1.55, 1.55].map(x => <mesh key={x} geometry={box} material={trim} position={[x, 1.15, 0.8]} scale={[0.14, 2.3, 0.14]} castShadow />)}
      <mesh geometry={box} material={roofMat} position={[0, 2.4, 0.15]} rotation={[0.28, 0, 0]} scale={[3.7, 0.12, 2.1]} castShadow />
      {[-1.1, -0.5, 0.5, 1.1].map(x => <mesh key={x} geometry={box} material={trim} position={[x, 0.35, 0.9]} scale={[0.07, 0.6, 0.07]} />)}
      <mesh geometry={box} material={trim} position={[-1.05, 0.65, 0.9]} scale={[1, 0.07, 0.07]} />
      <mesh geometry={box} material={trim} position={[1.05, 0.65, 0.9]} scale={[1, 0.07, 0.07]} />
    </group>}
    {windows.flatMap((x, i) => x > -0.9 && x < 0.9 ? [] : [
      <group key={i} position={[x, 0.4 + 1.55, d / 2 + 0.03]}>
        <Window shape={style.windows} mat={windowMat} trim={trim} box={box} />
        {style.flowerBoxes && <>
          <mesh geometry={box} material={toon(b.roof)} position={[0, -0.62, 0.12]} scale={[1.0, 0.22, 0.28]} castShadow />
          {[-0.3, 0, 0.3].map(fx => <mesh key={fx} geometry={cyl} material={toon(['#f7a1b5', '#ffd84a', '#ffffff'][Math.abs(Math.round(fx * 10)) % 3])} position={[fx, -0.45, 0.14]} scale={[0.1, 0.12, 0.1]} />)}
        </>}
      </group>,
    ])}
    {[-1, 1].map(s => <group key={s} position={[s * (w / 2 + 0.03), 0.4 + 1.55, 0]} rotation={[0, s * Math.PI / 2, 0]}>
      <Window shape={style.windows} mat={windowMat} trim={trim} box={box} />
    </group>)}
    {awning && <mesh position={[0, 0.4 + wallH - 0.25, d / 2 + 0.55]} rotation={[0.5, 0, 0]} castShadow>
      <planeGeometry args={[w * 0.7, 1.2]} />
      <meshToonMaterial map={awning} side={THREE.DoubleSide} />
    </mesh>}
    {sign && <mesh position={[0, 0.4 + wallH + 0.05, d / 2 + 0.4]}>
      <planeGeometry args={[2.6, 0.65]} />
      <meshToonMaterial map={sign} transparent />
    </mesh>}
  </group>;
}
