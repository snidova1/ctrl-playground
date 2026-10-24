'use client';
import {useEffect,useMemo,useState} from 'react';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping} from 'three';
import {createCharacterMotion,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import VrmAvatar,{type AvatarGestureRequest} from '@/features/plaza/characters/vrm-avatar';

type Action='idle'|'walk'|'run'|'jump'|'sit'|'wave';
function StudioCamera({framing}:{framing:'full'|'portrait'}){
 const camera=useThree(s=>s.camera);
 useEffect(()=>{camera.position.set(0,framing==='portrait'?1.58:1.02,framing==='portrait'?1.45:4.25);camera.lookAt(0,framing==='portrait'?1.58:.93,0);camera.updateProjectionMatrix();},[camera,framing]);
 return null;
}
function PreviewModel({appearance,action,gesture,onReady,onError}:{appearance:CharacterAppearance;action:Action;gesture?:AvatarGestureRequest;onReady:(ready:boolean)=>void;onError:(message:string)=>void}){
 const quality=useThree(s=>s.size.width<480?'low':'high');
 const pose=useMemo(()=>({x:0,z:0,angle:0,moving:action==='walk'||action==='run'}),[action]);
 const motion=useMemo(()=>({current:{...createCharacterMotion(),running:action==='run',airborne:action==='jump'}}),[action]);
 const legacyGesture=useMemo<AvatarGestureRequest>(()=>({id:action==='wave'?'interact':null,sequence:0}),[action]);
 return <VrmAvatar gesture={gesture??legacyGesture} appearance={appearance} quality={quality} name='Character' pose={pose} motion={motion} sitting={action==='sit'} celebrate={false} interactedAt={-Infinity} seatLift={0} showName={false} onReady={onReady} onError={onError} hideErrorUI/>;
}
/** Same textured skinned model and animation engine as the live player. */
export default function CharacterCreatorPreview({appearance,action='idle',gesture,framing='full'}:{appearance:CharacterAppearance;action?:Action;gesture?:AvatarGestureRequest;framing?:'full'|'portrait'}){
 const [ready,setReady]=useState(false),[error,setError]=useState('');
 return <div className='hb-avatar-preview' aria-label='Interactive 3D character preview' data-avatar-renderer='anime-vrm-mtoon' data-avatar-ready={String(ready)}>
  <Canvas dpr={[1,1.5]} camera={{position:[0,1.02,4.25],fov:28,near:.1,far:30}} shadows gl={{antialias:true,toneMapping:ACESFilmicToneMapping}}>
   <StudioCamera framing={framing}/>
   <color attach='background' args={['#e9e5d9']}/>
   <ambientLight intensity={.55}/>
   <hemisphereLight args={['#fff9f0','#9fae96',.8]}/>
   <directionalLight intensity={1.65} position={[-3,4,5]} castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-2} shadow-camera-right={2} shadow-camera-top={3} shadow-camera-bottom={-1} shadow-bias={-.0002} shadow-normalBias={.015}/>
   <directionalLight intensity={.65} color='#d8e8f0' position={[3,2,-3]}/>
   <mesh rotation-x={-Math.PI/2} position-y={-.012} receiveShadow><circleGeometry args={[2.3,64]}/><meshStandardMaterial color='#ddd7c5' roughness={1}/></mesh>
   <mesh position={[0,-.055,0]} receiveShadow><cylinderGeometry args={[.65,.69,.08,64]}/><meshStandardMaterial color='#e9dfc9' roughness={.85}/></mesh>
   <PreviewModel appearance={appearance} action={action} gesture={gesture} onReady={next=>{setReady(next);if(next)setError('');}} onError={setError}/>
   <OrbitControls target={[0,framing==='portrait'?1.58:.93,0]} enablePan={false} enableZoom={false} enableDamping dampingFactor={.07} minPolarAngle={Math.PI/2-.23} maxPolarAngle={Math.PI/2+.2}/>
  </Canvas>
  {!ready&&!error&&<span role='status' className='hb-preview-loading'>Loading your character…</span>}
  {error&&<span role='alert' className='hb-preview-loading'>{error}</span>}
  <div className='hb-avatar-preview-label'><span>CTRL · Textured anime VRM</span><span>Drag to rotate ↻</span></div>
 </div>;
}
