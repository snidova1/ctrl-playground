import type {HabitatState} from '@/domain/habitat';
import type {SocialAnimation} from '@/features/plaza/characters/animation';
export function socialFor(state:HabitatState|null,id:string|undefined):SocialAnimation|undefined{
 if(!state?.town||!id)return;
 const pair=state.town.social.find(a=>a.acceptedAt>0&&(a.initiator===id||a.recipient===id));
 if(pair)return pair;
 const gathering=state.town.gatherings.find(e=>e.worldId===state.world?.id&&e.kind==='dance'&&e.startedAt>0&&e.guests.some(g=>g.id===id&&g.here));
 if(gathering)return {kind:'dance',acceptedAt:gathering.startedAt,expiresAt:gathering.startedAt+6000};
}
