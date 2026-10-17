'use client';
import {useEffect,useMemo} from 'react';
import {BufferGeometry,Color,Float32BufferAttribute} from 'three';

/**
 * PR31 Willow Square floor plan: a readable radial civic center rather than
 * an unbroken rectangular carpet of paving. The patterned stone is FLUSH:
 * no new obstacles, no altered fountain footprint or player navigation.
 *
 * All geometry is one mesh and shares the authoritative fountain origin.
 */
export function makeTownSquareInlay(){
 const vertices:number[]=[],colors:number[]=[];
 const sand=new Color('#efdfbd'),warm=new Color('#c5a187'),sage=new Color('#a9b5a0');
 const triangle=(a:number[],b:number[],c:number[],color:Color)=>{
  vertices.push(...a,...b,...c);
  for(let i=0;i<3;i++)colors.push(color.r,color.g,color.b);
 };
 const quad=(a:number[],b:number[],c:number[],d:number[],color:Color)=>{
  triangle(a,b,c,color);triangle(a,c,d,color);
 };
 const p=(radius:number,angle:number)=>[Math.cos(angle)*radius,.042,-3+Math.sin(angle)*radius];
 for(let i=0;i<64;i++){
  const a=i*Math.PI/32+.007,b=(i+1)*Math.PI/32-.007;
  const inner=3.17,outer=i%4===0?4.42:4.31;
  quad(p(inner,a),p(inner,b),p(outer,b),p(outer,a),i%4===0?sage:i%2?warm:sand);
 }
 const strip=(x0:number,z0:number,x1:number,z1:number,w:number)=>{
  const dx=x1-x0,dz=z1-z0,length=Math.hypot(dx,dz),nx=-dz/length*w/2,nz=dx/length*w/2,y=.043;
  quad([x0+nx,y,z0+nz],[x0-nx,y,z0-nz],
       [x1-nx,y,z1-nz],[x1+nx,y,z1+nz],sage);
 };
 strip(0,1.52,0,4.23,.24);strip(0,-7.45,0,-9.2,.24);
 strip(-4.3,-3,-6.95,-3,.24);strip(4.3,-3,6.95,-3,.24);
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
 geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
export default function TownSquareFoundation(){
 const geometry=useMemo(makeTownSquareInlay,[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} receiveShadow={false} dispose={null}>
  <meshStandardMaterial vertexColors roughness={1}/>
 </mesh>;
}
