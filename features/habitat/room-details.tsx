'use client';

import {useEffect, useMemo, useRef, useSyncExternalStore, type RefObject} from 'react';
import {RoundedBox} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {CanvasTexture, SRGBColorSpace, type Group} from 'three';

type PrintKind = 'fern' | 'sprig' | 'clock' | 'weave';

// Shared by room plants and cottage lanterns. No timers, random drift, or React
// updates in the render loop; hidden tabs and reduced motion stay still.
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
export function decorMotionAllowed() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
    && document.visibilityState !== 'hidden'
    && typeof window.matchMedia === 'function'
    && !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function subscribeDecorMotion(onChange: () => void) {
  if (typeof window === 'undefined' || typeof document === 'undefined'
    || typeof window.matchMedia !== 'function') return () => {};
  const preference = window.matchMedia(REDUCED_MOTION_QUERY);
  preference.addEventListener('change', onChange);
  document.addEventListener('visibilitychange', onChange);
  return () => {
    preference.removeEventListener('change', onChange);
    document.removeEventListener('visibilitychange', onChange);
  };
}

export function useDecorMotion(enabled = true) {
  return useSyncExternalStore(subscribeDecorMotion, () => enabled && decorMotionAllowed(), () => false);
}

/** Less than one degree, with a roughly ten-second breeze cycle. */
export function decorSwayAt(seconds: number, phase = 0) {
  return Math.sin(seconds * .62 + phase) * .014;
}

export function DecorSway({target, phase = 0, amount = 1}: {target: RefObject<Group | null>; phase?: number; amount?: number}) {
  useEffect(() => {
    const node = target.current;
    return () => { if (node) node.rotation.z = 0; };
  }, [target]);
  useFrame(({clock}) => {
    const node = target.current;
    if (node) node.rotation.set(node.rotation.x, node.rotation.y, decorSwayAt(clock.elapsedTime, phase) * amount);
  });
  return null;
}

// Small, deterministic painted surfaces; no fetched assets or animated textures.
function usePaintedTexture(kind: PrintKind) {
  const texture = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = kind === 'fern' || kind === 'sprig' ? 352 : 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#f6eedc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (kind === 'fern' || kind === 'sprig') {
      // Wide paper margins and hand-drawn, asymmetric leaves keep the prints quiet.
      ctx.strokeStyle = '#80916c';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(124, 286);
      ctx.bezierCurveTo(110, 230, 151, 159, 125, 64);
      ctx.stroke();
      for (let i = 0; i < 7; i += 1) {
        const y = 248 - i * 25;
        const x = 128 + Math.sin(i * .7) * 9;
        for (const side of [-1, 1]) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(side * -.55);
          ctx.fillStyle = i % 2 === 0 ? '#829875' : '#a4ad86';
          ctx.beginPath();
          ctx.ellipse(side * (kind === 'fern' ? 23 : 17), -10, kind === 'fern' ? 28 - i * 1.8 : 18, 7 + (i % 2) * 2, side * -.25, 0, Math.PI * 2);
          ctx.fill();
          if (kind === 'sprig' && i % 2 === 0) {
            ctx.fillStyle = '#c38f85';
            ctx.beginPath();
            ctx.arc(side * 30, -18, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.strokeStyle = '#cfbc97';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(95, 310);
      ctx.lineTo(161, 310);
      ctx.stroke();
      // A little paper tooth, baked once rather than modeled into the frame.
      ctx.fillStyle = 'rgba(133,105,71,.055)';
      for (let i = 0; i < 600; i += 1) ctx.fillRect((i * 73) % 256, (i * 113) % 352, 1, 1);
    } else if (kind === 'clock') {
      ctx.translate(128, 128);
      for (let i = 0; i < 12; i += 1) {
        ctx.save();
        ctx.rotate(i * Math.PI / 6);
        ctx.strokeStyle = '#997b56';
        ctx.lineWidth = i % 3 === 0 ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(0, -99);
        ctx.lineTo(0, i % 3 === 0 ? -84 : -91);
        ctx.stroke();
        ctx.restore();
      }
      // A fixed decorative ten-past-ten face: no timer or per-frame work.
      ctx.strokeStyle = '#6c705a';
      ctx.lineCap = 'round';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(-38, -23);
      ctx.lineTo(0, 0);
      ctx.lineTo(56, -33);
      ctx.stroke();
      ctx.fillStyle = '#b38553';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#c6ccb0';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ede5d0';
      ctx.lineWidth = 5;
      for (let y = 24; y < 256; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y);
        ctx.stroke();
      }
      ctx.strokeStyle = '#a3ae90';
      ctx.lineWidth = 2;
      for (let x = 16; x < 256; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 256);
        ctx.stroke();
      }
      // Fine warp/weft baked into the same tiny map, not extra cloth geometry.
      ctx.lineWidth = 1;
      for (let i = 0; i < 256; i += 4) {
        ctx.strokeStyle = 'rgba(255,251,232,.16)';
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
        ctx.strokeStyle = 'rgba(82,103,71,.09)';
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
      }
    }
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.anisotropy = 2;
    return next;
  }, [kind]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function BotanicalPrint({kind, x}: {kind: 'fern' | 'sprig'; x: number}) {
  const paper = usePaintedTexture(kind);
  return <group position={[x, 0, 0]}>
    <RoundedBox args={[.79, 1.07, .075]} radius={.035} smoothness={3} castShadow>
      <meshStandardMaterial color='#ba8c60' roughness={.76}/>
    </RoundedBox>
    <mesh position={[0, 0, .039]}>
      <planeGeometry args={[.72, .995]}/>
      <meshStandardMaterial color='#e4d5b8' roughness={1}/>
    </mesh>
    <mesh position={[0, 0, .042]}>
      <planeGeometry args={[.67, .94]}/>
      <meshStandardMaterial map={paper} color='#fffdf4' roughness={.98}/>
    </mesh>
  </group>;
}

function CeramicPlant({position, rose = false, motion = false}: {position: [number, number, number]; rose?: boolean; motion?: boolean}) {
  const foliage = useRef<Group>(null);
  return <group position={position}>
    <mesh position-y={.115} castShadow>
      <cylinderGeometry args={[.145, .11, .23, 12]}/>
      <meshStandardMaterial color={rose ? '#c38f80' : '#dad3b8'} roughness={.62}/>
    </mesh>
    <mesh position-y={.225} rotation-x={Math.PI / 2}>
      <torusGeometry args={[.133, .018, 5, 16]}/>
      <meshStandardMaterial color={rose ? '#d1a595' : '#e4ddc6'} roughness={.58}/>
    </mesh>
    <mesh position-y={.235} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[.125, 12]}/>
      <meshStandardMaterial color='#77614a' roughness={1}/>
    </mesh>
    <group ref={foliage} position-y={.235}>
    <mesh position-y={.135}>
      <cylinderGeometry args={[.014, .018, .29, 6]}/>
      <meshStandardMaterial color='#78865c' roughness={.9}/>
    </mesh>
    {[0, 1, 2, 3, 4].map(i => <group key={i} position={[0, .065 + i * .046, 0]} rotation-y={i * 2.4}>
      <mesh position={[.075, .055, 0]} rotation-z={-.68} scale={[.065, .15, .027]}>
        <sphereGeometry args={[1, 8, 6]}/>
        <meshStandardMaterial color={i % 2 === 0 ? '#82956b' : '#a0ad83'} roughness={.92}/>
      </mesh>
    </group>)}
    </group>
    {motion && <DecorSway target={foliage} phase={rose ? 1.8 : .4}/>}
  </group>;
}

function KeepsakeShelf() {
  return <group position={[-4.94, 1.87, 1.3]} rotation-y={Math.PI / 2}>
    <RoundedBox args={[1.72, .095, .42]} radius={.035} smoothness={3} position-z={.18} castShadow receiveShadow>
      <meshStandardMaterial color='#c09869' roughness={.8}/>
    </RoundedBox>
    {[-.59, .59].map(x => <mesh key={x} position={[x, -.14, .1]} rotation-x={-.5}>
      <boxGeometry args={[.055, .28, .07]}/>
      <meshStandardMaterial color='#a78458' roughness={.85}/>
    </mesh>)}
    {['#8e9e81', '#ceaa7b', '#bc9388', '#e5dac3'].map((color, i) => <group key={color} position={[-.56 + i * .135, .055, .19]}>
      <RoundedBox args={[.112, .36 + (i % 2) * .07, .22]} radius={.012} smoothness={2} position-y={.18 + (i % 2) * .035} castShadow>
        <meshStandardMaterial color={color} roughness={.9}/>
      </RoundedBox>
      <mesh position={[0, .12, .113]}>
        <boxGeometry args={[.075, .018, .006]}/>
        <meshStandardMaterial color='#eee4cc' roughness={1}/>
      </mesh>
    </group>)}
    <group position={[.49, .055, .18]}>
      <mesh position-y={.17} scale={[.17, .2, .15]} castShadow>
        <sphereGeometry args={[1, 12, 10]}/>
        <meshStandardMaterial color='#c89f8c' roughness={.72}/>
      </mesh>
      <mesh position-y={.35}>
        <cylinderGeometry args={[.065, .08, .15, 12]}/>
        <meshStandardMaterial color='#c89f8c' roughness={.72}/>
      </mesh>
      <mesh position-y={.429} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[.049, 12]}/>
        <meshStandardMaterial color='#886b59' roughness={1}/>
      </mesh>
    </group>
  </group>;
}

function WarmClock() {
  const face = usePaintedTexture('clock');
  return <group position={[-3.58, 2.48, -3.91]}>
    <mesh rotation-x={Math.PI / 2} castShadow>
      <cylinderGeometry args={[.355, .355, .09, 32]}/>
      <meshStandardMaterial color='#bd9566' roughness={.75}/>
    </mesh>
    <mesh position-z={.048}>
      <circleGeometry args={[.303, 32]}/>
      <meshStandardMaterial map={face} color='#fffaf0' roughness={.96}/>
    </mesh>
  </group>;
}

function WovenCurtainAccents() {
  const weave = usePaintedTexture('weave');
  return <group>
    {[-2.34, 2.34].map(x => <group key={x} position-x={x}>
      {[1.51, 2.65].map(y => <mesh key={y} position={[0, y, -3.497]}>
        <planeGeometry args={[.62, .105]}/>
        <meshStandardMaterial map={weave} color='#f7f0dd' roughness={1}/>
      </mesh>)}
      <RoundedBox args={[.64, .065, .115]} radius={.025} smoothness={3} position={[0, 1.89, -3.54]}>
        <meshStandardMaterial color='#c5aa7c' roughness={.9}/>
      </RoundedBox>
    </group>)}
  </group>;
}

/** Wall-only styling keeps the entire owner-editable floor footprint clear. */
export default function RoomDetails({quality = 'high'}: {quality?: 'low' | 'high'} = {}) {
  const motion = useDecorMotion(quality === 'high');
  return <group name='room-crafted-details'>
    {/* This room is open on the right; the gallery faces inward on its left wall. */}
    <group position={[-4.94, 2.22, -1.48]} rotation-y={Math.PI / 2}>
      <BotanicalPrint kind='fern' x={-.51}/>
      <BotanicalPrint kind='sprig' x={.51}/>
    </group>
    <KeepsakeShelf/>
    <WarmClock/>
    <RoundedBox args={[4.14, .09, .42]} radius={.035} smoothness={3} position={[0, 1.265, -3.61]} receiveShadow castShadow>
      <meshStandardMaterial color='#c29b6d' roughness={.8}/>
    </RoundedBox>
    <CeramicPlant position={[-1.42, 1.315, -3.57]} motion={motion}/>
    <CeramicPlant position={[1.42, 1.315, -3.57]} rose motion={motion}/>
    <WovenCurtainAccents/>
  </group>;
}
