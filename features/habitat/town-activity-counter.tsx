'use client';
import {useEffect,useMemo} from 'react';
import {BoxGeometry,Matrix4,type BufferGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {paintedTexture} from './town-surfaces';

/** Original joinery replacing the blank station box. The exact 1.8 x 1.3m
 * counter footprint stays inside its existing authoritative solid obstacle. */
export function makeActivityCounter(){
 const buckets:BufferGeometry[][]=[[],[],[]];
 const box=(bucket:number,x:number,y:number,z:number,w:number,h:number,d:number)=>buckets[bucket].push(new BoxGeometry(w,h,d).applyMatrix4(new Matrix4().makeTranslation(x,y,z)));
 for(const x of [-.76,.76])for(const z of [-.51,.51])box(1,x,.51,z,.13,.94,.13);
 box(0,0,.97,0,1.8,.1,1.3);box(0,0,.22,0,1.64,.09,1.12);
 for(const z of [-.58,.58]){
  box(1,0,.82,z,1.64,.12,.1);box(1,0,.32,z,1.64,.12,.1);
  for(let i=0;i<8;i++)box(2,-.7+i*.2,.56,z,.15,.42,.08);
 }
 return buckets.map(pieces=>{const geometry=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return geometry;});
}
export default function TownActivityCounter({type}:{type:string}){
 const parts=useMemo(()=>makeActivityCounter(),[]);useEffect(()=>()=>parts.forEach(g=>g.dispose()),[parts]);
 const panel=type==='harbor-cleanup'?'#91aaa7':type==='community-garden'?'#94a17c':type==='festival-stage'?'#c09179':type==='orchard-harvest'?'#bd9471':'#c7b595';
 return <group>{parts.map((geometry,i)=><mesh key={i} geometry={geometry} dispose={null} castShadow receiveShadow>
  <meshStandardMaterial color={i===0?'#d3b98e':i===1?'#806c54':panel} map={i===0?paintedTexture('wood'):undefined} roughness={.95}/>
 </mesh>)}</group>;
}
