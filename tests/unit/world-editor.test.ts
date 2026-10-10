import {describe,expect,it} from 'vitest';
import {EDITOR_LIMITS,editWorld,loadEditorHistory,newEditorHistory,parseEditorDocument,readEditorJSON,redoEditor,serializeEditorDocument,undoEditor,type EditorAssets} from '@/features/plaza/editor/model';

const assets:EditorAssets=new Map([
  ['building-kit/wall',{id:'building-kit/wall',category:'architecture',collision:'solid'}],
  ['furniture-kit/chair',{id:'furniture-kit/chair',category:'furniture',collision:'solid'}],
]);
const addWall={type:'add' as const,id:'wall-1',assetId:'building-kit/wall'};

describe('CTRL world editor draft',()=>{
  it('places only approved assets and rejects duplicate or malformed IDs',()=>{
    const draft=editWorld(newEditorHistory(),addWall,assets);
    expect(draft.present.objects).toHaveLength(1);
    expect(draft.present.objects[0]).toMatchObject({id:'wall-1',scale:1,behavior:'solid',position:[0,0,0]});
    expect(()=>editWorld(draft,addWall,assets)).toThrow(/duplicate/i);
    expect(()=>editWorld(draft,{type:'add',id:'bad',assetId:'https://outside.example/evil.glb'},assets)).toThrow(/catalogue/i);
    expect(()=>editWorld(draft,{type:'add',id:'script<script>',assetId:'building-kit/wall'},assets)).toThrow(/ID/i);
  });
  it('supports transform, duplication, remove, undo, redo and redo invalidation',()=>{
    let s=editWorld(newEditorHistory(),addWall,assets);
    s=editWorld(s,{type:'transform',id:'wall-1',position:[2,0,-3],rotationY:Math.PI/2,scale:1.5},assets);
    s=editWorld(s,{type:'duplicate',id:'wall-1',newId:'wall-2'},assets);
    expect(s.present.objects[1].position).toEqual([3,0,-2]);
    expect(s.present.objects[1].scale).toBe(1.5);
    s=undoEditor(s);
    expect(s.present.objects).toHaveLength(1);
    s=redoEditor(s);
    expect(s.present.objects).toHaveLength(2);
    s=editWorld(s,{type:'remove',id:'wall-2'},assets);
    expect(s.future).toHaveLength(0);
    expect(redoEditor(s)).toBe(s);
  });
  it('enforces transform ranges, finite numbers and behavior allowlists',()=>{
    const s=editWorld(newEditorHistory(),addWall,assets);
    expect(()=>editWorld(s,{type:'transform',id:'wall-1',position:[25,0,0]},assets)).toThrow(/build area/i);
    expect(()=>editWorld(s,{type:'transform',id:'wall-1',position:[NaN,0,0]},assets)).toThrow(/build area/i);
    expect(()=>editWorld(s,{type:'transform',id:'wall-1',scale:0},assets)).toThrow(/scale/i);
    expect(()=>editWorld(s,{type:'behavior',id:'wall-1',behavior:'javascript' as never},assets)).toThrow(/behavior/i);
    const tagged=editWorld(s,{type:'behavior',id:'wall-1',behavior:'toggle-light'},assets);
    expect(tagged.present.objects[0].behavior).toBe('toggle-light');
  });
  it('validates imported worlds and emits round-trippable inert JSON',()=>{
    const s=editWorld(newEditorHistory(),{type:'add',id:'chair-1',assetId:'furniture-kit/chair'},assets);
    expect(s.present.objects[0].scale).toBe(2.5);
    const json=serializeEditorDocument(s.present,assets);
    expect(readEditorJSON(json,assets)).toEqual(s.present);
    expect(loadEditorHistory(s.present,assets).past).toHaveLength(0);
    expect(()=>readEditorJSON('{"version":1,"objects":[{"id":"a","assetId":"unknown","position":[0,0,0],"rotationY":0,"scale":1,"behavior":"none"}]}',assets)).toThrow(/catalogue/i);
    expect(()=>parseEditorDocument({...s.present,script:'alert(1)'},assets)).toThrow(/document/i);
    expect(()=>parseEditorDocument({version:1,objects:[s.present.objects[0],s.present.objects[0]]},assets)).toThrow(/duplicate/i);
    expect(()=>readEditorJSON('x'.repeat(250001),assets)).toThrow(/too large/i);
    expect(()=>parseEditorDocument({version:1,objects:Array.from({length:EDITOR_LIMITS.maxObjects+1},(_,i)=>({...s.present.objects[0],id:'item-'+i}))},assets)).toThrow(/limit/i);
  });
});
