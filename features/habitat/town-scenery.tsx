'use client';
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import {Color,InstancedMesh,Matrix4} from 'three';
import {createCharacterMotion,resolveCharacter,seededAppearance} from '@/features/plaza/characters/catalog';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import type {Pose} from '@/features/plaza/types';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_BRIDGES,PUBLIC_WORLD_CANAL} from './public-world-geography';

/** An authored neighborhood made from reusable, lightweight Three geometry.
 * This is visual scenery, not player-created Habitat objects or fake online users.
 * All walkable geography matches public-world-geography.ts server/client collision.
 */
const ROADS=[
 {x:0,z:12,w:5.2,d:39},         // south promenade into the central plaza
 {x:0,z:-11.9,w:5.2,d:10},       // waterfront connection
 {x:0,z:-26.5,w:5.2,d:9},       // beyond the west bridge
 {x:20,z:-11.9,w:4.5,d:10},      // east bridge approach
 {x:20,z:-26.5,w:4.5,d:9},
 {x:0,z:9,w:64,d:4.6},         // lively east-west shopping street
 {x:0,z:-13.4,w:64,d:3.2},     // quay
 {x:-23,z:12,w:3.2,d:36},      // bakery quarter
 {x:23,z:12,w:3.2,d:36},       // makers quarter
 {x:0,z:28,w:54,d:3.2},       // park loop
] as const;
const LAMPS:[number,number][]= [
 [-15,9],[-7,9],[7,9],[15,9],[-27,9],[27,9],
 [-24,-12],[-12,-12],[12,-12],[25,-12],
 [-3,23],[3,23],[-20,28],[20,28],
];
const ROOT_COLORS=['#477d5d','#668b57','#77985f','#507a69','#8ca66b'];
const leafSeeds=Array.from({length:72},(_,i)=>{
 const side=i%4;
 const p=i%18;
 const x=side<2?(side===0?-37:37):(-39+p*4.5);
 const z=side<2?(-36+p*4.2):(side===2?-39:38);
 return {x:x+Math.sin(i*19)*1.6,z:z+Math.cos(i*23)*2.4,h:3+(i%5)*.7};
});
function GreenBorder({quality}:{quality:'low'|'high'}){
 const trunks=useRef<InstancedMesh>(null),canopies=useRef<InstancedMesh>(null);
 const selected=quality==='low'?leafSeeds.filter((_,i)=>i%2===0):leafSeeds;
 useLayoutEffect(()=>{
  const mat=new Matrix4(),color=new Color();
  selected.forEach((p,i)=>{
   mat.makeScale(.27,p.h*.55,.27);
   mat.setPosition(p.x,p.h*.275,p.z);
   trunks.current?.setMatrixAt(i,mat);
   mat.makeScale(1.25+(i%4)*.16,1.25+(i%5)*.18,1.2+(i%3)*.16);
   mat.setPosition(p.x,p.h*.64,p.z);
   canopies.current?.setMatrixAt(i,mat);
   color.set(ROOT_COLORS[i%ROOT_COLORS.length]);canopies.current?.setColorAt(i,color);
  });
  if(trunks.current)trunks.current.instanceMatrix.needsUpdate=true;
  if(canopies.current){canopies.current.instanceMatrix.needsUpdate=true;canopies.current.instanceColor!.needsUpdate=true;}
 },[selected.length]);
 return <group>
  <instancedMesh ref={trunks} args={[undefined,undefined,selected.length]}><cylinderGeometry args={[1,1,1,6]}/><meshStandardMaterial color='#8c765e'/></instancedMesh>
  <instancedMesh ref={canopies} args={[undefined,undefined,selected.length]} castShadow={quality==='high'}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial vertexColors roughness={1}/></instancedMesh>
 </group>;
}
function RaisedGround(){
 return <>
  <mesh rotation-x={-Math.PI/2} position-y={-.1} receiveShadow><planeGeometry args={[150,150]}/><meshStandardMaterial color='#a4c48f' roughness={1}/></mesh>
  <mesh rotation-x={-Math.PI/2} position={[0,-.065,-19.5]}><planeGeometry args={[78,5]}/><meshStandardMaterial color='#75bdc8' roughness={.22} metalness={.05}/></mesh>
  {/* Both quays have visible stone retaining walls and a safe road behind them. */}
  {[-16.7,-22.3].map(z=><group key={z}>
   <mesh position={[0,-.05,z]} receiveShadow><boxGeometry args={[75,.38,.65]}/><meshStandardMaterial color='#c9b9a0'/></mesh>
   <mesh position={[0,.14,z]}><boxGeometry args={[75,.09,.18]}/><meshStandardMaterial color='#eee1cb'/></mesh>
  </group>)}
  {ROADS.map((road,i)=><mesh key={i} rotation-x={-Math.PI/2} position={[road.x,.015,road.z]} receiveShadow>
   <planeGeometry args={[road.w,road.d]}/><meshStandardMaterial color={i%3===0?'#e4cda9':'#d8c3a3'} roughness={1}/>
  </mesh>)}
  {/* A clear, generous market square in the middle of the town. */}
  <mesh rotation-x={-Math.PI/2} position={[0,.025,1.5]} receiveShadow><planeGeometry args={[29,16]}/><meshStandardMaterial color='#ead6b6' roughness={1}/></mesh>
  {/* Slightly raised riverside grass behind the cottages makes the silhouette non-flat. */}
  {[[-39,-40,12,7],[-6,-46,22,10],[34,-42,15,8],[-50,22,18,9],[49,26,19,11]].map(([x,z,w,h],i)=>
   <mesh key={i} position={[x,-h*.32,z]}><sphereGeometry args={[w,h,w*.6,12,6]}/><meshStandardMaterial color={i%2?'#749e75':'#84ad82'} roughness={1}/></mesh>)}
  {/* Curving distant ridge silhouettes create depth even without downloadable assets. */}
  {[-55,-37,-18,5,25,49].map((x,i)=>
   <mesh key={i} position={[x,-9,-66]}><coneGeometry args={[14+(i%3)*3,27+(i%4)*5,5]}/><meshStandardMaterial color={i%2?'#92b6a5':'#a0beaf'} roughness={1}/></mesh>)}
 </>;
}
function Cobblestones({quality}:{quality:'low'|'high'}){
 const ref=useRef<InstancedMesh>(null);
 const tiles=useMemo(()=>{
  const res:{x:number;z:number;shade:number}[]=[];
  const step=quality==='low'?1.42:1.0;
  // Sample only within the explicit town paths and leave the actual canal clear.
  for(let x=-31;x<32;x+=step){
   for(let z=-29;z<31;z+=step){
    if(z>PUBLIC_WORLD_CANAL.north&&z<PUBLIC_WORLD_CANAL.south)continue;
    const road=ROADS.some(p=>Math.abs(x-p.x)<p.w/2-.26&&Math.abs(z-p.z)<p.d/2-.26);
    const square=Math.abs(x)<13.9&&z>-6&&z<9.2;
    if(!road&&!square)continue;
    const seed=Math.abs(Math.sin(x*12.13+z*7.19));
    if(seed>.91)continue;
    res.push({x:x+(seed-.5)*.12,z:z+(seed-.5)*.08,shade:Math.floor(seed*4)});
   }
  }
  return res;
 },[quality]);
 useLayoutEffect(()=>{
  const m=new Matrix4(),c=new Color();
  tiles.forEach((p,i)=>{m.makeScale(.8,.035,.64);m.setPosition(p.x,.038,p.z);ref.current?.setMatrixAt(i,m);c.set(['#d8bea0','#ead8bb','#d5b799','#e2c9a8'][p.shade]);ref.current?.setColorAt(i,c);});
  if(ref.current){ref.current.instanceMatrix.needsUpdate=true;ref.current.instanceColor!.needsUpdate=true;}
 },[tiles]);
 return <instancedMesh ref={ref} args={[undefined,undefined,tiles.length]} receiveShadow>
  <boxGeometry args={[1,1,1]}/><meshStandardMaterial vertexColors roughness={1}/>
 </instancedMesh>;
}
function Bridge({x}:{x:number}){
 return <group position={[x,0,-19.5]}>
  <mesh position-y={.22} receiveShadow castShadow><boxGeometry args={[6.8,.32,6.8]}/><meshStandardMaterial color='#a27850'/></mesh>
  {Array.from({length:11},(_,i)=><mesh key={i} position={[0,.44,-3.1+i*.62]}><boxGeometry args={[6.5,.055,.5]}/><meshStandardMaterial color={i%2?'#dbbd87':'#e9ca96'}/></mesh>)}
  {[-3.15,3.15].map(side=><group key={side}>
   <mesh position={[side,1.15,0]}><boxGeometry args={[.16,.15,6.8]}/><meshStandardMaterial color='#926b4e'/></mesh>
   {[-2.7,-.9,.9,2.7].map(z=><mesh key={z} position={[side,.69,z]}><boxGeometry args={[.16,1.15,.17]}/><meshStandardMaterial color='#987350'/></mesh>)}
  </group>)}
 </group>;
}
type House=typeof PUBLIC_WORLD_BUILDINGS[number];
function TownHouse({site,quality}:{site:House;quality:'low'|'high'}){
 const w=site.width,d=site.depth;
 return <group position={[site.x,0,site.z]}>
  <mesh castShadow={quality==='high'} receiveShadow position-y={2.06}><boxGeometry args={[w,4.12,d]}/><meshStandardMaterial color={site.color} roughness={1}/></mesh>
  {/* Two sloping roof plates, not a flat anonymous cube. */}
  {[-1,1].map(side=><mesh key={side} castShadow position={[side*w*.26,4.85,0]} rotation-z={side*.48}>
   <boxGeometry args={[w*.59,.29,d+.75]}/><meshStandardMaterial color={site.roof} roughness={.96}/>
  </mesh>)}
  <mesh position={[0,5.6,0]}><boxGeometry args={[.2,.18,d+.9]}/><meshStandardMaterial color='#fff3da'/></mesh>
  <mesh position={[0,1.3,d/2+.12]}><boxGeometry args={[1.18,2.35,.12]}/><meshStandardMaterial color='#7e9b80'/></mesh>
  <mesh position={[0,1.42,d/2+.2]}><boxGeometry args={[.04,.09,.06]}/><meshStandardMaterial color='#f8d58a' emissive='#efbc5e' emissiveIntensity={.35}/></mesh>
  {[-w*.29,w*.29].map((x,i)=><group key={i}>
   <mesh position={[x,2.4,d/2+.10]}><boxGeometry args={[1.25,1.4,.15]}/><meshStandardMaterial color='#fff0c8' emissive='#e3ad66' emissiveIntensity={.28}/></mesh>
   <mesh position={[x,2.4,d/2+.2]}><boxGeometry args={[.08,1.4,.09]}/><meshStandardMaterial color='#e7e1d3'/></mesh>
   <mesh position={[x,2.4,d/2+.2]}><boxGeometry args={[1.25,.08,.09]}/><meshStandardMaterial color='#e7e1d3'/></mesh>
   <mesh position={[x,1.62,d/2+.32]}><boxGeometry args={[1.48,.12,.48]}/><meshStandardMaterial color='#ddcbad'/></mesh>
  </group>)}
  <mesh position={[0,.16,d/2+1.1]} receiveShadow><boxGeometry args={[w*.56,.24,2.2]}/><meshStandardMaterial color='#c6a781'/></mesh>
  <mesh position={[0,3.72,d/2+.22]}><boxGeometry args={[Math.min(w-1,4.9),.48,.27]}/><meshStandardMaterial color='#f5ead5'/></mesh>
  <Html center position={[0,6.25,d/2]} distanceFactor={27}><span className='hb-town-label'>{site.name}</span></Html>
 </group>;
}
function MarketFront({x,name,base,roof}:{x:number;name:string;base:string;roof:string}){
 return <group position={[x,0,-9]}>
  <mesh castShadow position={[0,2.5,0]}><boxGeometry args={[9,5,3.8]}/><meshStandardMaterial color={base}/></mesh>
  <mesh castShadow position={[0,5.2,0]}><boxGeometry args={[9.5,.42,4.35]}/><meshStandardMaterial color={roof}/></mesh>
  {[-2.7,0,2.7].map(x=><group key={x}>
   <mesh position={[x,2.7,1.96]}><boxGeometry args={[1.5,2.2,.1]}/><meshStandardMaterial color='#fff0bf' emissive='#b98955' emissiveIntensity={.25}/></mesh>
   <mesh position={[x,2.7,2.08]}><boxGeometry args={[.08,2.2,.13]}/><meshStandardMaterial color='#e2d2b6'/></mesh>
  </group>)}
  <mesh castShadow position={[0,4.6,2.35]} rotation-x={-.13}><boxGeometry args={[9.7,.16,2.65]}/><meshStandardMaterial color={roof}/></mesh>
  <mesh position={[0,4.65,3.2]}><boxGeometry args={[5,.75,.13]}/><meshStandardMaterial color='#f1e1c7'/></mesh>
  <Html center position={[0,4.72,3.34]} distanceFactor={17}><span className='hb-town-label'>{name}</span></Html>
 </group>;
}
function TownLantern({x,z}:{x:number;z:number}){
 return <group position={[x,0,z]}>
  <mesh castShadow position-y={1.55}><cylinderGeometry args={[.065,.1,3.1,7]}/><meshStandardMaterial color='#556d5b'/></mesh>
  <mesh position-y={3.22}><boxGeometry args={[.75,.54,.75]}/><meshStandardMaterial color='#f9dba0' emissive='#e6b974' emissiveIntensity={.32}/></mesh>
  <mesh position-y={3.62}><coneGeometry args={[.57,.46,4]}/><meshStandardMaterial color='#53735f'/></mesh>
 </group>;
}
function Planter({x,z,i}:{x:number;z:number;i:number}){
 return <group position={[x,0,z]}>
  <mesh castShadow position-y={.28}><cylinderGeometry args={[.46,.36,.56,8]}/><meshStandardMaterial color={i%2?'#c38a72':'#e0b38f'}/></mesh>
  <mesh position-y={.84}><icosahedronGeometry args={[.63,1]}/><meshStandardMaterial color={i%3===0?'#6a996f':'#82aa72'}/></mesh>
  {[0,1,2].map(j=><mesh key={j} position={[Math.sin(j*2.5)*.34,1.26,Math.cos(j*2.5)*.32]}>
   <icosahedronGeometry args={[.17,0]}/><meshStandardMaterial color={['#e7b5a2','#efdc8b','#d6bbd9'][(i+j)%3]}/>
  </mesh>)}
 </group>;
}
function LifestyleProps({quality}:{quality:'low'|'high'}){
 return <>
  {LAMPS.filter((_,i)=>quality==='high'||i%2===0).map(([x,z],i)=><TownLantern key={i} x={x} z={z}/>)}
  {Array.from({length:quality==='low'?24:48},(_,i)=>{
   const side=i%4,along=(i*7)%28;
   const x=side===0?-29:side===1?29:side===2?-15+along:15-along;
   const z=side<2?-9+along:side===2?13.4:25.4;
   return <Planter key={i} x={x} z={z} i={i}/>;
  })}
  {/* Everyday picnic and public seating areas supply social spaces beyond NPCs. */}
  {[-11,11].map(x=><group key={x} position={[x,0,17]}>
   <mesh castShadow position-y={.62}><cylinderGeometry args={[1.1,1.1,.12,10]}/><meshStandardMaterial color='#d3b08b'/></mesh>
   <mesh position-y={.31}><cylinderGeometry args={[.14,.16,.6,8]}/><meshStandardMaterial color='#796851'/></mesh>
   {[-1,1].map(side=><group key={side} position={[side*1.65,0,0]}>
    <mesh position-y={.47}><boxGeometry args={[.95,.16,.55]}/><meshStandardMaterial color='#c68d70'/></mesh>
    <mesh position-y={.25}><boxGeometry args={[.1,.5,.5]}/><meshStandardMaterial color='#77614c'/></mesh>
   </group>)}
  </group>)}
 </>;
}
function Resident({index}:{index:number}){
 const appearance=useMemo(()=>seededAppearance('town-resident-'+index,index%2?'male':'female'),[index]);
 const initial=useMemo<Pose>(()=>({x:0,z:3,angle:0,moving:false}),[]);
 const pose=useRef({...initial}),motion=useRef(createCharacterMotion());
 useFrame(({clock})=>{
  const t=clock.elapsedTime*.19+index*Math.PI/2;
  const walking=index===0||index===2;
  pose.current.x=walking?Math.sin(t)*3.5:(index===1?-5.9:7);
  pose.current.z=walking?5+Math.cos(t)*1.7:(index===1?0:-.2);
  pose.current.angle=walking?Math.atan2(Math.cos(t)*3.5,-Math.sin(t)*1.7):Math.PI/2;
  pose.current.moving=walking;
 });
 return <VrmAvatar definition={resolveCharacter(appearance)} appearance={appearance} name={['Mira','Theo','June','Kai'][index]+' · NPC'} local={false} pose={initial} poseRef={pose} motion={motion} quality='low' sitting={index===1} celebrate={false} interactedAt={0} seatLift={0}/>;
}
export default function TownScenery({quality,onDirectory}:{quality:'low'|'high';onDirectory:()=>void}){
 return <group>
  <RaisedGround/>
  <Cobblestones quality={quality}/>
  <GreenBorder quality={quality}/>
  {PUBLIC_WORLD_BRIDGES.map(bridge=><Bridge key={bridge.x} x={bridge.x}/>)}
  {PUBLIC_WORLD_BUILDINGS.map(site=><TownHouse key={site.name} site={site} quality={quality}/>)}
  <MarketFront x={-8} name='WILLOW CAFÉ' base='#f0d8b5' roof='#86a084'/>
  <MarketFront x={8} name='FLOWER MARKET' base='#e7c5ab' roof='#b98574'/>
  <LifestyleProps quality={quality}/>
  {/* Existing server-owned models provide the interactable fountain and shops.
      This facade surrounds them with streets, districts and actual landmarks. */}
  <Html center position={[0,3.1,15]} distanceFactor={20}><span className='hb-town-label'>WILLOW SQUARE • TOWN PARK</span></Html>
  <Html center position={[0,2,-13.4]} distanceFactor={22}><span className='hb-town-label'>THE WILLOW WATERFRONT</span></Html>
  <Html position={[3,1.7,6]} center distanceFactor={10}><button className='hb-directory' onClick={onDirectory}>Visit habitats ↗</button></Html>
  {Array.from({length:quality==='low'?2:4},(_,i)=><Resident key={i} index={i}/>)}
 </group>;
}
