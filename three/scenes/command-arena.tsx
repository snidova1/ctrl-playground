"use client";
import ArenaCabinet from "./arena-cabinet";
import type {Mission} from "@/domain/types";
export default function CommandArena({missions,selected,onSelect}:{missions:Mission[];selected:string|null;onSelect:(id:string)=>void}){return <div className="arena-webgl"><ArenaCabinet missions={missions} selected={selected} onSelect={onSelect}/></div>;}
