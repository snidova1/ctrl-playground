'use client';
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {animate,createScope} from 'animejs';
import 'animejs/adapters/three';
import {useGLTF} from '@react-three/drei';
import {Box3,Mesh,Vector3,type Group} from 'three';
import {animeMaterial} from './town-anime-material';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS} from './public-world-geography';
import TownSign from './town-sign';

/**
 * PR32: curated textured CC0 GLB models, not house and tree primitives.
 * The asset pack is pinned and committed with source/license/sha256 by the
 * pr32-import-art workflow. Missing files are an acceptance failure, not a
 * reason to silently show the old cube-house world again.
 */
export const ANIME_MESH_ASSET_IDS=[
 'bakery','cottage-house','farmhouse','flower-shop','garden-shed',
 'log-cabin','cafe','willow-tree','oak-tree','cherry-blossom-tree',
 'bush','daisy-patch',
] as const;
export type AnimeMeshId=(typeof ANIME_MESH_ASSET_IDS)[number];

const HOME_SELECTION:readonly AnimeMeshId[]=[
 'bakery','cottage-house','farmhouse','log-cabin',
 'cottage-house','garden-shed'
];
const SHOP_SELECTION:readonly AnimeMeshId[]=['cafe','flower-shop'];

export type AnimeMeshPlacement={
 id:AnimeMeshId;x:number;z:number;width:number;depth:number;yaw?:number;
};
export const ANIME_VILLAGE_PLACEMENTS:readonly AnimeMeshPlacement[]=[
 ...PUBLIC_WORLD_BUILDINGS.map((h,i)=>({
  id:HOME_SELECTION[i],x:h.x,z:h.z,width:h.width,depth:h.depth,
  yaw:i===4||i===5?Math.PI:0,
 })),
 ...PUBLIC_WORLD_SHOPS.map((h,i)=>({
  id:SHOP_SELECTION[i],x:h.x,z:h.z,width:h.width,depth:h.depth,
  yaw:0,
 })),
];

/* Hero trees from one matched set rather than hundreds of mismatched spheres.
 * They frame camera paths but sit outside the town's original tree obstacles.
 * The importer includes the GLB's full textures and original sculpted mesh.
 */
/**
 * Three depths of sculpted canopy, composed from the player's eye-level view.
 * The four FRONT willows make an actual forested square, not miniature trees
 * dotted against distant cube-house silhouettes. Keep the main X=0 walkway
 * visually open, and ground tree trunks in the bordering planted plots.
 */
const WILLOWS:readonly AnimeMeshPlacement[]=[
 // First quartet is mandatory even on phones.
 {id:'willow-tree',x:-16.2,z:4.6,width:13.2,depth:12.6,yaw:.5},
 {id:'willow-tree',x:16.1,z:4.9,width:13.4,depth:12.7,yaw:2.3},
 {id:'willow-tree',x:-18,z:-12.6,width:12.0,depth:11.7,yaw:1.25},
 {id:'willow-tree',x:17.4,z:-12.9,width:12.2,depth:11.7,yaw:2.15},
 // Midground and outer approach, high setting only.
 {id:'willow-tree',x:-35,z:19,width:12.5,depth:12.5,yaw:1.3},
 {id:'willow-tree',x:35,z:18,width:13.0,depth:13.0,yaw:2},
 {id:'willow-tree',x:-33,z:37,width:11.5,depth:11.5,yaw:.8},
 {id:'willow-tree',x:35,z:-33,width:10.8,depth:10.8,yaw:.8},
];
// An orchard ridge hides the flat distant development silhouette in the
// default camera. Stagger sizes/depth so it reads as a real forest edge,
// without placing extra solid geometry in the server-owned road corridor.
const DISTANT_ORCHARD:readonly AnimeMeshPlacement[]=[
 {id:'oak-tree',x:-44,z:-39,width:11.5,depth:10.5,yaw:.4},
 {id:'willow-tree',x:-29,z:-42,width:11.0,depth:10.0,yaw:2.3},
 {id:'cherry-blossom-tree',x:-12,z:-44,width:10.5,depth:10.1,yaw:1.4},
 {id:'oak-tree',x:12,z:-45,width:10.2,depth:10.3,yaw:.8},
 {id:'cherry-blossom-tree',x:30,z:-42,width:11.2,depth:10.7,yaw:1.2},
 {id:'willow-tree',x:44,z:-40,width:11.8,depth:10.9,yaw:2.7},
];
export const ANIME_VILLAGE_TREE_PLACEMENTS=WILLOWS;
const GROVE_ACCENTS:readonly AnimeMeshPlacement[]=[
 // First two paint a green / blossom silhouette beside the village houses.
 {id:'oak-tree',x:-29.5,z:-4.5,width:11,depth:10.7,yaw:.9},
 {id:'cherry-blossom-tree',x:29.3,z:-4.8,width:11.2,depth:10.8,yaw:.4},
 {id:'oak-tree',x:-28.5,z:27,width:9,depth:9,yaw:1.1},
 {id:'cherry-blossom-tree',x:28.4,z:28,width:9,depth:9,yaw:.3},
 {id:'oak-tree',x:-36,z:-22,width:9.5,depth:9.5,yaw:2.3},
 {id:'cherry-blossom-tree',x:36,z:-21,width:9.5,depth:9.5,yaw:1.6},
];
/** Planting beds follow the edge of the WALKABLE area, not blocking a road.
 * Meshes have no gameplay collision and never alter player/server coordinates.
 */
const FLOWER_BANKS:readonly AnimeMeshPlacement[]=[
 {id:'bush',x:-7,z:17,width:2.25,depth:2.25},
 {id:'bush',x:-10,z:15,width:2.05,depth:2.05},
 {id:'bush',x:7,z:17,width:2.25,depth:2.25},
 {id:'bush',x:10,z:15,width:2.05,depth:2.05},
 {id:'bush',x:-18,z:32,width:2.4,depth:2.4},
 {id:'bush',x:18,z:32,width:2.4,depth:2.4},
 {id:'bush',x:-26,z:-12,width:2.5,depth:2.5},
 {id:'bush',x:25,z:-12,width:2.5,depth:2.5},
 {id:'daisy-patch',x:-7,z:21,width:3.5,depth:3.5,yaw:.3},
 {id:'daisy-patch',x:8,z:21,width:3.2,depth:3.2,yaw:1.3},
 {id:'daisy-patch',x:-17,z:29,width:3.1,depth:3.1},
 {id:'daisy-patch',x:17,z:29,width:3.1,depth:3.1},
 // Real textured flowers edge both sides of the player-facing central road.
 // Place these in authored clusters, rather than procedural confetti dots.
 {id:'bush',x:-6.3,z:11.1,width:2.2,depth:2.2,yaw:.2},
 {id:'bush',x:-7.5,z:14.2,width:2.8,depth:2.8,yaw:1.4},
 {id:'bush',x:-7.1,z:24,width:2.8,depth:2.8,yaw:2},
 {id:'bush',x:6.2,z:10.7,width:2.2,depth:2.2,yaw:2.8},
 {id:'bush',x:7.7,z:14.8,width:2.9,depth:2.9,yaw:2.1},
 {id:'bush',x:7.1,z:24,width:2.8,depth:2.8,yaw:.5},
 {id:'daisy-patch',x:-5.2,z:11.6,width:2.7,depth:2.6,yaw:2.2},
 {id:'daisy-patch',x:-6.2,z:15.1,width:3.5,depth:2.7,yaw:.4},
 {id:'daisy-patch',x:-5.7,z:19.2,width:3.2,depth:3.4,yaw:1.3},
 {id:'daisy-patch',x:-7.4,z:25.8,width:3.4,depth:3.0,yaw:.9},
 {id:'daisy-patch',x:5.3,z:11.5,width:2.8,depth:2.6,yaw:.3},
 {id:'daisy-patch',x:6.1,z:15.7,width:3.4,depth:2.7,yaw:1.1},
 {id:'daisy-patch',x:5.9,z:19.3,width:3.2,depth:3.3,yaw:2.5},
 {id:'daisy-patch',x:7.6,z:25.3,width:3.3,depth:3.1,yaw:.7},
 // A foreground botanical frame without obstructing the native movement lane.
 {id:'bush',x:-13.8,z:11.5,width:3,depth:3,yaw:.9},
 {id:'bush',x:13.8,z:12,width:3.1,depth:3.1,yaw:2.1},
 {id:'daisy-patch',x:-12.3,z:9.7,width:3.9,depth:2.9,yaw:1.2},
 {id:'daisy-patch',x:12.5,z:9.7,width:4,depth:2.9,yaw:2.6},
];


function LoadedAnimeMesh({placement}: {placement:AnimeMeshPlacement}){
 const breezePivot=useRef<Group>(null);
 const {scene}=useGLTF('/assets/pr32/'+placement.id+'.glb');
 // Anime.js v4 Three adapter: animate the actual GLB parent pivot, never
 // overwrite R3F camera/controller/server-authoritative player transforms.
 // Scope cleanup prevents stacked timers when town LOD is remounted.
 useEffect(()=>{
  if(!breezePivot.current||!['willow-tree','oak-tree','cherry-blossom-tree'].includes(placement.id))return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const offset=Math.abs(placement.x*13+placement.z*17);
  const scope=createScope().add(()=>{
   animate(breezePivot.current!,{
    rotateZ:[-.7,.7],
    rotateX:[-.36,.36],
    duration:3600+(offset%7)*175,
    delay:(offset%5)*190,
    alternate:true,
    loop:true,
    ease:'inOutSine'
   });
  });
  return()=>scope.revert();
 },[placement.id,placement.x,placement.z]);
 const model=useMemo(()=>{
  const base=scene.clone(true);
  // We clone materials so disabling metallic highlights never mutates the
  // shared cached GLB, or materials used by Common Ground/Habitat.
  base.traverse(obj=>{
   if(!(obj instanceof Mesh))return;
   obj.castShadow=true;obj.receiveShadow=true;
   const foliage=['willow-tree','oak-tree','cherry-blossom-tree','bush','daisy-patch']
    .includes(placement.id);
   obj.material=Array.isArray(obj.material)
    ?obj.material.map(mat=>animeMaterial(mat,foliage))
    :animeMaterial(obj.material,foliage);
  });
  base.updateMatrixWorld(true);
  const bound=new Box3().setFromObject(base),size=bound.getSize(new Vector3()),
   center=bound.getCenter(new Vector3());
  const scale=Math.min(
   placement.width/Math.max(.01,size.x),
   placement.depth/Math.max(.01,size.z)
  );
  base.scale.setScalar(scale);
  base.position.set(-center.x*scale,-bound.min.y*scale,-center.z*scale);
  return base;
 },[scene,placement.id,placement.width,placement.depth]);
 useEffect(()=>{
  const doc=document.documentElement;
  doc.dataset.pr32LoadedMeshes=String(Number(doc.dataset.pr32LoadedMeshes||0)+1);
  return()=>{doc.dataset.pr32LoadedMeshes=String(Math.max(0,Number(doc.dataset.pr32LoadedMeshes||0)-1));};
 },[model]);
 useEffect(()=>()=>model.traverse(obj=>{
  if(obj instanceof Mesh)for(const m of [obj.material].flat())m.dispose();
 }),[model]);
 return <group position={[placement.x,0,placement.z]} rotation-y={placement.yaw??0}>
  <group ref={breezePivot}><primitive object={model} dispose={null}/></group>
 </group>;
}
export default function TownAnimeMeshes({quality}:{quality:'low'|'high'}){
 return <group name="PR32-Real-CC0-Textured-Meshes">
  {ANIME_VILLAGE_PLACEMENTS.map((p,i)=>
   <group key={'b'+i}>
    <Suspense fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>
    <group position={[p.x,0,p.z]}>
     <TownSign text={i<PUBLIC_WORLD_BUILDINGS.length?PUBLIC_WORLD_BUILDINGS[i].name:
      i===PUBLIC_WORLD_BUILDINGS.length?'WILLOW CAFÉ':'FLOWER MARKET'}
      position={[0,6.3,p.depth/2]} distanceFactor={5} occlude={[]}/>
    </group>
   </group>)}
  {WILLOWS.filter((_,i)=>quality==='high'||i<4).map((p,i)=>
   <Suspense key={'t'+i} fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>)}
  {GROVE_ACCENTS.filter((_,i)=>quality==='high'||i<2).map((p,i)=>
   <Suspense key={'grove'+i} fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>)}
  {DISTANT_ORCHARD.filter((_,i)=>quality==='high'||i%2===0).map((p,i)=>
   <Suspense key={'ridge'+i} fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>)}
  {FLOWER_BANKS.filter((_,i)=>quality==='high'||i%2===0).map((p,i)=>
   <Suspense key={'flowers'+i} fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>)}
 </group>;
}
