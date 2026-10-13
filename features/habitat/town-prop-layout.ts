/** Shared scenic furniture footprints; identical signed server/client movement. */
import {TOWN_ACTIVITIES} from './town-districts';
export const PICNIC_SITES=[{x:-11,z:18.5},{x:11,z:18.5}] as const;
export const MARKET_DISPLAY={x:8,z:-6.7} as const;
export const TOWN_POTS=[[-12,5],[12,5],[-4,-6],[4,-6],[-29,11],[29,11],[-20,27],[20,27]] as const;
export const TOWN_PROP_OBSTACLES=[
 ...TOWN_ACTIVITIES.filter(a=>a.district!=='center').map(a=>({x:a.x+2.4,z:a.z,width:1.8,depth:1.3})),
 ...PICNIC_SITES.flatMap(p=>[{x:p.x,z:p.z,width:2,depth:2},...[-1.25,1.25].map(dx=>({x:p.x+dx,z:p.z,width:.6,depth:.6}))]),
 ...[-1.3,0,1.3].map(dx=>({x:MARKET_DISPLAY.x+dx,z:MARKET_DISPLAY.z,width:.9,depth:.9})),
 ...TOWN_POTS.map(([x,z])=>({x,z,width:.85,depth:.85})),
];
export const TOWN_PLANTING_CLEARANCES=[
 {x:-8,z:0,width:3.7,depth:1.9},{x:-5,z:0,width:3.7,depth:1.9},
 {x:-5,z:8,width:1.7,depth:1.2},{x:5,z:8,width:1.7,depth:1.2},
];
