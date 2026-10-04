"use client";
import {useRef,useEffect} from "react";
import {useFrame,useThree,type ThreeEvent} from "@react-three/fiber";
import {MathUtils,Group} from "three";
import {useQuality} from "./quality";
export function CameraRig(){const quality=useQuality(),camera=useThree(s=>s.camera),base=useRef(camera.position.clone());useFrame(({pointer,camera:frameCamera},delta)=>{if(quality!=="desktop")return;frameCamera.position.x=MathUtils.damp(frameCamera.position.x,base.current.x+pointer.x*.3,3,delta);frameCamera.position.y=MathUtils.damp(frameCamera.position.y,base.current.y+pointer.y*.15,3,delta);frameCamera.lookAt(0,0,0);});return null;}
export function TransitionManager({children,selected}:{children:React.ReactNode;selected:boolean}){const group=useRef<Group>(null);const q=useQuality();useFrame((_s,delta)=>{if(group.current){const target=selected?1.08:1;const next=q==="reduced"?target:MathUtils.damp(group.current.scale.x,target,6,delta);group.current.scale.setScalar(next);}});return <group ref={group}>{children}</group>;}
export function PointerManager({onSelect,children}:{onSelect:()=>void;children:React.ReactNode}){const gl=useThree(s=>s.gl);useEffect(()=>()=>{gl.domElement.style.removeProperty("cursor");},[gl]);return <group onPointerOver={(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();gl.domElement.style.setProperty("cursor","pointer");}} onPointerOut={()=>{gl.domElement.style.setProperty("cursor","grab");}} onClick={e=>{e.stopPropagation();onSelect();}}>{children}</group>;}
export function PostProcessingManager(){const gl=useThree(s=>s.gl);useEffect(()=>{gl.setClearAlpha(1);},[gl]);return null;}
