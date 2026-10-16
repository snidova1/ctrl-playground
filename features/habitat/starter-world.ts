import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {layoutSchema,type WorldObject} from './types';

/**
 * Editable, wallet-owned starter courtyard. Every piece is a real pre-shipped
 * Kenney GLB, never a rendering-only decoration or paid/locked-tier object.
 * Called only for an untouched, revision=0 owner home on the signed-in client.
 */
type StarterSpec=readonly [
  id:string, name:string, x:number, z:number, scale:number,
  behavior?:WorldObject['behavior'], y?:number, rotation?:number
];
const PATIO:StarterSpec[]=([-2,0,2] as const).flatMap(x=>
  ([-5,-3,-1] as const).map(z=>['building-kit/floor','Garden patio',x,z,1] as const)
);
const SCENE:StarterSpec[]=[
  ['building-kit/column','West pavilion column',-3,-5,1.3,'solid'],
  ['building-kit/column','East pavilion column',3,-5,1.3,'solid'],
  ['building-kit/roof-flat-center','Pavilion canopy left',-1,-5,1.25,'decoration',2.7],
  ['building-kit/roof-flat-center','Pavilion canopy right',1,-5,1.25,'decoration',2.7],
  ['furniture-kit/bench','Garden bench west',-1.4,-3.2,2.2,'seat',0,0.2],
  ['furniture-kit/bench','Garden bench east',1.4,-3.2,2.2,'seat',0,-0.2],
  ['furniture-kit/tableCoffeeSquare','Patio coffee table',0,-3.2,2,'decoration'],
  ['furniture-kit/lampSquareFloor','Garden lantern west',-2.6,-0.7,1.7,'light'],
  ['furniture-kit/lampSquareFloor','Garden lantern east',2.6,-0.7,1.7,'light'],
  ['furniture-kit/pottedPlant','Potted ivy west',-2.9,-2.5,2,'decoration'],
  ['furniture-kit/pottedPlant','Potted ivy east',2.9,-2.5,2,'decoration'],
  ['nature-kit/tree_oak','Oak canopy northwest',-6,-5.7,3,'decoration'],
  ['nature-kit/tree_oak','Oak canopy northeast',6,-5.7,3,'decoration'],
  ['nature-kit/tree_default','Garden tree west',-7,1.2,2.5,'decoration'],
  ['nature-kit/tree_default','Garden tree east',7,1.2,2.5,'decoration'],
  ['nature-kit/plant_bushDetailed','Shrub west',-4.7,-1.3,2.2,'decoration'],
  ['nature-kit/plant_bushDetailed','Shrub east',4.7,-1.3,2.2,'decoration'],
  ['nature-kit/flower_redA','Flower patch west',-4,-0.3,2,'decoration'],
  ['nature-kit/flower_purpleA','Flower patch east',4,-0.3,2,'decoration'],
  ['nature-kit/flower_yellowA','Marigolds west',-3.8,2.7,2,'decoration'],
  ['nature-kit/flower_yellowA','Marigolds east',3.8,2.7,2,'decoration'],
  ['nature-kit/path_stone','Entry stepping stone A',0,1.4,1.7,'decoration'],
  ['nature-kit/path_stone','Entry stepping stone B',0,2.65,1.7,'decoration'],
  ['nature-kit/path_stone','Entry stepping stone C',0,3.9,1.7,'decoration'],
  ['nature-kit/path_stone','Entry stepping stone D',0,5.15,1.7,'decoration'],
  ['furniture-kit/tableRound','Breakfast garden table',-8,2,2.2,'solid'],
  ['furniture-kit/chairRounded','Breakfast chair west',-9.5,2,2.6,'seat',0,Math.PI/2],
  ['furniture-kit/chairRounded','Breakfast chair east',-6.5,2,2.6,'seat',0,-Math.PI/2],
  ['food-kit/plate','Breakfast plate',-8.3,2,.7,'decoration',.85],
  ['food-kit/croissant','Breakfast pastry',-8.3,2,.6,'decoration',.92],
  ['food-kit/cup-tea','Garden tea',-7.6,2,.6,'decoration',.85],
  ['furniture-kit/table','Personal writing desk',8,-2.5,2.4,'solid'],
  ['furniture-kit/chair','Studio desk chair',8,-1,2.6,'seat',0,Math.PI],
  ['furniture-kit/bookcaseOpen','Personal studio shelves',8,-5.5,2.2,'solid'],
  ['furniture-kit/pottedPlant','Studio fern',10,-4,2,'decoration'],
  ...([-11,11] as const).flatMap(x=>([-6,-3,0,3,6,9] as const).map(z=>['nature-kit/plant_bushDetailed','Editable garden border',x,z,1.5,'decoration'] as const)),
];
export const STARTER_TEMPLATE_ID='garden-courtyard-v1' as const;
export const STARTER_WORLD_OBJECT_COUNT=PATIO.length+SCENE.length;
export function shouldSeedStarterWorld(world:{revision:number;objects:readonly WorldObject[];ownerId:string;id:string}|null, walletUserId:string|null, canEdit:boolean, homeId:string|null):boolean {
  return !!world&&!!walletUserId&&canEdit&&homeId===world.id&&world.ownerId===walletUserId&&world.revision===0&&world.objects.length===0;
}
export function createStarterWorld():WorldObject[]{
  const objects=[...PATIO,...SCENE].map(([assetId,name,x,z,scale,behavior='decoration',y=0,rotation=0])=>({
    id:crypto.randomUUID(),assetId,name,x,y,z,rotation,scale,behavior,target:''
  }));
  return layoutSchema.parse(objects);
}
export function inspectStarterSourceAssets(){
  const ids=new Set(BUILD_ASSETS.map(a=>a.id));
  return [...new Set([...PATIO,...SCENE].map(([id])=>id))].filter(id=>!ids.has(id));
}
