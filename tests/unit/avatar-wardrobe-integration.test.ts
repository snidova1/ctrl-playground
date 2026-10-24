import {describe,it,expect} from 'vitest';
import {Group,Mesh,MeshBasicMaterial,BoxGeometry} from 'three';
import type {VRM} from '@pixiv/three-vrm';
import {defaultAppearance,normalizeAppearance,seededAppearance,isCharacterAppearance,availableHairStyles} from '@/features/plaza/characters/catalog';
import {availableWardrobeStyles} from '@/features/plaza/characters/wardrobe-catalog';
import {characterProfileInputSchema} from '@/domain/habitat';
import {applyCharacterAppearance} from '@/features/plaza/characters/appearance';
import {hairDonor} from '@/features/plaza/characters/hairstyles';
import {api,signedWallet} from './security/habitat-fixtures';
import type {CharacterProfile} from '@/domain/habitat';
describe('independent wardrobe integration',()=>{
 it.each(['cc0-shino-long','cc0-shibu-bob'] as const)('persists fitted gothic costume with new %s via signed API',async hairStyleId=>{
  const wallet=await signedWallet(),appearance={...defaultAppearance,lookId:'alternate',hairStyleId,wardrobeId:'darkness-studio'} as const;
  expect((await api('habitat/public-profile',{name:'New Wardrobe',character:'female',appearance},wallet.cookie)).status).toBe(200);
  const {profile}=await (await api('habitat/profile',undefined,wallet.cookie)).json() as {profile:CharacterProfile};
  expect(profile.appearance).toEqual(appearance);
 });
 it('keeps every selectable hair/body pair aligned with the runtime donor allowlist',()=>{
  expect(hairDonor('ctrl-anime-male','cc0-shino-long')).toBeNull();
  expect(normalizeAppearance({...defaultAppearance,gender:'male',hairStyleId:'cc0-shino-long'},'male','original').hairStyleId).toBe('source');
  for(const gender of ['female','male'] as const)for(const lookId of ['original','alternate']){
   const id=gender==='male'?'ctrl-anime-male':lookId==='alternate'?'ctrl-anime-female-studio':'ctrl-anime-female';
   for(const style of availableHairStyles(gender,lookId))if(style.id!=='source')expect(hairDonor(id,style.id)).toBeTruthy();
  }
 });
 it('preserves old saves and restricts target geometry without replacing hair',()=>{
  expect(normalizeAppearance(defaultAppearance,'female','original')).toEqual(defaultAppearance);
  const a={...defaultAppearance,lookId:'alternate',hairStyleId:'vroid-short',wardrobeId:'darkness-studio'} as const;
  expect(normalizeAppearance(a,'female','original')).toEqual(a);expect(isCharacterAppearance(a)).toBe(true);
  expect(normalizeAppearance({...a,gender:'male'},'male','original')).toMatchObject({lookId:'original',wardrobeId:'source',hairStyleId:'source'});
  expect(characterProfileInputSchema.safeParse({name:'Test',character:'female',appearance:{...a,wardrobeId:'https://evil.invalid/outfit.glb'}}).success).toBe(false);
 });
 it('randomly draws only compatible outfits and reaches every reviewed female studio garment',()=>{
  const reached=new Set<string>();for(let i=0;i<256;i++)for(const gender of ['female','male'] as const){const a=seededAppearance('wardrobe:'+i,gender);const id=gender==='female'&&a.lookId==='alternate'?'ctrl-anime-female-studio':`ctrl-anime-${gender}`;expect(availableWardrobeStyles(id).some(s=>s.id===a.wardrobeId)).toBe(true);reached.add(a.wardrobeId!);}
  expect([...reached].sort()).toEqual(['darkness-studio','source']);
 });
 it('persists and reloads independent costume/hair together via real signed API and SQLite',async()=>{
  const wallet=await signedWallet(),appearance={...defaultAppearance,lookId:'alternate',hairStyleId:'vroid-short',wardrobeId:'darkness-studio',variantId:'slate'} as const;
  expect((await api('habitat/public-profile',{name:'Wardrobe Resident',character:'female',appearance},wallet.cookie)).status).toBe(200);
  const res=await api('habitat/profile',undefined,wallet.cookie);expect(res.status).toBe(200);const {profile}=await res.json() as {profile:CharacterProfile};expect(profile.appearance).toEqual(appearance);
  expect((await api('habitat/public-profile',{name:'Renamed Resident',character:'female'},wallet.cookie)).status).toBe(200);
  expect((await (await api('habitat/profile',undefined,wallet.cookie)).json() as {profile:CharacterProfile}).profile.appearance).toEqual(appearance);
 });
 it('tints new artwork materials without cumulative color damage or touching unrelated meshes',()=>{
  const scene=new Group(),cloth=new MeshBasicMaterial({name:'Wardrobe_CLOTH'}),other=new MeshBasicMaterial({name:'prop'}),g=new BoxGeometry();scene.add(new Mesh(g,cloth),new Mesh(g,other));const vrm={scene,humanoid:{getNormalizedBoneNode:()=>null}} as unknown as VRM;
  applyCharacterAppearance(vrm,{...defaultAppearance,variantId:'sage'});const c=cloth.color.clone();applyCharacterAppearance(vrm,{...defaultAppearance,variantId:'sage'});expect(cloth.color.equals(c)).toBe(true);expect(other.color.getHex()).toBe(0xffffff);
  applyCharacterAppearance(vrm,defaultAppearance);expect(cloth.color.getHex()).toBe(0xffffff);g.dispose();cloth.dispose();other.dispose();
 });
});
