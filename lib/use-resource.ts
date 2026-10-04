"use client";
import { useCallback,useEffect,useState } from "react";
import { api,ApiError } from "./api-client";
export function useResource<T>(path:string|null,interval=0){const [data,setData]=useState<T|null>(null);const [error,setError]=useState<ApiError|null>(null);const [loading,setLoading]=useState(true);const [revision,setRevision]=useState(0);const refresh=useCallback(()=>setRevision(r=>r+1),[]);
 useEffect(()=>{if(!path)return;let alive=true;const abort=new AbortController();const load=async()=>{try{const d=await api<T>(path,{signal:abort.signal});if(alive){setData(d);setError(null);}}catch(e){if(alive&&!(e instanceof Error&&e.name==="AbortError"))setError(e instanceof ApiError?e:new ApiError("MACHINE_UNAVAILABLE","The machine could not be reached.",503));}finally{if(alive)setLoading(false);}};void load();const timer=interval?setInterval(()=>void load(),interval):null;window.addEventListener("ctrl:refresh",refresh);return ()=>{alive=false;abort.abort();if(timer)clearInterval(timer);window.removeEventListener("ctrl:refresh",refresh);};},[path,interval,revision,refresh]);return {data,error,loading,refresh};
}
