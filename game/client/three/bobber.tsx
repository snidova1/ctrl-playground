'use client';
import {useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Runtime} from '../runtime';
import {useStore} from '../store';

/** Bobber on the water plus a sagging line back to the rod tip. */
export function Bobber({rt, waterY}: {rt: Runtime; waterY: number}) {
  const fishing = useStore(rt.ui, s => s.fishing);
  const target = useStore(rt.ui, s => s.fishTarget);
  const ref = useRef<THREE.Group>(null);
  const line = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(13 * 3), 3));
    return new THREE.Line(geometry, new THREE.LineBasicMaterial({color: '#f4f1ea', transparent: true, opacity: 0.85}));
  }, []);
  const tip = useMemo(() => new THREE.Vector3(), []);
  useFrame(({clock}) => {
    const g = ref.current;
    if (!g || !fishing || !target) return;
    const t = clock.elapsedTime;
    const bite = fishing.phase === 'bite' || fishing.phase === 'reel';
    g.position.set(target.x, waterY + 0.05 + (bite ? Math.sin(t * 30) * 0.06 - 0.08 : Math.sin(t * 2.5) * 0.03), target.z);
    // Rod tip in the character's local frame (held forward and up).
    const p = rt.player, a = p.angle;
    const lx = 0.06, ly = 0.86 + 1.3 * Math.cos(1.0), lz = 0.3 + 1.3 * Math.sin(1.0);
    tip.set(p.pos.x + Math.sin(a) * lz + Math.cos(a) * lx, p.pos.y + ly, p.pos.z + Math.cos(a) * lz - Math.sin(a) * lx);
    const pos = line.geometry.attributes.position as THREE.BufferAttribute;
    const tension = fishing.phase === 'reel' ? 0.05 : 0.45;
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      pos.setXYZ(i, tip.x + (g.position.x - tip.x) * k, tip.y + (g.position.y - tip.y) * k - Math.sin(k * Math.PI) * tension, tip.z + (g.position.z - tip.z) * k);
    }
    pos.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  });
  if (!fishing || !target || fishing.phase === 'cast') return null;
  return <>
    <primitive object={line} />
    <group ref={ref}>
      <mesh><sphereGeometry args={[0.09, 12, 8]} /><meshToonMaterial color="#ffffff" /></mesh>
      <mesh position={[0, 0.07, 0]}><sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshToonMaterial color="#e8473d" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}><ringGeometry args={[0.15, 0.2, 24]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.5} /></mesh>
    </group>
  </>;
}
