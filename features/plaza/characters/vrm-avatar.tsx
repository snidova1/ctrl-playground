'use client';
import {useEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Box3,Group,Mesh,SkinnedMesh,Vector3} from 'three';
import type {Pose} from '../types';
import {loadCharacter,disposeVrm,type LoadedCharacter} from './loader';
import {maleCharacter,normalizeAppearance,resolveCharacter,type CharacterAppearance,type CharacterDefinition,type CharacterMotion,type CharacterQuality} from './catalog';
import {applyCharacterAppearance} from './appearance';
import {HumanoidAnimator} from './animation';
import {modularSelectionKey} from './modular-catalog';
import {resetModularSprings} from './modular-runtime';
import {syncGestureExpression} from './gesture-expression';
import {seatedRootTargetY} from './seat-alignment';
import {sampleSeatedSupport} from './seat-contact';
export interface AvatarGestureRequest {id:'interact'|'victory'|null;sequence:number;}
interface Props {renderPose?:MutableRefObject<Pose>;gesture?:AvatarGestureRequest;onError?:(error:string)=>void;hideErrorUI?:boolean;groundHeight?:()=>number;onReady?:(ready:boolean)=>void;materialStyle?:'mtoon'|'liltoon';showName?:boolean;definition?:CharacterDefinition;variant?:string;appearance?:CharacterAppearance;local?:boolean;htmlPortal?:MutableRefObject<HTMLDivElement|null>;name:string;pose:Pose;quality:CharacterQuality;motion:MutableRefObject<CharacterMotion>;sitting:boolean;celebrate:boolean;interactedAt:number;seatLift:number;seatSurfaceY?:number;}

/** All live worlds and the creator use the actual textured, skinned VRM model. */
export default function VrmAvatar(props:Props){
 const gender=props.appearance?.gender??(props.definition?.id===maleCharacter.id?'male':'female');
 const appearance=useMemo(()=>normalizeAppearance(props.appearance,gender,props.variant??'original'),[props.appearance,gender,props.variant]);
 const definition=appearance.modular||appearance.lookId==='alternate'?resolveCharacter(appearance):props.definition??resolveCharacter(appearance);
 // Preserve the asset author's MToon shading for the authored anime models.
 const style=definition.id.startsWith('ctrl-anime-')||appearance.modular?'mtoon':props.materialStyle??'mtoon';
 return <VrmInstance key={`${definition.id}:${props.quality}:${style}:${appearance.hairStyleId??'source'}:${appearance.wardrobeId??'source'}:${modularSelectionKey(appearance.modular)}`} {...props} definition={definition} appearance={appearance} materialStyle={style}/>;
}
function VrmInstance(props:Props&{definition:CharacterDefinition;appearance:CharacterAppearance;materialStyle:'mtoon'|'liltoon'}){
 const [character,setCharacter]=useState<LoadedCharacter|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 const root=useRef<Group>(null),animator=useRef<HumanoidAnimator|null>(null),firstFrame=useRef(true);
 const hipPosition=useMemo(()=>new Vector3(),[]);
 const boundsNonce=useRef('');
 const seatTravel=useRef({active:false,standing:false,from:new Vector3(),angle:0});
 const seatedContact=useRef<{age:number;sample:ReturnType<typeof sampleSeatedSupport>;settled:boolean;attempted:boolean}>({age:0,sample:undefined,settled:false,attempted:false});
 // A remounted avatar must not replay an old UI command. Commands received
 // during loading are consumed once the new animator is ready.
 const lastGesture=useRef(props.gesture);
 const gestureMood=useRef<'interact'|'victory'|null>(null);
 const [initial]=useState<[number,number,number]>(()=>[props.pose.x,0,props.pose.z]),[initialAngle]=useState(()=>props.pose.angle);
 const ready=useRef(props.onReady),failure=useRef(props.onError),appearance=useRef(props.appearance);
 const modularKey=modularSelectionKey(props.appearance.modular);
 useEffect(()=>{ready.current=props.onReady;failure.current=props.onError;appearance.current=props.appearance;});
 useEffect(()=>{ready.current?.(false);return()=>ready.current?.(false);},[]);
 useEffect(()=>{
  const abort=new AbortController();let loaded:LoadedCharacter|undefined;
  loadCharacter(props.definition,props.quality,abort.signal,props.materialStyle,props.appearance.hairStyleId,props.appearance.wardrobeId,props.appearance.modular).then(result=>{
   if(abort.signal.aborted){disposeVrm(result.vrm);return;}
   loaded=result;
   applyCharacterAppearance(result.vrm,appearance.current);
   firstFrame.current=true;animator.current=new HumanoidAnimator(result);setCharacter(result);setError('');
  }).catch(e=>{if(!abort.signal.aborted){const message=e instanceof Error?e.message:'Character could not load.';setError(message);failure.current?.(message);}});
  return()=>{abort.abort();animator.current?.dispose();animator.current=null;if(loaded)disposeVrm(loaded.vrm);};
 },[props.definition,props.quality,props.materialStyle,props.appearance.hairStyleId,props.appearance.wardrobeId,modularKey,attempt]);
 useEffect(()=>{if(character){applyCharacterAppearance(character.vrm,props.appearance);document.documentElement.dataset.ctrlAvatarAccessoryCount=String(character.vrm.scene.userData.ctrlAccessoryCount??0);document.documentElement.dataset.ctrlAvatarExpression=String(character.vrm.scene.userData.ctrlExpression??'neutral');}},[character,props.appearance]);
 useFrame((_,delta)=>{
  if(!character||!animator.current||!root.current)return;
  const dt=Math.min(.05,Math.max(0,delta)),r=root.current,p=props.pose;
  // Position/rotation follow the same seating timeline as the bones below.
  if(firstFrame.current){
   r.updateMatrixWorld(true);character.vrm.springBoneManager?.reset();resetModularSprings(character.vrm);firstFrame.current=false;
   let meshes=0;const materials=new Set();
   character.vrm.scene.traverse(o=>{if(o instanceof Mesh){meshes++;for(const material of Array.isArray(o.material)?o.material:[o.material])materials.add(material);}});
   const data=document.documentElement.dataset;
   data.ctrlAvatarInstance=character.vrm.scene.uuid;
   data.ctrlAvatarRenderer=props.definition.id.startsWith('ctrl-anime-')||props.appearance.modular?'anime-vrm-mtoon':'vrm';data.ctrlAvatarModel=props.definition.id;
   data.ctrlAvatarMeshCount=String(meshes);data.ctrlAvatarMaterialCount=String(materials.size);
   data.ctrlAvatarToonCount=String(character.toonMaterialCount);data.ctrlAvatarExpressionCount=String(character.vrm.expressionManager?.expressions.length??0);
   data.ctrlAvatarHairStyle=String(character.vrm.scene.userData.ctrlHairStyleId??'source');
   data.ctrlAvatarWardrobe=String(character.vrm.scene.userData.ctrlWardrobeId??'source');
   data.ctrlAvatarModularFamily=String(character.vrm.scene.userData.ctrlAvatarModularFamily??'');
   data.ctrlAvatarModularParts=JSON.stringify(character.vrm.scene.userData.ctrlAvatarModularParts??[]);
   ready.current?.(true);
  }
  if(lastGesture.current?.sequence!==props.gesture?.sequence||lastGesture.current?.id!==props.gesture?.id){
   lastGesture.current=props.gesture;
   if(props.gesture?.id)animator.current.playGesture(props.gesture.id);else animator.current.cancelGesture();
  }
  animator.current.update(delta,{...props,moving:p.moving,motion:props.motion.current});
  const state=animator.current.state,progress=animator.current.seatProgress,ease=progress*progress*(3-2*progress),travel=seatTravel.current;
  if(props.sitting)travel.active=true;
  if(state==='StandUp'&&!travel.standing){travel.from.copy(r.position);travel.angle=r.rotation.y;}
  travel.standing=state==='StandUp';
  const targetX=travel.standing?travel.from.x+(p.x-travel.from.x)*ease:p.x,targetZ=travel.standing?travel.from.z+(p.z-travel.from.z)*ease:p.z;
  const dx=targetX-r.position.x,dz=targetZ-r.position.z,distance=Math.hypot(dx,dz);
  // Short seat alignment/return is speed-limited, never a one-frame snap to the
  // anchor or back to the previous standing position. Walk cancellation stays responsive.
  const follow=travel.active?Math.min(1,3*dt/Math.max(.00001,distance)):1-Math.exp(-30*dt);
  r.position.x+=dx*follow;r.position.z+=dz*follow;
  const wantedAngle=travel.standing?travel.angle+Math.atan2(Math.sin(p.angle-travel.angle),Math.cos(p.angle-travel.angle))*ease:p.angle;
  const turn=Math.atan2(Math.sin(wantedAngle-r.rotation.y),Math.cos(wantedAngle-r.rotation.y));
  r.rotation.y+=travel.active?Math.max(-5*dt,Math.min(5*dt,turn)):turn*(1-Math.exp(-15*dt));
  if(!props.sitting&&!travel.standing&&distance<.015)travel.active=false;
  // The animator writes raw VRM bones. Only calibrate the settled Seated pose;
  // legacy callers without a world-space surface retain seatLift semantics.
  const seatSurfaceY=props.sitting&&animator.current.state==='Seated'?props.seatSurfaceY:undefined;
  const hips=seatSurfaceY!==undefined?character.vrm.humanoid.getRawBoneNode('hips'):null;
  if(hips){
   const contact=seatedContact.current;contact.age+=dt;
   if(!contact.attempted||(!contact.settled&&contact.age>.35)){
    contact.attempted=true;
    contact.sample=sampleSeatedSupport(character.vrm.scene,hips,['leftUpperLeg','rightUpperLeg'].map(b=>character.vrm.humanoid.getRawBoneNode(b as 'leftUpperLeg'|'rightUpperLeg')),['leftLowerLeg','rightLowerLeg'].map(b=>character.vrm.humanoid.getRawBoneNode(b as 'leftLowerLeg'|'rightLowerLeg')));
    contact.settled=contact.age>.35;
   }
  }else seatedContact.current={age:0,sample:undefined,settled:false,attempted:false};
  const seatedY=seatedRootTargetY(r,hips,seatSurfaceY,hipPosition,seatedContact.current.sample?.hipToContactY);
  const ground=props.groundHeight?.()??0;
  const authoredSeat=props.seatSurfaceY!==undefined&&character.seatedSupportY!==undefined?props.seatSurfaceY-character.floor-character.seatedSupportY*character.scale:undefined;
  const transitionY=state==='SitDown'&&props.sitting?ground+((authoredSeat??ground+props.seatLift)-ground)*ease:travel.standing?ground+(travel.from.y-ground)*(1-ease):undefined;
  const y=seatedY??transitionY??(ground+(props.sitting?props.seatLift:props.motion.current.height));
  r.position.y+=(y-r.position.y)*(1-Math.exp(-35*dt));
  if(props.renderPose){props.renderPose.current.x=r.position.x;props.renderPose.current.z=r.position.z;props.renderPose.current.angle=r.rotation.y;props.renderPose.current.moving=p.moving;}
  gestureMood.current=syncGestureExpression(animator.current.expressions,gestureMood.current,animator.current.activeGesture);
  if(props.local!==false){
   const data=document.documentElement.dataset;
   if(data.ctrlCaptureMotion==='true'){
    const bones=Object.fromEntries((['hips','leftFoot','rightFoot','leftToes','rightToes'] as const).map(name=>{const bone=character.vrm.humanoid.getRawBoneNode(name);return [name,bone?bone.getWorldPosition(new Vector3()).toArray():null];}));
    data.ctrlAvatarPose=JSON.stringify({root:r.position.toArray(),bones,state:animator.current.state,time:performance.now()});
    // Opt-in QA snapshot of real posed skin, not a screenshot-only proxy or a
    // per-frame production scan. Check complete body framing after an orbit.
    const nonce=data.ctrlCaptureBoundsNonce;
    if(nonce&&nonce!==boundsNonce.current){
     character.vrm.scene.updateWorldMatrix(true,true);character.vrm.scene.updateMatrixWorld(true);const box=new Box3(),part=new Box3();
     character.vrm.scene.traverse(node=>{if(!(node instanceof Mesh)||!node.visible)return;if(node instanceof SkinnedMesh)node.computeBoundingBox();else node.geometry.computeBoundingBox();const b=node instanceof SkinnedMesh?node.boundingBox:node.geometry.boundingBox;if(b)box.union(part.copy(b).applyMatrix4(node.matrixWorld));});
     const points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new Vector3(x,y,z).project(_.camera));
     data.ctrlAvatarBounds=JSON.stringify({min:box.min.toArray(),max:box.max.toArray(),screen:{minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))}});data.ctrlAvatarBoundsNonce=nonce;boundsNonce.current=nonce;
    }
   }
   if(seatedY!==undefined&&hips){
    hips.getWorldPosition(hipPosition); // Telemetry reflects the smoothed result.
    data.ctrlAvatarHipY=String(hipPosition.y);data.ctrlAvatarSeatSurfaceY=String(seatSurfaceY);
    const support=seatedContact.current.sample;
    if(support){data.ctrlAvatarSeatContactY=String(hipPosition.y-support.hipToContactY);data.ctrlAvatarSeatContactOffset=String(support.hipToContactY);data.ctrlAvatarSeatContactVertices=String(support.vertices);}data.ctrlAvatarSeatContactSettled=String(seatedContact.current.settled);
   }else{for(const key of ['ctrlAvatarHipY','ctrlAvatarSeatSurfaceY','ctrlAvatarSeatContactY','ctrlAvatarSeatContactOffset','ctrlAvatarSeatContactVertices','ctrlAvatarSeatContactSettled'])delete data[key];}
   data.ctrlAvatarState=animator.current.state;data.ctrlAvatarGesture=animator.current.activeGesture??'none';
   data.ctrlAvatarGestureSequence=String(lastGesture.current?.sequence??0);
   data.ctrlAvatarFaceWeights=JSON.stringify(Object.fromEntries(['happy','relaxed','sad','angry','blink'].map(name=>[name,Math.round((character.vrm.expressionManager?.getValue(name)??0)*1000)/1000])));
  }
 });
 if(error&&props.hideErrorUI)return null;
 if(error)return <Html portal={props.htmlPortal?.current?{current:props.htmlPortal.current}:undefined} position={[props.pose.x,2.1,props.pose.z]} center><div className='pl-character-error' role='alert'><strong>Character unavailable</strong><p>{error}</p><button type='button' onClick={()=>{setError('');setCharacter(null);setAttempt(value=>value+1);}}>Retry character</button></div></Html>;
 if(!character)return null;
 return <group ref={root} position={initial} rotation={[0,initialAngle,0]} userData={{avatarRenderer:'anime-vrm-mtoon',avatarModel:props.definition.id}}><group scale={character.scale} position={[0,character.floor,0]}><primitive object={character.vrm.scene} dispose={null}/></group>{props.showName!==false&&<Html portal={props.htmlPortal?.current?{current:props.htmlPortal.current}:undefined} position={[0,2.05,0]} center distanceFactor={9} zIndexRange={[10,0]} style={{pointerEvents:'none'}}><span className='pl-name'>{props.local===false?props.name:'You'}</span></Html>}</group>;
}
