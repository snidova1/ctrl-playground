import type {Pose} from '@/features/plaza/types';

/** Local ambience only. Never enters the server's players/presence collection. */
const ROUTES=[
 [[-4,4.5],[4,4.5],[4,5.2],[-4,5.2]],
 [[-5.9,0]],
 [[16,-14],[22,-14],[22,-12],[16,-12]],
 [[8,14],[13,14],[13,16],[8,16]],
] as const;
export function residentPose(index:number,seconds:number):Pose&{waving:boolean;sitting:boolean}{
 const route=ROUTES[index%ROUTES.length];
 const legSeconds=14,pauseSeconds=4;
 const phase=Math.max(0,seconds+index*5)%(route.length*legSeconds);
 const leg=Math.floor(phase/legSeconds),time=phase%legSeconds;
 const a=route[leg],b=route[(leg+1)%route.length];
 const moving=route.length>1&&time>=pauseSeconds;
 const t=moving?(time-pauseSeconds)/(legSeconds-pauseSeconds):0;
 return {x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,
  angle:Math.atan2(b[0]-a[0],b[1]-a[1]),moving,
  waving:route.length>1&&!moving&&time<2.4,sitting:route.length===1};
}
