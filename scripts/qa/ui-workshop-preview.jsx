import React,{useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{newCharacterAppearance,createCharacterMotion}from'../../features/plaza/characters/catalog';
import BuildCatalog from'../../features/habitat/build-catalog';
import DressingRoom from'../../features/habitat/dressing-room';
import Stage from'../../features/habitat/stage';
import{createStarterWorld}from'../../features/habitat/starter-world';
import NativePreview from'../../features/habitat/character-creator-preview';
import{airiLookPresets}from'../../features/plaza/characters/airi-look-presets';
import'../../features/habitat/habitat.css';
import'../../features/habitat/cozy.css';

// Source-only visual fixture. It is not a backend/auth/persistence test.
function Workshop(){
 const[appearance,setAppearance]=useState(()=>newCharacterAppearance('female')),[name,setName]=useState('Sinta Maharani');
 const[objects,setObjects]=useState(()=>createStarterWorld()),[selected,setSelected]=useState(null),[saved,setSaved]=useState(false);
 const pose=useRef({x:0,z:6,angle:Math.PI,moving:false}),input=useRef({x:0,z:0}),motion=useRef(createCharacterMotion());
 const dressing=new URLSearchParams(location.search).get('view')==='character';
 const state={profile:{id:'visual-fixture',name,character:appearance.gender,variant:appearance.variantId,appearance},world:{id:'visual-home',name:'Sinta’s little garden',ownerId:'visual-fixture',visibility:'private',revision:0,objects},homeId:'visual-home',canEdit:true,players:[],states:{},wallet:null,keyStatus:'not-deployed',worlds:[]};
 const add=(assetId,label,behavior='decoration')=>{const item={id:crypto.randomUUID(),assetId,name:label,x:0,y:0,z:2,rotation:0,scale:1,behavior,target:''};setObjects(old=>[...old,item]);setSelected(item.id);};
 const patch=values=>setObjects(old=>old.map(o=>o.id===selected?{...o,...values}:o));
 return <main className={`hb-app${dressing?'':' is-editing'}`} style={{background:'#cad5bd'}}>{dressing?<DressingRoom appearance={appearance} name={name} busy={false} hasProfile canSave onChange={setAppearance} onName={setName} onSave={()=>setSaved(true)} onClose={()=>{}}/>:<><div className='hb-stage'><Stage state={state} pose={pose} input={input} motion={motion} editing selected={selected} draft={objects} onSelect={setSelected} onUse={()=>{}} sitting={false} celebrate={false} interactedAt={-Infinity} quality='low' locked={false} reduced/></div><BuildCatalog objects={objects} selectedId={selected} busy={false} online canUndo={false} canRedo={false} onSelect={setSelected} onAdd={add} onPatch={patch} onDuplicate={()=>{const o=objects.find(o=>o.id===selected);if(o)add(o.assetId,o.name,o.behavior);}} onDelete={()=>{setObjects(old=>old.filter(o=>o.id!==selected));setSelected(null);}} onUndo={()=>{}} onRedo={()=>{}} onSave={()=>setSaved(true)} onCancel={()=>{}}/></>}{saved&&<p role='status' style={{position:'absolute',top:10,left:10,zIndex:30}}>Source preview callback received (not a server save).</p>}</main>;
}
function Thumbnail(){const params=new URLSearchParams(location.search),preset=airiLookPresets.find(p=>p.id===params.get('preset'))??airiLookPresets[0];const appearance={...newCharacterAppearance('female'),lookId:params.get('look')??preset.lookId,hairStyleId:params.get('hair')??preset.hairStyleId,wardrobeId:params.get('outfit')??preset.wardrobeId,variantId:params.has('look')?'original':preset.variantId,hairId:params.has('look')?'source':preset.hairId};return <main className='hb-app' data-thumbnail-preset={preset.id}><NativePreview appearance={appearance} framing={params.get('frame')==='portrait'?'portrait':'full'}/></main>;}
createRoot(document.getElementById('root')).render(new URLSearchParams(location.search).get('view')==='thumbnail'?<Thumbnail/>:<Workshop/>);
