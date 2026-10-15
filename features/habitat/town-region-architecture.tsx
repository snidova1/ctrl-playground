'use client';
import {useEffect,useMemo} from 'react';
import {BoxGeometry,BufferGeometry,ExtrudeGeometry,Matrix4,Shape} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {TOWN_DISTRICT_BUILDINGS,type TownDistrictKind} from './town-districts';
import {paintedTexture} from './town-surfaces';
import {makeTownRoof,type TownRoofKind} from './town-roof';

/** Detailed original facades batched by material, rather than a draw per shutter slat. */
export function makeTownRegionParts(district:TownDistrictKind){
  const buckets=new Map<string,BufferGeometry[]>();
  const append=(key:string,geometry:BufferGeometry)=>{const flat=geometry.index?geometry.toNonIndexed():geometry;if(flat!==geometry)geometry.dispose();const list=buckets.get(key)??[];list.push(flat);buckets.set(key,list);};
  for(const h of TOWN_DISTRICT_BUILDINGS.filter(h=>h.district===district)){
   const {width:w,depth:d}=h,height=h.levels===3?6.4:4.5;
   const box=(key:string,x:number,y:number,z:number,bw:number,bh:number,bd:number,rz=0)=>append(key,new BoxGeometry(bw,bh,bd).applyMatrix4(new Matrix4().makeRotationZ(rz).setPosition(h.x+x,y,h.z+z)));
   box(h.wall,0,height/2,0,w,height,d);box('#b9ad91',0,.22,0,w+.08,.44,d+.08);
   const index=Number(h.id.split('-').at(-1)),half=w/2+.42,rise=district==='orchard'?2:1.55,angle=Math.atan2(rise,half),length=Math.hypot(half,rise);
   const roofKind:TownRoofKind|'gable'=district==='workshop'?'clerestory':district==='harbor'?(index%2?'gambrel':'hip'):district==='orchard'?'gambrel':district==='festival'?(index%2?'clerestory':'hip'):index%3===0?'gable':index%3===1?'hip':'gambrel';
   if(roofKind==='gable'){
   const gable=new Shape().moveTo(-w/2,0).lineTo(0,rise).lineTo(w/2,0).closePath();
   append(h.wall,new ExtrudeGeometry(gable,{depth:d,bevelEnabled:false}).applyMatrix4(new Matrix4().makeTranslation(h.x,height,h.z-d/2)));
   for(const side of [-1,1]){
    box(`roof:${h.roof}`,side*half/2,height+rise/2,0,length,.14,d+.9,-side*angle);
    box('#f8ecd3',side*half/2,height+rise/2,d/2+.47,length,.17,.12,-side*angle);
    box('#f8ecd3',side*(w/2-.04),height/2,d/2+.05,.15,height,.15);
   }
   box(`roof:${h.roof}`,0,height+rise,0,.19,.19,d+1.02);
   }else{
    append(`roof:${h.roof}`,makeTownRoof(w,d,rise,roofKind).applyMatrix4(new Matrix4().makeTranslation(h.x,height,h.z)));
    box('#f8ecd3',0,height-.035,0,w+.78,.13,d+.78);
   }
   box('#bd957e',w*.28,height+.65,-d*.23,.55,1.5,.6);
   box('#e8d6b8',w*.28,height+1.4,-d*.23,.72,.14,.77);
   box('#678b7c',0,1.15,d/2+.09,1.05,2.25,.15);
   for(const x of [-.59,.59])box('#f8ecd3',x,1.18,d/2+.17,.12,2.5,.12);
   box('#f8ecd3',0,2.43,d/2+.17,1.3,.13,.12);
   box('#d4b36d',.37,1.18,d/2+.21,.08,.08,.08);
   box('#c5b396',0,.11,d/2+.65,2.6,.22,1.3);
   box('#dcd0b9',0,.055,d/2+1.38,3,.11,.45);
   if(district==='harbor')for(let y=.8;y<height;y+=.42)box('wood',0,y,d/2+.035,w,.045,.06);
   if(district==='workshop')for(const x of [-w*.43,0,w*.43])box('wood',x,height*.63,d/2+.07,.12,height*.7,.12);
   if(district==='orchard')for(const side of [-1,1])box('#f8ecd3',side*.46,3.42,d/2+.11,1.25,.1,.08,side*.55);
   const window=(x:number,y:number,z:number,side=0)=>{
    if(side){
     box('#527565',x,y,z,.08,1.15,1.04);
     box('#f8ecd3',x+side*.07,y,z,.08,1.2,.06);
     box('#f8ecd3',x+side*.07,y,z,.08,.06,1.12);
     for(const dz of [-.57,.57])box('#f8ecd3',x+side*.045,y,z+dz,.12,1.32,.07);
     for(const dy of [-.63,.63])box('#f8ecd3',x+side*.045,y+dy,z,.12,.07,1.21);
    }else{
     box('#527565',x,y,z,1.05,1.15,.07);
     for(const dx of [-.59,.59])box('#f8ecd3',x+dx,y,z+.06,.08,1.32,.1);
     for(const dy of [-.63,.63])box('#f8ecd3',x,y+dy,z+.06,1.26,.08,.1);
     box('#f8ecd3',x,y,z+.075,.055,1.23,.07);box('#f8ecd3',x,y,z+.075,1.19,.055,.07);
     for(const dx of [-.82,.82]){box('#8fa793',x+dx,y,z+.03,.34,1.25,.1);for(let i=0;i<5;i++)box('#a7bd9b',x+dx,y-.47+i*.23,z+.11,.29,.045,.07);}
     box('wood',x,y-.83,z+.22,1.38,.25,.43);
     for(const dx of [-.4,0,.4]){box('#9cb184',x+dx,y-.57,z+.2,.16,.22,.15);box('#e5b39b',x+dx,y-.43,z+.2,.18,.12,.18);}
    }
   };
   for(const x of [-w*.29,w*.29])window(x,2.63,d/2+.1);
   for(const side of [-1,1])for(const z of [-d*.24,d*.24])window(side*(w/2+.05),2.63,z,side);
   if(h.levels===3)for(const x of [-w*.29,w*.29])window(x,5.1,d/2+.1);
   if(roofKind!=='hip'){
    const loftWidth=roofKind==='clerestory'?w*.43:.54;
    box('#527565',0,height+.65,d/2+.015,loftWidth,.5,.06);
    box('#f8ecd3',0,height+.65,d/2+.06,.06,.56,.06);
    box('#f8ecd3',0,height+.65,d/2+.06,loftWidth+.05,.06,.06);
   }
  }
  return [...buckets].map(([key,geometries])=>{const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw new Error('Incompatible district geometry: '+key);return {key,geometry};});
}
export default function TownRegionArchitecture({district}:{district:TownDistrictKind}){
 const parts=useMemo(()=>makeTownRegionParts(district),[district]);
 const textures=useMemo(()=>({roof:paintedTexture('roof'),wood:paintedTexture('wood')}),[]);
 useEffect(()=>()=>parts.forEach(p=>p.geometry.dispose()),[parts]);
 return <group>{parts.map(p=><mesh key={p.key} geometry={p.geometry} castShadow receiveShadow dispose={null}><meshStandardMaterial color={p.key.startsWith('roof:')?p.key.slice(5):p.key==='wood'?'#b7a080':p.key} map={p.key.startsWith('roof:')?textures.roof:p.key==='wood'?textures.wood:undefined} roughness={.95}/></mesh>)}</group>;
}
