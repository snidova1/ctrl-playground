import {describe,it,expect} from 'vitest';
import {exec,one} from '@/db';
import {actor,api,error} from './security/habitat-fixtures';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import type {HabitatState} from '@/domain/habitat';
const latest=async(cookie:string)=>(await (await api('habitat/state',undefined,cookie)).json()) as HabitatState;
async function enter(name:string){const a=await actor(name);await api('habitat/public-world',{},a.cookie);const s=await (await api('habitat/join',{id:PUBLIC_WORLD_ID},a.cookie)).json() as HabitatState;return {...a,sessionId:s.presenceSession!.id};}
async function host(a:Awaited<ReturnType<typeof enter>>,kind='dance'){
 expect((await api('habitat/town-gathering/create',{title:`${a.id.slice(-8)} meetup`,kind,sessionId:a.sessionId},a.cookie)).status).toBe(200);
 return (await latest(a.cookie)).town!.gatherings.find(e=>e.hostId===a.id)!;
}
describe('persistent gatherings with real attendance and home permissions',()=>{
 it('requires signed hosts and keeps RSVP separate from physical consented attendance',async()=>{
  const a=await enter('Dance Host'),b=await enter('Dance Guest'),c=await enter('Dance Observer');
  await error(await api('habitat/town-gathering/create',{title:'Forged gathering',kind:'dance',sessionId:a.sessionId}),401);
  let event=await host(a);
  expect((await api('habitat/town-gathering/join',{id:event.id},b.cookie)).status).toBe(200);
  expect((await latest(b.cookie)).town!.gatherings.find(e=>e.id===event.id)!.guests.find(g=>g.id===b.id)).toMatchObject({arrivedAt:0,here:false});
  await error(await api('habitat/town-gathering/dance',{id:event.id,revision:event.revision,sessionId:a.sessionId},a.cookie),409);
  await error(await api('habitat/town-gathering/check-in',{id:event.id,sessionId:crypto.randomUUID()},b.cookie),409);
  expect((await api('habitat/town-gathering/check-in',{id:event.id,sessionId:b.sessionId},b.cookie)).status).toBe(200);
  expect((await api('habitat/town-gathering/dance',{id:event.id,revision:event.revision,sessionId:a.sessionId},a.cookie)).status).toBe(200);
  event=(await latest(c.cookie)).town!.gatherings.find(e=>e.id===event.id)!;
  expect(event.startedAt).toBeGreaterThan(Date.now());expect(event.guests.filter(g=>g.here)).toHaveLength(2);
  const rejoin=await (await api('habitat/join',{id:PUBLIC_WORLD_ID},b.cookie)).json() as HabitatState;
  expect(rejoin.town!.history).toContainEqual(expect.objectContaining({kind:'gathering-attended'}));
  expect(rejoin.town!.gatherings.find(e=>e.id===event.id)!.startedAt).toBe(event.startedAt);
  expect((await latest(c.cookie)).town!.history.some(e=>e.kind==='gathering-attended')).toBe(false);
 });
 it('conceals private gatherings and removes attendance visibility immediately after revocation',async()=>{
  const a=await enter('Home Host'),b=await enter('Home Guest');
  const joined=await (await api('habitat/join',{id:a.worldId},a.cookie)).json() as HabitatState;a.sessionId=joined.presenceSession!.id;
  const e=await host(a,'picnic');
  expect((await latest(b.cookie)).town!.gatherings.some(x=>x.id===e.id)).toBe(false);
  await error(await api('habitat/town-gathering/join',{id:e.id},b.cookie),409);
  await api(`habitat/worlds/${a.worldId}/members`,{wallet:b.wallet,role:'visitor'},a.cookie);
  expect((await api('habitat/town-gathering/join',{id:e.id},b.cookie)).status).toBe(200);
  const visit=await (await api('habitat/join',{id:a.worldId},b.cookie)).json() as HabitatState;b.sessionId=visit.presenceSession!.id;
  expect((await api('habitat/town-gathering/check-in',{id:e.id,sessionId:b.sessionId},b.cookie)).status).toBe(200);
  await error(await api('habitat/town-gathering/create',{title:'Guest takeover',kind:'picnic',sessionId:b.sessionId},b.cookie),409);
  await api(`habitat/worlds/${a.worldId}/members/${b.id}`,{},a.cookie,'DELETE');
  expect((await latest(b.cookie)).town!.gatherings.some(x=>x.id===e.id)).toBe(false);
  expect((await latest(a.cookie)).town!.gatherings.find(x=>x.id===e.id)!.guests.some(g=>g.id===b.id)).toBe(false);
  await error(await api('habitat/town-gathering/check-in',{id:e.id,sessionId:b.sessionId},b.cookie),409);
 });
 it('guards capacity, rejects expired events and persists host moderation without allowing immediate rejoin',async()=>{
  const a=await enter('Moderation Host'),b=await enter('Moderation Guest');let e=await host(a);
  await api('habitat/town-gathering/join',{id:e.id},b.cookie);
  await error(await api('habitat/town-gathering/end',{id:e.id,revision:e.revision,sessionId:b.sessionId},b.cookie),409);
  expect((await api('habitat/town-gathering/remove',{id:e.id,revision:e.revision,sessionId:a.sessionId,guestId:b.id},a.cookie)).status).toBe(200);
  await error(await api('habitat/town-gathering/join',{id:e.id},b.cookie),409);
  e=(await latest(a.cookie)).town!.gatherings.find(x=>x.id===e.id)!;
  expect((await api('habitat/town-gathering/end',{id:e.id,revision:e.revision,sessionId:a.sessionId},a.cookie)).status).toBe(200);
  expect((await latest(a.cookie)).town!.gatherings.some(x=>x.id===e.id)).toBe(false);
  expect(await one('SELECT arrived_at AS at FROM town_gathering_guests WHERE gathering_id=? AND profile_id=?',e.id,a.id)).toEqual({at:expect.any(Number)});
  await error(await api('habitat/town-gathering/join',{id:e.id},b.cookie),409);
  const next=await host(a);await exec('UPDATE town_gatherings SET ends_at=? WHERE id=?',Date.now()-1,next.id);
  await error(await api('habitat/town-gathering/join',{id:next.id},b.cookie),409);
 });
 it('validates capacity inside the same transaction for independent neighbor RSVPs',async()=>{
  const a=await enter('Capacity Host');const e=await host(a,'picnic');
  const people=await Promise.all(Array.from({length:16},(_,i)=>enter(`Capacity Guest ${i}`)));
  const responses=await Promise.all(people.map(p=>api('habitat/town-gathering/join',{id:e.id},p.cookie)));
  expect(responses.filter(r=>r.status===200)).toHaveLength(15);
  expect((await latest(a.cookie)).town!.gatherings.find(x=>x.id===e.id)!.guests).toHaveLength(16);
 });
 it('replicates consented pair gestures to authorized observers, without exposing private-home actions',async()=>{
  const a=await enter('Pair Sender'),b=await enter('Pair Recipient'),c=await enter('Pair Observer');
  await api('habitat/town-social',{id:b.id,kind:'high-five',sessionId:a.sessionId},a.cookie);
  const proposal=(await latest(b.cookie)).town!.social.find(s=>s.initiator===a.id)!;
  expect((await latest(c.cookie)).town!.social.some(s=>s.id===proposal.id)).toBe(false);
  await api('habitat/town-social/accept',{id:proposal.id,sessionId:b.sessionId},b.cookie);
  expect((await latest(c.cookie)).town!.social).toContainEqual(expect.objectContaining({id:proposal.id,acceptedAt:expect.any(Number)}));
  await api('habitat/join',{id:c.worldId},c.cookie);
  expect((await latest(c.cookie)).town!.social.some(s=>s.id===proposal.id)).toBe(false);
 });
});
