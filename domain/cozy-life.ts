import {z} from 'zod';

/** Nonfinancial activity items. Keys, tokens and financial balances are never part of this inventory. */
export const ITEMS = {
  'turnip-seed': {name:'Turnip seed',kind:'seed'}, 'tomato-seed': {name:'Tomato seed',kind:'seed'},
  'herb-seed': {name:'Herb seed',kind:'seed'}, turnip:{name:'Turnip',kind:'produce'},
  tomato:{name:'Tomato',kind:'produce'}, herb:{name:'Herb',kind:'produce'},
  perch:{name:'Pond perch',kind:'fish'}, carp:{name:'Silver carp',kind:'fish'},
  driftwood:{name:'Driftwood',kind:'material'}, clay:{name:'River clay',kind:'material'},
  'garden-soup':{name:'Garden soup',kind:'meal'}, 'grilled-fish':{name:'Herbed fish',kind:'meal'},
  'flower-pot':{name:'Handmade flower pot',kind:'decoration'}, 'wooden-bench':{name:'Driftwood bench',kind:'decoration'},
} as const;
export type ItemId = keyof typeof ITEMS;
export type Inventory = Partial<Record<ItemId,number>>;
export const CROPS = {
  turnip:{name:'Turnip',seed:'turnip-seed',item:'turnip',growMs:60_000,yield:3},
  tomato:{name:'Tomato',seed:'tomato-seed',item:'tomato',growMs:120_000,yield:4},
  herb:{name:'Herb',seed:'herb-seed',item:'herb',growMs:45_000,yield:3},
} as const;
export type CropId = keyof typeof CROPS;
export const RECIPES = {
  'garden-soup':{name:'Garden soup',kind:'cook',ingredients:{turnip:2,tomato:1},output:'garden-soup',quantity:1},
  'grilled-fish':{name:'Herbed fish',kind:'cook',ingredients:{perch:1,herb:1},output:'grilled-fish',quantity:1},
  'flower-pot':{name:'Handmade flower pot',kind:'craft',ingredients:{clay:2,herb:1},output:'flower-pot',quantity:1},
  'wooden-bench':{name:'Driftwood bench',kind:'craft',ingredients:{driftwood:3},output:'wooden-bench',quantity:1},
} as const;
export type RecipeId = keyof typeof RECIPES;
export const FISHING = {biteAfterMs:4_000,reelWindowMs:20_000,cooldownMs:3_000,catches:['perch','carp','driftwood','clay']} as const;
export const COMMUNITY_ITEMS = ['turnip','tomato','herb','garden-soup','flower-pot'] as const;
export interface GardenBed {id:number;crop:CropId|null;plantedAt:number|null;wateredAt:number|null;readyAt:number|null}
export type MealId = 'garden-soup'|'grilled-fish';
export type CraftId = 'flower-pot'|'wooden-bench';
export interface LifeDecoration {id:string;itemId:CraftId;x:number;z:number;rotation:number}
export interface LifeWorldView {beds:GardenBed[];gardenAnchor?:{x:number;z:number};decorations:LifeDecoration[]}
export interface LifeState {
  gardenAnchor?:{x:number;z:number}; decorations?:LifeDecoration[]; mealsEaten?:number;
  version:1; revision:number; createdAt:number; updatedAt:number; inventory:Inventory;
  beds:GardenBed[]; fishing:{castAt:number;biteAt:number;expiresAt:number}|null; nextCastAt:number;
  contributions:Inventory; crafted:Inventory; stats:{harvests:number;fishCaught:number;mealsCooked:number;itemsCrafted:number};
}
const itemSchema = z.enum(Object.keys(ITEMS) as [ItemId,...ItemId[]]);
const bed = z.number().int().min(0).max(3);
const quantity = z.number().int().min(1).max(100);
const position = {x:z.number().finite().min(-13).max(13),z:z.number().finite().min(-7).max(11)};
export const mealIdSchema=z.enum(['garden-soup','grilled-fish']);
export const servingActionSchema=z.discriminatedUnion('type',[
  z.object({type:z.literal('serve'),itemId:mealIdSchema}).strict(),
  z.object({type:z.literal('eat-serving'),servingId:z.string().uuid()}).strict(),
]);
export type ServingAction=z.infer<typeof servingActionSchema>;
export const lifeActionSchema = z.discriminatedUnion('type',[
  z.object({type:z.literal('place-garden'),...position}).strict(),
  z.object({type:z.literal('place-craft'),itemId:z.enum(['flower-pot','wooden-bench']),...position,rotation:z.number().finite().min(-100).max(100)}).strict(),
  z.object({type:z.literal('remove-craft'),id:z.string().min(1).max(100)}).strict(),
  z.object({type:z.literal('eat'),itemId:mealIdSchema}).strict(),
  z.object({type:z.literal('plant'),bedId:bed,cropId:z.enum(['turnip','tomato','herb'])}).strict(),
  z.object({type:z.literal('water'),bedId:bed}).strict(),
  z.object({type:z.literal('harvest'),bedId:bed}).strict(),
  z.object({type:z.literal('cast')}).strict(), z.object({type:z.literal('reel')}).strict(),
  z.object({type:z.literal('cook'),recipeId:z.enum(['garden-soup','grilled-fish'])}).strict(),
  z.object({type:z.literal('craft'),recipeId:z.enum(['flower-pot','wooden-bench'])}).strict(),
  z.object({type:z.literal('contribute'),itemId:z.enum(COMMUNITY_ITEMS),quantity}).strict(),
]);
export type LifeAction = z.infer<typeof lifeActionSchema>;
export const tradeStackSchema = z.object({itemId:itemSchema,quantity}).strict();
export type TradeStack = z.infer<typeof tradeStackSchema>;
export const barterActionSchema = z.discriminatedUnion('type',[
  z.object({type:z.literal('offer-create'),give:tradeStackSchema,want:tradeStackSchema}).strict(),
  z.object({type:z.literal('offer-accept'),offerId:z.string().uuid()}).strict(),
  z.object({type:z.literal('offer-cancel'),offerId:z.string().uuid()}).strict(),
]);
export type BarterAction = z.infer<typeof barterActionSchema>;
export class LifeError extends Error {constructor(public code:string){super(code);this.name='LifeError';}}
export function createLifeState(now:number=Date.now()):LifeState {
  return {version:1,revision:0,createdAt:now,updatedAt:now,inventory:{'turnip-seed':4,'tomato-seed':4,'herb-seed':4},
    beds:Array.from({length:4},(_,id)=>({id,crop:null,plantedAt:null,wateredAt:null,readyAt:null})),
    fishing:null,nextCastAt:0,contributions:{},crafted:{},stats:{harvests:0,fishCaught:0,mealsCooked:0,itemsCrafted:0}};
}
/** Additive legacy normalization: never replaces inventory, beds or earned progress. */
export function normalizeLifeState(state:LifeState):LifeState {
  return {...state,decorations:state.decorations??[],mealsEaten:state.mealsEaten??0};
}
/** Pure inventory delta; throws before changing the caller's state. Also used for authoritative escrow. */
export function changeInventory(state:LifeState,deltas:Inventory,now:number):LifeState {
  const next=structuredClone(state);
  for(const [id,delta] of Object.entries(deltas) as [ItemId,number][]){
    const count=(next.inventory[id]??0)+delta;
    if(!Number.isSafeInteger(count)||count<0)throw new LifeError('INSUFFICIENT_ITEMS');
    if(count>1_000_000)throw new LifeError('INVENTORY_FULL');
    if(count)next.inventory[id]=count;else delete next.inventory[id];
  }
  next.revision++;next.updatedAt=now;return next;
}
/** now and random are supplied by the server (or local-only guest simulation), NEVER accepted over the API. */
export function applyLifeAction(state:LifeState,input:LifeAction,now:number=Date.now(),random=0.5):LifeState {
  const action=lifeActionSchema.parse(input);
  if(!Number.isSafeInteger(now)||now<state.updatedAt)throw new LifeError('INVALID_TIME');
  const next=structuredClone(state);
  const debit=(id:ItemId,n:number)=>{if((next.inventory[id]??0)<n)throw new LifeError('INSUFFICIENT_ITEMS');next.inventory[id]=(next.inventory[id]??0)-n;};
  const credit=(id:ItemId,n:number)=>{const count=(next.inventory[id]??0)+n;if(count>1_000_000)throw new LifeError('INVENTORY_FULL');next.inventory[id]=count;};
  switch(action.type){
    case 'place-garden':next.gardenAnchor={x:action.x,z:action.z};break;
    case 'place-craft':{
      next.decorations??=[];
      if(next.decorations.length>=20)throw new LifeError('DECORATION_LIMIT');
      debit(action.itemId,1);
      // Revision-derived IDs are deterministic for local reducers and unique within a state.
      next.decorations.push({id:`life-${next.revision+1}`,itemId:action.itemId,x:action.x,z:action.z,rotation:action.rotation});break;
    }
    case 'remove-craft':{
      const placed=next.decorations?.find(d=>d.id===action.id);
      if(!placed)throw new LifeError('DECORATION_NOT_FOUND');
      credit(placed.itemId,1);next.decorations=next.decorations!.filter(d=>d.id!==action.id);break;
    }
    case 'eat':debit(action.itemId,1);next.mealsEaten=(next.mealsEaten??0)+1;break;
    case 'plant':{const b=next.beds[action.bedId];if(b.crop)throw new LifeError('BED_OCCUPIED');const crop=CROPS[action.cropId];debit(crop.seed,1);Object.assign(b,{crop:action.cropId,plantedAt:now,wateredAt:null,readyAt:null});break;}
    case 'water':{const b=next.beds[action.bedId];if(!b.crop)throw new LifeError('BED_EMPTY');if(b.wateredAt!==null)throw new LifeError('ALREADY_WATERED');b.wateredAt=now;b.readyAt=now+CROPS[b.crop].growMs;break;}
    case 'harvest':{const b=next.beds[action.bedId];if(!b.crop)throw new LifeError('BED_EMPTY');if(b.readyAt===null||now<b.readyAt)throw new LifeError('CROP_NOT_READY');const crop=CROPS[b.crop];credit(crop.item,crop.yield);credit(crop.seed,1);Object.assign(b,{crop:null,plantedAt:null,wateredAt:null,readyAt:null});next.stats.harvests++;break;}
    case 'cast':{if(next.fishing&&now<=next.fishing.expiresAt)throw new LifeError('ALREADY_FISHING');if(now<next.nextCastAt)throw new LifeError('FISHING_COOLDOWN');next.fishing={castAt:now,biteAt:now+FISHING.biteAfterMs,expiresAt:now+FISHING.biteAfterMs+FISHING.reelWindowMs};break;}
    case 'reel':{const f=next.fishing;if(!f)throw new LifeError('NOT_FISHING');if(now<f.biteAt)throw new LifeError('FISH_TOO_EARLY');if(now<=f.expiresAt){if(!Number.isFinite(random)||random<0||random>=1)throw new LifeError('INVALID_RANDOM');credit(FISHING.catches[Math.floor(random*FISHING.catches.length)],1);next.stats.fishCaught++;}next.fishing=null;next.nextCastAt=now+FISHING.cooldownMs;break;}
    case 'cook':case 'craft':{const recipe=RECIPES[action.recipeId];if(recipe.kind!==action.type)throw new LifeError('INVALID_RECIPE');for(const [id,n] of Object.entries(recipe.ingredients))debit(id as ItemId,n);credit(recipe.output,recipe.quantity);if(action.type==='craft'){next.crafted[recipe.output]=(next.crafted[recipe.output]??0)+recipe.quantity;next.stats.itemsCrafted++;}else next.stats.mealsCooked++;break;}
    case 'contribute':debit(action.itemId,action.quantity);next.contributions[action.itemId]=(next.contributions[action.itemId]??0)+action.quantity;break;
  }
  next.revision++;next.updatedAt=now;return next;
}
export const crops=CROPS, recipes=RECIPES, items=ITEMS, fishing=FISHING;
export interface LifeOffering {id:string;makerId:string;makerName:string;give:TradeStack;want:TradeStack;createdAt:number;mine:boolean}
export interface LifeServing {id:string;makerId:string;makerName:string;itemId:MealId;createdAt:number;mine:boolean}
export interface LifeResponse {servings?:LifeServing[];state:LifeState;serverNow:number;profileId:string;offerings:LifeOffering[];community:{totals:Inventory;totalItems:number;contributors:number;personal:Inventory}}
