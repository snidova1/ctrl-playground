import {afterEach,describe,expect,it,vi} from 'vitest';
import {CROPS,createLifeState} from '../../domain/cozy-life';
import {COZY_GUEST_STORAGE,CozyClientError,decodeGuestState,loadGuestState,requestLife,saveGuestAction} from '../../features/cozy-life/client';
afterEach(()=>vi.unstubAllGlobals());
const memory=()=>{const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
describe('parent integration: guest save boundaries',()=>{
 it('persists a genuine plant-water-harvest loop and survives independent reloads',()=>{
  const storage=memory();let state=loadGuestState(storage,1000);
  state=saveGuestAction(storage,state,{type:'plant',bedId:0,cropId:'turnip'},1100);
  state=saveGuestAction(storage,state,{type:'water',bedId:0},1200);
  expect(()=>saveGuestAction(storage,state,{type:'harvest',bedId:0},1300)).toThrow();
  const loaded=loadGuestState(storage,1400);expect(loaded).toEqual(state);
  state=saveGuestAction(storage,loaded,{type:'harvest',bedId:0},1200+CROPS.turnip.growMs);
  expect(state.inventory.turnip).toBe(CROPS.turnip.yield);expect(state.inventory['turnip-seed']).toBe(4);
  expect(decodeGuestState(storage.data.get(COZY_GUEST_STORAGE)!)).toEqual(state);
 });
 it('rejects stale tabs rather than replacing a newer save',()=>{
  const storage=memory(),stale=loadGuestState(storage,1000);
  const current=saveGuestAction(storage,stale,{type:'plant',bedId:0,cropId:'herb'},1100);
  expect(()=>saveGuestAction(storage,stale,{type:'plant',bedId:1,cropId:'herb'},1200)).toThrow('LIFE_EDIT_CONFLICT');
  expect(loadGuestState(storage)).toEqual(current);
 });
 it('does not reset or overwrite damaged saves, and does not report denied writes as success',()=>{
  const storage=memory();storage.data.set(COZY_GUEST_STORAGE,'{"version":99}');
  expect(()=>loadGuestState(storage)).toThrow('STORAGE_INVALID');expect(storage.data.get(COZY_GUEST_STORAGE)).toBe('{"version":99}');
  const denied={getItem:()=>null,setItem:()=>{throw new Error('quota denied');}};
  const initial=createLifeState(1000);
  expect(()=>saveGuestAction(denied,initial,{type:'plant',bedId:0,cropId:'herb'},1100)).toThrow('STORAGE_UNAVAILABLE');
  expect(initial.beds[0].crop).toBeNull();expect(initial.revision).toBe(0);
 });
 it('uses real same-origin session requests and keeps authentication/network failure explicit',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({code:'WALLET_SESSION_REQUIRED',detail:'Sign in'}),{status:401}));vi.stubGlobal('fetch',fetcher);
  await expect(requestLife()).rejects.toMatchObject({code:'UNAUTHORIZED',status:401});
  expect(fetcher.mock.calls[0][0]).toBe('/api/cozy-life');expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'same-origin',cache:'no-store'});
  fetcher.mockRejectedValueOnce(new Error('offline'));
  await expect(requestLife()).rejects.toMatchObject({code:'NETWORK_ERROR'});
  expect(new CozyClientError('NETWORK_ERROR')).toBeInstanceOf(Error);
 });
});
