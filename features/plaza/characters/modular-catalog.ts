/** Browser-safe native part registry. Asset generation never edits schema/UI per item. */
import parts from './modular-parts.json';
export const modularFamilies=['drophunter','neurohacker'] as const;
export type ModularFamily=typeof modularFamilies[number];
export type ModularSlot='body'|'eyes'|'hair'|'top'|'bottom'|'shoes'|'outer'|'accessory';
export interface ModularAppearance {family:ModularFamily;hair:string;top:string;bottom:string;shoes:string;outer?:string;accessory?:string}
export const modularFamilyLabels={drophunter:'Studio · Drophunter',neurohacker:'Studio · Neurohacker'} as const;
export const familyForGender=(gender:'female'|'male'):ModularFamily=>gender==='female'?'drophunter':'neurohacker';
export function modularOptions(family:ModularFamily,slot:ModularSlot){return parts.filter(p=>p.family===family&&p.slot===slot);}
export function modularPart(family:ModularFamily,slot:ModularSlot,id:string,quality:'high'|'low'){
 const part=modularOptions(family,slot).find(p=>p.id===id);if(!part)throw new Error(`Unknown modular part: ${family}/${slot}/${id}`);return part.assets[quality];
}
export function defaultModularAppearance(family:ModularFamily):ModularAppearance{return family==='drophunter'?{family,hair:'ponytail',top:'hoodie',bottom:'cargopants',shoes:'sneakers'}:{family,hair:'short',top:'fancysuit',bottom:'suitpants',shoes:'dressshoes'};}
export function isModularAppearance(value:unknown):value is ModularAppearance{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as Record<string,unknown>;
 if(!modularFamilies.includes(v.family as ModularFamily)||Object.keys(v).some(k=>!['family','hair','top','bottom','shoes','outer','accessory'].includes(k)))return false;
 return (['hair','top','bottom','shoes','outer','accessory'] as const).every(slot=>((slot==='outer'||slot==='accessory')&&(v[slot]===undefined||v[slot]==='none'))||modularOptions(v.family as ModularFamily,slot).some(p=>p.id===v[slot]));
}
export function normalizeModular(value:unknown,gender?:'female'|'male'):ModularAppearance|undefined{
 if(!value||typeof value!=='object'||Array.isArray(value))return undefined;const v=value as Record<string,unknown>;
 const family=gender?familyForGender(gender):modularFamilies.includes(v.family as ModularFamily)?v.family as ModularFamily:undefined;if(!family)return undefined;
 const defaults=defaultModularAppearance(family);const result={...defaults};
 for(const slot of ['hair','top','bottom','shoes','outer','accessory'] as const){const part=modularOptions(family,slot).find(p=>p.id===v[slot]);if(part)result[slot]=part.id;else if(slot==='outer'||slot==='accessory'){if(v[slot]==='none')result[slot]='none';}}
 return result;
}
export function modularSelectionKey(selection?:ModularAppearance){return selection?[selection.family,selection.hair,selection.top,selection.bottom,selection.shoes,selection.outer??'none',selection.accessory??'none'].join(':'):'';}
export function modularLayers(selection:ModularAppearance){return (['eyes','hair','top','bottom','shoes','outer','accessory'] as const).flatMap(slot=>{const id=slot==='eyes'?modularOptions(selection.family,'eyes')[0]?.id:selection[slot];return id&&id!=='none'?[{slot,id}]:[];});}
export function randomModularAppearance(family:ModularFamily,random:()=>number):ModularAppearance{const value=defaultModularAppearance(family);for(const slot of ['hair','top','bottom','shoes'] as const){const items=modularOptions(family,slot);value[slot]=items[Math.floor(random()*items.length)].id;}return value;}
