'use client';
import type {TownTableState} from '@/domain/town-table';
import {TOWN_TABLE} from '@/domain/town-table';
import {TownAsset,TownAssetInstances} from './town-assets';
/** Receipt-backed supplies on the existing picnic table, never new obstacles. */
export default function TownTableWorld({table}:{table:TownTableState|undefined}){
 if(!table)return null;
 return <group position={[TOWN_TABLE.x,0,TOWN_TABLE.z]}>
  {table.servedAt>0&&<mesh position={[0,.925,0]} rotation-x={-Math.PI/2}><planeGeometry args={[1.35,1.35]}/><meshStandardMaterial color='#c3cfae' roughness={1}/></mesh>}
  {(table.supplies['orchard-harvest']??0)>0&&<><TownAsset id='food-kit/plate-rectangle' size={.7} x={-.38} y={.94} z={-.1}/><TownAssetInstances id='food-kit/apple' placements={[-1,0,1].map(i=>({x:-.38+i*.18,y:1,z:-.1,size:.2}))}/></>}
  {(table.supplies['cafe-supplies']??0)>0&&<TownAssetInstances id='food-kit/cup-tea' placements={[-1,1].map(i=>({x:.4,y:.95,z:i*.3,size:.25}))}/>}
  {(table.supplies['community-garden']??0)>0&&<><TownAsset id='nature-kit/pot_small' size={.3} y={.95} z={-.45}/><TownAsset id='nature-kit/flower_yellowB' size={.4} y={1.12} z={-.45}/></>}
 </group>;
}
