import {beforeAll,describe,expect,it} from 'vitest';
import {handleApi} from '@/server/api';
import {exec} from '@/db';
import {createSession} from '@/server/wallet/auth';
import {BUILD_ASSETS,getBuildAsset} from '@/features/plaza/build-assets';
import {resolveHabitatAssets} from '@/server/habitat/asset-resolver';

const origin='http://localhost:3000';
let walletCookie='';

function resolve(body:unknown,cookie=walletCookie,options?:{origin?:string;contentType?:string}){
  return handleApi(new Request(`${origin}/api/habitat/assets/resolve`,{
    method:'POST',
    headers:{
      Origin:options?.origin??origin,
      'Content-Type':options?.contentType??'application/json',
      ...(cookie?{Cookie:cookie}:{})
    },
    body:JSON.stringify(body)
  }),['habitat','assets','resolve']);
}

beforeAll(async()=>{
  // The auth module creates the opaque, hashed server session in the fixture.
  // EOA signature/nonce verification is covered by separate authentication tests.
  const wallet='0x00000000000000000000000000000000000000ab';
  const id=`wallet-${wallet}`;
  await exec('INSERT OR IGNORE INTO users(id,wallet,demo,created_at) VALUES(?,?,0,?)',
    id,wallet,new Date().toISOString());
  walletCookie=(await createSession(id,false)).split(';')[0];
});

describe('habitat approved catalogue resolver',()=>{
  it('returns only existing catalogue metadata, locally served URLs and primitive identifiers',async()=>{
    const ids=['building-kit/column','ctrl-door','ctrl-lamp','building-kit/column'];
    const response=await resolve({ids});
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const {assets}=await response.json() as {assets:Array<Record<string,unknown>>};
    expect(assets.map(a=>a.id)).toEqual(['building-kit/column','ctrl-door','ctrl-lamp']);
    const catalog=getBuildAsset('building-kit/column')!;
    expect(assets[0]).toMatchObject({kind:'model',id:catalog.id,url:catalog.url,thumbnailUrl:catalog.thumbnailUrl,bounds:catalog.bounds,collision:catalog.collision});
    expect((assets[0].url as string).startsWith('/plaza/build-kit/')).toBe(true);
    expect(assets[1]).toMatchObject({kind:'primitive',id:'ctrl-door',url:null,thumbnailUrl:null,defaultBehavior:'door'});
    expect(assets[2]).toMatchObject({kind:'primitive',id:'ctrl-lamp',url:null,defaultBehavior:'light'});
    expect(JSON.stringify(assets)).not.toContain('https://');
  });

  it('covers the actual checked-in catalogue and seven fixed runtime primitives',()=>{
    const ids=BUILD_ASSETS.map(a=>a.id);
    const all=ids.flatMap((_,index)=>index%120===0?resolveHabitatAssets({ids:ids.slice(index,index+120)}).assets:[]);
    expect(all).toHaveLength(ids.length);
    expect(new Set(all.map(a=>a.id)).size).toBe(ids.length);
    expect(all.every(a=>a.kind==='model')).toBe(true);
    const primitives=['ctrl-block','ctrl-seat','ctrl-lamp','ctrl-door','ctrl-switch','ctrl-portal','ctrl-marker'];
    expect(resolveHabitatAssets({ids:primitives}).assets.map(a=>a.id)).toEqual(primitives);
  });

  it('rejects unknown/hostile references without returning a partial resolution',async()=>{
    for(const id of [
      'https://attacker.invalid/payload.glb','../../secrets','/plaza/build-kit/building-kit/column.glb',
      'javascript:alert(1)','ctrl-no-such-tool','__proto__',
    ]){
      const response=await resolve({ids:['building-kit/column',id]});
      expect(response.status).toBe(422);
      expect((await response.json() as {code:string}).code).toBe('UNKNOWN_ASSET');
    }
  });

  it('enforces strict request shape and 120-ID maximum',async()=>{
    for(const value of [
      {ids:[]},{ids:[null]},{ids:['']},{ids:['building-kit/column'],url:'https://attacker.invalid'},
      {ids:new Array(121).fill('ctrl-block')},{ids:'building-kit/column'}
    ]){
      const response=await resolve(value);
      expect(response.status).toBe(422);
      expect((await response.json() as {code:string}).code).toBe('INVALID_INPUT');
    }
    const accepted=await resolve({ids:new Array(120).fill('ctrl-block')});
    expect(accepted.status).toBe(200);
    expect((await accepted.json() as {assets:unknown[]}).assets).toHaveLength(1);
  });

  it('requires a valid wallet session and a same-origin JSON POST',async()=>{
    expect((await resolve({ids:['ctrl-seat']},'')).status).toBe(401);
    expect((await resolve({ids:['ctrl-seat']},'ctrl_session=forged')).status).toBe(401);
    expect((await resolve({ids:['ctrl-seat']},walletCookie,{origin:'https://attacker.invalid'})).status).toBe(403);
    expect((await resolve({ids:['ctrl-seat']},walletCookie,{contentType:'text/plain'})).status).toBe(415);
    const guest=await handleApi(new Request(`${origin}/api/plaza/join`,{
      method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Guest resolver'})
    }),['plaza','join']);
    expect(guest.status).toBe(201);
    const guestCookie=guest.headers.get('set-cookie')!.split(';')[0];
    expect((await resolve({ids:['ctrl-seat']},guestCookie)).status).toBe(401);
  });
});
