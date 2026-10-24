'use client';

import {useLayoutEffect, useMemo, useRef} from 'react';
import {Color, InstancedMesh, Object3D} from 'three';
import CozyVillage from './cozy-village';
import StylizedMeadow from './stylized-meadow';
import StylizedCanopy from './stylized-canopy';
import StylizedWater from './stylized-water';
import type {HabitHouseSettings} from './habit-home';
import type {AtmospherePreset} from './atmosphere-presets';
import {ATMOSPHERE_LOOKS} from './atmosphere-presets';
import {pathCenter} from './stylized-layout';

type Quality = 'low' | 'high';

/** Same distant silhouettes as before, batched and gently matched to the sky. */
export function distantHillLayout(atmosphere: AtmospherePreset) {
  const look = ATMOSPHERE_LOOKS[atmosphere];
  const haze = new Color(look.fog);
  const palette = ['#9bb697', '#88a68a'].map(base => new Color(base).lerp(haze, .12 + look.night * .48).getHexString());
  return Array.from({length: 14}, (_, i) => {
    const angle = i / 14 * Math.PI * 2;
    return {
      position: [Math.cos(angle) * 36, -3, Math.sin(angle) * 31] as [number, number, number],
      scale: [8 + i % 3, 5 + i % 2, 7] as [number, number, number],
      color: `#${palette[i % 2]}`,
    };
  });
}

function DistantHills({quality, atmosphere}: {quality: Quality; atmosphere: AtmospherePreset}) {
  const ref = useRef<InstancedMesh>(null);
  const hills = useMemo(() => distantHillLayout(atmosphere), [atmosphere]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D(), color = new Color();
    hills.forEach((hill, i) => {
      dummy.position.set(...hill.position);
      dummy.scale.set(...hill.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(hill.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [hills]);
  return <instancedMesh ref={ref} args={[undefined, undefined, 14]} name='cozy-distant-hills'>
    <sphereGeometry args={quality === 'low' ? [1, 10, 6] : [1, 20, 12]}/>
    <meshStandardMaterial roughness={1}/>
  </instancedMesh>;
}

const TREE_POSITIONS: Array<[number, number, number, number]> = [
  [-13, -6.4, 1.2, 0.9], [-11.3, -7.6, 0.95, 1.5], [-8.9, -8.3, 1.1, 2.2],
  [9.1, -8.1, 1.05, 0.5], [11.7, -7.1, 1.2, 1.8], [11.7, -2.2, 0.9, 2.7],
  [-13.2, 5.8, 1.15, 0.3], [-11.7, 9.7, 1, 2.4], [11.8, 9.5, 1.15, 1.1],
  [13.4, 6.4, 1, 2.9], [-15.6, 11.8, 0.9, 0.7], [16, 11.6, 1.05, 2.1],
];

const FLOWERS: Array<[number, number, string]> = [
  [-7.7, 4.8, '#f49c9c'], [-7.2, 5.2, '#f6c86b'], [-6.8, 4.6, '#a9a4ea'],
  [6.7, 6.4, '#f49c9c'], [7.3, 6.1, '#f6c86b'], [7.7, 6.7, '#f5efff'],
  [-9.2, -1.7, '#f5efff'], [-8.7, -1.2, '#a9a4ea'], [9.1, 1.7, '#f49c9c'],
  [8.6, 2.2, '#f6c86b'], [-6.9, -4.8, '#a9a4ea'], [7.1, -5.1, '#f49c9c'],
];


function Flower({x, z, color}: {x: number; z: number; color: string}) {
  return <group position={[x, 0, z]}>
    <mesh position-y={.22} castShadow>
      <cylinderGeometry args={[.025, .035, .44, 6]}/>
      <meshStandardMaterial color='#588a55'/>
    </mesh>
    {[0, 1, 2, 3, 4].map(i => <mesh key={i} position={[Math.cos(i * 1.256) * .1, .48, Math.sin(i * 1.256) * .1]} scale={[.11, .055, .11]}>
      <sphereGeometry args={[1, 7, 5]}/>
      <meshStandardMaterial color={color}/>
    </mesh>)}
    <mesh position-y={.48} scale={.07}>
      <sphereGeometry args={[1, 8, 6]}/>
      <meshStandardMaterial color='#f8d96f'/>
    </mesh>
  </group>;
}

export default function CozyEnvironment({editing, quality, houseSettings,atmosphere='afternoon',hideHome=false}: {editing: boolean; quality: Quality; houseSettings?: HabitHouseSettings;atmosphere?:AtmospherePreset;hideHome?:boolean}) {
  const trees = useMemo(() => quality === 'low' ? TREE_POSITIONS.filter((_, i) => i % 2 === 0) : TREE_POSITIONS, [quality]);
  return <group>
    <StylizedMeadow quality={quality}/>
    <StylizedWater/>
    <CozyVillage houseSettings={houseSettings} night={atmosphere==='dusk'||atmosphere==='sunset'} quality={quality} hideHome={hideHome}/>
    {!hideHome&&[1.65,2.6,3.55].map((z,i)=><mesh key={z} position={[pathCenter(z),.018,z]} rotation-y={i*.41} scale={[1,.065,.73]} receiveShadow><cylinderGeometry args={[.56,.59,1,10]}/><meshStandardMaterial color={i%2?'#c1b9a1':'#d1c6ae'} roughness={1}/></mesh>)}
    {!hideHome&&trees.map(([x, z, scale, turn]) => <StylizedCanopy key={`${x}-${z}`} x={x} z={z} scale={scale} turn={turn} quality={quality}/>)}
    {!hideHome&&quality === 'high' && FLOWERS.map(([x, z, color], i) => <Flower key={i} x={x} z={z} color={color}/>)}

    {/* One draw call, no shadow pass or frame work for the horizon. */}
    <DistantHills quality={quality} atmosphere={atmosphere}/>

    {editing && <gridHelper args={[28, 28, '#c99570', '#a8b88c']} position-y={.055}/>} 
  </group>;
}
