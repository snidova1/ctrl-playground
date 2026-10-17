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
   // PR31 silhouette pass: layered volumes and recognizable district-specific
   // porches, roof dormers and galleries. Everything belongs to the same
   // batched material buckets as the structural shells.
   const frontage=d/2+.035;
   if(index%4===0){
    // A roof-breaking loft is visible from the street even at medium distance.
    const fw=Math.min(w*.42,2.9),fz=d/2-.75,fx=-w*.17;
    box(h.wall,fx,height+.43,fz,fw,.96,1.35);
    append(`roof:${h.roof}`,makeTownRoof(fw,1.35,.73,'gambrel')
      .applyMatrix4(new Matrix4().makeTranslation(h.x+fx,height+.91,h.z+fz)));
    box('#527565',fx,height+.34,fz+.705,.65,.53,.075);
    box('#f8ecd3',fx,height+.34,fz+.75,.8,.07,.1);
   }else if(index%4===1){
    // A two-storey front bay changes the building's primary massing.
    const bx=w*.26;
    box(h.wall,bx,height*.53,frontage-.28,w*.31,height*.86,.64);
    append(`roof:${h.roof}`,makeTownRoof(w*.33,1.05,.55,'hip')
      .applyMatrix4(new Matrix4().makeTranslation(h.x+bx,height*.96,h.z+frontage-.3)));
    box('#f8ecd3',bx,1.8,frontage+.1,w*.22,1.05,.1);
    box('#527565',bx,1.8,frontage+.17,w*.17,.83,.065);
   }else if(index%4===2){
    // Lower, wider covered frontage for a market/studio silhouette.
    box(`roof:${h.roof}`,0,3.06,frontage+.22,w*.76,.19,.82);
    for(const side of [-1,1])
     box('wood',side*w*.34,1.56,frontage+.22,.14,3.05,.14);
    box('#f8ecd3',0,3.19,frontage+.27,w*.82,.1,.93);
   }else{
    // Layered veranda rail, with upper floor offset and deep shadow line.
    box('wood',0,3.27,frontage+.27,w*.71,.16,.72);
    box('#f8ecd3',0,3.38,frontage+.29,w*.74,.12,.75);
    for(const side of [-1,1])
     box('wood',side*w*.32,2.78,frontage+.56,.12,.9,.12);
   }
   if(district==='workshop'){
    // Exposed timber framing unifies the maker quarter instead of plain boxes.
    for(const side of [-1,1])
     box('wood',side*(w/2-.34),height*.49,frontage+.03,.16,height*.92,.17);
    box('wood',0,height*.78,frontage+.07,w*.95,.16,.15);
   }
   if(district==='harbor'){
    // Wide shopfronts face the quay; projecting flat awnings stay above head height.
    box('#527565',-w*.26,1.45,frontage+.10,w*.29,2.15,.08);
    box('#f8ecd3',-w*.26,2.56,frontage+.15,w*.33,.12,.16);
    box(`roof:${h.roof}`,0,3.03,frontage+.36,w*.85,.14,.84);
   }
   if(district==='orchard'){
    for(const side of [-1,1])box('wood',side*w*.38,1.24,frontage+.1,.12,2.48,.14);
    box('#f8ecd3',0,2.78,frontage+.06,w*.89,.13,.18);
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
