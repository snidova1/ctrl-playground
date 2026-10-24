import {z} from 'zod';
import {applyLifeAction,createLifeState,ITEMS,type BarterAction,type LifeAction,type LifeResponse,type LifeState,type ServingAction} from '@/domain/cozy-life';

/** One namespace for BOTH guest Public World and the Habitat playground. Never keyed by a visited world. */
export const COZY_GUEST_STORAGE='ctrl-cozy-life-guest-v1';
export const COZY_LIFE_STATE_EVENT='cozy-life-state';
/** Notification only: consumers render accepted snapshots; inventory changes still go through actions. */
export function dispatchLifeState(state:LifeState,local:boolean,community?:LifeResponse['community']){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(COZY_LIFE_STATE_EVENT,{detail:{state,local,...(community?{community}:{})}}));
}
const count=z.number().int().min(0).max(1_000_000),time=z.number().int().nonnegative();
const inventory=z.record(z.enum(Object.keys(ITEMS) as [keyof typeof ITEMS,...(keyof typeof ITEMS)[]]),count);
const stateSchema=z.object({version:z.literal(1),revision:z.number().int().nonnegative(),createdAt:time,updatedAt:time,inventory,beds:z.array(z.object({id:z.number().int().min(0).max(3),crop:z.enum(['turnip','tomato','herb']).nullable(),plantedAt:time.nullable(),wateredAt:time.nullable(),readyAt:time.nullable()}).strict()).length(4).refine(beds=>beds.every((bed,i)=>bed.id===i)),fishing:z.object({castAt:time,biteAt:time,expiresAt:time}).strict().nullable(),nextCastAt:time,contributions:inventory,crafted:inventory,gardenAnchor:z.object({x:z.number().finite().min(-13).max(13),z:z.number().finite().min(-7).max(11)}).strict().optional(),decorations:z.array(z.object({id:z.string().min(1),itemId:z.enum(['flower-pot','wooden-bench']),x:z.number().finite().min(-13).max(13),z:z.number().finite().min(-7).max(11),rotation:z.number().finite()}).strict()).max(20).refine(items=>new Set(items.map(item=>item.id)).size===items.length).optional(),mealsEaten:count.optional(),stats:z.object({harvests:count,fishCaught:count,mealsCooked:count,itemsCrafted:count}).strict()}).strict();
export class CozyClientError extends Error{constructor(public code:string,public status=0,message=code){super(message);this.name='CozyClientError';}}
export function decodeGuestState(raw:string):LifeState{try{return stateSchema.parse(JSON.parse(raw)) as LifeState;}catch{throw new CozyClientError('STORAGE_INVALID');}}
export interface LifeStorage{getItem(key:string):string|null;setItem(key:string,value:string):void;}
export function loadGuestState(storage:LifeStorage,now=Date.now()):LifeState{try{const raw=storage.getItem(COZY_GUEST_STORAGE);return raw===null?createLifeState(now):decodeGuestState(raw);}catch(error){if(error instanceof CozyClientError)throw error;throw new CozyClientError('STORAGE_UNAVAILABLE');}}
/** Persist BEFORE reporting success. Storage denial never looks like a successful save. */
export function saveGuestAction(storage:LifeStorage,state:LifeState,action:LifeAction,now=Date.now(),random=Math.random()):LifeState{
 const current=loadGuestState(storage,now);
 if(current.revision!==state.revision)throw new CozyClientError('LIFE_EDIT_CONFLICT',409);
 const next=applyLifeAction(state,action,Math.max(now,state.updatedAt),random);
 try{storage.setItem(COZY_GUEST_STORAGE,JSON.stringify(next));}catch{throw new CozyClientError('STORAGE_UNAVAILABLE');}return next;
}
const servingsSchema=z.array(z.object({id:z.string().uuid(),makerId:z.string().min(1),makerName:z.string(),itemId:z.enum(['garden-soup','grilled-fish']),createdAt:time,mine:z.boolean()}).strict()).optional();
export async function requestLife(command?:{revision:number;action:LifeAction|BarterAction|ServingAction},signal?:AbortSignal):Promise<LifeResponse>{
 let response:Response;
 try{response=await fetch('/api/cozy-life',{method:command?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:command?{'Content-Type':'application/json'}:undefined,body:command?JSON.stringify(command):undefined,signal:signal??AbortSignal.timeout(15_000)});}catch{throw new CozyClientError('NETWORK_ERROR');}
 let data:LifeResponse&{code?:string;detail?:string};try{data=await response.json();}catch{throw new CozyClientError('INVALID_RESPONSE',response.status,'Catatan dari server tidak terbaca. Coba segarkan.');}
 if(!response.ok)throw new CozyClientError(response.status===401?'UNAUTHORIZED':data.code??'SERVER_ERROR',response.status,data.detail??'Catatan belum dapat dibuka.');
 if(!data||!stateSchema.safeParse(data.state).success||!servingsSchema.safeParse(data.servings).success||typeof data.serverNow!=='number'||!Number.isFinite(data.serverNow)||typeof data.profileId!=='string'||!Array.isArray(data.offerings)||!data.community)throw new CozyClientError('INVALID_RESPONSE',response.status,'Catatan dari server belum lengkap. Coba segarkan.');
 return data;
}
