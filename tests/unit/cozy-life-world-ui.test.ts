import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {createLifeState,type LifeResponse,type LifeState} from '@/domain/cozy-life';
import ActivityPanel from '@/features/cozy-life/activity-panel';
import {useCozyLife} from '@/features/cozy-life/use-cozy-life';
import {COZY_GUEST_STORAGE,decodeGuestState,dispatchLifeState,requestLife,saveGuestAction} from '@/features/cozy-life/client';
import {lifeErrorMessage} from '@/features/cozy-life/presentation';
vi.mock('@/features/cozy-life/use-cozy-life',()=>({useCozyLife:vi.fn()}));
const state=()=>({...createLifeState(1000),inventory:{'flower-pot':1,'garden-soup':2} as const});
function setup(local=true){const s=state(),response:LifeResponse={state:s,profileId:'p',serverNow:1000,offerings:[],servings:[{id:'11111111-1111-4111-8111-111111111111',makerId:'q',makerName:'Tetangga asli',itemId:'garden-soup',createdAt:1000,mine:false}],community:{totals:{},totalItems:0,contributors:0,personal:{}}};const life={state:s,response:local?null:response,local,loading:false,busy:false,error:'',notice:'',now:1000,needsRefresh:false,act:vi.fn().mockResolvedValue(true),refresh:vi.fn(),setNotice:vi.fn()};vi.mocked(useCozyLife).mockReturnValue(life);return life;}
const render=(tab:'garden'|'craft'|'kitchen',context?:{objects:[];canPlace:boolean},visiting=false)=>renderToStaticMarkup(createElement(ActivityPanel,{open:true,onClose:vi.fn(),tab,onTab:vi.fn(),identity:{kind:'guest'},placementContext:context,visiting}));
const button=(html:string,id:string)=>html.match(new RegExp(`<button[^>]*data-testid="${id}"[^>]*>`))?.[0]??'';
afterEach(()=>vi.unstubAllGlobals());
describe('world-connected cozy panel',()=>{
 beforeEach(()=>setup());
 it('keeps callers without placement context safe and blocks visited homes',()=>{
  expect(button(render('garden'),'cozy-place-garden')).toContain('disabled');
  expect(button(render('garden',{objects:[],canPlace:true}),'cozy-place-garden')).not.toContain('disabled');
  expect(button(render('garden',{objects:[],canPlace:true},true),'cozy-place-garden')).toContain('disabled');
 });
 it('exposes real craft inventory placement and an explicit refund control',()=>{
  const life=setup();life.state.decorations=[{id:'life-1',itemId:'flower-pot',x:6,z:4,rotation:0}];
  const html=render('craft',{objects:[],canPlace:true});
  expect(button(html,'cozy-place-flower-pot')).not.toContain('disabled');
  expect(button(html,'cozy-place-wooden-bench')).toContain('disabled');
  expect(button(html,'cozy-remove-craft')).not.toContain('disabled');expect(html).toContain('Simpan ke tas');
 });
 it('allows local meals but never represents guest sharing as server servings',()=>{
  const html=render('kitchen');expect(button(html,'cozy-eat-garden-soup')).not.toContain('disabled');expect(button(html,'cozy-serve-garden-soup')).toContain('disabled');expect(html).toContain('membutuhkan akun');expect(html).not.toContain('Tetangga asli');expect(html).not.toContain('cozy-eat-serving');
 });
 it('renders only actual server servings and account serve controls',()=>{
  setup(false);const html=render('kitchen');expect(button(html,'cozy-serve-garden-soup')).not.toContain('disabled');expect(html).toContain('Tetangga asli');expect(button(html,'cozy-eat-serving')).not.toContain('disabled');
 });
});
describe('additive saves, contract and scene notifications',()=>{
 it('accepts legacy saves and preserves new physical/count fields exactly',()=>{
  const legacy=createLifeState(1000);expect(decodeGuestState(JSON.stringify(legacy))).toEqual(legacy);
  const extended={...legacy,gardenAnchor:{x:6,z:4},decorations:[{id:'life-1',itemId:'flower-pot',x:9,z:4,rotation:0}],mealsEaten:2};expect(decodeGuestState(JSON.stringify(extended))).toEqual(extended);
  expect(()=>decodeGuestState(JSON.stringify({...extended,gardenAnchor:{x:99,z:0}}))).toThrow('STORAGE_INVALID');
 });
 it('persists placement, one refund and a genuine meal debit without fabricating inventory',()=>{
  let raw=JSON.stringify(state());const storage={getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};let s=decodeGuestState(raw);
  s=saveGuestAction(storage,s,{type:'place-garden',x:6,z:4},1100);expect(s.beds.every(b=>b.crop===null)).toBe(true);
  s=saveGuestAction(storage,s,{type:'place-craft',itemId:'flower-pot',x:10,z:4,rotation:0},1200);expect(s.inventory['flower-pot']).toBe(0);const id=s.decorations![0].id;
  s=saveGuestAction(storage,s,{type:'remove-craft',id},1300);expect(s.inventory['flower-pot']).toBe(1);expect(()=>saveGuestAction(storage,s,{type:'remove-craft',id},1400)).toThrow('DECORATION_NOT_FOUND');
  s=saveGuestAction(storage,s,{type:'eat',itemId:'garden-soup'},1500);expect(s.inventory['garden-soup']).toBe(1);expect(s.mealsEaten).toBe(1);expect(decodeGuestState(raw)).toEqual(s);expect(COZY_GUEST_STORAGE).toBe('ctrl-cozy-life-guest-v1');
 });
 it('accepts optional servings but rejects malformed server food data; sends exact serve and claim commands',async()=>{
  const life=setup(false),data=life.response!;const fetcher=vi.fn().mockImplementation(()=>Promise.resolve(Response.json(data)));vi.stubGlobal('fetch',fetcher);
  const serve={revision:0,action:{type:'serve' as const,itemId:'garden-soup' as const}};await requestLife(serve);expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(serve);
  const claim={revision:1,action:{type:'eat-serving' as const,servingId:data.servings![0].id}};await requestLife(claim);expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual(claim);
  fetcher.mockResolvedValueOnce(Response.json({...data,servings:[{...data.servings![0],itemId:'fake-food'}]}));await expect(requestLife()).rejects.toMatchObject({code:'INVALID_RESPONSE'});
 });
 it('dispatches accepted snapshots with explicit local/server provenance and real community data',()=>{
  const target=new EventTarget(),listener=vi.fn();target.addEventListener('cozy-life-state',listener);vi.stubGlobal('window',target);const s=state();dispatchLifeState(s,true);expect(listener.mock.calls[0][0].detail).toEqual({state:s,local:true});
  const community={totals:{herb:2},totalItems:2,contributors:1,personal:{}};dispatchLifeState(s,false,community);expect(listener.mock.calls[1][0].detail).toEqual({state:s,local:false,community});
 });
 it('shows readable placement and serving failures',()=>{expect(lifeErrorMessage({code:'PLACEMENT_BLOCKED'})).toContain('terhalang');expect(lifeErrorMessage({code:'SERVING_UNAVAILABLE'})).toContain('pemain lain');});
});
