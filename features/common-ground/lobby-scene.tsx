'use client';

import {Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type MutableRefObject, type ReactNode} from 'react';
import {Canvas, useFrame} from '@react-three/fiber';
import {Html, OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping, Group, Vector3} from 'three';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import {createCharacterMotion, defaultAppearance, resolveCharacter, type CharacterAppearance} from '@/features/plaza/characters/catalog';
import StylizedAtmosphere from '@/features/worldgacha/ghibli-atmosphere';
import type {AtmospherePreset} from '@/features/habitat/atmosphere-presets';
import OpenAirEnvironment, {CLEARING_BENCHES, CLEARING_SIGN, CLEARING_TREES} from './open-air-environment';
import {GARDEN_COLLIDERS} from './garden-decor';

interface LobbyInput {x:number; z:number; run:boolean}
interface LobbyProps {
  phase?:AtmospherePreset;
  appearance?:CharacterAppearance;
  input?:MutableRefObject<LobbyInput>;
  playable?:boolean;
  /** Freeze frames, not the mounted simulation/guest identity, behind the creator. */
  paused?:boolean;
}
const MOVEMENT_KEYS = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowLeft','ArrowDown','ArrowRight']);
const PLAYER_RADIUS = .34;
const COLLIDERS = [
  {x:0,z:0,r:1.65},
  ...CLEARING_TREES.map(t=>({x:t.x,z:t.z,r:.4*t.s})),
  {x:CLEARING_SIGN.x,z:CLEARING_SIGN.z,r:.18},
  ...GARDEN_COLLIDERS,
];
function inForm(target:EventTarget|null) {
  // A focused Run toggle is gameplay, not a form. Keep WASD / Shift usable
  // for keyboard and assistive users without enabling movement in dialogs.
  if(target instanceof Element && target.closest('[data-game-control="true"]'))return false;
  return target instanceof Element && !!target.closest('input,select,textarea,button,a,[role="button"],[role="link"],[contenteditable]:not([contenteditable="false"])');
}
function canStand(x:number,z:number) {
  if(Math.abs(x)>14-PLAYER_RADIUS||Math.abs(z)>12-PLAYER_RADIUS)return false;
  if(COLLIDERS.some(c=>Math.hypot(x-c.x,z-c.z)<c.r+PLAYER_RADIUS))return false;
  return !CLEARING_BENCHES.some(b=>{
    const dx=x-b.x,dz=z-b.z,c=Math.cos(b.rotation),s=Math.sin(b.rotation);
    return Math.abs(dx*c-dz*s)<1.22+PLAYER_RADIUS && Math.abs(dx*s+dz*c)<.42+PLAYER_RADIUS;
  });
}

function Clearing({phase,appearance,input,playable}:Required<Pick<LobbyProps,'phase'|'appearance'|'playable'>>&Pick<LobbyProps,'input'>) {
  const controls=useRef<ComponentRef<typeof OrbitControls>>(null);
  // Shared mutable simulation objects are intentionally stable: the VRM reads
  // pose each frame, so movement never drives React renders or waits for a model.
  const pose=useMemo(()=>({x:0,z:7,angle:Math.PI,moving:false}),[]);
  const motion=useRef(createCharacterMotion());
  const keys=useRef(new Set<string>()),focused=useRef(true),presentedFrame=useRef<number|null>(null);
  const fallback=useRef<Group>(null),avatarReadyRef=useRef(false);
  const [avatarReady,setAvatarReady]=useState(false);
  const vectors=useMemo(()=>({forward:new Vector3(),right:new Vector3(),delta:new Vector3()}),[]);
  const definition=resolveCharacter(appearance);
  const onAvatarReady=useCallback((ready:boolean)=>{avatarReadyRef.current=ready;setAvatarReady(ready);},[]);

  useEffect(()=>{
    if(!playable)return;
    const held=keys.current;
    const clear=()=>{
      held.clear();
      // This is a mutable input channel shared with the parent's touch controls.
      if(input)Object.assign(input.current,{x:0,z:0,run:false});
    };
    const down=(event:KeyboardEvent)=>{
      if(inForm(event.target)||event.ctrlKey||event.metaKey||event.altKey)return;
      if(MOVEMENT_KEYS.has(event.code)){held.add(event.code);event.preventDefault();}
      else if(event.code==='ShiftLeft'||event.code==='ShiftRight')held.add(event.code);
    };
    const up=(event:KeyboardEvent)=>{
      held.delete(event.code);
      if(MOVEMENT_KEYS.has(event.code)&&!inForm(event.target))event.preventDefault();
    };
    const blur=()=>{focused.current=false;clear();};
    const focus=()=>{focused.current=true;};
    const visibility=()=>{if(document.hidden)blur();else focus();};
    const formFocus=(event:FocusEvent)=>{if(inForm(event.target))clear();};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    window.addEventListener('blur',blur);window.addEventListener('focus',focus);
    document.addEventListener('visibilitychange',visibility);document.addEventListener('focusin',formFocus);
    return()=>{
      clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);
      window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);
      document.removeEventListener('visibilitychange',visibility);document.removeEventListener('focusin',formFocus);
    };
  },[playable,input]);

  // R3F is an imperative simulation: mutate only our memo-owned pose/vectors,
  // never React props/state or a useThree() return value. VRM shares this pose.
  /* eslint-disable react-hooks/immutability -- Stable R3F simulation objects are advanced inside the render loop. */
  useFrame(({camera,gl},delta)=>{
    const dt=Math.min(Math.max(delta,0),.05),orbit=controls.current;
    const previousX=pose.x,previousZ=pose.z;
    let x=0,z=0,run=false;
    if(playable&&focused.current) {
      const held=keys.current,touch=input?.current,keyboardActive=!inForm(document.activeElement);
      // Touch controls intentionally prevent focus/scroll. A header button may
      // still own focus after changing the light; do not silence fresh steering.
      if(keyboardActive) {
        x=Number(held.has('KeyD')||held.has('ArrowRight'))-Number(held.has('KeyA')||held.has('ArrowLeft'));
        z=Number(held.has('KeyS')||held.has('ArrowDown'))-Number(held.has('KeyW')||held.has('ArrowUp'));
      }
      if(touch&&Number.isFinite(touch.x)&&Number.isFinite(touch.z)){x+=touch.x;z+=touch.z;}
      run=(keyboardActive&&(held.has('ShiftLeft')||held.has('ShiftRight')))||!!touch?.run;
    }
    const strength=Math.min(1,Math.hypot(x,z));
    if(strength>.06) {
      const {forward,right}=vectors;
      camera.getWorldDirection(forward);forward.y=0;
      if(forward.lengthSq()<.001)forward.set(0,0,-1);else forward.normalize();
      right.set(-forward.z,0,forward.x);
      const length=Math.hypot(x,z),speed=(run?5:3)*dt*strength;
      const dx=(right.x*x-forward.x*z)/length*speed,dz=(right.z*x-forward.z*z)/length*speed;
      // Substeps and axis sliding prevent tunnelling/sticking on a bench corner.
      const steps=Math.max(1,Math.ceil(speed/.08));
      for(let i=0;i<steps;i++) {
        const nextX=Math.max(-14+PLAYER_RADIUS,Math.min(14-PLAYER_RADIUS,pose.x+dx/steps));
        const nextZ=Math.max(-12+PLAYER_RADIUS,Math.min(12-PLAYER_RADIUS,pose.z+dz/steps));
        if(canStand(nextX,pose.z))pose.x=nextX;
        if(canStand(pose.x,nextZ))pose.z=nextZ;
      }
      pose.angle=Math.atan2(dx,dz);
    }
    pose.moving=Math.hypot(pose.x-previousX,pose.z-previousZ)>.0001;
    // The same Run branch drives touch hold/toggle and both keyboard Shifts.
    motion.current.running=pose.moving&&run;
    if(orbit) {
      // Translate both ends by the same amount; preserve the user's drag orbit.
      vectors.delta.set(pose.x-orbit.target.x,1.05-orbit.target.y,pose.z-orbit.target.z);
      camera.position.add(vectors.delta);orbit.target.add(vectors.delta);orbit.update();
    }
    if(fallback.current) {
      fallback.current.position.set(pose.x,0,pose.z);
      fallback.current.rotation.y=pose.angle;
    }
    const canvas=gl.domElement;
    canvas.setAttribute('data-lobby-footprint','28x24');
    canvas.setAttribute('data-guest-x',pose.x.toFixed(3));canvas.setAttribute('data-guest-z',pose.z.toFixed(3));
    canvas.setAttribute('data-guest-avatar',`${appearance.gender}/${appearance.variantId}`);
    canvas.setAttribute('data-guest-gender',appearance.gender);canvas.setAttribute('data-guest-colorway',appearance.variantId);
    canvas.setAttribute('data-avatar-ready',String(avatarReadyRef.current));
    // A later frame proves the previous scene was actually submitted, without
    // gating the clearing on VRM/network readiness or an arbitrary timer.
    if(presentedFrame.current===null)presentedFrame.current=gl.info.render.frame;
    else if(gl.info.render.frame>presentedFrame.current&&gl.info.render.calls>0)canvas.setAttribute('data-lobby-ready','true');
  });
  /* eslint-enable react-hooks/immutability */

  return <>
    <StylizedAtmosphere preset={phase} quality='low' extent={150}/>
    <OpenAirEnvironment night={phase==='dusk'}/>
    {!avatarReady&&<group ref={fallback} name='guest-model-loading-marker'>
      <mesh position-y={.52}><capsuleGeometry args={[.2,.55,4,10]}/><meshStandardMaterial color='#d5c5a2' roughness={1}/></mesh>
      <mesh position-y={1.12}><sphereGeometry args={[.2,12,8]}/><meshStandardMaterial color='#f1dec0' roughness={1}/></mesh>
    </group>}
    <AvatarBoundary><Suspense fallback={null}>
      <VrmAvatar definition={definition} appearance={appearance} name='Guest' pose={pose} quality='low' motion={motion} sitting={false} celebrate={false} interactedAt={0} seatLift={0} showName={false} onReady={onAvatarReady}/>
    </Suspense></AvatarBoundary>
    <OrbitControls ref={controls} makeDefault target={[0,1.05,7]} enablePan={false} enableDamping dampingFactor={.12} minDistance={4} maxDistance={17} minPolarAngle={.42} maxPolarAngle={1.4} enableRotate={playable} enableZoom={playable}/>
  </>;
}

class AvatarBoundary extends Component<{children:ReactNode},{error:string}> {
  state={error:''};
  static getDerivedStateFromError(error:Error){return {error:error.message||'Avatar could not load.'};}
  render(){return this.state.error?<Html position={[0,2,7]} center><div role='status' style={{width:230,padding:12,background:'#f3ecd9',color:'#52634b',borderRadius:10}}>Avatar unavailable: {this.state.error}. You can still explore the clearing.</div></Html>:this.props.children;}
}
class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div role='status' style={{padding:24,color:'#52634b'}}>The meadow preview is unavailable. You can still use the sign-in controls.</div>:this.props.children;}
}

export default function LobbyScene({phase='afternoon',appearance=defaultAppearance,input,playable=false,paused=false}:LobbyProps) {
  const canvas=useRef<HTMLCanvasElement|null>(null);
  useEffect(()=>()=>{
    for(const name of ['data-lobby-ready','data-lobby-footprint','data-guest-x','data-guest-z','data-guest-avatar','data-guest-gender','data-guest-colorway','data-avatar-ready'])canvas.current?.removeAttribute(name);
  },[]);
  // Demand is insufficient: atmosphere/OrbitControls may keep invalidating it.
  // Never prevents GPU submissions until closing the creator restores always.
  return <SceneBoundary><Canvas ref={canvas} frameloop={paused?'never':'always'} data-render-paused={String(paused)} dpr={[1,1.25]} camera={{position:[0,3.5,16.5],fov:50,near:.1,far:300}} gl={{antialias:true,alpha:false,toneMapping:ACESFilmicToneMapping}} fallback={<div role='status' style={{padding:24,color:'#52634b'}}>WebGL is unavailable. Sign-in remains accessible.</div>} onCreated={({gl})=>gl.domElement.setAttribute('aria-label',playable?'Common Ground open-air meadow. WASD or arrow keys to walk, Shift to run; drag to look around.':'Common Ground open-air meadow preview.')}>
    <Clearing phase={phase} appearance={appearance} input={input} playable={playable}/>
  </Canvas></SceneBoundary>;
}
