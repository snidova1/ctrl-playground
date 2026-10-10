import {describe,expect,it} from 'vitest';
import {activatePreviewObject,initialPreviewState,isInteractiveInPreview} from '@/features/plaza/editor/preview';
import type {EditorDocument,EditorObject} from '@/features/plaza/editor/model';
function object(id:string,behavior:EditorObject['behavior']):EditorObject {
  return {id,assetId:'building-kit/wall',position:[0,0,0],rotationY:0,scale:1,behavior};
}
const doc:EditorDocument={version:1,objects:[
  object('light','toggle-light'),object('door','open-close'),object('platform','spin'),
  object('point-a','checkpoint'),object('point-b','checkpoint'),object('finish','finish'),object('plain','none')
]};
describe('world editor live preview',()=>{
  it('toggles lights, doors and spinning objects without modifying the world',()=>{
    let s=initialPreviewState();
    for(const id of ['light','door','platform']) {
      s=activatePreviewObject(doc,s,id);
      expect(s.active[id]).toBe(true);
      s=activatePreviewObject(doc,s,id);
      expect(s.active[id]).toBe(false);
    }
    expect(doc.objects[0].behavior).toBe('toggle-light');
    expect(s.completed).toBe(false);
  });
  it('requires all checkpoints before completion and deduplicates visits',()=>{
    let s=activatePreviewObject(doc,initialPreviewState(),'finish');
    expect(s.completed).toBe(false);
    s=activatePreviewObject(doc,s,'point-a');
    s=activatePreviewObject(doc,s,'point-a');
    expect(s.checkpoints).toEqual(['point-a']);
    s=activatePreviewObject(doc,s,'finish');
    expect(s.completed).toBe(false);
    s=activatePreviewObject(doc,s,'point-b');
    s=activatePreviewObject(doc,s,'finish');
    expect(s.completed).toBe(true);
  });
  it('ignores unknown IDs and non-functional tags',()=>{
    const s=initialPreviewState();
    expect(activatePreviewObject(doc,s,'unknown')).toBe(s);
    expect(activatePreviewObject(doc,s,'plain')).toBe(s);
    expect(isInteractiveInPreview(object('x','sit'))).toBe(false);
    expect(isInteractiveInPreview(object('x','portal'))).toBe(false);
    expect(isInteractiveInPreview(object('x','spin'))).toBe(true);
  });
  it('does not complete a course with no checkpoints',()=>{
    const d:EditorDocument={version:1,objects:[object('finish','finish')]};
    const s=activatePreviewObject(d,initialPreviewState(),'finish');
    expect(s.completed).toBe(false);
  });
});
