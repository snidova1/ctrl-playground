import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {characterCatalog,defaultAppearance,normalizeAppearance} from '../../features/plaza/characters/catalog';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');
function model(path:string){const bytes=readFileSync(resolve(process.cwd(),'public',path.slice(1)));expect(bytes.subarray(0,4).toString()).toBe('glTF');expect(bytes.readUInt32LE(8)).toBe(bytes.length);return JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());}
describe('Proper textured anime avatar integration',()=>{
 const entry=read('features/plaza/characters/vrm-avatar.tsx'),studio=read('features/habitat/character-creator-preview.tsx');
 it('loads actual skinned VRM models in gameplay and creator, never procedural dolls',()=>{
  expect(entry).toContain('loadCharacter(');expect(entry).toContain('new HumanoidAnimator');expect(studio).toContain('<VrmAvatar');
  for(const source of [entry,studio]){expect(source).not.toContain('StorybookModel');expect(source).not.toContain('storybook-avatar');}
 });
 for(const gender of ['female','male'] as const){
  it(`${gender} ships real rigged textured geometry and authored facial expressions`,()=>{
   const definition=characterCatalog[gender],document=model(definition.assets.high);
   expect(definition.id).toBe(`ctrl-anime-${gender}`);expect(definition.assets.high).toContain('/anime/');
   expect(document.skins.length).toBeGreaterThan(0);expect(document.meshes.length).toBeGreaterThan(0);expect(document.images.length).toBeGreaterThan(3);
   const vrm=document.extensions.VRMC_vrm??document.extensions.VRM;expect(vrm.humanoid).toBeTruthy();expect(vrm.expressions??vrm.blendShapeMaster).toBeTruthy();
   const low=model(definition.assets.low);expect(low.meshes).toEqual(document.meshes);expect(low.skins).toEqual(document.skins);expect(low.extensions).toEqual(document.extensions);
  });
 }
 it('preserves the version-one saved appearance contract',()=>{
  const saved={...defaultAppearance,gender:'male' as const,hairId:'ink',eyeId:'ocean',skinId:'deep',variantId:'slate'};
  expect(normalizeAppearance(saved,'male','slate')).toEqual(saved);expect(saved.version).toBe(1);
 });
 it('uses a new instance per model/quality/hair/costume, so switching cannot display a stale avatar',()=>{
  expect(entry).toContain('key={`${definition.id}:${props.quality}:${style}:${appearance.hairStyleId??\'source\'}:${appearance.wardrobeId??\'source\'}:${modularSelectionKey(appearance.modular)}`}');expect(entry).toContain('ctrlAvatarModel=props.definition.id');
 });
});
