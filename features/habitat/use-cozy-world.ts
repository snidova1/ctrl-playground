'use client';
import {useCallback,useEffect,useState} from 'react';
import type {LifeState,LifeWorldView} from '@/domain/cozy-life';
import {COZY_GUEST_STORAGE,loadGuestState} from '@/features/cozy-life/client';
const viewOf=(state:LifeState):LifeWorldView=>({beds:state.beds,gardenAnchor:state.gardenAnchor,decorations:state.decorations??[]});
/** Host views come from the ACL-protected read endpoint, never the visitor's bag. */
export function useCozyWorld({local=false,worldId,owner=false}:{local?:boolean;worldId?:string;owner?:boolean}){
 const [view,setView]=useState<LifeWorldView|null>(null),[error,setError]=useState('');
 const [revision,setRevision]=useState(0);const refresh=useCallback(()=>setRevision(r=>r+1),[]);
 useEffect(()=>{
  setView(null);setError('');
  if(!local&&!worldId)return;
  let stopped=false;let pending=false;let generation=0;const abort=new AbortController();
  const read=async()=>{if(pending||stopped)return;pending=true;const reading=generation;try{
   if(local){const next=viewOf(loadGuestState(localStorage));if(!stopped&&reading===generation){setView(next);setError('');}}
   else{const response=await fetch(`/api/cozy-life/world?worldId=${encodeURIComponent(worldId!)}`,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.any([abort.signal,AbortSignal.timeout(12_000)])});
    if(!response.ok){if((response.status===401||response.status===403||response.status===404)&&!stopped)setView(null);throw new Error('Catatan kebun belum dapat dimuat.');}
    const next=await response.json() as LifeWorldView;if(!Array.isArray(next.beds)||!Array.isArray(next.decorations))throw new Error('Catatan kebun belum lengkap.');if(!stopped&&reading===generation){setView(next);setError('');}}
  }catch(reason){if(!stopped)setError(reason instanceof Error?reason.message:'Kebun belum dapat dimuat.');}finally{pending=false;}};
  const changed=(event:Event)=>{const detail=(event as CustomEvent<{state?:LifeState;local?:boolean}>).detail;if(detail?.state&&!!detail.local===local&&(local||owner)){generation++;setView(viewOf(detail.state));setError('');}else if(!local)void read();};
  const stored=(event:StorageEvent)=>{if(local&&event.key===COZY_GUEST_STORAGE)void read();};
  void read();const timer=setInterval(()=>{if(document.visibilityState==='visible')void read();},15_000);
  window.addEventListener('cozy-life-state',changed);window.addEventListener('storage',stored);
  return()=>{stopped=true;abort.abort();clearInterval(timer);window.removeEventListener('cozy-life-state',changed);window.removeEventListener('storage',stored);};
 },[local,worldId,owner,revision]);
 return {view,error,refresh};
}
