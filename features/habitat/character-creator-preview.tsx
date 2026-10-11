'use client';
import {useEffect,useRef,useState} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Html,OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping} from 'three';
import {resolveCharacter,type CharacterAppearance} from '@/features/plaza/characters/catalog';
import {loadCharacter,disposeVrm,type LoadedCharacter} from '@/features/plaza/characters/loader';
import {applyCharacterAppearance} from '@/features/plaza/characters/appearance';
import {HumanoidAnimator} from '@/features/plaza/characters/animation';

function PreviewModel({appearance}:{appearance:CharacterAppearance}){
 const [character,setCharacter]=useState<LoadedCharacter|null>(null);
 const [error,setError]=useState('');
 const animator=useRef<HumanoidAnimator|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let current:LoadedCharacter|null=null;
  loadCharacter(resolveCharacter(appearance),'low',controller.signal)
   .then(result=>{
    if(controller.signal.aborted){disposeVrm(result.vrm);return;}
    try{applyCharacterAppearance(result.vrm,appearance);animator.current=new HumanoidAnimator(result);current=result;setCharacter(result);}
    catch(e){disposeVrm(result.vrm);setError(e instanceof Error?e.message:'Unable to initialize preview.');}
   }).catch(reason=>{if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:'Could not load the VRM.');});
  return ()=>{controller.abort();animator.current?.dispose();animator.current=null;if(current)disposeVrm(current.vrm);};
 },[appearance]);
 useFrame((_,dt)=>{animator.current?.update(Math.min(dt,.05),{moving:false,sitting:false,celebrate:false,interactedAt:0});});
 if(error)return <Html center position={[0,1,0]}><span role='alert' className='hb-preview-error'>VRoid unavailable: {error}</span></Html>;
 if(!character)return <Html center position={[0,1.1,0]}><span role='status' className='hb-preview-loading'>Loading VRoid character…</span></Html>;
 return <group scale={character.scale} position={[0,character.floor,0]}><primitive object={character.vrm.scene} dispose={null}/></group>;
}
export default function CharacterCreatorPreview({appearance}:{appearance:CharacterAppearance}){
 return <div className='hb-avatar-preview' aria-label='Interactive 3D VRoid character preview'>
  <Canvas dpr={[1,1.5]} camera={{position:[0,1.32,4.5],fov:28,near:.1,far:30}} shadows={false} gl={{antialias:true,toneMapping:ACESFilmicToneMapping}}>
   <color attach='background' args={['#dde8df']}/>
   <ambientLight intensity={1.15}/>
   <hemisphereLight args={['#edfaff','#a9b4a5',1.7]}/>
   <directionalLight intensity={2.1} position={[-2,4,5]}/>
   <directionalLight intensity={.65} position={[2,3,-4]}/>
   <mesh rotation-x={-Math.PI/2} position-y={-.015}>
    <circleGeometry args={[2.2,64]}/><meshStandardMaterial color='#c3d4c4'/>
   </mesh>
   <PreviewModel appearance={appearance}/>
   <OrbitControls target={[0,.98,0]} enablePan={false} enableZoom={false} enableDamping dampingFactor={.07} minPolarAngle={Math.PI/2-0.16} maxPolarAngle={Math.PI/2+0.16}/>
  </Canvas>
  <div className='hb-avatar-preview-label'><span>VRoid · 3D Character Studio</span><span>Drag to rotate ↻</span></div>
 </div>;
}
