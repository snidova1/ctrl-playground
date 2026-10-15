/** Townies-inspired shared picnic preparation, using existing completed work.
 * Supplies are contribution receipts, never money, XP or transferable tokens. */
export const TOWN_TABLE={x:11,z:18.5,name:'Willow neighborhood table'} as const;
export const TOWN_TABLE_NEEDS=[
 {activity:'orchard-harvest',name:'Orchard fruit',district:'Applehill Orchard'},
 {activity:'cafe-supplies',name:'Café supplies',district:'Willow Square'},
 {activity:'community-garden',name:'Garden flowers',district:'Fernwood Park'},
] as const;
export function townTableDay(now:number){
 const day=new Date(now).toISOString().slice(0,10),startsAt=Date.parse(day+'T00:00:00Z');
 return {day,startsAt,endsAt:startsAt+86400000};
}
export type TownTableState={day:string;endsAt:number;supplies:Record<string,number>;neighbors:number;servedAt:number;servedBy:string|null};
