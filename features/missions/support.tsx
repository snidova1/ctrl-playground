"use client";
import {operationId}from"@/lib/operation-id";
import { useState } from "react";
import { mutate,ApiError } from "@/lib/api-client";
import type { Mission,Account } from "@/domain/types";
export function SupportControl({mission,account}:{mission:Mission;account:Account|null}){const [amount,setAmount]=useState(25),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);async function support(){setBusy(true);setError(null);try{await mutate(`missions/${mission.id}/support`,{amount,operationId:operationId()});}catch(e){setError((e as ApiError).message);}finally{setBusy(false);}}
 if(mission.status!=="OPEN")return null;return <div className="support-control"><label htmlFor={`support-${mission.id}`}>ALLOCATE CONTROL</label><div><input id={`support-${mission.id}`} aria-label={`CONTROL for ${mission.command}`} type="number" min={1} max={Math.min(account?.available??500,500)} value={amount} onChange={e=>setAmount(Number(e.target.value))}/><button className="button button-dark button-small" disabled={busy||!account?.authenticated||account.tier==="OBSERVER"||amount<1||amount>(account?.available??0)} onClick={support}>{busy?"ALLOCATING":"SUPPORT"}</button></div>{error&&<p className="form-error" role="alert">{error}</p>}</div>;}
