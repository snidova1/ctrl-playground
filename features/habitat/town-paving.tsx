'use client';
import {useEffect,useMemo} from 'react';
import {BufferGeometry,CircleGeometry,Float32BufferAttribute,PlaneGeometry} from 'three';
import {paintedTexture} from './town-surfaces';
import {TOWN_PALETTE as P} from './town-palette';

/** Flush radial limestone setts frame the existing fountain, without changing
 * its solid radius or the walk surface. One material / one draw submission. */
export function makeFountainInlay(){
 const vertices:number[]=[];
 for(let i=0;i<48;i++){
  const a=i*Math.PI/24+.008,b=(i+1)*Math.PI/24-.008;
  const point=(r:number,t:number)=>[Math.cos(t)*r,.029,-3+Math.sin(t)*r];
  const p=point(2.3,a),q=point(2.3,b),r=point(2.98,b),s=point(2.98,a);
  vertices.push(...p,...q,...r,...p,...r,...s);
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
export function FountainInlay(){
 const geometry=useMemo(()=>makeFountainInlay(),[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} dispose={null} receiveShadow><meshStandardMaterial color={P.pot} roughness={1}/></mesh>;
}

/** All path intersections use the same world UV origin and Common Ground tile size.
 * No mismatched paving scale, streaked seams or texture restart at road borders.
 */
export function createPavingGeometry(x:number,z:number,w:number,d:number,round=false){
 const geometry=round?new CircleGeometry(w/2,64):new PlaneGeometry(w,d);
 const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<position.count;i++)uv.setXY(i,(x+position.getX(i))/4.8,(z-position.getY(i))/4.8);
 uv.needsUpdate=true;
 return geometry;
}
/** Long connectors must not stretch a single 256px tile across an entire
 * district. Project from their actual world vertices just like plaza paving. */
export function createScenicPavingGeometry(ax:number,az:number,bx:number,bz:number,width:number){
 const geometry=new PlaneGeometry(width,Math.hypot(bx-ax,bz-az));
 geometry.rotateX(-Math.PI/2);geometry.rotateY(Math.atan2(bx-ax,bz-az));geometry.translate((ax+bx)/2,0,(az+bz)/2);
 const positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<positions.count;i++)uv.setXY(i,positions.getX(i)/4.8,positions.getZ(i)/4.8);
 return geometry;
}
export function ScenicPaving({ax,az,bx,bz,width}:{ax:number;az:number;bx:number;bz:number;width:number}){
 const geometry=useMemo(()=>createScenicPavingGeometry(ax,az,bx,bz,width),[ax,az,bx,bz,width]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} position-y={.033} dispose={null} receiveShadow><meshStandardMaterial map={paintedTexture('stone')} roughness={1}/></mesh>;
}
export function TownPaving({x,z,w,d,round=false,height=.015}:{x:number;z:number;w:number;d:number;round?:boolean;height?:number}){
 const geometry=useMemo(()=>createPavingGeometry(x,z,w,d,round),[x,z,w,d,round]);
 const texture=useMemo(()=>paintedTexture('stone'),[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} rotation-x={-Math.PI/2} position={[x,height,z]} receiveShadow dispose={null}><meshStandardMaterial map={texture} roughness={1}/></mesh>;
}
