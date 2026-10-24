import {afterEach,describe,expect,it,vi} from 'vitest';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {handleApi} from '@/server/api';
import {batch,database,exec,one,statement} from '@/db';
import {createSession} from '@/server/wallet/auth';
import {CROPS,FISHING,type BarterAction,type Inventory,type LifeAction,type LifeResponse,type LifeState} from '@/domain/cozy-life';
const origin='http://localhost:3000';
function call(cookie='',data?:unknown,headers:Record<string,string>={},path='cozy-life',method=data===undefined?'GET':'POST'){
  return handleApi(new Request(`${origin}/api/${path}`,{method,headers:{Cookie:cookie,...(data===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...headers},...(data===undefined?{}:{body:JSON.stringify(data)})}),path.split('/'));
}
async function read(cookie:string):Promise<LifeResponse>{const r=await call(cookie);expect(r.status,await r.clone().text()).toBe(200);return r.json() as Promise<LifeResponse>;}
async function act(cookie:string,s:LifeResponse,action:LifeAction|BarterAction):Promise<LifeResponse>{const r=await call(cookie,{revision:s.state.revision,action});expect(r.status,await r.clone().text()).toBe(200);return r.json() as Promise<LifeResponse>;}
async function player(){
  const account=privateKeyToAccount(generatePrivateKey()),ip=crypto.randomUUID();
  const n=await(await call('',{address:account.address},{'cf-connecting-ip':ip},'auth/nonce')).json() as {nonce:string;message:string};
  const auth=await call('',{address:account.address,nonce:n.nonce,signature:await account.signMessage({message:n.message})},{'cf-connecting-ip':ip},'auth/verify');
  expect(auth.status).toBe(200);const cookie=auth.headers.get('set-cookie')!.split(';')[0];return {cookie,id:`wallet-${account.address.toLowerCase()}`,initial:await read(cookie)};
}
// Explicit test-only DB fixture for recipe/trade balances; HTTP never accepts an inventory.
async function inventory(p:{id:string;cookie:string},items:Inventory){
  const current=await read(p.cookie);current.state.inventory=items;
  await exec('UPDATE cozy_life_states SET state=? WHERE profile_id=?',JSON.stringify(current.state),p.id);return read(p.cookie);
}
afterEach(()=>vi.restoreAllMocks());
describe('cozy life real signed API and local D1 SQL integration',()=>{
  it('rejects anonymous, demo and expired sessions without creating progression',async()=>{
    const before=await one<{n:number}>('SELECT COUNT(*) AS n FROM cozy_life_states');
    expect((await call()).status).toBe(401);expect((await call('',{revision:0,action:{type:'cast'}})).status).toBe(401);
    const id=`life-demo-${crypto.randomUUID()}`;await exec('INSERT INTO users(id,demo,created_at) VALUES(?,1,?)',id,new Date().toISOString());
    const cookie=(await createSession(id,false)).split(';')[0];expect((await call(cookie)).status).toBe(401);
    const p=await player();await exec('UPDATE sessions SET expires_at=0 WHERE user_id=?',p.id);expect((await call(p.cookie)).status).toBe(401);
    const after=await one<{n:number}>('SELECT COUNT(*) AS n FROM cozy_life_states');expect(after!.n).toBe(before!.n+1);
  });
  it('returns real coherent empty community/offers and persists starter inventory once',async()=>{
    const p=await player();expect(p.initial.state.revision).toBe(0);expect(p.initial.state.inventory['turnip-seed']).toBe(4);
    expect(p.initial.offerings).toEqual([]);expect(p.initial.community.personal).toEqual({});expect(p.initial.profileId).toBe(p.id);
    const next=await act(p.cookie,p.initial,{type:'plant',bedId:0,cropId:'turnip'});
    expect(next.state.inventory['turnip-seed']).toBe(3);expect((await read(p.cookie)).state).toEqual(next.state);
  });
  it('server time gates watering/growth/harvest and never credits premature crops',async()=>{
    const p=await player();let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);
    let s=await act(p.cookie,p.initial,{type:'plant',bedId:0,cropId:'turnip'});
    expect((await call(p.cookie,{revision:s.state.revision,action:{type:'harvest',bedId:0}})).status).toBe(422);
    now+=200;s=await act(p.cookie,s,{type:'water',bedId:0});expect(s.state.beds[0].readyAt).toBe(now+CROPS.turnip.growMs);
    now+=CROPS.turnip.growMs-1;expect((await call(p.cookie,{revision:s.state.revision,action:{type:'harvest',bedId:0}})).status).toBe(422);
    now++;s=await act(p.cookie,s,{type:'harvest',bedId:0});expect(s.state.inventory.turnip).toBe(3);expect(s.state.inventory['turnip-seed']).toBe(4);
  });
  it('server chooses actual fishing loot only within bite window; expired cast gives nothing',async()=>{
    const p=await player();let now=Date.now();vi.spyOn(Date,'now').mockImplementation(()=>now);
    let s=await act(p.cookie,p.initial,{type:'cast'});
    expect((await call(p.cookie,{revision:s.state.revision,action:{type:'reel'}})).status).toBe(422);
    now=s.state.fishing!.biteAt;s=await act(p.cookie,s,{type:'reel'});
    expect(FISHING.catches.reduce((n,id)=>n+(s.state.inventory[id]??0),0)).toBe(1);expect(s.state.stats.fishCaught).toBe(1);
    now=s.state.nextCastAt;s=await act(p.cookie,s,{type:'cast'});now=s.state.fishing!.expiresAt+1;
    const before=s.state.inventory;s=await act(p.cookie,s,{type:'reel'});expect(s.state.inventory).toEqual(before);expect(s.state.fishing).toBeNull();
  });
  it('enforces origin/JSON, strict envelope/action fields and UTF-8 streaming body budget',async()=>{
    const p=await player(),payload={revision:0,action:{type:'cast'}};
    expect((await call(p.cookie,payload,{Origin:'https://evil.invalid'})).status).toBe(403);
    expect((await call(p.cookie,payload,{'Content-Type':'text/plain'})).status).toBe(415);
    for(const data of [{...payload,now:9999999999999},{...payload,inventory:{perch:999}},{...payload,action:{type:'reel',random:0}},{...payload,action:{type:'plant',bedId:0,cropId:'herb',now:123}},{...payload,action:{type:'offer-create',give:{itemId:'token',quantity:1},want:{itemId:'carp',quantity:1}}}])expect((await call(p.cookie,data)).status).toBe(422);
    const malformed=new Request(`${origin}/api/cozy-life`,{method:'POST',headers:{Cookie:p.cookie,Origin:origin,'Content-Type':'application/json'},body:'{no'});
    expect((await handleApi(malformed,['cozy-life'])).status).toBe(400);
    const big=new Request(`${origin}/api/cozy-life`,{method:'POST',headers:{Cookie:p.cookie,Origin:origin,'Content-Type':'application/json','Content-Length':'1'},body:JSON.stringify('🌱'.repeat(3000))});
    expect((await handleApi(big,['cozy-life'])).status).toBe(413);expect((await read(p.cookie)).state.revision).toBe(0);
  });
  it('rejects stale revision and permits only one of concurrent CAS actions',async()=>{
    const p=await player(),payload={revision:0,action:{type:'plant',bedId:0,cropId:'herb'}};
    const results=await Promise.all([call(p.cookie,payload),call(p.cookie,payload)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
    const s=await read(p.cookie);expect(s.state.revision).toBe(1);expect(s.state.inventory['herb-seed']).toBe(3);
    expect((await call(p.cookie,{revision:0,action:{type:'cast'}})).status).toBe(409);
  });
  it('cooking/crafting debit recipes in SQL state; failures cannot partially consume',async()=>{
    const p=await player();let s=await inventory(p,{turnip:2,tomato:1,clay:2,herb:1});
    s=await act(p.cookie,s,{type:'cook',recipeId:'garden-soup'});expect(s.state.inventory['garden-soup']).toBe(1);expect(s.state.inventory.turnip??0).toBe(0);
    s=await act(p.cookie,s,{type:'craft',recipeId:'flower-pot'});expect(s.state.inventory['flower-pot']).toBe(1);expect(s.state.crafted['flower-pot']).toBe(1);
    expect((await call(p.cookie,{revision:s.state.revision,action:{type:'craft',recipeId:'flower-pot'}})).status).toBe(422);expect((await read(p.cookie)).state).toEqual(s.state);
  });
  it('communal contributions atomically debit personal inventory and sum actual other players globally',async()=>{
    const a=await player(),b=await player();let sa=await inventory(a,{turnip:5}),sb=await inventory(b,{turnip:4});
    const baseline=sa.community.totalItems,contributors=sa.community.contributors,turnips=sa.community.totals.turnip??0;
    sa=await act(a.cookie,sa,{type:'contribute',itemId:'turnip',quantity:3});sb=await act(b.cookie,sb,{type:'contribute',itemId:'turnip',quantity:2});
    const latest=await read(a.cookie);expect(latest.community.totalItems).toBe(baseline+5);expect(latest.community.totals.turnip).toBe(turnips+5);
    expect(latest.community.contributors).toBe(contributors+2);expect(latest.community.personal.turnip).toBe(3);expect(sb.community.personal.turnip).toBe(2);
    expect(latest.state.inventory.turnip).toBe(2);expect((await call(a.cookie,{revision:0,action:{type:'contribute',itemId:'turnip',quantity:1}})).status).toBe(409);
    expect((await read(a.cookie)).community.totalItems).toBe(baseline+5);
  });
  it('escrows a real offer, rejects self-accept/non-owner cancel and refunds exactly once',async()=>{
    const maker=await player(),other=await player();const s=await act(maker.cookie,maker.initial,{type:'offer-create',give:{itemId:'turnip-seed',quantity:2},want:{itemId:'herb-seed',quantity:1}});
    const offer=s.offerings.find(o=>o.makerId===maker.id)!;expect(offer.mine).toBe(true);expect(s.state.inventory['turnip-seed']).toBe(2);
    const peer=await read(other.cookie);expect(peer.offerings.find(o=>o.id===offer.id)?.mine).toBe(false);
    expect((await call(maker.cookie,{revision:s.state.revision,action:{type:'offer-accept',offerId:offer.id}})).status).toBe(403);
    expect((await call(other.cookie,{revision:0,action:{type:'offer-cancel',offerId:offer.id}})).status).toBe(403);
    const canceled=await act(maker.cookie,s,{type:'offer-cancel',offerId:offer.id});expect(canceled.state.inventory['turnip-seed']).toBe(4);
    expect((await call(maker.cookie,{revision:canceled.state.revision,action:{type:'offer-cancel',offerId:offer.id}})).status).toBe(409);
    expect((await read(maker.cookie)).state.inventory['turnip-seed']).toBe(4);
  });
  it('atomically exchanges two actual players inventories and increments both revisions',async()=>{
    const a=await player(),b=await player();let sa=await act(a.cookie,a.initial,{type:'offer-create',give:{itemId:'turnip-seed',quantity:2},want:{itemId:'herb-seed',quantity:3}});
    const offer=sa.offerings.find(o=>o.makerId===a.id)!;
    const sb=await act(b.cookie,b.initial,{type:'offer-accept',offerId:offer.id});sa=await read(a.cookie);
    expect(sa.state.inventory).toMatchObject({'turnip-seed':2,'herb-seed':7});expect(sa.state.revision).toBe(2);
    expect(sb.state.inventory).toMatchObject({'turnip-seed':6,'herb-seed':1});expect(sb.state.revision).toBe(1);
    expect(sb.offerings.find(o=>o.id===offer.id)).toBeUndefined();expect(sa.offerings.find(o=>o.id===offer.id)).toBeUndefined();
    expect((await call(b.cookie,{revision:1,action:{type:'offer-accept',offerId:offer.id}})).status).toBe(409);
    expect((await one<{status:string;taker_id:string}>('SELECT status,taker_id FROM cozy_life_offers WHERE id=?',offer.id))).toEqual({status:'accepted',taker_id:b.id});
  });
  it('insufficient accept inventory leaves both balances and escrow untouched',async()=>{
    const a=await player(),b=await player();const sa=await act(a.cookie,a.initial,{type:'offer-create',give:{itemId:'turnip-seed',quantity:1},want:{itemId:'perch',quantity:1}}),id=sa.offerings.find(o=>o.makerId===a.id)!.id;
    expect((await call(b.cookie,{revision:0,action:{type:'offer-accept',offerId:id}})).status).toBe(422);
    expect((await read(a.cookie)).state).toEqual(sa.state);expect((await read(b.cookie)).state).toEqual(b.initial.state);
    expect((await one<{status:string}>('SELECT status FROM cozy_life_offers WHERE id=?',id))?.status).toBe('open');
    await act(a.cookie,sa,{type:'offer-cancel',offerId:id});
  });
  it('concurrent takers have one winner and never duplicate escrow',async()=>{
    const a=await player(),b=await player(),c=await player();const sa=await act(a.cookie,a.initial,{type:'offer-create',give:{itemId:'turnip-seed',quantity:2},want:{itemId:'herb-seed',quantity:1}}),id=sa.offerings.find(o=>o.makerId===a.id)!.id;
    const result=await Promise.all([call(b.cookie,{revision:0,action:{type:'offer-accept',offerId:id}}),call(c.cookie,{revision:0,action:{type:'offer-accept',offerId:id}})]);
    expect(result.map(r=>r.status).sort()).toEqual([200,409]);
    const states=await Promise.all([read(a.cookie),read(b.cookie),read(c.cookie)]);
    expect(states.reduce((n,s)=>n+(s.state.inventory['turnip-seed']??0),0)).toBe(12);expect(states.reduce((n,s)=>n+(s.state.inventory['herb-seed']??0),0)).toBe(12);
    expect(states[0].state.revision).toBe(2);expect(states[1].state.revision+states[2].state.revision).toBe(1);
  });
  it('a forced maker CAS failure rolls back claimed offer AND both inventories in the actual service',async()=>{
    const a=await player(),b=await player();const sa=await act(a.cookie,a.initial,{type:'offer-create',give:{itemId:'tomato-seed',quantity:2},want:{itemId:'herb-seed',quantity:1}}),id=sa.offerings.find(o=>o.makerId===a.id)!.id;
    // SQLite test-only trigger forces zero affected rows at the maker CAS, AFTER offer claim.
    await database().exec(`CREATE TRIGGER cozy_test_cas_failure BEFORE UPDATE ON cozy_life_states WHEN OLD.profile_id='${a.id}' BEGIN SELECT RAISE(IGNORE); END;`);
    try{const response=await call(b.cookie,{revision:0,action:{type:'offer-accept',offerId:id}});expect(response.status,await response.clone().text()).toBe(409);
      expect((await read(a.cookie)).state).toEqual(sa.state);expect((await read(b.cookie)).state).toEqual(b.initial.state);
      expect((await one<{status:string}>('SELECT status FROM cozy_life_offers WHERE id=?',id))?.status).toBe('open');
    }finally{await database().exec('DROP TRIGGER cozy_test_cas_failure');}
    await act(a.cookie,sa,{type:'offer-cancel',offerId:id});
  });
  it('accept versus cancel race conserves inventories and settles only once',async()=>{
    const a=await player(),b=await player();const sa=await act(a.cookie,a.initial,{type:'offer-create',give:{itemId:'tomato-seed',quantity:2},want:{itemId:'herb-seed',quantity:1}}),id=sa.offerings.find(o=>o.makerId===a.id)!.id;
    const r=await Promise.all([call(a.cookie,{revision:1,action:{type:'offer-cancel',offerId:id}}),call(b.cookie,{revision:0,action:{type:'offer-accept',offerId:id}})]);
    expect(r.map(x=>x.status).sort()).toEqual([200,409]);const aa=await read(a.cookie),bb=await read(b.cookie);
    expect((aa.state.inventory['tomato-seed']??0)+(bb.state.inventory['tomato-seed']??0)).toBe(8);expect((aa.state.inventory['herb-seed']??0)+(bb.state.inventory['herb-seed']??0)).toBe(8);
  });
  it('named SQL guard actually rolls back earlier writes when a zero-row CAS fails',async()=>{
    const p=await player();await expect(batch([
      statement("UPDATE cozy_life_states SET updated_at=123 WHERE profile_id=?",p.id),
      statement('UPDATE cozy_life_states SET updated_at=456 WHERE profile_id=? AND revision=99',p.id),
      statement('INSERT OR REPLACE INTO cozy_life_atomic_guard(id) VALUES(CASE WHEN changes()=1 THEN 1 ELSE 0 END)'),
    ])).rejects.toThrow('cozy_life_cas_success');
    const row=await one<{updated_at:number}>('SELECT updated_at FROM cozy_life_states WHERE profile_id=?',p.id);expect(row?.updated_at).toBe(p.initial.state.updatedAt);
  });
  it('rate limits persistent writes without advancing revision',async()=>{
    const p=await player();for(let i=0;i<40;i++)expect((await call(p.cookie,{revision:99,action:{type:'cast'}})).status).toBe(409);
    const denied=await call(p.cookie,{revision:0,action:{type:'cast'}});expect(denied.status).toBe(429);expect((await denied.json() as {code:string}).code).toBe('TOO_MANY_OPERATIONS');
    expect((await read(p.cookie)).state.revision).toBe(0);
  });
});
