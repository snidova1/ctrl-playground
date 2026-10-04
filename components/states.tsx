"use client";
import type { ApiError } from "@/lib/api-client";
export function ErrorState({error,retry}:{error:ApiError|Error;retry?:()=>void}){return <div className="error-state" role="alert"><h2>{"code" in error?String(error.code).replaceAll("_"," "):"MACHINE UNAVAILABLE"}</h2><p>{error.message}</p>{retry&&<button className="button button-small" onClick={retry}>TRY AGAIN</button>}</div>;}
export function MachineLoading({title="PREPARING THE MACHINE"}:{title?:string}){return <div className="loading-machine" role="status" aria-live="polite"><span>{title}</span>RECORDS / RESOURCES / READY</div>;}
export function DemoBand({children}:{children?:React.ReactNode}){return <div className="demo-band">{children??"DEMONSTRATION MODE / Simulated compute and holder state. No paid inference or token transactions."}</div>;}
export function StageTag({stage}:{stage:string}){return <span className={`status-tag ${!["OPEN","COMPLETE","FAILED","REVIEW"].includes(stage)?"running":""}`}>{stage}</span>;}
export function PageHead({index,title,description,aside}:{index:string;title:React.ReactNode;description?:string;aside?:React.ReactNode}){return <div className="page-head"><div><div className="eyebrow">CTRL / {index}</div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{aside&&<div className="head-side">{aside}</div>}</div>;}
