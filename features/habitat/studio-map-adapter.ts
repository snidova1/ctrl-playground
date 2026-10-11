import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {layoutSchema,type WorldObject} from '@/features/habitat/types';

/**
 * Experimental data-only bridge for Three.js Assets Studio -> CTRL Habitat.
 * NEVER downloads model URLs or trusts external asset ids. All objects are
 * remapped to CTRL's reviewed, locally bundled BUILD_ASSETS allowlist.
 *
 * Supported: Studio .mapproj.json / Map data JSON v1, WorldPlan v1.
 * Not supported: arbitrary GLBs, road networks, Studio character rigs.
 * Import is a draft-only operation: the existing wallet-authorized Save & Play
 * API remains the only way to persist a world.
 */
export interface StudioImportPreview {
  format: 'mapproj'|'worldplan';
  objects: WorldObject[];
  skipped: string[];
  total: number;
}

const normalize=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const ALIASES:Readonly<Record<string,string>>={
  tree:'nature-kit/tree_default',
  oak:'nature-kit/tree_oak',
  treeoak:'nature-kit/tree_oak',
  bench:'furniture-kit/bench',
  chair:'furniture-kit/bench',
  streetlight:'furniture-kit/lampSquareFloor',
  lamp:'furniture-kit/lampSquareFloor',
  lantern:'furniture-kit/lampSquareFloor',
  pottedplant:'furniture-kit/pottedPlant',
  flower:'nature-kit/flower_redA',
  bush:'nature-kit/plant_bushDetailed',
  shrub:'nature-kit/plant_bushDetailed',
  stone:'nature-kit/path_stone',
  path:'nature-kit/path_stone',
  floor:'building-kit/floor',
  column:'building-kit/column',
  roof:'building-kit/roof-flat-center',
  table:'furniture-kit/tableCoffeeSquare',
};
// A basename shared by multiple catalog entries is ambiguous: refuse to guess.
const byId=new Map(BUILD_ASSETS.map(asset=>[asset.id,asset] as const));
const byName=new Map<string,(typeof BUILD_ASSETS)[number]|null>();
for(const asset of BUILD_ASSETS){
  const key=normalize(asset.id.split('/').at(-1)??'');
  if(byName.has(key))byName.set(key,null);
  else byName.set(key,asset);
}

function resolve(hint:string){
  const alias=ALIASES[normalize(hint)];
  if(alias)return byId.get(alias);
  if(byId.has(hint))return byId.get(hint);
  return byName.get(normalize(hint))??undefined;
}
const record=(input:unknown):input is Record<string,unknown>=>!!input&&typeof input==='object'&&!Array.isArray(input);
const number=(value:unknown,defaultValue?:number)=>{
  if(value===undefined)return defaultValue;
  return typeof value==='number'&&Number.isFinite(value)?value:undefined;
};
function safeName(name:unknown,fallback:string){
  return typeof name==='string'&&name.trim() ? name.trim().slice(0,60):fallback.slice(0,60);
}

/**
 * Parsing is intentionally fail-closed for envelope, count, and server layout.
 * Individual unsupported placements are listed as skipped, never replaced by
 * remote fetches or invisible placeholders.
 */
export function previewStudioImport(document:unknown):StudioImportPreview{
  if(!record(document))throw new Error('Expected a Studio map JSON object.');
  let format:StudioImportPreview['format'];
  if(document.format==='mapproj'&&document.version===1)format='mapproj';
  else if(document.schemaVersion===1)format='worldplan';
  else throw new Error('Only Studio mapproj v1 or WorldPlan v1 is supported.');
  const placements=document.placements;
  if(!Array.isArray(placements))throw new Error('This Studio document has no placements array.');
  if(placements.length>120)throw new Error('CTRL supports at most 120 objects per world.');
  const objects:WorldObject[]=[];
  const skipped:string[]=[];
  for(const [index,raw] of placements.entries()){
    const label=`Placement ${index+1}`;
    if(!record(raw)){skipped.push(`${label}: invalid placement`);continue;}
    let hint:unknown;
    if(format==='mapproj'){
      if(!record(raw.assetRef)||raw.assetRef.source!=='site'){
        skipped.push(`${label}: external/local model reference is not approved`);continue;
      }
      hint=raw.assetRef.slug;
    }else hint=raw.assetHint??raw.kind;
    if(typeof hint!=='string'||!hint.trim()||hint.length>100){
      skipped.push(`${label}: invalid asset hint`);continue;
    }
    const asset=resolve(hint);
    if(!asset){
      skipped.push(`${label}: no reviewed CTRL equivalent for "${hint.slice(0,48)}"`);continue;
    }
    const x=number(raw.x),z=number(raw.z),y=number(raw.y,0);
    const rotation=number(format==='mapproj'?raw.ry:raw.rotation,0);
    const scale=number(format==='mapproj'?raw.s:undefined,1);
    if(x===undefined||z===undefined||y===undefined||rotation===undefined||scale===undefined||
       x< -14||x>14||z< -8||z>12||y<0||y>8||
       rotation< -100||rotation>100||scale<.25||scale>4){
      skipped.push(`${label}: transform outside CTRL world bounds`);continue;
    }
    const behavior:WorldObject['behavior']=asset.id==='furniture-kit/bench'?'seat':
      asset.id==='furniture-kit/lampSquareFloor'?'light':
      asset.collision==='solid'?'solid':'decoration';
    objects.push({
      id:crypto.randomUUID(),
      assetId:asset.id,
      name:safeName(raw.name,`${asset.name} ${index+1}`),
      x,y,z,rotation,scale,behavior,target:'',
    });
  }
  if(format==='mapproj'&&record(document.roads)&&Array.isArray(document.roads.cells)&&document.roads.cells.length){
    skipped.push('Studio road-network cells are not supported; only resolved asset placements import.');
  }
  return {format,objects:layoutSchema.parse(objects),skipped,total:placements.length};
}
