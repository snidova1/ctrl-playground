import {describe,expect,it} from 'vitest';
import {previewStudioImport} from '@/features/habitat/studio-map-adapter';

const site=(slug:string,x=0,z=0,rest:Record<string,unknown>={})=>({
  assetRef:{source:'site',slug},x,z,...rest,
});

describe('Three.js Assets Studio -> CTRL draft experiment',()=>{
  it('maps approved Studio JSON slugs to locally bundled assets',()=>{
    const result=previewStudioImport({
      format:'mapproj',version:1,placements:[
        site('tree_oak',-4,-3,{ry:1.2,s:2}),
        site('bench',2,0),
        site('lampSquareFloor',4,1),
      ],
    });
    expect(result.format).toBe('mapproj');
    expect(result.objects.map(o=>o.assetId)).toEqual([
      'nature-kit/tree_oak','furniture-kit/bench','furniture-kit/lampSquareFloor',
    ]);
    expect(result.objects.map(o=>o.behavior)).toEqual(['decoration','seat','light']);
    expect(result.objects[0]).toMatchObject({x:-4,y:0,z:-3,rotation:1.2,scale:2,target:''});
    expect(result.skipped).toHaveLength(0);
    expect(new Set(result.objects.map(o=>o.id)).size).toBe(3);
  });

  it('supports semantic WorldPlan v1 hints without external downloads',()=>{
    const result=previewStudioImport({
      schemaVersion:1,placements:[
        {id:'p1',kind:'tree',assetHint:'oak',x:-2,z:-3,rotation:.4},
        {id:'p2',kind:'bench',x:2,z:3,rotation:0},
      ],
    });
    expect(result.objects.map(o=>o.assetId)).toEqual([
      'nature-kit/tree_oak','furniture-kit/bench',
    ]);
    expect(result.objects[0].rotation).toBe(.4);
    expect(result.objects[0].scale).toBe(1);
  });

  it('refuses local/remote references and unknown site slugs',()=>{
    const result=previewStudioImport({
      format:'mapproj',version:1,placements:[
        site('https://attacker.example/scene.glb'),
        site('../../private/avatar.vrm'),
        {assetRef:{source:'local',projectId:'untrusted-project'},x:2,z:0},
        site('bench',3,0),
      ],
    });
    expect(result.objects).toHaveLength(1);
    expect(result.objects[0].assetId).toBe('furniture-kit/bench');
    expect(result.skipped).toHaveLength(3);
  });

  it('skips out-of-bounds, nonfinite and malformed transforms',()=>{
    const result=previewStudioImport({
      format:'mapproj',version:1,placements:[
        site('bench',16,0),
        site('bench',0,-9),
        site('bench',0,0,{s:0}),
        site('bench',0,0,{y:Infinity}),
        site('bench',-1,2),
      ],
    });
    expect(result.objects).toHaveLength(1);
    expect(result.skipped).toHaveLength(4);
  });

  it('rejects unsupported versions, malformed docs and overbudget imports',()=>{
    expect(()=>previewStudioImport({format:'mapproj',version:2,placements:[]})).toThrow(/mapproj v1/);
    expect(()=>previewStudioImport({schemaVersion:2,placements:[]})).toThrow(/WorldPlan v1/);
    expect(()=>previewStudioImport({format:'mapproj',version:1})).toThrow(/placements/);
    expect(()=>previewStudioImport({format:'mapproj',version:1,placements:Array.from({length:121},()=>site('bench'))})).toThrow(/120/);
  });

  it('does not silently import road-network cells',()=>{
    const result=previewStudioImport({
      format:'mapproj',version:1,placements:[site('floor')],
      roads:{module:4,cells:[{x:0,z:0,family:'street'}]},
    });
    expect(result.objects).toHaveLength(1);
    expect(result.skipped.join(' ')).toMatch(/road-network/);
  });
});
