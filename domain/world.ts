import {z} from 'zod';
export const worldRecipeSchema=z.object({version:z.literal(1),title:z.string().trim().min(3).max(90),brief:z.string().trim().min(15).max(500),kit:z.enum(['dead-web','internet-weather','agent-orbit']),objects:z.array(z.string().trim().min(1).max(60)).min(3).max(9),accent:z.enum(['coral','mint','amber']).default('coral')}).strict();
export type WorldRecipe=z.infer<typeof worldRecipeSchema>;
export const worldStateSchema=z.object({activated:z.array(z.number().int().min(0).max(8)).max(9),hour:z.number().min(0).max(23),wind:z.number().min(0).max(100),position:z.tuple([z.number().min(-13).max(13),z.number().min(-13).max(13)])}).strict();
export type WorldState=z.infer<typeof worldStateSchema>;
export const initialWorldState:WorldState={activated:[],hour:14,wind:35,position:[0,7]};
export const kitObjects={ 'dead-web':['Space Jam / 1996','Million Dollar Homepage','Fog Cam / 1994','Zombo / 1999','Design protest','Historical archive'], 'internet-weather':['Curiosity','Attention','Friction','Discovery','Reflection','Connection'], 'agent-orbit':['Indexer','Night Watch','Fold','Janitor','Witness','Typeset','Tide','Lost & Found','Common Ground']} as const;
export function recipeFromCommand(command:string,renderer:WorldRecipe['kit'],input?:string):WorldRecipe{if(input){const raw:unknown=JSON.parse(input);return worldRecipeSchema.parse(raw);}return worldRecipeSchema.parse({version:1,title:command.slice(0,90),brief:command,kit:renderer,objects:[...kitObjects[renderer]],accent:'coral'});}
