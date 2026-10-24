import {BUILD_ASSETS,type BuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject} from './types';

export const BUILD_PAGE_SIZE=24;
export const BUILD_CATEGORIES=[
 {id:'all',label:'All pieces'},
 {id:'furniture',label:'Furniture'},
 {id:'nature',label:'Garden'},
 {id:'architecture',label:'Structures'},
 {id:'food',label:'Kitchen'},
 {id:'roads',label:'Paths'},
 {id:'playground',label:'Play'},
 {id:'interactive',label:'Interactive'},
] as const;
export type BuildCategory=(typeof BUILD_CATEGORIES)[number]['id'];

export const INTERACTIVE_PIECES=[
 {id:'ctrl-block',name:'Building block',behavior:'solid',hint:'A simple foundation'},
 {id:'ctrl-seat',name:'Seat',behavior:'seat',hint:'Take a little break'},
 {id:'ctrl-lamp',name:'Light',behavior:'light',hint:'A warm glow'},
 {id:'ctrl-door',name:'Door',behavior:'door',hint:'Open a new corner'},
 {id:'ctrl-switch',name:'Switch',behavior:'switch',hint:'Connect to an object'},
 {id:'ctrl-portal',name:'World portal',behavior:'portal',hint:'A way to another world'},
 {id:'ctrl-marker',name:'Checkpoint',behavior:'checkpoint',hint:'Start a playful course'},
] as const satisfies ReadonlyArray<{id:string;name:string;behavior:WorldObject['behavior'];hint:string}>;

// An inviting first shelf, not the source manifest's alphabetic wall-parts list.
// These are existing authored models and their real, local WebP thumbnails.
const FIRST_SHELF=[
 'haven-cozy/sofa_03','haven-cozy/vintage_day_bed','haven-cozy/mid_century_lounge_chair',
 'haven-cozy/modern_wooden_cabinet','haven-cozy/modern_coffee_table_01','haven-cozy/potted_plant_02',
 'haven-cozy/outdoor_table_chair_set_01','haven-cozy/wooden_picnic_table','haven-cozy/painted_wooden_bench',
 'haven-cozy/planter_box_03','haven-cozy/vintage_oil_lamp','haven-cozy/Rockingchair_01',
 'haven-cozy/chinese_cabinet','haven-cozy/sofa_02','haven-cozy/round_wooden_table_01',
 'haven-cozy/chinese_tea_table','haven-cozy/modern_arm_chair_01','haven-cozy/planter_box_01',
 'haven-cozy/potted_plant_01','haven-cozy/potted_plant_04','haven-cozy/watering_can_metal_01',
];
const shelfRank=new Map(FIRST_SHELF.map((id,index)=>[id,index]));
const categoryRank=new Map<string,number>(BUILD_CATEGORIES.map((category,index)=>[category.id,index]));
export const COZY_BUILD_ASSETS:readonly BuildAsset[]=[...BUILD_ASSETS].sort((a,b)=>{
 const featured=(shelfRank.get(a.id)??999)-(shelfRank.get(b.id)??999);
 return featured||(categoryRank.get(a.category)??99)-(categoryRank.get(b.category)??99);
});

/** Inspiration shelves, never auto-placed bundles. Every look is an authored asset. */
export const BUILD_COLLECTIONS=[
 {id:'indoor-new',label:'Willow interiors',hint:'New carved wood, rich textiles & real material detail.',tone:'honey',assets:[
  'haven-cozy/sofa_03','haven-cozy/vintage_day_bed','haven-cozy/mid_century_lounge_chair',
  'haven-cozy/modern_wooden_cabinet','haven-cozy/modern_coffee_table_01','haven-cozy/chinese_cabinet',
  'haven-cozy/sofa_02','haven-cozy/modern_arm_chair_01','haven-cozy/chinese_tea_table',
  'haven-cozy/vintage_oil_lamp','haven-cozy/Rockingchair_01','haven-cozy/round_wooden_table_01','haven-cozy/potted_plant_02',
 ]},
 {id:'outdoor-new',label:'Garden & terrace',hint:'New timber bistro, picnic corners & rustic planters.',tone:'fern',assets:[
  'haven-cozy/outdoor_table_chair_set_01','haven-cozy/wooden_picnic_table','haven-cozy/painted_wooden_bench',
  'haven-cozy/planter_box_01','haven-cozy/planter_box_03','haven-cozy/watering_can_metal_01',
  'haven-cozy/potted_plant_01','haven-cozy/potted_plant_04',
 ]},
 {id:'reading',label:'Rainy-day reading',hint:'A soft seat, a good book, a little glow.',tone:'honey',assets:[
  'furniture-kit/loungeChairRelax','furniture-kit/bookcaseOpen','furniture-kit/lampRoundFloor',
  'furniture-kit/books','furniture-kit/tableCoffee','furniture-kit/rugRound','food-kit/cup-tea',
 ]},
 {id:'garden',label:'A pocket of green',hint:'Leafy corners & woodland daydreams.',tone:'fern',assets:[
  'furniture-kit/pottedPlant','nature-kit/tree_oak','nature-kit/mushroom_redGroup',
  'nature-kit/plant_bushSmall','nature-kit/path_stone','furniture-kit/plantSmall1','furniture-kit/bench',
 ]},
 {id:'breakfast',label:'Slow mornings',hint:'Something warm. Nowhere to rush.',tone:'peach',assets:[
  'furniture-kit/tableRound','food-kit/croissant','food-kit/cup-coffee',
  'furniture-kit/chairCushion','furniture-kit/kitchenCoffeeMachine','food-kit/pancakes','food-kit/honey',
 ]},
 {id:'soft',label:'Soft little details',hint:'Pillows, woven corners & sleepy company.',tone:'rose',assets:[
  'furniture-kit/pillow','furniture-kit/pillowBlue','furniture-kit/bear',
  'furniture-kit/pillowLong','furniture-kit/pillowBlueLong','furniture-kit/rugRectangle',
  'furniture-kit/rugRounded','furniture-kit/bedDouble','furniture-kit/cabinetBedDrawer',
 ]},
] as const;
export type BuildCollection='all'|(typeof BUILD_COLLECTIONS)[number]['id'];
export interface CatalogFilters {
 collection?:BuildCollection;
 /** Absent means all assets; an empty set deliberately yields an empty placed shelf. */
 placedIds?:ReadonlySet<string>;
}
const assetsById=new Map(BUILD_ASSETS.map(asset=>[asset.id,asset]));
export function collectionAssets(collection:BuildCollection):readonly BuildAsset[]{
 const shelf=BUILD_COLLECTIONS.find(item=>item.id===collection);
 return shelf?shelf.assets.flatMap(id=>{const asset=assetsById.get(id);return asset?[asset]:[];}):[];
}
function normalizeSearch(value:string){return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function assetSearchText(asset:BuildAsset){
 const category=BUILD_CATEGORIES.find(item=>item.id===asset.category)?.label??asset.category;
 const aliases=[/sofa/i.test(asset.name)?'couch':'',/lamp/i.test(asset.name)?'light':'',/potted|plant/i.test(asset.name)?'garden greenery':'',/pillow|rug|bear/i.test(asset.name)?'decor textile':''];
 return normalizeSearch(`${asset.name} ${asset.id.replace(/([a-z])([A-Z])/g,'$1 $2')} ${category} ${aliases.join(' ')}`);
}
const searchIndex=new Map(BUILD_ASSETS.map(asset=>[asset.id,assetSearchText(asset)]));
export function catalogPage(category:string,query:string,page:number,filters:CatalogFilters={}){
 const words=normalizeSearch(query).split(' ').filter(Boolean);
 const matches=(text:string)=>words.every(word=>text.includes(word));
 const source=filters.collection&&filters.collection!=='all'?collectionAssets(filters.collection):COZY_BUILD_ASSETS;
 const assets=source.filter(asset=>(category==='all'||asset.category===category)&&(!filters.placedIds||filters.placedIds.has(asset.id))&&matches(searchIndex.get(asset.id)!));
 const pieces=category==='interactive'&&(!filters.collection||filters.collection==='all')?INTERACTIVE_PIECES.filter(piece=>(!filters.placedIds||filters.placedIds.has(piece.id))&&matches(normalizeSearch(`${piece.name} ${piece.hint} ${piece.behavior}`))):[];
 const count=category==='interactive'?pieces.length:assets.length;
 const pages=Math.max(1,Math.ceil(count/BUILD_PAGE_SIZE));
 const current=Math.min(Math.max(Number.isFinite(page)?Math.floor(page):0,0),pages-1);
 return {assets:assets.slice(current*BUILD_PAGE_SIZE,(current+1)*BUILD_PAGE_SIZE),pieces,count,pages,page:current};
}

export function placedAssetCounts(objects:readonly WorldObject[]){
 const counts=new Map<string,number>();
 for(const object of objects)counts.set(object.assetId,(counts.get(object.assetId)??0)+1);
 return counts;
}
