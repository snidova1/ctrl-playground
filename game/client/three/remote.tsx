'use client';
import {useEffect, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {RemotePlayer} from '@/game/core/api-types';
import {Avatar, type AvatarMotion} from './avatar';

/** Another real player (never an NPC), smoothly interpolated between presence updates. */
export function Remote({p, height}: {p: RemotePlayer; height: (x: number, z: number) => number}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<AvatarMotion>({anim: p.anim, speed: 2.6, tool: 'none', actionAt: 0});
  const latest = useRef(p);
  latest.current = p;
  useEffect(() => {if (p.emote && p.emoteAt) {motion.current.emote = p.emote; motion.current.emoteAt = performance.now();}}, [p.emote, p.emoteAt]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const q = latest.current;
    const d = Math.hypot(q.x - g.position.x, q.z - g.position.z);
    if (d > 6) g.position.set(q.x, height(q.x, q.z), q.z);
    g.position.x += (q.x - g.position.x) * Math.min(1, dt * 6);
    g.position.z += (q.z - g.position.z) * Math.min(1, dt * 6);
    g.position.y = height(g.position.x, g.position.z);
    let diff = q.angle - g.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    g.rotation.y += diff * Math.min(1, dt * 8);
    motion.current.anim = d > 0.15 && q.anim === 'idle' ? 'walk' : q.anim;
    motion.current.tool = q.anim === 'fish' ? 'rod' : q.anim === 'net' ? 'net' : q.anim === 'camera' ? 'camera' : q.anim === 'water' ? 'can' : 'none';
  });
  return <group ref={group} position={[p.x, height(p.x, p.z), p.z]}><Avatar look={p.appearance} motion={motion} name={p.name} nameColor={p.friend ? '#ffd1e0' : '#ffffff'} /></group>;
}
