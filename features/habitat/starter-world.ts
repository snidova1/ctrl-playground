import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {layoutSchema,type WorldObject} from './types';

/**
 * Editable, wallet-owned starter interior on a clear plot. Every piece is a real pre-shipped
 * Kenney GLB, never a rendering-only decoration or paid/locked-tier object.
 * Called only for an untouched, revision=0 owner home on the signed-in client.
 */
type StarterSpec=readonly [
  id:string, name:string, x:number, z:number, scale:number,
  behavior?:WorldObject['behavior'], y?:number, rotation?:number
];
const SCENE:StarterSpec[]=[
  ['furniture-kit/bench','Living room bench west',-.7,-.4,2.2,'seat',0,0.2],
  ['furniture-kit/bench','Living room bench east',.7,-.4,2.2,'seat',0,-0.2],
  ['furniture-kit/tableCoffeeSquare','Living room coffee table',0,-1.5,1.5,'decoration'],
  ['furniture-kit/lampSquareFloor','Reading lamp west',-1,-3.4,1.7,'light'],
  ['furniture-kit/lampSquareFloor','Reading lamp east',1,-3.4,1.7,'light'],
  ['furniture-kit/pottedPlant','Potted ivy west',-1.05,-4.25,1.4,'decoration'],
  ['furniture-kit/pottedPlant','Potted ivy east',1.05,-4.25,1.4,'decoration'],

];
export const STARTER_TEMPLATE_ID='empty-plot-v2' as const;
export const STARTER_WORLD_OBJECT_COUNT=SCENE.length;
export function shouldSeedStarterWorld(world:{revision:number;objects:readonly WorldObject[];ownerId:string;id:string}|null, walletUserId:string|null, canEdit:boolean, homeId:string|null):boolean {
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
