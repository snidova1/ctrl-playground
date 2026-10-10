/** ETH Exclusive is curated ABOVE the 3M+ CTRL Signature tier.
 * The USD band is the list price; native ETH is quoted at time of purchase.
 * No purchased products, payment contract or wallet transfers are live.
 */
export const ETH_EXCLUSIVE_BANDS=[
 {id:'atelier',label:'Atelier',usdMin:1,usdMax:10,quality:'Bespoke crafted props and detailed decorative pieces'},
 {id:'estate',label:'Estate',usdMin:10,usdMax:50,quality:'Premium architecture and designed room sets'},
 {id:'masterpiece',label:'Masterpiece',usdMin:50,usdMax:100,quality:'Flagship landmarks and fully interactive scenes'},
] as const;
export type EthExclusiveBand=typeof ETH_EXCLUSIVE_BANDS[number]['id'];
export interface EthProduct{
 id:string;title:string;band:EthExclusiveBand;priceUsdCents:number;
 approvedAssetIds:readonly string[];licenseEvidenceRef:string;sha256:string;
 previewUrl:string;released:boolean;
}
export const ETH_PRODUCTS:readonly EthProduct[]=[];
export const ETH_SHOP_STATUS='curation-only-not-live' as const;
export function eligibleEthProduct(p:EthProduct){
 const band=ETH_EXCLUSIVE_BANDS.find(b=>b.id===p.band);
 return !!band&&p.released&&Number.isSafeInteger(p.priceUsdCents)&&p.priceUsdCents>=band.usdMin*100&&p.priceUsdCents<=band.usdMax*100&&p.approvedAssetIds.length>0&&p.licenseEvidenceRef.length>0&&/^[0-9a-f]{64}$/i.test(p.sha256)&&p.previewUrl.startsWith('/assets/');
}
