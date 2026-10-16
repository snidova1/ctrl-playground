import {describe,it,expect} from 'vitest';
import {exec,one} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {TOWN_VENUES} from '@/domain/town-venues';
import type {HabitatState} from '@/domain/habitat';
const state=async(cookie:string)=>(await (await api('habitat/state',undefined,cookie)).json()) as HabitatState;
describe('persistent destination is not presence or permission',()=>{
 it('remembers a public room after real leave without inventing an online player or session',async()=>{
  const a=await actor('Returning visitor');await api('habitat/public-world',{},a.cookie);
  const joined=await (await api('habitat/join',{id:TOWN_VENUES[0].id},a.cookie)).json() as HabitatState;
  expect((await api('habitat/leave',{worldId:joined.world!.id,sessionId:joined.presenceSession!.id},a.cookie)).status).toBe(200);
  const restored=await state(a.cookie);expect(restored.world!.id).toBe(TOWN_VENUES[0].id);
  expect(restored.presenceSession).toBeNull();expect(restored.players.some(p=>p.id===a.id)).toBe(false);
  expect((await api('habitat/join',{id:restored.world!.id},a.cookie)).status).toBe(200);
 });
 it('expires presence independently while preserving destination and the saved home',async()=>{
  const a=await actor('Absent visitor');await api('habitat/public-world',{},a.cookie);
  await api('habitat/join',{id:TOWN_VENUES[1].id},a.cookie);
  await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?',Date.now()-16000,a.id);
  const restored=await state(a.cookie);expect(restored.world!.id).toBe(TOWN_VENUES[1].id);expect(restored.homeId).toBe(a.worldId);expect(restored.presenceSession).toBeNull();
 });
 it('does not restore revoked private-world access or replace a remembered destination on failed join',async()=>{
  const owner=await actor('Private host'),guest=await actor('Private visitor');
  await api(`habitat/worlds/${owner.worldId}/members`,{wallet:guest.wallet,role:'visitor'},owner.cookie);
  const joined=await (await api('habitat/join',{id:owner.worldId},guest.cookie)).json() as HabitatState;
  await api('habitat/leave',{worldId:owner.worldId,sessionId:joined.presenceSession!.id},guest.cookie);
  await api(`habitat/worlds/${owner.worldId}/members/${guest.id}`,{},owner.cookie,'DELETE');
  expect((await state(guest.cookie)).world!.id).toBe(guest.worldId);
  const before=await one('SELECT * FROM habitat_last_location WHERE profile_id=?',guest.id);
  await error(await api('habitat/join',{id:owner.worldId},guest.cookie),404);
  expect(await one('SELECT * FROM habitat_last_location WHERE profile_id=?',guest.id)).toEqual(before);
 });
});
