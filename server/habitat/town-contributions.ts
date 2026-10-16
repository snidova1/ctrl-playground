import {statement} from '@/db';
import {civicContribution} from './town-projects';

// Must immediately follow a guarded exactly-once claim in the same DB batch.
export function recordContribution(user:{id:string},receipt:string,activity:string,now:number){
 return [
  statement(`INSERT INTO town_contributions(id,profile_id,activity_id,created_at) SELECT ?,?,?,? WHERE changes()=1`,receipt,user.id,activity,now),
  statement(`INSERT INTO town_progress(profile_id,completed,updated_at) SELECT ?,1,? WHERE changes()=1 ON CONFLICT(profile_id) DO UPDATE SET completed=completed+1,updated_at=excluded.updated_at`,user.id,now),
  statement(`INSERT OR IGNORE INTO town_activity_events(id,profile_id,kind,target,created_at) SELECT id,profile_id,'completed',activity_id,created_at FROM town_contributions WHERE id=?`,receipt),
  ...civicContribution(receipt,activity,now),
 ];
}
