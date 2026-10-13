'use client';
import {useEffect,useMemo} from 'react';
import {CircleGeometry,PlaneGeometry} from 'three';
import {paintedTexture} from './town-surfaces';

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
export function TownPaving({x,z,w,d,round=false,height=.015}:{x:number;z:number;w:number;d:number;round?:boolean;height?:number}){
 const geometry=useMemo(()=>createPavingGeometry(x,z,w,d,round),[x,z,w,d,round]);
 const texture=useMemo(()=>paintedTexture('stone'),[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} rotation-x={-Math.PI/2} position={[x,height,z]} receiveShadow dispose={null}><meshStandardMaterial map={texture} roughness={1}/></mesh>;
}
