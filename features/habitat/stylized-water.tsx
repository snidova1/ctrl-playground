'use client';
import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {MeshStandardMaterial} from 'three';
import {POND} from './stylized-layout';

// Lightweight WebGL counterpart to the stylized-components water references:
// directional ripples + ellipse shore foam, without a transmission render pass.
export default function StylizedWater(){
 const uniforms=useMemo(()=>({uWaterTime:{value:0}}),[]);
 const material=useMemo(()=>{
  const m=new MeshStandardMaterial({color:'#77c4c0',roughness:.4,metalness:0});
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nvarying vec2 vWaterPoint;`)
    .replace('#include <begin_vertex>',`#include <begin_vertex>\nvWaterPoint=position.xy;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform float uWaterTime;varying vec2 vWaterPoint;`)
    .replace('#include <color_fragment>',`#include <color_fragment>
     float radius=length(vWaterPoint)/2.25;
     float wave=sin(vWaterPoint.x*12.+vWaterPoint.y*7.-uWaterTime*1.8+sin(vWaterPoint.y*3.+uWaterTime*.5));
     float ripple=smoothstep(.91,1.,wave)*.19;
     float foam=smoothstep(.83,.98,radius+sin(vWaterPoint.x*9.+uWaterTime)*.014)*.72;
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.97,.91),max(ripple,foam));`);
  };
  m.customProgramCacheKey=()=> 'habit-water-v1';return m;
 },[uniforms]);
 useFrame(({clock})=>{uniforms.uWaterTime.value=clock.elapsedTime;});
 useEffect(()=>()=>material.dispose(),[material]);
 return <group>
  <mesh rotation-x={-Math.PI/2} position={[POND.x,.025,POND.z]} scale={[1.55,1,1]} material={material} receiveShadow><circleGeometry args={[2.25,64]}/></mesh>
  {Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2;return <mesh key={i} position={[POND.x+Math.cos(a)*3.53,.07,POND.z+Math.sin(a)*2.32]} rotation-y={a} scale={[.48+(i%3)*.06,.19,.35]} castShadow receiveShadow><sphereGeometry args={[1,10,7]}/><meshStandardMaterial color={i%2?'#b5b69a':'#d1ccb1'} roughness={1}/></mesh>;})}
 </group>;
}
