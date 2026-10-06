import {recipeFromCommand} from "@/domain/world";
import { settings } from "@/server/env";
import { policy } from "@/config/policy";
import { statement,exec,one } from "@/db";
import { account } from "@/server/wallet/account";
import { allocate,type Identity } from "@/server/wallet/auth";
import { missionInput,supportInput,classifyCommand,estimateResources } from "@/server/policy/mission";
import { AppError } from "@/server/errors";
import { getMission,event } from "./repository";
export async function submitMission(user:Identity,data:unknown,privateJob=false){
 const input=missionInput.parse(data);let recipeReview=false;if(input.kind==="build"&&input.input){try{const recipe=recipeFromCommand(input.command,"dead-web",input.input);recipeReview=classifyCommand(recipe.title+" "+recipe.brief+" "+recipe.objects.join(" "))==="REVIEW";}catch(e){if(e instanceof AppError)throw e;throw new AppError("INVALID_WORLD_RECIPE",422,"Provide a valid world recipe with 3–9 named objects.");}}const a=await account(user);const tier=policy.tiers.find(t=>t.name===a.tier)!;
 if(privateJob&&(!tier.capabilities.some(cap=>cap===input.kind)))throw new AppError("CAPABILITY_LOCKED",403,"Your credential does not open this capability.");
 if(!privateJob&&!tier.proposals)throw new AppError("OPERATOR_TIER_REQUIRED",403);
 const period=new Date().toISOString().slice(0,10);const count=await one<{total:number}>("SELECT COUNT(*) AS total FROM missions WHERE owner_id=? AND visibility=? AND created_at>=?",user.id,privateJob?"private":"public",period);
 if((count?.total??0)>=(privateJob?tier.jobs:tier.proposals))throw new AppError("DAILY_JOB_LIMIT",422);
 if(privateJob){const running=await one<{total:number}>("SELECT COUNT(*) AS total FROM missions WHERE owner_id=? AND visibility='private' AND status NOT IN ('COMPLETE','FAILED','REVIEW')",user.id);if((running?.total??0)>=tier.parallel)throw new AppError("PARALLEL_JOB_LIMIT",422);}
 const feasible=recipeReview?"REVIEW":classifyCommand(input.command);if(input.kind==="transform"){try{JSON.parse(input.input??"");}catch{throw new AppError("INVALID_JSON_INPUT",422,"Provide valid JSON for a data transformation.");}}
 const prior=await one<{mission_id:string;user_id:string;action:string}>("SELECT mission_id,user_id,action FROM control_allocations WHERE id=?",input.operationId);if(prior){if(prior.user_id!==user.id||prior.action!==(privateJob?"job":"proposal"))throw new AppError("OPERATION_ID_CONFLICT",409);return getMission(prior.mission_id);}
 const id=`CTRL-${crypto.randomUUID().slice(0,8).toUpperCase()}`;const cost=privateJob?policy.lab[`${input.kind}Cost` as "researchCost"|"buildCost"|"transformCost"]:policy.mission.proposalCost;
 const now=new Date().toISOString();const state=feasible==="REVIEW"?"REVIEW":privateJob?"QUEUED":"OPEN";const budget=Math.min(estimateResources(input.kind).budgetUsd,privateJob?tier.jobBudget:policy.mission.budgetUsd);
 await allocate(user.id,id,cost,a.capacity,input.operationId,privateJob?"job":"proposal",[
  statement("INSERT INTO missions(id,command,owner_id,creator,created_at,status,kind,visibility,budget,feasibility,control,demo,input) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM control_allocations WHERE id=?)",id,input.command,user.id,user.wallet??"DEMO OPERATOR",now,state,input.kind,privateJob?"private":"public",budget,feasible,cost,Number(user.demo),input.input??null,input.operationId),
  statement("UPDATE users SET reputation=reputation+? WHERE id=? AND EXISTS(SELECT 1 FROM control_allocations WHERE id=?)",policy.reputation.proposed,user.id,input.operationId),
  statement("INSERT INTO operator_reputation(id,user_id,mission_id,signal,delta,created_at) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM control_allocations WHERE id=?)",crypto.randomUUID(),user.id,id,"proposed",policy.reputation.proposed,now,input.operationId),
 ],{sql:"(SELECT COUNT(*) FROM missions WHERE owner_id=? AND visibility=? AND created_at>=?)<? AND (?=0 OR (SELECT COUNT(*) FROM missions WHERE owner_id=? AND visibility='private' AND status NOT IN ('COMPLETE','FAILED','REVIEW'))<?)",values:[user.id,privateJob?"private":"public",period,privateJob?tier.jobs:tier.proposals,Number(privateJob),user.id,tier.parallel]});await event(id,"mission.submitted",state,feasible==="REVIEW"?"Command held for manual review.":privateJob?"Private job entered the queue.":"Public command entered the arena.");return getMission(id);
}
export async function supportMission(user:Identity,id:string,data:unknown){const input=supportInput.parse(data);const a=await account(user);if(a.tier==="OBSERVER")throw new AppError("OPERATOR_TIER_REQUIRED",403);const m=await getMission(id);if(!m||m.visibility!=="public")throw new AppError("MISSION_NOT_FOUND",404);if(m.status!=="OPEN")throw new AppError("MISSION_ALREADY_SELECTED",409);const now=new Date().toISOString();
 await allocate(user.id,id,input.amount,a.capacity,input.operationId,"support",[
  statement("INSERT INTO mission_support(id,mission_id,user_id,amount,created_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM control_allocations WHERE id=?)",input.operationId,id,user.id,input.amount,now,input.operationId),
  statement("UPDATE missions SET support=(SELECT COALESCE(SUM(amount),0) FROM mission_support WHERE mission_id=?),control=control+? WHERE id=? AND EXISTS(SELECT 1 FROM control_allocations WHERE id=?)",id,input.amount,id,input.operationId),
 ],{sql:"EXISTS(SELECT 1 FROM missions WHERE id=? AND status='OPEN')",values:[id]});return getMission(id);
}
export async function selectNext(){const row=await one<{id:string}>("SELECT id FROM missions WHERE visibility='public' AND status='OPEN' AND feasibility='READY' AND (?=1 OR demo=0) ORDER BY support DESC,created_at ASC LIMIT 1",Number(settings().mode==="mock"));if(!row)throw new AppError("QUEUE_EMPTY",404);const r=await exec("UPDATE missions SET status='QUEUED' WHERE id=? AND status='OPEN' AND NOT EXISTS(SELECT 1 FROM missions WHERE visibility='public' AND status NOT IN ('OPEN','REVIEW','COMPLETE','FAILED') AND (?=1 OR demo=0))",row.id,Number(settings().mode==="mock"));if(!r.meta.changes)throw new AppError("SELECTION_CHANGED",409);await event(row.id,"mission.accepted","QUEUED","Highest-supported feasible command selected.");return row.id;}
