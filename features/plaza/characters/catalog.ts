import type {VRMHumanBoneName} from '@pixiv/three-vrm';
import {airiHairStyles} from './airi-style-catalog';
import {availableWardrobeStyles,wardrobeStyles,type WardrobeStyleId} from './wardrobe-catalog';
import {defaultModularAppearance,familyForGender,isModularAppearance,normalizeModular,modularPart,randomModularAppearance,type ModularAppearance,type ModularFamily} from './modular-catalog';
export type CharacterQuality = 'low' | 'high';
/** Local legacy bank stays readable; hosted builds offer only releasable assets. */
export const modularCollectionEnabled=process.env.NEXT_PUBLIC_CTRL_MODULAR_COLLECTIONS!=='disabled';
export interface CharacterDefinition {
  id: string;
  name: string;
  assets: Record<CharacterQuality, string>;
  height: number;
  license: {name: string; author: string; source: string};
  customization: {
    hairstyle: string;
    outfit: string;
    bodyProfile: string;
    strategy: 'authored-vrm-variants';
    accessoryBones: readonly VRMHumanBoneName[];
  };
}
/** Proper textured anime models; export names preserve existing saved appearance consumers. */
export const previewCharacter: CharacterDefinition = {
  id: 'ctrl-anime-female', name: 'Anime resident · female', height: 1.74,
  assets: {high: '/plaza/characters/anime/female.vrm', low: '/plaza/characters/anime/female-mobile.vrm'},
  license: {name: 'VRM Public License 1.0 (embedded commercial/modification/redistribution permissions)', author: 'pixiv Inc.', source: 'https://github.com/pixiv/three-vrm/tree/dev/packages/three-vrm/examples/models'},
  customization: {hairstyle: 'layered-chestnut', outfit: 'authored-anime-original', bodyProfile: 'source-proportions', strategy: 'authored-vrm-variants', accessoryBones: ['head', 'chest', 'hips', 'leftHand', 'rightHand']},
};
export const maleCharacter: CharacterDefinition = {
  id: 'ctrl-anime-male', name: 'Anime resident · male', height: 1.82,
  assets: {high: '/plaza/characters/anime/male.vrm', low: '/plaza/characters/anime/male-mobile.vrm'},
  license: {name: 'CC0', author: 'VRoid Project / pixiv', source: 'https://vroid.pixiv.help/hc/en-us/articles/4402614652569'},
  customization: {hairstyle: 'sculpted-midnight-fringe', outfit: 'hooded-anime-original', bodyProfile: 'source-proportions', strategy: 'authored-vrm-variants', accessoryBones: ['head', 'chest', 'hips', 'leftHand', 'rightHand']},
};
/** Complete VRoid model also listed in AIRI's preset-vrm-1; no donor-rig mixing. */
export const airiCharacter:CharacterDefinition={
 id:'ctrl-anime-airi-a',name:'AIRI · AvatarSample A',height:1.68,
 assets:{high:'/plaza/characters/airi-reference/avatar-sample-a.vrm',low:'/plaza/characters/airi-reference/avatar-sample-a-mobile.vrm'},
 license:{name:'VRoid Hub embedded conditions: commercial, alteration and redistribution allowed',author:'VRoid Project',source:'https://dist.ayaka.moe/vrm-models/VRoid-Hub/AvatarSample-A/AvatarSample_A.vrm'},
 customization:{hairstyle:'authored-chestnut-bob',outfit:'authored-cream-cardigan',bodyProfile:'source-proportions',strategy:'authored-vrm-variants',accessoryBones:['head','chest','hips','leftHand','rightHand']},
};
export const airiCharacterB:CharacterDefinition={
 ...airiCharacter,id:'ctrl-anime-airi-b',name:'AIRI · AvatarSample B',height:1.65,
 assets:{high:'/plaza/characters/airi-reference/avatar-sample-b.vrm',low:'/plaza/characters/airi-reference/avatar-sample-b-mobile.vrm'},
 license:{...airiCharacter.license,source:'https://dist.ayaka.moe/vrm-models/VRoid-Hub/AvatarSample-B/AvatarSample_B.vrm'},
 customization:{...airiCharacter.customization,hairstyle:'authored-avatar-sample-b',outfit:'authored-avatar-sample-b'},
};
export type CharacterGender = 'female' | 'male';
export const characterCatalog: Readonly<Record<CharacterGender, CharacterDefinition>> = {
  female: previewCharacter, male: maleCharacter,
};
/** Persisted look IDs, including legacy saves; use availableAuthoredLooks for selection. */
export const authoredLooks = [
  {id:'original',name:'Signature · original hair & outfit'},
  {id:'alternate',name:'Studio · alternate hair & outfit'},
  {id:'airi',name:'AIRI · AvatarSample A · complete character'},
  {id:'airi-b',name:'AIRI · AvatarSample B · complete character'},
] as const;
/** Fumiriya male/alternate is retired; keep the ID readable, never load its asset. */
export function availableAuthoredLooks(gender:CharacterGender){return gender==='male'?authoredLooks.slice(0,1):authoredLooks;}
const alternateCharacters: Partial<Record<CharacterGender,CharacterDefinition>> = {
  female: {...previewCharacter,id:'ctrl-anime-female-studio',name:'Studio female',assets:{high:'/plaza/characters/anime/female-studio.vrm',low:'/plaza/characters/anime/female-studio-mobile.vrm'},license:{...maleCharacter.license,source:'https://raw.githubusercontent.com/madjin/vrm-samples/master/vroid/beta/HairSample_Female.vrm'},customization:{...previewCharacter.customization,hairstyle:'vroid-hair-sample-female',outfit:'vroid-hair-sample-female-original'}},
};
/** Geometry choices, separate from hairId (color). Only reviewed body/head pairs
 * are selectable; source always means the current legacy look's authored hair. */
export const hairStyles = [
  {id:'source',name:'Original hair for this model'},
  {id:'vroid-short',name:'Sculpted short fringe · authored VRoid'},
  {id:'vroid-layered',name:'Twin tails + cat ears · authored VRoid'},
  {id:'cc0-shino-long',name:'Long straight hair · CC0 Shino'},
  {id:'cc0-shibu-bob',name:'Rounded bob · CC0 Shibu'},
  ...airiHairStyles,
] as const;
export type HairStyleId=typeof hairStyles[number]['id'];
export function availableHairStyles(gender:CharacterGender,lookId:string='original'){
  if(gender==='female'&&(lookId==='airi'||lookId==='airi-b'))return hairStyles.filter(s=>s.id==='source'||('characterId'in s&&s.characterId===(lookId==='airi'?'ctrl-anime-airi-a':'ctrl-anime-airi-b')));
  const compatible=gender==='male'?'vroid-layered':lookId==='alternate'?'vroid-short':'source';
  const cc0Compatible=gender==='male'||lookId==='alternate';
  return hairStyles.filter(style=>!('characterId'in style)&&(style.id==='source'||style.id===compatible||(cc0Compatible&&style.id==='cc0-shibu-bob')||(gender==='female'&&lookId==='alternate'&&style.id==='cc0-shino-long')));
}
export const headwearVariants = [{id:'none',name:'None'},{id:'beret',name:'Artist beret'},{id:'beanie',name:'Ribbed beanie'},{id:'cat',name:'Cat-ear headband'},{id:'bunny',name:'Bunny-ear headband'},{id:'halo',name:'Floating halo'},{id:'crown',name:'Little crown'},{id:'bow',name:'Ribbon headband'},{id:'headphones',name:'Over-ear headphones'}] as const;
export const eyewearVariants = [{id:'none',name:'None'},{id:'round',name:'Round glasses'},{id:'square',name:'Square glasses'},{id:'sun',name:'Sunglasses'},{id:'monocle',name:'Monocle'}] as const;
export const earringVariants = [{id:'none',name:'None'},{id:'hoops',name:'Gold hoops'},{id:'drops',name:'Crystal drops'},{id:'stars',name:'Star studs'}] as const;
export const neckwearVariants = [{id:'none',name:'None'},{id:'scarf',name:'Cozy scarf'},{id:'bowtie',name:'Bow tie'}] as const;
export const backwearVariants = [{id:'none',name:'None'},{id:'backpack',name:'Mini backpack'},{id:'wings',name:'Fairy wings'},{id:'satchel',name:'Cross-body satchel'}] as const;
export const expressionVariants = [{id:'neutral',name:'Natural'},{id:'happy',name:'Soft smile'},{id:'relaxed',name:'Relaxed'},{id:'angry',name:'Determined'},{id:'sad',name:'Wistful'}] as const;
export const accessoryColors = [{id:'sage',name:'Sage',tint:'#719982'},{id:'rose',name:'Rose',tint:'#c6748b'},{id:'navy',name:'Midnight',tint:'#384864'},{id:'cream',name:'Cream',tint:'#eddfbf'},{id:'plum',name:'Plum',tint:'#845779'},{id:'amber',name:'Amber',tint:'#dca452'},{id:'sky',name:'Sky',tint:'#78abc9'},{id:'black',name:'Ink',tint:'#262b38'}] as const;
export const decorationDefaults = {lookId:'original',headwearId:'none',eyewearId:'none',earringId:'none',neckwearId:'none',backwearId:'none',expressionId:'neutral',accessoryColorId:'sage'} as const;
export const decorationCatalog = {lookId:authoredLooks,headwearId:headwearVariants,eyewearId:eyewearVariants,earringId:earringVariants,neckwearId:neckwearVariants,backwearId:backwearVariants,expressionId:expressionVariants,accessoryColorId:accessoryColors} as const;
export type DecorationKey = keyof typeof decorationCatalog;
// Migration-only persisted ID: readable by old-save consumers, never selectable or rendered.
type Decorations = {[K in DecorationKey]?: typeof decorationCatalog[K][number]['id'] | (K extends 'neckwearId' ? 'pendant' : never)};
/** Colorways are intentionally named colorways, not different garment meshes. */
export const outfitVariants = [
  {id: 'original', name: 'Original', clothTint: '#ffffff'},
  {id: 'sage', name: 'Sage', clothTint: '#a7c5b3'},
  {id: 'clay', name: 'Clay', clothTint: '#dfa9a1'},
  {id: 'slate', name: 'Slate', clothTint: '#a7b5cf'},
] as const;
export const hairVariants = [
  {id: 'source', name: 'Original', tint: '#ffffff'},
  {id: 'espresso', name: 'Espresso', tint: '#4a2d26'},
  {id: 'ink', name: 'Ink', tint: '#263040'},
  {id: 'auburn', name: 'Auburn', tint: '#8a493c'},
  {id: 'silver', name: 'Silver', tint: '#c8c9d2'},
] as const;
export const eyeVariants = [
  {id: 'source', name: 'Original', tint: '#ffffff'},
  {id: 'hazel', name: 'Hazel', tint: '#9a7448'},
  {id: 'ocean', name: 'Ocean', tint: '#5f8fbd'},
  {id: 'jade', name: 'Jade', tint: '#63a07e'},
  {id: 'violet', name: 'Violet', tint: '#8c76b8'},
] as const;
export const skinVariants = [
  {id: 'source', name: 'Original', tint: '#ffffff'},
  {id: 'warm', name: 'Warm', tint: '#edc3a6'},
  {id: 'rose', name: 'Rose', tint: '#efc0bd'},
  {id: 'deep', name: 'Deep', tint: '#a87259'},
] as const;
export type OutfitVariantId = typeof outfitVariants[number]['id'];
export type HairVariantId = typeof hairVariants[number]['id'];
export type EyeVariantId = typeof eyeVariants[number]['id'];
export type SkinVariantId = typeof skinVariants[number]['id'];
export interface CharacterAppearance extends Decorations {version: 1; gender: CharacterGender; variantId: OutfitVariantId; hairId: HairVariantId; hairStyleId?: HairStyleId; wardrobeId?:WardrobeStyleId; eyeId: EyeVariantId; skinId: SkinVariantId; modular?:ModularAppearance}
export const defaultAppearance: CharacterAppearance = {version: 1, gender: 'female', variantId: 'original', hairId: 'source', hairStyleId:'source', eyeId: 'source', skinId: 'source',...decorationDefaults};
export function isCharacterAppearance(value: unknown): value is CharacterAppearance {
  if (!value || typeof value !== 'object') return false;
  const appearance = value as Record<string, unknown>;
  return appearance.version === 1 && (appearance.gender === 'male' || appearance.gender === 'female')
    && outfitVariants.some(variant => variant.id === appearance.variantId)
    && hairVariants.some(variant => variant.id === appearance.hairId)
    && (appearance.hairStyleId===undefined||hairStyles.some(style=>style.id===appearance.hairStyleId))
    && (appearance.wardrobeId===undefined||wardrobeStyles.some(style=>style.id===appearance.wardrobeId))
    && (appearance.modular===undefined||isModularAppearance(appearance.modular))
    && eyeVariants.some(variant => variant.id === appearance.eyeId)
    && skinVariants.some(variant => variant.id === appearance.skinId)
    // Keep legacy guest identities readable rather than rerolling their entire save.
    // normalizeAppearance removes this one allowlisted retired accessory at render/save time.
    && Object.entries(decorationCatalog).every(([key,items])=>appearance[key]===undefined||(key==='neckwearId'&&appearance[key]==='pendant')||items.some(item=>item.id===appearance[key]));
}
/** Stable independent PRNG draws avoid correlations between adjacent guest seeds. */
export function seededAppearance(seed: string, gender: CharacterGender): CharacterAppearance {
  let hash = 2166136261;
  for (const character of seed) {hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619);}
  const random=()=>{hash+=0x6D2B79F5;let t=hash;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
  const pick=<T extends readonly {id:string}[]>(items:T)=>items[Math.floor(random()*items.length)].id as T[number]['id'];
  // Roll occupancy separately from style: large catalogs must not make a slot
  // almost always occupied. Only new/randomized identities use these draws.
  const accessory=<T extends readonly {id:string}[]>(items:T,density:number)=>random()<density?pick(items.slice(1)) as T[number]['id']:'none';
  const appearance:CharacterAppearance={version:1,gender,variantId:pick(outfitVariants),hairId:pick(hairVariants),eyeId:pick(eyeVariants),skinId:pick(skinVariants),lookId:pick(availableAuthoredLooks(gender).filter(look=>look.id==='original'||look.id==='alternate')),headwearId:accessory(headwearVariants,.48),eyewearId:accessory(eyewearVariants,.30),earringId:accessory(earringVariants,.32),neckwearId:accessory(neckwearVariants,.28),backwearId:accessory(backwearVariants,.25),expressionId:pick(expressionVariants),accessoryColorId:pick(accessoryColors)};
  // Appended draw preserves every previous seed's model/color/accessory choices.
  appearance.hairStyleId=pick(availableHairStyles(gender,appearance.lookId));
  appearance.wardrobeId=pick(availableWardrobeStyles(resolveCharacter(appearance).id));return appearance;
}
export function normalizeAppearance(value:unknown,gender:CharacterGender,variantId:string):CharacterAppearance{
  // Preserve the old six-field v1 save exactly in spirit: no surprise accessories/model swap.
  // Repair individual damaged/retired fields (including pendant -> none), never reroll identity.
  const saved=value&&typeof value==='object'?(value as Record<string,unknown>):{};
  const choose=<T extends readonly {id:string}[]>(items:T,id:unknown,fallback:T[number]['id'])=>items.find(item=>item.id===id)?.id as T[number]['id']??fallback;
  const lookId=choose(availableAuthoredLooks(gender),saved.lookId,'original');
  return {version:1,gender,variantId:choose(outfitVariants,saved.variantId,validVariant(variantId)),hairId:choose(hairVariants,saved.hairId,'source'),eyeId:choose(eyeVariants,saved.eyeId,'source'),skinId:choose(skinVariants,saved.skinId,'source'),
    ...Object.fromEntries(Object.entries(decorationCatalog).map(([key,items])=>[key,choose(items,saved[key],decorationDefaults[key as DecorationKey])])),
    // Repair only the retired model selection; retain every other saved appearance field.
    lookId,...(saved.hairStyleId===undefined?{}:{hairStyleId:choose(availableHairStyles(gender,lookId),saved.hairStyleId,'source')}),
    ...(saved.wardrobeId===undefined?{}:{wardrobeId:choose(availableWardrobeStyles(gender==='female'&&lookId==='airi'?airiCharacter.id:gender==='female'&&lookId==='airi-b'?airiCharacterB.id:gender==='female'&&lookId==='alternate'?'ctrl-anime-female-studio':characterCatalog[gender].id),saved.wardrobeId,'source')}),
    // Complete presets keep their authored adornments. Legacy overlays have not
    // passed these new bodies' dynamic clearance checks; never silently graft them.
    ...(!saved.modular&&gender==='female'&&(lookId==='airi'||lookId==='airi-b')?{headwearId:'none',eyewearId:'none',earringId:'none',neckwearId:'none',backwearId:'none'}:{}),
    ...(saved.modular?{modular:normalizeModular(saved.modular,gender),hairStyleId:'source',wardrobeId:'source'}:{})};
}
const modularCharacters=Object.fromEntries((['drophunter','neurohacker'] as const).map(family=>[family,{
 ...characterCatalog[family==='drophunter'?'female':'male'],id:`ctrl-modular-${family}`,name:family==='drophunter'?'Studio Drophunter':'Studio Neurohacker',
 assets:{high:modularPart(family,'body',family,'high'),low:modularPart(family,'body',family,'low')},
 license:{name:'Original embedded metadata retained',author:'CharacterStudio sample bank',source:'https://github.com/memelotsqui/character-assets'},
}])) as Record<ModularFamily,CharacterDefinition>;
export function resolveCharacter(appearance: CharacterAppearance): CharacterDefinition {
  if(appearance.modular)return modularCharacters[appearance.modular.family];
  if(appearance.gender==='female'&&appearance.lookId==='airi')return airiCharacter;
  if(appearance.gender==='female'&&appearance.lookId==='airi-b')return airiCharacterB;
  return (appearance.lookId==='alternate'?alternateCharacters[appearance.gender]:undefined)??characterCatalog[appearance.gender];
}
/** Explicit new-character defaults; the historical v1 default/save/seed path remains readable. */
export function newModularAppearance(gender:CharacterGender):CharacterAppearance{if(!modularCollectionEnabled)return newCharacterAppearance(gender);return {...defaultAppearance,gender,wardrobeId:'source',modular:defaultModularAppearance(familyForGender(gender))};}
/** Opt-in defaults for new creation only; never reinterpret an existing v1 save. */
export function newCharacterAppearance(gender:CharacterGender):CharacterAppearance{return gender==='female'?{...defaultAppearance,gender,lookId:'airi',wardrobeId:'source'}:modularCollectionEnabled?newModularAppearance(gender):{...defaultAppearance,gender};}
export function seededNewCharacterAppearance(seed:string,gender:CharacterGender):CharacterAppearance{return gender==='female'?newCharacterAppearance(gender):seededModularAppearance(seed,gender);}
export function seededModularAppearance(seed:string,gender:CharacterGender):CharacterAppearance{
 if(!modularCollectionEnabled){const base=seededAppearance(seed,gender);return gender==='female'?{...newCharacterAppearance(gender),lookId:base.lookId==='alternate'?'airi-b':'airi',variantId:base.variantId,hairId:base.hairId}:base;}
 let state=2166136261;for(const c of seed){state^=c.charCodeAt(0);state=Math.imul(state,16777619);}const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const modular=randomModularAppearance(familyForGender(gender),random);
 return {...newModularAppearance(gender),modular,hairId:hairVariants[Math.floor(random()*hairVariants.length)].id};
}
export const characterBudgets = {maxAssetBytes: 20 * 1024 * 1024, maxDelta: .05, fixedStep: 1 / 60, maxSteps: 3} as const;
export interface CharacterMotion {
  running: boolean;
  airborne: boolean;
  jumpTime: number;
  height: number;
  landedAt: number;
}
export function createCharacterMotion(): CharacterMotion {
  return {running: false, airborne: false, jumpTime: 0, height: 0, landedAt: -Infinity};
}
export const JUMP_DURATION = .9;
export function advanceJump(motion: CharacterMotion, delta: number, requested: boolean, locked: boolean, now: number) {
  if (locked) {motion.airborne = false; motion.height = 0; motion.jumpTime = 0; return;}
  if (requested && !motion.airborne) {motion.airborne = true; motion.jumpTime = 0;}
  if (!motion.airborne) return;
  motion.jumpTime = Math.min(JUMP_DURATION, motion.jumpTime + Math.min(.05, Math.max(0, delta)));
  motion.height = .72 * Math.sin(Math.PI * motion.jumpTime / JUMP_DURATION);
  if (motion.jumpTime >= JUMP_DURATION) {motion.airborne = false; motion.height = 0; motion.landedAt = now;}
}
/** Future saved loadouts refer to reviewed exports; arbitrary meshes need fitting/weights. */
export interface CharacterLoadout {
  version: 1;
  characterId: string;
  variantId: string;
  appearance: CharacterAppearance;
  accessories: ReadonlyArray<{assetId: string; bone: VRMHumanBoneName}>;
}

export function validVariant(id:string):OutfitVariantId{return outfitVariants.find(v=>v.id===id)?.id??'original';}
