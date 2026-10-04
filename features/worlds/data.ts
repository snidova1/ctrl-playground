import type { WorldManifest } from "@/domain/types";
export const worlds: WorldManifest[] = [
 {slug:"dead-web",index:"001",title:"THE DEAD WEB",subtitle:"Some things refuse to go offline.",missionId:"CTRL-0001",renderer:"dead-web",palette:"#c4cbb6",dataSource:"Curated demo dataset · no uptime claims",demo:true,assets:[],metadata:{period:"1994—2006",objects:"6",technique:"Spatial archive / WebGL"},mobile:"catalog",interactions:["select a terminal","read provenance","open original site"]},
 {slug:"internet-weather",index:"002",title:"INTERNET WEATHER",subtitle:"A forecast for a place with no sky.",missionId:"CTRL-0002",renderer:"internet-weather",palette:"#d4e1ea",dataSource:"Synthetic signal sample · 24 UTC hours",demo:true,assets:[],metadata:{period:"24 HOURS",objects:"96 samples",technique:"Canvas / signal field"},mobile:"canvas",interactions:["scrub time","inspect signal","change signal layer"]},
 {slug:"agent-orbit",index:"003",title:"AGENT ORBIT",subtitle:"A small census of moving intentions.",missionId:"CTRL-0003",renderer:"agent-orbit",palette:"#e9ba78",dataSource:"Illustrative agent dataset · no activity claims",demo:true,assets:[],metadata:{period:"ONE SNAPSHOT",objects:"9 agents",technique:"Orbital map / WebGL"},mobile:"map",interactions:["select an agent","filter capability","pause orbits"]},
];
export const deadWeb = [
 {id:"01",name:"THE SPACE JAM SITE",year:1996,url:"https://www.spacejam.com/1996/",type:"PROMOTIONAL RELIC",description:"A film's website becomes a time capsule. A finite constellation of links, frozen in the language of 1996.",color:"#c7e497"},
 {id:"02",name:"THE MILLION DOLLAR HOMEPAGE",year:2005,url:"http://www.milliondollarhomepage.com/",type:"PIXEL ECONOMY",description:"A million pixels, sold in little squares. An advertising idea that survived its own business model.",color:"#e7c27f"},
 {id:"03",name:"FOG CAM",year:1994,url:"https://www.fogcam.org/",type:"PERSISTENT OBSERVER",description:"A modest window pointed at a campus. A record of the internet before every camera needed a reason.",color:"#9eb9c9"},
 {id:"04",name:"ZOMBO.COM",year:1999,url:"https://zombo.com/",type:"INFINITE PROMISE",description:"A waiting room for unlimited possibility. Nothing arrives; the introduction is the entire work.",color:"#c99c93"},
 {id:"05",name:"THE WORLD'S WORST WEBSITE",year:1997,url:"https://www.theworldsworstwebsiteever.com/",type:"DESIGN PROTEST",description:"An intentionally chaotic collection of web conventions. Here as a study object, not an endorsement.",color:"#b6b097"},
 {id:"06",name:"HEAVEN'S GATE",year:1997,url:"https://www.heavensgate.com/",type:"ARCHIVAL DOCUMENT",description:"A historically significant remnant. The archive labels its context instead of treating persistence as approval.",color:"#aab3a7"},
];
export const agents = [
 {id:"a1",name:"INDEXER",group:"RESEARCH",activity:0.8,budget:0.7,age:12,description:"Maintains a bounded catalogue of overlooked public documents."},
 {id:"a2",name:"NIGHT WATCH",group:"RESEARCH",activity:0.35,budget:0.45,age:48,description:"Checks whether unusual public claims acquire reliable sources."},
 {id:"a3",name:"FOLD",group:"BUILD",activity:0.9,budget:0.8,age:6,description:"Turns small structured datasets into navigable artifacts."},
 {id:"a4",name:"JANITOR",group:"MAINTENANCE",activity:0.5,budget:0.3,age:72,description:"Finds broken references in public archives."},
 {id:"a5",name:"WITNESS",group:"RESEARCH",activity:0.65,budget:0.4,age:24,description:"Compares primary sources and records disagreement."},
 {id:"a6",name:"TYPESET",group:"BUILD",activity:0.4,budget:0.55,age:36,description:"Builds printable institutional records from completed work."},
 {id:"a7",name:"TIDE",group:"SIGNAL",activity:0.95,budget:0.5,age:3,description:"Samples and summarizes one period of public activity."},
 {id:"a8",name:"LOST & FOUND",group:"MAINTENANCE",activity:0.2,budget:0.2,age:96,description:"Matches orphaned artifacts to their original receipts."},
 {id:"a9",name:"COMMON GROUND",group:"SIGNAL",activity:0.55,budget:0.65,age:18,description:"Looks for arguments whose disagreement is in the definitions."},
];
export const weather = Array.from({length:24},(_,hour)=>({hour,attention:Math.round(35+25*Math.sin(hour*0.41)+15*Math.cos(hour*0.83)),friction:Math.round(32+23*Math.cos(hour*0.33)),curiosity:Math.round(45+26*Math.sin(hour*0.28+1.5)),velocity:Math.round(44+24*Math.cos(hour*0.46+2))}));
