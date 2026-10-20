import layout from './neighborhood.json';
import manifest from '@/public/worlds/neighborhood/manifest.json';
export function mulberry32(seed:number){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
export const range=(r:()=>number,a:number,b:number)=>a+(b-a)*r();
export const GHIBLI_TREES=[[-25,-23],[-16,-25],[16,-25],[25,-23],[-25,-10],[25,-10],[-25,4],[25,4],[-25,21],[25,21],[-16,25],[16,25],[-12,22],[12,22],[-9,11.3],[9,11.3]];
export function pathDistance(x:number,z:number){return Math.min(Math.abs(x-.25*Math.sin(z*.13))-1.8,Math.abs(z+3)-1.35,Math.max(Math.abs(z-16)-1.2,Math.abs(x)-12.5),Math.hypot(x,z)-5.25);}
export function meadowPoint(x:number,z:number){if(pathDistance(x,z)<.4)return false;for(const b of layout.buildings){const a=manifest.buildings.find(a=>a.name===b.asset)!;const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rotation),s=Math.sin(b.rotation);if(Math.abs(dx*c-dz*s)<a.width/2+.65&&Math.abs(dx*s+dz*c)<a.depth/2+.65)return false;}return !layout.obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.25&&Math.abs(z-o.z)<o.d/2+.25);}
export function grassSamples(count:number){const r=mulberry32(9041),out:{x:number;z:number;height:number;width:number;seed:number}[]=[];for(let i=0;i<count*5&&out.length<count;i++){const x=range(r,-31,31),z=range(r,-31,31);if(!meadowPoint(x,z))continue;out.push({x,z,height:range(r,.18,.56),width:range(r,.025,.065),seed:r()*6.28});}return out;}
