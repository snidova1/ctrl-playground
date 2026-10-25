'use client';
import {useMemo} from 'react';
import * as THREE from 'three';
import type {Building} from '@/game/core/map';
import {heightAt} from '@/game/core/map';
import {canvasTexture, toon} from './materials';

const box = new THREE.BoxGeometry(1, 1, 1);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 16);
function roofGeometry(w: number, d: number, h: number) {
  // Gable roof prism with a soft overhang.
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - 0.45, 0); shape.lineTo(0, h); shape.lineTo(w / 2 + 0.45, 0); shape.lineTo(w / 2 + 0.45, -0.18); shape.lineTo(0, h - 0.22); shape.lineTo(-w / 2 - 0.45, -0.18); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {depth: d + 0.7, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2});
  g.translate(0, 0, -(d + 0.7) / 2);
  return g;
}
function gableGeometry(w: number, h: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(0, h); shape.lineTo(w / 2, 0); shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function signTexture(text: string, color: string) {
  return canvasTexture(512, 128, ctx => {
    ctx.fillStyle = '#fff8ea'; ctx.beginPath(); ctx.roundRect(6, 6, 500, 116, 40); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 10; ctx.stroke();
    ctx.fillStyle = '#6b4a35'; ctx.font = '800 54px ui-rounded, "Nunito", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 68);
  });
}
function awningTexture(a: string, b: string) {
  return canvasTexture(256, 64, ctx => {for (let i = 0; i < 8; i++) {ctx.fillStyle = i % 2 ? a : b; ctx.fillRect(i * 32, 0, 32, 64);}});
}

let siding: THREE.Texture | null = null, shingles: THREE.Texture | null = null;
/** Painted clapboard siding and roof shingles, tinted by the material colour. */
function sidingTexture() {
  siding ??= canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 21) {const g = ctx.createLinearGradient(0, y, 0, y + 21); g.addColorStop(0, '#ffffff'); g.addColorStop(0.85, '#ece8e4'); g.addColorStop(1, '#b9b2ac'); ctx.fillStyle = g; ctx.fillRect(0, y, 256, 21);}
  });
  return siding;
}
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

/** A cosy cottage built from soft toon blocks: walls, gable roof, door, windows, sign. */
export function Cottage({b, night}: {b: Building; night: number}) {
  const wallH = b.kind === 'hall' ? 3.4 : 2.7;
  const roofH = Math.min(b.w, b.d) * 0.42;
  const [w, d] = b.facing === 'east' || b.facing === 'west' ? [b.d, b.w] : [b.w, b.d];
  const roof = useMemo(() => roofGeometry(w, d, roofH), [w, d, roofH]);
  const gable = useMemo(() => gableGeometry(w, roofH), [w, roofH]);
  const sign = useMemo(() => (b.sign ? signTexture(b.sign, b.roof) : null), [b.sign, b.roof]);
  const awning = useMemo(() => (b.kind === 'shop' || b.kind === 'cafe' || b.kind === 'florist' ? awningTexture(b.roof, '#ffffff') : null), [b.kind, b.roof]);
  const glow = night > 0.3 ? 0.9 : 0;
  const windowMat = useMemo(() => new THREE.MeshToonMaterial({color: '#bfe6ff', emissive: '#ffcf7a', emissiveIntensity: 0}), []);
  windowMat.emissiveIntensity = glow; windowMat.color.set(glow ? '#ffe7b0' : '#bfe6ff');
  const y = heightAt(b.x, b.z) - 0.05;
  const wall = toon(b.wall, {map: sidingTexture()}), trim = toon(b.trim), roofMat = toon(b.roof, {map: shingleTexture()}), wood = toon('#a8774c'), stone = toon('#d8cfc2');
  const windows: [number, number][] = [];
  for (let i = 0; i < Math.max(1, Math.floor(w / 3)); i++) windows.push([-w / 2 + 1.1 + i * 2.1, 1.55]);
  return <group position={[b.x, y, b.z]} rotation={[0, FACING[b.facing], 0]}>
    {/* foundation + walls */}
    <mesh geometry={box} material={stone} position={[0, 0.2, 0]} scale={[w + 0.3, 0.4, d + 0.3]} castShadow receiveShadow />
    <mesh geometry={box} material={wall} position={[0, 0.4 + wallH / 2, 0]} scale={[w, wallH, d]} castShadow receiveShadow />
    {[-1, 1].map(s => <mesh key={s} geometry={box} material={trim} position={[s * w / 2, 0.4 + wallH / 2, d / 2]} scale={[0.22, wallH, 0.22]} castShadow />)}
    <mesh geometry={box} material={trim} position={[0, 0.4 + wallH, 0]} scale={[w + 0.15, 0.16, d + 0.15]} />
    {/* roof */}
    <mesh geometry={roof} material={roofMat} position={[0, 0.4 + wallH, 0]} castShadow />
    {[-1, 1].map(s => <mesh key={s} geometry={gable} material={wall} position={[0, 0.4 + wallH, s * (d / 2 + 0.001)]} rotation={[0, s < 0 ? Math.PI : 0, 0]} />)}
    <mesh geometry={box} material={toon('#c98a6a')} position={[w * 0.25, 0.4 + wallH + roofH * 0.7, -d * 0.15]} scale={[0.5, roofH * 0.9, 0.5]} castShadow />
    {/* door */}
    <group position={[0, 0.4, d / 2 + 0.02]}>
      <mesh geometry={box} material={wood} position={[0, 0.9, 0]} scale={[1.1, 1.8, 0.1]} />
      <mesh geometry={cyl} material={wood} position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.55, 0.1, 0.55]} />
      <mesh geometry={box} material={trim} position={[0, 0.9, 0.04]} scale={[0.08, 1.6, 0.04]} />
      <mesh geometry={cyl} material={toon('#f2c14e')} position={[0.34, 0.9, 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.05, 0.06]} />
      <mesh geometry={box} material={stone} position={[0, -0.18, 0.5]} scale={[1.6, 0.18, 0.9]} receiveShadow />
    </group>
    {/* windows with flower boxes */}
    {windows.flatMap(([x, wy], i) => x > -0.9 && x < 0.9 ? [] : [
      <group key={i} position={[x, 0.4 + wy, d / 2 + 0.03]}>
        <mesh geometry={box} material={trim} scale={[1.05, 1.05, 0.08]} />
        <mesh geometry={box} material={windowMat} position={[0, 0, 0.03]} scale={[0.85, 0.85, 0.04]} />
        <mesh geometry={box} material={trim} position={[0, 0, 0.06]} scale={[0.07, 0.85, 0.03]} />
        <mesh geometry={box} material={toon(b.roof)} position={[0, -0.62, 0.12]} scale={[1.0, 0.22, 0.28]} castShadow />
        {[-0.3, 0, 0.3].map(fx => <mesh key={fx} geometry={cyl} material={toon(['#f7a1b5', '#ffd84a', '#ffffff'][Math.abs(Math.round(fx * 10)) % 3])} position={[fx, -0.45, 0.14]} scale={[0.1, 0.12, 0.1]} />)}
      </group>,
    ])}
    {/* side windows */}
    {[-1, 1].map(s => <group key={s} position={[s * (w / 2 + 0.03), 0.4 + 1.55, 0]} rotation={[0, s * Math.PI / 2, 0]}>
      <mesh geometry={box} material={trim} scale={[0.95, 0.95, 0.08]} />
      <mesh geometry={box} material={windowMat} position={[0, 0, 0.03]} scale={[0.75, 0.75, 0.04]} />
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
