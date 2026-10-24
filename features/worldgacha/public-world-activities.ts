import type {NeighborhoodState} from './neighborhood-state';

export type PublicLifeTab='garden'|'fishing'|'kitchen'|'craft'|'community'|'barter';
/** The water is outside the authored walk grid (z <= 13); only the dry dock
 * approach is a destination. No invisible pond collider or Habitat starter prop. */
export const PUBLIC_FISHING_SPOT={dockX:-45,dockZ:12.2,pondX:-44.5,pondZ:15.6,pondRadiusX:3.1,pondRadiusZ:2.3} as const;
export const PUBLIC_LIFE_ENTRIES=[
 {id:'life-garden',tab:'garden',label:'Grow a garden',x:-39,z:0,message:'Choose a seed, water your bed, and give it time to grow.'},
 {id:'life-fishing',tab:'fishing',label:'Fish at the quiet pond',x:PUBLIC_FISHING_SPOT.dockX,z:11.2,message:'A quiet spot to cast a line. Wait for a bite before reeling.'},
 {id:'life-kitchen',tab:'kitchen',label:'Cook at the market kitchen',x:35,z:-4.8,message:'Make something warm with ingredients you have gathered.'},
 {id:'life-craft',tab:'craft',label:'Craft at the workbench',x:43,z:-4.8,message:'Turn gathered materials into something handmade.'},
 {id:'life-community',tab:'community',label:'Visit the community pantry',x:39,z:0,message:'See what the community is making together.'},
 {id:'life-barter',tab:'barter',label:'Visit the item exchange',x:46,z:0,message:'Exchange activity items with other players. No money or Keys.'},
] as const satisfies ReadonlyArray<{id:string;tab:PublicLifeTab;label:string;x:number;z:number;message:string}>;
export const PUBLIC_ACTIVITIES=[
 {id:'garden-tend',label:'Tend the herbs',x:-39,z:-5.2,message:'A little care, and the herbs lift into the breeze.'},
 {id:'garden-rest',label:'Rest in the garden',x:-39,z:8.65,message:'Take a seat. Nothing here needs rushing.'},
 {id:'market-tea',label:'Have a warm tea',x:35,z:5.5,message:'A warm cup from the tea stall. No purchase, just a little pause.'},
 {id:'market-bell',label:'Ring the market bell',x:43,z:5.5,message:'A small bell rings across the market.'},
 ...PUBLIC_LIFE_ENTRIES,
] as const;
export type PublicActivityId=typeof PUBLIC_ACTIVITIES[number]['id'];
export function performPublicActivity(state:NeighborhoodState,id:string):string|null{
 const activity=PUBLIC_ACTIVITIES.find(a=>a.id===id);if(!activity)return null;
 // Navigation / arriving / rendering must never grant items or open a panel.
 // Unlike legacy cosmetic interactions, life entries also defend their own range.
 if('tab' in activity){
  const distance=Math.hypot(state.player.x-activity.x,state.player.z-activity.z);
  if(!Number.isFinite(distance)||distance>=2.6)return null;
 }
 state.publicPulse={id:activity.id,sequence:(state.publicPulse?.sequence??0)+1,x:activity.x,z:activity.z,until:state.time+3};
 state.player.moving=false;state.player.running=false;
 if('tab' in activity){
  state.player.action='idle';
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('cozy-life-open',{detail:{tab:activity.tab}}));
 }
 if(id==='garden-tend'){state.springTended=true;state.player.action='garden';}
 if(id==='market-tea'){state.coffees++;state.player.action='coffee';}
 if(id==='garden-rest'){state.seat={x:-39,z:9.85,exitX:-39,exitZ:8.65};state.player.x=state.seat.x;state.player.z=state.seat.z;state.player.angle=Math.PI;state.player.action='sit';}
 return activity.message;
}
export function standFromSeat(state:NeighborhoodState){const seat=state.seat??{exitX:-5,exitZ:3};state.player.x=seat.exitX;state.player.z=seat.exitZ;state.player.action='idle';state.player.moving=false;state.player.running=false;state.seat=undefined;}
