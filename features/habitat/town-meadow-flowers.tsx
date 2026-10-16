'use client';
import {useEffect,useMemo} from 'react';
import {CylinderGeometry,Object3D,SphereGeometry,type BufferGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TOWN_PALETTE as P} from './town-palette';

export function makeMeadowFlowers(){
 const groups:BufferGeometry[][]=[[],[],[]];
 for(let i=0;i<13;i++){
  const angle=i*2.399,r=Math.sqrt((i+.5)/13)*.29,x=Math.cos(angle)*r,z=Math.sin(angle)*r,h=.12+(i%4)*.027;
  groups[0].push(new CylinderGeometry(.003,.004,h,5).translate(x,h/2,z));
  const leaf=new SphereGeometry(1,6,4).scale(.018,.004,.041).rotateZ(.4).translate(x+.017,h*.4,z);groups[0].push(leaf);
  for(let petal=0;petal<5;petal++){
   const a=petal*Math.PI*2/5,transform=new Object3D();
   transform.scale.set(.023,.009,.04);transform.rotation.y=-a;transform.position.set(x+Math.sin(a)*.032,h,z+Math.cos(a)*.032);transform.updateMatrix();
   groups[i%3===0?2:1].push(new SphereGeometry(1,6,4).applyMatrix4(transform.matrix));
  }
  groups[2].push(new SphereGeometry(.015,6,4).scale(1,.55,1).translate(x,h+.009,z));
 }
 return groups.map(parts=>{
  const geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());
  const positions=geometry.getAttribute('position');for(let i=0;i<positions.count;i++)positions.setY(i,Math.max(0,positions.getY(i)));
  geometry.computeBoundingBox();return geometry;
 });
}
/** Replaces the original oversized blue playground flowers, not saved IDs. */
export default function TownMeadowFlowers({size}:{size?:number}){
 const geometry=useMemo(()=>makeMeadowFlowers(),[]);
 useEffect(()=>()=>geometry.forEach(g=>g.dispose()),[geometry]);
 return <group scale={size===undefined?1:size/.78565}>{geometry.map((g,i)=><mesh key={i} geometry={g} dispose={null} castShadow receiveShadow><meshStandardMaterial color={[P.forest,P.cream,'#c99685'][i]} roughness={1}/></mesh>)}</group>;
}
