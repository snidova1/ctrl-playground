'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {BarterAction,LifeAction,LifeResponse,LifeState,ServingAction} from '@/domain/cozy-life';
import {COZY_GUEST_STORAGE,CozyClientError,dispatchLifeState,loadGuestState,requestLife,saveGuestAction} from './client';
import {lifeErrorMessage} from './presentation';
export type CozyIdentity={kind:'guest'}|{kind:'account';profileId?:string}|{kind:'discover'};
export function useCozyLife(open:boolean,identity:CozyIdentity){
 const identityKey=identity.kind==='account'?`profile:${identity.profileId??'session'}`:identity.kind;
 const [state,setState]=useState<LifeState|null>(null),[response,setResponse]=useState<LifeResponse|null>(null),[local,setLocal]=useState(identity.kind==='guest'),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[needsRefresh,setNeedsRefresh]=useState(false),[now,setNow]=useState(0);
 const stateRef=useRef(state),localRef=useRef(local),lock=useRef(false),offset=useRef(0),generation=useRef(0),everAccount=useRef(identity.kind==='account');
 const acceptLocal=useCallback((next:LifeState)=>{offset.current=0;stateRef.current=next;setState(next);setResponse(null);setLocal(true);localRef.current=true;setNow(Date.now());dispatchLifeState(next,true);},[]);
 const accept=useCallback((data:LifeResponse)=>{if(identity.kind==='account'&&identity.profileId&&data.profileId!==identity.profileId)throw new CozyClientError('UNAUTHORIZED',401);everAccount.current=true;offset.current=data.serverNow-Date.now();stateRef.current=data.state;setState(data.state);setResponse(data);setLocal(false);localRef.current=false;setNow(Date.now()+offset.current);dispatchLifeState(data.state,false,data.community);},[identityKey]); // eslint-disable-line react-hooks/exhaustive-deps
 const refresh=useCallback(async()=>{
  if(lock.current)return;lock.current=true;setLoading(true);setError('');const version=generation.current;
  try{
   if(identity.kind==='guest'||(identity.kind==='discover'&&localRef.current&&!everAccount.current)){const next=loadGuestState(localStorage);if(version!==generation.current)return;acceptLocal(next);}
   else{try{const next=await requestLife();if(version!==generation.current)return;accept(next);}catch(error){if(version!==generation.current)return;if(identity.kind==='discover'&&!everAccount.current&&error instanceof CozyClientError&&error.status===401){acceptLocal(loadGuestState(localStorage));}else throw error;}}
   if(version===generation.current)setNeedsRefresh(false);
  }catch(error){if(version===generation.current){setError(lifeErrorMessage(error));setNeedsRefresh(true);}}finally{if(version===generation.current){lock.current=false;setLoading(false);}}
 },[identityKey,accept,acceptLocal]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{generation.current++;lock.current=false;stateRef.current=null;setState(null);setResponse(null);setNotice('');setError('');setBusy(false);setNeedsRefresh(false);localRef.current=identity.kind==='guest';setLocal(identity.kind==='guest');everAccount.current=identity.kind==='account';},[identityKey]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(open)void refresh();return()=>{generation.current++;lock.current=false;setBusy(false);};},[open,refresh]);
 useEffect(()=>{if(!open)return;const timer=setInterval(()=>setNow(Date.now()+offset.current),150);const storage=(event:StorageEvent)=>{if(event.key===COZY_GUEST_STORAGE&&localRef.current)void refresh();};window.addEventListener('storage',storage);return()=>{clearInterval(timer);window.removeEventListener('storage',storage);};},[open,refresh]);
 const act=useCallback(async(action:LifeAction|BarterAction|ServingAction):Promise<boolean>=>{
  if(lock.current||!stateRef.current||needsRefresh)return false;lock.current=true;setBusy(true);setError('');setNotice('');const version=generation.current;
  try{
   if(localRef.current){if(action.type.startsWith('offer-')||action.type==='serve'||action.type==='eat-serving')throw new CozyClientError('ACCOUNT_REQUIRED',401,'Berbagi masakan dan barter antar pemain membutuhkan akun tersimpan di server.');const next=saveGuestAction(localStorage,stateRef.current,action as LifeAction);if(version!==generation.current)return false;acceptLocal(next);}
   else{const next=await requestLife({revision:stateRef.current.revision,action});if(version!==generation.current)return false;accept(next);}
   setNow(Date.now()+offset.current);return true;
  }catch(error){if(version!==generation.current)return false;setError(lifeErrorMessage(error));if(error instanceof CozyClientError&&(error.status===409||error.code==='NETWORK_ERROR'||error.code==='UNAUTHORIZED'||error.code==='STORAGE_UNAVAILABLE')){setNeedsRefresh(true);if(error.status===409){try{if(localRef.current){const fresh=loadGuestState(localStorage);if(version!==generation.current)return false;acceptLocal(fresh);}else{const fresh=await requestLife();if(version!==generation.current)return false;accept(fresh);}setNeedsRefresh(false);}catch{/* Keep the original failure visible; explicit refresh remains available. */}}}return false;
  }finally{if(version===generation.current){lock.current=false;setBusy(false);}}
 },[accept,acceptLocal,needsRefresh]);
 return {state,response,local,loading,busy,error,notice,now,needsRefresh,act,refresh,setNotice};
}
