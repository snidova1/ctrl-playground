import {handleHabitat} from './habitat/service';
import {handlePlaza} from './plaza/service';
import {launchStatus} from "./launch/status";
import {deployment} from "@/config/deployment";
import {networkFor} from "@/config/network";
import {isAddress} from "viem";
import { z,ZodError } from "zod";
import { identity,requireIdentity,demoSession,logout,nonce,authenticate,rateLimit } from "./wallet/auth";
import { account } from "./wallet/account";
import { listMissions,getMission,missionEvents,missionArtifacts,getReceipt } from "./missions/repository";
import { submitMission,supportMission,selectNext } from "./missions/service";
import { runMission,tickQueue } from "./missions/engine";
import { ensureDemoSeed } from "./missions/seed";
import { machineState } from "./machine";
import { AppError,safeError } from "./errors";
import { exec,one,bucket,query } from "@/db";
import { settings } from "./env";
import { background } from "./context";
import { worlds } from "@/features/worlds/data";
import type { WorldManifest } from "@/domain/types";
import {verifyReceipt} from "./receipts/generate";
import { hash } from "./receipts/hash";
const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
function json(data:unknown,status=200,extra:Record<string,string>={}){return Response.json(data,{status,headers:{...headers,...extra}});}
async function body(request:Request):Promise<unknown>{const length=Number(request.headers.get("content-length")??0);if(length>16000)throw new AppError("INPUT_TOO_LARGE",413);const text=await request.text();if(text.length>16000)throw new AppError("INPUT_TOO_LARGE",413);try{return JSON.parse(text) as unknown;}catch{throw new AppError("INVALID_JSON",400);}}
function verifyOrigin(request:Request){const origin=request.headers.get("origin");const expected=settings().origin||new URL(request.url).origin;if(origin!==expected)throw new AppError("ORIGIN_NOT_ALLOWED",403);if(!request.headers.get("content-type")?.startsWith("application/json"))throw new AppError("JSON_REQUIRED",415);}
async function permittedMission(request:Request,id:string){const mission=await getMission(id);if(!mission)throw new AppError("MISSION_NOT_FOUND",404);if(mission.visibility==="private"&&(await requireIdentity(request)).id!==mission.ownerId)throw new AppError("MISSION_NOT_FOUND",404);return mission;}
export async function handleApi(request:Request,path:string[]):Promise<Response>{try{
 const p=path.join("/");const method=request.method;
 if(path[0]==="habitat")return handleHabitat(request,path.slice(1));
 if(path[0]==="plaza")return handlePlaza(request,path.slice(1));
 if(method==="POST"&&p==="engine/tick"){const secret=settings().workerSecret;if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)throw new AppError("WORKER_AUTH_REQUIRED",401);await rateLimit("worker",12);const id=await tickQueue();await exec("INSERT INTO system_config(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at","worker.heartbeat",JSON.stringify({at:new Date().toISOString(),healthy:true}),new Date().toISOString());return json({missionId:id});}
 if(method!=="GET"){verifyOrigin(request);const u=await identity(request);await rateLimit(`write:${u?.id??request.headers.get("cf-connecting-ip")??"anonymous"}`,20);}
 if(method==="GET"&&p==="network"){const s=settings();const chain=networkFor(s.chainId);return json({walletConnectProjectId:/^[a-f0-9]{32}$/i.test(s.walletConnectProjectId)?s.walletConnectProjectId:null,chainId:chain.id,name:chain.name,testnet:!!chain.testnet,token:isAddress(s.token)?s.token:null,explorer:chain.blockExplorers.default.url,faucetEnabled:chain.id===46630&&isAddress(s.token)&&s.token.toLowerCase()===deployment.token?.toLowerCase()});}
 if(method==="GET"&&p==="runtime")return json({mode:settings().mode,demoEnabled:settings().demoAuth,execution:"on-demand",publicRelease:settings().publicRelease});
 if(method==="GET"&&p==="launch")return json(await launchStatus());
 if(method==="GET"&&p==="health")return json({status:"ok",mode:settings().mode,version:"1.0.0"});
 if(method==="GET"&&p==="account")return json(await account(await identity(request)));
 if(method==="POST"&&p==="auth/demo")return json({ok:true},200,{"Set-Cookie":await demoSession(request)});
 if(method==="POST"&&p==="auth/logout")return json({ok:true},200,{"Set-Cookie":await logout(request)});
 if(method==="POST"&&p==="auth/nonce"){const d=z.object({address:z.string()}).strict().parse(await body(request));return json(await nonce(request,d.address));}
 if(method==="POST"&&p==="auth/verify"){const d=z.object({address:z.string(),nonce:z.string().max(64),signature:z.string().regex(/^0x[0-9a-fA-F]+$/).max(2048)}).strict().parse(await body(request));return json({ok:true},200,{"Set-Cookie":await authenticate(request,d.address,d.nonce,d.signature as `0x${string}`)});}
 if(method==="GET"&&p==="missions"){await ensureDemoSeed();return json(await listMissions());}
 if(method==="POST"&&p==="missions"){const m=await submitMission(await requireIdentity(request),await body(request));return json(m,201);}
 if(method==="GET"&&p==="jobs")return json(await listMissions((await requireIdentity(request)).id));
 if(method==="POST"&&p==="jobs"){const m=await submitMission(await requireIdentity(request),await body(request),true);if(m?.status==="QUEUED"&&settings().mode==="mock")background(runMission(m.id));return json(m,201);}
 if(method==="GET"&&p==="machine")return json(await machineState());
 if(method==="GET"&&p==="worlds"){const records=await query<{manifest:string}>("SELECT w.manifest FROM worlds w JOIN missions m ON m.id=w.mission_id WHERE m.visibility='public' ORDER BY w.created_at DESC LIMIT 100");const registry=new Map(worlds.map(w=>[w.slug,w]));for(const row of records){const manifest=JSON.parse(row.manifest) as WorldManifest;registry.set(manifest.slug,manifest);}return json([...registry.values()]);}
 if(method==="GET"&&path[0]==="worlds"&&path[1]){const base=worlds.find(w=>w.slug===path[1]);if(base)return json({manifest:base});const row=await one<{manifest:string;data:string;mission_id:string}>("SELECT manifest,data,mission_id FROM worlds WHERE slug=?",path[1]);if(!row)throw new AppError("WORLD_NOT_FOUND",404);await permittedMission(request,row.mission_id);return json({manifest:JSON.parse(row.manifest) as WorldManifest,data:JSON.parse(row.data) as unknown});}
 if(method==="POST"&&p==="engine/next"){const a=await account(await requireIdentity(request));if(a.tier==="OBSERVER")throw new AppError("OPERATOR_TIER_REQUIRED",403);const id=await selectNext();return json({missionId:id},202);}
 if(method==="POST"&&p==="account/allocation"){const u=await requireIdentity(request);if(!u.demo)throw new AppError("ALLOCATION_CONTRACT_NOT_DEPLOYED",503);const d=z.object({amount:z.number().finite().min(0).max(64000)}).strict().parse(await body(request));await exec("UPDATE users SET lock_amount=?,lock_days=0,lock_until=NULL WHERE id=?",d.amount,u.id);return json(await account((await identity(request))!));}
 if(method==="POST"&&(p==="account/lock"||p==="account/burn"))throw new AppError("TOKEN_ACTION_REMOVED",410,"Burn and fixed-duration locking are not part of CTRL.");
 if(path[0]==="missions"&&path[1]){const m=await permittedMission(request,path[1]);
  if(method==="POST"&&path[2]==="execute"){const user=await requireIdentity(request);if(m.ownerId!==user.id&&m.visibility==="private")throw new AppError("MISSION_NOT_FOUND",404);const holder=await account(user);if(holder.tier==="OBSERVER")throw new AppError("OPERATOR_TIER_REQUIRED",403);if(m.status!=="QUEUED")return json({missionId:m.id,status:m.status});await runMission(m.id);return json({missionId:m.id,status:(await getMission(m.id))?.status});}
  if(method==="GET"&&path.length===2)return json({mission:m,events:await missionEvents(m.id),artifacts:await missionArtifacts(m.id)});
  if(method==="POST"&&path[2]==="support")return json(await supportMission(await requireIdentity(request),m.id,await body(request)));
  if(method==="POST"&&path[2]==="retry"){const user=await requireIdentity(request);if(user.id!==m.ownerId)throw new AppError("MISSION_NOT_FOUND",404);if(m.status!=="FAILED")throw new AppError("MISSION_NOT_RETRYABLE",409);throw new AppError("NEW_COMMAND_REQUIRED",409,"The failed receipt is permanent. Check provider settlement, then submit a new command with its own budget and receipt.");}
  if(method==="GET"&&path[2]==="verification"){const receipt=await getReceipt(m.id);if(!receipt)throw new AppError("RECEIPT_NOT_READY",404);return json({verified:await verifyReceipt(receipt)});}
  if(method==="GET"&&path[2]==="receipt"){const r=await getReceipt(m.id);if(!r)throw new AppError("RECEIPT_NOT_READY",404);return json(r,200,request.url.includes("download=1")?{"Content-Disposition":`attachment; filename="${m.id}-receipt.json"`}:{});}
  if(method==="GET"&&path[2]==="events")return streamEvents(request,m.id);
 }
 if(method==="GET"&&path[0]==="artifacts"&&path[1]){const row=await one<{mission_id:string;storage_key:string;mime:string;sha256:string}>("SELECT * FROM artifacts WHERE id=?",path[1]);if(!row)throw new AppError("ARTIFACT_NOT_FOUND",404);await permittedMission(request,row.mission_id);const file=await bucket().get(row.storage_key);if(!file)throw new AppError("ARTIFACT_NOT_FOUND",404);const content=await file.text();if(await hash(content)!==row.sha256)throw new AppError("ARTIFACT_VERIFICATION_FAILED",500);return new Response(content,{headers:{...headers,"Content-Type":row.mime,"Content-Disposition":`attachment; filename="ctrl-${path[1]}.${row.mime==="application/json"?"json":row.mime==="text/html"?"html":"md"}"`,"Content-Security-Policy":"sandbox; default-src 'none'"}});}
 throw new AppError("ROUTE_NOT_FOUND",404);
 }catch(error){if(error instanceof ZodError)return json({code:"INVALID_COMMAND",detail:error.errors.map(e=>e.message).join(". ")},422);const e=safeError(error);return json({code:e.code,detail:e.detail},e.status);}}
function streamEvents(request:Request,id:string){const enc=new TextEncoder();const seen=new Set<string>();const stream=new ReadableStream<Uint8Array>({async start(controller){const until=Date.now()+25000;try{while(Date.now()<until&&!request.signal.aborted){const [events,m]=await Promise.all([missionEvents(id),getMission(id)]);for(const e of events)if(!seen.has(e.id)){seen.add(e.id);controller.enqueue(enc.encode(`id: ${e.id}\ndata: ${JSON.stringify(e)}\n\n`));}if(m?.status==="COMPLETE"||m?.status==="FAILED"){controller.enqueue(enc.encode(`event: terminal\ndata: ${JSON.stringify({status:m.status})}\n\n`));break;}controller.enqueue(enc.encode(": heartbeat\n\n"));await new Promise(resolve=>setTimeout(resolve,700));}}catch{if(!request.signal.aborted)controller.enqueue(enc.encode('event: unavailable\ndata: {}\n\n'));}finally{try{controller.close();}catch{/* Client disconnected. */}}}});return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","X-Accel-Buffering":"no","X-Content-Type-Options":"nosniff"}});}
