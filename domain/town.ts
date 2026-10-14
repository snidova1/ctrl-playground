import {z} from 'zod';
import type {TownActivityId} from '@/features/habitat/town-districts';
import type {TownActivityEvent,TownProjectState} from './town-projects';
import type {TownRouteRun,TownWorkVisit} from './town-routes';
import type {TownGathering} from './town-gatherings';
export const townSessionSchema=z.string().uuid();
export const jobStartSchema=z.object({id:z.string().min(2).max(50),sessionId:townSessionSchema}).strict();
export const jobFinishSchema=z.object({jobId:z.string().uuid(),sessionId:townSessionSchema}).strict();
export const gardenActionSchema=z.object({id:z.enum(['fern-bed-1','fern-bed-2','fern-bed-3']),action:z.enum(['plant','water','harvest']),revision:z.number().int().nonnegative(),sessionId:townSessionSchema}).strict();
export const TOWN_JOB_DURATION=6000;
export const TOWN_GARDEN_BEDS=[
 {id:'fern-bed-1',x:-78,z:48}, {id:'fern-bed-2',x:-75,z:49}, {id:'fern-bed-3',x:-72,z:48},
] as const;
export const CROP_GROW_MS=45000;
export interface TownJob {id:string;activityId:TownActivityId;readyAt:number;expiresAt:number}
export interface GardenBed {id:string;crop:string|null;plantedAt:number;wateredAt:number;revision:number}
export interface TownLifeState {
 serverNow:number;
 progress:{completed:number};
 job:TownJob|null;
 route:TownRouteRun|null;
 visits:TownWorkVisit[];
 gatherings:TownGathering[];
 contributions:Record<string,{count:number;neighbors:number}>;
 garden:GardenBed[];
 friends:{id:string;name:string;status:'pending'|'accepted';incoming:boolean;homeId:string|null}[];
 invites:{id:string;sender:string;name:string;destination:string;expiresAt:number}[];
 social:{id:string;initiator:string;recipient:string;kind:'high-five'|'dance';acceptedAt:number;expiresAt:number}[];
 chat:{id:string;player:string;name:string;text:string;at:number}[];
 projects:TownProjectState[];
 history:TownActivityEvent[];
}
