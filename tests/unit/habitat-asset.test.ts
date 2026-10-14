import {describe,it,expect,vi} from 'vitest';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,Texture} from 'three';
import {cloneHabitatAsset,habitatMaterial} from '@/features/habitat/habitat-asset';
describe('consistent diffuse Habitat and interior asset materials',()=>{
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
 it('shares immutable geometry, owns materials once per model and never disposes cached originals',()=>{
  const scene=new Group(),geometry=new BoxGeometry(),source=new MeshStandardMaterial({metalness:1});
  scene.add(new Mesh(geometry,source),new Mesh(geometry,[source,source]));
  const a=cloneHabitatAsset(scene),b=cloneHabitatAsset(scene),first=a.object.children[0] as Mesh,second=a.object.children[1] as Mesh;
  expect(first.geometry).toBe(geometry);expect((second.material as MeshStandardMaterial[])[0]).toBe(first.material);expect(first.material).not.toBe((b.object.children[0] as Mesh).material);
  expect(first.castShadow&&first.receiveShadow).toBe(true);
  const owned=vi.spyOn(first.material as MeshStandardMaterial,'dispose'),cached=vi.spyOn(source,'dispose'),geo=vi.spyOn(geometry,'dispose');a.dispose();expect(owned).toHaveBeenCalledTimes(1);expect(cached).not.toHaveBeenCalled();expect(geo).not.toHaveBeenCalled();
 });
});
