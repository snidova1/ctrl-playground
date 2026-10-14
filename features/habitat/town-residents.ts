import type {Pose} from '@/features/plaza/types';

/** Local ambience only. Never enters the server's players/presence collection. */
const ROUTES=[
 [[-4,4.5],[4,4.5],[4,5.2],[-4,5.2]],
 [[-5.9,0]],
 [[16,-14],[22,-14],[22,-12],[16,-12]],
 [[8,14],[13,14],[13,16],[8,16]],
 [[72,27],[72,30],[78,30],[78,27]],
 [[-80,46],[-80,50],[-75,50],[-75,46]],
 [[0,-76],[4,-76],[4,-78],[0,-78]],
 [[-81,-52],[-74,-52],[-74,-49],[-81,-49]],
 [[71,-73],[76,-73],[76,-70],[71,-70]],
 [[70,80],[75,80],[75,83],[70,83]],
] as const;
export const TOWN_RESIDENT_NAMES=['Mira','Theo','June','Kai','Eli','Iris','Finn','Sage','Ren','Aster'] as const;
/** Distance-limited original ambience, never reported as online human players. */
export function nearbyResidents(x:number,z:number,quality:'low'|'high'){
 return ROUTES.map((route,index)=>({index,distance:Math.hypot(route[0][0]-x,route[0][1]-z)})).filter(r=>r.distance<42).sort((a,b)=>a.distance-b.distance||a.index-b.index).slice(0,quality==='low'?2:4).map(r=>r.index);
}
export function residentPose(index:number,seconds:number):Pose&{waving:boolean;sitting:boolean;working:boolean}{
 const route=ROUTES[index%ROUTES.length];
 const legSeconds=14,pauseSeconds=4;
 const phase=Math.max(0,seconds+index*5)%(route.length*legSeconds);
 const leg=Math.floor(phase/legSeconds),time=phase%legSeconds;
 const a=route[leg],b=route[(leg+1)%route.length];
 const moving=route.length>1&&time>=pauseSeconds;
 const t=moving?(time-pauseSeconds)/(legSeconds-pauseSeconds):0;
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,
  angle:Math.atan2(b[0]-a[0],b[1]-a[1]),moving,
  waving:index<4&&route.length>1&&!moving&&time<2.4,sitting:route.length===1,working:index>=4&&!moving&&time<3};
}
