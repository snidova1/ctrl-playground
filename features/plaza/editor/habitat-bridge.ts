import {BUILD_ASSETS,type BuildAsset} from '../build-assets';
import {parseEditorDocument,type EditorBehavior,type EditorDocument,type EditorAssets} from './model';
import {layoutSchema,type WorldObject} from '@/features/habitat/types';

/** CLR procedural primitives already supported by Habitat. Not remote assets. */
const primitiveNames:ReadonlyArray<[string,string]>=[
  ['ctrl-block','Building block'],['ctrl-seat','Seat'],['ctrl-lamp','Light'],['ctrl-door','Door'],
  ['ctrl-switch','Switch'],['ctrl-portal','World portal'],['ctrl-marker','Checkpoint'],
];
export const HABITAT_PRIMITIVES:readonly BuildAsset[]=primitiveNames.map(([id,name])=>({
  id,name,category:'playground',url:'',thumbnailUrl:'',bounds:[1,1,1],
  center:[0,.5,0],groundOffset:0,collision:id==='ctrl-block'||id==='ctrl-door'?'solid':'none',
  sourcePack:'CTRL procedural',bytes:0,animationClips:[],
}));
export function editorAssetIndex():ReadonlyMap<string,BuildAsset>{
  return new Map([...BUILD_ASSETS,...HABITAT_PRIMITIVES].map(asset=>[asset.id,asset]));
}
const fromHabitat:Record<WorldObject['behavior'],EditorBehavior>={
  decoration:'none',solid:'solid',seat:'sit',light:'toggle-light',door:'open-close',
  switch:'button',spin:'spin',portal:'portal',checkpoint:'checkpoint',finish:'finish',
};
const toHabitat:Record<EditorBehavior,WorldObject['behavior']>={
  none:'decoration',solid:'solid',sit:'seat', 'toggle-light':'light','open-close':'door',
  button:'switch',spin:'spin',portal:'portal',checkpoint:'checkpoint',finish:'finish',
};
/** Import every object, or reject; never silently drop unsupported models/metadata. */
export function importHabitatLayout(objects:readonly WorldObject[],assets:EditorAssets):EditorDocument {
  return parseEditorDocument({version:1,objects:objects.map(o=>({
    id:o.id,assetId:o.assetId,position:[o.x,o.y,o.z],rotationY:o.rotation,
    scale:o.scale,behavior:fromHabitat[o.behavior],name:o.name,target:o.target,
  }))},assets);
}
/** Server still validates this payload and checks wallet ownership and revision. */
export function exportHabitatLayout(doc:EditorDocument,assets:ReadonlyMap<string,BuildAsset>):WorldObject[] {
  const safe=parseEditorDocument(doc,assets);
  const objects=safe.objects.map(o=>{
    const asset=assets.get(o.assetId);
    if(!asset)throw Error('Unknown catalog model.');
    const name=(o.name??asset.name).trim().slice(0,60);
    const candidate={
      id:o.id,assetId:o.assetId,name,x:o.position[0],y:o.position[1],z:o.position[2],
      rotation:o.rotationY,scale:o.scale,behavior:toHabitat[o.behavior],target:o.target??'',
    };
    return candidate;
  });
  const result=layoutSchema.safeParse(objects);
  if(!result.success)throw Error('This draft cannot be saved to Habitat. Use valid UUIDs, keep objects within world boundaries and connect switch targets correctly.');
  return result.data;
}
