'use client';

import {useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BackSide, CanvasTexture, Color, DirectionalLight, Fog, HemisphereLight, Mesh, RepeatWrapping, ShaderMaterial, Vector3} from 'three';
import {ATMOSPHERE_LOOKS, transitionWeight, type AtmospherePreset} from './atmosphere-presets';

// Summer Cycle's coordinated palette/transition technique, implemented for
// CTRL's existing WebGL renderer rather than importing its engine or world.
const COLOR_KEYS = ['zenith','horizon','fog','sun','fill','ground','cloud','cloudShade'] as const;
const NUMBER_KEYS = ['intensity','ambient','hemisphere','elevation','azimuth','night'] as const;
type AtmosphereLook = Record<typeof COLOR_KEYS[number], Color> & Record<typeof NUMBER_KEYS[number], number>;
function lookFor(preset: AtmospherePreset): AtmosphereLook {
  const p = ATMOSPHERE_LOOKS[preset];
  const colors = Object.fromEntries(COLOR_KEYS.map(key => [key, new Color(p[key])])) as Record<typeof COLOR_KEYS[number], Color>;
  return {...colors,intensity:p.intensity,ambient:p.ambient,hemisphere:p.hemisphere,elevation:p.elevation,azimuth:p.azimuth,night:p.night};
}
function cloudTexture() {
  const canvas = document.createElement('canvas'); canvas.width=1024; canvas.height=512;
  const context=canvas.getContext('2d')!;
  context.fillStyle='#000';context.fillRect(0,0,1024,512);
  let seed=7301;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<23;i++){
    const x=random()*1024,y=50+random()*310,scale=25+random()*40;
    for(let l=0;l<6;l++){
      const cx=x+(l-2.5)*scale*.55,cy=y+Math.sin(l*1.8)*scale*.15,r=scale*(.45+random()*.5);
      const gradient=context.createRadialGradient(cx,cy,0,cx,cy,r);
      gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.63,'#dddddd');gradient.addColorStop(1,'#000000');
      context.globalCompositeOperation='lighter';context.fillStyle=gradient;
      context.fillRect(cx-r,cy-r,2*r,2*r);
    }
  }
  const texture=new CanvasTexture(canvas);texture.wrapS=RepeatWrapping;return texture;
}
const SKY_VERTEX = `varying vec3 vDirection; varying vec2 vCloudUV;
void main(){vDirection=normalize(position);vCloudUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const SKY_FRAGMENT = `
uniform vec3 uZenith,uHorizon,uCloud,uCloudShade,uSun,uSunDirection;
uniform float uTime,uNight;
uniform sampler2D uCloudMap;
varying vec3 vDirection;varying vec2 vCloudUV;
void main(){
  vec3 d=normalize(vDirection);float h=max(d.y,0.);
  vec3 sky=mix(uHorizon,uZenith,smoothstep(0.,.2,h));
  float glow=pow(max(dot(d,uSunDirection),0.),28.);
  sky+=uSun*glow*.22;
  float cloud=texture2D(uCloudMap,vec2(vCloudUV.x+uTime*.0014,h*3.5)).r;
  float coverage=smoothstep(.24,.91,cloud)*smoothstep(0.,.11,h)*(1.-smoothstep(.72,.98,h));
  vec3 cloudColor=mix(uCloudShade,uCloud,smoothstep(.25,.9,cloud));
  sky=mix(sky,cloudColor,coverage*.86);
  float disk=smoothstep(.9991,.99965,dot(d,uSunDirection));
  sky=mix(sky,uSun*1.2,disk);
  vec2 cell=floor(vCloudUV*vec2(200.,100.));
  float star=step(.997,fract(sin(dot(cell,vec2(12.9898,78.233)))*43758.5453));
  sky+=star*uNight*smoothstep(.15,.65,h)*.6*(1.-coverage);
  gl_FragColor=vec4(sky,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export default function StylizedAtmosphere({preset, quality}: {preset: AtmospherePreset; quality:'low'|'high'}) {
  const current=useRef(lookFor(preset));
  const transition=useRef({from:lookFor(preset),to:lookFor(preset),elapsed:3.6});
  const sun=useRef<DirectionalLight>(null),fill=useRef<HemisphereLight>(null),fog=useRef<Fog>(null),sky=useRef<Mesh>(null);
  const ambient=useRef<import('three').AmbientLight>(null);
  const direction=useMemo(()=>new Vector3(),[]);
  const texture=useMemo(cloudTexture,[]);
  const uniforms=useMemo(()=>({uZenith:{value:current.current.zenith},uHorizon:{value:current.current.horizon},uCloud:{value:current.current.cloud},uCloudShade:{value:current.current.cloudShade},uSun:{value:current.current.sun},uSunDirection:{value:direction},uTime:{value:0},uNight:{value:0},uCloudMap:{value:texture}}),[texture,direction]);
  const material=useMemo(()=>new ShaderMaterial({uniforms,vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,side:BackSide,depthWrite:false,depthTest:false}),[uniforms]);
  useEffect(()=>()=>{texture.dispose();material.dispose();},[texture,material]);
  useEffect(()=>{
    const from={...current.current};
    for(const key of COLOR_KEYS)from[key]=current.current[key].clone();
    transition.current={from,to:lookFor(preset),elapsed:0};
  },[preset]);
  useFrame(({clock,camera},delta)=>{
    const state=transition.current;state.elapsed=Math.min(3.6,state.elapsed+Math.max(0,delta));
    const t=transitionWeight(state.elapsed/3.6),look=current.current;
    for(const key of COLOR_KEYS)look[key].lerpColors(state.from[key],state.to[key],t);
    for(const key of NUMBER_KEYS)look[key]=state.from[key]+(state.to[key]-state.from[key])*t;
    const az=look.azimuth*Math.PI/180,el=look.elevation*Math.PI/180;
    direction.set(Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el));
    if(sun.current){sun.current.position.copy(direction).multiplyScalar(28);sun.current.color.copy(look.sun);sun.current.intensity=look.intensity;}
    if(fill.current){fill.current.color.copy(look.fill);fill.current.groundColor.copy(look.ground);fill.current.intensity=look.hemisphere;}
    if(ambient.current){ambient.current.color.copy(look.fill);ambient.current.intensity=look.ambient;}
    if(fog.current)fog.current.color.copy(look.fog);
    if(sky.current)sky.current.position.copy(camera.position);
    uniforms.uTime.value=clock.elapsedTime;uniforms.uNight.value=look.night;
  });
  return <>
    <ambientLight ref={ambient}/>
    <hemisphereLight ref={fill}/>
    <directionalLight ref={sun} castShadow={quality==='high'} shadow-mapSize={[2048,2048]} shadow-camera-left={-23} shadow-camera-right={23} shadow-camera-top={23} shadow-camera-bottom={-23} shadow-camera-near={.1} shadow-camera-far={85} shadow-bias={-.00015} shadow-normalBias={.035}/>
    <fog ref={fog} attach='fog' args={['#c6d8bb',24,66]}/>
    <mesh ref={sky} material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[85,32,16]}/>
    </mesh>
  </>;
}
