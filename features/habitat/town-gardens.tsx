'use client';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group} from 'three';
import {GroundShadow} from './town-surfaces';
import {TownAssetInstances} from './town-assets';
import {GARDEN_TREES,TOWN_GARDEN_BEDS,gardenPlanting} from './town-planting';
import {TOWN_PALETTE as P} from './town-palette';

/** Real licensed Kenney plant meshes, instanced by material/geometry. */
export function TownGardens({quality='low'}:{quality?:'low'|'high'}){
 const flowers=useMemo(()=>gardenPlanting('flower'),[]);
 const shrubs=useMemo(()=>gardenPlanting('shrub'),[]);
 const grass=useMemo(()=>gardenPlanting('grass'),[]);
 return <group>
  {TOWN_GARDEN_BEDS.map(([x,z,r])=><group key={x+':'+z} position={[x,0,z]}>
   <mesh position-y={-.01}><cylinderGeometry args={[r+.2,r+.2,.08,32]}/><meshStandardMaterial color={P.grass}/></mesh>
   <mesh position-y={.015} rotation-x={-Math.PI/2}><torusGeometry args={[r+.2,.065,5,48]}/><meshStandardMaterial color={P.pot}/></mesh>
  </group>)}
  <TownAssetInstances id='nature-kit/plant_bushDetailed' placements={shrubs}/>
  <TownAssetInstances id='nature-kit/grass_leafsLarge' placements={grass}/>
  <TownAssetInstances id='nature-kit/flower_redA' placements={flowers.filter((_,i)=>i%3===0)}/>
  <TownAssetInstances id='nature-kit/flower_yellowB' placements={flowers.filter((_,i)=>i%3===1)}/>
  <TownAssetInstances id='nature-kit/flower_purpleC' placements={flowers.filter((_,i)=>i%3===2)}/>
  <TownAssetInstances id='nature-kit/tree_detailed' placements={GARDEN_TREES} castShadow={quality==='high'}/>
  {GARDEN_TREES.map(p=><GroundShadow key={p.x} x={p.x} z={p.z} width={4} depth={4}/>)}
  <Butterflies/>
  <group position={[0,14,-44]}>{[-20,-5,14,29].map((x,i)=><group key={x} position={[x,i%2,0]}>
   {[[-1,0,1.5],[1,.1,1.8],[0,.5,2]].map(([dx,dy,r],j)=><mesh key={j} position={[dx,dy,0]} scale={[2,.5,1]}><sphereGeometry args={[r,12,8]}/><meshBasicMaterial color='#f4f1dd' fog/></mesh>)}
  </group>)}</group>
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
