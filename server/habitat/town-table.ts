import {z} from 'zod';
import {one,query,batch,statement} from '@/db';
import {AppError} from '@/server/errors';
import {townSessionSchema} from '@/domain/town';
import {TOWN_TABLE,TOWN_TABLE_NEEDS,townTableDay,type TownTableState} from '@/domain/town-table';
import {PUBLIC_WORLD_ID} from '@/features/habitat/public-world-geography';
const kinds=TOWN_TABLE_NEEDS.map(n=>n.activity),marks=kinds.map(()=>'?').join(',');
export async function readTownTable(now:number):Promise<TownTableState>{
 const {day,startsAt,endsAt}=townTableDay(now);
 const [counts,people,served]=await Promise.all([
  query<{activity:string;n:number}>(`SELECT activity_id AS activity,COUNT(*) AS n FROM town_contributions WHERE created_at>=? AND created_at<? AND activity_id IN (${marks}) GROUP BY activity_id`,startsAt,endsAt,...kinds),
  one<{n:number}>(`SELECT COUNT(DISTINCT profile_id) AS n FROM town_contributions WHERE created_at>=? AND created_at<? AND activity_id IN (${marks})`,startsAt,endsAt,...kinds),
  one<{at:number;name:string|null}>('SELECT t.served_at AS at,p.name FROM town_daily_tables t LEFT JOIN habitat_profiles p ON p.id=t.served_by WHERE day=?',day),
 ]);
 return {day,endsAt,supplies:Object.fromEntries(counts.map(c=>[c.activity,c.n])),neighbors:people?.n??0,servedAt:served?.at??0,servedBy:served?.name??null};
}
export async function serveTownTable(user:{id:string},input:unknown,now:number){
 const {sessionId}=z.object({sessionId:townSessionSchema}).strict().parse(input),{day,startsAt,endsAt}=townTableDay(now);
 const p=await one<{x:number;z:number}>('SELECT x,z FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>?',user.id,PUBLIC_WORLD_ID,sessionId,now-15000);
 if(!p)throw new AppError('WORLD_SESSION_EXPIRED',409);
 if(Math.hypot(p.x-TOWN_TABLE.x,p.z-TOWN_TABLE.z)>4.25)throw new AppError('COME_CLOSER',422,'Walk to the east picnic table in Willow Square.');
 const needs=kinds.map(()=>`EXISTS(SELECT 1 FROM town_contributions WHERE activity_id=? AND created_at>=? AND created_at<?)`).join(' AND ');
 const result=await batch([
  statement(`INSERT OR IGNORE INTO town_daily_tables(day,served_at,served_by) SELECT ?,?,? WHERE ${needs}
   AND (SELECT COUNT(DISTINCT profile_id) FROM town_contributions WHERE created_at>=? AND created_at<? AND activity_id IN (${marks}))>=2
   AND EXISTS(SELECT 1 FROM habitat_presence WHERE profile_id=? AND world_id=? AND session_id=? AND seen_at>?
    AND (x-?)*(x-?)+(z-?)*(z-?)<=18.0625)`,day,now,user.id,...kinds.flatMap(k=>[k,startsAt,endsAt]),startsAt,endsAt,...kinds,user.id,PUBLIC_WORLD_ID,sessionId,now-15000,TOWN_TABLE.x,TOWN_TABLE.x,TOWN_TABLE.z,TOWN_TABLE.z),
  statement(`INSERT INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT ?,?,'table-served',?,? WHERE changes()=1`,crypto.randomUUID(),user.id,TOWN_TABLE.name,now),
 ]);
 if(!result[0]?.meta.changes)throw new AppError('TABLE_CHANGED',409,'The table is already served, or today’s supplies still need work from two neighbors.');
 return 'The neighborhood table is served. Today’s shared work is saved.';
}
