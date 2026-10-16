import {test,expect} from 'vitest';
import {DatabaseSync} from 'node:sqlite';
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('a second Next worker waits for SQLite startup contention instead of failing',async()=>{
 const filename=path.join(mkdtempSync(path.join(tmpdir(),'ctrl-worker-lock-')),'shared.sqlite');
 const owner=new DatabaseSync(filename);
 owner.exec('CREATE TABLE proof(value TEXT); BEGIN EXCLUSIVE; INSERT INTO proof VALUES(\'preserved\')');
 const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',`
  console.log('starting');
  const {env}=await import('./lib/platform-node.ts');
  console.log(JSON.stringify(await env.DB.prepare('SELECT value FROM proof').first()));
 `],{cwd:process.cwd(),env:{...process.env,CTRL_LOCAL_DB:filename},stdio:['ignore','pipe','pipe']});
 let output='',error='',release:ReturnType<typeof setTimeout>|undefined;
 child.stdout.on('data',chunk=>{
  output+=String(chunk);
  if(output.includes('starting')&&!release)release=setTimeout(()=>owner.exec('COMMIT'),700);
 });
 child.stderr.on('data',chunk=>{error+=String(chunk);});
 try{
  const code=await new Promise<number|null>((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});
  expect(code,error).toBe(0);
  expect(output).toContain('"value":"preserved"');
 }finally{
  if(release)clearTimeout(release);
  if(owner.isTransaction)owner.exec('ROLLBACK');
  owner.close();
 }
},15000);
