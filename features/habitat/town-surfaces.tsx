'use client';
import {TOWN_PALETTE as P} from './town-palette';
import {useLayoutEffect,useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {CanvasTexture,Group,InstancedMesh,Object3D,RepeatWrapping,SRGBColorSpace} from 'three';
import type {Pose} from '@/features/plaza/types';
import {townSurfaceHeight as townGroundHeight} from '@/domain/town-walk-surface';

/** Original small painted textures, generated locally. No external game art. */
const textures=new Map<string,CanvasTexture>();
export function paintedTexture(kind:'stone'|'grass'|'shadow'|'roof'|'wood'|'floorboards'|'plaster'|'glass'|'foliage'){
 const existing=textures.get(kind);if(existing)return existing;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d')!;
 if(kind==='shadow'){
  const gradient=ctx.createRadialGradient(128,128,3,128,128,125);
  gradient.addColorStop(0,'rgba(28,52,38,.3)');gradient.addColorStop(.4,'rgba(28,52,38,.19)');gradient.addColorStop(1,'rgba(28,52,38,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
 }else if(kind==='foliage'){
  // An original leaf spray with a transparent silhouette, for cutout foliage.
  // Opaque alpha-tested cards keep sorting and mobile overdraw predictable.
  ctx.strokeStyle='#a0b38c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(128,220);ctx.lineTo(128,42);ctx.stroke();
  for(let i=0;i<11;i++){
   const angle=i*2.399,rad=22+(i%4)*13;
   const x=128+Math.cos(angle)*rad,y=120+Math.sin(angle)*rad;
   ctx.save();ctx.translate(x,y);ctx.rotate(angle+.4);
   ctx.fillStyle=['#e3e8d4','#c4d3ae','#f2efd9'][i%3];
   ctx.beginPath();ctx.moveTo(-40,0);ctx.bezierCurveTo(-16,-25,18,-25,43,0);ctx.bezierCurveTo(18,25,-16,25,-40,0);ctx.fill();
   ctx.strokeStyle='#748f6740';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-33,0);ctx.lineTo(35,0);ctx.stroke();ctx.restore();
  }
 }else if(kind==='glass'){
  const glass=ctx.createLinearGradient(0,0,0,256);
  glass.addColorStop(0,'#719493');glass.addColorStop(.45,'#526f69');glass.addColorStop(.52,'#9eac9a');glass.addColorStop(1,'#cfb586');
  ctx.fillStyle=glass;ctx.fillRect(0,0,256,256);
  ctx.fillStyle='#e9dec822';ctx.beginPath();ctx.moveTo(22,0);ctx.lineTo(70,0);ctx.lineTo(230,256);ctx.lineTo(182,256);ctx.fill();
 }else if(kind==='plaster'){
  // Neutral pigment multiplies the approved facade colour, not a new palette.
  const wash=ctx.createLinearGradient(0,0,0,256);
  wash.addColorStop(0,'#ddd6c9');wash.addColorStop(.18,'#fffdf6');
  wash.addColorStop(.72,'#faf7ee');wash.addColorStop(1,'#d5cab7');
  ctx.fillStyle=wash;ctx.fillRect(0,0,256,256);
  for(let i=0;i<1800;i++){
   const hash=(n:number)=>{const v=Math.sin(i*127.1+n*311.7)*43758.5453;return v-Math.floor(v);};
   ctx.fillStyle=i%2?'#ffffff18':'#8873520b';ctx.fillRect(hash(1)*256,hash(2)*256,1,1);
  }
 }else if(kind==='floorboards'){
  const boards=['#e8cfaa','#dfc29b','#e6caa3','#d4b891'];
  for(let row=0;row<8;row++){
   ctx.fillStyle=boards[row%boards.length];ctx.fillRect(0,row*32,256,32);
   ctx.strokeStyle='#9c775144';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,row*32+.5);ctx.lineTo(256,row*32+.5);ctx.stroke();
   for(let line=0;line<5;line++){
    ctx.strokeStyle='#8b693419';ctx.beginPath();
    for(let x=0;x<=256;x+=8){const y=row*32+4+line*5+Math.sin(x*.045+row+line)*1.2;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.stroke();
   }
   const joint=row%2?128:0;ctx.strokeStyle='#9c775144';ctx.beginPath();ctx.moveTo(joint,row*32);ctx.lineTo(joint,(row+1)*32);ctx.stroke();
  }
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
  // Ground already carries its own geographic green vertex pigment. A second
  // full-strength green map was multiplying it into a dark, flat olive field.
  ctx.fillStyle=kind==='stone'?P.terracotta:'#e4e7db';ctx.fillRect(0,0,256,256);
  if(kind==='stone')for(let y=-1;y<13;y++)for(let x=-1;x<9;x++){
   const seed=Math.abs(Math.sin(x*14.1+y*27.7));
   ctx.fillStyle=P.pavers[Math.floor(seed*4)];
   const tx=x*32+(y%2)*16,ty=y*256/12;
   ctx.beginPath();ctx.roundRect(tx+.65,ty+.65,30.7,256/12-1.3,1.2);ctx.fill();
   ctx.strokeStyle='#efdbc344';ctx.lineWidth=.65;ctx.stroke();
   ctx.strokeStyle='#76513a22';ctx.beginPath();ctx.moveTo(tx+1,ty+256/12-1);ctx.lineTo(tx+31,ty+256/12-1);ctx.stroke();
  }
  for(let i=0;i<800;i++){
   const hash=(seed:number)=>{const n=Math.sin(i*127.1+seed*311.7)*43758.5453;return n-Math.floor(n);};
   const x=hash(1)*256,y=hash(2)*256;
   ctx.fillStyle=kind==='grass'?(i%2?'#3c504920':'#69836c30'):'#665c4812';
   ctx.fillRect(x,y,kind==='grass'?2:1,kind==='grass'?5:1);
  }
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
 if(kind!=='shadow'){texture.wrapS=texture.wrapT=RepeatWrapping;texture.repeat.set(kind==='grass'?20:kind==='roof'?3:1,kind==='grass'?20:kind==='roof'?3:1);texture.anisotropy=4;}
 textures.set(kind,texture);return texture;
}
export function GroundShadow({x=0,z=0,width=2,depth=2}:{x?:number;z?:number;width?:number;depth?:number}){
 const texture=useMemo(()=>paintedTexture('shadow'),[]);
 return <mesh position={[x,.032,z]} rotation-x={-Math.PI/2} renderOrder={1}><planeGeometry args={[width,depth]}/><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1}/></mesh>;
}
/** Soft contact grounding in light mode, batched across existing tree centers. */
export function TreeContactShadows({trees}:{trees:ReadonlyArray<{x:number;z:number;y?:number;size:number}>}){
 const mesh=useRef<InstancedMesh>(null),texture=useMemo(()=>paintedTexture('shadow'),[]);
 useLayoutEffect(()=>{
  if(!mesh.current)return;const transform=new Object3D();
  trees.forEach((tree,i)=>{
   transform.position.set(tree.x,(tree.y??0)+.036,tree.z);transform.rotation.x=-Math.PI/2;
   transform.scale.set(tree.size*.95,tree.size*.78,1);transform.updateMatrix();mesh.current!.setMatrixAt(i,transform.matrix);
  });
  mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();
 },[trees]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,trees.length]} renderOrder={1}>
  <planeGeometry args={[1,1]}/><meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1}/>
 </instancedMesh>;
}
export function TownFootShadow({pose}:{pose:MutableRefObject<Pose>}){
 const root=useRef<Group>(null);
 useFrame(()=>{if(root.current){root.current.position.set(pose.current.x,townGroundHeight(pose.current.x,pose.current.z),pose.current.z);}});
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
   <mesh position-y={1.53}><boxGeometry args={[.025,1.12,1.25]}/><meshStandardMaterial map={paintedTexture('glass')} roughness={.26} metalness={.08} emissive='#cfb586' emissiveIntensity={.045}/></mesh>
   <mesh position-y={1.53}><boxGeometry args={[.06,1.2,.065]}/><meshStandardMaterial color='#fcf1d8'/></mesh>
   <mesh position-y={1.53}><boxGeometry args={[.06,.065,1.3]}/><meshStandardMaterial color='#fcf1d8'/></mesh>
   <mesh position-y={.88}><boxGeometry args={[.24,.12,1.45]}/><meshStandardMaterial color={P.shutter}/></mesh>
  </group>)}
  {[-.92,.92].map(z=><mesh key={z} position={[0,1.2,z]}><boxGeometry args={[.23,2.4,.12]}/><meshStandardMaterial color='#f9eace'/></mesh>)}
 </group>;
}
