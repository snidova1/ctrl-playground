import {readFileSync} from 'node:fs';
import {Children,isValidElement,type ReactElement,type ReactNode} from 'react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {isHabitatTestHost} from '@/features/habitat/test-access';

// Node-only hook/element harness: run the actual HUD and its callbacks, not WebGL.
// Hook slots persist between renders so dependency changes and timer cleanup are real.
const hooks=vi.hoisted(()=>({cursor:0,slots:[] as unknown[],pending:[] as Array<()=>void>,cleanups:new Map<number,()=>void>(),dirty:false,toggle:vi.fn()}));
vi.mock('react',async original=>({
 ...await original<typeof import('react')>(),
 useState:<T,>(initial:T)=>{
  const i=hooks.cursor++;
  if(!(i in hooks.slots))hooks.slots[i]=initial;
  return [hooks.slots[i],(value:T|((old:T)=>T))=>{
   const next=typeof value==='function'?(value as (old:T)=>T)(hooks.slots[i] as T):value;
   if(!Object.is(next,hooks.slots[i])){hooks.slots[i]=next;hooks.dirty=true;}
  }];
 },
 useRef:<T,>(current:T)=>{
  const i=hooks.cursor++;
  if(!(i in hooks.slots))hooks.slots[i]={current};
  return hooks.slots[i];
 },
 useCallback:<T,>(callback:T)=>callback,
 useEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{
  const i=hooks.cursor++,old=hooks.slots[i] as unknown[]|undefined;
  if(!old||deps.some((value,j)=>!Object.is(value,old[j]))){
   hooks.slots[i]=deps;
   hooks.pending.push(()=>{hooks.cleanups.get(i)?.();hooks.cleanups.delete(i);const cleanup=effect();if(cleanup)hooks.cleanups.set(i,cleanup);});
  }
 },
}));
vi.mock('next/dynamic',()=>({default:()=>function MockScene(){return null;}}));
vi.mock('@/features/worldgacha/public-world-audio',()=>({useWorldAmbience:()=>({on:false,toggle:hooks.toggle})}));
import WorldGachaApp from '@/features/worldgacha/app';
import type {NeighborhoodState} from '@/features/worldgacha/neighborhood-state';
import AnalogStick from '@/features/habitat/analog-stick';
import TouchRunButton from '@/features/habitat/touch-run-button';

type Element=ReactElement<Record<string,unknown>>;
let tree:ReactElement;
function render(){
 let count=0;
 do{
  hooks.dirty=false;hooks.cursor=0;tree=WorldGachaApp({playerName:'HUD Tester'});
  for(const effect of hooks.pending.splice(0))effect();
  if(++count>8)throw new Error('HUD hook harness did not settle');
 }while(hooks.dirty);
 return tree;
}
function elements(node:ReactNode=tree):Element[]{
 const result:Element[]=[];
 Children.forEach(node,child=>{if(isValidElement<Record<string,unknown>>(child)){result.push(child);result.push(...elements((child.props.children??null) as ReactNode));}});
 return result;
}
function find(predicate:(element:Element)=>boolean){const result=elements().find(predicate);expect(result).toBeDefined();return result!;}
function byClass(name:string){return elements().filter(e=>e.props.className===name);}
function text(node:ReactNode):string{return Children.toArray(node).map(child=>isValidElement<{children?:ReactNode}>(child)?text(child.props.children):String(child)).join('');}
function button(label:string){return find(e=>e.type==='button'&&(e.props['aria-label']===label||text(e.props.children as ReactNode)===label));}
function click(element:Element){(element.props.onClick as ()=>void)();render();}
function scene(){return find(e=>typeof e.props.onReady==='function');}
function state(){return (scene().props.state as {current:NeighborhoodState}).current;}
function beat(){(scene().props.onBeat as ()=>void)();render();}
async function boot(host='localhost:3000',ready=true){
 Object.assign(window,{location:{host}});
 render();
 // The only async work is the navigation request and response.json().
 for(let i=0;i<6;i++)await Promise.resolve();
 render();
 if(ready){(scene().props.onReady as ()=>void)();render();}
}
const css=readFileSync('features/worldgacha/worldgacha.css','utf8');
beforeEach(()=>{
 vi.useFakeTimers();hooks.cursor=0;hooks.slots.length=0;hooks.pending.length=0;hooks.cleanups.clear();hooks.toggle.mockReset();
 vi.stubGlobal('window',new EventTarget());
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 vi.stubGlobal('localStorage',{getItem:vi.fn(()=>null),setItem:vi.fn()});
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({heights:[0],width:1,depth:1,step:1,minX:0,minZ:0,spawn:{x:0,y:0,z:0},generator:'test'})})));
});
afterEach(()=>{for(const cleanup of hooks.cleanups.values())cleanup();vi.useRealTimers();vi.unstubAllGlobals();});

describe('compact Public World HUD',()=>{
 it('shows a nonblocking title on ready and fades after approximately three seconds',async()=>{
  await boot('localhost',false);
  expect(byClass('wg-location-title')[0].props['data-visible']).toBe(false);
  expect(byClass('wg-message')).toHaveLength(1);
  (scene().props.onReady as ()=>void)();render();
  expect(text(byClass('wg-location-title')[0].props.children as ReactNode)).toBe('Willow Common');
  expect(byClass('wg-location-title')[0].props['data-visible']).toBe(true);
  vi.advanceTimersByTime(2600);render();expect(byClass('wg-location-title')[0].props['data-visible']).toBe(true);
  vi.advanceTimersByTime(100);render();expect(byClass('wg-location-title')[0].props['data-visible']).toBe(false);
  expect(css).toMatch(/\.wg-world \.wg-location-title\{[^}]*background:none[^}]*pointer-events:none[^}]*transition:opacity 300ms ease/);
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');
  expect(css).not.toContain('.wg-top>div:first-child');
 });
 it('restarts the title on district changes, not every beat, and clears stale timers',async()=>{
  await boot();vi.advanceTimersByTime(1800);render();
  state().player.x=39;beat();expect(text(byClass('wg-location-title')[0].props.children as ReactNode)).toBe('Lantern Market');
  vi.advanceTimersByTime(1800);beat();expect(byClass('wg-location-title')[0].props['data-visible']).toBe(true);
  vi.advanceTimersByTime(900);render();expect(byClass('wg-location-title')[0].props['data-visible']).toBe(false);
  state().player.x=-39;beat();expect(text(byClass('wg-location-title')[0].props.children as ReactNode)).toBe('Spring Garden');
  expect(byClass('wg-location-title')[0].props['data-visible']).toBe(true);
  for(const cleanup of hooks.cleanups.values())cleanup();hooks.cleanups.clear();
  expect(vi.getTimerCount()).toBe(0);
 });
 it.each(['ctrl-staging.suhiro211.workers.dev','localhost:3000','127.0.0.1:4173','[::1]:3000','ctrl.example.com','evil.workers.dev','ctrl-staging.suhiro211.workers.dev.evil.com'])('gates the plain Tes Habitat navigation link using the shared host policy: %s',async host=>{
  await boot(host);
  const links=elements().filter(e=>e.type==='a'&&e.props.href==='/habitat-test');
  expect(links).toHaveLength(isHabitatTestHost(host)?1:0);
  if(links.length){expect(text(links[0].props.children as ReactNode)).toBe('Tes Habitat');expect(links[0].props.onClick).toBeUndefined();}
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/worlds/neighborhood/navigation.json');
 });
 it('keeps one compact accessible toolbar, 44px touch targets and working sound',async()=>{
  await boot();const toolbar=find(e=>e.type==='nav'&&e.props['aria-label']==='Public World toolbar');
  expect(elements(toolbar).filter(e=>e.type==='button'||e.type==='a')).toHaveLength(6);
  const activities=button('🌱 Aktivitas');expect(activities.props['aria-haspopup']).toBe('dialog');
  click(activities);expect(find(e=>typeof e.props.onTab==='function'&&'identity' in e.props).props.open).toBe(true);
  expect(button('Toggle world ambience').props['aria-pressed']).toBe(false);
  click(button('Toggle world ambience'));expect(hooks.toggle).toHaveBeenCalledTimes(1);
  expect(css).toMatch(/\.wg-world \.wg-top-actions button,\.wg-top-actions a\{[^}]*height:44px;min-height:44px;min-width:44px/);
  expect(css).toMatch(/\.wg-world \.wg-top-actions \.wg-habitat-test\{[^}]*background:#375a40[^}]*color:#fff8e8/);
  expect(css).toContain('.wg-world a:focus-visible');
 });
 it('has no idle CTA or persistent journal; Places contains journal, districts and NPC routing',async()=>{
  await boot();state().player.x=0;state().player.z=100;beat();
  expect(byClass('wg-interaction')).toHaveLength(0);expect(byClass('wg-journal')).toHaveLength(0);
  click(button('Places'));
  expect(button('Places').props['aria-expanded']).toBe(true);
  expect(byClass('wg-journal')).toHaveLength(1);
  expect(elements(byClass('wg-places')[0]).some(e=>e.props.className==='wg-journal')).toBe(true);
  const travel=vi.fn();window.addEventListener('public-district-travel',travel);
  click(find(e=>e.type==='button'&&text(e.props.children as ReactNode).startsWith('Spring Garden')));
  expect((travel.mock.calls[0][0] as CustomEvent).detail).toBe('spring-garden');
  expect(byClass('wg-places')).toHaveLength(0);
  click(button('Places'));const npc=state().residents[0],go=vi.fn();window.addEventListener('neighborhood-go',go);
  click(button(`Find ${npc.name}`));expect((go.mock.calls[0][0] as CustomEvent).detail).toMatchObject({residentId:npc.id});
  expect(byClass('wg-journal')).toHaveLength(0);
 });
 it('preserves actual nearby NPC interactions, joystick axes, Run and mutually exclusive panels',async()=>{
  await boot();const input=scene().props.input as {current:{x:number;z:number;run:boolean}};
  (find(e=>e.type===AnalogStick).props.onMove as (axes:{x:number;z:number})=>void)({x:.5,z:-.7});
  (find(e=>e.type===TouchRunButton).props.onRun as (run:boolean)=>void)(true);
  expect(input.current).toEqual({x:.5,z:-.7,run:true});
  const npc=state().residents[0];Object.assign(state().player,{x:npc.x,z:npc.z});state().interaction=`seek:${npc.id}`;beat();
  click(button('Interact with nearby person or place'));expect(state().talked).toContain(npc.id);
  expect(text(byClass('wg-dialogue')[0].props.children as ReactNode)).toContain(npc.name);
  click(button('Places'));expect(byClass('wg-mobile-controls')).toHaveLength(0);expect(byClass('wg-interaction')).toHaveLength(0);
  click(button('Controls'));expect(byClass('wg-places')).toHaveLength(0);expect(byClass('wg-controls')).toHaveLength(1);
  expect(button('Controls').props['aria-controls']).toBe('wg-controls');
  click(button('Close controls'));expect(byClass('wg-mobile-controls')).toHaveLength(1);
 });
 it('retains visible loading/render/character failures independently of the transient title',async()=>{
  await boot('localhost',false);vi.advanceTimersByTime(45000);render();
  expect(byClass('wg-message')[0].props.role).toBe('alert');
  expect(text(byClass('wg-message')[0].props.children as ReactNode)).toContain('Loading is taking longer');
  (scene().props.onReady as ()=>void)();render();
  (scene().props.onCharacters as (value:unknown)=>void)({loaded:2,total:7,failed:1});render();
  vi.advanceTimersByTime(3000);render();
  expect(byClass('wg-location-title')[0].props['data-visible']).toBe(false);
  expect(byClass('wg-character-progress')[0].props.role).toBe('alert');
  const retry=vi.fn();window.addEventListener('willow-retry-characters',retry);click(button('Retry characters'));expect(retry).toHaveBeenCalledTimes(1);
  window.dispatchEvent(new CustomEvent('willow-render-error',{detail:'WebGL unavailable'}));render();
  expect(byClass('wg-message')[0].props.role).toBe('alert');expect(text(byClass('wg-message')[0].props.children as ReactNode)).toContain('WebGL unavailable');
 });
});
