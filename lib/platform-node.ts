// Next.js development adapter. Hosted runtime uses real Cloudflare D1 / R2.
import {DatabaseSync}from"node:sqlite";
import {mkdir,writeFile,readFile}from"node:fs/promises";
import {mkdirSync}from"node:fs";
import path from "node:path";
const databasePath=process.env.CTRL_LOCAL_DB??path.resolve(process.cwd(),".sites-runtime/ctrl.sqlite");mkdirSync(path.dirname(databasePath),{recursive:true});
// Next build/dev workers can open the local database concurrently. Wait for a
// short-lived startup/write lock before selecting WAL; never alter hosted D1.
const sqlite=new DatabaseSync(databasePath);sqlite.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;");
class LocalStatement {constructor(private sql:string,private values:unknown[]=[]){}bind(...values:unknown[]){return new LocalStatement(this.sql,values);}async first<T>(){return sqlite.prepare(this.sql).get(...this.values as never[]) as T??null;}async all<T>(){return {results:sqlite.prepare(this.sql).all(...this.values as never[]) as T[],success:true,meta:{}};}runSync(){const result=sqlite.prepare(this.sql).run(...this.values as never[]);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid),duration:0}};}async run(){return this.runSync();}}
// Keep the transaction synchronous so overlapping requests cannot interleave on this connection.
const DB={prepare(sql:string){return new LocalStatement(sql);},async batch(statements:LocalStatement[]){sqlite.exec("BEGIN IMMEDIATE");try{const results=[];for(const s of statements)results.push(s.runSync());sqlite.exec("COMMIT");return results;}catch(e){sqlite.exec("ROLLBACK");throw e;}},async exec(sql:string){sqlite.exec(sql);return {count:0,duration:0};}};
const root=path.resolve(process.cwd(),".sites-runtime/artifacts");
const BUCKET={async put(key:string,value:string){const target=path.resolve(root,key);if(!target.startsWith(root+path.sep))throw new Error("Invalid storage key");await mkdir(path.dirname(target),{recursive:true});await writeFile(target,value);return {key};},async get(key:string){const target=path.resolve(root,key);if(!target.startsWith(root+path.sep))return null;try{const content=await readFile(target,"utf8");return {text:async()=>content};}catch{return null;}}};
export const env={...process.env,DB:DB as unknown as D1Database,BUCKET:BUCKET as unknown as R2Bucket} as Cloudflare.Env;
