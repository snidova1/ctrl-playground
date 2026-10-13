import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {MeshStandardMaterial} from 'three';
import {getBuildAsset} from '../../features/plaza/build-assets';
import {TOWN_POLISH_ASSETS,TOWN_RENDER_ALIASES} from '../../features/habitat/town-asset-manifest';
import {townMaterial} from '../../features/habitat/town-assets';
import {createPavingGeometry} from '../../features/habitat/town-paving';
import {gardenPlanting} from '../../features/habitat/town-planting';
import {TOWN_PLANTING_CLEARANCES,TOWN_PROP_OBSTACLES} from '../../features/habitat/town-prop-layout';
import {isPublicWorldWalkable,navigatePublicWorld} from '../../features/habitat/public-world-geography';
import {townTerrainHeight,TOWN_HILLS} from '../../features/habitat/town-terrain';
import {TOWN_PALETTE} from '../../features/habitat/town-palette';

describe('complete Public World asset polish',()=>{
 it('uses existing licensed local models within a small combined download budget',()=>{
  const provenance=JSON.parse(readFileSync(new URL('../../public/plaza/build-kit/provenance.json',import.meta.url),'utf8'));
  expect(provenance.license).toBe('CC0-1.0');
  let bytes=0;
  for(const id of TOWN_POLISH_ASSETS){
   const asset=getBuildAsset(id);expect(asset,id).toBeDefined();
   expect(provenance.packs.some((p:{pack:string})=>p.pack===asset!.sourcePack)).toBe(true);
   expect(asset!.bytes).toBeLessThan(50000);bytes+=asset!.bytes;
   expect(readFileSync(new URL('../../public'+asset!.url,import.meta.url)).toString('ascii',0,4)).toBe('glTF');
  }
  expect(bytes).toBeLessThan(300000);
 });
 it('fixes diffuse vegetation without mutating materials cached by Common Ground/Habitat',()=>{
  const original=new MeshStandardMaterial({color:'#29c9aa',metalness:1,roughness:.7});original.name='leafsGreen';
  const before=original.color.getHex();
  const adapted=townMaterial(original) as MeshStandardMaterial;
  expect(adapted).not.toBe(original);expect(adapted.metalness).toBe(0);expect(adapted.color.getHexString()).toBe(TOWN_PALETTE.sage.slice(1));
  expect(original.metalness).toBe(1);expect(original.color.getHex()).toBe(before);expect(original.roughness).toBe(.7);
  adapted.dispose();original.dispose();
 });
 it('keeps replacement chairs/benches inside their original interaction footprints',()=>{
  for(const [from,to] of Object.entries(TOWN_RENDER_ALIASES)){
   const source=getBuildAsset(from)!,target=getBuildAsset(to)!;
   expect(target.bounds[0]).toBeLessThanOrEqual(source.bounds[0]+.001);
   expect(target.bounds[2]).toBeLessThanOrEqual(source.bounds[2]+.001);
   expect(Math.abs(target.bounds[1]-source.bounds[1])).toBeLessThan(.025);
  }
 });
 it('joins paving textures at a shared world origin instead of restarting UVs',()=>{
  const a=createPavingGeometry(0,0,4.8,4.8),b=createPavingGeometry(4.8,0,4.8,4.8);
  const u=a.getAttribute('uv'),v=b.getAttribute('uv');
  expect(u.getX(1)).toBeCloseTo(v.getX(0),6);expect(u.getY(1)).toBeCloseTo(v.getY(0),6);
  expect(u.getX(1)-u.getX(0)).toBeCloseTo(1,6);
  a.dispose();b.dispose();
 });
 it('keeps authored flower/leaf clusters away from café and bench seating',()=>{
  for(const kind of ['flower','grass','shrub'] as const){
   const plants=gardenPlanting(kind);expect(plants.length).toBeGreaterThan(20);expect(plants).toEqual(gardenPlanting(kind));
   for(const p of plants)expect(TOWN_PLANTING_CLEARANCES.some(c=>Math.abs(p.x-c.x)<c.width/2&&Math.abs(p.z-c.z)<c.depth/2)).toBe(false);
  }
 });
 it('blocks the actual new picnic furniture, pots and produce crates',()=>{
  for(const p of TOWN_PROP_OBSTACLES)expect(isPublicWorldWalkable(p.x,p.z),JSON.stringify(p)).toBe(false);
  const stop=navigatePublicWorld({x:11,z:15},{x:11,z:18.5});expect(stop.z).toBeLessThan(17.2);
  expect(isPublicWorldWalkable(0,6)).toBe(true);expect(isPublicWorldWalkable(17,6)).toBe(true);
 });
 it('grounds decorative hill trees without raising any walkable terrain',()=>{
  for(let x=-32;x<=32;x+=2)for(let z=-30;z<=31;z+=2)expect(townTerrainHeight(x,z)).toBeLessThanOrEqual(0);
  for(const [x,z,,height] of TOWN_HILLS)expect(townTerrainHeight(x,z)).toBeGreaterThanOrEqual(height*.68-.001);
 });
});
