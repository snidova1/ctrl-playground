'use client';
import {useEffect,useMemo} from 'react';
import {BoxGeometry,BufferGeometry,Float32BufferAttribute,Matrix4,Shape,ShapeGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TOWN_PALETTE as P} from './town-palette';
import {paintedTexture} from './town-surfaces';

const combine=(parts:BufferGeometry[])=>{
 const geometry=mergeGeometries(parts)!;parts.forEach(part=>part.dispose());return geometry;
};
/** A sewn curved canopy, batched into two colours rather than forty boxes.
 * The original shop's canopy footprint and clear pedestrian headroom stay fixed. */
export function makeShopCanopy(){
 const batches:[BufferGeometry[],BufferGeometry[]]=[[],[]];
 for(let stripe=0;stripe<10;stripe++){
  const left=-4.75+stripe*.95,right=left+.95,vertices:number[]=[];
  for(let step=0;step<8;step++){
   const point=(t:number)=>[3.64-.12*t-.46*t*t,1.1+2.6*t];
   const [ay,az]=point(step/8),[by,bz]=point((step+1)/8);
   vertices.push(left,ay,az,right,ay,az,right,by,bz,left,ay,az,right,by,bz,left,by,bz);
  }
  const surface=new BufferGeometry();surface.setAttribute('position',new Float32BufferAttribute(vertices,3));surface.computeVertexNormals();
  const hem=new Shape().moveTo(left,3.065).lineTo(right,3.065).lineTo(right,2.91)
   .quadraticCurveTo((left+right)/2,2.71,left,2.91).closePath();
  const hemSource=new ShapeGeometry(hem,8),hemGeometry=hemSource.toNonIndexed();hemSource.dispose();
  hemGeometry.deleteAttribute('uv');hemGeometry.translate(0,0,3.7);
  batches[stripe%2].push(surface,hemGeometry);
 }
 return batches.map(combine);
}
export function ShopCanopy({color}:{color:string}){
 const geometries=useMemo(()=>makeShopCanopy(),[]);
 useEffect(()=>()=>geometries.forEach(g=>g.dispose()),[geometries]);
 return <group>{geometries.map((geometry,i)=><mesh key={i} geometry={geometry} dispose={null} castShadow receiveShadow>
  <meshStandardMaterial color={i?color:P.cream} roughness={1} side={2}/>
 </mesh>)}</group>;
}
/** Joinery stays on existing walls: no additional obstacles or interactive IDs. */
export function makeShopJoinery(){
 const box=(x:number,y:number,z:number,w:number,h:number,d:number)=>new BoxGeometry(w,h,d).applyMatrix4(new Matrix4().makeTranslation(x,y,z));
 const wood:BufferGeometry[]=[],trim:BufferGeometry[]=[];
 for(const x of [-2.75,2.75]){
  // Panelled stall aprons below the display windows.
  wood.push(box(x,.52,2.04,2.32,.5,.12));
  for(const offset of [-.94,-.47,0,.47,.94])trim.push(box(x+offset,.52,2.115,.035,.45,.025));
  trim.push(box(x,.79,2.08,2.4,.085,.22),box(x,.24,2.08,2.4,.07,.16));
 }
 for(const side of [-1,1]){
  wood.push(box(side*4.32,2.22,2.06,.25,4.32,.16));
  trim.push(box(side*4.32,3.89,2.12,.39,.18,.23),box(side*4.32,.4,2.12,.38,.24,.23));
 }
 trim.push(box(0,4.48,2.04,9.18,.17,.26),box(0,4.28,2.02,9.1,.07,.2));
 return [combine(wood),combine(trim)];
}
export function ShopJoinery(){
 const geometries=useMemo(()=>makeShopJoinery(),[]),grain=useMemo(()=>paintedTexture('wood'),[]);
 useEffect(()=>()=>geometries.forEach(g=>g.dispose()),[geometries]);
 return <group>{geometries.map((geometry,i)=><mesh key={i} geometry={geometry} dispose={null} receiveShadow>
  <meshStandardMaterial color={i?P.trim:P.shutter} map={i?null:grain} roughness={.88}/>
 </mesh>)}</group>;
}
