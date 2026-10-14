import {describe,it,expect} from 'vitest';
import {exec} from '@/db';
import {actor,api,error,object} from './security/habitat-fixtures';
import type {HabitatState} from '@/domain/habitat';
import {nearestUsable} from '@/features/habitat/nearby-object';
async function fixture(){
 const a=await actor('Seat Owner'),b=await actor('Seat Guest'),seat={...object(),assetId:'ctrl-seat',behavior:'seat' as const,x:0,z:6};
 expect((await api('habitat/save',{worldId:a.worldId,revision:a.state.world!.revision,objects:[seat]},a.cookie)).status).toBe(200);
 await api(`habitat/worlds/${a.worldId}/members`,{wallet:b.wallet,role:'visitor'},a.cookie);
 const enter=async(p:typeof a)=>(await (await api('habitat/join',{id:a.worldId},p.cookie)).json()) as HabitatState;
 const sa=await enter(a),sb=await enter(b);return {a,b,seat,sa,sb};
}
describe('authoritative usable seats',()=>{
 it('admits only one racing claimant, replicates seat identity, and releases it on standing',async()=>{
  const {a,b,seat,sa,sb}=await fixture();
  const results=await Promise.all([[a,sa],[b,sb]].map(async([p,s])=>api('habitat/use',{id:seat.id,sessionId:(s as HabitatState).presenceSession!.id},(p as typeof a).cookie)));
  expect(results.filter(r=>r.status===200)).toHaveLength(1);
  const winner=results[0].status===200?a:b,loser=winner.id===a.id?b:a;
  const s=await (await api('habitat/state',undefined,winner.cookie)).json() as HabitatState;
  const self=s.players.find(p=>p.id===winner.id)!;expect(self.motion).toMatchObject({sitting:true,seatId:seat.id});expect(self.x).toBe(seat.x);expect(self.z).toBe(seat.z);
  const peer=await (await api('habitat/state',undefined,loser.cookie)).json() as HabitatState;expect(peer.players.find(p=>p.id===winner.id)!.motion.seatId).toBe(seat.id);
  const session=s.presenceSession!;
  expect((await api('habitat/presence',{worldId:a.worldId,sessionId:session.id,sequence:session.sequence+1,x:self.x,z:self.z,angle:0,motion:{sitting:false}},winner.cookie)).status).toBe(200);
  expect((await api('habitat/use',{id:seat.id},loser.cookie)).status).toBe(200);
 });
 it('rejects forged seat identity, obsolete sessions, obstructed seating and revoked visitors',async()=>{
  const {a,b,seat,sb}=await fixture();
  await error(await api('habitat/use',{id:seat.id,sessionId:crypto.randomUUID()},b.cookie),409,'STALE_PRESENCE');
  await error(await api('habitat/presence',{worldId:a.worldId,sessionId:sb.presenceSession!.id,sequence:1,x:0,z:6,angle:0,motion:{sitting:true,seatId:seat.id}},b.cookie),409,'SEAT_NOT_CLAIMED');
  const before=await (await api('habitat/state',undefined,a.cookie)).json() as HabitatState;
  await api('habitat/save',{worldId:a.worldId,revision:before.world!.revision,objects:[seat,{...object(),x:seat.x,z:seat.z}]},a.cookie);
  await error(await api('habitat/use',{id:seat.id},b.cookie),409,'SEAT_BLOCKED');
  await api(`habitat/worlds/${a.worldId}/members/${b.id}`,{},a.cookie,'DELETE');
  // Revoked home is removed from the selected state, so its seat is concealed.
  await error(await api('habitat/use',{id:seat.id},b.cookie),404,'OBJECT_NOT_FOUND');
 });
 it('locks seated heartbeat position without allowing teleporting into another chair',async()=>{
  const {a,seat,sa}=await fixture();await api('habitat/use',{id:seat.id},a.cookie);
  const response=await api('habitat/presence',{worldId:a.worldId,sessionId:sa.presenceSession!.id,sequence:1,x:.3,z:6.3,angle:0,motion:{sitting:true}},a.cookie);
  expect(response.status).toBe(200);const s=await response.json() as HabitatState;
  expect(s.players.find(p=>p.id===a.id)).toMatchObject({x:0,z:6,motion:expect.objectContaining({seatId:seat.id})});
  await exec('UPDATE habitat_presence SET seen_at=? WHERE profile_id=?',Date.now()-16000,a.id);
  await error(await api('habitat/use',{id:seat.id},a.cookie),422);
 });
 it('ignores decorative floors when selecting an actual nearby interaction',()=>{
  const floor={...object(),behavior:'decoration' as const},seat={...object(),assetId:'ctrl-seat',behavior:'seat' as const,x:1};
  expect(nearestUsable([floor,seat],0,0)?.id).toBe(seat.id);expect(nearestUsable([floor],0,0)).toBeUndefined();
 });
});
