import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it,vi} from 'vitest';
import {Box3,Group,Mesh,MeshStandardMaterial,Vector3} from 'three';
import type {VRM,VRMHumanBoneName} from '@pixiv/three-vrm';
import AppearanceControls from '@/features/habitat/appearance-controls';
import {characterProfileInputSchema} from '@/domain/habitat';
import {applyCharacterAccessories,clearCharacterAccessories} from '@/features/plaza/characters/accessories';
import {defaultAppearance,normalizeAppearance,resolveCharacter,seededAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';

function fixture(missing=false){
 const scene=new Group(),bones=new Map<VRMHumanBoneName,Group>();
 for(const name of ['head','neck','chest'] as const){const bone=new Group();scene.add(bone);bones.set(name,bone);}
 const vrm={scene,humanoid:{getNormalizedBoneNode:(name:VRMHumanBoneName)=>missing?null:bones.get(name)??null}} as unknown as VRM;
 return {vrm,scene,bones};
}
function meshes(scene:Group){const found:Mesh[]=[];scene.traverse(o=>{if(o instanceof Mesh)found.push(o);});return found;}
const legacy:CharacterAppearance={...defaultAppearance,gender:'male',lookId:'alternate',variantId:'clay',hairId:'silver',eyeId:'jade',skinId:'deep',earringId:'drops',neckwearId:'pendant',backwearId:'satchel',expressionId:'happy',accessoryColorId:'plum'};

describe('retired male studio compatibility',()=>{
 it('repairs only the rejected look and resolves even unnormalized old saves to signature',()=>{
  expect(normalizeAppearance(legacy,'male','original')).toEqual({...legacy,lookId:'original',neckwearId:'none'});
  expect(resolveCharacter(legacy).id).toBe('ctrl-anime-male');
  expect(resolveCharacter({...legacy,gender:'female'}).id).toBe('ctrl-anime-female-studio');
 });
 it('accepts the legacy ID at the API boundary without dropping customization',()=>{
  const parsed=characterProfileInputSchema.parse({name:'Legacy Resident',character:'male',appearance:legacy});
  expect(parsed.appearance?.neckwearId).toBe('none');
  expect(normalizeAppearance(parsed.appearance,'male','original')).toEqual({...legacy,lookId:'original',neckwearId:'none'});
 });
 it('never offers or randomizes the retired male model, but keeps the accepted female alternative',()=>{
  for(let i=0;i<256;i++)expect(seededAppearance(`retired:${i}`,'male').lookId).toBe('original');
  const male=renderToStaticMarkup(createElement(AppearanceControls,{appearance:legacy,onChange:()=>{}}));
  const female=renderToStaticMarkup(createElement(AppearanceControls,{appearance:{...legacy,gender:'female'},onChange:()=>{}}));
  expect(male).not.toContain('<option value="alternate"');
  expect(male).not.toContain('<option value="pendant"');
  expect(female).not.toContain('<option value="pendant"');
  expect(male).toContain('<option value="original" selected=""');
  expect(female).toContain('<option value="alternate" selected=""');
  expect(male).not.toContain('Two authored hair + outfit sets per body');
 });
});

describe('visible authored-model accessory fitting and resource ownership',()=>{
 for(const gender of ['female','male'] as const)for(const lookId of gender==='female'?['original','alternate'] as const:['original'] as const){
  const appearance={...defaultAppearance,gender,lookId};
  it(`${gender}/${lookId}: retired pendant creates no meshes, while drop earrings clear hair`,()=>{
   const {vrm,scene}=fixture();
   applyCharacterAccessories(vrm,{...appearance,neckwearId:'pendant'});
   expect(meshes(scene)).toHaveLength(0);
   expect(scene.userData.ctrlAccessoryCount).toBe(0);
   expect(scene.children.every(bone=>bone.children.length===0)).toBe(true);
   applyCharacterAccessories(vrm,{...appearance,earringId:'drops'});
   // The short post starts at the real ear; only the dangling ornament must be
   // ahead of the hair curtain (not the deliberately hidden attachment post).
   const bounds=new Box3();meshes(scene).filter(o=>o.geometry.type!=='TubeGeometry').forEach(o=>bounds.union(new Box3().setFromObject(o)));
   expect(bounds.min.z).toBeGreaterThan(.05);
   expect(bounds.min.x).toBeLessThan(-.14);
   expect(bounds.max.x).toBeGreaterThan(.14);
   clearCharacterAccessories(vrm);
  });
  it(`${gender}/${lookId}: satchel sits in front of the hip, not in the relaxed hand corridor`,()=>{
   const {vrm,scene}=fixture();
   applyCharacterAccessories(vrm,{...appearance,backwearId:'satchel'});
   const bag=meshes(scene)[0];
   const bounds=new Box3().setFromObject(bag);
   expect(bounds.min.z).toBeGreaterThan(.11);
   expect(bounds.max.x).toBeLessThan(.23);
   expect(bag.position.y).toBeLessThan(-.24);
   expect(meshes(scene).length).toBeGreaterThan(3); // bag, flap, clasp and continuous strap
   clearCharacterAccessories(vrm);
  });
 }
 it('uses matte selected-color fabric for the scarf wrap, with a folded knot and fringed tails',()=>{
  const {vrm,scene}=fixture();
  applyCharacterAccessories(vrm,{...defaultAppearance,neckwearId:'scarf',accessoryColorId:'navy'});
  const all=meshes(scene),wrap=all[0],fabric=wrap.material as MeshStandardMaterial;
  expect(fabric.color.getHexString()).toBe('384864');
  expect(fabric.metalness).toBe(0);
  expect(fabric.roughness).toBeGreaterThan(.8);
  expect(all.length).toBeGreaterThan(8);
  expect(new Box3().setFromObject(wrap).getSize(new Vector3()).y).toBeGreaterThan(.05);
  clearCharacterAccessories(vrm);
 });
 it('refits when the authored look changes, reuses tints, and disposes every owned resource exactly once',()=>{
  const {vrm,scene}=fixture();
  const a={...defaultAppearance,neckwearId:'scarf',earringId:'drops',backwearId:'satchel'} as const;
  applyCharacterAccessories(vrm,a);
  const initial=meshes(scene),geometries=[...new Set(initial.map(o=>o.geometry))],materials=[...new Set(initial.flatMap(o=>Array.isArray(o.material)?o.material:[o.material]))];
  const disposed=[...geometries,...materials].map(resource=>vi.spyOn(resource,'dispose'));
  applyCharacterAccessories(vrm,{...a,variantId:'sage',hairId:'ink',expressionId:'happy'});
  expect(meshes(scene)).toEqual(initial);
  applyCharacterAccessories(vrm,{...a,lookId:'alternate'});
  expect(meshes(scene)[0]).not.toBe(initial[0]);
  disposed.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
  clearCharacterAccessories(vrm);clearCharacterAccessories(vrm);
  expect(meshes(scene)).toHaveLength(0);
  expect(scene.userData.ctrlAccessoryCount).toBe(0);
  disposed.forEach(spy=>expect(spy).toHaveBeenCalledTimes(1));
 });
 it('handles incomplete rigs and empty loadouts without phantom counts',()=>{
  const {vrm,scene}=fixture(true);
  applyCharacterAccessories(vrm,{...defaultAppearance,neckwearId:'scarf',earringId:'drops',backwearId:'satchel'});
  expect(meshes(scene)).toHaveLength(0);
  expect(scene.userData.ctrlAccessoryCount).toBe(0);
  clearCharacterAccessories(vrm);
  expect(scene.userData.ctrlAccessoryCount).toBe(0);
 });
});
