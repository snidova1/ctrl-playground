"use client";
import {Suspense,useSyncExternalStore,type ReactNode} from "react";

const subscribe=()=>()=>{};
const browserSnapshot=()=>true;
const serverSnapshot=()=>false;

/** Browser-only renderers never suspend the hosted server's synchronous shell. */
export function ClientScene({children,fallback}:{children:ReactNode;fallback:ReactNode}){
 const mounted=useSyncExternalStore(subscribe,browserSnapshot,serverSnapshot);
 return mounted?<Suspense fallback={fallback}>{children}</Suspense>:fallback;
}
