'use client';
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Group} from 'three';
import {createPortal} from '@react-three/fiber';
import type {GuestStyle} from '@/features/habitat/guest';
import type {Pose} from '../types';
import {loadCharacter,disposeVrm,type LoadedCharacter} from './loader';
import {maleCharacter,normalizeAppearance,previewCharacter,type CharacterAppearance,type CharacterDefinition,type CharacterMotion,type CharacterQuality} from './catalog';
import {applyCharacterAppearance} from './appearance';
import {HumanoidAnimator,type SocialAnimation} from './animation';
interface Props {workUntil?:number;socialAction?:SocialAnimation;poseRef?:MutableRefObject<Pose>;speech?:string;speechAt?:number;guestStyle?:GuestStyle;definition?:CharacterDefinition;variant?:string;appearance?:CharacterAppearance;local?:boolean;htmlPortal?:MutableRefObject<HTMLDivElement|null>;name:string;pose:Pose;quality:CharacterQuality;motion:MutableRefObject<CharacterMotion>;sitting:boolean;celebrate:boolean;interactedAt:number;seatLift:number;}
function SpeechBubble({text,at}:{text:string;at:number}){const [visible,setVisible]=useState(true);useEffect(()=>{const timer=setTimeout(()=>setVisible(false),Math.max(0,8000-(Date.now()-at)));return()=>clearTimeout(timer);},[at]);return visible?<span className='hb-speech'>{text}</span>:null;}
export default function VrmAvatar(props:Props) {
  const [character,setCharacter]=useState<LoadedCharacter|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const firstFrame=useRef(true),[initialAngle]=useState(props.pose.angle);
  const root=useRef<Group>(null),animator=useRef<HumanoidAnimator|null>(null),[initial]=useState<[number,number,number]>([props.pose.x,0,props.pose.z]);
  const definition=props.definition??previewCharacter;
  const gender=props.appearance?.gender??(definition.id===maleCharacter.id?'male':'female');
  const appearance=useMemo(()=>normalizeAppearance(props.appearance,gender,props.variant??'original'),[props.appearance,gender,props.variant]);
  const appearanceRef=useRef(appearance);
  useEffect(()=>{appearanceRef.current=appearance;},[appearance]);
  useEffect(()=>{
    const abort=new AbortController();let loaded:LoadedCharacter|undefined;
    loadCharacter(definition,props.quality,abort.signal).then(result=>{
      if(abort.signal.aborted){disposeVrm(result.vrm);return;}
      applyCharacterAppearance(result.vrm,appearanceRef.current);loaded=result;firstFrame.current=true;animator.current=new HumanoidAnimator(result);setCharacter(result);setError('');
    }).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Character could not load.');});
    return()=>{abort.abort();animator.current?.dispose();animator.current=null;if(loaded)disposeVrm(loaded.vrm);};
  },[props.quality,definition,attempt]);
  useEffect(()=>{if(character)applyCharacterAppearance(character.vrm,appearance,props.guestStyle);},[character,appearance,props.guestStyle]);
  useFrame((_,delta)=>{
    if(!character||!animator.current||!root.current)return;
    const dt=Math.min(delta,.05),r=root.current,p=props.poseRef?.current??props.pose;
    r.position.x+=(p.x-r.position.x)*(1-Math.exp(-30*dt));
    r.position.z+=(p.z-r.position.z)*(1-Math.exp(-30*dt));
    const y=props.sitting?props.seatLift:props.motion.current.height;
    r.position.y+=(y-r.position.y)*(1-Math.exp(-35*dt));
    r.rotation.y+=Math.atan2(Math.sin(p.angle-r.rotation.y),Math.cos(p.angle-r.rotation.y))*(1-Math.exp(-15*dt));
    if(firstFrame.current){r.updateMatrixWorld(true);character.vrm.springBoneManager?.reset();firstFrame.current=false;}
    animator.current.update(delta,{...props,moving:p.moving,motion:props.motion.current});
  });
  if(error)return <Html portal={props.htmlPortal?.current?{current:props.htmlPortal.current}:undefined} position={[props.pose.x,2.5,props.pose.z]} center><div className='pl-character-error' role='alert'><strong>VRoid character unavailable</strong><p>{error}</p><button onClick={()=>{setError('');setCharacter(null);setAttempt(v=>v+1);}}>Retry VRoid character</button></div></Html>;
  if(!character)return null;
  return <group ref={root} position={initial} rotation={[0,initialAngle,0]}><group scale={character.scale} position={[0,character.floor,0]}><primitive object={character.vrm.scene} dispose={null}/>{props.guestStyle?.accessory!=='none'&&props.guestStyle&&character.vrm.humanoid.getNormalizedBoneNode('head')&&createPortal(<group>{props.guestStyle.accessory==='beret'?<mesh position={[0,.18,.01]} scale={[1,.35,1]}><sphereGeometry args={[.14,12,8]}/><meshStandardMaterial color={props.guestStyle?.accent}/></mesh>:<group position={[0,.05,.09]}>{[-.045,.045].map(x=><mesh key={x} position-x={x}><torusGeometry args={[.035,.005,6,16]}/><meshStandardMaterial color={props.guestStyle?.accent}/></mesh>)}</group>}</group>,character.vrm.humanoid.getNormalizedBoneNode('head')!)}</group><Html portal={props.htmlPortal?.current?{current:props.htmlPortal.current}:undefined} position={[0,2.1,0]} center distanceFactor={9} zIndexRange={[10,0]} style={{pointerEvents:'none'}}><span className='pl-name'>{props.local===false?props.name:'You'}</span>{props.speech&&<SpeechBubble key={props.speechAt} text={props.speech} at={props.speechAt??0}/>}</Html></group>;
}
