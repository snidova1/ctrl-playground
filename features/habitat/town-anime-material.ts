import {
 DataTexture, MeshStandardMaterial, MeshToonMaterial, NearestFilter,
 NoColorSpace, RGBAFormat, UnsignedByteType, type Material
} from 'three';

/**
 * Shared PR32 illustration material. Preserve the artist-authored GLB's
 * textures, silhouettes, alpha cutouts and UVs while replacing the default
 * shiny PBR response with a warm, multi-step painted diffuse light ramp.
 *
 * Do not use one unlit flat-color material: it destroys the actual sculpt,
 * window texture detail and tree leaves that distinguish the CC0 models.
 */
const RAMP_STOPS=[38,62,87,115,144,175,201,222,240,255] as const;
export function makeAnimeLightRamp(){
 const data=new Uint8Array(RAMP_STOPS.flatMap(v=>[v,v,v,255]));
 const tex=new DataTexture(data,RAMP_STOPS.length,1,RGBAFormat,UnsignedByteType);
 tex.magFilter=NearestFilter;
 tex.minFilter=NearestFilter;
 tex.generateMipmaps=false;
 tex.colorSpace=NoColorSpace;
 tex.needsUpdate=true;
 return tex;
}
const sharedRamp=makeAnimeLightRamp();

/**
 * Buildings use illustration diffuse shading; foliage keeps most material
 * response to preserve translucent-looking cutout silhouettes and color.
 * Both variants avoid metallic highlights and retain original baked albedo.
 */
export function animeMaterial(source:Material,foliage=false):Material{
 if(!(source instanceof MeshStandardMaterial))return source.clone();
 if(foliage){
  const material=source.clone();
  material.metalness=0;
  material.roughness=1;
  material.envMapIntensity=0;
  material.color.multiplyScalar(1.035);
  material.emissiveIntensity=Math.max(material.emissiveIntensity,.035);
  material.needsUpdate=true;
  return material;
 }
 const material=new MeshToonMaterial({
  name:'PR32-anime/'+source.name,
  map:source.map,
  color:source.color.clone(),
  alphaMap:source.alphaMap,
  alphaTest:source.alphaTest,
  transparent:source.transparent,
  opacity:source.opacity,
  side:source.side,
  depthWrite:source.depthWrite,
  depthTest:source.depthTest,
  vertexColors:source.vertexColors,
  normalMap:source.normalMap,
  aoMap:source.aoMap,
  aoMapIntensity:source.aoMapIntensity,
  emissive:source.emissive.clone(),
  emissiveMap:source.emissiveMap,
  emissiveIntensity:source.emissiveIntensity,
  gradientMap:sharedRamp,
 });
 material.color.multiplyScalar(1.035);
 material.needsUpdate=true;
 return material;
}