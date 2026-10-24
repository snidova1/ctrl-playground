'use client';

import {useLayoutEffect,useMemo,useRef} from 'react';
import {Color,CubicBezierCurve3,DoubleSide,InstancedMesh,Object3D,QuadraticBezierCurve3,Shape,Vector3} from 'three';
import {Box,Sign} from '@/features/plaza/mesh-kit';
import {mulberry32} from '@/features/worldgacha/ghibli-layout';

const POTS=[{x:-3.2,z:8.1,s:.88},{x:3.2,z:8.1,s:1},{x:-6.85,z:-1.2,s:1.1},{x:7,z:-2.1,s:.92}];
const LAMPS=[{x:-8.2,z:1.4},{x:8.2,z:1.4},{x:-5.1,z:-7.8},{x:5.1,z:-7.8}];
export const GARDEN_COLLIDERS=[...POTS.map(p=>({x:p.x,z:p.z,r:.42*p.s})),...LAMPS.map(p=>({...p,r:.16})),{x:-2.15,z:-6.3,r:.2},{x:2.15,z:-6.3,r:.2},{x:-7.5,z:3.9,r:.45}];
const BEDS=[{x:-4.8,z:3.3,rx:1.95,rz:1.08},{x:4.8,z:3.3,rx:1.95,rz:1.08},{x:-4.3,z:-.3,rx:1.42,rz:.78},{x:4.3,z:-.5,rx:1.42,rz:.78},{x:-7.6,z:-6,rx:1.7,rz:.87},{x:7.7,z:-6,rx:1.7,rz:.87}];
const BLOOMS=['#e88c9a','#e6b873','#a79bd3','#f7e4ac','#d77d8f','#94b9d2'];
type Part={x:number;y:number;z:number;sx:number;sy:number;sz:number;color:string;angle?:number};
function PaintedParts({parts,name}:{parts:Part[];name:string}){
 const ref=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const o=new Object3D(),c=new Color();parts.forEach((p,i)=>{o.position.set(p.x,p.y,p.z);o.scale.set(p.sx,p.sy,p.sz);o.rotation.set(0,p.angle??0,0);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);mesh.setColorAt(i,c.set(p.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();},[parts]);
 return <instancedMesh ref={ref} name={name} args={[undefined,undefined,parts.length]}><sphereGeometry args={[1,10,7]}/><meshStandardMaterial roughness={.94} emissive='#baa380' emissiveIntensity={.06}/></instancedMesh>;
}
function FlowerGarden(){
 const art=useMemo(()=>{
  const r=mulberry32(82641),petals:Part[]=[],centers:Part[]=[],leaves:Part[]=[],stones:Part[]=[];
  const plant=(x:number,z:number,h:number,c:string,size:number)=>{
   leaves.push({x,y:h*.45,z,sx:.029,sy:h*.46,sz:.029,color:'#517a51'});
   for(const side of [-1,1])leaves.push({x:x+side*.11,y:h*.4,z:z+.04,sx:.15,sy:.045,sz:.075,color:side===1?'#6e995e':'#85a966',angle:side*.6});
   for(let j=0;j<6;j++){const a=j/6*Math.PI*2;petals.push({x:x+Math.cos(a)*size*.68,y:h+(j%2)*.016,z:z+Math.sin(a)*size*.68,sx:size*.64,sy:size*.27,sz:size*.35,color:c,angle:-a});}
   centers.push({x,y:h+.033,z,sx:size*.33,sy:size*.26,sz:size*.33,color:'#d9aa54'});
  };
  BEDS.forEach((bed,b)=>{
   for(let i=0;i<38;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*.88;plant(bed.x+Math.cos(a)*d*bed.rx,bed.z+Math.sin(a)*d*bed.rz,.31+r()*.45,BLOOMS[(b+Math.floor(r()*3))%BLOOMS.length],.14+r()*.07);}
   const count=34;for(let i=0;i<count;i++){const a=i/count*Math.PI*2;stones.push({x:bed.x+Math.cos(a)*bed.rx,y:.085,z:bed.z+Math.sin(a)*bed.rz,sx:.18,sy:.09+r()*.025,sz:.12,color:i%3===0?'#d3bfa0':'#c6b99c',angle:a+Math.PI/2});}
  });
  POTS.forEach((pot,k)=>{for(let i=0;i<15;i++){const a=i*2.399,d=Math.sqrt(r())*.3*pot.s;plant(pot.x+Math.cos(a)*d,pot.z+Math.sin(a)*d,(.63+r()*.37)*pot.s,BLOOMS[(k+i%2)%BLOOMS.length],.16*pot.s);}});
  return {petals,centers,leaves,stones};
 },[]);
 return <group name='authored-colorful-flower-garden'>
  {BEDS.map((b,i)=><mesh key={i} position={[b.x,.012,b.z]} rotation-x={-Math.PI/2} scale={[b.rx,b.rz,1]}><circleGeometry args={[1,40]}/><meshStandardMaterial color='#817652' roughness={1}/></mesh>)}
  <PaintedParts parts={art.leaves} name='garden-stems-and-leaves'/><PaintedParts parts={art.petals} name='six-petal-cottage-flowers'/><PaintedParts parts={art.centers} name='golden-flower-centers'/><PaintedParts parts={art.stones} name='rounded-flowerbed-edging'/>
  {POTS.map((p,i)=><group key={i} position={[p.x,0,p.z]} scale={p.s} name='terracotta-flower-pot'>
   <mesh position-y={.25}><cylinderGeometry args={[.39,.26,.5,24]}/><meshStandardMaterial color={i%2?'#bd805f':'#cf9777'} roughness={1}/></mesh>
   <mesh position-y={.48} rotation-x={Math.PI/2}><torusGeometry args={[.365,.048,8,24]}/><meshStandardMaterial color='#e0ac83' roughness={1}/></mesh>
   <mesh position-y={.48} rotation-x={-Math.PI/2}><circleGeometry args={[.35,24]}/><meshStandardMaterial color='#665b45' roughness={1}/></mesh>
   <mesh position-y={.28} rotation-x={Math.PI/2}><torusGeometry args={[.328,.014,6,24]}/><meshStandardMaterial color='#e4b88f'/></mesh>
  </group>)}
 </group>;
}
function RoseArch(){
 const curve=useMemo(()=>new CubicBezierCurve3(new Vector3(-2.15,2.25,-6.3),new Vector3(-2.15,4.4,-6.3),new Vector3(2.15,4.4,-6.3),new Vector3(2.15,2.25,-6.3)),[]);
 const ivy=useMemo(()=>{
  const parts:Part[]=[];
  for(let i=0;i<42;i++){const p=curve.getPoint(i/41);parts.push({x:p.x,y:p.y+.04,z:p.z,sx:.19,sy:.16,sz:.3,color:i%2?'#688959':'#8daa6c',angle:i*.7});}
  for(const x of [-2.15,2.15])for(let i=0;i<13;i++)parts.push({x:x+Math.sin(i*.9)*.11,y:.3+i*.16,z:-6.3,sx:.17,sy:.17,sz:.23,color:i%2?'#78975e':'#9bb578'});
  return parts;
 },[curve]);
 const roses=useMemo(()=>Array.from({length:16},(_,i)=>{const p=curve.getPoint((i+.5)/16);return {x:p.x,y:p.y+.13,z:p.z+.22,sx:.14,sy:.11,sz:.13,color:i%3?'#dba0a9':'#f5dbc0'};}),[curve]);
 return <group name='open-rose-and-ivy-arch'>
  {[-2.15,2.15].map(x=><group key={x}><mesh position={[x,1.15,-6.3]}><cylinderGeometry args={[.105,.14,2.3,12]}/><meshStandardMaterial color='#a28664' roughness={1}/></mesh><mesh position={[x,.16,-6.3]}><cylinderGeometry args={[.24,.29,.32,16]}/><meshStandardMaterial color='#c7b595'/></mesh></group>)}
  <mesh><tubeGeometry args={[curve,40,.11,9,false]}/><meshStandardMaterial color='#a88b66' roughness={1}/></mesh>
  <PaintedParts parts={ivy} name='soft-arch-ivy'/><PaintedParts parts={roses} name='climbing-rose-clusters'/>
 </group>;
}
function Pennants(){
 const shape=useMemo(()=>{const s=new Shape();s.moveTo(-.16,0);s.lineTo(.16,0);s.lineTo(.035,-.39);s.closePath();return s;},[]);
 const strings=useMemo(()=>[-1,1].map(side=>new QuadraticBezierCurve3(new Vector3(side*2.25,3.18,-6.3),new Vector3(side*5.3,2.2,-5.4),new Vector3(side*8.7,2.9,-4.8))),[]);
 return <group name='pastel-garden-pennants'>{strings.map((curve,j)=><group key={j}>
  <mesh><tubeGeometry args={[curve,24,.012,5,false]}/><meshStandardMaterial color='#b5a384'/></mesh>
  {Array.from({length:11},(_,i)=>{const p=curve.getPoint((i+.5)/11);return <mesh key={i} position={[p.x,p.y,p.z]} rotation={[.04*Math.sin(i),j===0?-.1:.1,.07*Math.sin(i*2)]}><shapeGeometry args={[shape]}/><meshStandardMaterial side={DoubleSide} color={['#d89188','#e3c99c','#97af9a','#b2a4c8'][i%4]} roughness={1}/></mesh>;})}
 </group>)}</group>;
}
function Lanterns({night}:{night:boolean}){
 return <group name='warm-garden-lanterns'>{LAMPS.map((p,i)=><group key={i} position={[p.x,0,p.z]}>
  <mesh position-y={1.05}><cylinderGeometry args={[.055,.085,2.1,10]}/><meshStandardMaterial color='#687967' roughness={1}/></mesh>
  <mesh position-y={.12}><cylinderGeometry args={[.19,.24,.24,12]}/><meshStandardMaterial color='#b2a48b'/></mesh>
  <Box position={[0,2.03,0]} size={[.38,.08,.38]} color='#7b8367'/>
  <mesh position-y={2.28}><boxGeometry args={[.29,.43,.29]}/><meshStandardMaterial color='#ffdf9c' emissive='#ffd18b' emissiveIntensity={night?1.1:.35} roughness={.6}/></mesh>
  {[-1,1].flatMap(x=>[-1,1].map(z=><Box key={`${x}:${z}`} position={[x*.16,2.28,z*.16]} size={[.035,.48,.035]} color='#7b8367'/>))}
  <mesh position-y={2.59} rotation-y={Math.PI/4}><coneGeometry args={[.34,.22,4]}/><meshStandardMaterial color='#7b8367' roughness={1}/></mesh>
  <mesh position-y={2.74}><sphereGeometry args={[.055,10,6]}/><meshStandardMaterial color='#b7a277'/></mesh>
 </group>)}</group>;
}
function FountainMosaic(){
 const tiles=useMemo(()=>Array.from({length:40},(_,i)=>{const a=i/40*Math.PI*2;return {x:Math.cos(a)*1.75,y:.032,z:Math.sin(a)*1.75,sx:.13,sy:.035,sz:.16,angle:-a,color:['#ccaa8e','#b7c4b2','#dcd2b7','#b2b8c4'][i%4]};}),[]);
 return <group name='fountain-mosaic-apron'>
  <mesh rotation-x={-Math.PI/2} position-y={.008}><ringGeometry args={[1.52,1.95,64]}/><meshStandardMaterial color='#cbbb9b' roughness={1}/></mesh>
  <PaintedParts parts={tiles} name='hand-set-pastel-mosaic'/>
 </group>;
}
function GardenSign(){
 return <group position={[-7.5,0,3.9]} rotation-y={.2} name='little-garden-welcome-board'>
  <Box position={[0,.55,0]} size={[.13,1.1,.13]} color='#9a7d5e'/>
  <Box position={[0,1.14,0]} size={[1.55,.91,.12]} color='#ad8d68'/>
  <Box position={[0,1.14,.07]} size={[1.36,.72,.03]} color='#677f68'/>
  <Sign text='STAY A LITTLE' position={[0,1.3,.1]} width={1.22} height={.2} size={68} color='#fff0cb'/>
  <Sign text='grow at your own pace' position={[0,1.02,.1]} width={1.2} height={.16} size={60} color='#e3dabc'/>
 </group>;
}
function SteppingStones(){
 const parts=useMemo(()=>Array.from({length:14},(_,i)=>{const z=10.3-i*.52,x=Math.sin(i*.65)*.16;return {x,y:.018,z,sx:.32+(i%3)*.035,sy:.025,sz:.2,color:i%2?'#cec3a7':'#dbcfb1',angle:(i%3-1)*.25};}),[]);
 return <PaintedParts name='garden-path-stepping-stones' parts={parts}/>;
}
export default function GardenDecor({night}:{night:boolean}){
 return <group name='common-ground-decorative-garden'><FlowerGarden/><RoseArch/><Pennants/><Lanterns night={night}/><FountainMosaic/><GardenSign/><SteppingStones/></group>;
}
