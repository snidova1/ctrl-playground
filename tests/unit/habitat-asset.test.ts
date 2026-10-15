import {describe,it,expect,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture} from 'three';
import {cloneHabitatAsset,habitatMaterial} from '@/features/habitat/habitat-asset';
import {TOWN_PALETTE} from '@/features/habitat/town-palette';
import {townMaterial} from '@/features/habitat/town-assets';
describe('consistent diffuse Habitat and interior asset materials',()=>{
 it('keeps batched public-room furniture and glass identical to their interactive Habitat finish',()=>{
  for(const name of ['wood','colormap','leaf-green','glass','steel']){
   const source=new MeshStandardMaterial({color:'#c78e69',metalness:.8,roughness:.2,map:new Texture()});source.name=name;
   for(const wind of [false,true]){
    const expected=habitatMaterial(source,wind) as MeshStandardMaterial,actual=townMaterial(source,'room',wind) as MeshStandardMaterial;
    expect(actual.color.equals(expected.color)).toBe(true);expect(actual.map).toBe(source.map);
    expect(actual.metalness).toBe(expected.metalness);expect(actual.roughness).toBe(expected.roughness);
    expect(actual.customProgramCacheKey()).toBe(expected.customProgramCacheKey());
    actual.dispose();expected.dispose();
   }
   expect(source.metalness).toBe(.8);expect(source.color.getHexString()).toBe('c78e69');
  }
 });
 it('keeps source colors/textures without dark metallic vegetation or cache mutation',()=>{
  const source=new MeshStandardMaterial({color:'#73a083',metalness:1,roughness:.1,map:new Texture()}),color=source.color.clone();source.name='leaf-green';
  const result=habitatMaterial(source) as MeshStandardMaterial;
  expect(result).not.toBe(source);expect(result.color.equals(color)).toBe(true);expect(result.map).toBe(source.map);expect(result.metalness).toBe(0);expect(result.roughness).toBe(.75);
  expect(source.metalness).toBe(1);expect(source.roughness).toBe(.1);
 });
 it('retains authored metal/glass finishes',()=>{
  for(const name of ['steel','chrome metal','glass']){const source=new MeshStandardMaterial({metalness:.8,roughness:.2});source.name=name;const own=habitatMaterial(source) as MeshStandardMaterial;expect(own.metalness).toBe(.8);expect(own.roughness).toBe(.2);}
 });
 it('uses the shared foliage shader only on owned leaf/petal material copies',()=>{
  const leaf=new MeshStandardMaterial();leaf.name='leaf-green';const wood=new MeshStandardMaterial();wood.name='wood';
  expect(habitatMaterial(leaf,true).customProgramCacheKey()).toBe('ctrl-root-anchored-foliage-v1');
  expect(habitatMaterial(wood,true).customProgramCacheKey()).not.toBe('ctrl-root-anchored-foliage-v1');expect(leaf.customProgramCacheKey()).not.toBe('ctrl-root-anchored-foliage-v1');
 });
 it('harmonizes opted-in nature leaves and bark, preserving flowers, maps and furniture',()=>{
  for(const name of ['leafsGreen','grass','plant']){
   const source=new MeshStandardMaterial({color:'#29c9ab',map:new Texture()});source.name=name;const color=source.color.clone();
   const own=habitatMaterial(source,true) as MeshStandardMaterial;
   expect(own.color.getHexString()).toBe(TOWN_PALETTE.sage.slice(1));expect(own.map).toBe(source.map);expect(source.color.equals(color)).toBe(true);
   expect(own.customProgramCacheKey()).toBe('ctrl-root-anchored-foliage-v1');
   expect((habitatMaterial(source) as MeshStandardMaterial).color.equals(color)).toBe(true);
  }
  const bark=new MeshStandardMaterial();bark.name='woodBark';expect((habitatMaterial(bark,true) as MeshStandardMaterial).color.getHexString()).toBe(TOWN_PALETTE.wood.slice(1));
  const petal=new MeshStandardMaterial({color:'#ba7759'});petal.name='petal';expect((habitatMaterial(petal,true) as MeshStandardMaterial).color.equals(petal.color)).toBe(true);
 });
 it('shares immutable geometry, owns materials once per model and never disposes cached originals',()=>{
  const scene=new Group(),geometry=new BoxGeometry(),source=new MeshStandardMaterial({metalness:1});
  scene.add(new Mesh(geometry,source),new Mesh(geometry,[source,source]));
  const a=cloneHabitatAsset(scene),b=cloneHabitatAsset(scene),first=a.object.children[0] as Mesh,second=a.object.children[1] as Mesh;
  expect(first.geometry).toBe(geometry);expect((second.material as MeshStandardMaterial[])[0]).toBe(first.material);expect(first.material).not.toBe((b.object.children[0] as Mesh).material);
  expect(first.castShadow&&first.receiveShadow).toBe(true);
  const owned=vi.spyOn(first.material as MeshStandardMaterial,'dispose'),cached=vi.spyOn(source,'dispose'),geo=vi.spyOn(geometry,'dispose');a.dispose();expect(owned).toHaveBeenCalledTimes(1);expect(cached).not.toHaveBeenCalled();expect(geo).not.toHaveBeenCalled();
 });
});
