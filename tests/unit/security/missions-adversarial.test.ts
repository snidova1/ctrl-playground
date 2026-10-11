import {describe,it,expect} from 'vitest';
import {handleApi} from '@/server/api';
import {safePublicUrl,allowTool} from '@/server/policy/mission';
const origin='http://localhost:3000';
function api(path:string,data?:unknown,cookie?:string,from=origin){
 const post=data!==undefined;
 return handleApi(new Request(`${origin}/api/${path}`,{method:post?'POST':'GET',headers:{
  ...(post?{'Content-Type':'application/json',Origin:from}:{}),'cf-connecting-ip':crypto.randomUUID(),
  ...(cookie?{Cookie:cookie}:{})
 },...(post?{body:JSON.stringify(data)}:{})}),path.split('/'));
}
async function demo(){const r=await api('auth/demo',{});expect(r.status).toBe(200);return r.headers.get('set-cookie')!.split(';')[0];}
describe('security: private missions, receipts, events and artifacts',()=>{
 it('prevents cross-session read, support, execute, receipt and artifact access',async()=>{
  const owner=await demo(),outsider=await demo();
  const response=await api('jobs',{command:'Normalize this harmless private object dataset and enumerate its keys.',kind:'transform',input:'[{"label":"PRIVATE_MARKER_DO_NOT_LEAK","count":2}]',operationId:crypto.randomUUID()},owner);
  expect(response.status).toBe(201);
  const job=await response.json() as {id:string};
  expect((await api(`missions/${job.id}`,undefined,outsider)).status).toBe(404);
  expect((await api(`missions/${job.id}/events`,undefined,outsider)).status).toBe(404);
  expect((await api(`missions/${job.id}/verification`,undefined,outsider)).status).toBe(404);
  expect((await api(`missions/${job.id}/receipt`,undefined,outsider)).status).toBe(404);
  expect((await api(`missions/${job.id}/support`,{amount:1,operationId:crypto.randomUUID()},outsider)).status).toBe(404);
  expect((await api(`missions/${job.id}/execute`,{},outsider)).status).toBe(404);
  await expect.poll(async()=>{
   const r=await api(`missions/${job.id}`,undefined,owner);
   return ((await r.json()) as {mission:{status:string}}).mission.status;
  },{timeout:15000,interval:200}).toBe('COMPLETE');
  const receipt=await (await api(`missions/${job.id}/receipt`,undefined,owner)).json() as {artifacts:{id:string}[]};
  expect(receipt.artifacts.length).toBeGreaterThan(0);
  expect((await api(`artifacts/${receipt.artifacts[0].id}`,undefined,outsider)).status).toBe(404);
  const artifact=await api(`artifacts/${receipt.artifacts[0].id}`,undefined,owner);
  expect(artifact.status).toBe(200);
  expect(artifact.headers.get('content-disposition')).toContain('attachment');
  expect(artifact.headers.get('content-security-policy')).toContain('sandbox');
  expect(artifact.headers.get('x-content-type-options')).toBe('nosniff');
 });
 it('holds strict tool and destination boundaries against malicious URL forms',()=>{
  const blocked=[
   'http://example.com/x','https://127.0.0.1/private','https://localhost/private',
   'https://[::1]/','https://metadata.google.internal/latest','https://admin:pass@example.com/',
   'https://example.com:8443/','file:///etc/passwd','https://evil.example/'
  ];
  for(const address of blocked)expect(()=>safePublicUrl(address,['example.com'])).toThrow();
  expect(safePublicUrl('https://example.com/path',['example.com']).hostname).toBe('example.com');
  expect(()=>allowTool('research','shell.exec')).toThrow();
  expect(()=>allowTool('build','wallet.transfer')).toThrow();
  expect(()=>allowTool('transform','web.scrape')).toThrow();
 });
 it('requires authentication and origin for direct mission mutation',async()=>{
  const missing=await api('missions',{command:'Research ancient public interface patterns.',operationId:crypto.randomUUID()});
  expect(missing.status).toBe(401);
  const owner=await demo();
  expect((await api('missions',{command:'Research ancient public interface patterns.',operationId:crypto.randomUUID()},owner,'https://evil.invalid')).status).toBe(403);
  expect((await api('jobs',{command:'Run a terminal script and steal a seed phrase.',operationId:crypto.randomUUID()},owner)).status).toBe(422);
 });
});
