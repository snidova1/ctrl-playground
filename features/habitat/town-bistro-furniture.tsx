'use client';
import {useEffect,useMemo} from 'react';
import {CatmullRomCurve3,CylinderGeometry,TorusGeometry,TubeGeometry,Vector3,type BufferGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {TOWN_PALETTE as P} from './town-palette';

export const BISTRO_FURNITURE=new Set(['furniture-kit/chairRounded','furniture-kit/benchCushion','furniture-kit/tableRound','furniture-kit/tableCloth']);
const move=(g:BufferGeometry,x:number,y:number,z:number)=>g.translate(x,y,z);
const box=(w:number,h:number,d:number,x:number,y:number,z:number)=>move(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.2),x,y,z);
const cylinder=(r:number,h:number,x:number,y:number,z:number)=>move(new CylinderGeometry(r,r,h,16),x,y,z);
function tube(points:number[][],radius=.007){return new TubeGeometry(new CatmullRomCurve3(points.map(p=>new Vector3(...p))),12,radius,5,false);}
function combine(parts:BufferGeometry[]){
 const normalized=parts.map(g=>{if(!g.index)return g;const p=g.toNonIndexed();g.dispose();return p;});
 const geometry=mergeGeometries(normalized)!;normalized.forEach(g=>g.dispose());geometry.computeBoundingBox();return geometry;
}
/** Authored bentwood / enamel bistro set in the original GLBs' local units.
 * Existing ObjectView roots retain saved transforms, native picking and seats. */
export function makeBistroFurniture(id:string){
 const metal:BufferGeometry[]=[],wood:BufferGeometry[]=[],ceramic:BufferGeometry[]=[];
 if(id==='furniture-kit/chairRounded'){
  wood.push(cylinder(.103,.018,0,.208,0));ceramic.push(cylinder(.095,.011,0,.222,0));
  for(const side of [-1,1]){
   metal.push(tube([[side*.082,.012,.082],[side*.07,.19,.063],[side*.086,.31,-.078],[side*.085,.35,-.085]]));
   metal.push(tube([[side*.086,.012,-.09],[side*.073,.19,-.058],[side*.09,.32,-.083]]));
  }
  wood.push(move(new TorusGeometry(.092,.012,6,20,Math.PI),0,.35,-.085));
  for(const x of [-.045,0,.045])wood.push(tube([[x,.27,-.085],[x,.34,-.095],[x,.41,-.09]],.008));
  metal.push(tube([[-.08,.11,.065],[0,.075,.06],[.08,.11,.065]],.005));
 }else if(id==='furniture-kit/benchCushion'){
  for(const z of [-.064,-.021,.021,.064])wood.push(box(.4,.014,.035,0,.215,z));
  for(const y of [.29,.335,.38,.425])wood.push(box(.4,.03,.018,0,y,-.078));
  for(const side of [-1,1]){
   metal.push(tube([[side*.165,.01,.085],[side*.16,.18,.06],[side*.16,.27,.075],[side*.16,.29,0],[side*.16,.275,-.085]],.009));
   metal.push(tube([[side*.17,.01,-.09],[side*.16,.21,-.065],[side*.16,.45,-.09]],.009));
   metal.push(box(.022,.025,.18,side*.16,.19,0));
  }
 }else if(id==='furniture-kit/tableRound'){
  ceramic.push(cylinder(.4,.035,0,.348,0));wood.push(cylinder(.407,.022,0,.327,0));
  metal.push(cylinder(.03,.29,0,.153,0));
  for(let i=0;i<3;i++){
   const a=i*Math.PI*2/3;
   metal.push(tube([[0,.18,0],[Math.cos(a)*.15,.045,Math.sin(a)*.15],[Math.cos(a)*.29,.018,Math.sin(a)*.29]],.016));
  }
 }else{
  wood.push(box(.84,.04,.447,0,.305,0));ceramic.push(box(.52,.009,.46,0,.33,0));
  for(const x of [-.33,.33])for(const z of [-.155,.155])wood.push(box(.035,.27,.035,x,.145,z));
  for(const x of [-.33,.33])metal.push(box(.022,.035,.35,x,.12,0));
  for(const z of [-.175,.175])wood.push(box(.76,.085,.025,0,.248,z));
 }
 const parts={metal:combine(metal),wood:combine(wood),ceramic:ceramic.length?combine(ceramic):null};
 // Bound the actual authored meshes, not merely their catalog metadata. Keep
 // every picking/solid footprint exactly as before, including round tables.
 const bounds=getBuildAsset(id)!.bounds;
 let maxX=0,maxZ=0;
 for(const g of Object.values(parts))if(g){const b=g.boundingBox!;maxX=Math.max(maxX,Math.abs(b.min.x),Math.abs(b.max.x));maxZ=Math.max(maxZ,Math.abs(b.min.z),Math.abs(b.max.z));}
 const sx=Math.min(1,bounds[0]/(maxX*2)),sz=Math.min(1,bounds[2]/(maxZ*2));
 for(const g of Object.values(parts))if(g){g.scale(sx,1,sz);g.computeBoundingBox();}
 return parts;
}
export default function TownBistroFurniture({id,size}:{id:string;size?:number}){
 const parts=useMemo(()=>makeBistroFurniture(id),[id]);
 const extent=Math.max(...getBuildAsset(id)!.bounds),scale=size===undefined?1:size/extent;
 useEffect(()=>()=>Object.values(parts).forEach(g=>g?.dispose()),[parts]);
 return <group scale={scale}>
  <mesh geometry={parts.metal} dispose={null} castShadow receiveShadow><meshStandardMaterial color={P.forest} metalness={.32} roughness={.48}/></mesh>
  <mesh geometry={parts.wood} dispose={null} castShadow receiveShadow><meshStandardMaterial color='#a37c50' roughness={.72}/></mesh>
  {parts.ceramic&&<mesh geometry={parts.ceramic} dispose={null} castShadow receiveShadow><meshStandardMaterial color={P.cream} roughness={.65}/></mesh>}
 </group>;
}
