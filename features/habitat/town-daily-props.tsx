'use client';
import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Group} from 'three';
import {TownAsset,TownAssetInstances,type AssetPlacement} from './town-assets';
import {GroundShadow} from './town-surfaces';
import {TOWN_PALETTE as P} from './town-palette';
import {PICNIC_SITES,MARKET_DISPLAY,TOWN_POTS} from './town-prop-layout';

export function TownDailyProps(){
 const pots=useMemo<AssetPlacement[]>(()=>TOWN_POTS.map(([x,z],i)=>({x,z,size:.85,yaw:i*.8})),[]);
 return <group>
  <TownAssetInstances id='nature-kit/pot_small' placements={pots}/>
  <TownAssetInstances id='nature-kit/plant_bushDetailed' placements={pots.map(p=>({...p,y:.64,size:.9}))}/>
  {PICNIC_SITES.map(({x,z})=><group key={x} position={[x,0,z]}>
   <GroundShadow width={3.6} depth={3.6}/>
   <TownAsset id='furniture-kit/tableRound' size={2} />
   <TownAsset id='furniture-kit/chairRounded' size={1.3} x={-1.25} yaw={Math.PI/2}/>
   <TownAsset id='furniture-kit/chairRounded' size={1.3} x={1.25} yaw={-Math.PI/2}/>
   {x<0&&<><TownAsset id='food-kit/plate' size={.4} x={-.35} y={.92}/>
   <TownAsset id='food-kit/croissant' size={.34} x={-.35} y={.97}/>
   <TownAsset id='food-kit/cup-tea' size={.3} x={.32} y={.92}/></>}
  </group>)}
  {/* Details stay on the existing café tables/counter, not in walking lanes. */}
  {[-8,-5].map(x=><group key={x} position={[x,0,0]}>
   <TownAsset id='food-kit/cup-saucer' size={.32} y={.66}/>
   <TownAsset id='food-kit/plate' size={.3} x={.32} y={.66} z={.1}/>
   <TownAsset id='food-kit/croissant' size={.25} x={.32} y={.7} z={.1}/>
   <Steam x={0} y={.78} z={0}/>
  </group>)}
  <TownAsset id='food-kit/plate-rectangle' size={.9} x={-9.1} y={.99} z={-3}/>
  {[-9.35,-9.1,-8.85].map(x=><TownAsset key={x} id='food-kit/croissant' size={.23} x={x} y={1.06} z={-3}/>)}
  <ProduceDisplay x={MARKET_DISPLAY.x} z={MARKET_DISPLAY.z}/>
  <TownAsset id='furniture-kit/trashcan' size={.8} x={-12.2} z={-3}/>
  <TownAsset id='furniture-kit/trashcan' size={.8} x={12.2} z={-3}/>
 </group>;
}
function ProduceDisplay({x,z}:{x:number;z:number}){
 return <group position={[x,0,z]}>
  {[-1.3,0,1.3].map((dx,i)=><group key={dx} position-x={dx}>
   <TownAsset id='platformer-kit/crate' size={.9}/>
   <TownAsset id='food-kit/plate-rectangle' size={.76} y={.9}/>
   {Array.from({length:4},(_,j)=><TownAsset key={j} id={i===0?'food-kit/apple':i===1?'food-kit/croissant':'food-kit/tomato'} size={.24} x={(j%2-.5)*.3} y={.98} z={(Math.floor(j/2)-.5)*.3} yaw={j*.7}/>)}
  </group>)}
 </group>;
}
function Steam({x,y,z}:{x:number;y:number;z:number}){
 const ref=useRef<Group>(null);
 useFrame(({clock})=>{ref.current?.children.forEach((p,i)=>{const t=(clock.elapsedTime*.25+i*.25)%1;p.position.set(Math.sin(t*6+i)*.04,t*.5,0);p.scale.setScalar(.04+t*.06);});});
 return <group ref={ref} position={[x,y,z]}>{[0,1,2].map(i=><mesh key={i}><sphereGeometry args={[1,6,4]}/><meshBasicMaterial color={P.cream} transparent opacity={.16} depthWrite={false}/></mesh>)}</group>;
}
