"use client";
import {useResource} from "@/lib/use-resource";
import { useState } from "react";
import Link from "@/components/navigation";
import { mutate,ApiError } from "@/lib/api-client";
import { ErrorState } from "@/components/states";
export function DemoAccess(){const runtime=useResource<{demoEnabled:boolean}>("runtime");const [busy,setBusy]=useState(false),[error,setError]=useState<ApiError|null>(null);async function enter(){setBusy(true);try{await mutate("auth/demo",{});}catch(e){setError(e as ApiError);}finally{setBusy(false);}}
 return <div className="access-box"><span className="eyebrow">OPERATOR ACCESS</span><p>Holding CTRL opens the controls.<br/>{runtime.data?.demoEnabled?"Try a simulated Architect credential.":"Connect and verify your wallet to use the machine."}</p><div className="chip-row">{runtime.data?.demoEnabled&&<button className="button button-dark button-small" onClick={enter} disabled={busy}>{busy?"PREPARING CREDENTIAL":"ENTER DEMO"}</button>}<Link href="/account" className="button button-small">CONNECT WALLET</Link></div>{error&&<ErrorState error={error}/>}</div>;}
