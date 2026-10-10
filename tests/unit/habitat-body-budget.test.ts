import {beforeAll,describe,expect,it} from 'vitest';
import {handleApi} from '@/server/api';
import {createSession} from '@/server/wallet/auth';
import {exec} from '@/db';
import {HABITAT_MAX_BODY_BYTES,readHabitatJson} from '@/server/habitat/read-json';

const origin='http://localhost:3000';
const wallet='0x00000000000000000000000000000000000000c9';
let cookie='';

function request(body:BodyInit,headers:Record<string,string>={}):Request{
  return new Request(`${origin}/api/habitat/profile`,{
    method:'POST',body,headers:{Origin:origin,'Content-Type':'application/json',...headers}
  });
}
function customStream(parts:Uint8Array[]):ReadableStream<Uint8Array>{
  let index=0;
  return new ReadableStream<Uint8Array>({
    pull(controller){if(index<parts.length)controller.enqueue(parts[index++]);else controller.close();}
  });
}

beforeAll(async()=>{
  const id=`wallet-${wallet}`;
  await exec('INSERT OR IGNORE INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)',
    id,wallet,new Date().toISOString());
  cookie=(await createSession(id,false)).split(';')[0];
});

describe('SEC-02: Habitat JSON streaming size limit',()=>{
  it('accepts a valid JSON document at the exact 80,000-byte boundary',async()=>{
    const json=' '.repeat(HABITAT_MAX_BODY_BYTES-1)+'0';
    expect(new TextEncoder().encode(json).byteLength).toBe(HABITAT_MAX_BODY_BYTES);
    expect(await readHabitatJson(request(json))).toBe(0);
  });

  it('rejects declared excess length without reading any request bytes',async()=>{
    const req=request('{}',{'Content-Length':String(HABITAT_MAX_BODY_BYTES+1)});
    await expect(readHabitatJson(req)).rejects.toMatchObject({code:'INPUT_TOO_LARGE',status:413});
    expect(req.bodyUsed).toBe(false);
  });

  it('rejects streamed chunks without Content-Length before accumulating oversized input',async()=>{
    const req=new Request(`${origin}/api/habitat/profile`,{
      method:'POST',body:customStream([new Uint8Array(60_000),new Uint8Array(20_001)]),
      headers:{Origin:origin,'Content-Type':'application/json'},
      duplex:'half',
    } as RequestInit & {duplex:'half'});
    expect(req.headers.get('content-length')).toBeNull();
    await expect(readHabitatJson(req)).rejects.toMatchObject({code:'INPUT_TOO_LARGE',status:413});
  });

  it('counts raw UTF-8 bytes rather than silently accepting multibyte characters',async()=>{
    const utf8=JSON.stringify({name:'界'.repeat(28_000)});
    expect(utf8.length).toBeLessThan(HABITAT_MAX_BODY_BYTES);
    expect(new TextEncoder().encode(utf8).length).toBeGreaterThan(HABITAT_MAX_BODY_BYTES);
    await expect(readHabitatJson(request(utf8))).rejects.toMatchObject({code:'INPUT_TOO_LARGE',status:413});
  });

  it('rejects invalid declared lengths before reading and preserves JSON parse errors',async()=>{
    await expect(readHabitatJson(request('{}',{'Content-Length':'bogus'}))).rejects.toMatchObject({
      code:'INVALID_CONTENT_LENGTH',status:400
    });
    await expect(readHabitatJson(request('invalid JSON'))).rejects.toBeInstanceOf(SyntaxError);
  });

  it('wires the cap through the actual wallet-authenticated Habitat API without breaking normal profile writes',async()=>{
    const tooLarge=new Request(`${origin}/api/habitat/profile`,{
      method:'POST',
      headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({name:'x'.repeat(HABITAT_MAX_BODY_BYTES),character:'female',variant:'original'})
    });
    const blocked=await handleApi(tooLarge,['habitat','profile']);
    expect(blocked.status).toBe(413);
    expect((await blocked.json() as {code:string}).code).toBe('INPUT_TOO_LARGE');

    const normal=new Request(`${origin}/api/habitat/profile`,{
      method:'POST',
      headers:{Cookie:cookie,Origin:origin,'Content-Type':'application/json'},
      body:JSON.stringify({name:'Stream Safe',character:'female',variant:'original'})
    });
    expect((await handleApi(normal,['habitat','profile'])).status).toBe(200);
  });
});
