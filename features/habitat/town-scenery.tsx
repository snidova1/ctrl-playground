'use client';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import {createCharacterMotion,resolveCharacter,seededAppearance} from '@/features/plaza/characters/catalog';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import type {Pose} from '@/features/plaza/types';
function Resident({index}:{index:number}){
 const appearance=useMemo(()=>seededAppearance(`town-resident-${index}`,index%2?'male':'female'),[index]);
 const initial=useMemo<Pose>(()=>({x:0,z:3,angle:0,moving:false}),[]);const pose=useRef({...initial}),motion=useRef(createCharacterMotion());
 useFrame(({clock})=>{const t=clock.elapsedTime*.22+index*Math.PI/2;const walking=index===0||index===2;pose.current.x=walking?Math.sin(t)*2.4:(index===1?-5.9:7);pose.current.z=walking?3+Math.cos(t)*1.2:(index===1?0:-.2);pose.current.angle=walking?Math.atan2(Math.cos(t)*2.4,-Math.sin(t)*1.2):Math.PI/2;pose.current.moving=walking;});
 return <VrmAvatar definition={resolveCharacter(appearance)} appearance={appearance} name={`${['Mira','Theo','June','Kai'][index]} · NPC`} local={false} pose={initial} poseRef={pose} motion={motion} quality='low' sitting={index===1} celebrate={false} interactedAt={0} seatLift={0}/>;
}
function Cottage({x,z,color}:{x:number;z:number;color:string}){return <group position={[x,0,z]}><mesh castShadow position-y={1.8}><boxGeometry args={[4,3.6,3.5]}/><meshStandardMaterial color={color}/></mesh><mesh castShadow position-y={4.1} rotation-y={Math.PI/4}><coneGeometry args={[3.5,2,4]}/><meshStandardMaterial color='#aa7155'/></mesh>{[-1,1].map(v=><mesh key={v} position={[v,2,1.76]}><boxGeometry args={[.7,1,.06]}/><meshStandardMaterial color='#557777'/></mesh>)}</group>;}
export default function TownScenery({quality,onDirectory}:{quality:'low'|'high';onDirectory:()=>void}){return <>
 <mesh rotation-x={-Math.PI/2} position-y={-.04} receiveShadow><planeGeometry args={[110,110]}/><meshStandardMaterial color='#91aa78'/></mesh>
 <mesh rotation-x={-Math.PI/2} position={[0,-.02,-12]}><planeGeometry args={[75,4]}/><meshStandardMaterial color='#74b8c2' roughness={.25} metalness={.15}/></mesh>
 {[[-14,-18,'#e3ceaa'],[-7,-20,'#d6a994'],[1,-20,'#e6d8b5'],[9,-19,'#adc2ad'],[16,-17,'#d1b9a5']].map(([x,z,color],i)=><Cottage key={i} x={Number(x)} z={Number(z)} color={String(color)}/>)}
 <mesh position={[0,.55,-3]} castShadow><cylinderGeometry args={[1.3,1.45,1.1,24]}/><meshStandardMaterial color='#d0c5aa'/></mesh>
 <mesh rotation-x={-Math.PI/2} position={[0,1.12,-3]}><circleGeometry args={[1.2,24]}/><meshStandardMaterial color='#6fb6c4'/></mesh>
 <mesh position={[0,1.6,-3]}><cylinderGeometry args={[.18,.3,1,12]}/><meshStandardMaterial color='#e3d8bf'/></mesh>
 <Html position={[-8,3.2,-1]} center distanceFactor={18}><span className='hb-town-label'>WILLOW CAFÉ</span></Html>
 <Html position={[7.5,3,-2]} center distanceFactor={18}><span className='hb-town-label'>FLOWER MARKET</span></Html>
 <Html position={[3,1.7,6]} center distanceFactor={10}><button className='hb-directory' onClick={onDirectory}>Visit habitats ↗</button></Html>
 {Array.from({length:quality==='low'?2:4},(_,i)=><Resident key={i} index={i}/>)}
 </>;}
