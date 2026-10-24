'use client';
import dynamic from 'next/dynamic';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {newCharacterAppearance,createCharacterMotion} from '@/features/plaza/characters/catalog';
import type {ControlInput} from '@/features/plaza/scene';
import type {Pose} from '@/features/plaza/types';
import {layoutSchema,type WorldObject,type WorldState} from './types';
import {isHouseObject} from './modular-house';
import {nearestUsableObject,interactionDistanceTo} from './furniture-interactions';
import {HABITAT_TEST_STORAGE,createHabitatTestSnapshot,decodeHabitatTestSnapshot,encodeHabitatTestSnapshot} from './test-snapshot';
import HouseWorkshop from './house-workshop';
import HouseInteractions from './house-interactions';
import BuildCatalog from './build-catalog';
import FurniturePlacementControls from './furniture-placement-controls';
import type {PlacementPreview} from './furniture-placement';
import AnalogStick from './analog-stick';
import TouchRunButton from './touch-run-button';
import ActivityPanel from '@/features/cozy-life/activity-panel';
import {useCozyActivity} from '@/features/cozy-life/use-cozy-activity';
import {useCozyWorld} from './use-cozy-world';
import {loadGuestState} from '@/features/cozy-life/client';
import {isCozyLayoutClear} from './cozy-life-layout';
import CozyWorldInteraction from './cozy-world-interaction';
import './habitat.css';import './cozy.css';import './habitat-test.css';
const Stage=dynamic(()=>import('./stage'),{ssr:false});
type Mode='play'|'house'|'furniture';
/** Local playground only: deliberately no wallet, API client, membership or Key operations. */
export default function HabitatTest(){
 const [objects,setObjects]=useState<WorldObject[]>([]),[states,setStates]=useState<WorldState['states']>({}),[loaded,setLoaded]=useState(false),[mode,setMode]=useState<Mode>('play'),[roof,setRoof]=useState(false),[selected,setSelected]=useState<string|null>(null),[sitting,setSitting]=useState(false),[seat,setSeat]=useState<string|null>(null),[notice,setNotice]=useState(''),[help,setHelp]=useState(false);
 const pose=useRef<Pose>({x:0,z:3,angle:Math.PI,moving:false}),input=useRef<ControlInput>({x:0,z:0}),motion=useRef(createCharacterMotion());
 const cozy=useCozyActivity(()=>{input.current={x:0,z:0,run:false,jump:false};pose.current.moving=false;});
 const lifeWorld=useCozyWorld({local:true});
 const [placement,setPlacement]=useState<WorldObject|null>(null),[placementPreview,setPlacementPreview]=useState<PlacementPreview|null>(null);
 const history=useRef<WorldObject[][]>([]),cursor=useRef(0),beforeEdit=useRef<WorldObject[]>([]);
 const appearance=useMemo(()=>newCharacterAppearance('female'),[]),editing=mode!=='play';
 useEffect(()=>{let snapshot;try{snapshot=decodeHabitatTestSnapshot(localStorage.getItem(HABITAT_TEST_STORAGE));}catch{}snapshot??=createHabitatTestSnapshot();setObjects(snapshot.objects);setStates(snapshot.states);history.current=[snapshot.objects];setLoaded(true);},[]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(timer);},[notice]);
 useEffect(()=>{input.current.x=input.current.z=0;input.current.run=false;},[mode]);
 const useObject=useCallback((object:WorldObject)=>{
  if(cozy.open)return;
  if(sitting&&seat===object.id&&object.behavior==='seat'){setSitting(false);return;}
  if(interactionDistanceTo(pose.current,object)>2.7){setNotice('Dekati perabot dulu untuk berinteraksi.');return;}
  if(object.behavior==='seat'){setSitting(value=>seat===object.id?!value:true);setSeat(object.id);return;}
  if(['door','light','switch','spin'].includes(object.behavior)){const id=object.behavior==='switch'?object.target:object.id;if(id)setStates(old=>({...old,[id]:{active:!old[id]?.active,usedAt:Date.now()}}));return;}
  if(object.behavior==='portal')setNotice('Portal antar-world tidak aktif di tes lokal.');
 },[seat,sitting,cozy.open]);
 useEffect(()=>{function key(event:KeyboardEvent){if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return;if(editing||cozy.open||event.repeat)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))setSitting(false);if(event.code==='KeyE'){const object=(sitting?objects.find(o=>o.id===seat):undefined)??nearestUsableObject(pose.current,objects);if(object){event.preventDefault();useObject(object);}}}window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[editing,objects,seat,sitting,useObject]);
 function change(next:WorldObject[]){try{const checked=layoutSchema.parse(next);history.current=history.current.slice(0,cursor.current+1);history.current.push(checked);cursor.current++;setObjects(checked);}catch(error){setNotice(error instanceof Error?error.message:'Perubahan belum valid.');}}
 function enter(next:Mode){beforeEdit.current=objects;history.current=[objects];cursor.current=0;setSelected(null);setSitting(false);setRoof(false);setMode(next);}
 function undo(){if(cursor.current>0)setObjects(history.current[--cursor.current]);}
 function redo(){if(cursor.current<history.current.length-1)setObjects(history.current[++cursor.current]);}
 function save(){try{if(!isCozyLayoutClear(objects,loadGuestState(localStorage))){setNotice('Pindahkan kebun atau simpan perabot buatan ke tas sebelum membangun di tempat yang sama.');return;}localStorage.setItem(HABITAT_TEST_STORAGE,encodeHabitatTestSnapshot(objects,states));setMode('play');setNotice('Tersimpan di browser ini saja · bukan kepemilikan Habitat/Key.');}catch{setNotice('Penyimpanan browser tidak tersedia; perubahan masih bisa dicoba sesi ini.');}}
 function cancel(){setObjects(beforeEdit.current);setMode('play');}
 function add(assetId:string,name:string,behavior:WorldObject['behavior']='decoration'){if(objects.length>=120){setNotice('Maksimal 120 objek.');return;}const object:WorldObject={id:crypto.randomUUID(),assetId,name,behavior,x:pose.current.x,z:pose.current.z,y:0,rotation:0,scale:1,target:''};setPlacementPreview(null);setPlacement(object);setSelected(null);}
 function moveSelected(){const object=objects.find(o=>o.id===selected&&!isHouseObject(o));if(object){setPlacementPreview(null);setPlacement({...object});}}
 function rotatePlacement(){setPlacementPreview(null);setPlacement(old=>old?{...old,rotation:(old.rotation+Math.PI/4)%(Math.PI*2)}:null);}
 function place(){if(!placement||!placementPreview?.valid||placementPreview.object.id!==placement.id||Math.abs(placementPreview.object.rotation-placement.rotation)>.00001)return;const next=objects.some(o=>o.id===placement.id)?objects.map(o=>o.id===placement.id?placementPreview.object:o):[...objects,placementPreview.object];change(next);setSelected(placement.id);setPlacement(null);setPlacementPreview(null);input.current.x=input.current.z=0;}
 function patchObject(values:Partial<WorldObject>){change(objects.map(o=>o.id===selected&&!isHouseObject(o)?{...o,...values}:o));}
 const world:WorldState={profile:{id:'sandbox-visitor',name:'Test visitor',character:'female',variant:appearance.variantId,appearance},world:{id:'local-sandbox',ownerId:'sandbox-only-not-a-wallet',name:'Habitat Test',visibility:'private',revision:0,objects},homeId:null,canEdit:true,players:[],states,wallet:null,keyStatus:'not-deployed',worlds:[]};
 if(!loaded)return <main className='hb-sandbox-loading' role='status'>Menyiapkan tes Habitat…</main>;
 return <main className={`hb-app hb-sandbox${editing?' is-editing':''}`} data-habitat-sandbox='local-only' data-editor-mode={mode}>
  <div className='hb-stage'><Stage lifeView={lifeWorld.view} lifeInteractive state={world} pose={pose} input={input} motion={motion} editing={editing} houseEditing={mode==='house'} previewRoof={mode==='house'&&roof} placement={placement} onPlacementPreview={setPlacementPreview} selected={selected} draft={objects} onSelect={setSelected} onUse={useObject} sitting={sitting} sittingOn={seat} celebrate={false} interactedAt={0} quality='low' locked={cozy.open} advancedBuilder={mode==='furniture'} tool='translate' snap onTransform={(id,values)=>change(objects.map(o=>o.id===id&&!isHouseObject(o)?{...o,...values}:o))}/></div>
  <header className='hb-test-toolbar'><a href='/public-world' aria-label='Kembali ke Willow Common'>← Willow</a><small>Tes lokal · tanpa Key</small><button type='button' aria-label='Bantuan tes Habitat' aria-expanded={help} onClick={()=>setHelp(v=>!v)}>?</button></header>
  {help&&<aside className='hb-test-help'><strong>Coba Habitat tanpa Key</strong><p>Jalan dengan analog / WASD. Geser layar untuk kamera. Dekati pintu atau perabot lalu ketuk tombol aksi / E.</p><p>Bangun rumah dan perabot bebas dicoba. Simpan hanya ke browser ini; tidak membuat akun, Habitat sungguhan, atau transaksi.</p><button onClick={()=>setHelp(false)}>Tutup</button></aside>}
  {placement?<><FurniturePlacementControls object={placement} preview={placementPreview} onPlace={place} onRotate={rotatePlacement} onCancel={()=>{setPlacement(null);setPlacementPreview(null);input.current.x=input.current.z=0;}}/><div className='hb-test-touch'><AnalogStick onMove={axes=>{input.current.x=axes.x;input.current.z=axes.z;}}/></div></>:editing?<><div className='hb-builder-mode-switch' role='group' aria-label='Mode tes bangunan'><button aria-pressed={mode==='house'} onClick={()=>{setSelected(null);setMode('house');}}>Rumah</button><button aria-pressed={mode==='furniture'} onClick={()=>{setSelected(null);setMode('furniture');}}>Perabot</button>{mode==='house'&&<button aria-label='Roof preview' aria-pressed={roof} onClick={()=>setRoof(v=>!v)}>{roof?'Denah':'Lihat atap'}</button>}</div>
   {mode==='house'?<HouseWorkshop objects={objects} onChange={change} onClose={cancel} onSave={save} busy={false} online canUndo={cursor.current>0} canRedo={cursor.current<history.current.length-1} onUndo={undo} onRedo={redo}/>:<BuildCatalog onMove={moveSelected} objects={objects} selectedId={selected} busy={false} online canUndo={cursor.current>0} canRedo={cursor.current<history.current.length-1} onSelect={setSelected} onAdd={add} onPatch={patchObject} onDuplicate={()=>{const o=objects.find(item=>item.id===selected);if(o&&!isHouseObject(o)&&objects.length<120){const copy={...o,id:crypto.randomUUID(),x:Math.min(14,o.x+.6)};change([...objects,copy]);setSelected(copy.id);}}} onDelete={()=>{if(selected&&!isHouseObject(objects.find(o=>o.id===selected)??{assetId:''})){change(objects.filter(o=>o.id!==selected));setSelected(null);}}} onUndo={undo} onRedo={redo} onSave={save} onCancel={cancel}/>}</>:<>
   <HouseInteractions pose={pose} objects={objects} states={states} sitting={sitting} sittingOn={seat} busy={false} onUse={useObject}/>
   <footer className='hb-test-actions'><button onClick={()=>enter('house')}>Bangun rumah</button><button onClick={()=>enter('furniture')}>Perabot</button><button className='cozy-launch' onClick={()=>cozy.launch()} aria-haspopup='dialog'>🌱 Aktivitas</button></footer>
   <div className='hb-test-touch' aria-label='Kontrol sentuh Habitat'><AnalogStick onMove={axes=>{input.current.x=axes.x;input.current.z=axes.z;if(Math.hypot(axes.x,axes.z)>.08)setSitting(false);}}/><TouchRunButton className='hb-test-run' onRun={run=>{input.current.run=run;}}/></div>
  </>}
  {notice&&<output className='hb-test-notice' role='status'>{notice}</output>}
  <CozyWorldInteraction view={lifeWorld.view} pose={pose} objects={objects} enabled={!editing&&!cozy.open} onOpen={cozy.launch}/>
  <ActivityPanel open={cozy.open} onClose={cozy.close} tab={cozy.tab} onTab={cozy.setTab} identity={{kind:'guest'}} placementContext={{objects,canPlace:!editing}}/>
 </main>;
}
