import type {EditorDocument,EditorObject} from './model';

export interface PreviewState {
  active:Readonly<Record<string,boolean>>;
  checkpoints:readonly string[];
  completed:boolean;
  message:string;
}
/** Preview is an isolated, deterministic simulation. Never alters a persisted world draft. */
export function initialPreviewState():PreviewState {
  return {active:{},checkpoints:[],completed:false,message:'Click an interactive object to test it.'};
}
export function isInteractiveInPreview(item:EditorObject):boolean {
  return ['toggle-light','open-close','spin','checkpoint','finish'].includes(item.behavior);
}
export function activatePreviewObject(doc:EditorDocument,state:PreviewState,id:string):PreviewState {
  const item=doc.objects.find(o=>o.id===id);
  if(!item||!isInteractiveInPreview(item))return state;
  if(item.behavior==='checkpoint'){
    if(state.checkpoints.includes(id))return {...state,message:'Checkpoint already reached.'};
    return {...state,checkpoints:[...state.checkpoints,id],message:'Checkpoint reached.'};
  }
  if(item.behavior==='finish'){
    const required=doc.objects.filter(o=>o.behavior==='checkpoint').map(o=>o.id);
    const complete=required.length>0&&required.some(key=>state.checkpoints.includes(key));
    return {...state,completed:complete,message:complete?'Course completed!':'Reach a checkpoint before finishing.'};
  }
  const wasActive=!!state.active[id],nextActive=!wasActive;
  const message=item.behavior==='toggle-light'?(nextActive?'Light switched on.':'Light switched off.'):
    item.behavior==='open-close'?(nextActive?'Object opened.':'Object closed.'):
    (nextActive?'Object spinning.':'Object stopped.');
  return {...state,active:{...state.active,[id]:nextActive},message};
}
