import { createPublicClient,http,erc20Abi,formatUnits,isAddress } from "viem";
import { query,one,exec } from "@/db";
import type { Account } from "@/domain/types";
import { controlCapacity,resolveTier } from "@/domain/control";
import { policy,type TierName } from "@/config/policy";
import { settings } from "@/server/env";
import type { Identity } from "./auth";
import { AppError } from "@/server/errors";
export async function account(user:Identity|null):Promise<Account>{
 const s=settings();let balance:number|null=null,heldDays=0;
 if(user?.demo&&s.demoAuth){balance=64000;heldDays=90;}
 else if(user?.wallet&&s.token&&s.rpc){if(!isAddress(s.token))throw new AppError("CTRL_TOKEN_NOT_CONFIGURED",503);const client=createPublicClient({transport:http(s.rpc,{timeout:10000})});const chain=await client.getChainId();if(chain!==s.chainId)throw new AppError("RPC_ON_WRONG_NETWORK",503);const [raw,decimals,block]=await Promise.all([client.readContract({address:s.token,abi:erc20Abi,functionName:"balanceOf",args:[user.wallet as `0x${string}`]}),client.readContract({address:s.token,abi:erc20Abi,functionName:"decimals"}),client.getBlockNumber()]);balance=Number(formatUnits(raw,decimals));if(!Number.isFinite(balance)||balance>Number.MAX_SAFE_INTEGER)throw new AppError("BALANCE_OUT_OF_RANGE",503);
  // Snapshotting does not prove continuous ownership; no time multiplier in live mode.
  await exec("INSERT INTO holder_snapshots(id,user_id,balance,chain_id,block,created_at) VALUES(?,?,?,?,?,?)",crypto.randomUUID(),user.id,raw.toString(),s.chainId,block.toString(),new Date().toISOString());
 }
 const tierName=resolveTier(balance??0) as TierName;const tier=policy.tiers.find(t=>t.name===tierName)!;
 const lock={amount:user?.demo?user.lock_amount:0,days:user?.demo?user.lock_days:0,unlocksAt:user?.demo?user.lock_until:null,simulated:!!user?.demo};const capacity=controlCapacity(balance??0,heldDays,user?.reputation??0,lock);
 const period=new Date().toISOString().slice(0,10);const used=user?(await one<{total:number}>("SELECT COALESCE(SUM(amount),0) AS total FROM control_allocations WHERE user_id=? AND period=?",user.id,period))?.total??0:0;
 const history=user?await query<{status:string;visibility:string;created_at:string}>("SELECT status,visibility,created_at FROM missions WHERE owner_id=?",user.id):[];
 return {id:user?.id??"observer",wallet:user?.wallet??null,authenticated:!!user,demo:!!user?.demo,balance,heldDays,reputation:user?.reputation??0,lock,tier:tierName,capacity,used,available:Math.max(0,capacity-used),jobAllowance:tier.jobs,jobsUsed:history.filter(m=>m.visibility==="private"&&m.created_at.startsWith(period)).length,parallel:tier.parallel,proposals:history.filter(m=>m.visibility==="public").length,selected:history.filter(m=>!["OPEN","REVIEW"].includes(m.status)).length,successful:history.filter(m=>m.status==="COMPLETE").length,tokenConfigured:!!s.token,chainId:s.chainId};
}
