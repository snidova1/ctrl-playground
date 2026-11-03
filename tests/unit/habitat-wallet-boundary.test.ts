import {beforeAll,describe,expect,it} from 'vitest';
import {handleApi} from '@/server/api';
import {createSession} from '@/server/wallet/auth';
import {exec,one} from '@/db';
import type {WorldState} from '@/features/habitat/types';

const origin='http://localhost:3000';
const wallet='0x00000000000000000000000000000000000000c7';
const walletId=`wallet-${wallet}`;
let walletCookie='';

function habitat(path:string, payload?:unknown, cookie=''){
  return handleApi(new Request(`${origin}/api/habitat/${path}`,{
    method:payload===undefined?'GET':'POST',
    headers:{
      ...(payload===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),
      ...(cookie?{Cookie:cookie}:{})
    },
    body:payload===undefined?undefined:JSON.stringify(payload)
  }),['habitat',...path.split('/')]);
}

async function guestSession(){
  const response=await handleApi(new Request(`${origin}/api/plaza/join`,{
    method:'POST',
    headers:{Origin:origin,'Content-Type':'application/json'},
    body:JSON.stringify({name:'Plaza-only guest'})
  }),['plaza','join']);
  expect(response.status).toBe(201);
  return response.headers.get('set-cookie')!.split(';')[0];
}
async function guestWorldCount(){
  const result=await one<{count:number}>("SELECT COUNT(*) AS count FROM habitat_worlds WHERE owner_id LIKE 'guest-%'");
  return result?.count??0;
}

beforeAll(async()=>{
  await exec('INSERT OR IGNORE INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)',
    walletId,wallet,new Date().toISOString());
  walletCookie=(await createSession(walletId,false)).split(';')[0];
});

describe('SEC-01: personal-world access requires verified wallet sessions',()=>{
  it('preserves Common Ground guest access without granting durable Habitat creation',async()=>{
    const guest=await guestSession();
    const initial=await guestWorldCount();
    const response=await habitat('profile',
      {name:'Invalid guest home',character:'female',variant:'original'},guest);
    expect(response.status).toBe(401);
    expect((await response.json() as {code:string}).code).toBe('WALLET_SESSION_REQUIRED');
    expect(await guestWorldCount()).toBe(initial);
    expect((await habitat('state',undefined,guest)).status).toBe(401);
    const plaza=await handleApi(new Request(`${origin}/api/plaza/state`,{
      headers:{Cookie:guest}
    }),['plaza','state']);
    expect(plaza.status).toBe(200);
  });

  it('rejects forged wallet tokens even when accompanied by a legitimate plaza cookie',async()=>{
    const guest=await guestSession();
    expect((await habitat('profile',{name:'Forged home',character:'female',variant:'original'},
      `ctrl_session=forged; ${guest}`)).status).toBe(401);
    expect((await habitat('state',undefined,'ctrl_session=forged')).status).toBe(401);
    expect((await habitat('profile',{name:'No cookie',character:'female',variant:'original'})).status).toBe(401);
  });

  it('also denies guest writes to save, settings and interactions',async()=>{
    const guest=await guestSession();
    for(const [path,payload] of [
      ['save',{worldId:crypto.randomUUID(),revision:0,objects:[]}],
      ['settings',{name:'Hijacked',visibility:'public'}],
      ['use',{id:crypto.randomUUID()}],
      ['visit',{id:crypto.randomUUID()}]
    ] as const){
      const response=await habitat(path,payload,guest);
      expect(response.status).toBe(401);
      expect((await response.json() as {code:string}).code).toBe('WALLET_SESSION_REQUIRED');
    }
  });

  it('rejects demo sessions despite a valid opaque session cookie',async()=>{
    const id=`demo-${crypto.randomUUID()}`;
    await exec('INSERT INTO users(id,wallet,demo,created_at) VALUES(?,NULL,1,?)',id,new Date().toISOString());
    const demo=(await createSession(id,false)).split(';')[0];
    expect((await habitat('profile',{name:'Demo home',character:'male',variant:'original'},demo)).status).toBe(401);
  });

  it('allows a verified wallet to create and maintain exactly one durable home',async()=>{
    const first=await habitat('profile',{name:'Wallet Holder',character:'female',variant:'sage'},walletCookie);
    expect(first.status).toBe(200);
    const state=await first.json() as WorldState;
    expect(state.wallet).toBe(wallet);
    expect(state.world?.ownerId).toBe(walletId);
    expect(state.homeId).toBe(state.world?.id);
    expect(state.canEdit).toBe(true);
    const second=await habitat('profile',{name:'Wallet Holder',character:'female',variant:'original'},walletCookie);
    expect(second.status).toBe(200);
    const repeat=await second.json() as WorldState;
    expect(repeat.homeId).toBe(state.homeId);
    const homes=await one<{count:number}>('SELECT COUNT(*) AS count FROM habitat_worlds WHERE owner_id=?',walletId);
    expect(homes?.count).toBe(1);
    const saved=await habitat('save',{worldId:state.homeId,revision:repeat.world!.revision,objects:[]},walletCookie);
    expect(saved.status).toBe(200);
    expect(((await saved.json()) as WorldState).world?.revision).toBe(repeat.world!.revision+1);
  });
});
