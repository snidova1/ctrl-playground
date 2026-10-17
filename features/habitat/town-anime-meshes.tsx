'use client';
import {Suspense,useEffect,useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import {Box3,Color,Mesh,MeshStandardMaterial,Vector3,type Material} from 'three';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS} from './public-world-geography';

/**
 * PR32: curated textured CC0 GLB models, not house and tree primitives.
 * The asset pack is pinned and committed with source/license/sha256 by the
 * pr32-import-art workflow. Missing files are an acceptance failure, not a
 * reason to silently show the old cube-house world again.
 */
export const ANIME_MESH_ASSET_IDS=[
 'bakery','cottage-house','farmhouse','flower-shop','garden-shed',
 'log-cabin','cafe','willow-tree',
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
const WILLOWS:readonly AnimeMeshPlacement[]=[
 {id:'willow-tree',x:-39,z:14,width:8.4,depth:8.4,yaw:.5},
 {id:'willow-tree',x:38,z:22,width:8.7,depth:8.7,yaw:2},
 {id:'willow-tree',x:-37,z:35,width:9,depth:9,yaw:1.3},
 {id:'willow-tree',x:40,z:-8,width:8,depth:8,yaw:2.9},
 {id:'willow-tree',x:-37,z:-9,width:8,depth:8,yaw:2.2},
 {id:'willow-tree',x:31,z:38,width:8.4,depth:8.4,yaw:3.8},
 {id:'willow-tree',x:-30,z:-34,width:8.3,depth:8.3,yaw:4},
 {id:'willow-tree',x:35,z:-33,width:8.2,depth:8.2,yaw:.8},
];
export const ANIME_VILLAGE_TREE_PLACEMENTS=WILLOWS;

function LoadedAnimeMesh({placement}: {placement:AnimeMeshPlacement}){
 const {scene}=useGLTF('/assets/pr32/'+placement.id+'.glb');
 const model=useMemo(()=>{
  const base=scene.clone(true);
  // We clone materials so disabling metallic highlights never mutates the
  // shared cached GLB, or materials used by Common Ground/Habitat.
  base.traverse(obj=>{
   if(!(obj instanceof Mesh))return;
   obj.castShadow=true;obj.receiveShadow=true;
   const prepare=(mat:Material):Material=>{
    if(!(mat instanceof MeshStandardMaterial))return mat;
    const copy=mat.clone();
    copy.metalness=0;
    copy.roughness=Math.max(.87,copy.roughness);
    // Very mild fill lifts shadow regions under the browser's ACES tonemap.
    copy.emissive=new Color('#dfebd8');
    copy.emissiveIntensity=.022;
    return copy;
   };
   obj.material=Array.isArray(obj.material)?obj.material.map(prepare):prepare(obj.material);
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
 },[scene,placement.width,placement.depth]);
 useEffect(()=>()=>model.traverse(obj=>{
  if(obj instanceof Mesh)for(const m of [obj.material].flat())m.dispose();
 }),[model]);
 return <group position={[placement.x,0,placement.z]} rotation-y={placement.yaw??0}>
  <primitive object={model} dispose={null}/>
 </group>;
}
export default function TownAnimeMeshes({quality}:{quality:'low'|'high'}){
 return <group name="PR32-Real-CC0-Textured-Meshes">
  {ANIME_VILLAGE_PLACEMENTS.map((p,i)=>
   <Suspense key={'b'+i} fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>)}
  {WILLOWS.filter((_,i)=>quality==='high'||i%2===0).map((p,i)=>
   <Suspense key={'t'+i} fallback={null}><LoadedAnimeMesh placement={p}/></Suspense>)}
 </group>;
}
