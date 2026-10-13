import {z} from 'zod';
import {one,query,batch,statement} from '@/db';
import {AppError} from '@/server/errors';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import {getTownActivity,TOWN_DISTRICTS} from '@/features/habitat/town-districts';
import {CROP_GROW_MS,TOWN_GARDEN_BEDS,TOWN_JOB_DURATION,jobStartSchema,jobFinishSchema,gardenActionSchema,type TownLifeState} from '@/domain/town';
import {civicContribution,readTownProjects} from './town-projects';

const TTL=15000;
type User={id:string;wallet:string};
const presenceGuard=`EXISTS(SELECT 1 FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>? AND (x-?)*(x-?)+(z-?)*(z-?)<=18.0625)`;
const guardArgs=(user:User,session:string,x:number,z:number,now:number)=>[user.id,PUBLIC_WORLD_ID,session,now-TTL,x,x,z,z];
async function nearby(user:User,session:string,x:number,z:number,now:number){
 const p=await one<{x:number;z:number}>('SELECT x,z FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>?',user.id,PUBLIC_WORLD_ID,session,now-TTL);
 if(!p)throw new AppError('WORLD_SESSION_EXPIRED',409);
 if(Math.hypot(p.x-x,p.z-z)>4.25)throw new AppError('COME_CLOSER',422,'Walk closer to this activity.');
}
export async function readTownLife(user:string):Promise<TownLifeState>{
 const now=Date.now();
 const [progress,job,counts,garden,friends,invites,social,chat,projects,history]=await Promise.all([
  one<{completed:number}>('SELECT completed FROM town_progress WHERE profile_id=?',user),
  one<TownLifeState['job']>('SELECT id,activity_id AS activityId,ready_at AS readyAt,expires_at AS expiresAt FROM town_jobs WHERE profile_id=? AND completed_at=0 AND expires_at>?',user,now),
  query<{id:string;count:number;neighbors:number}>('SELECT activity_id AS id,COUNT(*) AS count,COUNT(DISTINCT profile_id) AS neighbors FROM town_contributions GROUP BY activity_id'),
  query<TownLifeState['garden'][number]>('SELECT id,crop,planted_at AS plantedAt,watered_at AS wateredAt,revision FROM town_garden'),
  query<TownLifeState['friends'][number]>(`SELECT p.id,p.name,f.status,(f.recipient=?) AS incoming,
    CASE WHEN w.visibility='public' OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?) THEN w.id ELSE NULL END AS homeId
    FROM town_friendships f JOIN habitat_profiles p ON p.id=CASE WHEN f.requester=? THEN f.recipient ELSE f.requester END
    LEFT JOIN habitat_worlds w ON w.owner_id=p.id WHERE f.requester=? OR f.recipient=?`,user,user,user,user,user),
  query<TownLifeState['invites'][number]>(`SELECT i.id,i.sender,p.name,i.destination,i.expires_at AS expiresAt FROM town_invites i JOIN habitat_profiles p ON p.id=i.sender WHERE i.recipient=? AND i.accepted_at=0 AND i.expires_at>? AND (i.destination IN ('center','residential','garden','harbor','workshop','festival','orchard') OR EXISTS(SELECT 1 FROM habitat_worlds w WHERE w.id=i.destination AND (w.visibility='public' OR w.owner_id=? OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?)))) ORDER BY i.expires_at DESC LIMIT 20`,user,now,user,user),
  query<TownLifeState['social'][number]>('SELECT id,initiator,recipient,kind,accepted_at AS acceptedAt,expires_at AS expiresAt FROM town_social_actions WHERE (initiator=? OR recipient=?) AND expires_at>? ORDER BY created_at DESC LIMIT 10',user,user,now),
  query<TownLifeState['chat'][number]>(`SELECT c.id,c.profile_id AS player,p.name,c.text,c.created_at AS at FROM town_chat c JOIN habitat_profiles p ON p.id=c.profile_id JOIN habitat_presence s ON s.world_id=c.world_id AND s.profile_id=? JOIN habitat_worlds w ON w.id=c.world_id WHERE s.seen_at>? AND (w.visibility='public' OR w.owner_id=? OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?)) ORDER BY c.created_at DESC LIMIT 30`,user,now-TTL,user,user),
  readTownProjects(),
  query<TownLifeState['history'][number]>('SELECT e.id,e.kind,COALESCE(p.name,e.target) AS target,e.created_at AS at FROM town_activity_events e LEFT JOIN habitat_profiles p ON p.id=e.target WHERE e.profile_id=? ORDER BY e.created_at DESC,e.id DESC LIMIT 40',user),
 ]);
 const p=progress??{completed:0};
 return {serverNow:now,progress:p,job,
  contributions:Object.fromEntries(counts.map(c=>[c.id,{count:c.count,neighbors:c.neighbors}])),
  garden:TOWN_GARDEN_BEDS.map(b=>garden.find(g=>g.id===b.id)??{id:b.id,crop:null,plantedAt:0,wateredAt:0,revision:0}),
  friends:friends.map(f=>({...f,incoming:!!f.incoming})),invites,social,chat:chat.reverse(),projects,history};
}
export function recordContribution(user:User,receipt:string,activity:string,now:number){
 return [
  statement(`INSERT INTO town_contributions(id,profile_id,activity_id,created_at) SELECT ?,?,?,? WHERE changes()=1`,receipt,user.id,activity,now),
  statement(`INSERT INTO town_progress(profile_id,completed,updated_at) SELECT ?,1,? WHERE changes()=1 ON CONFLICT(profile_id) DO UPDATE SET completed=completed+1,updated_at=excluded.updated_at`,user.id,now),
  statement(`INSERT OR IGNORE INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT id,profile_id,'completed',activity_id,created_at FROM town_contributions WHERE id=?`,receipt),
  ...civicContribution(receipt,activity,now),
 ];
}
export async function townLifeAction(user:User,path:string,input:unknown):Promise<unknown>{
 const now=Date.now();
 if(path==='town-chat'){
  const data=z.object({text:z.string().trim().min(1).max(120).refine(text=>!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)),sessionId:z.string().uuid()}).strict().parse(input);
  const result=await batch([statement(`INSERT INTO town_chat(id,world_id,profile_id,text,created_at) SELECT ?,s.world_id,s.profile_id,?,? FROM habitat_presence s JOIN habitat_worlds w ON w.id=s.world_id WHERE s.profile_id=? AND s.session_id=? AND s.seen_at>? AND (w.visibility='public' OR w.owner_id=? OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?))`,crypto.randomUUID(),data.text,now,user.id,data.sessionId,now-TTL,user.id,user.id)]);
  if(!result[0]?.meta.changes)throw new AppError('WORLD_SESSION_EXPIRED',409);
  return {town:await readTownLife(user.id)};
 }
 if(path==='town-job/start'){
  const data=jobStartSchema.parse(input),a=getTownActivity(data.id);
  if(!a)throw new AppError('ACTIVITY_NOT_FOUND',404);
  await nearby(user,data.sessionId,a.x,a.z,now);
  const done=await one<{used_at:number}>('SELECT used_at FROM habitat_object_state WHERE world_id=? AND object_id=?',PUBLIC_WORLD_ID,a.objectId);
  if(done&&done.used_at>now-a.cooldownMs)throw new AppError('ACTIVITY_RESTING',409,'This station is resting. Explore another district.');
  const id=crypto.randomUUID();
  const result=await batch([statement(`INSERT INTO town_jobs(id,profile_id,activity_id,session_id,started_at,ready_at,expires_at)
   SELECT ?,?,?,?,?,?,? WHERE ${presenceGuard} ON CONFLICT(profile_id) DO UPDATE SET id=excluded.id,activity_id=excluded.activity_id,session_id=excluded.session_id,started_at=excluded.started_at,ready_at=excluded.ready_at,expires_at=excluded.expires_at,completed_at=0 WHERE town_jobs.completed_at>0 OR town_jobs.expires_at<=?`,
   id,user.id,a.id,data.sessionId,now,now+TOWN_JOB_DURATION,now+120000,...guardArgs(user,data.sessionId,a.x,a.z,now),now),
   statement(`INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,'started',?,? WHERE changes()=1`,crypto.randomUUID(),user.id,a.id,now)]);
  if(!result[0]?.meta.changes)throw new AppError('JOB_ALREADY_ACTIVE',409,'Finish or cancel your current job first.');
  return {message:`${a.verb}. Stay nearby while you work.`,town:await readTownLife(user.id)};
 }
 if(path==='town-job/cancel'){
  const data=jobFinishSchema.parse(input);
  const job=await one<{activity_id:string}>('SELECT activity_id FROM town_jobs WHERE id=? AND profile_id=?',data.jobId,user.id);
  await batch([statement('DELETE FROM town_jobs WHERE id=? AND profile_id=? AND completed_at=0',data.jobId,user.id),
   statement(`INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,'cancelled',?,? WHERE changes()=1`,crypto.randomUUID(),user.id,job?.activity_id??data.jobId,now)]);
  return {town:await readTownLife(user.id)};
 }
 if(path==='town-job/finish'){
  const data=jobFinishSchema.parse(input);
  const job=await one<{activity_id:string;ready_at:number;expires_at:number;completed_at:number}>('SELECT * FROM town_jobs WHERE id=? AND profile_id=?',data.jobId,user.id);
  if(!job||job.completed_at)throw new AppError('JOB_NOT_ACTIVE',409);
  if(now<job.ready_at)throw new AppError('JOB_NOT_READY',409,'Keep working for a moment.');
  if(job.expires_at<=now)throw new AppError('JOB_EXPIRED',409);
  const a=getTownActivity(job.activity_id)!;await nearby(user,data.sessionId,a.x,a.z,now);
  const result=await batch([
   statement(`INSERT INTO habitat_object_state(world_id,object_id,active,used_at) SELECT ?,?,1,? WHERE ${presenceGuard}
    AND EXISTS(SELECT 1 FROM town_jobs WHERE id=? AND profile_id=? AND completed_at=0 AND ready_at<=? AND expires_at>?)
    ON CONFLICT(world_id,object_id) DO UPDATE SET active=1,used_at=excluded.used_at WHERE habitat_object_state.used_at<=?`,PUBLIC_WORLD_ID,a.objectId,now,...guardArgs(user,data.sessionId,a.x,a.z,now),data.jobId,user.id,now,now,now-a.cooldownMs),
   statement('UPDATE town_jobs SET completed_at=? WHERE id=? AND profile_id=? AND completed_at=0 AND changes()=1',now,data.jobId,user.id),
   ...recordContribution(user,data.jobId,a.id,now),
  ]);
  if(!result[0]?.meta.changes)throw new AppError('ACTIVITY_RESTING',409,'Another neighbor just finished this station.');
  return {message:`${a.result} Contribution saved.`,town:await readTownLife(user.id)};
 }
 if(path==='town-garden'){
  const data=gardenActionSchema.parse(input),bed=TOWN_GARDEN_BEDS.find(b=>b.id===data.id)!;
  await nearby(user,data.sessionId,bed.x,bed.z,now);
  const args=guardArgs(user,data.sessionId,bed.x,bed.z,now);
  let claim:D1PreparedStatement;
  if(data.action==='plant')claim=statement(`INSERT INTO town_garden(id,crop,planted_at,watered_at,revision) SELECT ?,'marigold',?,0,1 WHERE ?=0 AND ${presenceGuard}
   ON CONFLICT(id) DO UPDATE SET crop='marigold',planted_at=excluded.planted_at,watered_at=0,revision=town_garden.revision+1 WHERE town_garden.crop IS NULL AND town_garden.revision=?`,bed.id,now,data.revision,...args,data.revision);
  else if(data.action==='water')claim=statement(`UPDATE town_garden SET watered_at=?,revision=revision+1 WHERE id=? AND revision=? AND crop IS NOT NULL AND watered_at=0 AND ${presenceGuard}`,now,bed.id,data.revision,...args);
  else claim=statement(`UPDATE town_garden SET crop=NULL,planted_at=0,watered_at=0,revision=revision+1 WHERE id=? AND revision=? AND crop IS NOT NULL AND watered_at>0 AND watered_at<=? AND ${presenceGuard}`,bed.id,data.revision,now-CROP_GROW_MS,...args);
  // Replant an existing harvested bed with its current revision.
  if(data.action==='plant'&&data.revision>0)claim=statement(`UPDATE town_garden SET crop='marigold',planted_at=?,watered_at=0,revision=revision+1 WHERE id=? AND revision=? AND crop IS NULL AND ${presenceGuard}`,now,bed.id,data.revision,...args);
  const receipt=crypto.randomUUID();
  const result=await batch([claim,
   statement('INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,?,?,? WHERE changes()=1',receipt,user.id,data.action,bed.id,now),
   ...(data.action==='harvest'?recordContribution(user,receipt,'community-garden',now):[])]);
  if(!result[0]?.meta.changes)throw new AppError('GARDEN_CHANGED',409,'This bed changed or is still growing. Check the latest garden.');
  return {message:data.action==='harvest'?'Shared flower harvest saved for the town':data.action==='plant'?'Seeds planted. Ask a neighbor to water them.':'Flowers watered. They will bloom soon.',town:await readTownLife(user.id)};
 }
 if(path==='town-friend'){
  const data=z.object({id:z.string().min(2).max(100),action:z.enum(['request','accept','remove'])}).strict().parse(input);
  if(data.id===user.id||!await one('SELECT id FROM habitat_profiles WHERE id=?',data.id))throw new AppError('PLAYER_NOT_FOUND',404);
  if(data.action==='request'){
   await batch([statement(`INSERT OR IGNORE INTO town_friendships(requester,recipient,status,created_at) SELECT ?,?,'pending',? WHERE NOT EXISTS(SELECT 1 FROM town_friendships WHERE requester=? AND recipient=?)`,user.id,data.id,now,data.id,user.id)]);
  }else if(data.action==='accept')await batch([statement("UPDATE town_friendships SET status='accepted' WHERE requester=? AND recipient=? AND status='pending'",data.id,user.id)]);
  else await batch([statement('DELETE FROM town_friendships WHERE (requester=? AND recipient=?) OR (requester=? AND recipient=?)',user.id,data.id,data.id,user.id)]);
  return {town:await readTownLife(user.id)};
 }
 if(path==='town-invite'){
  const data=z.object({id:z.string().min(2).max(100),destination:z.string().min(2).max(50)}).strict().parse(input);
  if(!await one("SELECT requester FROM town_friendships WHERE status='accepted' AND ((requester=? AND recipient=?) OR (requester=? AND recipient=?))",user.id,data.id,data.id,user.id))throw new AppError('FRIEND_REQUIRED',403);
  if(!TOWN_DISTRICTS.some(d=>d.id===data.destination)){
   const home=await one<{id:string}>('SELECT id FROM habitat_worlds WHERE id=? AND owner_id=?',data.destination,user.id);
   if(!home)throw new AppError('INVALID_INVITE_DESTINATION',422);
   // An invite alone never silently grants private-home membership.
   if(!await one(`SELECT id FROM habitat_worlds w WHERE id=? AND (visibility='public' OR EXISTS(SELECT 1 FROM habitat_members m WHERE m.world_id=w.id AND m.profile_id=?))`,home.id,data.id))throw new AppError('INVITEE_ACCESS_REQUIRED',403,'Grant visitor access before inviting this friend.');
  }
  await batch([statement('INSERT INTO town_invites(id,sender,recipient,destination,expires_at) VALUES(?,?,?,?,?)',crypto.randomUUID(),user.id,data.id,data.destination,now+300000)]);
  return {message:'Invitation sent.',town:await readTownLife(user.id)};
 }
 if(path==='town-invite/accept'){
  const {id}=z.object({id:z.string().uuid()}).strict().parse(input);
  const invite=await one<{destination:string}>('SELECT destination FROM town_invites WHERE id=? AND recipient=? AND accepted_at=0 AND expires_at>?',id,user.id,now);
  if(!invite)throw new AppError('INVITE_EXPIRED',409);
  await batch([statement('UPDATE town_invites SET accepted_at=? WHERE id=? AND recipient=? AND accepted_at=0 AND expires_at>?',now,id,user.id,now)]);
  return {destination:invite.destination,town:await readTownLife(user.id)};
 }
 if(path==='town-social'){
  const data=z.object({id:z.string().min(2).max(100),kind:z.enum(['high-five','dance']),sessionId:z.string().uuid()}).strict().parse(input);
  if(data.id===user.id)throw new AppError('PLAYER_NOT_FOUND',404);
  const pair=await one<{world_id:string}>(`SELECT a.world_id FROM habitat_presence a JOIN habitat_presence b ON b.world_id=a.world_id WHERE a.profile_id=? AND b.profile_id=? AND a.session_id=? AND a.seen_at>? AND b.seen_at>? AND (a.x-b.x)*(a.x-b.x)+(a.z-b.z)*(a.z-b.z)<=16`,user.id,data.id,data.sessionId,now-TTL,now-TTL);
  if(!pair)throw new AppError('COME_CLOSER',422,'Meet this player before inviting an interaction.');
  await batch([statement(`INSERT INTO town_social_actions(id,initiator,recipient,kind,world_id,created_at,expires_at)
   SELECT ?,?,?,?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM town_social_actions WHERE (initiator=? OR recipient=?) AND expires_at>?)`,crypto.randomUUID(),user.id,data.id,data.kind,pair.world_id,now,now+15000,user.id,user.id,now)]);
  return {town:await readTownLife(user.id)};
 }
 if(path==='town-social/accept'){
  const data=z.object({id:z.string().uuid(),sessionId:z.string().uuid()}).strict().parse(input);
  const result=await batch([statement(`UPDATE town_social_actions SET accepted_at=?,expires_at=? WHERE id=? AND recipient=? AND accepted_at=0 AND expires_at>?
   AND EXISTS(SELECT 1 FROM habitat_presence a JOIN habitat_presence b ON b.world_id=a.world_id WHERE a.profile_id=town_social_actions.initiator AND b.profile_id=town_social_actions.recipient AND b.session_id=? AND a.world_id=town_social_actions.world_id AND a.seen_at>? AND b.seen_at>? AND (a.x-b.x)*(a.x-b.x)+(a.z-b.z)*(a.z-b.z)<=16)`,now+800,now+6800,data.id,user.id,now,data.sessionId,now-TTL,now-TTL),
   statement(`INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT id||':recipient',recipient,kind,initiator,accepted_at FROM town_social_actions WHERE id=? AND changes()=1`,data.id),
   statement(`INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT id||':initiator',initiator,kind,recipient,accepted_at FROM town_social_actions WHERE id=? AND changes()=1`,data.id)]);
  if(!result[0]?.meta.changes)throw new AppError('SOCIAL_REQUEST_EXPIRED',409,'The invitation expired or your neighbor moved away.');
  return {town:await readTownLife(user.id)};
 }
 throw new AppError('ROUTE_NOT_FOUND',404);
}
export const townLifePaths=new Set(['town-chat','town-job/start','town-job/finish','town-job/cancel','town-garden','town-friend','town-invite','town-invite/accept','town-social','town-social/accept']);
