import {describe,expect,it} from 'vitest';
import {BUILD_ASSETS} from '@/features/plaza/build-assets';
import {editorAssetIndex,exportHabitatLayout,importHabitatLayout,HABITAT_PRIMITIVES} from '@/features/plaza/editor/habitat-bridge';
import type {WorldObject} from '@/features/habitat/types';

const assets=editorAssetIndex();
const a='550e8400-e29b-41d4-a716-446655440000';
const b='550e8400-e29b-41d4-a716-446655440001';
const saved:WorldObject[]=[
  {id:a,assetId:BUILD_ASSETS[0].id,name:'Handcrafted wall',x:2,y:0,z:3,rotation:1.25,scale:1.3,behavior:'solid',target:''},
  {id:b,assetId:'ctrl-lamp',name:'My little lamp',x:-1,y:0,z:5,rotation:0,scale:1,behavior:'light',target:''},
];
describe('Habitat <-> advanced editor integration',()=>{
  it('round-trips real catalog IDs and built-in CTRL primitives losslessly',()=>{
    expect(assets.size).toBe(BUILD_ASSETS.length+HABITAT_PRIMITIVES.length);
    const doc=importHabitatLayout(saved,assets);
    expect(doc.objects.map(o=>o.name)).toEqual(['Handcrafted wall','My little lamp']);
    expect(doc.objects[1].behavior).toBe('toggle-light');
    expect(exportHabitatLayout(doc,assets)).toEqual(saved);
  });
  it('preserves switch targets and portal destination IDs',()=>{
    const objects:WorldObject[]=[
      {...saved[0],behavior:'door'},
      {...saved[1],assetId:'ctrl-switch',behavior:'switch',target:a},
    ];
    expect(exportHabitatLayout(importHabitatLayout(objects,assets),assets)).toEqual(objects);
  });
  it('rejects edits that break Habitat IDs, bounds or references before POST',()=>{
    const doc=importHabitatLayout(saved,assets);
    expect(()=>exportHabitatLayout({...doc,objects:doc.objects.map((o,i)=>i===0?{...o,id:'not-a-uuid'}:o)},assets)).toThrow(/saved/i);
    expect(()=>exportHabitatLayout({...doc,objects:doc.objects.map((o,i)=>i===0?{...o,position:[0,0,13] as [number,number,number]}:o)},assets)).toThrow(/build area/i);
    expect(()=>exportHabitatLayout({...doc,objects:doc.objects.map((o,i)=>i===0?{...o,behavior:'button' as const,target:'missing'}:o)},assets)).toThrow(/saved/i);
  });
  it('never silently drops unknown models when loading server layouts',()=>{
    expect(()=>importHabitatLayout([{...saved[0],assetId:'https://untrusted.invalid/thing.glb'}],assets)).toThrow(/catalogue/i);
  });
});
