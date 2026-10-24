import {isCharacterAppearance,seededModularAppearance as seededAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';
export const GUEST_STORAGE_KEY='ctrl-common-ground-guest-v1';
export interface GuestIdentity{version:1;id:string;appearance:CharacterAppearance}
export function createGuestIdentity(id:string):GuestIdentity{
 const gender=(id.charCodeAt(0)||0)%2?'male':'female';
 return {version:1,id,appearance:seededAppearance(id,gender)};
}
export function isGuestIdentity(value:unknown):value is GuestIdentity{
 if(!value||typeof value!=='object')return false;
 const v=value as Partial<GuestIdentity>;
 return v.version===1&&typeof v.id==='string'&&v.id.length>0&&v.id.length<100&&isCharacterAppearance(v.appearance);
}
/** Anonymous cosmetic identity only; never used as a wallet session or permission. */
export function loadGuestIdentity(storage:Pick<Storage,'getItem'|'setItem'>,newId:()=>string):GuestIdentity{
 try{const stored=JSON.parse(storage.getItem(GUEST_STORAGE_KEY)??'null');if(isGuestIdentity(stored))return stored;}catch{}
 const next=createGuestIdentity(newId());try{storage.setItem(GUEST_STORAGE_KEY,JSON.stringify(next));}catch{}
 return next;
}
