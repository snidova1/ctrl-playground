import {batch,statement} from '@/db';
import {TOWN_VENUES,createTownVenue,townVenueOwner} from '@/domain/town-venues';
export async function seedTownVenues(){
 const now=Date.now();
 await batch(TOWN_VENUES.flatMap(v=>[
  statement('INSERT OR IGNORE INTO habitat_profiles(id,name,character,variant,appearance,created_at) VALUES(?,?,?,?,?,?)',townVenueOwner(v.id),v.name,'female','sage','{}',now),
  statement("INSERT OR IGNORE INTO habitat_worlds(id,owner_id,name,visibility,layout,created_at,updated_at) VALUES(?,?,?,'public',?,?,?)",v.id,townVenueOwner(v.id),v.name,JSON.stringify(createTownVenue(v.id)),now,now),
 ]));
}
