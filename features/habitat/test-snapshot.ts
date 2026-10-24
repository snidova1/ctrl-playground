import {z} from 'zod';
import {layoutSchema,type WorldObject,type WorldState} from './types';
import {DEFAULT_HOUSE,replaceHouse} from './modular-house';
import {createStarterWorld} from './starter-world';
export const HABITAT_TEST_STORAGE='ctrl-habitat-test-v1';
const snapshotSchema=z.object({version:z.literal(1),objects:layoutSchema,states:z.record(z.object({active:z.boolean(),usedAt:z.number().finite()}).strict())}).strict();
export interface HabitatTestSnapshot{version:1;objects:WorldObject[];states:WorldState['states']}
export function createHabitatTestSnapshot():HabitatTestSnapshot{return {version:1,objects:replaceHouse(createStarterWorld(),DEFAULT_HOUSE),states:{}};}
export function decodeHabitatTestSnapshot(raw:string|null):HabitatTestSnapshot|null{if(!raw)return null;try{return snapshotSchema.parse(JSON.parse(raw));}catch{return null;}}
export function encodeHabitatTestSnapshot(objects:WorldObject[],states:WorldState['states']):string{return JSON.stringify(snapshotSchema.parse({version:1,objects,states}));}
