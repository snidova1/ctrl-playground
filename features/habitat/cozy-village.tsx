'use client';
import {Suspense,useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {Material,Mesh,MeshStandardMaterial} from 'three';
import {DEFAULT_HOUSE_SETTINGS,type HabitHouseSettings} from './habit-home';

const BASE='/assets/fantasy-town/';
const HOUSE_POSITION:[number,number,number]=[0,0,-3];

type Tint={color:string;preserveMap?:boolean;skipMeshes?:readonly string[]};

function tintMaterial(material:Material|Material[],tint:Tint){
 const apply=(source:Material)=>{
  const next=source.clone() as MeshStandardMaterial;
  if(next.color)next.color.set(tint.color);
  if(tint.preserveMap===false){next.map=null;next.needsUpdate=true;}
  return next;
 };
 return Array.isArray(material)?material.map(apply):apply(material);
}

/** Kenney Fantasy Town Kit 2.0, CC0. Source and license ship with the assets. */
function Model({name,position=[0,0,0],rotation=0,scale=1,tint}:{name:string;position?:[number,number,number];rotation?:number;scale?:number|[number,number,number];tint?:Tint}){
 const {scene}=useGLTF(`${BASE}${name}.glb`);
 const instance=useMemo(()=>{const c=clone(scene);c.traverse(o=>{if((o as Mesh).isMesh){const mesh=o as Mesh;mesh.castShadow=true;mesh.receiveShadow=true;if(tint&&!tint.skipMeshes?.includes(mesh.name))mesh.material=tintMaterial(mesh.material as Material|Material[],tint);}});return c;},[scene,tint?.color,tint?.preserveMap,tint?.skipMeshes]);
 return <group position={position} rotation-y={rotation} scale={scale}><primitive object={instance}/></group>;
}

function House({settings}:{settings:HabitHouseSettings}){
 const wall=settings.timber?'wall-wood':'wall';
 const window=settings.timber?'wall-wood-window-shutters':'wall-window-shutters';
 const wallTint:Tint={color:settings.wallColor,preserveMap:false};
 const detailWallTint:Tint={color:settings.wallColor,preserveMap:true};
 const doorWallTint:Tint={color:settings.wallColor,preserveMap:false,skipMeshes:['door']};
 const roofTint:Tint={color:settings.roofColor,preserveMap:false};
 return <group position={HOUSE_POSITION} rotation-y={0}>
  <mesh position-y={.08} receiveShadow><boxGeometry args={[6.65,.16,4.55]}/><meshStandardMaterial color='#c3b79c'/></mesh>
  <group scale={2.2}>
   {[-1,0,1].map(i=><Model key={`front-${i}`} name={i===0?'wall-door':window} position={[i,0,.5]} rotation={-Math.PI/2} tint={i===0?doorWallTint:detailWallTint}/>)}
   {[-1,0,1].map(i=><Model key={`back-${i}`} name={i===0?wall:window} position={[i,0,-.5]} rotation={Math.PI/2} tint={i===0?wallTint:detailWallTint}/>)}
   {[-.5,.5].map(i=><group key={`side-${i}`}><Model name={window} position={[1,0,i]} tint={detailWallTint}/><Model name={wall} position={[-1,0,i]} rotation={Math.PI} tint={wallTint}/></group>)}
   <Model name={settings.tall?'roof-high-gable':'roof-gable'} position={[0,1,0]} scale={[3.08,1,2.05]} tint={roofTint}/>
   <Model name='chimney' position={[.75,1.28,-.3]} scale={.65}/>
  </group>
  <Model name='stairs-wood' position={[0,0,2.25]} rotation={Math.PI/2} scale={1.2}/>
  <Model name='lantern' position={[-1.1,.1,2.45]} scale={2}/>
  {[-2.5,2.5].map((px,i)=><group key={px} position={[px,0,2.65]}><mesh position-y={.2} castShadow><cylinderGeometry args={[.25,.19,.4,9]}/><meshStandardMaterial color='#bd805f'/></mesh><mesh position-y={.55}><sphereGeometry args={[.35,9,6]}/><meshStandardMaterial color={i?'#9fc776':'#7da673'}/></mesh></group>)}
 </group>;
}

function Path(){return <mesh rotation={[-Math.PI/2,0,0]} position={[0,.035,5.1]} receiveShadow>
 <planeGeometry args={[1.65,11.8]}/><meshStandardMaterial color='#e6d4ad' roughness={1}/>
</mesh>;}

function marker(settings:HabitHouseSettings){return `${settings.timber?'timber':'plain'}|${settings.tall?'tall':'gable'}|${settings.roofColor}|${settings.wallColor}`;}
function Ready({settings}:{settings:HabitHouseSettings}){const value=useMemo(()=>marker(settings),[settings]);useEffect(()=>{document.documentElement.dataset.ctrlVillageReady='true';document.documentElement.dataset.ctrlHouseCount='1';document.documentElement.dataset.ctrlHouseSettings=value;return()=>{delete document.documentElement.dataset.ctrlVillageReady;delete document.documentElement.dataset.ctrlHouseCount;delete document.documentElement.dataset.ctrlHouseSettings;};},[value]);return null;}

export default function CozyVillage({houseSettings}: {houseSettings?: HabitHouseSettings}){
 const settings={...DEFAULT_HOUSE_SETTINGS,...houseSettings};
 return <Suspense fallback={null}>
  <Ready settings={settings}/>
  <House settings={settings}/>
  <Path/>
 </Suspense>;
}
