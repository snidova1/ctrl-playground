'use client';
import {createContext,useCallback,useContext,useEffect,useLayoutEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {useFrame} from '@react-three/fiber';
import {Box3,DoubleSide,DynamicDrawUsage,Group,InstancedMesh,Object3D,Sphere,Vector3} from 'three';
import {PUBLIC_LIFE_PATCHES,lifeCount,lifeDetailVisible,lifePatchVisible,lifeStep,sampleLifeMote,updateBreezeAnchors,type BreezeKind,type LifePatch,type LifePoint,type MotePose} from './public-world-life-motion';

export type Props={player:LifePoint;night:boolean;still?:boolean;children?:ReactNode};
type Anchor={group:Group;x:number;z:number;phase:number;kind:BreezeKind};
type LifeContext={player:LifePoint;night:boolean;still:boolean;time:{current:number};anchors:Map<Group,Anchor>};
const Context=createContext<LifeContext|null>(null);
export function usePublicLife(){const value=useContext(Context);if(!value)throw new Error('Public life requires PublicWorldLife');return value;}

/** Rotate about the real suspension point, not the pole or stall footprint. */
export function BreezeAnchor({position,phase=0,kind,children}:{position:[number,number,number];phase?:number;kind:Anchor['kind'];children:ReactNode}){
 const group=useRef<Group>(null),{anchors}=usePublicLife();
 const [x,y,z]=position;
 useLayoutEffect(()=>{const node=group.current;if(!node)return;anchors.set(node,{group:node,x,z,phase,kind});return()=>{anchors.delete(node);};},[anchors,x,z,phase,kind]);
 return <group ref={group} position={[x,y,z]} name={`breeze-${kind}`}>{children}</group>;
}

function LifePatchMesh({patch}:{patch:LifePatch}){
 const mesh=useRef<InstancedMesh>(null),{time,player,still,night}=usePublicLife();
 const dummy=useMemo(()=>new Object3D(),[]);
 const pose=useMemo<MotePose>(()=>({x:0,y:0,z:0,sx:0,sy:0,sz:0,rx:0,ry:0,rz:0}),[]);
 const bounds=useMemo(()=>{const box=new Box3();for(const source of patch.sources)box.expandByPoint(new Vector3(...source));const sphere=box.getBoundingSphere(new Sphere());sphere.radius+=2.5;return sphere;},[patch]);
 const update=useCallback(()=>{
  const node=mesh.current;if(!node)return;
  node.visible=lifePatchVisible(patch,player,still);if(!node.visible)return;
  node.count=lifeCount(patch,night);
  for(let i=0;i<node.count;i++){
   sampleLifeMote(patch,i,time.current,night,pose);
   dummy.position.set(pose.x,pose.y,pose.z);dummy.scale.set(pose.sx,pose.sy,pose.sz);dummy.rotation.set(pose.rx,pose.ry,pose.rz);dummy.updateMatrix();node.setMatrixAt(i,dummy.matrix);
  }
  node.instanceMatrix.needsUpdate=true;
 },[patch,player,still,night,time,dummy,pose]);
 useLayoutEffect(()=>{if(mesh.current){mesh.current.instanceMatrix.setUsage(DynamicDrawUsage);mesh.current.boundingSphere=bounds;}update();},[bounds,update]); // Also hides all suspended motes immediately for reduced motion.
 useFrame(update);
 return <instancedMesh ref={mesh} name={patch.id} args={[undefined,undefined,patch.count]} visible={false}>
  {patch.kind==='steam'?<sphereGeometry args={[1,7,5]}/>:<circleGeometry args={[1,5]}/>}
  <meshBasicMaterial color={patch.kind==='steam'?'#e9dfcc':'#f2c7d9'} transparent opacity={patch.kind==='steam'?(night?.1:.15):(night?.48:.8)} depthWrite={false} side={DoubleSide}/>
 </instancedMesh>;
}

/** Small cups only on existing solid counters/tables; no new ground props/colliders. */
function WarmCups(){
 const group=useRef<Group>(null),{player}=usePublicLife();
 useFrame(()=>{if(group.current)for(const cup of group.current.children)cup.visible=lifeDetailVisible(player,cup.position.x,cup.position.z);});
 return <group ref={group} name='public-warm-cups'>{PUBLIC_LIFE_PATCHES.filter(p=>p.kind==='steam').flatMap(p=>p.sources.map(([x,y,z],i)=><group key={`${p.id}-${i}`} position={[x,y-.105,z]} visible={false}>
 <mesh><cylinderGeometry args={[.095,.07,.19,10]}/><meshStandardMaterial color={p.id==='market-tea'?'#9aa88b':'#ded0b7'} roughness={.85}/></mesh>
 <mesh position-y={.098}><cylinderGeometry args={[.077,.077,.006,10]}/><meshStandardMaterial color='#654d39' roughness={.7}/></mesh>
 </group>))}</group>;}

export default function PublicWorldLife({player,night,still=false,children}:Props){
 const [reduced,setReduced]=useState(false),time=useRef(0),anchors=useMemo(()=>new Map<Group,Anchor>(),[]);
 useEffect(()=>{const query=window.matchMedia?.('(prefers-reduced-motion: reduce)');if(!query)return;const change=()=>setReduced(query.matches);change();query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 const paused=still||reduced;
 const value=useMemo(()=>({player,night,still:paused,time,anchors}),[player,night,paused,time,anchors]);
 useFrame((_,dt)=>{
  if(paused)return;
  time.current+=lifeStep(dt);
  updateBreezeAnchors(anchors.values(),player,time.current,night);
 });
 return <Context.Provider value={value}><group name='public-world-local-life'>{children}<WarmCups/>{PUBLIC_LIFE_PATCHES.map(p=><LifePatchMesh key={p.id} patch={p}/>)}</group></Context.Provider>;
}
