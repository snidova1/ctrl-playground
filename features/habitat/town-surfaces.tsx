'use client';
import {TOWN_PALETTE as P} from './town-palette';
import {useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {CanvasTexture,Group,RepeatWrapping,SRGBColorSpace} from 'three';
import type {Pose} from '@/features/plaza/types';

/** Original small painted textures, generated locally. No external game art. */
const textures=new Map<string,CanvasTexture>();
export function paintedTexture(kind:'stone'|'grass'|'shadow'|'roof'|'wood'){
 const existing=textures.get(kind);if(existing)return existing;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d')!;
 if(kind==='shadow'){
  const gradient=ctx.createRadialGradient(128,128,3,128,128,125);
  gradient.addColorStop(0,'rgba(28,52,38,.3)');gradient.addColorStop(.4,'rgba(28,52,38,.19)');gradient.addColorStop(1,'rgba(28,52,38,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
 }else if(kind==='wood'){
  ctx.fillStyle='#f0e1ca';ctx.fillRect(0,0,256,256);
  ctx.strokeStyle='#82644033';ctx.lineWidth=1;
  for(let row=0;row<50;row++){
   ctx.beginPath();for(let x=0;x<=256;x+=8){const y=row*6+Math.sin(x*.045+row)*2;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  }
 }else if(kind==='roof'){
  ctx.fillStyle='#f0e7dd';ctx.fillRect(0,0,256,256);
  for(let row=0;row<8;row++)for(let col=-1;col<5;col++){
   const x=col*64+(row%2)*32,y=row*32;
   ctx.fillStyle=col%2?'#e0d2c4':'#ece0d1';ctx.beginPath();ctx.roundRect(x+2,y+2,60,33,8);ctx.fill();
   ctx.strokeStyle='#9a796657';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+2,y+30);ctx.lineTo(x+62,y+30);ctx.stroke();
  }
 }else{
  ctx.fillStyle=kind==='stone'?P.terracotta:P.grass;ctx.fillRect(0,0,256,256);
  if(kind==='stone')for(let y=-1;y<7;y++)for(let x=-1;x<5;x++){
   const seed=Math.abs(Math.sin(x*14.1+y*27.7));
   ctx.fillStyle=P.pavers[Math.floor(seed*4)];
   ctx.beginPath();ctx.roundRect(x*64+(y%2)*32+1,y*256/6+1,62,256/6-2,2);ctx.fill();
   ctx.strokeStyle='#ddcfb230';ctx.lineWidth=1;ctx.stroke();
  }
  for(let i=0;i<800;i++){
   const x=(i*73)%256,y=(i*137)%256;
   ctx.fillStyle=kind==='grass'?(i%2?'#3c504920':'#69836c30'):'#665c4812';
   ctx.fillRect(x,y,kind==='grass'?2:1,kind==='grass'?5:1);
  }
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
 if(kind!=='shadow'){texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(kind==='grass'?20:1,kind==='grass'?20:1);texture.anisotropy=4;}
 textures.set(kind,texture);return texture;
}
export function GroundShadow({x=0,z=0,width=2,depth=2}:{x?:number;z?:number;width?:number;depth?:number}){
 const texture=useMemo(()=>paintedTexture('shadow'),[]);
 return <mesh position={[x,.032,z]} rotation-x={-Math.PI/2} renderOrder={1}><planeGeometry args={[width,depth]}/><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1}/></mesh>;
}
export function TownFootShadow({pose}:{pose:MutableRefObject<Pose>}){
 const root=useRef<Group>(null);
 useFrame(()=>{if(root.current){root.current.position.x=pose.current.x;root.current.position.z=pose.current.z;}});
 return <group ref={root}><GroundShadow width={1.3} depth={1.0}/></group>;
}
/** Re-skin only immutable town kit pieces, keeping their original AABB/rotation. */
export function TownKitStructure({id}:{id:string}){
 if(id==='building-kit/roof-flat-center')return <group>
  <RoundedBox args={[2,.1,2]} position-y={.05} radius={.04} smoothness={2}><meshStandardMaterial color={P.sage} roughness={.88}/></RoundedBox>
  <mesh position={[0,-.07,.94]}><boxGeometry args={[2,.14,.12]}/><meshStandardMaterial color='#f6ead2'/></mesh>
  {[-.7,0,.7].map(x=><mesh key={x} position={[x,-.09,0]}><boxGeometry args={[.09,.13,2]}/><meshStandardMaterial color={P.wood}/></mesh>)}
 </group>;
 return <group>
  <RoundedBox args={[.2,2.4,2]} position-y={1.2} radius={.03} smoothness={2}><meshStandardMaterial color={P.cream} roughness={1}/></RoundedBox>
  {[-1,1].map(side=><group key={side} position-x={side*.115}>
   <mesh position-y={1.53}><boxGeometry args={[.025,1.12,1.25]}/><meshStandardMaterial color={P.forest} roughness={.35}/></mesh>
   <mesh position-y={1.53}><boxGeometry args={[.06,1.2,.065]}/><meshStandardMaterial color='#fcf1d8'/></mesh>
   <mesh position-y={1.53}><boxGeometry args={[.06,.065,1.3]}/><meshStandardMaterial color='#fcf1d8'/></mesh>
   <mesh position-y={.88}><boxGeometry args={[.24,.12,1.45]}/><meshStandardMaterial color={P.shutter}/></mesh>
  </group>)}
  {[-.92,.92].map(z=><mesh key={z} position={[0,1.2,z]}><boxGeometry args={[.23,2.4,.12]}/><meshStandardMaterial color='#f9eace'/></mesh>)}
 </group>;
}
