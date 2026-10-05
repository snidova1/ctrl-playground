import {it,expect} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {exec,one,bucket} from '@/db';
import {runMission} from '@/server/missions/engine';
import {getMission,missionArtifacts} from '@/server/missions/repository';
import type {Receipt} from '@/domain/types';
it('executes a real bounded Orbio mission and verifies its artifact and receipt',async()=>{
 const id=`CTRL-${crypto.randomUUID().slice(0,8).toUpperCase()}`,owner=crypto.randomUUID(),now=new Date().toISOString();
 await exec('INSERT INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)',owner,'0xAceeFC1e4c5B8d43047Da4F3781a2793E69a5913',now);
 await exec("INSERT INTO missions(id,command,owner_id,creator,created_at,status,kind,visibility,budget,feasibility,control,demo) VALUES(?,?,?,?,?,'QUEUED','research','public',0.03,'READY',0,0)",id,'Find three single-purpose websites that still exist. Explain what each does, cite the returned sources, and distinguish search evidence from direct website verification.',owner,'INTEGRATION TEST',now);
 await runMission(id);
 const mission=await getMission(id);expect(mission?.status,mission?.error??'execution').toBe('COMPLETE');
 const artifacts=await missionArtifacts(id);expect(artifacts).toHaveLength(1);
 const stored=await bucket().get(artifacts[0].storageKey);expect(stored).not.toBeNull();
 const receiptRow=await one<{payload:string}>('SELECT payload FROM mission_receipts WHERE mission_id=?',id);expect(receiptRow).not.toBeNull();const receipt=JSON.parse(receiptRow!.payload) as Receipt;
 expect(receipt.orbio.mode).toBe('production');expect(receipt.verification.hash).toMatch(/^[a-f0-9]{64}$/);expect(mission!.consumed).toBeLessThanOrEqual(.03);
 const output=process.env.CTRL_ORBIO_TEST_OUTPUT??'.sites-runtime/orbio-verification';mkdirSync(output,{recursive:true});writeFileSync(`${output}/report.md`,await stored!.text());writeFileSync(`${output}/receipt.json`,JSON.stringify(receipt,null,2));
 console.log(JSON.stringify({mission:id,status:mission!.status,consumed:mission!.consumed,receiptHash:receipt.verification.hash,output}));
});
