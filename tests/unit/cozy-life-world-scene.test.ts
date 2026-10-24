import {describe,it,expect} from 'vitest';
import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {Box3,Texture} from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {DEFAULT_HOUSE} from '@/features/habitat/modular-house';
import type {WorldObject} from '@/features/habitat/types';
import {findLifePlacement,isLifePlacementFree,lifeFootprint,LIFE_BED_OFFSETS,LIFE_CRAFT_MODELS,nearestLifeInteraction,type LifeWorldView} from '@/features/cozy-life/world-placement';
import {getCropGrowth} from '@/features/cozy-life/world-scene';
const source=readFileSync(resolve('features/cozy-life/world-scene.tsx'),'utf8');
const furniture=(values:Partial<WorldObject>={}):WorldObject=>({id:'00000000-0000-4000-8000-000000000001',assetId:'unknown',name:'Test furniture',x:6,y:0,z:4,rotation:0,scale:4,behavior:'decoration',target:'',...values});
const empty:LifeWorldView={beds:[]};
describe('cozy life conservative world placement',()=>{
  it('returns deterministic legal anchors outside complete home and approach',()=>{
    for(const kind of ['garden','flower-pot','wooden-bench'] as const){
      const point=findLifePlacement([],kind)!;expect(point).not.toBeNull();expect(isLifePlacementFree([],kind,point)).toBe(true);expect(findLifePlacement([],kind)).toEqual(point);
    }
    expect(isLifePlacementFree([],'flower-pot',{x:0,z:-3.5})).toBe(false);
    expect(isLifePlacementFree([],'garden',{x:0,z:6})).toBe(false);
    expect(isLifePlacementFree([],'garden',{x:13,z:11})).toBe(false);
    expect(isLifePlacementFree([],'flower-pot',{x:NaN,z:4})).toBe(false);
  });
  it('reserves changed house cells as full footprint, even away from wall edges',()=>{
    const house=furniture({assetId:'habitat-house',house:{...DEFAULT_HOUSE,cells:[{x:1,z:-1}]}});
    expect(isLifePlacementFree([house],'flower-pot',{x:3,z:-6.5})).toBe(false);
  });
  it('includes rotated furniture of every behavior, existing decor and the garden',()=>{
    const first=findLifePlacement([],'garden')!;
    const object=furniture({...first,rotation:Math.PI/4});
    expect(isLifePlacementFree([object],'garden',first)).toBe(false);
    expect(findLifePlacement([object],'garden')).not.toEqual(first);
    const decor={id:'bench',itemId:'wooden-bench' as const,...first,rotation:Math.PI/3};
    expect(isLifePlacementFree([],'flower-pot',first,[decor])).toBe(false);
    expect(isLifePlacementFree([],'flower-pot',first,[],first)).toBe(false);
    expect(findLifePlacement([],'wooden-bench',[decor],first)).not.toEqual(first);
    expect(lifeFootprint(first,'garden').rx).toBeGreaterThan(Math.max(...LIFE_BED_OFFSETS.map(b=>b.x))+.8);
  });
  it('returns null instead of overlapping when every candidate is occupied',()=>{
    const crowded:WorldObject[]=[];for(let x=-13;x<=13;x+=2)for(let z=-7;z<=11;z+=2)crowded.push(furniture({x,z,scale:4}));
    expect(findLifePlacement(crowded,'garden')).toBeNull();
  });
});
describe('growth, interaction and render contract',()=>{
  const turnip={id:0,crop:'turnip' as const,plantedAt:0,wateredAt:null,readyAt:null};
  it('never grows before watering; uses actual crop grow times and clamps timestamps',()=>{
    expect(getCropGrowth(turnip,999999)).toMatchObject({stage:'seed',progress:0,moist:false});
    const watered={...turnip,wateredAt:1000,readyAt:61000};
    expect(getCropGrowth(watered,0).progress).toBe(0);
    expect(getCropGrowth(watered,16000)).toMatchObject({stage:'sprout',progress:.25,moist:true});
    expect(getCropGrowth(watered,40000).stage).toBe('growing');
    expect(getCropGrowth(watered,61000)).toMatchObject({stage:'ripe',progress:1});
    expect(getCropGrowth({...watered,crop:'tomato',readyAt:121000},61000).progress).toBe(.5);
    expect(getCropGrowth({...watered,crop:'herb',readyAt:46000},46000).stage).toBe('ripe');
  });
  it('has no target without explicit placement, handles ref-independent near/far E queries',()=>{
    expect(nearestLifeInteraction({x:6,z:4},empty)).toBeNull();
    const view={...empty,gardenAnchor:{x:6,z:4}};
    expect(nearestLifeInteraction(undefined,view)).toBeNull();
    expect(nearestLifeInteraction({x:-12,z:11},view)).toBeNull();
    expect(nearestLifeInteraction({x:6,z:4},view)?.tab).toBe('garden');
    expect(nearestLifeInteraction({x:10,z:8},{...empty,decorations:[{id:'pot',itemId:'flower-pot',x:10,z:8,rotation:0}]})?.id).toBe('pot');
  });
  it('keeps opt-in rendering, near-only callbacks, instanced vegetation and effect-only diagnostics',()=>{
    expect(source).toContain('{view.gardenAnchor&&');expect(source).toContain('(view.decorations??[]).map');
    expect(source).toContain('if(!interactive||!pose?.current)return');expect(source).toContain('>LIFE_INTERACTION_RANGE)return');
    expect(source).toContain('<instancedMesh');expect(source).toContain('setInterval(publish,2000)');expect(source).toContain('canvas.dataset.cozyLifeGrowth=JSON.stringify(growth)');
    expect(source).not.toMatch(/fetch\(|localStorage|castShadow|addEventListener|keydown|<Canvas|<ContactShadows|<Environment/);
  });
  it('loads real local CC0 models and aligns their measured bounds to floor and anchor',async()=>{
    for(const model of Object.values(LIFE_CRAFT_MODELS)){
      const asset=getBuildAsset(model.assetId)!;expect(asset).toBeDefined();
      const path=resolve('public',asset.url.slice(1));expect(statSync(path).size).toBe(asset.bytes);
      const bytes=readFileSync(path);const loader=new GLTFLoader();
      // Geometry-only audit: do not emulate DOM image loading or decode textures in Node.
      loader.register(()=>({name:'geometry-only-audit',loadTexture:()=>Promise.resolve(new Texture())}));
      const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
      const box=new Box3().setFromObject(gltf.scene);
      expect((box.min.y+asset.groundOffset)*model.scale).toBeCloseTo(0,4);
      expect((box.min.x+box.max.x)/2-asset.center[0]).toBeCloseTo(0,4);
      expect((box.min.z+box.max.z)/2-asset.center[2]).toBeCloseTo(0,4);
      expect(box.max.y-box.min.y).toBeGreaterThan(0);
    }
  });
});
