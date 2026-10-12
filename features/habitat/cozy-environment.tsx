'use client';

import {useMemo} from 'react';
import CozyVillage from './cozy-village';
import type {HabitHouseSettings} from './habit-home';

type Quality = 'low' | 'high';

const TREE_POSITIONS: Array<[number, number, number, number]> = [
  [-13, -6.4, 1.2, 0.9], [-11.3, -7.6, 0.95, 1.5], [-8.9, -8.3, 1.1, 2.2],
  [9.1, -8.1, 1.05, 0.5], [11.7, -7.1, 1.2, 1.8], [13.2, -4.8, 0.9, 2.7],
  [-13.2, 5.8, 1.15, 0.3], [-11.7, 9.7, 1, 2.4], [11.8, 9.5, 1.15, 1.1],
  [13.4, 6.4, 1, 2.9], [-7.2, 11.3, 0.9, 0.7], [7.1, 11.5, 1.05, 2.1],
];

const FLOWERS: Array<[number, number, string]> = [
  [-7.7, 4.8, '#f49c9c'], [-7.2, 5.2, '#f6c86b'], [-6.8, 4.6, '#a9a4ea'],
  [6.7, 6.4, '#f49c9c'], [7.3, 6.1, '#f6c86b'], [7.7, 6.7, '#f5efff'],
  [-9.2, -1.7, '#f5efff'], [-8.7, -1.2, '#a9a4ea'], [9.1, 1.7, '#f49c9c'],
  [8.6, 2.2, '#f6c86b'], [-2.8, -5.8, '#a9a4ea'], [3.1, -6.1, '#f49c9c'],
];

function SoftTree({x, z, scale, turn}: {x: number; z: number; scale: number; turn: number}) {
  return <group position={[x, 0, z]} scale={scale} rotation-y={turn}>
    <mesh castShadow position-y={1.25}>
      <cylinderGeometry args={[.23, .34, 2.5, 9]}/>
      <meshStandardMaterial color='#9a6548' roughness={1}/>
    </mesh>
    <mesh castShadow position={[-.36, 2.7, .02]} scale={[1.05, .9, 1]}>
      <dodecahedronGeometry args={[1.05, 1]}/>
      <meshStandardMaterial color='#7fb773' roughness={.95}/>
    </mesh>
    <mesh castShadow position={[.45, 2.75, .05]} scale={[.95, 1.05, .9]}>
      <dodecahedronGeometry args={[1, 1]}/>
      <meshStandardMaterial color='#91c780' roughness={.95}/>
    </mesh>
    <mesh castShadow position={[.06, 3.45, -.05]} scale={[1.05, .9, 1]}>
      <dodecahedronGeometry args={[.95, 1]}/>
      <meshStandardMaterial color='#a6d28e' roughness={.95}/>
    </mesh>
  </group>;
}

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

export default function CozyEnvironment({editing, quality, houseSettings}: {editing: boolean; quality: Quality; houseSettings?: HabitHouseSettings}) {
  const trees = useMemo(() => quality === 'low' ? TREE_POSITIONS.filter((_, i) => i % 2 === 0) : TREE_POSITIONS, [quality]);
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow position-y={-.02}>
      <planeGeometry args={[42, 36, 1, 1]}/>
      <meshStandardMaterial color='#a9cf86' roughness={1}/>
    </mesh>
    <mesh position={[0, -.3, 2]} receiveShadow>
      <boxGeometry args={[32, .6, 24]}/>
      <meshStandardMaterial color='#86aa6f' roughness={1}/>
    </mesh>

    {/* Soft central clearing and curved stepping path. */}
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, 2]} receiveShadow scale={[1.35, 1, 1]}>
      <circleGeometry args={[6.5, 48]}/>
      <meshStandardMaterial color='#dfe5b8' roughness={1}/>
    </mesh>
    {Array.from({length: 12}, (_, i) => {
      const z = 12.2 - i * 1.72;
      const x = Math.sin(i * .48) * 1.15;
      return <mesh key={i} rotation-x={-Math.PI / 2} position={[x, .026, z]} receiveShadow scale={[1.2, .72, 1]}>
        <circleGeometry args={[.75, 20]}/>
        <meshStandardMaterial color={i % 2 ? '#f1dfbc' : '#ead4ad'} roughness={1}/>
      </mesh>;
    })}

    {/* Pond and stone rim. */}
    <mesh rotation-x={-Math.PI / 2} position={[15.8, .035, -3.65]} scale={[1.55, 1, 1]}>
      <circleGeometry args={[2.25, 48]}/>
      <meshPhysicalMaterial color='#78c8cf' roughness={.18} metalness={0} transmission={quality === 'high' ? .16 : 0} transparent opacity={.9}/>
    </mesh>
    {Array.from({length: 16}, (_, i) => {
      const a = i / 16 * Math.PI * 2;
      return <mesh key={i} castShadow receiveShadow position={[15.8 + Math.cos(a) * 3.45, .08, -3.65 + Math.sin(a) * 2.3]} rotation-y={-a} scale={[.7 + (i % 3) * .08, .22, .42]}>
        <dodecahedronGeometry args={[.62, 0]}/>
        <meshStandardMaterial color={i % 2 ? '#d7d0ae' : '#c8c7a5'} roughness={1}/>
      </mesh>;
    })}

    <CozyVillage houseSettings={houseSettings}/>
    {trees.map(([x, z, scale, turn]) => <SoftTree key={`${x}-${z}`} x={x} z={z} scale={scale} turn={turn}/>)}
    {quality === 'high' && FLOWERS.map(([x, z, color], i) => <Flower key={i} x={x} z={z} color={color}/>)}

    {/* Friendly terrain mounds hide the rectangular edge. */}
    {[[-16, 0, 2.2], [16, 0, 2.4], [-8, 14, 1.8], [8, 14, 2], [-8, -11, 2.2], [8, -11, 1.9]].map(([x, z, s], i) => <mesh key={i} position={[x, -.2, z]} scale={[s * 2.5, s * .5, s * 1.5]} receiveShadow>
      <sphereGeometry args={[1, 18, 10]}/>
      <meshStandardMaterial color={i % 2 ? '#91ba77' : '#9bc47e'} roughness={1}/>
    </mesh>)}

    {editing && <gridHelper args={[28, 28, '#c99570', '#a8b88c']} position-y={.055}/>} 
  </group>;
}
