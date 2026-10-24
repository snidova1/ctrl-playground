'use client';
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Group,Mesh} from 'three';
import type {Pose} from '../types';
import {maleCharacter,normalizeAppearance,previewCharacter,type CharacterAppearance,type CharacterDefinition,type CharacterMotion,type CharacterQuality} from './catalog';
import StorybookModel from './storybook-model';

export type StorybookAction='idle'|'walk'|'run'|'jump'|'sit'|'wave';
export interface AvatarProps {
  onError?:(error:string)=>void;hideErrorUI?:boolean;groundHeight?:()=>number;
  onReady?:(ready:boolean)=>void;materialStyle?:'mtoon'|'liltoon';showName?:boolean;
  definition?:CharacterDefinition;variant?:string;appearance?:CharacterAppearance;local?:boolean;
  htmlPortal?:MutableRefObject<HTMLDivElement|null>;name:string;pose:Pose;quality:CharacterQuality;
  motion:MutableRefObject<CharacterMotion>;sitting:boolean;celebrate:boolean;interactedAt:number;seatLift:number;
}
/** Original authored geometry. The old VRM import path is only an API compatibility facade. */
export default function StorybookAvatar(props:AvatarProps){
  const definition=props.definition??previewCharacter;
  const gender=props.appearance?.gender??(definition.id===maleCharacter.id?'male':'female');
  const appearance=useMemo(()=>normalizeAppearance(props.appearance,gender,props.variant??'original'),[props.appearance,gender,props.variant]);
  const root=useRef<Group>(null),action=useRef<StorybookAction>('idle'),inspected=useRef(false);
  const ready=useRef(props.onReady);
  useEffect(()=>{ready.current=props.onReady;},[props.onReady]);
  useEffect(()=>{ready.current?.(true);return()=>ready.current?.(false);},[]);
  const [initial]=useState<[number,number,number]>(()=>[props.pose.x,0,props.pose.z]);
  const [initialAngle]=useState(()=>props.pose.angle);
  useFrame((_,delta)=>{
    const r=root.current;if(!r)return;
    if(!inspected.current){
      let meshes=0;const materials=new Set();
      r.traverse(o=>{if(o instanceof Mesh){meshes++;for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});
      const data=document.documentElement.dataset;
      data.ctrlAvatarRenderer='storybook-v1';data.ctrlAvatarMeshCount=String(meshes);data.ctrlAvatarMaterialCount=String(materials.size);
      delete data.ctrlAvatarToonCount;delete data.ctrlAvatarExpressionCount;
      inspected.current=true;
    }
    const dt=Math.min(.05,Math.max(0,delta)),p=props.pose,m=props.motion.current;
    r.position.x+=(p.x-r.position.x)*(1-Math.exp(-30*dt));
    r.position.z+=(p.z-r.position.z)*(1-Math.exp(-30*dt));
    const y=(props.groundHeight?.()??0)+(props.sitting?props.seatLift:m.height);
    r.position.y+=(y-r.position.y)*(1-Math.exp(-35*dt));
    r.rotation.y+=Math.atan2(Math.sin(p.angle-r.rotation.y),Math.cos(p.angle-r.rotation.y))*(1-Math.exp(-15*dt));
    action.current=props.sitting?'sit':m.airborne?'jump':p.moving?(m.running?'run':'walk'):props.celebrate||Date.now()-props.interactedAt<1050?'wave':'idle';
    // Mutable simulation input is read by the rig every frame, not via React rerenders.
    r.userData.characterAction=action.current;
  });
  return <group ref={root} position={initial} rotation={[0,initialAngle,0]} userData={{avatarRenderer:'storybook-v1'}}>
    <StorybookModel appearance={appearance} action='idle' quality={props.quality}/>
    {props.showName!==false&&<Html portal={props.htmlPortal?.current?{current:props.htmlPortal.current}:undefined} position={[0,2.02,0]} center distanceFactor={9} zIndexRange={[10,0]} style={{pointerEvents:'none'}}><span className='pl-name'>{props.local===false?props.name:'You'}</span></Html>}
  </group>;
}
