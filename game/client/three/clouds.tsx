'use client';
import {useMemo, useRef, type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {mulberry32} from '@/game/core/rng';
import {canvasTexture} from './materials';
import type {Environment} from './sky';

/** Painted cumulus: overlapping soft puffs, bright tops and lavender-grey bellies. */
function cloudTexture(seed: number) {
  const random = mulberry32(seed);
  return canvasTexture(512, 256, ctx => {
    ctx.clearRect(0, 0, 512, 256);
    const puffs: [number, number, number][] = [];
    const count = 9 + Math.floor(random() * 5);
    for (let i = 0; i < count; i++) {
      const x = 90 + random() * 330, r = 38 + random() * 62;
      const y = 175 - r * (0.55 + random() * 0.5) - (1 - Math.abs(x - 256) / 256) * 40;
      puffs.push([x, y, r]);
    }
    // Shadowed base first, then lit tops offset upward: a soft volumetric read.
    for (const [x, y, r] of puffs) {
      const g = ctx.createRadialGradient(x, y + r * 0.2, r * 0.2, x, y + r * 0.2, r);
      g.addColorStop(0, 'rgba(214,222,240,1)'); g.addColorStop(0.85, 'rgba(205,214,236,0.95)'); g.addColorStop(1, 'rgba(205,214,236,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + r * 0.2, r, 0, Math.PI * 2); ctx.fill();
    }
    for (const [x, y, r] of puffs) {
      const g = ctx.createRadialGradient(x - r * 0.15, y - r * 0.25, r * 0.1, x, y, r * 0.92);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.75, 'rgba(250,252,255,0.96)'); g.addColorStop(1, 'rgba(250,252,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.fill();
    }
    // Flat soft bottom edge.
    ctx.globalCompositeOperation = 'destination-out';
    const fade = ctx.createLinearGradient(0, 180, 0, 230);
    fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fade; ctx.fillRect(0, 180, 512, 76);
  });
}

export function Clouds({envRef}: {envRef: MutableRefObject<Environment>}) {
  const group = useRef<THREE.Group>(null);
  const clouds = useMemo(() => {
    const random = mulberry32(404);
    const textures = Array.from({length: 5}, (_, i) => cloudTexture(10 + i));
    return Array.from({length: 18}, (_, i) => {
      const a = random() * Math.PI * 2, d = 150 + random() * 120;
      const material = new THREE.SpriteMaterial({map: textures[i % textures.length], transparent: true, depthWrite: false, fog: false});
      const s = 70 + random() * 70;
      return {material, position: new THREE.Vector3(Math.cos(a) * d, 38 + random() * 55, Math.sin(a) * d), scale: [s, s * 0.5, 1] as [number, number, number], speed: 0.4 + random() * 0.6};
    });
  }, []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.copy(state.camera.position).setY(0);
    g.rotation.y += dt * 0.004;
    const night = envRef.current.night;
    const tint = new THREE.Color('#ffffff').lerp(new THREE.Color('#5a5f8f'), night * 0.85).lerp(envRef.current.sky.horizon, 0.12);
    for (const c of clouds) {c.material.color.copy(tint); c.material.opacity = 1 - night * 0.45;}
  });
  return <group ref={group}>{clouds.map((c, i) => <sprite key={i} material={c.material} position={c.position} scale={c.scale} renderOrder={-5} />)}</group>;
}
