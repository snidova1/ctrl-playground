'use client';
import {useEffect,useMemo} from 'react';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {paintedTexture} from './town-surfaces';

export type TownRoofKind='hip'|'gambrel'|'clerestory';
/** Original roof kit. Local dimensions share the existing solid building's
 * footprint; only the high roof silhouette changes, never walkable geography. */
export function makeTownRoof(width:number,depth:number,rise:number,kind:TownRoofKind){
 const x=width/2+.35,z=depth/2+.35;
 const faces:number[][]=[];
 const triangle=(a:number[],b:number[],c:number[])=>faces.push([...a,...b,...c]);
 const quad=(a:number[],b:number[],c:number[],d:number[])=>{triangle(a,b,c);triangle(a,c,d);};
 if(kind==='hip'){
  const a=[-x,0,-z],b=[x,0,-z],c=[x,0,z],d=[-x,0,z],e=[0,rise,-z*.48],f=[0,rise,z*.48];
  triangle(a,e,b);quad(b,e,f,c);triangle(c,f,d);quad(d,f,e,a);
 }else{
  const profile=kind==='gambrel'?[[-x,0],[-x*.68,rise*.65],[0,rise],[x*.68,rise*.65],[x,0]]:
   [[-x,0],[-x*.14,rise*.62],[-x*.14,rise],[x*.24,rise],[x,0]];
  for(let i=0;i<profile.length-1;i++){
   const [ax,ay]=profile[i],[bx,by]=profile[i+1];
   quad([ax,ay,-z],[ax,ay,z],[bx,by,z],[bx,by,-z]);
  }
  // Close both ends; otherwise the silhouette is a hollow floating roof.
  for(let i=0;i<profile.length-1;i++){
   triangle([0,0,z],[profile[i+1][0],profile[i+1][1],z],[profile[i][0],profile[i][1],z]);
   triangle([0,0,-z],[profile[i][0],profile[i][1],-z],[profile[i+1][0],profile[i+1][1],-z]);
  }
 }
 const positions=faces.flat(),uv:number[]=[];
 for(let i=0;i<positions.length;i+=3)uv.push(positions[i]/4,positions[i+2]/4+positions[i+1]/3);
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
export default function TownRoof({width,depth,base,rise=1.6,kind,color}:{width:number;depth:number;base:number;rise?:number;kind:TownRoofKind;color:string}){
 const geometry=useMemo(()=>makeTownRoof(width,depth,rise,kind),[width,depth,rise,kind]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group position-y={base}>
  <mesh geometry={geometry} dispose={null} castShadow receiveShadow><meshStandardMaterial color={color} map={paintedTexture('roof')} roughness={.96} side={2}/></mesh>
  <mesh position-y={-.035}><boxGeometry args={[width+.78,.13,depth+.78]}/><meshStandardMaterial color='#e5d7ba'/></mesh>
 </group>;
}
