'use client';
import {useLayoutEffect,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,Group,InstancedMesh,Matrix4} from 'three';
import {GroundShadow} from './town-surfaces';

const BEDS=[[-10,2,3.1],[10,2,3.1],[-5.8,7,1.5],[5.8,7,1.5],[-17,16,2.8],[17,16,2.8],[-7,24,2.5],[7,24,2.5]];
const FLOWERS=BEDS.flatMap(([x,z,r],b)=>Array.from({length:38},(_,i)=>{
 const angle=i*2.39996,radius=Math.sqrt((i+.5)/38)*r;
 return {x:x+Math.cos(angle)*radius,z:z+Math.sin(angle)*radius,y:.38+(i%5)*.08,color:['#ecb6ae','#f0d68d','#d1b6de','#f5eee0'][(i+b)%4]};
}));
/** Original instanced garden planting; decorative, never new walk blockers. */
export function TownGardens(){
 const leaves=useRef<InstancedMesh>(null),petals=useRef<InstancedMesh>(null),stems=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),color=new Color();
  FLOWERS.forEach((p,i)=>{
   matrix.makeScale(.016,p.y,.016);matrix.setPosition(p.x,p.y*.5,p.z);stems.current?.setMatrixAt(i,matrix);
   matrix.makeScale(.15,.045,.25);matrix.setPosition(p.x,.22,p.z);leaves.current?.setMatrixAt(i,matrix);
   for(let j=0;j<5;j++){
    const angle=j*Math.PI*2/5;
    matrix.makeScale(.12,.075,.12);matrix.setPosition(p.x+Math.sin(angle)*.11,p.y,p.z+Math.cos(angle)*.11);
    petals.current?.setMatrixAt(i*5+j,matrix);color.set(p.color);petals.current?.setColorAt(i*5+j,color);
   }
  });
  if(leaves.current)leaves.current.instanceMatrix.needsUpdate=true;
  if(stems.current)stems.current.instanceMatrix.needsUpdate=true;
  if(petals.current){petals.current.instanceMatrix.needsUpdate=true;petals.current.instanceColor!.needsUpdate=true;}
 },[]);
 return <group>
  {BEDS.map(([x,z,r])=><group key={`${x}:${z}`} position={[x,0,z]}>
   <mesh position-y={-.01}><cylinderGeometry args={[r+.25,r+.25,.08,32]}/><meshStandardMaterial color='#739e65'/></mesh>
   <mesh position-y={.01} rotation-x={-Math.PI/2}><torusGeometry args={[r+.2,.09,5,48]}/><meshStandardMaterial color='#e0dbc0'/></mesh>
   {Array.from({length:8},(_,i)=>{const angle=i*Math.PI/4;return <mesh key={i} position={[Math.cos(angle)*r*.8,.18,Math.sin(angle)*r*.8]} scale={[.6,.28,.6]}><sphereGeometry args={[1,10,6]}/><meshStandardMaterial color={i%2?'#8eb17c':'#779e71'}/></mesh>;})}
  </group>)}
  <instancedMesh ref={leaves} args={[undefined,undefined,FLOWERS.length]}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial color='#568856' roughness={1}/></instancedMesh>
  <instancedMesh ref={stems} args={[undefined,undefined,FLOWERS.length]}><cylinderGeometry args={[1,1,1,5]}/><meshStandardMaterial color='#568856' roughness={1}/></instancedMesh>
  <instancedMesh ref={petals} args={[undefined,undefined,FLOWERS.length*5]}><sphereGeometry args={[1,6,4]}/><meshStandardMaterial roughness={.85}/></instancedMesh>
  {[[-10,-1],[10,-1],[-17,15],[17,15]].map(([x,z],i)=><GardenTree key={i} x={x} z={z} pink={i===0}/>)}
  <Butterflies/>
  <group position={[0,14,-44]}>{[-20,-5,14,29].map((x,i)=><group key={x} position={[x,i%2,0]}>
   {[[-1,0,1.5],[1,.1,1.8],[0,.5,2]].map(([dx,dy,r],j)=><mesh key={j} position={[dx,dy,0]} scale={[2,.5,1]}><sphereGeometry args={[r,12,8]}/><meshBasicMaterial color='#f4f1dd' fog/></mesh>)}
  </group>)}</group>
 </group>;
}
function GardenTree({x,z,pink}:{x:number;z:number;pink:boolean}){
 return <group position={[x,0,z]}>
  <GroundShadow width={5} depth={5}/>
  <mesh position-y={1.5}><cylinderGeometry args={[.18,.31,3,9]}/><meshStandardMaterial color='#8c7257'/></mesh>
  {[[0,3.2,0,1.45],[-.85,2.85,.2,1.1],[.9,3.05,.3,1.1],[.1,3.9,-.15,1.05]].map(([dx,y,dz,r],i)=><mesh key={i} position={[dx,y,dz]} scale={[1,.83,1]}>
   <sphereGeometry args={[r,16,10]}/><meshStandardMaterial color={pink?['#d6a9b0','#e0b6bb','#cd9ea9','#e7c0bd'][i]:['#7da877','#8ab67f','#6d9b70','#98be87'][i]} roughness={1}/>
  </mesh>)}
 </group>;
}
function Butterflies(){
 const root=useRef<Group>(null);
 useFrame(({clock})=>{root.current?.children.forEach((child,i)=>{
  const t=clock.elapsedTime*.6+i*2;
  child.position.set((i%2?-10:10)+Math.sin(t)*1.8,1.1+Math.sin(t*1.7)*.35,2+Math.cos(t)*1.5);
  child.rotation.set(0,-t,Math.sin(t*12)*.25);
 });});
 return <group ref={root}>{[0,1,2,3].map(i=><group key={i}>{[-1,1].map(side=><mesh key={side} position-x={side*.075} rotation-z={side*.4}><sphereGeometry args={[.1,6,4]}/><meshStandardMaterial color={i%2?'#f1d487':'#d8c1de'}/></mesh>)}</group>)}</group>;
}
