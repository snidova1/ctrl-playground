import {beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {isValidElement,type ReactElement,type ReactNode} from 'react';
import {newCharacterAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';

// Exercise the actual form/event wiring with no browser, canvas or large models.
const hooks=vi.hoisted(()=>({states:[] as unknown[],cursor:0}));
vi.mock('react',async original=>({
 ...await original<typeof import('react')>(),
 useState:<T,>(initial:T)=>{
  const index=hooks.cursor++;
  if(!(index in hooks.states))hooks.states[index]=initial;
  return [hooks.states[index],(value:T)=>{hooks.states[index]=value;}];
 },
}));
vi.mock('next/dynamic',()=>({default:()=>function RealRendererBoundary(){return null;}}));
vi.mock('@/features/habitat/appearance-picker',()=>({default:()=>null}));
import CreatorForm from '@/features/common-ground/creator-form';
import CreatorPreview from '@/features/common-ground/creator-preview';
import AppearancePicker from '@/features/habitat/appearance-picker';

type Props={children?:ReactNode;onClick?:()=>void;onChange?:(event:{target:{value:string}})=>void;onKeyDown?:(event:unknown)=>void;[key:string]:unknown};
function elements(node:ReactNode):ReactElement<Props>[]{
 if(Array.isArray(node))return node.flatMap(elements);
 return isValidElement<Props>(node)?[node,...elements(node.props.children)]:[];
}
function find(node:ReactNode,predicate:(element:ReactElement<Props>)=>boolean){
 const element=elements(node).find(predicate);
 expect(element).toBeDefined();
 return element!;
}
function render<T>(component:()=>T){hooks.cursor=0;return component();}
function form(appearance=newCharacterAppearance('female'),onAppearanceChange=vi.fn()){
 return render(()=>CreatorForm({appearance,onAppearanceChange,name:'Willow',onNameChange:vi.fn(),onSubmit:vi.fn(),busy:false,error:''}));
}
function tabs(node:ReactNode){return elements(node).filter(e=>e.props.role==='tab');}
const source=(path:string)=>readFileSync(new URL(`../../${path}`,import.meta.url),'utf8');
beforeEach(()=>{hooks.states=[];hooks.cursor=0;});

describe('Common Ground dressing room',()=>{
 it('shows one active visual picker, four linked tabs, and no old dropdown wall',()=>{
  const node=form();
  expect(tabs(node).map(tab=>tab.props.id)).toEqual(['cg-creator-tab-looks','cg-creator-tab-hair','cg-creator-tab-outfit','cg-creator-tab-details']);
  expect(tabs(node).filter(tab=>tab.props['aria-selected'])).toHaveLength(1);
  expect(tabs(node).map(tab=>tab.props.tabIndex)).toEqual([0,-1,-1,-1]);
  const panel=find(node,e=>e.props.role==='tabpanel');
  expect(panel.props).toMatchObject({id:'cg-creator-panel','aria-labelledby':'cg-creator-tab-looks',tabIndex:0});
  expect(elements(node).filter(e=>e.type===AppearancePicker)).toHaveLength(1);
  expect(find(node,e=>e.type===AppearancePicker).props.section).toBe('looks');
  expect(elements(node).filter(e=>e.type==='select')).toHaveLength(1);
  expect(source('features/common-ground/creator-form.tsx')).not.toMatch(/AppearanceControls|outfitVariants|hairVariants|cg-creator-tints/);
 });
 it('changes sections without remounting the live preview or losing the exact draft',()=>{
  const appearance=newCharacterAppearance('female');
  let node=form(appearance);
  const preview=find(node,e=>e.type===CreatorPreview);
  for(const [index,section] of ['looks','hair','outfit','details'].entries()){
   tabs(node)[index].props.onClick!();node=form(appearance);
   expect(find(node,e=>e.type===AppearancePicker).props).toMatchObject({appearance,section});
   expect(find(node,e=>e.type===CreatorPreview).type).toBe(preview.type);
   expect(find(node,e=>e.type===CreatorPreview).props.appearance).toBe(appearance);
   expect(find(node,e=>e.type===CreatorPreview).key).toBeNull();
   expect(find(node,e=>e.props.role==='tabpanel').props['aria-labelledby']).toBe(`cg-creator-tab-${section}`);
  }
 });
 it('supports roving keyboard focus, wraparound and Home/End navigation',()=>{
  let node=form();
  const focus=Array.from({length:4},()=>vi.fn());
  const preventDefault=vi.fn();
  const key=(value:string)=>{
   const active=tabs(node).find(tab=>tab.props['aria-selected'])!;
   active.props.onKeyDown!({key:value,preventDefault,currentTarget:{parentElement:{querySelectorAll:()=>focus.map(fn=>({focus:fn}))}}});
   node=form();
  };
  key('ArrowLeft');expect(focus[3]).toHaveBeenCalledOnce();
  expect(find(node,e=>e.type===AppearancePicker).props.section).toBe('details');
  key('ArrowRight');expect(focus[0]).toHaveBeenCalledOnce();
  key('End');expect(focus[3]).toHaveBeenCalledTimes(2);
  key('Home');expect(focus[0]).toHaveBeenCalledTimes(2);
  key('Tab');expect(preventDefault).toHaveBeenCalledTimes(4);
 });
 it('routes each shared-picker update directly into the same live appearance',()=>{
  const change=vi.fn(),appearance=newCharacterAppearance('female');
  let node=form(appearance,change);
  const shared=find(node,e=>e.type===AppearancePicker);
  expect(shared.props.onChange).toBe(change);
  const next={...appearance,hairId:'auburn'} as CharacterAppearance;
  (shared.props.onChange as unknown as (a:CharacterAppearance)=>void)(next);
  expect(change).toHaveBeenCalledWith(next);
  node=form(next,change);
  expect(find(node,e=>e.type===CreatorPreview).props.appearance).toBe(next);
 });
 it('keeps identity controls visible outside the scroll panel and preserves native validation/save',()=>{
  const onNameChange=vi.fn(),onSubmit=vi.fn(),onAppearanceChange=vi.fn();
  const props={appearance:newCharacterAppearance('female'),name:'Willow',busy:true,error:'Try again',onNameChange,onSubmit,onAppearanceChange};
  const node=render(()=>CreatorForm(props));
  expect(node.props).toMatchObject({'aria-label':'Public World avatar','aria-busy':true,onSubmit});
  const name=find(node,e=>e.props['aria-label']==='Avatar name');
  expect(name.props).toMatchObject({required:true,minLength:2,maxLength:24,autoComplete:'nickname',value:'Willow'});
  name.props.onChange!({target:{value:'Fern'}});expect(onNameChange).toHaveBeenCalledWith('Fern');
  find(node,e=>e.props['aria-label']==='Avatar character').props.onChange!({target:{value:'male'}});
  expect(onAppearanceChange).toHaveBeenCalledWith(newCharacterAppearance('male'));
  const panel=find(node,e=>e.props.role==='tabpanel');
  expect(elements(panel).some(e=>e.type==='input'||e.type==='select')).toBe(false);
  expect(find(node,e=>e.props.type==='submit').props.disabled).toBe(true);
  expect(find(node,e=>e.props.role==='alert').props.children).toBe('Try again');
  expect(source('features/common-ground/creator-form.tsx')).toContain('Save avatar & enter Public World');
 });
 it('retains the real renderer, all preview data hooks, and in-place full/face framing',()=>{
  const appearance=newCharacterAppearance('female');
  let node=render(()=>CreatorPreview({appearance}));
  expect(node.props).toMatchObject({'aria-label':'Live avatar preview','data-preview-gender':'female','data-preview-model':appearance.lookId??'original','data-preview-hair':appearance.hairStyleId??'source','data-preview-outfit':appearance.wardrobeId??'source','data-preview-expression':appearance.expressionId??'neutral'});
  const renderer=find(node,e=>'framing'in e.props);
  find(node,e=>e.type==='button'&&e.props.children==='Face').props.onClick!();
  node=render(()=>CreatorPreview({appearance}));
  expect(find(node,e=>'framing'in e.props).props).toMatchObject({appearance,framing:'portrait'});
  expect(find(node,e=>'framing'in e.props).type).toBe(renderer.type);
  expect(find(node,e=>'framing'in e.props).key).toBeNull();
  find(node,e=>e.type==='button'&&e.props.children==='Full body').props.onClick!();
  node=render(()=>CreatorPreview({appearance}));
  expect(find(node,e=>'framing'in e.props).props.framing).toBe('full');
  const previewSource=source('features/common-ground/creator-preview.tsx');
  expect(previewSource).toContain("import('@/features/habitat/character-creator-preview')");
  expect(previewSource).not.toMatch(/<Canvas|<VrmAvatar|<mesh|camera=/);
 });
 it('bounds the content panel, pins mobile preview/identity/tabs/save, and scopes the new palette',()=>{
  const css=source('features/common-ground/creator-dressing-room.css');
  expect(css).toContain('grid-template-columns:minmax(0,1.2fr) minmax(340px,1fr)');
  expect(css).toMatch(/\.cg-avatar-dialog \.cg-creator-fields \{[^}]*min-height:0;[^}]*overflow-y:auto;/);
  expect(css).toContain('grid-template-rows:clamp(180px,32dvh,290px) minmax(0,1fr) auto');
  expect(css).toContain('grid-template-rows:auto auto minmax(0,1fr)');
  expect(css).toMatch(/\.cg-avatar-dialog \.cg-creator-save \{[^}]*grid-row:3/);
  expect(css).toContain('prefers-reduced-motion:reduce');
  expect(css).toContain('--cg-accent:#a5533d');
  expect(css).not.toMatch(/:root|body\s*\{|transform:scale|position:fixed/);
 });
});
