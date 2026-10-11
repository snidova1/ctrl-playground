import {describe,expect,it} from 'vitest';
import {readApiJson,API_MAX_BODY_BYTES} from '@/server/security/read-api-json';
import {handleApi} from '@/server/api';

const origin='http://localhost:3000';
const wallet='0x00000000000000000000000000000000000000c9';
const req=(body:BodyInit,headers:Record<string,string>={})=>new Request(`${origin}/api/auth/nonce`,{
  method:'POST',body,headers:{Origin:origin,'Content-Type':'application/json',
    'CF-Connecting-IP':`api-size-${crypto.randomUUID()}`,...headers}
});
function stream(parts:Uint8Array[],stats:{pulled:number;cancelled:boolean}){
  return new ReadableStream<Uint8Array>({
    pull(controller){
      if(stats.pulled<parts.length)controller.enqueue(parts[stats.pulled++]);
      else controller.close();
    },
    cancel(){stats.cancelled=true;},
  },{highWaterMark:0});
}
function streamedRequest(parts:Uint8Array[],stats:{pulled:number;cancelled:boolean},headers:Record<string,string>={}){
  return new Request(`${origin}/api/auth/nonce`,{
    method:'POST',body:stream(parts,stats),duplex:'half',
    headers:{Origin:origin,'Content-Type':'application/json',
      'CF-Connecting-IP':`api-size-${crypto.randomUUID()}`,...headers},
  } as RequestInit&{duplex:'half'});
}

describe('SEC-03: bounded non-Habitat API JSON',()=>{
  it('parses a document at exactly 16,000 raw bytes without rejecting valid input',async()=>{
    const json='0'+' '.repeat(API_MAX_BODY_BYTES-1);
    expect(new TextEncoder().encode(json).byteLength).toBe(API_MAX_BODY_BYTES);
    expect(await readApiJson(req(json))).toBe(0);
  });
  it('rejects oversized and malformed Content-Length before consuming input',async()=>{
    const large=req('{}',{'Content-Length':String(API_MAX_BODY_BYTES+1)});
    await expect(readApiJson(large)).rejects.toMatchObject({code:'INPUT_TOO_LARGE',status:413});
    expect(large.bodyUsed).toBe(false);
    for(const invalid of ['NaN','-1','9999999999999999999999']){
      const request=req('{}',{'Content-Length':invalid});
      await expect(readApiJson(request)).rejects.toMatchObject({code:'INVALID_CONTENT_LENGTH',status:400});
      expect(request.bodyUsed).toBe(false);
    }
  });
  for(const declared of [undefined,'1']){
    it(`cancels at the second oversized chunk with ${declared?'lying':'absent'} Content-Length`,async()=>{
      const stats={pulled:0,cancelled:false};
      const parts=[new Uint8Array(10_000),new Uint8Array(6_001),new Uint8Array(200_000)];
      const request=streamedRequest(parts,stats,declared?{'Content-Length':declared}:{});
      await expect(readApiJson(request)).rejects.toMatchObject({code:'INPUT_TOO_LARGE',status:413});
      expect(stats.cancelled).toBe(true);
      expect(stats.pulled).toBe(2);
    });
  }
  it('counts UTF-8 bytes rather than JavaScript string length',async()=>{
    const json=JSON.stringify({value:'界'.repeat(6_000)});
    expect(json.length).toBeLessThan(API_MAX_BODY_BYTES);
    expect(new TextEncoder().encode(json).byteLength).toBeGreaterThan(API_MAX_BODY_BYTES);
    await expect(readApiJson(req(json))).rejects.toMatchObject({code:'INPUT_TOO_LARGE',status:413});
  });
  it('keeps the original invalid-JSON API error shape',async()=>{
    await expect(readApiJson(req('not json'))).rejects.toMatchObject({code:'INVALID_JSON',status:400});
    await expect(readApiJson(req(''))).rejects.toMatchObject({code:'INVALID_JSON',status:400});
  });
  it('blocks chunked oversized body at the real public auth endpoint while preserving ordinary requests',async()=>{
    const stats={pulled:0,cancelled:false};
    const oversized=streamedRequest([new Uint8Array(API_MAX_BODY_BYTES+1),new Uint8Array(500_000)],stats);
    const blocked=await handleApi(oversized,['auth','nonce']);
    expect(blocked.status).toBe(413);
    expect(await blocked.json()).toMatchObject({code:'INPUT_TOO_LARGE'});
    expect(stats.cancelled).toBe(true);
    expect(stats.pulled).toBe(1);

    const ordinary=await handleApi(req(JSON.stringify({address:wallet})),['auth','nonce']);
    expect(ordinary.status).toBe(200);
    expect(await ordinary.json()).toMatchObject({nonce:expect.any(String),message:expect.any(String)});
  });
});
