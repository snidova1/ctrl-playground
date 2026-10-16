'use client';
import {useEffect,useRef,useState} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping} from 'three';
import {resolveCharacter,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import {loadCharacter,disposeVrm,type LoadedCharacter} from '@/features/plaza/characters/loader';
import {HumanoidAnimator} from '@/features/plaza/characters/animation';

type PreviewStatus={kind:'loading'|'ready'|'error';message?:string};
function PreviewModel({appearance,onStatus}:{appearance:CharacterAppearance;onStatus:(status:PreviewStatus)=>void}){
 const [character,setCharacter]=useState<LoadedCharacter|null>(null);
 const [error,setError]=useState('');
 const animator=useRef<HumanoidAnimator|null>(null);
 const definition=resolveCharacter(appearance);
 useEffect(()=>{
  onStatus({kind:'loading'});
  const controller=new AbortController();let current:LoadedCharacter|null=null;
  loadCharacter(definition,'low',controller.signal)
   .then(result=>{
    if(controller.signal.aborted){disposeVrm(result.vrm);return;}
    try{animator.current=new HumanoidAnimator(result);current=result;setCharacter(result);setError('');onStatus({kind:'ready'});}
    catch(e){disposeVrm(result.vrm);const message=e instanceof Error?e.message:'Unable to initialize preview.';setError(message);onStatus({kind:'error',message});}
   }).catch(reason=>{if(!controller.signal.aborted){const message=reason instanceof Error?reason.message:'Could not load the VRM.';setError(message);onStatus({kind:'error',message});}});
  return ()=>{controller.abort();animator.current?.dispose();animator.current=null;if(current)disposeVrm(current.vrm);};
 },[definition,onStatus]);
 useFrame((_,dt)=>{animator.current?.update(Math.min(dt,.05),{moving:false,sitting:false,celebrate:false,interactedAt:0});});
 if(error||!character)return null;
 return <group scale={character.scale} position={[0,character.floor,0]}><primitive object={character.vrm.scene} dispose={null}/></group>;
}
export default function CharacterCreatorPreview({appearance}:{appearance:CharacterAppearance}){
 const [status,setStatus]=useState<PreviewStatus>({kind:'loading'});
 return <div className='hb-avatar-preview' aria-label='Interactive 3D VRoid character preview'>
  <Canvas dpr={[1,1.5]} camera={{position:[0,1.32,4.5],fov:28,near:.1,far:30}} shadows={false} gl={{antialias:true,toneMapping:ACESFilmicToneMapping}}>
   <color attach='background' args={['#8ca99b']}/>
   <ambientLight intensity={.45}/>
   <hemisphereLight args={['#edfaff','#a9b4a5',.9]}/>
   <directionalLight intensity={1.6} position={[-2,4,5]}/>
   <directionalLight intensity={.35} position={[2,3,-4]}/>
   <mesh rotation-x={-Math.PI/2} position-y={-.015}>
    <circleGeometry args={[2.2,64]}/><meshStandardMaterial color='#9aaf99'/>
   </mesh>
   <PreviewModel appearance={appearance} onStatus={setStatus}/>
   <OrbitControls target={[0,.98,0]} enablePan={false} enableZoom={false} enableDamping dampingFactor={.07} minPolarAngle={Math.PI/2-0.16} maxPolarAngle={Math.PI/2+0.16}/>
  </Canvas>
  {status.kind==='loading'&&<span role='status' className='hb-preview-loading'>Loading VRoid character…</span>}
  {status.kind==='error'&&<span role='alert' className='hb-preview-error'>VRoid unavailable: {status.message}</span>}
  <div className='hb-avatar-preview-label'><span>VRoid · 3D Character Studio</span><span>Drag to rotate ↻</span></div>
 </div>;
}
