import {normalizeAppearance,type CharacterAppearance} from './catalog';

type AccessorySelection=Pick<CharacterAppearance,'headwearId'|'eyewearId'|'earringId'|'neckwearId'|'backwearId'|'accessoryColorId'>;
const empty:AccessorySelection={headwearId:'none',eyewearId:'none',earringId:'none',neckwearId:'none',backwearId:'none',accessoryColorId:'sage'};
/** Curated accessory combinations, not claims of new costume/hair geometry. */
export const accessoryStyles=[
 {id:'artist',name:'Artist',detail:'Beret · glasses · satchel',selection:{...empty,headwearId:'beret',eyewearId:'round',backwearId:'satchel'}},
 {id:'cozy',name:'Cozy',detail:'Beanie · scarf · backpack',selection:{...empty,headwearId:'beanie',neckwearId:'scarf',backwearId:'backpack',accessoryColorId:'cream'}},
 {id:'scholar',name:'Scholar',detail:'Square glasses · bow tie',selection:{...empty,eyewearId:'square',neckwearId:'bowtie',accessoryColorId:'navy'}},
 {id:'ribbon',name:'Ribbon',detail:'Hair ribbon · star studs',selection:{...empty,headwearId:'bow',earringId:'stars',accessoryColorId:'rose'}},
 {id:'dreamer',name:'Dreamer',detail:'Halo · fairy wings',selection:{...empty,headwearId:'halo',backwearId:'wings',accessoryColorId:'sky'}},
 {id:'everyday',name:'Everyday',detail:'Headphones · backpack',selection:{...empty,headwearId:'headphones',backwearId:'backpack',accessoryColorId:'black'}},
] as const satisfies readonly {id:string;name:string;detail:string;selection:AccessorySelection}[];
export function applyAccessoryStyle(appearance:CharacterAppearance,id:string):CharacterAppearance{
 const style=accessoryStyles.find(item=>item.id===id);
 return normalizeAppearance(style?{...appearance,...style.selection}:appearance,appearance.gender,appearance.variantId);
}
export function clearAvatarAccessories(appearance:CharacterAppearance):CharacterAppearance{
 return normalizeAppearance({...appearance,...empty,accessoryColorId:appearance.accessoryColorId??'sage'},appearance.gender,appearance.variantId);
}
export function matchesAccessoryStyle(appearance:CharacterAppearance,id:string):boolean{
 const style=accessoryStyles.find(item=>item.id===id);
 return Boolean(style&&Object.entries(style.selection).every(([key,value])=>appearance[key as keyof AccessorySelection]===value));
}
