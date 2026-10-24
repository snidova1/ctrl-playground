import {createElement,isValidElement,type ReactElement,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import BuildInspector,{type BuildInspectorProps} from '@/features/habitat/build-inspector';
import {getBuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject} from '@/features/habitat/types';

type Props={children?:ReactNode;onClick?:()=>void;onChange?:(event:{target:{value:string}})=>void;[key:string]:unknown};
function nodes(node:ReactNode):ReactElement<Props>[] {
 if(Array.isArray(node))return node.flatMap(nodes);
 return isValidElement<Props>(node)?[node,...nodes(node.props.children)]:[];
}
function find(node:ReactNode,predicate:(element:ReactElement<Props>)=>boolean) {
 const found=nodes(node).find(predicate);expect(found).toBeDefined();return found!;
}
const piece=(values:Partial<WorldObject>={}):WorldObject=>({id:'piece-1',assetId:'furniture-kit/desk',name:'Writing desk',x:2,y:1,z:3,rotation:0,scale:1,behavior:'solid',target:'',...values});
function inspector(overrides:Partial<BuildInspectorProps>={}) {
 const props={objects:[piece()],selectedId:'piece-1',worlds:[],onSelect:vi.fn(),onPatch:vi.fn(),onDuplicate:vi.fn(),onDelete:vi.fn(),onBrowse:vi.fn(),onMove:vi.fn(),...overrides};
 return {props,node:BuildInspector(props)};
}
const button=(node:ReactNode,label:string)=>find(node,e=>e.type==='button'&&e.props['aria-label']===label);
const change=(element:ReactElement<Props>,value:string)=>element.props.onChange!({target:{value}});

describe('furniture inspector visual controls',()=>{
 it.each([0,90,180,270])('applies the %i° direction preset through the real patch callback',degree=>{
  const {node,props}=inspector();button(node,`Face ${degree} degrees`).props.onClick!();
  const rotation=vi.mocked(props.onPatch).mock.calls[0][0].rotation as number;
  expect(Math.sin(rotation)).toBeCloseTo(Math.sin(degree*Math.PI/180));
  expect(Math.cos(rotation)).toBeCloseTo(Math.cos(degree*Math.PI/180));
  expect(Math.abs(rotation)).toBeLessThanOrEqual(Math.PI);
  expect(vi.mocked(props.onPatch).mock.calls[0][0]).toEqual({rotation});
 });
 it('recognizes equivalent persisted rotations and displays a normalized fine-tune range',()=>{
  const {node}=inspector({objects:[piece({rotation:Math.PI*2+Math.PI/2})]});
  expect(button(node,'Face 90 degrees').props['aria-pressed']).toBe(true);
  expect(button(node,'Face 0 degrees').props['aria-pressed']).toBe(false);
  expect(find(node,e=>e.type==='input'&&e.props['aria-label']==='rotation').props.value).toBeCloseTo(Math.PI/2);
 });
 it.each([['Turn left 45 degrees',1],['Turn right 45 degrees',-1]] as const)('nudges %s without moving or resizing the selected object', (label,sign)=>{
  const original=piece({rotation:Math.PI*2});const {node,props}=inspector({objects:[original]});
  button(node,label).props.onClick!();expect(props.onPatch).toHaveBeenCalledExactlyOnceWith({rotation:expect.closeTo(sign*Math.PI/4,8)});
  expect(original).toEqual(piece({rotation:Math.PI*2}));
 });
 it.each([['Small',.5],['Original',1],['Large',2],['Grand',3]] as const)('applies the %s size preset, not decorative swatches',(label,scale)=>{
  const {node,props}=inspector();button(node,`${label} size, ${scale} times original`).props.onClick!();
  expect(props.onPatch).toHaveBeenCalledExactlyOnceWith({scale});
  expect(button(node,'Original size, 1 times original').props['aria-pressed']).toBe(true);
 });
 it('shows dimensions from actual catalog bounds times scale, in width/depth/height order',()=>{
  const object=piece({scale:2,rotation:Math.PI/2});const {node}=inspector({objects:[object]});
  const measurements=find(node,e=>e.props['aria-label']==='Scaled model dimensions');
  const html=renderToStaticMarkup(measurements);
  const bounds=getBuildAsset(object.assetId)!.bounds;
  const values=nodes(measurements).filter(e=>e.type==='dd');
  expect(values.map(value=>renderToStaticMarkup(value))).toEqual([0,2,1].map(index=>`<dd>${(bounds[index]*2).toFixed(2)} <small>m</small></dd>`));
  expect(html).toContain('own axes');
 });
 it('uses renderer-aligned builtin dimensions rather than inventing catalog dimensions',()=>{
  const {node}=inspector({objects:[piece({assetId:'ctrl-seat',behavior:'seat',scale:2})]});
  const measurements=find(node,e=>e.props['aria-label']==='Scaled model dimensions');
  expect(nodes(measurements).filter(e=>e.type==='dd').map(e=>renderToStaticMarkup(e))).toEqual(['2.00','1.40','1.10'].map(value=>`<dd>${value} <small>m</small></dd>`));
 });
 it('keeps precise placement, rotation and full scale range inside the closed disclosure',()=>{
  const {node,props}=inspector();const details=find(node,e=>e.type==='details');expect(details.props.open).not.toBe(true);
  for(const key of ['x','y','z','rotation','scale']){
   const range=find(details,e=>e.type==='input'&&e.props['aria-label']===key);change(range,'1.5');
   expect(props.onPatch).toHaveBeenLastCalledWith({[key]:1.5});expect(range.props['aria-valuetext']).toBeTypeOf('string');
  }
  expect(find(details,e=>e.props['aria-label']==='scale').props).toMatchObject({min:.25,max:4,step:.25});
 });
 it('preserves named mobile camera, duplicate, delete and selected-object callbacks',()=>{
  const {node,props}=inspector();change(find(node,e=>e.props['aria-label']==='Placed objects'),'piece-2');expect(props.onSelect).toHaveBeenCalledWith('piece-2');
  change(find(node,e=>e.props['aria-label']==='Name'),'Window desk');expect(props.onPatch).toHaveBeenCalledWith({name:'Window desk'});
  for(const [label,callback] of [['Posisikan lewat kamera',props.onMove],['Duplicate',props.onDuplicate],['Delete',props.onDelete]] as const){
   const action=find(node,e=>e.type==='button'&&e.props.children===label);expect(action.props.type).toBe('button');action.props.onClick!();expect(callback).toHaveBeenCalledOnce();
  }
 });
 it('keeps duplicate disabled at the existing hard budget and supports missing camera integration',()=>{
  const {node}=inspector({objects:Array.from({length:120},(_,index)=>piece({id:index?'piece-'+index:'piece-1'})),onMove:undefined});
  expect(find(node,e=>e.type==='button'&&e.props.children==='Duplicate').props.disabled).toBe(true);
  expect(nodes(node).some(e=>e.props.children==='Posisikan lewat kamera')).toBe(false);
 });
 it('retains behavior target reset, switch self-exclusion, and real portal destination updates',()=>{
  const {node,props}=inspector({objects:[piece({behavior:'switch',target:'piece-2'}),piece({id:'piece-2',name:'Lamp'})]});
  const behavior=find(node,e=>e.type==='select'&&e.props.value==='switch');change(behavior,'portal');expect(props.onPatch).toHaveBeenLastCalledWith({behavior:'portal',target:''});
  const target=find(node,e=>e.type==='select'&&e.props.value==='piece-2');expect(nodes(target).filter(e=>e.type==='option').map(e=>e.props.value)).toEqual(['','piece-2']);change(target,'piece-2');expect(props.onPatch).toHaveBeenLastCalledWith({target:'piece-2'});
  const portal=inspector({objects:[piece({behavior:'portal'})],worlds:[{id:'garden',name:'Garden'}]});
  const destination=find(portal.node,e=>e.type==='label'&&nodes(e).some(child=>child.type==='option'&&child.props.value==='garden'));
  change(find(destination,e=>e.type==='select'),'garden');expect(portal.props.onPatch).toHaveBeenCalledWith({target:'garden'});
 });
 it('handles a stale selection without exposing destructive actions; browse and deselect stay functional',()=>{
  const {node,props}=inspector({selectedId:'deleted-piece'});
  expect(nodes(node).some(e=>e.type==='button'&&e.props.children==='Delete')).toBe(false);
  find(node,e=>e.type==='button'&&e.props.children==='Browse pieces').props.onClick!();expect(props.onBrowse).toHaveBeenCalledOnce();
  change(find(node,e=>e.props['aria-label']==='Placed objects'),'');expect(props.onSelect).toHaveBeenCalledWith(null);
  expect(renderToStaticMarkup(createElement(BuildInspector,props))).toContain('A place for your next idea.');
 });
});
