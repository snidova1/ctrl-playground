import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {layoutSchema,type WorldObject} from './types';

/**
 * A starter cottage and furnished garden, not an empty plot or a fake backdrop.
 * All pieces are allowlisted bundled Kenney CC0 GLBs and editable/savable in the
 * normal builder. Only the wallet owner's untouched revision-0 home is seeded.
 * An open-front dollhouse roof keeps the player visible in the third-person camera.
 */
type StarterSpec=readonly [
  id:string,name:string,x:number,z:number,scale:number,
  behavior?:WorldObject['behavior'],y?:number,rotation?:number
];
const PATIO:StarterSpec[]=([-2,0,2] as const).flatMap(x=>
  ([-5,-3,-1] as const).map(z=>['building-kit/floor','Cottage floor',x,z,1] as const)
);
const COTTAGE:StarterSpec[]=[
  // Five metres of wall behind a central, genuinely walkable entrance.
  ['building-kit/wall-window-square','Left cottage window',-2,-1.25,1,'solid',0,Math.PI/2],
  ['building-kit/wall-doorway-square','Open cottage entrance',0,-1.25,1,'decoration',0,Math.PI/2],
  ['building-kit/wall-window-square','Right cottage window',2,-1.25,1,'solid',0,Math.PI/2],
  ['building-kit/wall','Rear wall left',-2,-5.9,1,'solid',0,Math.PI/2],
  ['building-kit/wall-window-square','Rear cottage window',0,-5.9,1,'solid',0,Math.PI/2],
  ['building-kit/wall','Rear wall right',2,-5.9,1,'solid',0,Math.PI/2],
  ...([-3,3] as const).flatMap(x=>(
    [-4.8,-2.8] as const).map(z=>['building-kit/wall','Cottage side wall',x,z,1,'solid'] as StarterSpec)
  ),
  // Rear roof only: a playable house with interior visibility, not a sealed lid.
  ...([-2,0,2] as const).map(x=>
    ['building-kit/roof-flat-center','Cottage rear roof',x,-4.9,1,'decoration',2.45] as StarterSpec
  ),
  ['building-kit/column','Porch post left',-3,-1.1,.85,'solid'],
  ['building-kit/column','Porch post right',3,-1.1,.85,'solid'],
  ['furniture-kit/rugDoormat','Welcome mat',0,.15,2.4,'decoration'],
];
const FURNITURE:StarterSpec[]=[
  ['furniture-kit/loungeSofa','Living room sofa',0,-4.85,2.8,'decoration'],
  ['furniture-kit/tableCoffee','Coffee table',0,-3.75,2.1,'decoration'],
  ['furniture-kit/chairCushion','Reading chair left',-1.5,-3.45,2.4,'decoration'],
  ['furniture-kit/chairCushion','Reading chair right',1.5,-3.45,2.4,'decoration'],
  ['furniture-kit/rugRounded','Living room rug',0,-4.15,2.7,'decoration'],
  ['furniture-kit/lampSquareFloor','Indoor lamp left',-2.45,-3.4,1.7,'light'],
  ['furniture-kit/lampSquareFloor','Indoor lamp right',2.45,-3.4,1.7,'light'],
  ['furniture-kit/pottedPlant','Indoor fern left',-2.45,-5.2,1.8,'decoration'],
  ['furniture-kit/pottedPlant','Indoor fern right',2.45,-5.2,1.8,'decoration'],
];
const GARDEN:StarterSpec[]=[
  ['furniture-kit/bench','Garden seat left',-4.4,.5,2.2,'seat',0,.35],
  ['furniture-kit/bench','Garden seat right',4.4,.5,2.2,'seat',0,-.35],
  ['furniture-kit/pottedPlant','Porch flowers left',-3.75,-1.15,2,'decoration'],
  ['furniture-kit/pottedPlant','Porch flowers right',3.75,-1.15,2,'decoration'],
  ['nature-kit/tree_oak','Shade tree northwest',-7,-4.6,3,'decoration'],
  ['nature-kit/tree_oak','Shade tree northeast',7,-4.6,3,'decoration'],
  ['nature-kit/tree_default','Garden tree southwest',-6.8,4,2.5,'decoration'],
  ['nature-kit/tree_default','Garden tree southeast',6.8,4,2.5,'decoration'],
  ['nature-kit/plant_bushDetailed','Shrubs left',-4.5,-1.4,2.1,'decoration'],
  ['nature-kit/plant_bushDetailed','Shrubs right',4.5,-1.4,2.1,'decoration'],
  ['nature-kit/flower_redA','Geraniums left',-4,1.7,2,'decoration'],
  ['nature-kit/flower_purpleA','Lavender right',4,1.7,2,'decoration'],
  ['nature-kit/flower_yellowA','Marigolds left',-4,3.5,2,'decoration'],
  ['nature-kit/flower_yellowA','Marigolds right',4,3.5,2,'decoration'],
  ['nature-kit/path_stone','Front stepping stone A',0,1.4,1.7,'decoration'],
  ['nature-kit/path_stone','Front stepping stone B',0,2.65,1.7,'decoration'],
  ['nature-kit/path_stone','Front stepping stone C',0,3.9,1.7,'decoration'],
  ['nature-kit/path_stone','Front stepping stone D',0,5.15,1.7,'decoration'],
  ['nature-kit/fence_simple','Garden fence left',-5.5,1.75,2,'decoration',0,Math.PI/2],
  ['nature-kit/fence_simple','Garden fence right',5.5,1.75,2,'decoration',0,Math.PI/2],
];
const SCENE=[...PATIO,...COTTAGE,...FURNITURE,...GARDEN];
export const STARTER_TEMPLATE_ID='cozy-cottage-v1' as const;
export const STARTER_WORLD_OBJECT_COUNT=SCENE.length;
export function shouldSeedStarterWorld(world:{revision:number;objects:readonly WorldObject[];ownerId:string;id:string}|null,walletUserId:string|null,canEdit:boolean,homeId:string|null):boolean{
  return !!world&&!!walletUserId&&canEdit&&homeId===world.id&&world.ownerId===walletUserId&&world.revision===0&&world.objects.length===0;
}
export function createStarterWorld():WorldObject[]{
  const objects=SCENE.map(([assetId,name,x,z,scale,behavior='decoration',y=0,rotation=0])=>({
    id:crypto.randomUUID(),assetId,name,x,y,z,rotation,scale,behavior,target:''
  }));
  return layoutSchema.parse(objects);
}
export function inspectStarterSourceAssets(){
  const ids=new Set(BUILD_ASSETS.map(a=>a.id));
  return [...new Set(SCENE.map(([id])=>id))].filter(id=>!ids.has(id));
}
