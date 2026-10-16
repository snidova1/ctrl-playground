'use client';
import {useLayoutEffect,useRef} from 'react';
import {InstancedMesh,Matrix4,Vector3} from 'three';
import type {AssetPlacement} from './town-assets';

/** Original wood joinery, attached to the saved wall transforms. Both bands
 * remain inside the existing wall AABB, so they never invent walking obstacles.
 * All walls share two draw calls, including shadow rendering. */
export default function VenueWallTrim({walls}:{walls:readonly AssetPlacement[]}){
 const base=useRef<InstancedMesh>(null),cap=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),offset=new Matrix4();
  for(const [i,p] of walls.entries()){
   const scale=p.size/2.4;
   matrix.makeRotationY(p.yaw??0);matrix.scale(new Vector3(scale,scale,scale));matrix.setPosition(p.x,p.y??0,p.z);
   base.current?.setMatrixAt(i,matrix.clone().multiply(offset.makeTranslation(0,.12,0)));
   cap.current?.setMatrixAt(i,matrix.clone().multiply(offset.makeTranslation(0,2.32,0)));
  }
  for(const mesh of [base.current,cap.current])if(mesh){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
 },[walls]);
 return <>
  <instancedMesh ref={base} args={[undefined,undefined,walls.length]} receiveShadow><boxGeometry args={[.2,.24,2]}/><meshStandardMaterial color='#aa8963' roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></instancedMesh>
  <instancedMesh ref={cap} args={[undefined,undefined,walls.length]} receiveShadow><boxGeometry args={[.2,.12,2]}/><meshStandardMaterial color='#b99c75' roughness={1} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1}/></instancedMesh>
 </>;
}
