'use client';
import {useEffect,useMemo} from 'react';
import {
 BufferGeometry,CatmullRomCurve3,Color,DoubleSide,Float32BufferAttribute,
 TubeGeometry,Vector3,
} from 'three';

type Garland={z:number;spread:number;height:number;dip:number;seed:number};
const GARLANDS:readonly Garland[]=[
 // Draw two depth cues across the planted lane in the actual game camera.
 {z:6.3,spread:14.2,height:7.7,dip:1.0,seed:1},
 {z:-11.7,spread:17.1,height:8.1,dip:.72,seed:3},
];

/**
 * Original small village pennants, not downloaded studio artwork.
 * Shared material and ONE buffer geometry per line keep draw calls low.
 * A softly dipping rope plus painted coral/sage/cream linen flags creates
 * layered silhouette and human scale without repeating house primitives.
 */
function PennantString({garland}:{garland:Garland}){
 const visual=useMemo(()=>{
  const {z,spread,height,dip,seed}=garland;
  const curve=new CatmullRomCurve3([
   new Vector3(-spread,height,z),
   new Vector3(-spread*.51,height-dip*.72,z+.12),
   new Vector3(0,height-dip,z),
   new Vector3(spread*.54,height-dip*.69,z-.12),
   new Vector3(spread,height,z)
  ]);
  const cord=new TubeGeometry(curve,42,.022,5,false);
  const colors=['#db8e79','#f2d3a2','#9aaf94','#f0e9c8','#96bbc0','#e2ad91'];
  const vertices:number[]=[],rgb:number[]=[];
  const push=(v:Vector3,c:Color)=>{vertices.push(v.x,v.y,v.z);c.toArray(rgb,rgb.length);};
  for(let i=0;i<23;i++){
   const t=(i+.7)/24,p=curve.getPoint(t);
   const phase=Math.sin(i*.9+seed),width=.34+(i%4)*.045,drop=.68+(i%3)*.12;
   const color=new Color(colors[(i*7+seed)%colors.length]);
   const left=new Vector3(p.x-width/2,p.y,p.z);
   const right=new Vector3(p.x+width/2,p.y,p.z);
   const tip=new Vector3(p.x+phase*.075,p.y-drop,p.z+.03);
   push(left,color);push(right,color);push(tip,color);
  }
  const cloth=new BufferGeometry();
  cloth.setAttribute('position',new Float32BufferAttribute(vertices,3));
  cloth.setAttribute('color',new Float32BufferAttribute(rgb,3));
  cloth.computeVertexNormals();cloth.computeBoundingSphere();
  return {cord,cloth};
 },[garland]);
 useEffect(()=>()=>{visual.cord.dispose();visual.cloth.dispose();},[visual]);
 return <group name="PR32-Hand-Painted-Pennants">
  <mesh geometry={visual.cord} dispose={null}>
   <meshStandardMaterial color="#8b785d" roughness={1}/>
  </mesh>
  <mesh geometry={visual.cloth} dispose={null}>
   <meshStandardMaterial vertexColors side={DoubleSide} roughness={1} metalness={0}/>
  </mesh>
 </group>;
}
export default function TownAnimeDetails(){
 return <group>{GARLANDS.map(v=><PennantString garland={v} key={v.seed}/>)}</group>;
}
