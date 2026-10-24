'use client';
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,Group,InstancedMesh,Object3D} from 'three';
import {Box,Sign} from '@/features/plaza/mesh-kit';
import {GARDEN_BEDS,MARKET_STALLS} from './public-districts';
import {PUBLIC_FISHING_SPOT} from './public-world-activities';
import PublicWorldLife,{BreezeAnchor,usePublicLife} from './public-world-life';
import {flowerLean,lifeDetailVisible} from './public-world-life-motion';
function GardenFlowers(){
 const flowers=useRef<InstancedMesh>(null);
 const {time,still,night,player}=usePublicLife(),last=useRef(-1),dummy=useMemo(()=>new Object3D(),[]);
 useLayoutEffect(()=>{const mesh=flowers.current;if(!mesh)return;const p=new Object3D(),c=new Color();GARDEN_BEDS.forEach(([x,z],bed)=>{for(let i=0;i<32;i++){const n=bed*32+i;p.position.set(x+(i%8-3.5)*.55,.58+(i%3)*.035,z+(Math.floor(i/8)-1.5)*.72);p.scale.set(.14,.11,.14);p.updateMatrix();mesh.setMatrixAt(n,p.matrix);mesh.setColorAt(n,c.set(['#f1c9db','#dfb7ed','#fff1bb','#c4d5aa'][(i+bed)%4]));}});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();},[]);
 useFrame(()=>{const mesh=flowers.current;if(!mesh||still||!lifeDetailVisible(player,-39,0)||time.current-last.current<1/20)return;last.current=time.current;
  GARDEN_BEDS.forEach(([x,z],bed)=>{for(let i=0;i<32;i++){const n=bed*32+i,lean=flowerLean(time.current,n,night);dummy.position.set(x+(i%8-3.5)*.55+lean*.3,.58+(i%3)*.035,z+(Math.floor(i/8)-1.5)*.72);dummy.rotation.set(lean,0,lean*.5);dummy.scale.set(.14,.11,.14);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);}});mesh.instanceMatrix.needsUpdate=true;
 });
 return <instancedMesh ref={flowers} args={[undefined,undefined,128]}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color='white' roughness={1}/></instancedMesh>;
}
/** Still, low-poly water outside the walk grid. The dock begins on dry,
 * navigable ground; it is a landmark, never an auto-action / inventory source. */
function QuietPond(){const p=PUBLIC_FISHING_SPOT;return <group name='public-cozy-fishing-pond'>
 <mesh position={[p.pondX,.04,p.pondZ]} rotation={[-Math.PI/2,0,0]} scale={[p.pondRadiusX+.28,p.pondRadiusZ+.28,1]}><circleGeometry args={[1,32]}/><meshStandardMaterial color='#a99d7d' roughness={1}/></mesh>
 <mesh position={[p.pondX,.052,p.pondZ]} rotation={[-Math.PI/2,0,0]} scale={[p.pondRadiusX,p.pondRadiusZ,1]}><circleGeometry args={[1,32]}/><meshStandardMaterial color='#7bafa7' roughness={.33} metalness={.08}/></mesh>
 <group name='public-fishing-dock' position={[p.dockX,0,p.dockZ]}>
  {Array.from({length:12},(_,i)=><Box key={i} position={[0,.065,-2.02+i*.365]} size={[1.5,.12,.34]} color={i%2?'#b99c73':'#c3a981'} castShadow={false}/>)}
  {[-.63,.63].flatMap(x=>[-1.9,1.9].map(z=><Box key={`${x}:${z}`} position={[x,.11,z]} size={[.12,.3,.12]} color='#8a775e'/>))}
 </group>
 {[[-42.5,15.4],[-45.5,16.5],[-43.5,17]].map(([x,z],i)=><mesh key={i} position={[x,.07,z]} rotation={[-Math.PI/2,0,i]}><circleGeometry args={[.2,8,0,Math.PI*1.8]}/><meshStandardMaterial color='#92a873' roughness={1}/></mesh>)}
 <Sign text={'QUIET POND\nCast a line, take your time'} position={[-46.5,1.4,11.8]} width={2} height={.6} size={96} color='#51665c'/>
 </group>;}
function Garden(){return <group name='spring-garden-landmarks'>
 <Box position={[-39,.018,0]} size={[18,.025,24]} color='#d3c4a4'/>
 {GARDEN_BEDS.map(([x,z],i)=><group key={i}><Box position={[x,.18,z]} size={[5,.36,4]} color='#ab9677'/><Box position={[x,.38,z]} size={[4.7,.05,3.7]} color='#766d4b'/><Box position={[x,.43,z]} size={[4.5,.06,3.5]} color='#8b9f65'/></group>)}<GardenFlowers/>
 {[-28,-47].map(x=><group key={x} name='garden-arch'>{[-2.7,2.7].map(z=><Box key={z} position={[x,1.55,z]} size={[.19,3.1,.19]} color='#9c8666'/>)}<Box position={[x,3.05,0]} size={[.3,.2,5.8]} color='#b49a72'/>{Array.from({length:9},(_,i)=><mesh key={i} position={[x,3.1,2.5-i*.625]}><sphereGeometry args={[.23,6,4]}/><meshStandardMaterial color={i%2?'#c5a6d9':'#b0bd85'}/></mesh>)}</group>)}
 <Sign text={'SPRING GARDEN\nTake the slow path'} position={[-28,2.6,0]} width={2.8} height={.6} size={96} color='#516146'/>
 <Sign text={'SEED & WATER\nYour garden journal'} position={[-39,1.35,-1.9]} width={2.4} height={.6} size={96} color='#53694e'/>
 <QuietPond/>
 {[-10,10].map(z=><group key={z}><Box position={[-39,.48,z]} size={[3,.15,.6]} color='#aa8c64'/><Box position={[-39,.86,z+.25]} size={[3,.65,.12]} color='#b49a77'/>{[-1.1,1.1].map(dx=><Box key={dx} position={[-39+dx,.24,z]} size={[.16,.48,.5]} color='#697562'/>)}</group>)}
 </group>;}
function Market({night}:{night:boolean}){return <group name='lantern-market-landmarks'>
 <Box position={[39,.018,0]} size={[18,.025,24]} color='#c2b299'/>
 {MARKET_STALLS.map(([x,z],i)=><group key={i} name={`market-stall-${i}`}>
 <Box position={[x,.58,z]} size={[3.4,1.16,2.6]} color='#a58463'/><Box position={[x,1.18,z]} size={[3.7,.12,2.8]} color='#d6bd94'/>
 {[-1.65,1.65].flatMap(dx=>[-1.25,1.25].map(dz=><Box key={`${dx}:${dz}`} position={[x+dx,1.75,z+dz]} size={[.12,3.5,.12]} color='#8a795d'/>))}
 <Box position={[x,3.35,z]} size={[3.9,.16,3.2]} color={['#ba887c','#96a386','#d3af78','#9eabc0'][i]}/>
 <BreezeAnchor position={[x,3.27,z+(z<0?1.6:-1.6)]} kind='cloth' phase={i*.7}><Box position={[0,-.13,0]} size={[3.9,.26,.035]} color={['#ba887c','#96a386','#d3af78','#9eabc0'][i]} castShadow={false}/></BreezeAnchor>
 {Array.from({length:8},(_,j)=><mesh key={j} position={[x+(j%4-1.5)*.63,1.37,z+(Math.floor(j/4)-.5)*.72]}><sphereGeometry args={[.17,6,4]}/><meshStandardMaterial color={['#c7ac70','#a7b07b','#cf8b79','#ceb4d1'][(i+j)%4]}/></mesh>)}
 <BreezeAnchor position={[x,2.925,z+(z<0?1.38:-1.38)]} kind='sign' phase={i*.7}><Sign text={['ORCHARD FRUIT','FLOWER STALL','TEA & BREAD','HANDMADE GOODS'][i]} position={[0,-.225,0]} width={2.8} height={.45} size={96} color='#f5e9cf'/></BreezeAnchor>
 </group>)}
 {[-3,3].map(z=><group key={z}>{[30,34,38,42,46].map((x,i)=><group key={x}><Box position={[x,2,z]} size={[.1,4,.1]} color='#756e5b'/><BreezeAnchor position={[x,4,z]} kind='lantern' phase={i*.7+z*.1}><mesh position={[0,-.2,0]}><sphereGeometry args={[.23,8,6]}/><meshStandardMaterial color={i%2?'#f2d7a0':'#e2a38c'} emissive='#e6b971' emissiveIntensity={night?1.4:.15}/></mesh></BreezeAnchor></group>)}</group>)}
 <Sign text={'LANTERN MARKET\nA little something to discover'} position={[28,2.55,0]} width={3} height={.7} size={96} color='#6b5d48'/>
 <group name='public-cozy-market-stations'>
  <Sign text={'GATHERED KITCHEN\nCook your ingredients'} position={[35,2.1,-6.4]} width={2.7} height={.6} size={96} color='#806a50'/>
  <Sign text={'MAKERS BENCH\nCraft with what you find'} position={[43,2.1,-6.4]} width={2.7} height={.6} size={96} color='#696a50'/>
  <Sign text={'COMMUNITY PANTRY\nA little care, together'} position={[39,1.8,2.1]} width={2.4} height={.65} size={96} color='#596b59'/>
  <Sign text={'ITEM EXCHANGE\nPlayer-to-player barter'} position={[47.2,1.6,0]} width={2} height={.65} size={96} color='#786350'/>
  {[[35,'#87765d'],[43,'#7c8470']].map(([x,color])=><Box key={x} position={[Number(x),1.35,-7.1]} size={[1.25,.2,.55]} color={String(color)}/>)}
 </group>
 </group>;}
/** District props use the existing world's ground and assets. Cull distant groups
 * to avoid making mobile render three fully detailed areas at once. */
export type Props={player:{x:number;z:number};night:boolean;still?:boolean};
export default function PublicDistrictEnvironment({player,night,still=false}:Props){
 const garden=useRef<Group>(null),market=useRef<Group>(null);
 useFrame(()=>{if(garden.current)garden.current.visible=Math.hypot(player.x+39,player.z)<35;if(market.current)market.current.visible=Math.hypot(player.x-39,player.z)<35;});
 return <PublicWorldLife player={player} night={night} still={still}><group name='connected-public-districts'>
 {[-31,31].map(x=><Box key={x} position={[x,.017,0]} size={[10,.025,2.8]} color='#caba99'/>)}
 <group ref={garden} visible={false}><Garden/></group><group ref={market} visible={false}><Market night={night}/></group>
 </group></PublicWorldLife>;
}
