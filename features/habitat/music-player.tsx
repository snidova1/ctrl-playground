'use client';
import {useEffect,useRef,useState} from 'react';
import {Music2,Volume2,VolumeX} from 'lucide-react';

export const HABITAT_BGM={
 id:'ctrl-garden-afternoon-v1',
 name:'Garden Afternoon',
 url:'/audio/ctrl-garden-afternoon.wav',
 attribution:'Original procedural instrumental composed for CTRL, 2026',
 durationSeconds:40,
} as const;

/** Audio only starts from a real player gesture. No external streaming. */
export default function HabitatMusic(){
 const audio=useRef<HTMLAudioElement>(null);
 const [playing,setPlaying]=useState(false);
 const [error,setError]=useState('');
 const [level,setLevel]=useState(.3);
 useEffect(()=>{
  const el=audio.current;
  if(!el)return;
  const onHidden=()=>{if(document.visibilityState==='hidden'&&!el.paused)el.pause();};
  const onPause=()=>setPlaying(false);
  const onPlay=()=>{setPlaying(true);setError('');};
  document.addEventListener('visibilitychange',onHidden);
  el.addEventListener('pause',onPause);
  el.addEventListener('play',onPlay);
  return()=>{document.removeEventListener('visibilitychange',onHidden);el.removeEventListener('pause',onPause);el.removeEventListener('play',onPlay);el.pause();};
 },[]);
 async function toggle(){
  const el=audio.current;
  if(!el)return;
  if(!el.paused){el.pause();return;}
  el.volume=level;el.muted=false;
  try{await el.play();}catch{setPlaying(false);setError('Tap to allow audio. Check browser sound settings.');}
 }
 return <div className='hb-music-player' role='group' aria-label='Background music'>
  <audio ref={audio} src={HABITAT_BGM.url} loop preload='none' aria-hidden='true'/>
  <button type='button' onClick={()=>void toggle()} aria-label={playing?'Pause background music':'Play background music'} aria-pressed={playing} title={HABITAT_BGM.name+' · '+(playing?'pause':'play')}>
   {playing?<Volume2 aria-hidden='true' size={17}/>:<Music2 aria-hidden='true' size={17}/>}<span>{playing?'Music on':'Music'}</span>
  </button>
  {playing&&<label className='hb-music-volume'><VolumeX size={12} aria-hidden='true'/><input type='range' min='0' max='1' step='.05' value={level} aria-label='Music volume' onChange={e=>{const n=Number(e.target.value);setLevel(n);if(audio.current)audio.current.volume=n;}}/><Volume2 size={12} aria-hidden='true'/></label>}
  {error&&<small className='hb-music-error' role='status'>{error}</small>}
 </div>;
}
