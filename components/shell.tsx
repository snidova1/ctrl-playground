"use client";
import {WebMCP} from "./webmcp";
import Link from "@/components/navigation";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
const links=[["COMMANDS","/commands"],["WORK","/work"],["WORLDS","/worlds"],["ARCHIVE","/archive"],["MACHINE","/machine"]];
export function Shell({children}:{children:React.ReactNode}) {
 const pathname=usePathname(); const [open,setOpen]=useState(false);
 return <><WebMCP/><a className="skip-link" href="#main">Skip to content</a><header className="masthead"><Link href="/" className="wordmark" aria-label="CTRL home">CTRL<span className="brand-square"/></Link><nav aria-label="Machine rooms" className={open?"main-nav is-open":"main-nav"}>{links.map(([name,href],i)=><Link key={href} href={href} className={pathname.startsWith(href)?"active":""} onClick={()=>setOpen(false)}><span className="nav-index">0{i+1}</span>{name}</Link>)}</nav><Link href="/account" className="operator-link">OPERATOR ACCESS<span className="access-mark">+</span></Link><button className="nav-toggle" onClick={()=>setOpen(!open)} aria-label={open?"Close navigation":"Open navigation"} aria-expanded={open}>{open?<X size={22}/>:<Menu size={22}/>}</button></header><main id="main">{children}</main><footer className="footer"><Link href="/" className="footer-brand">CTRL</Link><span>A PUBLIC MACHINE.</span><div><Link href="/lab">PERSONAL LAB</Link><Link href="/machine">SYSTEM RECORD</Link></div><span className="footer-note">COMMANDS ENTER. WORK COMES OUT.</span></footer></>;
}
