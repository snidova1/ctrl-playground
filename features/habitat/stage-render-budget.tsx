'use client';
import {useEffect,useMemo,useRef} from 'react';
import {WillowPainterlyPost} from './town-painterly-post';
import {useFrame,useThree,type RootState} from '@react-three/fiber';

/** Bound GPU submissions in the light profile without changing the simulation
 * clock or input cadence. Slow GPUs otherwise accumulate work across two live
 * worlds, delaying native controls, screenshots and even document navigation. */
export default function StageRenderBudget({quality,painterly=false}:{quality:'low'|'high';painterly?:boolean}){
 const next=useRef(0),pending=useRef<WebGLSync|null>(null),get=useThree(state=>state.get);
 const renderer=useThree(s=>s.gl),scene=useThree(s=>s.scene),camera=useThree(s=>s.camera);
 const width=useThree(s=>s.size.width),height=useThree(s=>s.size.height);
 // The single existing render owner switches between direct WebGL and one
 // painterly composer. Never mount a second useFrame takeover or RAF loop.
 const profile=quality==='high'&&width>=700?'desktop':'mobile';
 const painter=useMemo(()=>painterly
  ?new WillowPainterlyPost(renderer,scene,camera,1,1,profile)
  :null,[painterly,renderer,scene,camera,profile]);
 useEffect(()=>{painter?.setSize(width,height);},[painter,width,height]);
 useEffect(()=>()=>painter?.dispose(),[painter]);
 useEffect(()=>{
  let previous:RootState['frameloop']|null=null;
  const leave=()=>{if(previous===null)previous=get().frameloop;get().setFrameloop('never');};
  const resume=()=>{if(previous!==null){get().setFrameloop(previous);previous=null;}};
  // Stop submissions immediately; a React state update can land after teardown.
  window.addEventListener('pagehide',leave);
  window.addEventListener('beforeunload',leave);
  window.addEventListener('pageshow',resume);
  return()=>{
   window.removeEventListener('pagehide',leave);window.removeEventListener('beforeunload',leave);window.removeEventListener('pageshow',resume);
   const context=get().gl.getContext();
   if(pending.current&&'deleteSync' in context)context.deleteSync(pending.current);
   pending.current=null;
  };
 },[get]);
 useFrame(({gl,scene,camera,frameloop})=>{
  // R3F restarts its scene clock after a paused transition; the submission
  // deadline must use monotonic wall time so that resuming never freezes it.
  const now=performance.now()/1000;
  const context=gl.getContext();
  const gpu='fenceSync' in context?context:null;
  if(context.isContextLost())return;
  if(pending.current&&gpu){
   // Nonblocking GPU backpressure: one submitted frame at a time. Input and
   // simulation callbacks still run; no gl.finish() main-thread stall.
   if(quality==='low'&&frameloop==='always'&&gpu.clientWaitSync(pending.current,0,0)===gpu.TIMEOUT_EXPIRED)return;
   gpu.deleteSync(pending.current);pending.current=null;
  }
  if(quality==='low'&&frameloop==='always'&&now<next.current)return;
  next.current=now+1/30;
  if(painter)painter.render(1/30);
  else gl.render(scene,camera);
  if(quality==='low'&&frameloop==='always'&&gpu){
   pending.current=gpu.fenceSync(gpu.SYNC_GPU_COMMANDS_COMPLETE,0);
   gpu.flush();
  }
 },1);
 return null;
}
