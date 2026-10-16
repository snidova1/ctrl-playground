'use client';
import {Suspense,useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,InstancedMesh,Material,Matrix4,Mesh,MeshStandardMaterial,Object3D} from 'three';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {TOWN_PALETTE as P} from './town-palette';
import {paintedTexture} from './town-surfaces';
import TownBistroFurniture,{BISTRO_FURNITURE} from './town-bistro-furniture';
import TownMeadowFlowers from './town-meadow-flowers';

export type AssetPlacement={x:number;z:number;y?:number;size:number;yaw?:number};
export type TownAssetTone='natural'|'stone'|'foliage'|'room'|'room-floor'|'room-wall';
const foliageTime={value:0};
export function TownFoliageClock(){useFrame(({clock})=>{foliageTime.value=clock.elapsedTime;});return null;}
/** Original WebGL wind extension. One shared gust clock, instanced world-space
 * phase and height-squared anchoring; no imported shader/postprocess stack. */
export function attachTownWind(material:MeshStandardMaterial){
 material.onBeforeCompile=shader=>{
  shader.uniforms.ctrlWindTime=foliageTime;
  shader.vertexShader='uniform float ctrlWindTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec4 ctrlOrigin=vec4(0.0,0.0,0.0,1.0);
    #ifdef USE_INSTANCING
      ctrlOrigin=instanceMatrix*ctrlOrigin;
    #endif
    ctrlOrigin=modelMatrix*ctrlOrigin;
    float ctrlHeight=clamp(position.y,0.0,1.4);
    float ctrlGust=sin(ctrlWindTime*1.15+ctrlOrigin.x*.31+ctrlOrigin.z*.27);
    transformed.x+=(ctrlGust*.07+sin(ctrlWindTime*.54+ctrlOrigin.z)*.02)*ctrlHeight*ctrlHeight;
    transformed.z+=cos(ctrlWindTime*.83+ctrlOrigin.z*.33)*.035*ctrlHeight*ctrlHeight;`);
 };
 material.customProgramCacheKey=()=> 'ctrl-root-anchored-foliage-v1';
 return material;
}
/** Original GLB materials are cloned: never mutate cached Habitat/Common Ground assets.
 * Some licensed Nature Kit GLBs export metalness=1; vegetation must be diffuse.
 */
export function townMaterial(source:Material,tone:TownAssetTone='natural',wind=false,tint?:string){
 const material=source.clone();
 if(material instanceof MeshStandardMaterial){
  if(tone==='room'||tone==='room-floor'||tone==='room-wall'){
   // Match the unbatched Habitat finish; never recolor furniture or mutate the
   // cached source. Shared painted maps are immutable and owned by their cache.
   if(!/metal|steel|chrome|glass/i.test(material.name)){
    material.metalness=0;material.roughness=Math.max(.75,material.roughness);
    if(wind&&/grass|leaf|green|plant/i.test(material.name))material.color.set(P.sage);
    else if(wind&&/bark/i.test(material.name))material.color.set(P.wood);
    if(wind&&/grass|leaf|green|plant|flower|petal/i.test(material.name))attachTownWind(material);
   }
   if(tone==='room-floor'){material.color.set('#ffffff');material.map=paintedTexture('floorboards');material.roughness=1;}
   if(tone==='room-wall'&&!/glass|metal|steel|chrome/i.test(material.name)){
    material.map=null;material.color.set(tint??'#e3dbc5');material.roughness=1;
   }
   return material;
  }
  material.metalness=0;material.roughness=.9;
  if(/grass|leaf|green/i.test(material.name))material.color.set(P.sage);
  else if(tone==='stone')material.color.set(P.pot);
  else if(/wood|bark/i.test(material.name))material.color.set(P.wood);
  if(wind&&/grass|leaf|green|flower|petal/i.test(material.name))attachTownWind(material);
 }
 return material;
}
export function useTownParts(id:string,tone:TownAssetTone='natural',tint?:string){
 const asset=getBuildAsset(id);if(!asset)throw Error('Unknown bundled town asset: '+id);
 const {scene}=useGLTF(asset.url);
 const parts=useMemo(()=>{
  const entries:{geometry:BufferGeometry;material:Material|Material[]}[]=[];
  scene.updateMatrixWorld(true);
  const origin=new Matrix4().makeTranslation(-asset.center[0],-(asset.center[1]-asset.bounds[1]/2),-asset.center[2]);
  scene.traverse((object:Object3D)=>{
   if(!(object instanceof Mesh))return;
   const wind=/nature-kit\/(tree_|plant_|flower_|grass_)|pottedPlant/.test(id);
   const geometry=object.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(origin,object.matrixWorld));
   if(tone==='room-floor'){
    // The kit's atlas UVs address one tiny color swatch. Project the replacement
    // wood in floor space instead, with exact 2m tile joins across all instances.
    const positions=geometry.getAttribute('position'),uv=new Float32Array(positions.count*2);
    for(let i=0;i<positions.count;i++){uv[i*2]=(positions.getX(i)+1)/2;uv[i*2+1]=(positions.getZ(i)+1)/2;}
    geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
   }
   entries.push({geometry,material:Array.isArray(object.material)?object.material.map(m=>townMaterial(m,tone,wind,tint)):townMaterial(object.material,tone,wind,tint)});
  });
  return entries;
 },[asset,scene,tone,id,tint]);
 useEffect(()=>()=>{for(const part of parts){part.geometry.dispose();for(const material of [part.material].flat())material.dispose();}},[parts]);
 return {parts,extent:Math.max(...asset.bounds)};
}
function LoadedInstances({id,placements,tone,castShadow,tint}:{id:string;placements:readonly AssetPlacement[];tone:TownAssetTone;castShadow:boolean;tint?:string}){
 const {parts,extent}=useTownParts(id,tone,tint);
 const roots=useRef<(InstancedMesh|null)[]>([]);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),rotation=new Matrix4();
  placements.forEach((p,i)=>{
   const scale=p.size/extent;
   matrix.makeScale(scale,scale,scale);rotation.makeRotationY(p.yaw??0);matrix.premultiply(rotation);matrix.setPosition(p.x,p.y??0,p.z);
   for(const root of roots.current)root?.setMatrixAt(i,matrix);
  });
  for(const root of roots.current)if(root){root.instanceMatrix.needsUpdate=true;root.computeBoundingSphere();}
 },[extent,placements,parts]);
 return <group>{parts.map((part,i)=><instancedMesh key={i} ref={root=>{roots.current[i]=root;}} args={[part.geometry,part.material,placements.length]} receiveShadow castShadow={castShadow} dispose={null}/>)}</group>;
}
export function TownAssetInstances({id,placements,tone='natural',castShadow=false,tint}:{id:string;placements:readonly AssetPlacement[];tone?:TownAssetTone;castShadow?:boolean;tint?:string}){
 return <Suspense fallback={null}><LoadedInstances id={id} placements={placements} tone={tone} castShadow={castShadow} tint={tint}/></Suspense>;
}
function LoadedAsset({id,size,tone}:{id:string;size?:number;tone:TownAssetTone}){
 const {parts,extent}=useTownParts(id,tone);
 return <group scale={size===undefined?1:size/extent}>{parts.map((part,i)=><mesh key={i} geometry={part.geometry} material={part.material} receiveShadow castShadow dispose={null}/>)}</group>;
}
export function TownAsset({id,size,x=0,y=0,z=0,yaw=0,tone='natural'}:{id:string;size?:number;x?:number;y?:number;z?:number;yaw?:number;tone?:TownAssetTone}){
 return <group position={[x,y,z]} rotation-y={yaw}>{BISTRO_FURNITURE.has(id)?<TownBistroFurniture id={id} size={size}/>:id==='platformer-kit/flowers'?<TownMeadowFlowers size={size}/>:<Suspense fallback={null}><LoadedAsset id={id} size={size} tone={tone}/></Suspense>}</group>;
}
