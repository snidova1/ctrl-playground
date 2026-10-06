'use client';
import {lazy,useEffect,useState} from 'react';
import Link from '@/components/navigation';
import {ClientScene} from '@/three/core/client-scene';
import type {WorldRecipe} from '@/domain/world';
import type {WorldManifest} from '@/domain/types';
import {agents,weather} from '../data';
const WeatherField=lazy(()=>import('./weather-field'));
const OrbitField=lazy(()=>import('./orbit-field'));
export default function FieldExperience({recipe,manifest}:{recipe:WorldRecipe;manifest:WorldManifest}){
 const [selected,setSelected]=useState(0),[hour,setHour]=useState(14),[speed,setSpeed]=useState(35),[paused,setPaused]=useState(false),[overview,setOverview]=useState(true),[notes,setNotes]=useState(false);
 const isWeather=recipe.kit==='internet-weather',sample=weather[hour],agent=agents[selected%agents.length];const signal=[sample.curiosity,sample.attention,sample.friction,sample.velocity,Math.round((sample.attention+sample.curiosity)/2),Math.round((sample.velocity+sample.curiosity)/2)][selected%6];
 // Respect the device preference after hydration.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');if(media.matches)setPaused(true);},[]);
 const select=(i:number)=>{setSelected(i);if(!isWeather)setOverview(false);};
 function fork(){try{localStorage.setItem('ctrl:world-draft',JSON.stringify({...recipe,title:`Fork: ${recipe.title}`.slice(0,90)}));}catch{}}
 return <section className={`field-experience ${isWeather?'weather-experience':'orbit-experience'}`}>
 <ClientScene fallback={<div className="field-loading">PREPARING {isWeather?'SIGNAL FIELD':'ORBITAL MAP'}</div>}>{isWeather?<WeatherField hour={hour} wind={speed} selected={selected} paused={paused}/>:<OrbitField recipe={recipe} selected={selected} paused={paused} speed={speed} overview={overview} onSelect={select}/>}</ClientScene>
 <header className="field-header"><Link href="/worlds">CTRL / WORLDS</Link><span>{manifest.index} / {isWeather?'24 HOURS':'ONE SNAPSHOT'}</span><button onClick={()=>setNotes(v=>!v)} aria-expanded={notes}>FIELD NOTES</button></header>
 <div className="field-title"><span>{isWeather?'A FORECAST FOR A PLACE WITH NO SKY':'A CENSUS OF MOVING INTENTIONS'}</span><h1>{recipe.title}</h1><p>{isWeather?'Move across the field. Hold to disturb its surface. Scrub the day.':'Drag to navigate. Select an orbit to approach its agent.'}</p></div>
 <aside className="field-reading" aria-live="polite"><span>{isWeather?`${String(hour).padStart(2,'0')}:00 UTC / SYNTHETIC SAMPLE`:agent.group}</span><h2>{recipe.objects[selected]}</h2><strong>{isWeather?signal.toString().padStart(2,'0'):`${Math.round(agent.activity*100)}%`}</strong><p>{isWeather?'relative signal index':'illustrative activity index'}</p>{!isWeather&&<button onClick={()=>setOverview(v=>!v)}>{overview?'APPROACH AGENT':'RETURN TO CENSUS'}</button>}</aside>
 {notes&&<aside className="field-notes"><button onClick={()=>setNotes(false)} aria-label="Close field notes">×</button><h2>Reading this world</h2><p>{recipe.brief}</p><p>{isWeather?'Wave height follows the selected relative signal. Friction adds roughness; attention thickens cloud strata. Reflection and connection are derived indices. Wind is your playback control.':'Orbit radius follows the square root of age. Object size follows budget. Orbital speed follows activity. Color identifies the capability group.'}</p>{!isWeather&&<p>{agent.description}<br/>AGE: {agent.age} HOURS / BUDGET INDEX: {agent.budget}</p>}<p className="field-source">{manifest.dataSource}{manifest.demo?' / Demo values are illustrative.': ' / Geometry uses an authored kit and illustrative motion parameters.'}</p><Link href={`/archive/${manifest.missionId}`}>EXECUTION RECEIPT</Link><Link href="/worlds/create" onClick={fork}>FORK THIS WORLD</Link></aside>}
 <div className="field-dock"><nav aria-label={isWeather?'Signal layers':'Agents'}>{recipe.objects.map((name,i)=><button key={i} aria-pressed={selected===i} onClick={()=>select(i)}><span>{String(i+1).padStart(2,'0')}</span>{name}</button>)}</nav><div className="field-controls">{isWeather&&<label>HOUR / {String(hour).padStart(2,'0')}:00<input aria-label="Sample hour" type="range" min="0" max="23" value={hour} onChange={e=>setHour(Number(e.target.value))}/></label>}<label>{isWeather?'WIND':'PLAYBACK SPEED'} / {speed}<input aria-label={isWeather?'Wind intensity':'Orbital playback speed'} type="range" min="0" max="100" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label><button onClick={()=>setPaused(v=>!v)}>{paused?'RESUME MOTION':'PAUSE MOTION'}</button><span>{manifest.demo?'ILLUSTRATIVE DATA':'AUTHORED WORLD KIT'}</span></div></div>
 </section>;
}
