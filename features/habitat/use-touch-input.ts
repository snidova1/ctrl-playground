'use client';
import {useEffect,useMemo,type MutableRefObject,type PointerEvent} from 'react';
import type {ControlInput} from '@/features/plaza/scene';
import {createTouchInput} from './touch-input';

export function useTouchInput(input:MutableRefObject<ControlInput>,stand:()=>void){
 const held=useMemo(()=>createTouchInput(input),[input]);
 useEffect(()=>{
  const clear=()=>held.clear();
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  return()=>{window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);held.clear();};
 },[held]);
 return {
  direction(event:PointerEvent<HTMLButtonElement>,x:number,z:number){
   if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);stand();held.direction(event.pointerId,x,z);
  },
  run(event:PointerEvent<HTMLButtonElement>){
   if(event.button!==0)return;event.currentTarget.setPointerCapture(event.pointerId);held.run(event.pointerId);
  },
  release(event:PointerEvent<HTMLButtonElement>){held.release(event.pointerId);},
 };
}
