import { z } from "zod";
import { policy } from "@/config/policy";
import { AppError } from "@/server/errors";
export const missionInput=z.object({command:z.string().trim().min(policy.mission.minLength).max(policy.mission.maxLength),kind:z.enum(["research","build","transform"]).default("research"),input:z.string().max(policy.lab.maxInput).optional(),operationId:z.string().uuid()}).strict();
export const supportInput=z.object({amount:z.number().int().min(1).max(policy.mission.maxSupport),operationId:z.string().uuid()}).strict();
export function classifyCommand(command:string):"READY"|"REVIEW" {
 if(/\b(private key|seed phrase|steal|doxx|malware|credential theft|phishing|ransomware|hack into)\b/i.test(command))throw new AppError("MISSION_REJECTED",422,"This command asks for a capability the public machine does not grant.");
 if(/\b(publish to|send email|post on|delete|transfer|swap|trade|deploy contract|buy token|execute shell|run shell|bash|powershell)\b/i.test(command))return "REVIEW";
 return "READY";
}
export function safePublicUrl(value:string,allowedDomains?:readonly string[]):URL {
 let url:URL;try{url=new URL(value);}catch{throw new AppError("INVALID_URL",422);}
 if(url.protocol!=="https:"||url.username||url.password||url.port&&url.port!=="443")throw new AppError("URL_NOT_ALLOWED",422);
 const host=url.hostname.toLowerCase();
 if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||host.includes(":")||/^\d+([.]\d+){0,3}$/.test(host)||/^(0x|0[0-7])/.test(host)||host==="metadata.google.internal")throw new AppError("URL_NOT_ALLOWED",422);
 if(allowedDomains&&!allowedDomains.includes(host))throw new AppError("DOMAIN_NOT_ALLOWED",422);
 return url;
}
export const toolPermissions={research:["web.search","web.scrape","model.generate","artifact.publish"],build:["web.search","model.generate","artifact.publish"],transform:["data.transform","artifact.publish"]} as const;
export function allowTool(kind:keyof typeof toolPermissions,tool:string){if(!(toolPermissions[kind] as readonly string[]).includes(tool))throw new AppError("TOOL_NOT_PERMITTED",403);}
export function estimateResources(kind:string){return {budgetUsd:kind==="build"?.2:kind==="transform"?.01:.08,steps:kind==="transform"?5:9};}
