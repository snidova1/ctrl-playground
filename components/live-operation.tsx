"use client";
import Link from "next/link";
import {useResource} from "@/lib/use-resource";
import type{Mission}from"@/domain/types";
import {StageTag}from"./states";
export function LiveOperation(){const {data,error}=useResource<Mission[]>("missions",6000);const active=data?.find(m=>!["OPEN","REVIEW","COMPLETE","FAILED"].includes(m.status));const latest=data?.find(m=>m.status==="COMPLETE");return <section className="current-strip"><div className="label">{active?"CURRENTLY WORKING":"LATEST PUBLIC OUTPUT"}</div><Link href={active?`/work?mission=${active.id}`:latest?`/archive/${latest.id}`:"/work"} className="current-command">{error?"Waiting for the machine.":active?.command??latest?.command??"Opening the public record."}</Link><div className="strip-end"><StageTag stage={active?.status??latest?.status??"READING"}/><span className="mono">{active?`$${active.consumed.toFixed(4)} SETTLED`:(latest?.demo??true)?"EXHIBITION / DEMONSTRATION":"RECEIPT AVAILABLE"}</span></div></section>;}
