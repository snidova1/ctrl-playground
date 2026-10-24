import {beforeEach,describe,expect,it,vi} from 'vitest';
import {isValidElement,type ReactElement,type ReactNode} from 'react';
import {defaultAppearance,newCharacterAppearance,type CharacterAppearance} from '@/features/plaza/characters/catalog';

// Execute the real component/event wiring in Node. Only hooks, GPU components
// and Next routing are replaced; no browser, full build or extra DOM dependency.
const hooks=vi.hoisted(()=>({states:[] as unknown[],cursor:0}));
vi.mock('react',async original=>({
 ...await original<typeof import('react')>(),
 useState:<T,>(initial:T)=>{
  const index=hooks.cursor++;
  if(!(index in hooks.states))hooks.states[index]=initial;
  return [hooks.states[index],(value:T|((old:T)=>T))=>{hooks.states[index]=typeof value==='function'?(value as (old:T)=>T)(hooks.states[index] as T):value;}];
 },
 useRef:<T,>(current:T)=>({current}),useCallback:<T,>(callback:T)=>callback,
 useEffect:()=>{},
}));
vi.mock('next/dynamic',()=>({default:()=>function DynamicBoundary(){return null;}}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()})}));
vi.mock('next/link',()=>({default:()=>null}));
vi.mock('@/components/brand',()=>({BrandMark:()=>null}));
vi.mock('@react-three/fiber',()=>({Canvas:()=>null,useFrame:()=>{}}));
vi.mock('@react-three/drei',()=>({Html:()=>null,OrbitControls:()=>null}));
vi.mock('@/features/plaza/characters/vrm-avatar',()=>({default:()=>null}));
vi.mock('@/features/worldgacha/ghibli-atmosphere',()=>({default:()=>null}));
vi.mock('@/features/common-ground/open-air-environment',()=>({default:()=>null,CLEARING_BENCHES:[],CLEARING_SIGN:{x:0,z:0},CLEARING_TREES:[]}));
vi.mock('@/features/common-ground/garden-decor',()=>({GARDEN_COLLIDERS:[]}));
import CreatorPreview from '@/features/common-ground/creator-preview';
import CreatorForm from '@/features/common-ground/creator-form';
import AppearancePicker from '@/features/habitat/appearance-picker';
import {hairVariants,outfitVariants,eyeVariants,skinVariants} from '@/features/plaza/characters/catalog';
import LobbyScene from '@/features/common-ground/lobby-scene';
import CommonGroundLobby from '@/features/common-ground/lobby';

type Props={children?:ReactNode;onClick?:()=>void;onChange?:(event:{target:{value:string}})=>void;[key:string]:unknown};
function elements(node:ReactNode):ReactElement<Props>[]{
 // Do not use Children.toArray: it synthesizes keys and masks remount regressions.
 if(Array.isArray(node))return node.flatMap(elements);
 return isValidElement<Props>(node)?[node,...elements(node.props.children)]:[];
}
function find(node:ReactNode,predicate:(element:ReactElement<Props>)=>boolean){
 const result=elements(node).find(predicate);expect(result).toBeDefined();return result!;
}
function render<T>(component:()=>T){hooks.cursor=0;return component();}
function form(appearance=defaultAppearance,onAppearanceChange:(appearance:CharacterAppearance)=>void=vi.fn()){
 return render(()=>CreatorForm({appearance,name:'Tester',busy:false,error:'',onAppearanceChange,onNameChange:vi.fn(),onSubmit:vi.fn()}));
}
function expanded(node:ReactNode):ReactNode {if(Array.isArray(node))return node.map(expanded);if(!isValidElement<Props>(node))return node;if(typeof node.type==='function')return expanded((node.type as (props:Props)=>ReactNode)(node.props));return {...node,props:{...node.props,children:expanded(node.props.children)}};}
function select(node:ReactNode,label:string,value:string){find(node,e=>e.type==='select'&&e.props['aria-label']===label).props.onChange!({target:{value}});}
function selectedPreview(node:ReactNode){return find(node,e=>e.type===CreatorPreview).props.appearance;}

beforeEach(()=>{hooks.states=[];hooks.cursor=0;});

describe('live Common Ground creator component wiring',()=>{
 it('feeds the exact draft into the proven renderer and reuses one instance when changing full/face view',()=>{
  const appearance=newCharacterAppearance('female');
  let node=render(()=>CreatorPreview({appearance}));
  let renderer=find(node,e=>'framing' in e.props);
  expect(renderer.props.appearance).toBe(appearance);expect(renderer.props.framing).toBe('full');expect(renderer.key).toBeNull();
  find(node,e=>e.type==='button'&&e.props.children==='Face').props.onClick!();
  node=render(()=>CreatorPreview({appearance}));
  const portrait=find(node,e=>'framing' in e.props);
  expect(portrait.type).toBe(renderer.type);expect(portrait.key).toBeNull();expect(portrait.props.framing).toBe('portrait');
  expect(find(node,e=>e.type==='button'&&e.props.children==='Face').props['aria-pressed']).toBe(true);
  find(node,e=>e.type==='button'&&e.props.children==='Full body').props.onClick!();
  node=render(()=>CreatorPreview({appearance}));renderer=find(node,e=>'framing' in e.props);
  expect(renderer.props.framing).toBe('full');expect(elements(node).filter(e=>'framing' in e.props)).toHaveLength(1);
 });
 it('updates gender live without replacing the real authored source model defaults',()=>{
  const change=vi.fn(),node=form(newCharacterAppearance('female'),change);
  select(node,'Avatar character','male');
  const next=change.mock.calls[0][0] as CharacterAppearance;
  expect(next).toEqual(newCharacterAppearance('male'));
  expect(selectedPreview(form(next))).toBe(next);
 });
 it.each([
  ['Body & outfit model','lookId'],['Hairstyle','hairStyleId'],['Costume','wardrobeId'],['Expression','expressionId'],
 ] as const)('passes %s edits from actual shared controls into the live preview', (label,key)=>{
  let appearance=newCharacterAppearance('female');
  const node=form(appearance,next=>{appearance=next;}),shared=find(node,e=>e.type===AppearancePicker);
  expect(shared.props.appearance).toBe(appearance);
  const section=label==='Hairstyle'?'hair':label==='Costume'?'outfit':label==='Expression'?'details':'looks';
  const controls=expanded(AppearancePicker({appearance,section,onChange:shared.props.onChange as unknown as (a:CharacterAppearance)=>void}));
  const field=find(controls,e=>e.type==='select'&&e.props['aria-label']===label);
  const options=elements(field.props.children).filter(e=>e.type==='option'&&!String(e.props.value).startsWith('modular:'));
  const option=options.find(e=>e.props.value!==field.props.value)??options[0];
  expect(option).toBeDefined();
  select(controls,label,String(option.props.value));
  expect(appearance[key]).toBe(option.props.value);
  expect(selectedPreview(form(appearance))).toBe(appearance);
  const preview=render(()=>CreatorPreview({appearance}));
  expect(find(preview,e=>'framing' in e.props).props.appearance).toBe(appearance);
 });
 it.each([
  ['Clothing tint','variantId','outfit',outfitVariants],['Hair tint','hairId','hair',hairVariants],['Eye tint','eyeId','details',eyeVariants],['Skin tint','skinId','details',skinVariants],
 ] as const)('updates %s without dropping any other draft appearance fields', (label,key,section,variants)=>{
  const appearance=newCharacterAppearance('female'),change=vi.fn(),node=form(appearance,change);
  const shared=find(node,e=>e.type===AppearancePicker);const controls=expanded(AppearancePicker({appearance,section,onChange:shared.props.onChange as unknown as (a:CharacterAppearance)=>void}));
  const option=variants.find(v=>v.id!==appearance[key])!;
  find(controls,e=>e.type==='button'&&e.props['aria-label']===`${label}: ${option.name}`).props.onClick!();
  expect(change).toHaveBeenCalledWith({...appearance,[key]:option.id});
  expect(selectedPreview(form(change.mock.calls[0][0]))).toBe(change.mock.calls[0][0]);
 });
 it('preserves form/name/character selectors, disabled saving, errors and native validation',()=>{
  const onNameChange=vi.fn(),onSubmit=vi.fn();
  const node=CreatorForm({appearance:defaultAppearance,name:'Tester',busy:true,error:'Save failed',onNameChange,onSubmit,onAppearanceChange:vi.fn()});
  expect(node.props['aria-label']).toBe('Public World avatar');expect(node.props.onSubmit).toBe(onSubmit);
  const name=find(node,e=>e.type==='input'&&e.props['aria-label']==='Avatar name');
  expect(name.props).toMatchObject({required:true,minLength:2,maxLength:24,value:'Tester'});
  name.props.onChange!({target:{value:'New name'}});expect(onNameChange).toHaveBeenCalledWith('New name');
  expect(find(node,e=>e.props.type==='submit').props.disabled).toBe(true);
  expect(find(node,e=>e.props.role==='alert').props.children).toBe('Save failed');
  expect(find(node,e=>e.props['aria-label']==='Avatar customization controls').props.tabIndex).toBe(0);
 });
});

describe('creator background canvas lifecycle',()=>{
 it('sends never/always to the actual mounted R3F Canvas while retaining the same child scene',()=>{
  const paused=LobbyScene({paused:true,playable:false}),resumed=LobbyScene({paused:false,playable:true});
  const frozenCanvas=find(paused,e=>'frameloop' in e.props),runningCanvas=find(resumed,e=>'frameloop' in e.props);
  expect(frozenCanvas.props.frameloop).toBe('never');expect(frozenCanvas.props['data-render-paused']).toBe('true');
  expect(runningCanvas.props.frameloop).toBe('always');expect(runningCanvas.props['data-render-paused']).toBe('false');
  expect(frozenCanvas.type).toBe(runningCanvas.type);expect(frozenCanvas.key).toBeNull();expect(runningCanvas.key).toBeNull();
  expect(find(frozenCanvas,e=>'playable' in e.props).type).toBe(find(runningCanvas,e=>'playable' in e.props).type);
 });
 it('keeps saved lobby appearance and guest id stable through edits/close, and resumes movement',()=>{
  const saved=newCharacterAppearance('female'),draft=newCharacterAppearance('male'),guest={id:'same-tab-guest',appearance:saved,version:1};
  // Lobby state order: phase, guest, verified, profile, modal, draft, name, busy, error.
  hooks.states=['afternoon',guest,true,{name:'Tester',appearance:saved},'avatar',draft,'Tester',false,''];
  let node=render(()=>CommonGroundLobby());
  const scene=find(node,e=>'paused' in e.props),creator=find(node,e=>e.type===CreatorForm);
  expect(scene.props).toMatchObject({paused:true,playable:false,appearance:saved});expect(scene.key).toBeNull();
  expect(creator.props.appearance).toBe(draft);expect(node.props['data-guest-id']).toBe(guest.id);
  expect(elements(node).some(e=>e.props['aria-label']==='Touch movement and running')).toBe(false);
  find(node,e=>e.props['aria-label']==='Close sign-in or avatar').props.onClick!();
  node=render(()=>CommonGroundLobby());
  const resumed=find(node,e=>'paused' in e.props);
  expect(resumed.type).toBe(scene.type);expect(resumed.props).toMatchObject({paused:false,playable:true,appearance:saved});
  expect(node.props['data-guest-id']).toBe(guest.id);expect(node.props['data-identity']).toBe('wallet');
  expect(elements(node).some(e=>e.type===CreatorForm)).toBe(false);
  expect(elements(node).some(e=>e.props['aria-label']==='Touch movement and running')).toBe(true);
 });
});
