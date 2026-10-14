import {z} from 'zod';
import {one,query,batch,statement} from '@/db';
import {AppError} from '@/server/errors';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import {GATHERING_DURATION,GATHERING_CAPACITY,type TownGathering} from '@/domain/town-gatherings';

// e is a gathering; ACL is checked on reads and inside every guest mutation.
const access=`EXISTS(SELECT 1 FROM habitat_worlds w WHERE w.id=e.world_id AND (w.visibility='public' OR w.owner_id=? OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?)))`;
const present=`EXISTS(SELECT 1 FROM habitat_presence s WHERE s.profile_id=? AND s.world_id=e.world_id AND s.session_id=? AND s.seen_at>? AND (s.x-e.x)*(s.x-e.x)+(s.z-e.z)*(s.z-e.z)<=18.0625)`;
const identity=z.object({id:z.string().uuid()}).strict();
const attendance=z.object({id:z.string().uuid(),sessionId:z.string().uuid()}).strict();
const hostAction=z.object({id:z.string().uuid(),revision:z.number().int().nonnegative(),sessionId:z.string().uuid(),guestId:z.string().min(2).max(100).optional()}).strict();
export async function readTownGatherings(profile:string):Promise<TownGathering[]>{
 const now=Date.now();
 const events=await query<Omit<TownGathering,'guests'>>(`SELECT e.id,e.host_id AS hostId,p.name AS hostName,e.world_id AS worldId,e.title,e.kind,e.x,e.z,e.ends_at AS endsAt,e.revision,e.started_at AS startedAt FROM town_gatherings e JOIN habitat_profiles p ON p.id=e.host_id WHERE e.ended_at=0 AND e.ends_at>? AND ${access} ORDER BY e.created_at DESC LIMIT 30`,now,profile,profile);
 return Promise.all(events.map(async e=>({...e,guests:(await query<{id:string;name:string;arrivedAt:number;here:number}>(`SELECT g.profile_id AS id,p.name,g.arrived_at AS arrivedAt,EXISTS(SELECT 1 FROM habitat_presence s WHERE s.profile_id=g.profile_id AND s.world_id=e.world_id AND s.seen_at>? AND (s.x-e.x)*(s.x-e.x)+(s.z-e.z)*(s.z-e.z)<=18.0625) AS here FROM town_gathering_guests g JOIN habitat_profiles p ON p.id=g.profile_id JOIN town_gatherings e ON e.id=g.gathering_id JOIN habitat_worlds w ON w.id=e.world_id WHERE g.gathering_id=? AND g.departed_at=0 AND (w.visibility='public' OR w.owner_id=g.profile_id OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=g.profile_id)) ORDER BY g.joined_at`,now-15000,e.id)).map(g=>({...g,here:!!g.here&&g.arrivedAt>0}))})));
}
export async function gatheringAction(user:{id:string},path:string,input:unknown){
 const now=Date.now();
 if(path==='town-gathering/create'){
  const d=z.object({title:z.string().trim().min(3).max(60).refine(t=>!/[\u0000-\u001f]/.test(t)),kind:z.enum(['picnic','dance','workshop']),sessionId:z.string().uuid()}).strict().parse(input),id=crypto.randomUUID();
  const result=await batch([
   statement(`INSERT INTO town_gatherings(id,host_id,world_id,title,kind,x,z,created_at,ends_at) SELECT ?,s.profile_id,s.world_id,?,?,s.x,s.z,?,? FROM habitat_presence s JOIN habitat_worlds w ON w.id=s.world_id WHERE s.profile_id=? AND s.session_id=? AND s.seen_at>? AND (w.id=? OR w.owner_id=? OR w.owner_id LIKE 'ctrl-public-venue-%') AND NOT EXISTS(SELECT 1 FROM town_gatherings WHERE host_id=? AND ended_at=0 AND ends_at>?)`,id,d.title,d.kind,now,now+GATHERING_DURATION,user.id,d.sessionId,now-15000,PUBLIC_WORLD_ID,user.id,user.id,now),
   statement('INSERT INTO town_gathering_guests(gathering_id,profile_id,joined_at,arrived_at) SELECT ?,?,?,? WHERE changes()=1',id,user.id,now,now),
   statement("INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,'gathering-hosted',?,? WHERE changes()=1",`${id}:host`,user.id,d.title,now),
  ]);
  if(!result[0]?.meta.changes)throw new AppError('GATHERING_UNAVAILABLE',409,'Join Public World or your own Habitat, and end your existing gathering first.');
  return 'Gathering created. Neighbors can RSVP and check in when they arrive.';
 }
 if(path==='town-gathering/join'){
  const {id}=identity.parse(input);
  const r=await batch([statement(`INSERT INTO town_gathering_guests(gathering_id,profile_id,joined_at) SELECT e.id,?,? FROM town_gatherings e WHERE e.id=? AND e.ended_at=0 AND e.ends_at>? AND ${access} AND (SELECT COUNT(*) FROM town_gathering_guests WHERE gathering_id=e.id AND departed_at=0)<?
   ON CONFLICT(gathering_id,profile_id) DO UPDATE SET departed_at=0,arrived_at=0,joined_at=excluded.joined_at WHERE town_gathering_guests.departed_at>0 AND town_gathering_guests.blocked=0`,user.id,now,id,now,user.id,user.id,GATHERING_CAPACITY)]);
  if(!r[0]?.meta.changes)throw new AppError('GATHERING_UNAVAILABLE',409,'This gathering is full, already joined, ended, or not accessible.');
  return 'RSVP saved. Walk to the gathering to check in.';
 }
 if(path==='town-gathering/leave'){
  const {id}=identity.parse(input);
  const r=await batch([statement('UPDATE town_gathering_guests SET departed_at=? WHERE gathering_id=? AND profile_id=? AND departed_at=0',now,id,user.id)]);
  if(!r[0]?.meta.changes)throw new AppError('GATHERING_NOT_JOINED',409);
  return 'Left the gathering. Your past attendance remains saved.';
 }
 if(path==='town-gathering/check-in'){
  const d=attendance.parse(input);
  const r=await batch([
   statement(`UPDATE town_gathering_guests SET arrived_at=? WHERE gathering_id=? AND profile_id=? AND departed_at=0 AND arrived_at=0 AND EXISTS(SELECT 1 FROM town_gatherings e WHERE e.id=gathering_id AND e.ended_at=0 AND e.ends_at>? AND ${access} AND ${present})`,now,d.id,user.id,now,user.id,user.id,user.id,d.sessionId,now-15000),
   statement(`INSERT OR IGNORE INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,'gathering-attended',title,? FROM town_gatherings WHERE id=? AND changes()=1`,`${d.id}:${user.id}:attended`,user.id,now,d.id),
  ]);
  if(!r[0]?.meta.changes)throw new AppError('GATHERING_CHECKIN_REQUIRED',409,'RSVP, then meet your neighbors at the gathering.');
  return 'Attendance saved. You are now participating.';
 }
 const d=hostAction.parse(input);
 const guard=`e.id=? AND e.host_id=? AND e.revision=? AND e.ended_at=0 AND e.ends_at>? AND ${access} AND ${present}`;
 const bind=[d.id,user.id,d.revision,now,user.id,user.id,user.id,d.sessionId,now-15000];
 let claim:D1PreparedStatement;
 if(path==='town-gathering/end')claim=statement(`UPDATE town_gatherings AS e SET ended_at=?,revision=revision+1 WHERE ${guard}`,now,...bind);
 else if(path==='town-gathering/remove'){
  if(!d.guestId||d.guestId===user.id)throw new AppError('INVALID_GUEST',422);
  const result=await batch([
   statement(`UPDATE town_gatherings AS e SET revision=revision+1 WHERE ${guard} AND EXISTS(SELECT 1 FROM town_gathering_guests WHERE gathering_id=e.id AND profile_id=? AND departed_at=0)`,...bind,d.guestId),
   statement('UPDATE town_gathering_guests SET departed_at=?,blocked=1 WHERE gathering_id=? AND profile_id=? AND changes()=1',now,d.id,d.guestId),
  ]);
  if(!result[0]?.meta.changes)throw new AppError('GATHERING_CHANGED',409);
  return 'Guest removed.';
 }else if(path==='town-gathering/dance'){
  const event=await one<{kind:string}>('SELECT kind FROM town_gatherings WHERE id=?',d.id);
  if(event?.kind!=='dance')throw new AppError('DANCE_GATHERING_REQUIRED',422);
  claim=statement(`UPDATE town_gatherings AS e SET started_at=?,revision=revision+1 WHERE ${guard} AND (started_at=0 OR started_at<?) AND (SELECT COUNT(*) FROM town_gathering_guests g JOIN habitat_presence s ON s.profile_id=g.profile_id JOIN habitat_worlds w ON w.id=e.world_id WHERE g.gathering_id=e.id AND g.arrived_at>0 AND g.departed_at=0 AND s.world_id=e.world_id AND s.seen_at>? AND (s.x-e.x)*(s.x-e.x)+(s.z-e.z)*(s.z-e.z)<=18.0625 AND (w.visibility='public' OR w.owner_id=g.profile_id OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=g.profile_id)))>=2`,now+800,...bind,now-6000,now-15000);
 }else throw new AppError('ROUTE_NOT_FOUND',404);
 const r=await batch([claim]);
 if(!r[0]?.meta.changes)throw new AppError('GATHERING_CHANGED',409,'Gathering changed, permission expired, or two consenting guests are not physically present.');
 return path==='town-gathering/end'?'Gathering ended. Attendance history stays saved.':'Shared dance starts together.';
}
