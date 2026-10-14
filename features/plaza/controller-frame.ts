'use client';
import {useEffect,useRef} from 'react';
import {useFrame,type RenderCallback} from '@react-three/fiber';
import {controllerSteps} from './controller-time';

/** One movement controller, bounded substeps; never replay hidden-tab time. */
export function useControllerFrame(callback:RenderCallback){
 const resumed=useRef(false);
 useEffect(()=>{
  const visibility=()=>{resumed.current=true;};
  document.addEventListener('visibilitychange',visibility);
  return()=>document.removeEventListener('visibilitychange',visibility);
 },[]);
 useFrame((state,delta,frame)=>{
  if(document.visibilityState==='hidden')return;
  if(resumed.current){resumed.current=false;callback(state,0,frame);return;}
  const steps=controllerSteps(delta);
  if(!steps.length)callback(state,0,frame);
  else for(const step of steps)callback(state,step,frame);
 });
}
