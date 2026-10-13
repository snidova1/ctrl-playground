'use client';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Color,DirectionalLight,HemisphereLight} from 'three';

/** Shared visual clock: 48 real minutes per stylized town day, inspired by summer-cycle's golden-hour progression. */
const DAY_MS=48*60*1000;
const skyDay=new Color('#c8e2e5'),skyDusk=new Color('#eab99e'),skyNight=new Color('#445d78');
const sunDay=new Color('#fff3db'),sunDusk=new Color('#ffd0a0');
export default function TownDaylight({quality}:{quality:'low'|'high'}){
 const sun=useRef<DirectionalLight>(null),hemi=useRef<HemisphereLight>(null),last=useRef(-1);
 useFrame(({scene,clock})=>{
  if(clock.elapsedTime-last.current<.25)return;
  last.current=clock.elapsedTime;
  const phase=((Date.now()%DAY_MS)/DAY_MS)*Math.PI*2;
  const daylight=Math.max(0,Math.sin(phase));
  const dusk=Math.max(0,1-Math.abs(Math.sin(phase))*2);
  if(sun.current){
   sun.current.position.set(Math.cos(phase)*50,14+Math.max(0,Math.sin(phase))*55,36);
   sun.current.intensity=.22+1.65*daylight+.45*dusk;
   sun.current.color.copy(sunDay).lerp(sunDusk,dusk*.75);
  }
  if(hemi.current)hemi.current.intensity=.5+.48*daylight;
  const sky=skyNight.clone().lerp(skyDusk,Math.min(1,daylight*.9+dusk*.6)).lerp(skyDay,daylight*.72);
  if(scene.background instanceof Color)scene.background.copy(sky);
  if(scene.fog)scene.fog.color.copy(sky);
 });
 return <>
  <ambientLight intensity={.25}/>
  <hemisphereLight ref={hemi} args={['#fff0d6','#829577',.88]}/>
  <directionalLight ref={sun} position={[30,50,20]} intensity={1.8} color='#fff0db' castShadow={quality==='high'}
   shadow-mapSize={quality==='high'?[1024,1024]:[512,512]}
   shadow-camera-left={-38} shadow-camera-right={38}
   shadow-camera-top={38} shadow-camera-bottom={-38} shadow-normalBias={.05}/>
 </>;
}
