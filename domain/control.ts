import { policy } from "@/config/policy";
import type { LockState } from "./types";
export function resolveTier(balance: number, tiers: readonly {name:string; minimum:number}[] = policy.tiers) {
  const valid = Number.isFinite(balance) && balance > 0 ? balance : 0;
  return [...tiers].sort((a,b)=>b.minimum-a.minimum).find(t=>valid>=t.minimum)?.name ?? "OBSERVER";
}
export function controlCapacity(balance: number, heldDays=0, reputation=0, lock: LockState={amount:0,days:0,unlocksAt:null,simulated:false}, rules=policy.control): number {
  if (!Number.isFinite(balance) || balance<=0) return 0;
  const time = 1 + Math.min(Math.max(heldDays,0) / rules.timeDays,1)*(rules.timeMax-1);
  const rep = 1 + Math.min(Math.max(reputation,0)/rules.reputationScale,1)*(rules.reputationMax-1);
  const allocated = Number.isFinite(lock.amount) ? Math.min(Math.max(lock.amount,0)/balance,1) : 0;
  const lockWeight = 1+(policy.allocation.maximumMultiplier-1)*allocated;
  return Math.min(rules.dailyCap,Math.floor(Math.sqrt(balance)*rules.scale*time*rep*lockWeight));
}
export function reputationScore(signals: Partial<Record<keyof typeof policy.reputation,number>>): number {
  return Math.max(0,Object.entries(signals).reduce((sum,[k,v])=>sum+(v??0)*policy.reputation[k as keyof typeof policy.reputation],0));
}
