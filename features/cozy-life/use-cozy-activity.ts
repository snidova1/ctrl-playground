'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {isLifeTab,type LifeTab} from './presentation';
/** Shared spatial entry protocol. An entry opens a journal; it never grants an item. */
export function useCozyActivity(onPause:()=>void){
 const [open,setOpen]=useState(false),[tab,setTab]=useState<LifeTab>('garden'),pause=useRef(onPause);pause.current=onPause;
 const launch=useCallback((next:LifeTab='garden')=>{pause.current();setTab(next);setOpen(true);},[]);
 const close=useCallback(()=>setOpen(false),[]);
 useEffect(()=>{const listener=(event:Event)=>{const next=(event as CustomEvent<{tab?:unknown}>).detail?.tab;if(isLifeTab(next))launch(next);};window.addEventListener('cozy-life-open',listener);return()=>window.removeEventListener('cozy-life-open',listener);},[launch]);
 return {open,tab,setTab,launch,close};
}
