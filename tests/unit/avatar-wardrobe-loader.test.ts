import {afterEach,describe,expect,it,vi} from 'vitest';
import {loadWardrobe} from '@/features/plaza/characters/wardrobe';
import {wardrobeStyles} from '@/features/plaza/characters/wardrobe-catalog';
// Deliberately minimal metadata fixtures: these must be rejected BEFORE GLTF parsing.
function metadataGlb(meta:Record<string,unknown>){
 const encoded=new TextEncoder().encode(JSON.stringify(meta));const length=Math.ceil(encoded.length/4)*4;
 const data=new ArrayBuffer(20+length),view=new DataView(data);
 [0x46546c67,2,data.byteLength,length,0x4e4f534a].forEach((v,i)=>view.setUint32(i*4,v,true));
 const json=new Uint8Array(data,20);json.fill(32);json.set(encoded);return data;
}
afterEach(()=>vi.unstubAllGlobals());
describe('wardrobe fixed registry and metadata guard',()=>{
 it('rejects arbitrary wardrobe IDs without making any request',async()=>{
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  await expect(loadWardrobe(undefined,'https://example.invalid/not-reviewed.glb' as never)).rejects.toThrow('Unknown wardrobe asset');
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('matches metadata identity against the selected registry entry',async()=>{
  const fetcher=vi.fn(async()=>new Response(metadataGlb({extras:{ctrlWardrobe:{id:'not-reviewed',targetRestBound:true}}})));vi.stubGlobal('fetch',fetcher);
  await expect(loadWardrobe()).rejects.toThrow('Unreviewed wardrobe asset');
  expect(fetcher).toHaveBeenCalledWith(wardrobeStyles[1].url,{signal:undefined});
 });
 it('rejects external resources even when the costume ID is approved',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(metadataGlb({extras:{ctrlWardrobe:{id:'darkness-studio',supportedCharacterId:'ctrl-anime-female-studio',targetRestBound:true}},images:[{uri:'https://example.invalid/art.png'}]}))));
  await expect(loadWardrobe()).rejects.toThrow('Unreviewed wardrobe asset');
 });
 it('honors cancellation before parsing or applying any garment',async()=>{
  const controller=new AbortController();controller.abort();
  vi.stubGlobal('fetch',vi.fn(async()=>new Response(metadataGlb({extras:{ctrlWardrobe:{id:'darkness-studio',targetRestBound:true}}}))));
  await expect(loadWardrobe(controller.signal)).rejects.toMatchObject({name:'AbortError'});
 });
});
