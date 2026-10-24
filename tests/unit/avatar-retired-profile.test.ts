import {describe,expect,it} from 'vitest';
import {exec,one} from '@/db';
import type {CharacterProfile} from '@/domain/habitat';
import {defaultAppearance} from '@/features/plaza/characters/catalog';
import {api,signedWallet} from './security/habitat-fixtures';

const legacy={...defaultAppearance,gender:'male',lookId:'alternate',variantId:'clay',hairId:'silver',eyeId:'jade',skinId:'deep',headwearId:'beret',earringId:'drops',neckwearId:'pendant',backwearId:'satchel',expressionId:'happy',accessoryColorId:'plum'} as const;
const accepted={...legacy,lookId:'original',neckwearId:'none'};
async function profile(cookie:string){
 const response=await api('habitat/profile',undefined,cookie);expect(response.status).toBe(200);
 return (await response.json() as {profile:CharacterProfile}).profile;
}
describe('retired authored look and pendant through real profile API and SQLite',()=>{
 it('saves old male/alternate and pendant requests as signature/none while retaining all other fields',async()=>{
  const wallet=await signedWallet();
  const response=await api('habitat/public-profile',{name:'Legacy Male',character:'male',appearance:legacy},wallet.cookie);
  expect(response.status).toBe(200);
  const saved=await profile(wallet.cookie);
  expect(saved.appearance).toEqual(accepted);
  expect(saved.loadout).toMatchObject({characterId:'ctrl-anime-male',appearance:accepted});
  const row=await one<{appearance:string}>('SELECT appearance FROM habitat_profiles WHERE id=?',wallet.id);
  expect(JSON.parse(row!.appearance)).toEqual(accepted);
 });
 it('repairs existing serialized DB saves on read and rename without rerolling appearance',async()=>{
  const wallet=await signedWallet();
  expect((await api('habitat/public-profile',{name:'Old Studio',character:'male',appearance:legacy},wallet.cookie)).status).toBe(200);
  await exec('UPDATE habitat_profiles SET appearance=? WHERE id=?',JSON.stringify(legacy),wallet.id);
  const loaded=await profile(wallet.cookie);
  expect(loaded.appearance).toEqual(accepted);
  expect(loaded.loadout.characterId).toBe('ctrl-anime-male');
  // Reading is non-destructive. The next normal profile update persists migration.
  expect(JSON.parse((await one<{appearance:string}>('SELECT appearance FROM habitat_profiles WHERE id=?',wallet.id))!.appearance)).toEqual(legacy);
  expect((await api('habitat/public-profile',{name:'Same Identity',character:'male'},wallet.cookie)).status).toBe(200);
  expect((await profile(wallet.cookie)).appearance).toEqual(accepted);
  expect(JSON.parse((await one<{appearance:string}>('SELECT appearance FROM habitat_profiles WHERE id=?',wallet.id))!.appearance)).toEqual(accepted);
 });
});
