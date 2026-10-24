import type {LifeState} from '@/domain/cozy-life';
import type {WorldObject} from './types';
import {isLifePlacementFree} from '@/features/cozy-life/world-placement';
/** A builder save must not place furniture/walls over already persisted life props. */
export function isCozyLayoutClear(objects:WorldObject[],view:Pick<LifeState,'gardenAnchor'|'decorations'>){
 if(view.gardenAnchor&&!isLifePlacementFree(objects,'garden',view.gardenAnchor,view.decorations??[]))return false;
 return (view.decorations??[]).every(d=>isLifePlacementFree(objects,d.itemId,d,(view.decorations??[]).filter(other=>other.id!==d.id),view.gardenAnchor));
}
