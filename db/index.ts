import { env } from "@/lib/platform";
export function database():D1Database {if(!env.DB)throw new Error("DATABASE_UNAVAILABLE");return env.DB;}
export function bucket():R2Bucket {if(!env.BUCKET)throw new Error("ARTIFACT_STORAGE_UNAVAILABLE");return env.BUCKET;}
export async function query<T>(sql:string,...args:unknown[]):Promise<T[]> {const r=await database().prepare(sql).bind(...args).all<T>();return r.results;}
export async function one<T>(sql:string,...args:unknown[]):Promise<T|null>{return database().prepare(sql).bind(...args).first<T>();}
export async function exec(sql:string,...args:unknown[]){return database().prepare(sql).bind(...args).run();}
export function statement(sql:string,...args:unknown[]){return database().prepare(sql).bind(...args);}
export function batch(statements:D1PreparedStatement[]){return database().batch(statements);}
