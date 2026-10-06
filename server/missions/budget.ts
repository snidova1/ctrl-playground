import {exec} from '@/db';
import {settings} from '@/server/env';
import {AppError} from '@/server/errors';
export async function reserveCompute(id:string,amount:number){const s=settings();if(s.mode==='mock'||amount===0)return;if(!Number.isFinite(s.dailyCompute)||s.dailyCompute<=0)throw new AppError('DAILY_COMPUTE_UNAVAILABLE',503);const period=new Date().toISOString().slice(0,10);const r=await exec("INSERT INTO compute_reservations(mission_id,period,budget,state) SELECT ?,?,?,'held' WHERE (SELECT COALESCE(SUM(COALESCE(cost,budget)),0) FROM compute_reservations WHERE period=?) + ? <= ?",id,period,amount,period,amount,s.dailyCompute);if(!r.meta.changes)throw new AppError('DAILY_COMPUTE_LIMIT',422,'The machine reached its daily resource ceiling.');}
export async function settleCompute(id:string,cost:number,settled:boolean){await exec('UPDATE compute_reservations SET cost=?,state=? WHERE mission_id=?',settled?cost:null,settled?'settled':'unknown',id);}
