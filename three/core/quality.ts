"use client";
import {useSyncExternalStore} from "react";
export type QualityProfile="desktop"|"tablet"|"mobile"|"reduced";
function snapshot():QualityProfile{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return "reduced";if(window.innerWidth<760)return "mobile";if(window.innerWidth<1100)return "tablet";return "desktop";}
function subscribe(callback:()=>void){const media=window.matchMedia("(prefers-reduced-motion: reduce)");window.addEventListener("resize",callback);media.addEventListener("change",callback);return ()=>{window.removeEventListener("resize",callback);media.removeEventListener("change",callback);};}
export function useQuality(){return useSyncExternalStore(subscribe,snapshot,()=>"mobile" as QualityProfile);}
export const qualitySettings={desktop:{dpr:1.5,shadows:true,segments:32},tablet:{dpr:1.25,shadows:false,segments:20},mobile:{dpr:1,shadows:false,segments:12},reduced:{dpr:1,shadows:false,segments:16}};
