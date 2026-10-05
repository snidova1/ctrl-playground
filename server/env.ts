import {deployment} from "@/config/deployment";
import { env as platform } from "@/lib/platform";
import type { Mode } from "@/domain/types";
export function settings(){
 const mode=(platform.CTRL_MODE??process.env.CTRL_MODE??"mock") as Mode;
 if(!["mock","development","production"].includes(mode))throw new Error("INVALID_RUNTIME_MODE");
 const read=(key:keyof Cloudflare.Env):string=>String(platform[key]??process.env[key]??"");
 return {mode,orbioKey:read("ORBIO_API_KEY"),orbioModel:read("ORBIO_MODEL"),agentId:read("ORBIO_AGENT_ID"),orbioBase:read("ORBIO_BASE_URL")||"https://api.orbio.so",token:read("CTRL_TOKEN_ADDRESS")||(Number(read("CTRL_CHAIN_ID")||deployment.chainId)===deployment.chainId?deployment.token??"":""),rpc:read("CTRL_RPC_URL")||(Number(read("CTRL_CHAIN_ID")||deployment.chainId)===deployment.chainId?deployment.rpc:""),chainId:Number(read("CTRL_CHAIN_ID")||deployment.chainId),lockAddress:read("CTRL_LOCK_ADDRESS"),origin:read("APP_ORIGIN")||"",workerSecret:read("WORKER_SECRET"),compatibleUrl:read("OPENAI_COMPATIBLE_URL"),compatibleKey:read("OPENAI_COMPATIBLE_KEY"),compatibleModel:read("OPENAI_COMPATIBLE_MODEL"),demoAuth:mode==="mock"||mode==="development"&&read("DEMO_AUTH_ENABLED")==="true"};
}
