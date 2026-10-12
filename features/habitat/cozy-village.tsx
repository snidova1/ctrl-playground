'use client';
import {Suspense,useMemo,useEffect} from 'react';
import {useGLTF} from '@react-three/drei';
import {CanvasTexture} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {Mesh} from 'three';

const BASE='/assets/fantasy-town/';
/** Kenney Fantasy Town Kit 2.0, CC0. Source and license ship with the assets. */
function Model({name,position=[0,0,0],rotation=0,scale=1}:{name:string;position?:[number,number,number];rotation?:number;scale?:number|[number,number,number]}){
 const {scene}=useGLTF(`${BASE}${name}.glb`);
 const instance=useMemo(()=>{const c=clone(scene);c.traverse(o=>{if((o as Mesh).isMesh){o.castShadow=true;o.receiveShadow=true;}});return c;},[scene]);
 return <group position={position} rotation-y={rotation} scale={scale}><primitive object={instance}/></group>;
}
function LocalLabel({text}:{text:string}){
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=128;const c=canvas.getContext('2d')!;c.fillStyle='#6b4b37';c.fillRect(0,0,640,128);c.fillStyle='#fff3cf';c.font='bold 46px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,320,64,610);return new CanvasTexture(canvas);},[text]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position-z={.105}><planeGeometry args={[2.25,.46]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
}
function Sign({label}:{label:string}){return <group position={[0,2.18,2.35]}>
 <mesh castShadow><boxGeometry args={[2.3,.5,.16]}/><meshStandardMaterial color='#6b4b37'/></mesh>
 <LocalLabel text={label}/>
</group>;}
export const VILLAGE_HOMES=[
 {x:-8,z:-4,rotation:0,label:'Fern Cottage',timber:false,tall:false},
 {x:8,z:-4,rotation:0,label:'Willow Cottage',timber:true,tall:true},
 {x:-8,z:5,rotation:Math.PI,label:'CTRL Workshop',timber:true,tall:false},
 {x:8,z:5,rotation:Math.PI,label:'Maple Cottage',timber:false,tall:true},
 {x:0,z:-8,rotation:0,label:'Village Hall',timber:false,tall:true},
] as const;
function House({x,z,rotation,label,timber,tall}:{x:number;z:number;rotation:number;label:string;timber:boolean;tall:boolean}){
 const wall=timber?'wall-wood':'wall';const window=timber?'wall-wood-window-shutters':'wall-window-shutters';
 return <group position={[x,0,z]} rotation-y={rotation}>
  <mesh position-y={.08} receiveShadow><boxGeometry args={[6.65,.16,4.55]}/><meshStandardMaterial color='#c3b79c'/></mesh>
  <group scale={2.2}>
   {[-1,0,1].map(i=><Model key={`front-${i}`} name={i===0?'wall-door':window} position={[i,0,.5]} rotation={-Math.PI/2}/>)}
   {[-1,0,1].map(i=><Model key={`back-${i}`} name={i===0?wall:window} position={[i,0,-.5]} rotation={Math.PI/2}/>)}
   {[-.5,.5].map(i=><group key={`side-${i}`}><Model name={window} position={[1,0,i]}/><Model name={wall} position={[-1,0,i]} rotation={Math.PI}/></group>)}
   <Model name={tall?'roof-high-gable':'roof-gable'} position={[0,1,0]} scale={[3.08,1,2.05]}/>
   <Model name='chimney' position={[.75,1.28,-.3]} scale={.65}/>
  </group>
  <Model name='stairs-wood' position={[0,0,2.25]} rotation={Math.PI/2} scale={1.2}/>
  <Model name='lantern' position={[-1.1,.1,2.45]} scale={2}/>
  {label==='CTRL Workshop'&&<Sign label='CTRL WORKSHOP'/>}
  {[-2.5,2.5].map((px,i)=><group key={px} position={[px,0,2.65]}><mesh position-y={.2} castShadow><cylinderGeometry args={[.25,.19,.4,9]}/><meshStandardMaterial color='#bd805f'/></mesh><mesh position-y={.55}><sphereGeometry args={[.35,9,6]}/><meshStandardMaterial color={i?'#9fc776':'#7da673'}/></mesh></group>)}
 </group>;
}
function Path({from,to}:{from:[number,number];to:[number,number]}){
 const dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz);
 return <mesh rotation={[-Math.PI/2,0,-Math.atan2(dx,dz)]} position={[(from[0]+to[0])/2,.035,(from[1]+to[1])/2]} receiveShadow>
  <planeGeometry args={[1.65,length]}/><meshStandardMaterial color='#e6d4ad' roughness={1}/>
 </mesh>;
}
function Market(){return <group position={[3.2,0,-.1]}>
 <Model name='stall-red' position={[0,0,0]} rotation={Math.PI/2} scale={2.8}/>
 <Model name='stall-green' position={[0,0,-2.15]} rotation={Math.PI/2} scale={2.8}/>
 <Model name='cart' position={[2.2,0,-.7]} scale={1.6}/>
 <group position={[0,2.25,1.5]}><mesh castShadow><boxGeometry args={[2.3,.5,.16]}/><meshStandardMaterial color='#866548'/></mesh><LocalLabel text='LITTLE MARKET'/></group>
</group>;}
function Ready(){useEffect(()=>{document.documentElement.dataset.ctrlVillageReady="true";return()=>{delete document.documentElement.dataset.ctrlVillageReady;};},[]);return null;}
export default function CozyVillage(){return <Suspense fallback={null}>
 <Ready/>
 {VILLAGE_HOMES.map(h=><House key={h.label} {...h}/>)}
 <Path from={[0,11]} to={[0,-5.6]}/>
 <Path from={[-8,-1.4]} to={[8,-1.4]}/>
 <Path from={[-8,2.4]} to={[8,2.4]}/>
 <Market/>
 {[-12,12].map(x=>[-6,-3,0,3,6].map(z=><Model key={`${x}-${z}`} name='fence' position={[x,0,z]} scale={2.4}/>))}
 {[-4,4].map(x=><Model key={x} name='lantern' position={[x,0,1.5]} scale={2.8}/>)}
 <group position={[-3.7,0,-.5]}><mesh position-y={.33} castShadow><boxGeometry args={[2,.2,.65]}/><meshStandardMaterial color='#ae7b52'/></mesh>{[-.75,.75].map(x=><mesh key={x} position={[x,.17,0]}><boxGeometry args={[.15,.35,.5]}/><meshStandardMaterial color='#785542'/></mesh>)}</group>
</Suspense>;}
