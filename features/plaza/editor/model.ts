import type {BuildAsset} from '../build-assets';

/**
 * World Builder document contract. Only reviewed catalogue IDs and inert behavior IDs
 * can enter a draft. Server persistence MUST revalidate with the same constraints.
 */
export const EDITOR_LIMITS = {maxObjects:120, maxHistory:60, worldExtent:24, maxHeight:12, minScale:.15, maxScale:8} as const;
export const EDITOR_BEHAVIORS = ['none','sit','toggle-light','open-close','button','moving-platform','portal','checkpoint','finish'] as const;
export type EditorBehavior = typeof EDITOR_BEHAVIORS[number];
export type EditorTool = 'translate'|'rotate'|'scale';
export type Vec3 = [number,number,number];
export interface EditorObject {
  id:string;
  assetId:string;
  position:Vec3;
  rotationY:number;
  scale:number;
  behavior:EditorBehavior;
}
export interface EditorDocument {version:1;objects:EditorObject[]}
export interface EditorHistory {past:EditorDocument[];present:EditorDocument;future:EditorDocument[]}
export type EditorAssets = ReadonlyMap<string,Pick<BuildAsset,'id'|'category'|'collision'>>;
export type EditorAction =
  | {type:'add';id:string;assetId:string;position?:Vec3}
  | {type:'remove';id:string}
  | {type:'duplicate';id:string;newId:string}
  | {type:'transform';id:string;position?:Vec3;rotationY?:number;scale?:number}
  | {type:'behavior';id:string;behavior:EditorBehavior};

export function newEditorHistory():EditorHistory{return {past:[],present:{version:1,objects:[]},future:[]};}
export function defaultAssetScale(asset:Pick<BuildAsset,'category'>):number {
  return asset.category==='furniture'?2.5:asset.category==='food'?.9:1;
}
function validId(value:unknown):value is string {
  return typeof value==='string'&&value.length>0&&value.length<=96&&/^[a-zA-Z0-9_-]+$/.test(value);
}
function finiteBetween(value:unknown,min:number,max:number):value is number {
  return typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
}
function validPosition(p:unknown):p is Vec3 {
  return Array.isArray(p)&&p.length===3&&finiteBetween(p[0],-EDITOR_LIMITS.worldExtent,EDITOR_LIMITS.worldExtent)&&finiteBetween(p[1],0,EDITOR_LIMITS.maxHeight)&&finiteBetween(p[2],-EDITOR_LIMITS.worldExtent,EDITOR_LIMITS.worldExtent);
}
function ensureObject(value:unknown,assets:EditorAssets):EditorObject {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid object.');
  const o=value as Record<string,unknown>;
  if(Object.keys(o).sort().join(',')!=='assetId,behavior,id,position,rotationY,scale')throw Error('Unexpected object fields.');
  if(!validId(o.id))throw Error('Invalid object ID.');
  if(typeof o.assetId!=='string'||!assets.has(o.assetId))throw Error('Model is not in the approved catalogue.');
  if(!validPosition(o.position))throw Error('Object is outside the build area.');
  if(!finiteBetween(o.rotationY,-Math.PI*100,Math.PI*100))throw Error('Invalid rotation.');
  if(!finiteBetween(o.scale,EDITOR_LIMITS.minScale,EDITOR_LIMITS.maxScale))throw Error('Invalid scale.');
  if(!EDITOR_BEHAVIORS.includes(o.behavior as EditorBehavior))throw Error('Invalid behavior.');
  return {id:o.id,assetId:o.assetId,position:[...o.position],rotationY:o.rotationY,scale:o.scale,behavior:o.behavior as EditorBehavior};
}
export function parseEditorDocument(value:unknown,assets:EditorAssets):EditorDocument {
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid world document.');
  const d=value as Record<string,unknown>;
  if(Object.keys(d).sort().join(',')!=='objects,version'||d.version!==1||!Array.isArray(d.objects))throw Error('Unsupported world document.');
  if(d.objects.length>EDITOR_LIMITS.maxObjects)throw Error('World object limit exceeded.');
  const seen=new Set<string>();
  const objects=d.objects.map(raw=>{
    const o=ensureObject(raw,assets);
    if(seen.has(o.id))throw Error('Duplicate object ID.');
    seen.add(o.id);return o;
  });
  return {version:1,objects};
}
export function readEditorJSON(text:string,assets:EditorAssets):EditorDocument {
  if(text.length>250_000)throw Error('Document is too large.');
  let data:unknown;
  try{data=JSON.parse(text);}catch{throw Error('Not a valid world JSON document.');}
  return parseEditorDocument(data,assets);
}
export function serializeEditorDocument(doc:EditorDocument,assets:EditorAssets):string {
  return JSON.stringify(parseEditorDocument(doc,assets),null,2);
}
export function loadEditorHistory(doc:EditorDocument,assets:EditorAssets):EditorHistory {
  return {past:[],present:parseEditorDocument(doc,assets),future:[]};
}
function edited(state:EditorHistory,doc:EditorDocument):EditorHistory {
  if(JSON.stringify(state.present)===JSON.stringify(doc))return state;
  return {past:[...state.past.slice(-(EDITOR_LIMITS.maxHistory-1)),state.present],present:doc,future:[]};
}
export function editWorld(state:EditorHistory,action:EditorAction,assets:EditorAssets):EditorHistory {
  const objects=state.present.objects;
  let next:EditorObject[];
  if(action.type==='add'){
    if(objects.length>=EDITOR_LIMITS.maxObjects)throw Error('World has reached the object limit.');
    if(!validId(action.id)||objects.some(o=>o.id===action.id))throw Error('Invalid or duplicate object ID.');
    const asset=assets.get(action.assetId);
    if(!asset)throw Error('Unknown catalogue model.');
    const placed=ensureObject({id:action.id,assetId:action.assetId,position:action.position??[0,0,0],rotationY:0,scale:defaultAssetScale(asset),behavior:'none'},assets);
    next=[...objects,placed];
  }else{
    const index=objects.findIndex(o=>o.id===action.id);
    if(index<0)throw Error('Object was not found.');
    const current=objects[index];
    if(action.type==='remove')next=objects.filter(o=>o.id!==action.id);
    else if(action.type==='duplicate'){
      if(objects.length>=EDITOR_LIMITS.maxObjects)throw Error('World has reached the object limit.');
      if(!validId(action.newId)||objects.some(o=>o.id===action.newId))throw Error('Invalid or duplicate object ID.');
      const copy=ensureObject({...current,id:action.newId,position:[current.position[0]+1,current.position[1],current.position[2]+1]},assets);
      next=[...objects,copy];
    }else{
      const updated=ensureObject(action.type==='transform'?{...current,...(action.position?{position:action.position}:{}),...(action.rotationY!==undefined?{rotationY:action.rotationY}:{}),...(action.scale!==undefined?{scale:action.scale}:{})}:{...current,behavior:action.behavior},assets);
      next=objects.map((o,i)=>i===index?updated:o);
    }
  }
  return edited(state,{version:1,objects:next});
}
export function undoEditor(state:EditorHistory):EditorHistory {
  if(!state.past.length)return state;
  return {past:state.past.slice(0,-1),present:state.past[state.past.length-1],future:[state.present,...state.future]};
}
export function redoEditor(state:EditorHistory):EditorHistory {
  if(!state.future.length)return state;
  return {past:[...state.past,state.present].slice(-EDITOR_LIMITS.maxHistory),present:state.future[0],future:state.future.slice(1)};
}
