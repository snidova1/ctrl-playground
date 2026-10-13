'use client';
import {useMemo} from 'react';
import {Html,RoundedBox} from '@react-three/drei';
import {Shape} from 'three';
import {PUBLIC_WORLD_BUILDINGS} from './public-world-geography';
import {TOWN_PALETTE as P} from './town-palette';
import {GroundShadow,paintedTexture} from './town-surfaces';
import {TownAsset} from './town-assets';

function GableRoof({width,depth,base,rise=1.5,color}:{width:number;depth:number;base:number;rise?:number;color:string}){
 const half=width/2+.35,angle=Math.atan2(rise,half),length=Math.hypot(half,rise);
 const shape=useMemo(()=>new Shape().moveTo(-half,0).lineTo(0,rise).lineTo(half,0).closePath(),[half,rise]);
 const roof=useMemo(()=>paintedTexture('roof'),[]);
 return <group position-y={base}>
  <mesh position={[0,0,-depth/2-.35]}><extrudeGeometry args={[shape,{depth:depth+.7,bevelEnabled:false}]}/><meshStandardMaterial color={P.cream}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*half/2,rise/2,0]} rotation-z={-side*angle} receiveShadow castShadow><boxGeometry args={[length,.09,depth+.85]}/><meshStandardMaterial color={color} map={roof} roughness={.96}/></mesh>
   <mesh position={[side*half/2,rise/2,depth/2+.47]} rotation-z={-side*angle}><boxGeometry args={[length+.06,.14,.14]}/><meshStandardMaterial color={P.trim}/></mesh>
  </group>)}
  <mesh position-y={rise+.045} rotation-x={Math.PI/2}><cylinderGeometry args={[.12,.12,depth+.92,8]}/><meshStandardMaterial color={color}/></mesh>
  <group position={[0,rise*.5,depth/2+.36]}>
   <mesh><circleGeometry args={[.27,24]}/><meshStandardMaterial color={P.forest}/></mesh>
   <mesh position-z={.015}><torusGeometry args={[.29,.045,6,24]}/><meshStandardMaterial color={P.trim}/></mesh>
   <mesh position-z={.035}><boxGeometry args={[.48,.04,.04]}/><meshStandardMaterial color={P.trim}/></mesh>
   <mesh position-z={.035}><boxGeometry args={[.04,.48,.04]}/><meshStandardMaterial color={P.trim}/></mesh>
  </group>
 </group>;
}
function ShutterWindow({x,y,z,width=1.25,height=1.4,flowers=false}:{x:number;y:number;z:number;width?:number;height?:number;flowers?:boolean}){
 return <group position={[x,y,z]}>
  <RoundedBox args={[width+.2,height+.2,.14]} radius={.025} smoothness={1}><meshStandardMaterial color={P.trim}/></RoundedBox>
  <mesh position-z={.09}><boxGeometry args={[width,height,.05]}/><meshStandardMaterial color={P.forest} roughness={.5}/></mesh>
  <mesh position-z={.13}><boxGeometry args={[.06,height,.06]}/><meshStandardMaterial color={P.cream}/></mesh>
  <mesh position-z={.13}><boxGeometry args={[width,.06,.06]}/><meshStandardMaterial color={P.cream}/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*(width/2+.28),0,.08]} rotation-y={side*.13}>
   <mesh><boxGeometry args={[.34,height+.12,.12]}/><meshStandardMaterial color={P.shutter}/></mesh>
   {Array.from({length:6},(_,i)=><mesh key={i} position={[0,-height*.4+i*height*.16,.07]} rotation-x={-.15}><boxGeometry args={[.3,.055,.07]}/><meshStandardMaterial color={P.sage}/></mesh>)}
  </group>)}
  {flowers&&<group position={[0,-height/2-.17,.15]}>
   <mesh><boxGeometry args={[width+.25,.22,.42]}/><meshStandardMaterial color={P.wood}/></mesh>
   {[-.42,0,.42].map((dx,i)=><TownAsset key={dx} id={i%2?'nature-kit/flower_yellowB':'nature-kit/flower_redA'} size={.35} x={dx} y={.12}/>)}
  </group>}
 </group>;
}
function ArchedDoor({z}:{z:number}){
 const arch=useMemo(()=>new Shape().moveTo(-.61,0).lineTo(.61,0).lineTo(.61,1.73).absarc(0,1.73,.61,0,Math.PI,false).lineTo(-.61,0).closePath(),[]);
 return <group position={[0,.08,z]}>
  <mesh><extrudeGeometry args={[arch,{depth:.1,bevelEnabled:true,bevelSize:.045,bevelThickness:.03,bevelSegments:1}]}/><meshStandardMaterial color={P.sage}/></mesh>
  <mesh position={[.35,1.04,.15]}><sphereGeometry args={[.055,8,6]}/><meshStandardMaterial color={P.wood} metalness={.2} roughness={.45}/></mesh>
  <mesh position={[0,1.79,.12]}><circleGeometry args={[.36,20]}/><meshStandardMaterial color={P.forest}/></mesh>
  {[-.3,0,.3].map(x=><mesh key={x} position={[x,.8,.115]}><boxGeometry args={[.025,1.35,.025]}/><meshStandardMaterial color={P.shutter}/></mesh>)}
 </group>;
}
export function TownHouse({site}:{site:typeof PUBLIC_WORLD_BUILDINGS[number]}){
 const w=site.width,d=site.depth;
 return <group position={[site.x,0,site.z]}>
  <GroundShadow width={w+2} depth={d+2}/>
  <RoundedBox args={[w,4.12,d]} position-y={2.06} radius={.06} smoothness={1} receiveShadow><meshStandardMaterial color={site.name==='ART STUDIO'?P.wall:P.cream}/></RoundedBox>
  <mesh position-y={.23}><boxGeometry args={[w+.06,.46,d+.06]}/><meshStandardMaterial color={P.pot}/></mesh>
  <GableRoof width={w} depth={d} base={4.12} color={P.terracotta}/>
  <mesh position={[w*.27,5.3,-d*.22]}><boxGeometry args={[.6,1.15,.6]}/><meshStandardMaterial color={P.terracotta}/></mesh>
  <mesh position={[w*.27,5.87,-d*.22]}><boxGeometry args={[.76,.14,.76]}/><meshStandardMaterial color={P.pot}/></mesh>
  <ArchedDoor z={d/2+.08}/>
  {[-w*.29,w*.29].map(x=><ShutterWindow key={x} x={x} y={2.4} z={d/2+.07} flowers/>)}
  <mesh position={[0,.12,d/2+.55]}><boxGeometry args={[2.1,.2,.95]}/><meshStandardMaterial color={P.pot}/></mesh>
  {[-w/2+.12,w/2-.12].map(x=><mesh key={x} position={[x,2.06,d/2+.06]}><boxGeometry args={[.2,4.12,.14]}/><meshStandardMaterial color={P.trim}/></mesh>)}
  <mesh position={[0,3.74,d/2+.12]}><boxGeometry args={[Math.min(w-1,4.9),.42,.16]}/><meshStandardMaterial color={P.trim}/></mesh>
  <Html transform center occlude position={[0,3.74,d/2+.24]} distanceFactor={8} zIndexRange={[5,0]}><span className='hb-town-label'>{site.name}</span></Html>
 </group>;
}
export function MarketFront({x,name,base,roof}:{x:number;name:string;base:string;roof:string}){
 return <group position={[x,0,-9]}>
  <GroundShadow width={11} depth={7}/>
  <RoundedBox args={[9,4.6,3.8]} position-y={2.3} radius={.06} smoothness={1}><meshStandardMaterial color={base}/></RoundedBox>
  <mesh position-y={.23}><boxGeometry args={[9.06,.46,3.86]}/><meshStandardMaterial color={P.pot}/></mesh>
  <GableRoof width={9} depth={3.8} base={4.6} rise={1.1} color={roof}/>
  <ArchedDoor z={1.96}/>
  {[-2.75,2.75].map(dx=><ShutterWindow key={dx} x={dx} y={2.18} z={1.97} width={1.85} height={2.18}/>)}
  {[-4.34,4.34].map(dx=><mesh key={dx} position={[dx,2.3,1.98]}><boxGeometry args={[.2,4.6,.12]}/><meshStandardMaterial color={P.trim}/></mesh>)}
  {Array.from({length:10},(_,i)=><group key={i}>
   <mesh position={[-4.28+i*.95,3.45,2.4]} rotation-x={.19}><boxGeometry args={[.95,.08,2.6]}/><meshStandardMaterial color={i%2?roof:P.cream}/></mesh>
   <mesh position={[-4.28+i*.95,3.03,3.67]}><boxGeometry args={[.95,.32,.08]}/><meshStandardMaterial color={i%2?roof:P.cream}/></mesh>
  </group>)}
  <RoundedBox args={[5,.48,.15]} position={[0,4.08,2.08]} radius={.04} smoothness={1}><meshStandardMaterial color={P.trim}/></RoundedBox>
  <Html transform center occlude position={[0,4.08,2.2]} distanceFactor={10} zIndexRange={[5,0]}><span className='hb-town-label'>{name}</span></Html>
 </group>;
}
