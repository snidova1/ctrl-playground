import {batch,one,query,statement} from '@/db';
import {AppError} from '@/server/errors';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world';
import {getTownRoute,getWorkSite,routeStartSchema,routeStepSchema,ROUTE_WORK_MS,ROUTE_TTL,WORK_REGROW_MS,type TownRouteRun,type TownWorkVisit} from '@/domain/town-routes';
import {recordContribution} from './town-contributions';

const guard=`EXISTS(SELECT 1 FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>? AND (x-?)*(x-?)+(z-?)*(z-?)<=18.0625)`;
const args=(id:string,session:string,x:number,z:number,now:number)=>[id,PUBLIC_WORLD_ID,session,now-15000,x,x,z,z];
export async function readTownRoutes(profile:string){
 const now=Date.now();
 const [route,visits]=await Promise.all([
  one<TownRouteRun>('SELECT id,route_id AS routeId,step,revision,ready_at AS readyAt,expires_at AS expiresAt FROM town_routes WHERE profile_id=? AND completed_at=0 AND expires_at>?',profile,now),
  query<TownWorkVisit>(`SELECT v.site_id AS siteId,MAX(v.created_at) AS at,p.name AS player FROM town_route_visits v JOIN habitat_profiles p ON p.id=v.profile_id WHERE v.created_at>? GROUP BY v.site_id`,now-WORK_REGROW_MS),
 ]);
 return {route,visits};
}
export async function routeAction(user:{id:string},path:string,input:unknown){
 const now=Date.now();
 if(path==='town-route/start'){
  const data=routeStartSchema.parse(input),route=getTownRoute(data.id);
  if(!route)throw new AppError('ROUTE_NOT_FOUND',404);
  const site=getWorkSite(route.stops[0]);
  const result=await batch([statement(`INSERT INTO town_routes(profile_id,id,route_id,expires_at)
   SELECT ?,?,?,? WHERE ${guard} AND NOT EXISTS(SELECT 1 FROM town_jobs WHERE profile_id=? AND completed_at=0 AND expires_at>?)
   ON CONFLICT(profile_id) DO UPDATE SET id=excluded.id,route_id=excluded.route_id,step=0,revision=town_routes.revision+1,ready_at=0,expires_at=excluded.expires_at,completed_at=0
   WHERE (town_routes.completed_at>0 AND town_routes.completed_at<=?) OR town_routes.expires_at<=?`,user.id,crypto.randomUUID(),route.id,now+ROUTE_TTL,...args(user.id,data.sessionId,site.x,site.z,now),user.id,now,now-45000,now)]);
  if(!result[0]?.meta.changes)throw new AppError('ROUTE_UNAVAILABLE',409,'Meet at the first stop, finish existing work, or wait for your route cooldown.');
  return `Route started: ${route.name}.`;
 }
 const data=routeStepSchema.parse(input);
 const run=await one<TownRouteRun & {completedAt:number}>('SELECT id,route_id AS routeId,step,revision,ready_at AS readyAt,expires_at AS expiresAt,completed_at AS completedAt FROM town_routes WHERE profile_id=? AND id=?',user.id,data.runId);
 if(!run||run.completedAt||run.expiresAt<=now)throw new AppError('ROUTE_NOT_ACTIVE',409);
 if(run.revision!==data.revision)throw new AppError('ROUTE_CHANGED',409);
 if(path==='town-route/cancel'){
  const result=await batch([statement('DELETE FROM town_routes WHERE profile_id=? AND id=? AND revision=? AND completed_at=0',user.id,run.id,data.revision)]);
  if(!result[0]?.meta.changes)throw new AppError('ROUTE_CHANGED',409);
  return 'Route cancelled. Completed stops stay saved.';
 }
 const route=getTownRoute(run.routeId)!;const site=getWorkSite(route.stops[run.step]);
 const p=await one<{x:number;z:number}>('SELECT x,z FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>?',user.id,PUBLIC_WORLD_ID,data.sessionId,now-15000);
 if(!p)throw new AppError('WORLD_SESSION_EXPIRED',409);
 if(Math.hypot(p.x-site.x,p.z-site.z)>4.25)throw new AppError('COME_CLOSER',422,'Walk to the current route stop.');
 if(path==='town-route/work'){
  const result=await batch([statement(`UPDATE town_routes SET ready_at=?,revision=revision+1 WHERE profile_id=? AND id=? AND revision=? AND ready_at=0 AND completed_at=0 AND expires_at>? AND ${guard}`,now+ROUTE_WORK_MS,user.id,run.id,data.revision,now,...args(user.id,data.sessionId,site.x,site.z,now))]);
  if(!result[0]?.meta.changes)throw new AppError('ROUTE_CHANGED',409);
  return `${site.verb}. Stay nearby for six seconds.`;
 }
 if(path!=='town-route/finish')throw new AppError('ROUTE_NOT_FOUND',404);
 if(!run.readyAt||run.readyAt>now)throw new AppError('ROUTE_NOT_READY',409);
 const last=run.step===route.stops.length-1;
 const result=await batch([
  statement(`UPDATE town_routes SET step=step+1,revision=revision+1,ready_at=0,completed_at=? WHERE profile_id=? AND id=? AND revision=? AND completed_at=0 AND ready_at>0 AND ready_at<=? AND expires_at>? AND ${guard}`,last?now:0,user.id,run.id,data.revision,now,now,...args(user.id,data.sessionId,site.x,site.z,now)),
  statement('INSERT INTO town_route_visits(id,profile_id,site_id,created_at) SELECT ?,?,?,? WHERE changes()=1',`${run.id}:${run.step}`,user.id,site.id,now),
  statement("INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,'route-stop',?,? WHERE changes()=1",`${run.id}:${run.step}`,user.id,site.name,now),
  ...(last?recordContribution(user,run.id,route.activity,now):[]),
 ]);
 if(!result[0]?.meta.changes)throw new AppError('ROUTE_CHANGED',409);
 return last?'Route completed. Your work and shared changes are saved.':`${site.name} completed. Walk to the next stop.`;
}
