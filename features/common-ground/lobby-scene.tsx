'use client';
import {Component,Suspense,useEffect,useMemo,useRef,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import {ACESFilmicToneMapping,MeshStandardMaterial} from 'three';
import {plasterTextures,woodTextures} from '@/features/worldgacha/vendor/anime-textures';
import {Box,Sign} from '@/features/plaza/mesh-kit';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import {createCharacterMotion} from '@/features/plaza/characters/catalog';
import StylizedAtmosphere from '@/features/worldgacha/ghibli-atmosphere';
import type {AtmospherePreset} from '@/features/habitat/atmosphere-presets';

function Plant({x,z,scale=1}:{x:number;z:number;scale?:number}){
 return <group position={[x,0,z]} scale={scale}><mesh position-y={.28} castShadow><cylinderGeometry args={[.32,.23,.56,16]}/><meshStandardMaterial color='#bb896e' roughness={1}/></mesh><mesh position-y={.55}><cylinderGeometry args={[.26,.26,.025,16]}/><meshStandardMaterial color='#665b44'/></mesh>{[0,1,2,3,4].map(i=><group key={i} rotation-y={i*2.4}><mesh position={[.13,.8+i*.09,0]} rotation-z={-.38} scale={[.24,.42,.18]} castShadow><sphereGeometry args={[1,12,8]}/><meshStandardMaterial color={i%2?'#68825d':'#8c9e6a'} roughness={1}/></mesh></group>)}</group>;
}
function Room({phase}:{phase:AtmospherePreset}){
 const {gl}=useThree(),motion=useRef(createCharacterMotion()),pose=useMemo(()=>({x:-1.35,z:.4,angle:.6,moving:false}),[]);
 const surfaces=useMemo(()=>{const plaster=plasterTextures(0xf3ebd7,147),wood=woodTextures(0xc9b38d,0x998467,223);wood.map.repeat.set(3,2);return {wall:new MeshStandardMaterial({map:plaster.map,normalMap:plaster.normalMap,color:'#e4d9be',roughness:1}),floor:new MeshStandardMaterial({map:wood.map,roughness:1}),textures:[plaster.map,plaster.normalMap,wood.map,wood.normalMap]};},[]);
 useEffect(()=>()=>{surfaces.wall.dispose();surfaces.floor.dispose();surfaces.textures.forEach(t=>t?.dispose());},[surfaces]);
 useFrame(({gl:renderer})=>{if(renderer.info.render.calls>4&&!renderer.domElement.hasAttribute('data-lobby-ready'))renderer.domElement.setAttribute('data-lobby-ready','true');});
   useEffect(()=>{gl.domElement.setAttribute('data-lobby-footprint','8x7');return()=>{gl.domElement.removeAttribute('data-lobby-ready');};},[gl]);
 return <><StylizedAtmosphere preset={phase} quality='low' extent={45}/><hemisphereLight args={['#fff3de','#9aab91',.6]}/>
 <group name='common-ground-small-waiting-room'>
  <Box position={[0,-.24,0]} size={[8,.45,7]} color='#acaa91'/><mesh position={[0,.015,0]} material={surfaces.floor} receiveShadow><boxGeometry args={[7.8,.06,6.8]}/></mesh>
  {Array.from({length:16},(_,i)=><Box key={i} position={[-3.7+i*.49,.053,0]} size={[.014,.005,6.6]} color='#b7a280'/>)}
  <mesh position={[0,1.55,-3.35]} material={surfaces.wall}><boxGeometry args={[7.8,3.1,.16]}/></mesh><mesh position={[-3.85,1.55,0]} material={surfaces.wall}><boxGeometry args={[.16,3.1,6.8]}/></mesh>
  {[-3.8,0,3.8].map(x=><Box key={x} position={[x,1.6,-3.22]} size={[.13,3.2,.13]} color='#6c7059'/>)}
  <Box position={[0,3.12,-3.2]} size={[7.9,.16,.21]} color='#697259'/><Box position={[-3.72,3.12,0]} size={[.2,.16,6.7]} color='#697259'/>
  <Box position={[0,.25,3.28]} size={[7.8,.4,.15]} color='#a6af8b'/>
  {/* A garden window, not a fake working portal. */}
  <Box position={[-2,1.95,-3.23]} size={[2.65,1.65,.07]} color='#788b72'/><Box position={[-2,1.95,-3.16]} size={[2.37,1.38,.035]} color='#a7c6be'/>
  <Box position={[-2,1.95,-3.12]} size={[.065,1.4,.07]} color='#f2e3c5'/><Box position={[-2,1.95,-3.12]} size={[2.4,.065,.07]} color='#f2e3c5'/>
  <Box position={[-2,1.13,-3.02]} size={[2.8,.12,.42]} color='#a49a79'/>
  <Sign text='COMMON GROUND' position={[1.8,2.35,-3.21]} width={2.35} height={.38} size={78} color='#63745d'/>
  <Sign text='A moment before the world.' position={[1.8,1.92,-3.21]} width={2.5} height={.25} size={60} color='#8c8d71'/>
  {/* Small seating nook and a tea table; no editor, plots or plaza workshop. */}
  <group position={[1.65,0,-1.85]}><Box position={[0,.52,0]} size={[2.7,.2,.9]} color='#8c8b6b'/><Box position={[0,.9,-.38]} size={[2.7,.72,.13]} color='#9ca183'/>{[-1.05,1.05].map(x=><Box key={x} position={[x,.27,0]} size={[.13,.54,.7]} color='#686e58'/>)}<Box position={[0,.67,0]} size={[2.35,.16,.68]} color='#cbbb98'/></group>
  <mesh position={[1.6,.72,.1]} castShadow><cylinderGeometry args={[.75,.75,.13,24]}/><meshStandardMaterial color='#c0a27b' roughness={1}/></mesh><Box position={[1.6,.35,.1]} size={[.17,.7,.17]} color='#777d62'/>
  <mesh position={[1.75,.88,.13]}><cylinderGeometry args={[.09,.07,.18,12]}/><meshStandardMaterial color='#f4e7c9'/></mesh>
  <Plant x={-3} z={-2.4} scale={1.1}/><Plant x={3.2} z={-2.8}/><Plant x={-3.2} z={2.5} scale={.8}/><Plant x={3.2} z={2.6} scale={.9}/>
  <Suspense fallback={null}><VrmAvatar name='Visitor' pose={pose} quality='low' motion={motion} sitting={false} celebrate={false} interactedAt={0} seatLift={0} showName={false} hideErrorUI/></Suspense>
 </group><OrbitControls makeDefault target={[0,1.1,0]} enablePan={false} minDistance={7} maxDistance={15} minAzimuthAngle={.15} maxAzimuthAngle={1.25} minPolarAngle={.7} maxPolarAngle={1.35}/></>;
}
class RoomBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div role='status' style={{padding:24,color:'#52634b'}}>The room preview is unavailable. You can still continue using the sign-in controls.</div>:this.props.children;}}
export default function LobbyScene({phase='afternoon'}:{phase?:AtmospherePreset}){
 return <RoomBoundary><Canvas dpr={[1,1.25]} camera={{position:[8,5.8,10],fov:43,near:.1,far:250}} gl={{antialias:true,alpha:false,toneMapping:ACESFilmicToneMapping}} onCreated={({gl})=>gl.domElement.setAttribute('aria-label','Common Ground compact garden waiting room. Drag to look around.')}><Room phase={phase}/></Canvas></RoomBoundary>;
}
