import {describe,it,expect} from 'vitest';
import {ETH_EXCLUSIVE_BANDS,ETH_PRODUCTS,ETH_SHOP_STATUS,eligibleEthProduct,type EthProduct} from '@/features/plaza/editor/eth-exclusive';
describe('ETH exclusive price tiers and release gates',()=>{
 it('shows correct USD bands',()=>expect(ETH_EXCLUSIVE_BANDS.map(b=>[b.usdMin,b.usdMax])).toEqual([[1,10],[10,50],[50,100]]));
 it('refuses sales while no real approved products exist',()=>{expect(ETH_SHOP_STATUS).toBe('curation-only-not-live');expect(ETH_PRODUCTS).toHaveLength(0);});
 it('requires price fit, model artifact and license receipt for each SKU',()=>{
 const p:EthProduct={id:'demo',title:'Demo',band:'atelier',priceUsdCents:1000,approvedAssetIds:[],licenseEvidenceRef:'',sha256:'',previewUrl:'https://bad.invalid/x.glb',released:true};
 expect(eligibleEthProduct(p)).toBe(false);
 expect(eligibleEthProduct({...p,approvedAssetIds:['example'],licenseEvidenceRef:'receipt',sha256:'a'.repeat(64),previewUrl:'/assets/example.glb'})).toBe(true);
 expect(eligibleEthProduct({...p,band:'masterpiece'})).toBe(false);
 });
});
