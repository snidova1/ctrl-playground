import {z} from 'zod';
export const blueprintSchema=z.object({kind:z.enum(['dispenser','bench','lamp','planter','sculpture']),name:z.string().trim().min(2).max(48),color:z.string().regex(/^#[0-9a-fA-F]{6}$/),scale:z.number().min(.65).max(1.4),accent:z.enum(['cat','plain'])}).strict();
export type Blueprint=z.infer<typeof blueprintSchema>;
export type Vec2={x:number;z:number};
export type Pose=Vec2&{angle:number;moving:boolean};
export interface PlazaObject extends Blueprint{id:string;ownerId:string;ownerName:string;x:number;z:number;rotation:number;active:boolean;usedAt:number;}
export interface Player extends Pose{id:string;name:string;seenAt:number;}
export interface Visitor{id:string;name:string;drinks:number;plot:number;}
export interface Snapshot{me:Visitor;players:Player[];objects:PlazaObject[];liveGenerator:boolean;limit:number;serverTime:number;}
export type Mode='explore'|'make'|'place';
export const plots=[{x:4,z:0},{x:11,z:0},{x:4,z:8},{x:11,z:8},{x:-4,z:8},{x:-11,z:8}];
export const builtins:PlazaObject[]=[{id:'plaza-cat',ownerId:'public',ownerName:'CTRL',kind:'dispenser',name:'Good things, on tap',color:'#e67b36',scale:1,accent:'cat',x:9,z:-5.5,rotation:0,active:true,usedAt:0},{id:'plaza-bench',ownerId:'public',ownerName:'CTRL',kind:'bench',name:'Take a seat',color:'#476ec6',scale:1,accent:'plain',x:-7,z:1,rotation:0,active:true,usedAt:0}];
export const palette=['#e67b36','#547961','#4169b1','#f1c95b','#c97782','#e7ddcb'];
export function kitBlueprint(prompt:string):Blueprint{const p=prompt.toLowerCase();const kind=/lamp|light|lampu/.test(p)?'lamp':/bench|chair|seat|kursi|bangku/.test(p)?'bench':/plant|flower|garden|tanam|bunga/.test(p)?'planter':/sculpt|spin|kinetic|patung|kincir/.test(p)?'sculpture':/cat|drink|vending|dispenser|minum|kucing/.test(p)?'dispenser':null;if(!kind)throw new Error('Try a dispenser, bench, lamp, planter or kinetic sculpture. These are the workshop’s current building blocks.');const color=/blue|biru/.test(p)?palette[2]:/green|hijau/.test(p)?palette[1]:/yellow|kuning/.test(p)?palette[3]:/pink|merah muda/.test(p)?palette[4]:palette[0];return {kind,color,scale:/small|kecil/.test(p)?.75:/large|besar/.test(p)?1.3:1,accent:/cat|kucing/.test(p)?'cat':'plain',name:({dispenser:'Little refreshment station',bench:'A place to pause',lamp:'A little light',planter:'Something growing',sculpture:'Round and round'})[kind]};}
export function actionLabel(o:Blueprint){return ({dispenser:'Get a drink',bench:'Sit down',lamp:'Switch light',planter:'Water plant',sculpture:'Set in motion'})[o.kind];}
