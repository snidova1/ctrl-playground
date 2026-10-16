export const GATHERING_DURATION=1800000,GATHERING_CAPACITY=16;
export type TownGathering={id:string;hostId:string;hostName:string;worldId:string;title:string;kind:'picnic'|'dance'|'workshop';x:number;z:number;endsAt:number;revision:number;startedAt:number;guests:{id:string;name:string;arrivedAt:number;here:boolean}[]};
