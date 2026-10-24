import React,{useRef,useState}from'react';
import{createRoot}from'react-dom/client';
import{newCharacterAppearance,createCharacterMotion}from'../../features/plaza/characters/catalog';
import Stage from'../../features/habitat/stage';
import HouseWorkshop from'../../features/habitat/house-workshop';
import HouseInteractions from'../../features/habitat/house-interactions';
import{DEFAULT_HOUSE,replaceHouse}from'../../features/habitat/modular-house';
import{createStarterWorld}from'../../features/habitat/starter-world';
import'../../features/habitat/habitat.css';
import'../../features/habitat/cozy.css';
// Source-only real component/Controller fixture: NO backend, auth or network persistence claim.
function HousePreview(){
 const[objects,setObjects]=useState(()=>replaceHouse(createStarterWorld(),DEFAULT_HOUSE)),[states,setStates]=useState({}),[editing,setEditing]=useState(new URLSearchParams(location.search).has('build')),[previewRoof,setPreviewRoof]=useState(false),[sitting,setSitting]=useState(false),[sittingOn,setSittingOn]=useState(null),[notice,setNotice]=useState('');
 const pose=useRef({x:0,z:3,angle:Math.PI,moving:false}),input=useRef({x:0,z:0}),motion=useRef(createCharacterMotion());
 const history=useRef([objects]),cursor=useRef(0);
 const appearance=newCharacterAppearance('female'),state={profile:{id:'source-player',name:'Sinta Maharani',character:'female',variant:appearance.variantId,appearance},world:{id:'source-world',name:'Sinta’s home',ownerId:'source-player',visibility:'private',revision:0,objects},homeId:'source-world',canEdit:true,players:[],states,wallet:null,keyStatus:'not-deployed',worlds:[]};
 function change(next){history.current=history.current.slice(0,cursor.current+1);history.current.push(next);cursor.current++;setObjects(next);}
 function use(object){if(object.behavior==='seat'){setSitting(v=>sittingOn===object.id?!v:true);setSittingOn(object.id);}else setStates(old=>({...old,[object.id]:{active:!old[object.id]?.active,usedAt:Date.now()}}));}
 return <main className={`hb-app${editing?' is-editing':''}`}><div className='hb-stage'><Stage state={state} pose={pose} input={input} motion={motion} editing={editing} houseEditing={editing} previewRoof={previewRoof} selected={null} draft={objects} onSelect={()=>{}} onUse={use} sitting={sitting} sittingOn={sittingOn} celebrate={false} interactedAt={-Infinity} quality='low' locked={false} reduced/></div><header style={{position:'absolute',left:16,top:12,zIndex:20,background:'#faf6ebdd',padding:'7px 12px',font:'13px system-ui',color:'#2e4038'}}>Component fixture · no server persistence</header>{editing&&<nav className='hb-builder-mode-switch'><button aria-label='Roof preview' aria-pressed={previewRoof} onClick={()=>setPreviewRoof(v=>!v)}>{previewRoof?'Floor plan':'Show roof'}</button></nav>}{editing?<HouseWorkshop objects={objects} onChange={change} onClose={()=>setEditing(false)} onSave={()=>{setNotice('Source callback only; signed API persistence is tested separately.');setEditing(false);}} busy={false} online canUndo={cursor.current>0} canRedo={cursor.current<history.current.length-1} onUndo={()=>{if(cursor.current>0)setObjects(history.current[--cursor.current]);}} onRedo={()=>{if(cursor.current<history.current.length-1)setObjects(history.current[++cursor.current]);}}/>:<><HouseInteractions pose={pose} objects={objects} states={states} sitting={sitting} sittingOn={sittingOn} busy={false} onUse={use}/><footer className='hb-bottom'><button onClick={()=>setEditing(true)}>Build house</button></footer></>}{notice&&<aside role='status' style={{position:'absolute',top:50,left:16,zIndex:20,background:'#faf6eb',padding:8}}>{notice}</aside>}</main>;
}
createRoot(document.getElementById('root')).render(<HousePreview/>);
