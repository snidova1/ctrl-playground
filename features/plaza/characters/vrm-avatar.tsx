'use client';
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Group} from 'three';
import type {Pose} from '../types';
import {loadCharacter,disposeVrm,type LoadedCharacter} from './loader';
import {maleCharacter,normalizeAppearance,previewCharacter,type CharacterAppearance,type CharacterDefinition,type CharacterMotion,type CharacterQuality} from './catalog';
import {applyCharacterAppearance} from './appearance';
import {HumanoidAnimator} from './animation';
interface Props {onReady?:(ready:boolean)=>void;materialStyle?:'mtoon'|'liltoon';showName?:boolean;definition?:CharacterDefinition;variant?:string;appearance?:CharacterAppearance;local?:boolean;htmlPortal?:MutableRefObject<HTMLDivElement|null>;name:string;pose:Pose;quality:CharacterQuality;motion:MutableRefObject<CharacterMotion>;sitting:boolean;celebrate:boolean;interactedAt:number;seatLift:number;}
export default function VrmAvatar(props:Props) {
  const [character,setCharacter]=useState<LoadedCharacter|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
  const firstFrame=useRef(true),[initialAngle]=useState(props.pose.angle);
  const root=useRef<Group>(null),animator=useRef<HumanoidAnimator|null>(null),[initial]=useState<[number,number,number]>([props.pose.x,0,props.pose.z]);
  const definition=props.definition??previewCharacter;
  const gender=props.appearance?.gender??(definition.id===maleCharacter.id?'male':'female');
  const appearance=useMemo(()=>normalizeAppearance(props.appearance,gender,props.variant??'original'),[props.appearance,gender,props.variant]);
  const appearanceRef=useRef(appearance);
  useEffect(()=>{props.onReady?.(!!character&&!error);return()=>props.onReady?.(false);},[character,error,props.onReady]);
  useEffect(()=>{appearanceRef.current=appearance;},[appearance]);
  useEffect(()=>{
    const abort=new AbortController();let loaded:LoadedCharacter|undefined;
    loadCharacter(definition,props.quality,abort.signal,props.materialStyle).then(result=>{
      if(abort.signal.aborted){disposeVrm(result.vrm);return;}
      applyCharacterAppearance(result.vrm,appearanceRef.current);loaded=result;firstFrame.current=true;animator.current=new HumanoidAnimator(result);setCharacter(result);setError('');
    }).catch(e=>{if(!abort.signal.aborted)setError(e instanceof Error?e.message:'Character could not load.');});
    return()=>{abort.abort();animator.current?.dispose();animator.current=null;if(loaded)disposeVrm(loaded.vrm);};
  },[props.quality,definition,attempt,props.materialStyle]);
  useEffect(()=>{
    if(props.materialStyle!=='liltoon'||!character)return;
    const data=document.documentElement.dataset;
    data.ctrlAvatarToonCount=String(character.toonMaterialCount);
    data.ctrlAvatarExpressionCount=String(character.vrm.expressionManager?.expressions.length??0);
    return()=>{delete data.ctrlAvatarToonCount;delete data.ctrlAvatarExpressionCount;};
  },[character,props.materialStyle]);
  useEffect(()=>{if(character)applyCharacterAppearance(character.vrm,appearance);},[character,appearance]);
  useFrame((_,delta)=>{
    if(!character||!animator.current||!root.current)return;
    const dt=Math.min(delta,.05),r=root.current,p=props.pose;
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
  return <group ref={root} position={initial} rotation={[0,initialAngle,0]}><group scale={character.scale} position={[0,character.floor,0]}><primitive object={character.vrm.scene} dispose={null}/></group>{props.showName!==false&&<Html portal={props.htmlPortal?.current?{current:props.htmlPortal.current}:undefined} position={[0,2.1,0]} center distanceFactor={9} zIndexRange={[10,0]} style={{pointerEvents:'none'}}><span className='pl-name'>{props.local===false?props.name:'You'}</span></Html>}</group>;
}
