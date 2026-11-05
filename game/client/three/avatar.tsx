'use client';
import {useEffect, useMemo, useRef, useState, type MutableRefObject} from 'react';
import {createPortal, useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {VRM} from '@pixiv/three-vrm';
import {lookColors, type Appearance} from '@/game/core/appearance';
import {canvasTexture, toon} from './materials';
import {createAvatar, HEAD_SCALE, type AvatarInstance} from './vrm';
import {Fish3D} from './fish-model';

export type Tool = 'none' | 'rod' | 'net' | 'can' | 'camera' | 'pan';
export interface AvatarMotion {anim: string; speed: number; tool: Tool; actionAt: number; emote?: string; emoteAt?: number; mood?: 'happy' | 'sad' | 'surprised' | 'relaxed' | 'sleepy' | 'focus' | null; hold?: {item: string; size: number; until: number} | null}

const G = {
  stick: new THREE.CylinderGeometry(0.012, 0.016, 1, 6),
  ring: new THREE.TorusGeometry(0.15, 0.014, 6, 18),
  cone: new THREE.ConeGeometry(0.15, 0.24, 14, 1, true),
  box: new THREE.BoxGeometry(1, 1, 1),
  disc: new THREE.CylinderGeometry(1, 1, 1, 18),
  ball: new THREE.SphereGeometry(1, 14, 10),
  dome: new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  ear: new THREE.ConeGeometry(0.05, 0.09, 4),
  star: (() => {
    const s = new THREE.Shape();
    for (let k = 0; k < 10; k++) {const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 0.45 : 1; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (k) s.lineTo(x, y); else s.moveTo(x, y);}
    return new THREE.ExtrudeGeometry(s, {depth: 0.25, bevelEnabled: false});
  })(),
};

function ToolProp({tool}: {tool: Tool}) {
  if (tool === 'rod') return <group>
    <mesh geometry={G.stick} material={toon('#8a5a3a')} position={[0, 0.62, 0]} scale={[1, 1.35, 1]} />
    <mesh geometry={G.disc} material={toon('#d9d9d9')} position={[0.03, 0.08, 0]} scale={[0.04, 0.03, 0.04]} rotation={[0, 0, Math.PI / 2]} />
  </group>;
  if (tool === 'net') return <group>
    <mesh geometry={G.stick} material={toon('#c99a62')} position={[0, 0.42, 0]} scale={[1, 0.9, 1]} />
    <mesh geometry={G.ring} material={toon('#efe7d8')} position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]} />
    <mesh geometry={G.cone} material={toon('#ffffff', {transparent: true, opacity: 0.55, side: THREE.DoubleSide})} position={[0, 0.88, 0]} rotation={[Math.PI, 0, 0]} />
  </group>;
  if (tool === 'can') return <group position={[0, 0.02, 0.06]}>
    <mesh geometry={G.disc} material={toon('#78bfd0')} scale={[0.08, 0.13, 0.08]} castShadow />
    <mesh geometry={G.stick} material={toon('#78bfd0')} position={[0, 0.03, 0.11]} rotation={[1.0, 0, 0]} scale={[1.3, 0.2, 1.3]} />
  </group>;
  if (tool === 'camera') return <group position={[0, 0.03, 0.06]}>
    <mesh geometry={G.box} material={toon('#3e3a3f')} scale={[0.17, 0.11, 0.08]} castShadow />
    <mesh geometry={G.disc} material={toon('#d8d8e0')} position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} scale={[0.035, 0.04, 0.035]} />
  </group>;
  if (tool === 'pan') return <group>
    <mesh geometry={G.stick} material={toon('#5a4a3a')} position={[0, 0.12, 0]} scale={[1, 0.24, 1]} />
    <mesh geometry={G.disc} material={toon('#4a4a52')} position={[0, 0.32, 0]} scale={[0.13, 0.02, 0.13]} />
  </group>;
  return null;
}

/** Hats sit on the normalized head; the visible head is scaled for chibi proportions. */
function Hat({hat, color}: {hat: number; color: string}) {
  const m = toon(color), white = toon('#fff7f0');
  if (hat === 1) return <>{Array.from({length: 9}, (_, i) => {const a = (i / 8) * Math.PI * 1.1 - Math.PI * 0.55; return <mesh key={i} geometry={G.ball} material={toon(['#f7a1b5', '#f7e07b', '#ffffff', '#b9a3e3'][i % 4])} position={[Math.sin(a) * 0.15, 0.27 + Math.cos(a) * 0.02, Math.cos(a) * 0.12 - 0.02]} scale={0.032} />;})}</>;
  if (hat === 2) return <mesh geometry={G.ball} material={m} position={[0.03, 0.3, -0.02]} scale={[0.19, 0.055, 0.18]} rotation={[0.1, 0, -0.25]} castShadow />;
  if (hat === 3) return <>{[-0.07, 0.07].map(x => <group key={x} position={[x, 0.38, -0.03]} rotation={[-0.15, 0, -x * 2]}><mesh geometry={G.ball} material={white} scale={[0.035, 0.12, 0.022]} castShadow /><mesh geometry={G.ball} material={toon('#f7b6c8')} position={[0, 0, 0.012]} scale={[0.02, 0.085, 0.012]} /></group>)}</>;
  if (hat === 4) return <group position={[0, 0.27, -0.01]} rotation={[0.08, 0, 0]}><mesh geometry={G.disc} material={toon('#f1d38f')} scale={[0.27, 0.012, 0.27]} castShadow /><mesh geometry={G.disc} material={toon('#f1d38f')} position={[0, 0.04, 0]} scale={[0.14, 0.08, 0.14]} castShadow /><mesh geometry={G.disc} material={m} position={[0, 0.015, 0]} scale={[0.145, 0.025, 0.145]} /></group>;
  if (hat === 5) return <>{[-0.12, 0.12].map(x => <group key={x} position={[x, 0.3, -0.02]}><mesh geometry={G.ball} material={m} scale={[0.05, 0.05, 0.03]} castShadow /><mesh geometry={G.ball} material={toon('#f7c8b8')} position={[0, 0, 0.018]} scale={[0.028, 0.028, 0.012]} /></group>)}</>;
  if (hat === 6) return <group position={[0, 0.25, -0.12]}>{[-1, 1].map(s => <mesh key={s} geometry={G.ball} material={m} position={[s * 0.045, 0, 0]} rotation={[0, 0, s * 0.6]} scale={[0.05, 0.03, 0.02]} castShadow />)}<mesh geometry={G.ball} material={m} scale={0.02} /></group>;
  if (hat === 7) return <>{[-0.1, 0.1].map(x => <group key={x} position={[x, 0.29, -0.02]} rotation={[0, 0, -x * 2.5]}><mesh geometry={G.ear} material={m} castShadow /><mesh geometry={G.ear} material={toon('#f7c8c8')} position={[0, -0.005, 0.012]} scale={0.6} /></group>)}</>;
  if (hat === 8) return <group position={[0, 0.17, -0.015]}><mesh geometry={G.dome} material={m} scale={[0.17, 0.16, 0.17]} castShadow /><mesh geometry={G.disc} material={toon('#fff7f0')} position={[0, 0.005, 0]} scale={[0.172, 0.03, 0.172]} /><mesh geometry={G.ball} material={white} position={[0, 0.17, 0]} scale={0.04} castShadow /></group>;
  if (hat === 9) return <group position={[0, 0.2, -0.01]} rotation={[-0.12, 0, 0]}><mesh geometry={G.dome} material={m} scale={[0.165, 0.11, 0.165]} castShadow /><mesh geometry={G.disc} material={m} position={[0, 0.005, 0.15]} scale={[0.11, 0.012, 0.1]} castShadow /></group>;
  if (hat === 10) return <group position={[0, 0.27, -0.02]}><mesh geometry={G.disc} material={white} scale={[0.14, 0.09, 0.14]} castShadow /><mesh geometry={G.ball} material={white} position={[0, 0.1, 0]} scale={[0.17, 0.09, 0.17]} castShadow /></group>;
  if (hat === 11) return <group position={[0, 0.18, -0.01]}><mesh geometry={G.dome} material={toon('#8ccf6a')} scale={[0.175, 0.15, 0.175]} castShadow />{[-0.07, 0.07].map(x => <group key={x} position={[x, 0.14, 0.07]}><mesh geometry={G.ball} material={white} scale={0.045} /><mesh geometry={G.ball} material={toon('#2b2b30')} position={[0, 0.005, 0.035]} scale={0.02} /></group>)}</group>;
  if (hat === 12) return <group position={[0, 0.27, -0.02]} rotation={[-0.1, 0, 0.12]}><mesh geometry={G.disc} material={m} scale={[0.26, 0.012, 0.26]} castShadow /><mesh geometry={G.cone} material={m} position={[0, 0.17, 0]} scale={[1, 1.5, 1]} castShadow /><mesh geometry={G.disc} material={toon('#ffd84a')} position={[0, 0.03, 0]} scale={[0.135, 0.03, 0.135]} /><mesh geometry={G.star} material={toon('#ffd84a')} position={[0.06, 0.1, 0.11]} scale={0.03} /></group>;
  if (hat === 13) return <group position={[0, 0.3, -0.01]}>{Array.from({length: 5}, (_, i) => {const a = (i / 5) * Math.PI * 2; return <group key={i}><mesh geometry={G.ear} material={toon('#f2c94c')} position={[Math.sin(a) * 0.07, 0.04, Math.cos(a) * 0.07]} scale={[0.6, 0.8, 0.6]} castShadow /><mesh geometry={G.ball} material={toon(['#e8556e', '#5fb0f0', '#7ed68a'][i % 3])} position={[Math.sin(a) * 0.072, 0.0, Math.cos(a) * 0.072]} scale={0.012} /></group>;})}<mesh geometry={G.disc} material={toon('#f2c94c')} scale={[0.075, 0.035, 0.075]} castShadow /></group>;
  if (hat === 14) return <group position={[0, 0.2, -0.015]}><mesh geometry={G.dome} material={toon('#e5533f')} scale={[0.22, 0.17, 0.22]} castShadow />{[[0, 0.16, 0.05], [0.1, 0.11, 0.1], [-0.11, 0.1, 0.09], [0.13, 0.08, -0.08], [-0.08, 0.13, -0.08], [0.02, 0.1, -0.15]].map((p, i) => <mesh key={i} geometry={G.ball} material={white} position={p as [number, number, number]} scale={[0.032, 0.014, 0.032]} />)}</group>;
  if (hat === 15) return <group position={[0, 0.25, -0.01]} rotation={[0.06, 0, 0]}><mesh geometry={G.disc} material={toon('#fff3d6')} scale={[0.34, 0.01, 0.34]} castShadow /><mesh geometry={G.dome} material={toon('#fff3d6')} position={[0, 0.005, 0]} scale={[0.15, 0.1, 0.15]} castShadow /><mesh geometry={G.disc} material={m} position={[0, 0.02, 0]} scale={[0.152, 0.03, 0.152]} /><group position={[0.13, 0.03, 0.05]}>{Array.from({length: 5}, (_, k) => {const a = (k / 5) * Math.PI * 2; return <mesh key={k} geometry={G.ball} material={toon('#ffffff')} position={[Math.cos(a) * 0.02, 0.01, Math.sin(a) * 0.02]} scale={0.014} />;})}<mesh geometry={G.ball} material={toon('#ffd84a')} position={[0, 0.012, 0]} scale={0.011} /></group></group>;
  return null;
}

/** Accessories; `where` picks which bone portal renders this part. */
function Accessory({id, where, color}: {id: number; where: 'head' | 'neck' | 'chest'; color: string}) {
  const m = toon(color), dark = toon('#3a3238'), white = toon('#fff7f0');
  if (where === 'head') {
    if (id === 1 || id === 2) return <group position={[0, 0.118, 0.148]}>
      {[-0.056, 0.056].map(x => <mesh key={x} geometry={G.ring} material={id === 1 ? toon('#a8774c') : dark} position={[x, 0, 0]} scale={0.27} />)}
      {id === 2 && [-0.056, 0.056].map(x => <mesh key={x} geometry={G.disc} material={toon('#2a2a3a', {transparent: true, opacity: 0.8})} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.038, 0.004, 0.038]} />)}
      <mesh geometry={G.box} material={dark} scale={[0.03, 0.006, 0.006]} />
    </group>;
    if (id === 5 || id === 6) return <group position={[0.12, 0.21, 0.05]} rotation={[0, 0.5, -0.3]}>
      {id === 5 ? Array.from({length: 5}, (_, k) => {const a = (k / 5) * Math.PI * 2; return <mesh key={k} geometry={G.ball} material={toon('#f7a1b5')} position={[Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0]} scale={0.016} />;}) : <mesh geometry={G.star} material={toon('#ffd84a')} scale={0.05} rotation={[Math.PI / 2, 0, 0]} />}
      {id === 5 && <mesh geometry={G.ball} material={toon('#fff3a8')} scale={0.013} />}
    </group>;
    if (id === 7) return <group>
      <mesh geometry={G.ring} material={dark} position={[0, 0.17, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1.05, 0.95, 1]} />
      {[-0.158, 0.158].map(x => <mesh key={x} geometry={G.disc} material={m} position={[x, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.05, 0.03, 0.05]} castShadow />)}
    </group>;
    if (id === 9) return <>{[-0.08, 0.08].map(x => <mesh key={x} geometry={G.ball} material={toon('#ff7a9a')} position={[x, 0.07, 0.138]} scale={[0.016, 0.013, 0.006]} />)}</>;
    if (id === 10) return <mesh geometry={G.ring} material={toon('#ffe680', {emissive: '#ffd84a', emissiveIntensity: 0.6})} position={[0, 0.44, -0.02]} rotation={[Math.PI / 2 - 0.15, 0, 0]} scale={[0.75, 0.75, 1.4]} />;
    if (id === 13) return <group position={[0, 0.118, 0.15]}>{[-0.056, 0.056].map(x => <group key={x} position={[x, 0, 0]}>{[-1, 1].map(s => <mesh key={s} geometry={G.ball} material={toon('#ff5f8a', {transparent: true, opacity: 0.85})} position={[s * 0.012, 0.006, 0]} rotation={[0, 0, s * 0.7]} scale={[0.022, 0.03, 0.006]} />)}<mesh geometry={G.ear} material={toon('#ff5f8a', {transparent: true, opacity: 0.85})} position={[0, -0.014, 0]} rotation={[Math.PI, 0, 0]} scale={[0.55, 0.3, 0.12]} /></group>)}<mesh geometry={G.box} material={toon('#d6305a')} scale={[0.03, 0.006, 0.006]} /></group>;
    return null;
  }
  if (where === 'neck' && id === 11) return <group position={[0, -0.02, 0.07]}>{[-1, 1].map(s => <mesh key={s} geometry={G.ear} material={m} position={[s * 0.028, 0, 0]} rotation={[0, 0, s * -Math.PI / 2]} scale={[0.6, 0.55, 0.3]} castShadow />)}<mesh geometry={G.ball} material={m} scale={0.013} /></group>;
  if (where === 'neck' && id === 12) return <group position={[0, -0.03, 0.005]}>{Array.from({length: 16}, (_, k) => {const a = (k / 16) * Math.PI * 2; return <mesh key={k} geometry={G.ball} material={toon('#fbf6ee')} position={[Math.sin(a) * 0.075, -Math.max(0, Math.cos(a)) * 0.04, Math.cos(a) * 0.07]} scale={0.011} />;})}</group>;
  if (where === 'neck' && id === 3) return <group position={[0, 0.01, 0]}>
    <mesh geometry={G.ring} material={m} rotation={[Math.PI / 2, 0, 0]} scale={[0.5, 0.5, 2.2]} castShadow />
    <mesh geometry={G.box} material={m} position={[0.04, -0.07, 0.07]} rotation={[0.2, 0, 0.15]} scale={[0.04, 0.12, 0.015]} castShadow />
  </group>;
  if (where === 'chest') {
    if (id === 4) return <group position={[0, -0.02, -0.11]}>
      <mesh geometry={G.box} material={m} scale={[0.2, 0.22, 0.09]} castShadow />
      <mesh geometry={G.box} material={white} position={[0, -0.04, -0.05]} scale={[0.12, 0.08, 0.02]} />
    </group>;
    if (id === 8) return <group position={[0, 0.02, -0.1]}>
      {[-1, 1].map(s => <mesh key={s} geometry={G.ball} material={toon('#d9f2ff', {transparent: true, opacity: 0.6, side: THREE.DoubleSide})} position={[s * 0.15, 0.06, -0.02]} rotation={[0, s * 0.4, s * 0.5]} scale={[0.15, 0.2, 0.01]} />)}
    </group>;
  }
  return null;
}

function Emote({motion}: {motion: MutableRefObject<AvatarMotion>}) {
  const ref = useRef<THREE.Sprite>(null);
  const textures = useMemo(() => {
    const glyphs: Record<string, string> = {wave: '👋', heart: '💗', laugh: '😆', wow: '✨', zzz: '💤', music: '🎵', star: '⭐', '!': '❗', '?': '❔', love: '💕'};
    return Object.fromEntries(Object.entries(glyphs).map(([k, g]) => [k, canvasTexture(128, 128, ctx => {
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(64, 60, 50, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(52, 104); ctx.lineTo(64, 124); ctx.lineTo(76, 104); ctx.fill();
      ctx.font = '60px system-ui, "Apple Color Emoji", "Segoe UI Emoji"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(g, 64, 64);
    })]));
  }, []);
  useFrame(() => {
    const s = ref.current;
    if (!s) return;
    const m = motion.current;
    const age = (performance.now() - (m.emoteAt ?? 0)) / 1000;
    const tex = m.emote ? textures[m.emote] : undefined;
    if (!tex || age > 3) {s.visible = false; return;}
    s.visible = true;
    (s.material as THREE.SpriteMaterial).map = tex;
    s.scale.setScalar(0.5 * (0.6 + 0.4 * Math.min(1, age * 6)));
    s.position.y = 1.85 + Math.sin(age * 4) * 0.04;
  });
  return <sprite ref={ref} visible={false}><spriteMaterial transparent depthWrite={false} /></sprite>;
}

export function NameTag({name, color = '#ffffff', y = 1.75}: {name: string; color?: string; y?: number}) {
  const texture = useMemo(() => canvasTexture(256, 64, ctx => {
    ctx.font = '700 28px system-ui, sans-serif';
    const w = Math.min(250, ctx.measureText(name).width + 34);
    ctx.fillStyle = 'rgba(70,54,44,0.5)';
    ctx.beginPath(); ctx.roundRect((256 - w) / 2, 12, w, 42, 21); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 34);
  }), [name, color]);
  return <sprite position={[0, y, 0]} scale={[0.95, 0.24, 1]} renderOrder={5}><spriteMaterial map={texture} transparent depthWrite={false} depthTest={false} /></sprite>;
}

const CLIP_FOR: Record<string, string> = {
  idle: 'Idle', walk: 'Walk', run: 'Run', sneak: 'CrouchWalk', crouch: 'CrouchIdle', sit: 'Seated', lie: 'Idle', cheer: 'Victory',
  wave: 'Talk', net: 'Interact', water: 'Interact', eat: 'Interact', pick: 'PickUp', fish: 'Idle', camera: 'Idle', talk: 'Talk',
};
const ONCE = new Set(['Interact', 'PickUp', 'Victory']);

function useAnimator(instance: AvatarInstance | null) {
  return useMemo(() => {
    if (!instance) return null;
    const mixer = new THREE.AnimationMixer(instance.vrm.scene);
    const actions = new Map(instance.clips.map(c => [c.name, mixer.clipAction(c)]));
    const idle = actions.get('Idle');
    idle?.play();
    return {mixer, actions, current: idle ?? null, currentName: 'Idle', lastAction: 0};
  }, [instance]);
}

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'] as const;
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3();
/** The stock idle reads tense (raised shoulders, fists). Ease it into a soft, friendly stance. */
function relaxIdle(vrm: VRM, t: number, amount: number, restHips: THREE.Vector3 | null) {
  if (amount <= 0.001) return;
  const blend = (name: Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0], x: number, y: number, z: number) => {
    const b = vrm.humanoid.getNormalizedBoneNode(name);
    if (b) b.quaternion.slerp(_q.setFromEuler(_e.set(x, y, z)), amount);
  };
  // Slow weight shift between the feet (contrapposto), gentle breathing, a curious head.
  const breathe = Math.sin(t * 1.6) * 0.02, shift = Math.sin(t * 0.35) * 0.5 + 0.5, look = Math.sin(t * 0.4);
  const hips = vrm.humanoid.getNormalizedBoneNode('hips');
  if (hips) {
    hips.quaternion.slerp(_q.setFromEuler(_e.set(0, 0, (shift - 0.5) * 0.05)), amount);
    if (restHips) hips.position.lerp(_v.set(restHips.x + (shift - 0.5) * 0.02, restHips.y - 0.008, restHips.z), amount);
  }
  // Legs straight under the hips; the unweighted leg relaxes with a soft knee.
  const soft = (k: number) => [-0.1 * k, 0.2 * k] as const;
  const [rt, rk] = soft(1 - shift), [lt, lk] = soft(shift);
  blend('rightUpperLeg', rt, 0.04, 0.02); blend('rightLowerLeg', rk, 0, 0); blend('rightFoot', -rk * 0.4, 0.06, 0);
  blend('leftUpperLeg', lt, -0.04, -0.02); blend('leftLowerLeg', lk, 0, 0); blend('leftFoot', -lk * 0.4, -0.06, 0);
  blend('spine', -0.02 + breathe * 0.5, 0, (0.5 - shift) * 0.04); blend('chest', breathe * 0.4, 0, 0); blend('upperChest', 0, 0, 0);
  blend('rightShoulder', 0, 0, -0.06); blend('leftShoulder', 0, 0, 0.06);
  // Arms hang close to the body, elbows soft, palms toward the thighs.
  blend('rightUpperArm', 0, -0.06, -1.2 - breathe); blend('leftUpperArm', 0, 0.06, 1.2 + breathe);
  blend('rightLowerArm', 0, 0.16, 0); blend('leftLowerArm', 0, -0.16, 0);
  blend('rightHand', 0, 0, -0.08); blend('leftHand', 0, 0, 0.08);
  blend('neck', 0.02, look * 0.05, 0); blend('head', -0.03, look * 0.12, 0.06 + (shift - 0.5) * 0.05);
  for (const side of ['left', 'right'] as const) for (const f of FINGERS) for (const seg of ['Proximal', 'Intermediate', 'Distal'] as const) {
    if (f === 'Thumb' && seg === 'Proximal') continue;
    const name = `${side}${f}${f === 'Thumb' && seg === 'Intermediate' ? 'Metacarpal' : seg}` as Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0];
    blend(name, 0, 0, (side === 'left' ? 1 : -1) * (f === 'Thumb' ? 0.1 : 0.22));
  }
}

function poseOverrides(vrm: VRM, anim: string, t: number) {
  const bone = (name: Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0]) => vrm.humanoid.getNormalizedBoneNode(name);
  const set = (name: Parameters<VRM['humanoid']['getNormalizedBoneNode']>[0], x: number, y: number, z: number) => {
    const b = bone(name);
    if (b) b.quaternion.setFromEuler(new THREE.Euler(x, y, z));
  };
  // Normalized VRM space: right arm rests along -x, left along +x, character faces +z.
  if (anim === 'fish') {
    set('rightUpperArm', 0, 0.75, 0.95 + Math.sin(t * 2) * 0.02);
    set('rightLowerArm', 0, 0.75, 0);
    set('leftUpperArm', 0, -0.85, -0.95);
    set('leftLowerArm', 0, -0.9, 0);
  } else if (anim === 'camera') {
    set('rightUpperArm', 0, 1.0, 0.55);
    set('rightLowerArm', 0, 1.7, 0);
    set('leftUpperArm', 0, -1.0, -0.55);
    set('leftLowerArm', 0, -1.7, 0);
    set('head', 0.1, 0, 0);
  }
}

/** Anime VRM avatar driven by a motion ref (no React re-render per frame). */
export function Avatar({look, motion, name, nameColor}: {look: Appearance; motion: MutableRefObject<AvatarMotion>; name?: string; nameColor?: string}) {
  const [instance, setInstance] = useState<AvatarInstance | null>(null);
  const [tool, setTool] = useState<Tool>(motion.current.tool);
  const [held, setHeld] = useState<{item: string; size: number} | null>(null);
  const lookKey = JSON.stringify(look);
  useEffect(() => {
    let alive = true, created: AvatarInstance | null = null;
    createAvatar(JSON.parse(lookKey) as Appearance).then(i => {
      if (!alive) {i.dispose(); return;}
      created = i; setInstance(i);
    }).catch(error => console.warn('Avatar unavailable', error));
    return () => {alive = false; created?.dispose(); setInstance(null);};
  }, [lookKey]);
  const animator = useAnimator(instance);
  // Hips height of the bind pose, before any clip moves it: the relaxed stance stands up straight.
  const restHips = useMemo(() => instance?.vrm.humanoid.getNormalizedBoneNode('hips')?.position.clone() ?? null, [instance]);
  const blink = useRef({next: 2 + Math.random() * 3, t: 0, value: 0});
  const clock = useRef(0);
  const relax = useRef(0);

  useFrame((_, rawDt) => {
    const m = motion.current;
    if (m.tool !== tool) setTool(m.tool);
    const holding = m.hold && performance.now() < m.hold.until ? m.hold : null;
    if ((holding?.item ?? null) !== (held?.item ?? null)) setHeld(holding ? {item: holding.item, size: holding.size} : null);
    if (!instance || !animator) return;
    const dt = Math.min(rawDt, 0.1);
    clock.current += dt;
    let clipName = CLIP_FOR[m.anim] ?? 'Idle';
    // One-shot gestures replay when a new action timestamp arrives.
    const fresh = m.actionAt !== animator.lastAction;
    if (ONCE.has(clipName) && !fresh && animator.currentName === clipName) {
      const a = animator.current;
      if (a && !a.isRunning()) clipName = 'Idle';
    }
    if (!animator.actions.has(clipName)) clipName = 'Idle';
    if (clipName !== animator.currentName || (fresh && ONCE.has(clipName))) {
      const next = animator.actions.get(clipName)!;
      next.reset().setLoop(ONCE.has(clipName) ? THREE.LoopOnce : THREE.LoopRepeat, ONCE.has(clipName) ? 1 : Infinity);
      next.clampWhenFinished = ONCE.has(clipName);
      next.setEffectiveTimeScale(m.anim === 'walk' ? Math.max(0.8, Math.min(1.3, m.speed / 2.6)) : 1);
      next.fadeIn(0.18).play();
      animator.current?.fadeOut(0.18);
      animator.current = next; animator.currentName = clipName;
    }
    animator.lastAction = m.actionAt;
    animator.mixer.update(dt);
    poseOverrides(instance.vrm, m.anim, clock.current);
    // Fade the relaxed stance in only while the idle clip is the one playing.
    const calm = animator.currentName === 'Idle' && (m.anim === 'idle' || !CLIP_FOR[m.anim] || CLIP_FOR[m.anim] === 'Idle') && m.anim !== 'fish' && m.anim !== 'camera';
    relax.current += ((calm ? 1 : 0) - relax.current) * Math.min(1, dt * 5);
    relaxIdle(instance.vrm, clock.current, relax.current, restHips);
    // Blink + mood.
    const em = instance.vrm.expressionManager;
    if (em) {
      const b = blink.current;
      b.next -= dt;
      if (b.next < 0) {b.t += dt; b.value = Math.sin(Math.min(1, b.t / 0.16) * Math.PI); if (b.t > 0.16) {b.t = 0; b.next = 2 + Math.random() * 3.5; b.value = 0;}}
      // Faces always follow what the character is doing: no blank stares during gameplay.
      const mood = m.mood ?? (m.anim === 'cheer' ? 'happy' : m.anim === 'sit' ? 'relaxed' : m.anim === 'sneak' ? 'focus' : m.anim === 'talk' || m.anim === 'wave' ? 'happy' : null);
      const ease = (name: string, target: number) => {const v = em.getValue(name) ?? 0; em.setValue(name, v + (target - v) * Math.min(1, dt * 10));};
      ease('happy', mood === 'happy' ? 1 : mood === 'relaxed' ? 0.4 : 0);
      ease('relaxed', mood === 'relaxed' || mood === 'sleepy' ? 0.7 : 0);
      ease('surprised', mood === 'surprised' ? 0.9 : 0);
      ease('sad', mood === 'sad' ? 0.8 : 0);
      ease('angry', mood === 'focus' ? 0.25 : 0);
      const talking = m.anim === 'talk' || m.anim === 'wave';
      em.setValue('aa', talking ? Math.abs(Math.sin(clock.current * 11)) * 0.55 : mood === 'surprised' ? 0.5 : 0);
      em.setValue('blink', mood === 'happy' ? 0 : mood === 'sleepy' ? 0.6 + b.value * 0.4 : b.value);
    }
    instance.vrm.update(dt);
  });

  const hand = instance?.vrm.humanoid.getNormalizedBoneNode('rightHand') ?? null;
  const head = instance?.vrm.humanoid.getNormalizedBoneNode('head') ?? null;
  const neck = instance?.vrm.humanoid.getNormalizedBoneNode('neck') ?? null;
  const chest = instance?.vrm.humanoid.getNormalizedBoneNode('upperChest') ?? instance?.vrm.humanoid.getNormalizedBoneNode('chest') ?? null;
  const colors = lookColors(look);
  // The held-fish group is always mounted and comes first: inserting a sibling next to the
  // bone portals made R3F attach it to the scene root.
  return <group>
    <group position={[0, 1.66, 0.12]} rotation={[0, Math.PI / 2, 0.2]} visible={!!held}>{held && <Fish3D species={held.item} sizeCm={held.size} />}</group>
    {instance ?<group position={[0, instance.floor, 0]} scale={instance.scale}>
      <primitive object={instance.vrm.scene} />
      {tool === 'rod' && <group position={[0.06 / instance.scale, 0.86 / instance.scale, 0.3 / instance.scale]} rotation={[1.0, 0, 0]} scale={1 / instance.scale}><ToolProp tool="rod" /></group>}
      {hand && tool !== 'none' && tool !== 'rod' && createPortal(<group rotation={tool === 'net' ? [0.3, 0.2, 1.1] : [0, 0, 0]}><ToolProp tool={tool} /></group>, hand)}
      {head && createPortal(<group scale={HEAD_SCALE * 0.62} position={[0, 0.02, 0.01]}>
        {look.hat > 0 && <Hat hat={look.hat} color={colors.hat} />}
        {look.accessory > 0 && <Accessory id={look.accessory} where="head" color={colors.hat} />}
      </group>, head)}
      {neck && (look.accessory === 3 || look.accessory === 11 || look.accessory === 12) && createPortal(<Accessory id={look.accessory} where="neck" color={colors.hat} />, neck)}
      {chest && (look.accessory === 4 || look.accessory === 8) && createPortal(<Accessory id={look.accessory} where="chest" color={colors.hat} />, chest)}
    </group> : <mesh position={[0, 0.7, 0]}><capsuleGeometry args={[0.25, 0.6, 4, 12]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.35} /></mesh>}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <circleGeometry args={[0.34, 20]} />
      <meshBasicMaterial color="#2a2a3a" transparent opacity={0.16} depthWrite={false} />
    </mesh>
    {name && <NameTag name={name} color={nameColor} y={held ? 2.6 : 1.78} />}
    <Emote motion={motion} />
  </group>;
}
