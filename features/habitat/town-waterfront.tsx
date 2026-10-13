'use client';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {DoubleSide,Group,QuadraticBezierCurve3,Shape,Vector2,Vector3} from 'three';
import {GroundShadow,paintedTexture} from './town-surfaces';
import {TOWN_PALETTE as P} from './town-palette';

/** Original fountain profile stays inside the existing 2.25 m solid radius. */
export function TownFountain(){
 const basin=useMemo(()=>[[2,.02],[2.12,.12],[2.12,.58],[2.24,.72],[2.25,.86],[2.05,.92],[1.98,.79],[1.98,.65]].map(([x,y])=>new Vector2(x,y)),[]);
 const stem=useMemo(()=>[[.45,.8],[.5,.95],[.31,1.04],[.21,1.48],[.37,1.57],[.62,1.7],[.65,1.78]].map(([x,y])=>new Vector2(x,y)),[]);
 const jets=useMemo(()=>Array.from({length:6},(_,i)=>{
  const angle=i*Math.PI/3;
  return new QuadraticBezierCurve3(new Vector3(Math.cos(angle)*.48,1.78,Math.sin(angle)*.48),new Vector3(Math.cos(angle)*1.13,2.12,Math.sin(angle)*1.13),new Vector3(Math.cos(angle)*1.45,.84,Math.sin(angle)*1.45));
 }),[]);
 const drops=useRef<Group>(null);
 useFrame(({clock})=>{drops.current?.children.forEach((p,i)=>p.position.copy(jets[i].getPoint((clock.elapsedTime*.55+i/6)%1)));});
 return <group position={[0,0,-3]}>
  <GroundShadow width={5.8} depth={5.8}/>
  <mesh receiveShadow><latheGeometry args={[basin,48]}/><meshStandardMaterial color={P.pot} roughness={.86} side={DoubleSide}/></mesh>
  <mesh rotation-x={-Math.PI/2} position-y={.81}><circleGeometry args={[1.98,48]}/><meshStandardMaterial color={P.water} roughness={.24} metalness={.04}/></mesh>
  <mesh receiveShadow><latheGeometry args={[stem,32]}/><meshStandardMaterial color={P.trim} roughness={.88}/></mesh>
  <mesh rotation-x={-Math.PI/2} position-y={1.79}><circleGeometry args={[.6,24]}/><meshStandardMaterial color={P.water} roughness={.3}/></mesh>
  {jets.map((curve,i)=><mesh key={i}><tubeGeometry args={[curve,20,.025,5,false]}/><meshStandardMaterial color='#c4e0df' transparent opacity={.6} roughness={.2} depthWrite={false}/></mesh>)}
  <group ref={drops}>{jets.map((_,i)=><mesh key={i}><sphereGeometry args={[.045,6,4]}/><meshBasicMaterial color='#e0eeeb' transparent opacity={.6} depthWrite={false}/></mesh>)}</group>
  {Array.from({length:20},(_,i)=>{const angle=i*Math.PI/10;return <mesh key={i} position={[Math.cos(angle)*2.127,.45,Math.sin(angle)*2.127]} rotation-y={-angle}><boxGeometry args={[.018,.38,.02]}/><meshStandardMaterial color='#b9ad91'/></mesh>;})}
 </group>;
}
export function CanalBoat({x,color}:{x:number;color:string}){
 const boat=useRef<Group>(null);
 const hull=useMemo(()=>new Shape().moveTo(-1.35,-.4).quadraticCurveTo(-1.9,0,-1.35,.4).lineTo(.9,.5).quadraticCurveTo(1.65,.4,1.85,0).quadraticCurveTo(1.65,-.4,.9,-.5).closePath(),[]);
 const sail=useMemo(()=>new Shape().moveTo(.08,.9).lineTo(.08,2.75).quadraticCurveTo(1.3,1.95,1.6,1.12).closePath(),[]);
 const grain=useMemo(()=>paintedTexture('wood'),[]);
 useFrame(({clock})=>{if(boat.current){boat.current.position.y=Math.sin(clock.elapsedTime*.8+x)*.035;boat.current.rotation.z=Math.sin(clock.elapsedTime*.6+x)*.015;}});
 return <group ref={boat} position={[x,0,-19.5]} rotation-y={.12}>
  <mesh rotation-x={-Math.PI/2} position-y={-.06}><extrudeGeometry args={[hull,{depth:.38,bevelEnabled:true,bevelSize:.06,bevelThickness:.06,bevelSegments:2}]}/><meshStandardMaterial color={color} roughness={.9}/></mesh>
  <mesh rotation-x={-Math.PI/2} position-y={.335}><shapeGeometry args={[hull]}/><meshStandardMaterial color={P.wood} map={grain}/></mesh>
  {[-.9,-.1,.7].map(dx=><mesh key={dx} position={[dx,.38,0]}><boxGeometry args={[.27,.09,.8]}/><meshStandardMaterial color={P.pot} map={grain}/></mesh>)}
  <mesh position-y={1.45}><cylinderGeometry args={[.045,.065,2.9,8]}/><meshStandardMaterial color={P.wood}/></mesh>
  <mesh><shapeGeometry args={[sail]}/><meshStandardMaterial color={P.cream} side={DoubleSide} roughness={1}/></mesh>
  <mesh position={[.84,1.03,0]} rotation-z={.13}><boxGeometry args={[1.62,.045,.045]}/><meshStandardMaterial color={P.wood}/></mesh>
 </group>;
}
