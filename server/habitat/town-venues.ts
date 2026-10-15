import {batch,statement} from '@/db';
import {TOWN_VENUES,createTownVenue,townVenueOwner} from '@/domain/town-venues';
import {createLegacyTownVenue} from './town-venue-legacy';
export async function seedTownVenues(){
 const now=Date.now();
 await batch(TOWN_VENUES.flatMap(v=>[
  statement('INSERT OR IGNORE INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,?,?,?,?)',townVenueOwner(v.id),v.name,'female','sage','{}',now),
  statement("INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,created_at,updated_at) VALUES(?,?,?,'public',?,?,?)",v.id,townVenueOwner(v.id),v.name,JSON.stringify(createTownVenue(v.id)),now,now),
  // Only replace our byte-for-byte v1 seed, never edited content or an occupied
  // room. CAS/revision/owner guards remain inside the transaction. Use new object
  // IDs so old lamp state cannot accidentally become state for a different prop.
  statement(`UPDATE habitat_worlds SET layout=?,revision=revision+1,updated_at=?
    WHERE id=? AND owner_id=? AND revision=0 AND layout=?
    AND NOT EXISTS(SELECT 1 FROM habitat_presence p WHERE p.world_id=habitat_worlds.id AND p.seen_at>?)
    AND NOT EXISTS(SELECT 1 FROM town_gatherings g WHERE g.world_id=habitat_worlds.id AND g.ended_at=0 AND g.ends_at>?)`,
   JSON.stringify(createTownVenue(v.id)),now,v.id,townVenueOwner(v.id),JSON.stringify(createLegacyTownVenue(v.id)),now-15000,now),
 ]));
}
