import {readFileSync} from 'node:fs';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {isValidElement,type ReactNode,type ReactElement} from 'react';
import type {WorldObject} from '@/features/habitat/types';
import {DEFAULT_HOUSE,getHouseAnchor,getHouseConfig,getHouseEdges,getHouseOpenings,isHouseObject,replaceHouse,setHouseOpening} from '@/features/habitat/modular-house';

// Exercise real component handlers without a DOM, GPU, browser, or added dependencies.
const hooks=vi.hoisted(()=>({values:[] as unknown[],cursor:0}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useState:<T,>(initial:T)=>{
 const i=hooks.cursor++;
 if(!(i in hooks.values))hooks.values[i]=initial;
 return [hooks.values[i],(value:T|((previous:T)=>T))=>{hooks.values[i]=typeof value==='function'?(value as (previous:T)=>T)(hooks.values[i] as T):value;}];
}}));
import HouseWorkshop,{HOUSE_PALETTE,type HouseWorkshopProps} from '@/features/habitat/house-workshop';

type Props={children?:ReactNode;[key:string]:any};
function nodes(node:ReactNode):ReactElement<Props>[]{
 if(Array.isArray(node))return node.flatMap(nodes);
 if(!isValidElement<Props>(node))return [];
 if(typeof node.type==='function')return nodes((node.type as (props:Props)=>ReactNode)(node.props));
 return [node,...nodes(node.props.children)];
}
function find(node:ReactNode,predicate:(element:ReactElement<Props>)=>boolean){const found=nodes(node).find(predicate);expect(found).toBeDefined();return found!;}
function labeled(node:ReactNode,label:string){return find(node,element=>element.props['aria-label']===label);}
function button(node:ReactNode,text:string){return find(node,element=>element.type==='button'&&element.props.children===text);}
function chair(id=crypto.randomUUID()):WorldObject{return {id,assetId:'furniture-kit/chair',name:'Reading chair',x:5,y:0,z:2,rotation:0,scale:1,behavior:'solid',target:''};}
function setup(overrides:Partial<HouseWorkshopProps>={}){
 const furniture=chair();
 const props:HouseWorkshopProps={objects:replaceHouse([furniture],{...DEFAULT_HOUSE,cells:[{x:0,z:0},{x:0,z:1}]}),onChange:vi.fn(),onClose:vi.fn(),onSave:vi.fn(),busy:false,online:true,canUndo:true,canRedo:true,onUndo:vi.fn(),onRedo:vi.fn(),...overrides};
 if(!overrides.onChange)props.onChange=vi.fn((objects:WorldObject[])=>{props.objects=objects;});
 const render=()=>{hooks.cursor=0;return HouseWorkshop(props);};
 const tab=(text:string)=>{button(render(),text).props.onClick();return render();};
 const edge=(edgeId:string)=>{find(render(),element=>element.props['data-edge-id']===edgeId).props.onClick();return render();};
 return {props,render,tab,edge,furniture};
}
beforeEach(()=>{hooks.values=[];hooks.cursor=0;});

describe('owner visual house workshop — real model callbacks',()=>{
 it('renders a true nine-cell top view and only model exterior edges, never numeric XYZ forms',()=>{
  const {props,render}=setup();const node=render();
  expect(nodes(node).filter(element=>element.props.className?.includes('hb-house-cell')&&element.props.role==='button')).toHaveLength(9);
  expect(nodes(node).filter(element=>element.props['data-edge-id']).map(element=>element.props['data-edge-id'])).toEqual(getHouseEdges(getHouseConfig(props.objects)).map(edge=>edge.id));
  expect(nodes(node).some(element=>element.type==='input'||element.type==='select')).toBe(false);
  expect(labeled(node,'Add room east').props).toMatchObject({role:'button',tabIndex:0,'aria-disabled':false});
  expect(nodes(node).some(element=>element.props['data-edge-id']==='0,0,south')).toBe(false);
 });
 it('adds and removes the selected actual room while keeping furniture and the shared parent history authoritative',()=>{
  const {props,render,furniture}=setup();const before=getHouseConfig(props.objects);
  labeled(render(),'Add room east').props.onClick();
  expect(getHouseConfig(props.objects).cells).toEqual([...before.cells,{x:1,z:0}]);
  expect(props.objects.find(object=>object.id===furniture.id)).toBe(furniture);
  expect(props.onChange).toHaveBeenCalledOnce();
  labeled(render(),'Remove room east').props.onClick();
  expect(getHouseConfig(props.objects).cells).toEqual(before.cells);
  expect(props.onChange).toHaveBeenCalledTimes(2);
 });
 it('rejects disconnected additions with a visible actionable error and no parent mutation',()=>{
  const {props,render}=setup();const before=props.objects;
  labeled(render(),'Add room northwest').props.onClick();
  expect(find(render(),element=>element.props.role==='alert').props.children).toMatch(/menempel/);
  expect(props.onChange).not.toHaveBeenCalled();expect(props.objects).toBe(before);
 });
 it('rejects removal of a connecting room and of the final room, rather than silently changing the footprint',()=>{
  const connected=setup({objects:replaceHouse([],{...DEFAULT_HOUSE,cells:[{x:-1,z:0},{x:0,z:0},{x:1,z:0}]})});
  labeled(connected.render(),'Remove room center').props.onClick();
  expect(find(connected.render(),element=>element.props.role==='alert').props.children).toMatch(/menghubungkan/);
  expect(connected.props.onChange).not.toHaveBeenCalled();
  hooks.values=[];
  const single=setup({objects:replaceHouse([],{...DEFAULT_HOUSE,cells:[{x:0,z:0}]})});
  labeled(single.render(),'Remove room center').props.onClick();
  expect(find(single.render(),element=>element.props.role==='alert').props.children).toMatch(/setidaknya satu ruang/);
  expect(single.props.onChange).not.toHaveBeenCalled();
 });
 it('makes the room SVG keyboard-operable with Enter and Space, without triggering on unrelated keys',()=>{
  const {props,render}=setup();const preventDefault=vi.fn();
  labeled(render(),'Add room east').props.onKeyDown({key:'ArrowRight',preventDefault});expect(props.onChange).not.toHaveBeenCalled();
  labeled(render(),'Add room east').props.onKeyDown({key:'Enter',preventDefault});expect(getHouseConfig(props.objects).cells).toContainEqual({x:1,z:0});
  labeled(render(),'Remove room east').props.onKeyDown({key:' ',preventDefault});expect(getHouseConfig(props.objects).cells).not.toContainEqual({x:1,z:0});
  expect(preventDefault).toHaveBeenCalledTimes(2);
 });
 it('selects a modeled edge in the SVG and places door/window/solid wall on exactly that edge',()=>{
  const {props,render,tab,edge,furniture}=setup();tab('Pintu & jendela');
  const target=getHouseEdges(getHouseConfig(props.objects)).find(candidate=>!getHouseOpenings(props.objects).some(opening=>opening.edgeId===candidate.id))!;
  edge(target.id);expect(find(render(),element=>element.props['data-edge-id']===target.id).props['aria-pressed']).toBe(true);
  const shape=find(render(),element=>element.props['data-edge-id']===target.id);
  const line=find(shape,element=>element.props.className==='hb-house-edge-line');
  expect([line.props.x1,line.props.y1,line.props.x2,line.props.y2].every(Number.isFinite)).toBe(true);
  for(const [label,kind] of [['Place door','door'],['Place window','window'],['Solid wall','wall']] as const){
   labeled(render(),label).props.onClick();
   expect(getHouseOpenings(props.objects).find(opening=>opening.edgeId===target.id)?.kind??'wall').toBe(kind);
   expect(find(render(),element=>element.props['data-edge-id']===target.id).props['data-kind']).toBe(kind);
  }
  expect(props.onChange).toHaveBeenCalledTimes(3);
  expect(props.objects.find(object=>object.id===furniture.id)).toBe(furniture);
 });
 it('keeps the last accessible door and blocks room changes that would orphan it',()=>{
  const {props,render,tab,edge}=setup();tab('Pintu & jendela');
  const door=getHouseOpenings(props.objects).find(opening=>opening.kind==='door')!;edge(door.edgeId);
  expect(labeled(render(),'Place window').props.disabled).toBe(true);
  expect(labeled(render(),'Solid wall').props.disabled).toBe(true);
  labeled(render(),'Solid wall').props.onClick();expect(props.onChange).not.toHaveBeenCalled();
  tab('Ruang');labeled(render(),'Remove room south').props.onClick();
  expect(find(render(),element=>element.props.role==='alert').props.children).toMatch(/pintu terakhir/);
  expect(props.onChange).not.toHaveBeenCalled();
 });
 it('allows moving an entrance by placing another door first, then filling the old entrance',()=>{
  const {props,render,tab,edge}=setup();tab('Pintu & jendela');
  const original=getHouseOpenings(props.objects).find(opening=>opening.kind==='door')!;
  edge('0,0,north');labeled(render(),'Place door').props.onClick();
  expect(getHouseOpenings(props.objects).filter(opening=>opening.kind==='door')).toHaveLength(2);
  edge(original.edgeId);expect(labeled(render(),'Solid wall').props.disabled).toBe(false);labeled(render(),'Solid wall').props.onClick();
  expect(getHouseOpenings(props.objects).filter(opening=>opening.kind==='door').map(opening=>opening.edgeId)).toEqual(['0,0,north']);
 });
 it('reconciles a stale edge selection against actual exterior edges after parent undo or resize',()=>{
  const {props,render,tab,edge}=setup();tab('Pintu & jendela');edge('0,0,north');
  props.objects=replaceHouse(props.objects,{...getHouseConfig(props.objects),cells:[{x:0,z:-1},{x:0,z:0},{x:0,z:1}]});
  const actual=getHouseEdges(getHouseConfig(props.objects))[0];
  expect(nodes(render()).some(element=>element.props['data-edge-id']==='0,0,north')).toBe(false);
  labeled(render(),'Place door').props.onClick();
  expect(getHouseOpenings(props.objects).some(opening=>opening.edgeId===actual.id&&opening.kind==='door')).toBe(true);
 });
 it('persists roof shapes and real wall/floor finishes through replaceHouse, not a separate draft store',()=>{
  const {props,render,tab,furniture}=setup();tab('Material');
  for(const [label,key,value] of [
   ['House roof flat','roofStyle','flat'],['House roof gable','roofStyle','gable'],
   ['House wall finish timber','wallFinish','timber'],['House wall finish plaster','wallFinish','plaster'],
   ['House floor finish tile','floorFinish','tile'],['House floor finish wood','floorFinish','wood'],
  ] as const){labeled(render(),label).props.onClick();expect(getHouseConfig(props.objects)[key]).toBe(value);}
  expect(props.onChange).toHaveBeenCalledTimes(6);
  expect(props.objects.find(object=>object.id===furniture.id)).toBe(furniture);
  expect(getHouseAnchor(props.objects)?.house).toEqual(getHouseConfig(props.objects));
 });
 it('paints all three surfaces with the exact visible warm hex swatches and preserves other materials',()=>{
  const {props,render,tab}=setup();tab('Material');
  for(const surface of ['wall','roof','floor'] as const){
   const color=HOUSE_PALETTE[surface==='wall'?2:surface==='roof'?3:4];
   const swatch=labeled(render(),`House ${surface} color ${color.name}`);
   expect(find(swatch,element=>element.type==='span').props.style.backgroundColor).toBe(color.hex);
   swatch.props.onClick();expect(getHouseConfig(props.objects)[`${surface}Color`]).toBe(color.hex);
   expect(labeled(render(),`House ${surface} color ${color.name}`).props['aria-pressed']).toBe(true);
  }
  expect(getHouseConfig(props.objects).roofStyle).toBe(DEFAULT_HOUSE.roofStyle);
  expect(HOUSE_PALETTE.every(color=>/^#[\da-f]{6}$/.test(color.hex))).toBe(true);
 });
 it('upgrades a legacy fixed cottage only via real model changes, preserving existing furniture',()=>{
  const existing=chair();const {props,render,tab}=setup({objects:[existing]});tab('Material');
  labeled(render(),'House roof flat').props.onClick();
  expect(getHouseAnchor(props.objects)).toBeDefined();expect(getHouseConfig(props.objects).roofStyle).toBe('flat');
  expect(props.objects.find(object=>object.id===existing.id)).toBe(existing);
  expect(getHouseOpenings(props.objects).some(opening=>opening.kind==='door'&&opening.object)).toBe(true);
 });
 it('shows a 120-object warning and does not emit an over-budget model result',()=>{
  const {props,render}=setup({objects:Array.from({length:120},()=>chair())});
  expect(find(render(),element=>element.props.className==='hb-house-feedback').props.children).toMatch(/120/);
  labeled(render(),'Add room north').props.onClick();
  expect(find(render(),element=>element.props.role==='alert').props.children).toMatch(/Maksimal 120 objek/);
  expect(props.onChange).not.toHaveBeenCalled();expect(props.objects).toHaveLength(120);
 });
 it('still permits non-growing repaint at the 120-object limit',()=>{
  const house=replaceHouse([],DEFAULT_HOUSE);const filler=Array.from({length:120-house.length},()=>chair());
  const {props,render,tab}=setup({objects:[...filler,...house]});tab('Material');labeled(render(),'House wall color Moss').props.onClick();
  expect(props.objects).toHaveLength(120);expect(getHouseConfig(props.objects).wallColor).toBe('#65775a');
  expect(props.objects.filter(object=>!isHouseObject(object))).toEqual(filler);expect(props.onChange).toHaveBeenCalledOnce();
 });
 it.each([{busy:true},{online:false}])('guards actual edit/history/save handlers as well as disabled controls: %j',overrides=>{
  const {props,render,tab}=setup(overrides);let node=render();
  expect(labeled(node,'Add room east').props['aria-disabled']).toBe(true);labeled(node,'Add room east').props.onClick();
  expect(labeled(node,'Save house').props.disabled).toBe(true);labeled(node,'Save house').props.onClick();
  for(const label of ['Undo house change','Redo house change']){expect(labeled(node,label).props.disabled).toBe(true);labeled(node,label).props.onClick();}
  node=tab('Material');const control=labeled(node,'House wall color Moss');expect(control.props.disabled).toBe(true);control.props.onClick();
  expect(props.onChange).not.toHaveBeenCalled();expect(props.onSave).not.toHaveBeenCalled();expect(props.onUndo).not.toHaveBeenCalled();expect(props.onRedo).not.toHaveBeenCalled();
  if(overrides.online===false){labeled(node,'Cancel house changes').props.onClick();expect(props.onClose).toHaveBeenCalledOnce();}
  if(overrides.busy){labeled(node,'Cancel house changes').props.onClick();expect(props.onClose).not.toHaveBeenCalled();}
 });
 it('uses the parent save/cancel/history callbacks exactly once, and respects unavailable history',()=>{
  const {props,render}=setup();let node=render();
  for(const label of ['Undo house change','Redo house change','Save house','Cancel house changes'])labeled(node,label).props.onClick();
  expect(props.onUndo).toHaveBeenCalledOnce();expect(props.onRedo).toHaveBeenCalledOnce();expect(props.onSave).toHaveBeenCalledOnce();expect(props.onClose).toHaveBeenCalledOnce();expect(props.onChange).not.toHaveBeenCalled();
  props.canUndo=false;props.canRedo=false;node=render();labeled(node,'Undo house change').props.onClick();labeled(node,'Redo house change').props.onClick();
  expect(props.onUndo).toHaveBeenCalledOnce();expect(props.onRedo).toHaveBeenCalledOnce();
 });
 it('keeps a fixed footer outside the scroll body and a 340px desktop dock / capped half-height mobile sheet',()=>{
  const {render}=setup();const node=render();const body=find(node,element=>element.props.className==='hb-house-body');
  expect(nodes(body).some(element=>element.type==='footer')).toBe(false);
  const footer=find(node,element=>element.type==='footer');
  for(const label of ['Undo house change','Redo house change','Save house','Cancel house changes'])expect(labeled(footer,label)).toBeDefined();
  const css=readFileSync(new URL('../../features/habitat/house-workshop.css',import.meta.url),'utf8');
  expect(css).toMatch(/width:340px/);expect(css).toMatch(/height:50dvh;max-height:50dvh/);expect(css).toMatch(/\.hb-house-footer\{[^}]*flex-shrink:0/);
  expect(css).toContain('env(safe-area-inset-bottom,0px)');
 });
});
