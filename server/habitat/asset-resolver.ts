import {z} from 'zod';
import {getBuildAsset, type BuildAsset} from '@/features/plaza/build-assets';
import {resolveAssetsSchema} from '@/domain/habitat';
import {AppError} from '@/server/errors';

/**
 * Metadata for authored CTRL primitives. They are rendered by the world runtime
 * and intentionally have no GLB URL. Do not turn a caller-supplied ID into a
 * filesystem or network path.
 */
const primitives = {
  'ctrl-block': {name:'Building block',behavior:'solid',collision:'solid'},
  'ctrl-seat': {name:'Seat',behavior:'seat',collision:'solid'},
  'ctrl-lamp': {name:'Light',behavior:'light',collision:'none'},
  'ctrl-door': {name:'Door',behavior:'door',collision:'solid'},
  'ctrl-switch': {name:'Switch',behavior:'switch',collision:'solid'},
  'ctrl-portal': {name:'World portal',behavior:'portal',collision:'none'},
  'ctrl-marker': {name:'Checkpoint',behavior:'checkpoint',collision:'none'},
} as const;

export interface ResolvedModelAsset extends BuildAsset {kind:'model'}
export interface ResolvedPrimitiveAsset {
  id:keyof typeof primitives;
  name:string;
  category:'interactive';
  kind:'primitive';
  url:null;
  thumbnailUrl:null;
  bounds:[number,number,number];
  center:[number,number,number];
  groundOffset:0;
  collision:'solid'|'none';
  sourcePack:'ctrl';
  bytes:0;
  animationClips:[];
  defaultBehavior:string;
}
export type ResolvedHabitatAsset=ResolvedModelAsset|ResolvedPrimitiveAsset;

function resolveOne(id:string):ResolvedHabitatAsset {
  const model=getBuildAsset(id);
  if(model){
    // Explicit catalogue lookup, never interpolating the submitted ID into a URL.
    // A fresh copy prevents API consumers from mutating the global registry.
    return {...model,kind:'model',bounds:[...model.bounds],center:[...model.center],animationClips:[...model.animationClips]};
  }
  if(Object.prototype.hasOwnProperty.call(primitives,id)){
    const primitive=primitives[id as keyof typeof primitives];
    return {id:id as keyof typeof primitives,name:primitive.name,kind:'primitive',
      category:'interactive',url:null,thumbnailUrl:null,bounds:[1,1,1],
      center:[0,0,0],groundOffset:0,collision:primitive.collision,
      sourcePack:'ctrl',bytes:0,animationClips:[],defaultBehavior:primitive.behavior};
  }
  throw new AppError('UNKNOWN_ASSET',422,'One or more model IDs are not in the approved CTRL catalogue.');
}

/**
 * The domain schema caps each request to 120 IDs and rejects unexpected fields.
 * Deduplication keeps the caller's first-seen order, avoiding repeated payloads.
 * All-or-nothing resolution avoids suggesting that a partially valid layout
 * is safe to persist.
 */
export function resolveHabitatAssets(input:unknown):{assets:ResolvedHabitatAsset[]}{
  const {ids}=resolveAssetsSchema.parse(input);
  const unique=[...new Set(ids)];
  return {assets:unique.map(resolveOne)};
}
