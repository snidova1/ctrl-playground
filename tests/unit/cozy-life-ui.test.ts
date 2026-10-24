import {afterEach,describe,expect,it,vi} from 'vitest';
import {createLifeState,type LifeResponse} from '@/domain/cozy-life';
import {COZY_GUEST_STORAGE,decodeGuestState,loadGuestState,requestLife,saveGuestAction,type LifeStorage} from '@/features/cozy-life/client';
import {bedProgress,canMake,inventoryEntries,isLifeTab,lifeErrorMessage} from '@/features/cozy-life/presentation';
import {readFileSync} from 'node:fs';
function storage():LifeStorage{const data=new Map<string,string>();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>{data.set(key,value);}};}
function response():LifeResponse{return {state:createLifeState(1000),serverNow:1000,profileId:'profile-a',offerings:[],community:{totals:{},totalItems:0,contributors:0,personal:{}}};}
afterEach(()=>vi.unstubAllGlobals());
describe('cozy activity client persistence',()=>{
 it('shares guest namespace across surfaces and persists actual seed, water, harvest and ingredient debits',()=>{
  const store=storage();let state=loadGuestState(store,1000);
  state=saveGuestAction(store,state,{type:'plant',bedId:0,cropId:'turnip'},1000);
  expect(state.inventory['turnip-seed']).toBe(3);expect(loadGuestState(store,1000)).toEqual(state);
  state=saveGuestAction(store,state,{type:'water',bedId:0},1100);
  expect(bedProgress(state.beds[0],31100)).toBe(.5);
  expect(()=>saveGuestAction(store,state,{type:'harvest',bedId:0},31100)).toThrow('CROP_NOT_READY');
  state=saveGuestAction(store,state,{type:'harvest',bedId:0},61100);
  expect(state.inventory.turnip).toBe(3);expect(state.inventory['turnip-seed']).toBe(4);
  expect(state.beds[0].crop).toBeNull();expect(COZY_GUEST_STORAGE).toBe('ctrl-cozy-life-guest-v1');
 });
 it('uses the actual fishing window and records found materials rather than fabricated balance changes',()=>{
  const store=storage();let state=loadGuestState(store,1000);state=saveGuestAction(store,state,{type:'cast'},1000);
  expect(()=>saveGuestAction(store,state,{type:'reel'},2000,0)).toThrow('FISH_TOO_EARLY');
  state=saveGuestAction(store,state,{type:'reel'},5000,.7);expect(state.inventory.driftwood).toBe(1);
  expect(loadGuestState(store,5000).stats.fishCaught).toBe(1);
 });
 it('does not report success or mutate source state when browser persistence fails',()=>{
  const store=storage(),state=loadGuestState(store,1000);store.setItem=()=>{throw new Error('denied');};
  expect(()=>saveGuestAction(store,state,{type:'plant',bedId:0,cropId:'herb'},1000)).toThrow('STORAGE_UNAVAILABLE');
  expect(state.revision).toBe(0);expect(state.beds[0].crop).toBeNull();
 });
 it('rejects corrupt, negative, duplicate-bed and unrelated inventory records without overwriting them',()=>{
  const invalid=[{...createLifeState(1),inventory:{turnip:-1}},{...createLifeState(1),inventory:{invented:100}},{...createLifeState(1),beds:Array(4).fill(createLifeState(1).beds[0])}];
  for(const value of invalid)expect(()=>decodeGuestState(JSON.stringify(value))).toThrow('STORAGE_INVALID');
  const store=storage();store.setItem(COZY_GUEST_STORAGE,'{');expect(()=>loadGuestState(store)).toThrow('STORAGE_INVALID');expect(store.getItem(COZY_GUEST_STORAGE)).toBe('{');
 });
 it('detects a stale second tab before overwriting its newer inventory',()=>{
  const store=storage(),one=loadGuestState(store,1000),two=loadGuestState(store,1000);
  const saved=saveGuestAction(store,one,{type:'plant',bedId:0,cropId:'herb'},1000);
  expect(()=>saveGuestAction(store,two,{type:'plant',bedId:1,cropId:'tomato'},1000)).toThrow('LIFE_EDIT_CONFLICT');expect(loadGuestState(store,1000)).toEqual(saved);
 });
 it('sends only server contract revision/action, same-origin credentials, and never client time or identity',async()=>{
  const fetcher=vi.fn().mockResolvedValue(Response.json(response()));vi.stubGlobal('fetch',fetcher);
  await requestLife({revision:0,action:{type:'offer-create',give:{itemId:'turnip',quantity:1},want:{itemId:'herb',quantity:2}}});
  expect(fetcher).toHaveBeenCalledOnce();const [url,options]=fetcher.mock.calls[0];expect(url).toBe('/api/cozy-life');expect(options.credentials).toBe('same-origin');expect(options.method).toBe('POST');
  expect(JSON.parse(options.body)).toEqual({revision:0,action:{type:'offer-create',give:{itemId:'turnip',quantity:1},want:{itemId:'herb',quantity:2}}});
 });
 it('keeps 401/409/network failures as errors without guest writes or automatic retries',async()=>{
  for(const [status,code] of [[401,'WALLET_SESSION_REQUIRED'],[409,'LIFE_EDIT_CONFLICT']] as const){const fetcher=vi.fn().mockResolvedValue(Response.json({code,detail:'Error'},{status}));vi.stubGlobal('fetch',fetcher);await expect(requestLife()).rejects.toMatchObject({code:status===401?'UNAUTHORIZED':code,status});expect(fetcher).toHaveBeenCalledOnce();}
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')));await expect(requestLife()).rejects.toMatchObject({code:'NETWORK_ERROR'});
 });
 it('rejects incomplete successful responses instead of rendering made-up totals or offers',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({state:createLifeState(1000)})));await expect(requestLife()).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 });
 it('derives recipe availability and bag display exclusively from actual inventory',()=>{
  expect(canMake({turnip:2,tomato:1},'garden-soup')).toBe(true);expect(canMake({turnip:2},'garden-soup')).toBe(false);expect(canMake({driftwood:3},'wooden-bench')).toBe(true);
  expect(inventoryEntries({turnip:0,herb:3})).toEqual([['herb',3]]);expect(isLifeTab('fishing')).toBe(true);expect(isLifeTab('fake-reward')).toBe(false);expect(lifeErrorMessage({code:'UNAUTHORIZED'})).toContain('tidak ada perubahan');
 });
});
describe('cozy UI integration ownership and safety',()=>{
 const read=(path:string)=>readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
 it('uses a real modal, capture-phase game input guard, close, focus restoration and reduced motion',()=>{
  const panel=read('features/cozy-life/activity-panel.tsx'),css=read('features/cozy-life/activity-panel.css');expect(panel).toContain('element.showModal()');expect(panel).toContain("window.addEventListener('keydown',key,true)");expect(panel).toContain('event.stopImmediatePropagation()');expect(panel).toContain('previous.focus()');expect(panel).toContain("event.key==='Escape'");expect(panel).toContain('getBoundingClientRect()');expect(css).toContain('prefers-reduced-motion:reduce');
 });
 it('integrates intentional launchers in all clients without adding mandatory plot objects',()=>{
  for(const path of ['features/habitat/habitat-test.tsx','features/habitat/app.tsx','features/worldgacha/app.tsx']){const source=read(path);expect(source).toContain('<ActivityPanel');expect(source).toContain("className='cozy-launch'");expect(source).toContain('useCozyActivity');}
  const sandbox=read('features/habitat/habitat-test.tsx');expect(sandbox).toContain("identity={{kind:'guest'}}");expect(sandbox).toContain('locked={cozy.open}');
  const world=read('features/worldgacha/app.tsx');expect(world).toContain("new Event('neighborhood-stop')");expect(world).toContain('if(cozyActive.current)return');
 });
 it('keys Habitat activity by profile rather than visited world and blocks gardening while visiting',()=>{
  const habitat=read('features/habitat/app.tsx'),panel=read('features/cozy-life/activity-panel.tsx');expect(habitat).toContain("identity={{kind:'account',profileId:state.profile.id}}");expect(habitat).toContain('visiting={!!state.world&&state.world.ownerId!==state.profile.id}');expect(habitat).not.toMatch(/ActivityPanel key=\{state.world/);expect(panel).toContain('disabled||visiting');
 });
 it('shows server offerings/aggregates only for authenticated data and exposes actual escrow commands',()=>{
  const source=read('features/cozy-life/activity-panel.tsx');expect(source).toContain('life.response?.offerings');expect(source).toContain('life.response.community.totalItems');expect(source).toContain("type:'offer-create'");expect(source).toContain("offer.mine?'offer-cancel':'offer-accept'");expect(source).toContain('Hanya browser ini');
  expect(read('features/cozy-life/use-cozy-life.ts')).toContain('!everAccount.current');
 });
});
