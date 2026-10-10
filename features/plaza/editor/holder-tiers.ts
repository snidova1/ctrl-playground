/**
 * Shared policy for real CTRL catalogue IDs. Higher shelves are a CURATION, not proof
 * of extra art quality. Server must read a verified on-chain ERC20 balance at save.
 */
export const HOLDER_ASSET_TIERS=[
 {id:'basic',label:'Basic',minimum:0,subtitle:'Your first place'},
 {id:'studio',label:'Studio',minimum:500_000,subtitle:'Personal interiors'},
 {id:'luxe',label:'Luxe',minimum:1_000_000,subtitle:'Designer furniture'},
 {id:'grand',label:'Grand',minimum:2_000_000,subtitle:'Statement pieces'},
 {id:'signature',label:'Signature',minimum:3_000_001,subtitle:'Collector accents'}
] as const;
export type HolderAssetTier=typeof HOLDER_ASSET_TIERS[number]['id'];
const curated:Record<Exclude<HolderAssetTier,'basic'>,readonly string[]>={
 studio:['furniture-kit/chairCushion','furniture-kit/chairModernCushion','furniture-kit/benchCushion','furniture-kit/benchCushionLow','furniture-kit/bedDouble','furniture-kit/bookcaseOpen','furniture-kit/cabinetBed','furniture-kit/cabinetBedDrawer','furniture-kit/ceilingFan','furniture-kit/deskCorner','furniture-kit/kitchenBar','furniture-kit/kitchenCoffeeMachine','furniture-kit/lampRoundFloor','furniture-kit/lampRoundTable','furniture-kit/loungeChair','furniture-kit/loungeSofa','furniture-kit/loungeSofaLong','furniture-kit/pillowBlue','furniture-kit/rugRectangle','furniture-kit/rugRound','furniture-kit/sideTableDrawers','furniture-kit/tableCoffee','furniture-kit/televisionModern','nature-kit/tent_detailedOpen'],
 luxe:['furniture-kit/bathroomMirror','furniture-kit/bathtub','furniture-kit/chairModernFrameCushion','furniture-kit/hoodModern','furniture-kit/kitchenBarEnd','furniture-kit/kitchenCabinetUpperDouble','furniture-kit/kitchenFridgeBuiltIn','furniture-kit/kitchenFridgeLarge','furniture-kit/kitchenStoveElectric','furniture-kit/lampSquareCeiling','furniture-kit/loungeChairRelax','furniture-kit/loungeDesignChair','furniture-kit/loungeDesignSofa','furniture-kit/loungeSofaCorner','furniture-kit/loungeSofaOttoman','furniture-kit/tableCoffeeGlass','furniture-kit/tableCoffeeGlassSquare','furniture-kit/tableGlass','furniture-kit/wallWindowSlide','nature-kit/bridge_stoneRound'],
 grand:['building-kit/column-wide','building-kit/wall-window-wide-round-detailed','building-kit/wall-window-square-detailed','furniture-kit/loungeDesignSofaCorner','furniture-kit/televisionAntenna','nature-kit/statue_block','nature-kit/statue_column','nature-kit/statue_head','nature-kit/bridge_stone','nature-kit/fence_gate'],
 signature:['nature-kit/statue_obelisk','nature-kit/statue_ring']
};
const tierByAsset=new Map<string,HolderAssetTier>();
for(const tier of ['studio','luxe','grand','signature'] as const)
 for(const assetId of curated[tier])tierByAsset.set(assetId,tier);
export const premiumAssetIds=Object.freeze([...tierByAsset.keys()]);
export function requiredAssetTier(id:string):HolderAssetTier{return tierByAsset.get(id)??'basic';}
export function resolveHolderAssetTier(balance:number|null):HolderAssetTier{
 if(balance===null||!Number.isFinite(balance)||balance<0)return 'basic';
 if(balance>3_000_000)return 'signature';
 if(balance>=2_000_000)return 'grand';
 if(balance>=1_000_000)return 'luxe';
 if(balance>=500_000)return 'studio';
 return 'basic';
}
const level=(tier:HolderAssetTier)=>HOLDER_ASSET_TIERS.findIndex(t=>t.id===tier);
export function canPlaceAsset(id:string,verifiedBalance:number|null){return level(resolveHolderAssetTier(verifiedBalance))>=level(requiredAssetTier(id));}
export function lockedNewAssets(before:readonly {assetId:string}[],after:readonly {assetId:string}[],verifiedBalance:number|null):string[]{
 const oldCount=new Map<string,number>(),newCount=new Map<string,number>();
 for(const o of before)oldCount.set(o.assetId,(oldCount.get(o.assetId)??0)+1);
 for(const o of after)newCount.set(o.assetId,(newCount.get(o.assetId)??0)+1);
 return [...newCount].filter(([id,count])=>count>(oldCount.get(id)??0)&&!canPlaceAsset(id,verifiedBalance)).map(([id])=>id);
}
