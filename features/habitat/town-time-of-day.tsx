'use client';
import {useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,DirectionalLight,HemisphereLight} from 'three';
import type {Pose} from '@/features/plaza/types';
import {townSunRig} from './town-sun-rig';

/** Shared visual clock: 48 real minutes per stylized town day, inspired by summer-cycle's golden-hour progression. */
const DAY_MS=48*60*1000;
const skyDay=new Color('#bedee6'),skyDusk=new Color('#e9c7aa'),skyNight=new Color('#9eb9cf');
const sunDay=new Color('#fff3db'),sunDusk=new Color('#ffd0a0');
export default function TownDaylight({quality,pose}:{quality:'low'|'high';pose:MutableRefObject<Pose>}){
 const sun=useRef<DirectionalLight>(null),hemi=useRef<HemisphereLight>(null),last=useRef(-1);
 useFrame(({scene,clock})=>{
  if(clock.elapsedTime-last.current<.25)return;
  last.current=clock.elapsedTime;
  const phase=((Date.now()%DAY_MS)/DAY_MS)*Math.PI*2;
  const daylight=Math.max(0,Math.sin(phase));
  const dusk=Math.max(0,1-Math.abs(Math.sin(phase))*2);
  if(sun.current){
   const rig=townSunRig(pose.current.x,pose.current.z,phase);
   sun.current.position.set(...rig.position);
   sun.current.target.position.set(...rig.target);
   // Three's implicit light target is not parented into the scene graph.
   sun.current.target.updateMatrixWorld();
   sun.current.intensity=2.0+1.0*daylight+.2*dusk;
   sun.current.color.copy(sunDay).lerp(sunDusk,dusk*.75);
  }
  if(hemi.current)hemi.current.intensity=.72+.18*daylight;
  const sky=skyNight.clone().lerp(skyDusk,Math.min(1,daylight*.9+dusk*.6)).lerp(skyDay,daylight*.72);
  if(scene.background instanceof Color)scene.background.copy(sky);
  if(scene.fog)scene.fog.color.copy(sky);
 });
 return <>
  <ambientLight intensity={.24}/>
  <hemisphereLight ref={hemi} args={['#fff0d6','#829577',.88]}/>
  <directionalLight ref={sun} position={[30,50,20]} intensity={2.4} color='#fff0db' castShadow
   shadow-mapSize={quality==='high'?[1024,1024]:[512,512]}
   shadow-camera-left={quality==='high'?-38:-20} shadow-camera-right={quality==='high'?38:20}
   shadow-camera-top={quality==='high'?38:20} shadow-camera-bottom={quality==='high'?-38:-20} shadow-camera-near={.5} shadow-camera-far={150} shadow-normalBias={.035} shadow-bias={-.00015} shadow-radius={3}/>
 </>;
}
