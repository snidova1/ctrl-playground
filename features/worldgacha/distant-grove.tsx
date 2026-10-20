'use client';

import {useLayoutEffect, useMemo, useRef} from 'react';
import {Color, InstancedMesh, Object3D} from 'three';
import {mulberry32, range} from './ghibli-layout';

type Tree = {x:number; z:number; scale:[number,number,number]; color:string};

/** Soft, layered horizon silhouettes. They sit outside the navigation basin and
 * create parallax/value separation behind the playable cottages. */
export default function DistantGrove({night}:{night:boolean}) {
  const ref=useRef<InstancedMesh>(null);
  const trees=useMemo<Tree[]>(()=>{
    const random=mulberry32(884), out:Tree[]=[];
    for(const row of [0,1,2]) for(let i=0;i<24;i++) {
      const x=-48+i*4.1+range(random,-1.3,1.3);
      const z=-51+row*5+range(random,-.7,.7);
      out.push({x,z,scale:[range(random,2.2,4.5),range(random,5.5,11),range(random,2.2,4.5)],color:['#496f62','#5e8370','#7d9b7e'][row]});
    }
    return out;
  },[]);
  useLayoutEffect(()=>{
    const object=new Object3D(), color=new Color();
    trees.forEach((tree,index)=>{
      object.position.set(tree.x,tree.scale[1]*.44,tree.z);
      object.rotation.set(0,index*.71,0);
      object.scale.set(...tree.scale);
      object.updateMatrix();
      ref.current?.setMatrixAt(index,object.matrix);
      ref.current?.setColorAt(index,color.set(night?'#2d4752':tree.color));
    });
    if(ref.current) {
      ref.current.instanceMatrix.needsUpdate=true;
      if(ref.current.instanceColor) ref.current.instanceColor.needsUpdate=true;
      ref.current.computeBoundingSphere();
    }
  },[trees,night]);
  return <instancedMesh ref={ref} name='distant-layered-grove' args={[undefined,undefined,trees.length]} renderOrder={-3} frustumCulled={false}>
    <sphereGeometry args={[1,12,7]}/>
    <meshBasicMaterial color='white' fog />
  </instancedMesh>;
}
