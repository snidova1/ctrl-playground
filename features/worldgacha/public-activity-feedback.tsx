'use client';
import {useLayoutEffect,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {DoubleSide,Group,InstancedMesh,Object3D} from 'three';
import type {NeighborhoodState} from './neighborhood-state';
/** Small authored reactions to actual player actions, not ambient particle spam. */
export default function PublicActivityFeedback({state,still}:{state:MutableRefObject<NeighborhoodState>;still:boolean}){
 const bell=useRef<Group>(null),blooms=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{const p=new Object3D();for(let i=0;i<16;i++){const bed=Math.floor(i/4),x=bed%2?-43:-35,z=bed<2?-6:6;p.position.set(x+(i%4-1.5)*1.1,.7,z+(bed<2?1.5:-1.5));p.scale.set(.12,.11,.12);p.updateMatrix();blooms.current?.setMatrixAt(i,p.matrix);}if(blooms.current){blooms.current.instanceMatrix.needsUpdate=true;blooms.current.computeBoundingSphere();}},[]);
 useFrame(({gl})=>{const s=state.current,pulse=s.publicPulse,remaining=pulse?.id==='market-bell'?Math.max(0,pulse.until-s.time):0,angle=still?0:Math.sin((3-remaining)*17)*.4*remaining/3;if(bell.current)bell.current.rotation.x=angle;if(blooms.current)blooms.current.visible=!!s.springTended&&Math.abs(s.player.x+39)<32;gl.domElement.dataset.marketBellAngle=angle.toFixed(4);gl.domElement.dataset.herbsTended=String(!!s.springTended);});
 return <group name='public-place-reactions'><group position={[43,1.8,7]} name='playable-market-bell'><mesh position-y={.03}><boxGeometry args={[.4,.055,.07]}/><meshStandardMaterial color='#897454'/></mesh><group ref={bell}><mesh position-y={-.15}><cylinderGeometry args={[.055,.16,.23,12,1,true]}/><meshStandardMaterial color='#c9a45e' metalness={.4} roughness={.5} side={DoubleSide}/></mesh><mesh position-y={-.22}><sphereGeometry args={[.035,6,4]}/><meshStandardMaterial color='#9b7446'/></mesh></group></group><instancedMesh ref={blooms} args={[undefined,undefined,16]} visible={false}><icosahedronGeometry args={[1,1]}/><meshStandardMaterial color='#e3c8ba' roughness={1}/></instancedMesh></group>;
}
