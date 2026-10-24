import {describe,it,expect} from 'vitest';
import {Ray,Vector3} from 'three';
import {findDecorSurface} from '../../features/habitat/decor-surfaces';
import {getFurniturePlacementPreview} from '../../features/habitat/furniture-placement';
import type {WorldObject} from '../../features/habitat/types';
const table:WorldObject={id:'00000000-0000-4000-8000-000000000001',assetId:'furniture-kit/tableCoffee',name:'Table',x:0,y:0,z:6,rotation:0,scale:3,behavior:'solid',target:''};
const books:WorldObject={...table,id:'00000000-0000-4000-8000-000000000002',assetId:'furniture-kit/books',name:'Books',scale:1};
const down=(x=0,z=6)=>new Ray(new Vector3(x,3,z),new Vector3(0,-1,0));
describe('user arranged tabletop decor',()=>{
 it('places books on real scaled table surface, preserving IDs',()=>{const result=getFurniturePlacementPreview(down(),books,[table],{});expect(result.valid).toBe(true);expect(result.object.y).toBeCloseTo(.69);expect(result.object.id).toBe(books.id);expect(result.reason).toContain('meja');});
 it('does not promote seats to tabletop decorations',()=>{expect(findDecorSurface(down(),{...books,assetId:'furniture-kit/chair',behavior:'seat'},[table])).toBe(null);});
 it('rejects overhanging or oversized decoration',()=>{expect(findDecorSurface(down(.98),books,[table])).toBe(null);expect(findDecorSurface(down(),{...books,scale:20},[table])).toBe(null);});
 it('accounts for rotated tables and ornaments',()=>{expect(findDecorSurface(down(),{...books,rotation:Math.PI/4},[{...table,rotation:Math.PI/2}])?.y).toBeCloseTo(.69);});
 it('keeps the ground fallback away from tables',()=>{const result=getFurniturePlacementPreview(down(3),books,[table],{});expect(result.valid).toBe(true);expect(result.object.y).toBe(0);});
 it('rejects overlapping ornaments on a table',()=>{const placed={...books,y:.69};const result=getFurniturePlacementPreview(down(),{...books,id:'00000000-0000-4000-8000-000000000003'},[table,placed],{});expect(result.valid).toBe(false);});
 it('does not mutate the source table or decoration',()=>{const before=JSON.stringify([table,books]);findDecorSurface(down(),books,[table]);expect(JSON.stringify([table,books])).toBe(before);});
});
