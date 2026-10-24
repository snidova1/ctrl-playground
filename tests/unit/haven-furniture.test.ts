import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {HAVEN_BUILD_ASSETS} from '@/features/plaza/haven-build-assets';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {catalogPage,collectionAssets} from '@/features/habitat/build-catalog-model';
import {inferFurnitureBehavior} from '@/features/habitat/furniture-interactions';
import {resolveHabitatAssets} from '@/server/habitat/asset-resolver';

describe('new real indoor/outdoor furniture library',()=>{
 it('adds 21 distinct actual embedded textured GLBs, local own-rendered thumbnails and source license metadata',()=>{
  expect(HAVEN_BUILD_ASSETS).toHaveLength(21);const hashes=new Set();
  for(const a of HAVEN_BUILD_ASSETS){
   expect(getBuildAsset(a.id)).toBe(a);const data=readFileSync('public'+a.url);hashes.add(createHash('sha256').update(data).digest('hex'));
   expect(data.readUInt32LE(0)).toBe(0x46546c67);expect(data.readUInt32LE(4)).toBe(2);expect(data.length).toBe(a.bytes);
   const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)).toString());
   expect(json.meshes.length).toBeGreaterThan(0);expect(json.images.length).toBeGreaterThan(0);
   expect(json.images.every((i:{uri?:string;bufferView?:number})=>!i.uri&&typeof i.bufferView==='number')).toBe(true);
   expect(json.buffers.every((b:{uri?:string})=>!b.uri)).toBe(true);
   expect(a.bounds.every(n=>n>0&&n<8)).toBe(true);expect(a.bytes).toBeLessThan(5_000_000);
   expect(statSync('public'+a.thumbnailUrl).size).toBeGreaterThan(1000);
  }
  expect(hashes.size).toBe(21);
  const provenance=JSON.parse(readFileSync('public/plaza/build-kit/haven-cozy/provenance.json','utf8'));
  expect(provenance).toHaveLength(21);expect(provenance.every((p:{license:string;trianglesAfter:number})=>p.license==='CC0-1.0'&&p.trianglesAfter<23000)).toBe(true);
 });
 it('makes new assets immediately discoverable and separates real indoor/outdoor selections',()=>{
  const indoor=collectionAssets('indoor-new'),outdoor=collectionAssets('outdoor-new');expect(indoor).toHaveLength(13);expect(outdoor).toHaveLength(8);
  expect(new Set([...indoor,...outdoor].map(a=>a.id)).size).toBe(21);
  expect(catalogPage('all','',0).assets.slice(0,21).every(a=>a.sourcePack==='haven-cozy')).toBe(true);
  expect(catalogPage('all','bistro',0).assets[0].id).toBe('haven-cozy/outdoor_table_chair_set_01');
 });
 it('resolves the new assets through the existing approved server catalogue',()=>{
  expect(resolveHabitatAssets({ids:HAVEN_BUILD_ASSETS.map(a=>a.id)}).assets).toHaveLength(21);
 });
 it('only simple seating and the actual lamp gain affordances, not table-centers of combined sets',()=>{
  expect(inferFurnitureBehavior('haven-cozy/sofa_03')).toBe('seat');expect(inferFurnitureBehavior('haven-cozy/painted_wooden_bench')).toBe('seat');expect(inferFurnitureBehavior('haven-cozy/vintage_oil_lamp')).toBe('light');
  expect(inferFurnitureBehavior('haven-cozy/outdoor_table_chair_set_01')).toBe('decoration');expect(inferFurnitureBehavior('haven-cozy/wooden_picnic_table')).toBe('decoration');
 });
});
