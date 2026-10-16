'use client';
import {useEffect,useMemo} from 'react';
import {paintedTexture} from './town-surfaces';
import {TOWN_PALETTE as P} from './town-palette';

export const HABITAT_BASE_Y=-.37;
export const HABITAT_BASE_HEIGHT=.7;

/** Same original painted surfaces as the town. Geometry stays at the existing
 * walk height/bounds; no invisible collisions or decorations added to a save. */
export default function HabitatGround({interior=false}:{interior?:boolean}){
 const map=useMemo(()=>{
  const own=paintedTexture(interior?'wood':'grass').clone();
  own.repeat.set(interior?8:16,interior?6:12);own.needsUpdate=true;
  return own;
 },[interior]);
 useEffect(()=>()=>map.dispose(),[map]);
 return <>
  <mesh rotation-x={-Math.PI/2} receiveShadow>
   <planeGeometry args={[32,24]}/>
   <meshStandardMaterial color={interior?P.cream:'#ffffff'} map={map} roughness={1}/>
  </mesh>
  {/* The former -.35 + .7/2 top exactly overlapped the y=0 walk plane.
      Separate the foundation by 2cm so depth rounding cannot flicker between
      the dark side material and the lawn, while the walk height stays zero. */}
  <mesh position={[0,HABITAT_BASE_Y,2]} receiveShadow>
   <boxGeometry args={[32,HABITAT_BASE_HEIGHT,24]}/>
   <meshStandardMaterial color={interior?P.pot:P.forest} roughness={1}/>
  </mesh>
 </>;
}
