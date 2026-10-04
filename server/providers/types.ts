import type { ProviderResult,SearchResult } from "@/domain/types";
export interface ModelProvider {name:string;generate(command:string,context:string,budget:number):Promise<ProviderResult<string>>;models():Promise<{id:string;name:string}[]>;}
export interface SearchProvider {name:string;search(query:string,budget:number):Promise<ProviderResult<SearchResult[]>>;}
export interface ToolProvider {name:string;transform(input:string):Promise<ProviderResult<string>>;}
export interface PublishingProvider {publish(key:string,content:string,mime:string):Promise<void>;}
export interface ComputeBalanceProvider {balance():Promise<{available:string|null;used:string|null}>;}
