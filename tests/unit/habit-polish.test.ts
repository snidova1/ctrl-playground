import {describe,it,expect} from 'vitest';
import {adaptVrmToLilToon,LILTOON_EXTENSION} from '../../features/plaza/characters/liltoon-adapter';
import {EXTERIOR_HOME,intersectsExteriorHouse} from '../../features/habitat/exterior-layout';
import {ghibliBand} from '../../features/habitat/ghibli-shading';

describe('cottage polish regressions',()=>{
 it('enlarges the actual cottage and keeps ground picking outside its footprint',()=>{
  expect(EXTERIOR_HOME.scale).toBe(1.75);
  expect(intersectsExteriorHouse(5,-4)).toBe(true);
  expect(intersectsExteriorHouse(0,1)).toBe(true);
  expect(intersectsExteriorHouse(7,-4)).toBe(false);
  expect(intersectsExteriorHouse(7,-4,2,1)).toBe(true);
  expect(intersectsExteriorHouse(0,3)).toBe(false);
 });
 it('provides four ordered toon bands',()=>{
  expect([0,.3,.6,1].map(ghibliBand)).toEqual([0,1,2,3]);
 });
 it('adapts legacy MToon before loading without changing original texture references',()=>{
  const json={materials:[{alphaMode:'MASK',alphaCutoff:.4,doubleSided:true,extensions:{} as Record<string,any>},{name:'non-toon'}],extensions:{VRM:{materialProperties:[{shader:'VRM/MToon',vectorProperties:{_Color:[.9,.8,.7,1]},textureProperties:{_MainTex:2}},{shader:'Standard'}]}},extensionsUsed:[] as string[]};
  expect(adaptVrmToLilToon(json,'high')).toBe(1);
  const material=json.materials[0].extensions![LILTOON_EXTENSION];
  expect(material.renderMode).toBe('cutout');
  expect(material.textures._MainTex).toBe(2);
  expect(material.properties).toMatchObject({_Color:[.9,.8,.7,1],_Cull:0,_Cutoff:.4});
  expect(material.properties._OutlineWidth).toBeGreaterThan(0);
  expect(json.extensions.VRM.materialProperties[0].textureProperties?._MainTex).toBe(2);
  expect(adaptVrmToLilToon(json,'high')).toBe(0);
  expect(json.extensionsUsed).toEqual([LILTOON_EXTENSION]);
 });
 it('adapts modern MToon and disables auxiliary mobile outlines',()=>{
  const json={materials:[{alphaMode:'BLEND',pbrMetallicRoughness:{baseColorFactor:[1,.5,.4,1],baseColorTexture:{index:0}},extensions:{VRMC_materials_mtoon:{shadeColorFactor:[.5,.4,.3]}} as Record<string,any>}]};
  expect(adaptVrmToLilToon(json,'low')).toBe(1);
  const material=json.materials[0].extensions[LILTOON_EXTENSION];
  expect(material).toMatchObject({renderMode:'transparent',textures:{_MainTex:0},properties:{_OutlineWidth:0,_ShadowColor:[.5,.4,.3,1]}});
 });
});
