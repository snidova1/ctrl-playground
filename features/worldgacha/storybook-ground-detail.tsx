'use client';

import {useLayoutEffect, useMemo, useRef, type RefObject} from 'react';
import {Color, InstancedMesh, Object3D} from 'three';
import {mulberry32, pathDistance, range} from './ghibli-layout';

type Marker = {x:number; y:number; z:number; scale:[number, number, number]; rotation:number; color:string};

/**
 * Hand-placed-feeling path wear: low, non-colliding geometry that gives the
 * broad navigation masks an irregular village-surface edge. The navigation
 * grid remains authoritative, so decoration can never make a route impassable.
 */
function markers() {
  const random=mulberry32(5017), stones:Marker[]=[];
  for(let tries=0;tries<1800 && stones.length<130;tries++) {
    const x=range(random,-14,14), z=range(random,-15,25), distance=pathDistance(x,z);
    // Keep tiny worn fragments inside/at the edge of the existing walkable path,
    // never in the fountain square or the two raised garden beds.
    if(distance<-.32 || distance>.46 || Math.hypot(x,z)<5.7 || (Math.abs(z-16)<1.5 && Math.abs(x)>11.6)) continue;
    const large=stones.length%11===0;
    stones.push({
      x, y:large?.025:.017, z,
      scale:large?[range(random,.13,.23),.025,range(random,.09,.16)]:[range(random,.035,.09),.012,range(random,.025,.065)],
      rotation:random()*Math.PI,
      color:large ? ['#b99c70','#cdb484','#a88c64'][stones.length%3] : ['#d6be8b','#c5a875','#dfca9b'][stones.length%3],
    });
  }
  return {stones};
}

function install(ref:RefObject<InstancedMesh|null>, items:Marker[]) {
  const transform=new Object3D(), color=new Color();
  items.forEach((item,index)=>{
    transform.position.set(item.x,item.y,item.z);
    transform.rotation.set(0,item.rotation,0);
    transform.scale.set(...item.scale);
    transform.updateMatrix();
    ref.current?.setMatrixAt(index,transform.matrix);
    ref.current?.setColorAt(index,color.set(item.color));
  });
  if(ref.current) {
    ref.current.instanceMatrix.needsUpdate=true;
    if(ref.current.instanceColor) ref.current.instanceColor.needsUpdate=true;
    ref.current.computeBoundingSphere();
  }
}

export default function StorybookGroundDetail() {
  const stoneRef=useRef<InstancedMesh>(null);
  const detail=useMemo(markers,[]);
  useLayoutEffect(()=>{install(stoneRef,detail.stones);},[detail]);
  return <group name='authored-path-wear' renderOrder={1}>
    <instancedMesh ref={stoneRef} args={[undefined,undefined,detail.stones.length]} receiveShadow>
      <cylinderGeometry args={[1,1,1,7]}/>
      <meshStandardMaterial color='white' roughness={1}/>
    </instancedMesh>

  </group>;
}
