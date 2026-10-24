import React,{useState,useEffect} from 'react';
import{createRoot}from'react-dom/client';
import CharacterCreatorPreview from'../../features/habitat/character-creator-preview';
import AppearanceControls from'../../features/habitat/appearance-controls';
import{newModularAppearance,normalizeAppearance,hairVariants,defaultAppearance}from'../../features/plaza/characters/catalog';
function Live(){
 const q=new URLSearchParams(location.search),gender=q.get('model')==='male'||q.get('family')==='neurohacker'?'male':'female';
 const[appearance,setAppearance]=useState(()=>q.get('model')==='male'?normalizeAppearance({...defaultAppearance,gender:'male'},'male','original'):q.get('model')?.startsWith('airi')?normalizeAppearance({...defaultAppearance,lookId:q.get('model')},'female','original'):normalizeAppearance({...newModularAppearance(gender),hairId:'espresso'},gender,'original'));
 const[action,setAction]=useState('idle'),[framing,setFraming]=useState(q.get('model')?.startsWith('airi')?'full':'portrait'),[gesture,setGesture]=useState({id:null,sequence:0});
 useEffect(()=>{document.body.dataset.liveAppearance=JSON.stringify(appearance);},[appearance]);
 return <main><header><b>CTRL · Native face redesign</b><span>Real shared creator component · local QA</span></header><section className="live-layout"><div className="live-stage"><CharacterCreatorPreview appearance={appearance} action={action} framing={framing} gesture={gesture}/><nav><button onClick={()=>setFraming(framing==='portrait'?'full':'portrait')}>{framing==='portrait'?'Full body':'Face detail'}</button><button onClick={()=>setAction(action==='walk'?'idle':'walk')}>Walk / idle</button><button onClick={()=>setGesture(g=>({id:'interact',sequence:g.sequence+1}))}>Wave</button><button onClick={()=>setGesture(g=>({id:'victory',sequence:g.sequence+1}))}>Cheer</button><button onClick={()=>setGesture(g=>({id:null,sequence:g.sequence+1}))}>Cancel</button></nav></div><aside><label>Hair color<select aria-label="Hair color" value={appearance.hairId} onChange={e=>setAppearance(a=>({...a,hairId:e.target.value}))}>{hairVariants.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label><AppearanceControls appearance={appearance} onChange={setAppearance}/></aside></section></main>;
}
createRoot(document.getElementById('root')).render(<Live/>);
