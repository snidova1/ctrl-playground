'use client';

import {Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState,type RefObject} from 'react';
import {useThree,type ThreeEvent} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {Color,Group,InstancedMesh,Mesh,Object3D} from 'three';
import {CROPS,type GardenBed} from '@/domain/cozy-life';
import {getBuildAsset} from '@/features/plaza/build-assets';
import type {LifeTab} from './presentation';
import {LIFE_BED_OFFSETS,LIFE_CRAFT_MODELS,LIFE_INTERACTION_RANGE,type LifeDecoration,type LifePoint,type LifeWorldView} from './world-placement';
export {nearestLifeInteraction,nearestLifeTarget} from './world-placement';
export type {LifeWorldView} from './world-placement';

export function getCropGrowth(bed:GardenBed,now:number){
  const moist=bed.wateredAt!==null;
  const progress=!bed.crop||!moist||bed.readyAt===null?0:Math.max(0,Math.min(1,(now-bed.wateredAt!)/CROPS[bed.crop].growMs));
  const stage=!bed.crop?'empty':progress>=1?'ripe':progress>=.55?'growing':progress>=.18?'sprout':'seed';
  return {id:bed.id,crop:bed.crop,progress,stage,moist};
}
type Part={x:number;y:number;z:number;sx:number;sy:number;sz:number;color:string;angle?:number};
function Parts({parts,name,box=false}:{parts:Part[];name:string;box?:boolean}){
  const ref=useRef<InstancedMesh>(null);
  useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const object=new Object3D(),color=new Color();parts.forEach((p,i)=>{object.position.set(p.x,p.y,p.z);object.rotation.set(0,p.angle??0,0);object.scale.set(p.sx,p.sy,p.sz);object.updateMatrix();mesh.setMatrixAt(i,object.matrix);mesh.setColorAt(i,color.set(p.color));});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();},[parts]);
  if(!parts.length)return null;
  return <instancedMesh ref={ref} name={name} args={[undefined,undefined,parts.length]}>{box?<boxGeometry args={[1,1,1]}/>:<sphereGeometry args={[1,8,6]}/>}<meshStandardMaterial roughness={.95}/></instancedMesh>;
}
function makeGarden(beds:readonly GardenBed[],now:number){
  const wood:Part[]=[],soil:Part[]=[],leaves:Part[]=[],fruit:Part[]=[];
  LIFE_BED_OFFSETS.forEach((offset,index)=>{
    const bed=beds.find(b=>b.id===index)??{id:index,crop:null,plantedAt:null,wateredAt:null,readyAt:null};
    const growth=getCropGrowth(bed,now),{x,z}=offset;
    soil.push({x,y:.13,z,sx:1.58,sy:.22,sz:1.08,color:growth.moist?'#4c392e':'#92704d'});
    for(const side of [-1,1]){
      wood.push({x:x+side*.82,y:.17,z,sx:.1,sy:.34,sz:1.3,color:'#b59064'});
      wood.push({x,y:.17,z:z+side*.6,sx:1.7,sy:.34,sz:.1,color:'#cfac79'});
      for(const end of [-1,1])wood.push({x:x+side*.8,y:.2,z:z+end*.59,sx:.13,sy:.4,sz:.13,color:'#9c7852'});
    }
    // Fine furrows make empty / newly planted beds visibly intentional, not blank slabs.
    for(const row of [-.32,0,.32])soil.push({x,y:.245,z:z+row,sx:1.37,sy:.012,sz:.025,color:growth.moist?'#372c26':'#725238'});
    if(!bed.crop)return;
    for(let i=0;i<6;i++){
      const px=x+(i%3-1)*.47,pz=z+(i<3?-.26:.26),p=growth.progress;
      const h=.09+p*(bed.crop==='tomato'?.78:bed.crop==='herb'?.37:.22);
      leaves.push({x:px,y:.25+h/2,z:pz,sx:.018,sy:h/2,sz:.018,color:'#527646'});
      const count=bed.crop==='herb'?6:4;
      for(let j=0;j<count;j++){
        const angle=j/count*Math.PI*2+i*.37,r=.045+p*.1;
        leaves.push({x:px+Math.cos(angle)*r,y:.26+h*(.5+j/count*.4),z:pz+Math.sin(angle)*r,sx:.065+p*(bed.crop==='herb'?.12:.08),sy:.022+p*.012,sz:.035+p*.025,color:j%2?'#91b56b':'#5e914f',angle:-angle});
      }
      if(bed.crop==='tomato'&&p>.3){
        wood.push({x:px+.12,y:.68,z:pz,sx:.025,sy:.9,sz:.025,color:'#bba17a'});
        for(let j=0;j<3;j++)fruit.push({x:px+Math.cos(j*2.1)*.12,y:.35+h*.65+j*.07,z:pz+Math.sin(j*2.1)*.12,sx:.055+p*.035,sy:.06+p*.035,sz:.055+p*.035,color:growth.stage==='ripe'?'#d8583f':'#b2b65a'});
      }
      if(bed.crop==='turnip'&&p>.3){
        fruit.push({x:px,y:.26,z:pz,sx:.08+p*.085,sy:.06+p*.065,sz:.08+p*.085,color:'#f0debb'});
        fruit.push({x:px,y:.31+p*.015,z:pz,sx:.07+p*.07,sy:.035,sz:.07+p*.07,color:growth.stage==='ripe'?'#bf8ba5':'#d4b8b2'});
      }
      if(bed.crop==='herb'&&growth.stage==='ripe')for(let j=0;j<2;j++)fruit.push({x:px+(j?-.08:.08),y:.32+h,z:pz,sx:.027,sy:.055,sz:.027,color:'#c3b2d2'});
    }
  });
  return {wood,soil,leaves,fruit};
}
function CraftedModel({decoration}:{decoration:LifeDecoration}){
  const model=LIFE_CRAFT_MODELS[decoration.itemId],asset=getBuildAsset(model.assetId)!;
  const {scene}=useGLTF(asset.url);
  const copy=useMemo(()=>scene.clone(true),[scene]);
  // Normalize authored origin in local space BEFORE scale and user rotation. Shared GLTF
  // geometries/materials are never changed or disposed by an individual decoration.
  return <group scale={model.scale} name={`life-craft-${decoration.id}`} dispose={null}><group position={[-asset.center[0],asset.groundOffset,-asset.center[2]]}><primitive object={copy}/></group></group>;
}
export interface CozyLifeWorldSceneProps {
  view:LifeWorldView;
  onOpen:(tab:LifeTab)=>void;
  pose?:RefObject<LifePoint|null>;
  interactive?:boolean;
}
/** Read-only world layer. No default props, persistence, network, avatar or house mutations. */
export default function CozyLifeWorldScene({view,onOpen,pose,interactive=true}:CozyLifeWorldSceneProps){
  const root=useRef<Group>(null),{gl}=useThree();
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{if(!view.gardenAnchor)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),2000);return()=>clearInterval(timer);},[view.gardenAnchor?.x,view.gardenAnchor?.z]);
  const art=useMemo(()=>makeGarden(view.beds,now),[view.beds,now]);
  const growth=useMemo(()=>view.gardenAnchor?LIFE_BED_OFFSETS.map((_,id)=>getCropGrowth(view.beds.find(b=>b.id===id)??{id,crop:null,plantedAt:null,wateredAt:null,readyAt:null},now)):[],[view.beds,view.gardenAnchor,now]);
  // Throttled QA diagnostics reflect actual mounted meshes, including async crafted GLTFs.
  // No document writes in the render path or per-frame traversal.
  useEffect(()=>{
    const canvas=gl.domElement;
    const publish=()=>{let meshes=0,instances=0,craftMeshes=0;root.current?.traverse(object=>{if(object instanceof Mesh){meshes++;instances+=object instanceof InstancedMesh?object.count:1;}});for(const decoration of view.decorations??[])root.current?.getObjectByName(`life-craft-${decoration.id}`)?.traverse(object=>{if(object instanceof Mesh)craftMeshes++;});canvas.dataset.cozyLifeCraftMeshes=String(craftMeshes);canvas.dataset.cozyLifeMeshCount=String(meshes);canvas.dataset.cozyLifeInstanceCount=String(instances);canvas.dataset.cozyLifeGrowth=JSON.stringify(growth);canvas.dataset.cozyLifeGarden=view.gardenAnchor?'placed':'absent';canvas.dataset.cozyLifeDecorations=String(view.decorations?.length??0);};
    publish();const timer=setInterval(publish,2000);
    return()=>{clearInterval(timer);for(const key of ['cozyLifeCraftMeshes','cozyLifeMeshCount','cozyLifeInstanceCount','cozyLifeGrowth','cozyLifeGarden','cozyLifeDecorations'])delete canvas.dataset[key];};
  },[gl,growth,view.gardenAnchor,view.decorations]);
  const open=(event:ThreeEvent<MouseEvent>,point:LifePoint,tab:'garden'|'craft')=>{
    if(!interactive||!pose?.current)return;
    if(Math.hypot(pose.current.x-point.x,pose.current.z-point.z)>LIFE_INTERACTION_RANGE)return;
    event.stopPropagation();onOpen(tab);
  };
  return <group ref={root} name='cozy-life-world'>
    {view.gardenAnchor&&<group name='life-four-raised-crop-beds' position={[view.gardenAnchor.x,0,view.gardenAnchor.z]} onClick={event=>{
      const anchor=view.gardenAnchor!;
      const bed=LIFE_BED_OFFSETS.reduce((best,next)=>Math.hypot(event.point.x-anchor.x-next.x,event.point.z-anchor.z-next.z)<Math.hypot(event.point.x-anchor.x-best.x,event.point.z-anchor.z-best.z)?next:best);
      open(event,{x:anchor.x+bed.x,z:anchor.z+bed.z},'garden');
    }}>
      <Parts name='life-cedar-bed-frames-and-tomato-stakes' parts={art.wood} box/>
      <Parts name='life-moist-soil-and-seed-furrows' parts={art.soil} box/>
      <Parts name='life-crop-stems-and-leaves' parts={art.leaves}/>
      <Parts name='life-turnip-roots-tomatoes-herb-blossoms' parts={art.fruit}/>
    </group>}
    {(view.decorations??[]).map(decoration=><group key={decoration.id} position={[decoration.x,0,decoration.z]} rotation-y={decoration.rotation} onClick={event=>open(event,decoration,'craft')}><Suspense fallback={null}><CraftedModel decoration={decoration}/></Suspense></group>)}
  </group>;
}
