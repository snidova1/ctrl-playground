import {characterCatalog,seededAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import type {HabitatState} from '@/domain/habitat';
import {createStarterWorld} from './starter-world';
import {COMMON_GROUND_ID} from './public-world';
export interface GuestStyle {cloth:string;hair:string;eyes:string;accessory:'none'|'glasses'|'beret';accent:string;}
/** Independent cryptographic samples, rather than cycling a short preset list. */
export function randomGuestStyle():GuestStyle{
 const n=crypto.getRandomValues(new Uint32Array(7));
 const color=(v:number)=>`#${(v&0xffffff).toString(16).padStart(6,'0')}`;
 return {cloth:color(n[0]|0x707070),hair:color(n[1]|0x303030),eyes:color(n[2]|0x505050),accent:color(n[3]|0x606060),accessory:(['none','glasses','beret'] as const)[n[4]%3]};
}
export function createGuestState(appearance?:CharacterAppearance):HabitatState{
 const id=crypto.randomUUID();
 const look=appearance??seededAppearance(id,crypto.getRandomValues(new Uint32Array(1))[0]%2?'female':'male');
 return {profile:{id,name:'Visitor',character:look.gender,variant:look.variantId,appearance:look,loadout:{version:1,characterId:characterCatalog[look.gender].id,variantId:look.variantId,appearance:look,accessories:[]}},world:{id:COMMON_GROUND_ID,ownerId:id,name:'Common Ground',visibility:'private',revision:0,objects:createStarterWorld().filter(o=>!o.assetId.startsWith('building-kit/')).map(o=>({...o,x:o.x*.8,z:o.z*.6+6}))},homeId:null,canEdit:true,permissions:null,presenceSession:null,players:[],states:{},wallet:null,keyStatus:'not-deployed',worlds:[]};
}
