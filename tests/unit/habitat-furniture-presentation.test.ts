import {describe,expect,it,vi} from 'vitest';
import {Group,Mesh,MeshStandardMaterial,BoxGeometry} from 'three';
import {createFurniturePresentation,furnitureLightEmitter,shouldRenderFurnitureLight} from '@/features/habitat/furniture-presentation';

describe('cozy furniture presentation',()=>{
 it('clones materials per furniture instance and never mutates cached GLTF materials',()=>{
  const source=new Group(),material=new MeshStandardMaterial({color:'#6f8f70',emissive:'#111111',emissiveIntensity:.2});
  source.add(new Mesh(new BoxGeometry(1,1,1),material));
  const first=createFurniturePresentation(source),second=createFurniturePresentation(source);
  const firstMaterial=(first.scene.children[0] as Mesh).material as MeshStandardMaterial;
  const secondMaterial=(second.scene.children[0] as Mesh).material as MeshStandardMaterial;
  expect(firstMaterial).not.toBe(material);expect(secondMaterial).not.toBe(material);expect(firstMaterial).not.toBe(secondMaterial);
  first.setLampActive(true);
  expect(firstMaterial.emissiveIntensity).toBeGreaterThan(.2);expect(secondMaterial.emissiveIntensity).toBe(.2);expect(material.emissiveIntensity).toBe(.2);
  first.setLampActive(false);expect(firstMaterial.emissiveIntensity).toBe(.2);expect(firstMaterial.emissive.getHexString()).toBe('111111');
  const dispose=vi.spyOn(firstMaterial,'dispose');first.dispose();expect(dispose).toHaveBeenCalledOnce();
  second.dispose();material.dispose();(source.children[0] as Mesh).geometry.dispose();
 });
 it('places warm emitters near the visible shade and caps expensive dynamic lights by quality',()=>{
  expect(furnitureLightEmitter('furniture-kit/lampRoundFloor',[.15,.86,.18])[1]).toBeCloseTo(.68);
  expect(furnitureLightEmitter('furniture-kit/lampRoundTable',[.15,.31,.18])[1]).toBeCloseTo(.24);
  expect(shouldRenderFurnitureLight(1,'low')).toBe(true);expect(shouldRenderFurnitureLight(2,'low')).toBe(false);
  expect(shouldRenderFurnitureLight(3,'high')).toBe(true);expect(shouldRenderFurnitureLight(4,'high')).toBe(false);
 });
});
