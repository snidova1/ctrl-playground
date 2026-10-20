import type {GroundPoint} from './navigation';
export interface ResidentDriver{setPath(points:GroundPoint[]):void;step(delta:number):GroundPoint&{finished:boolean;speed:number};warp(point:GroundPoint):void;}
interface SteeringModule{createDriver(start:GroundPoint,speed?:number):ResidentDriver;}
let loaded:Promise<SteeringModule>|undefined;
/** Locally bundled, pinned MIT dependency; no external CDN or eval. */
export function loadDistrictSteering(){return loaded??=import(/* webpackIgnore: true */ /* @vite-ignore */ new URL('/worlds/worldgacha/steering.js',window.location.origin).href) as Promise<SteeringModule>;}
