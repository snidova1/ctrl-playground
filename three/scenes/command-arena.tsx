'use client';
import type {Mission} from '@/domain/types';
import ExhibitScene from '@/three/exhibition/exhibit-scene';
export default function CommandArena({missions,selected,onSelect}:{missions:Mission[];selected:string|null;onSelect:(id:string)=>void}){
 const index=Math.max(0,missions.findIndex(m=>m.id===selected));
 return <div className="arena-installation" aria-label="Spatial command competition. Each sector represents a command; relative width follows support."><ExhibitScene kind="machine" weights={missions.map(m=>m.support)} selected={index} onSelect={i=>{const mission=missions[i];if(mission)onSelect(mission.id);}}/><span className="arena-installation-label">THE CONTROL FIELD / {String(missions.length).padStart(2,'0')} COMMANDS</span></div>;
}
