'use client';
import {useEffect,useMemo} from 'react';
import {Color,Float32BufferAttribute,PlaneGeometry} from 'three';
import {TOWN_TERRAIN,townTerrainHeights} from '@/domain/town-terrain';
import {paintedTexture} from './town-surfaces';

/** One ~14k-vertex surface replaces overlapping giant flat district planes.
 * Other regional assets remain independently culled and instanced. */
export default function TownGround(){
 const geometry=useMemo(()=>{
  const g=new PlaneGeometry(TOWN_TERRAIN.width,TOWN_TERRAIN.depth,TOWN_TERRAIN.columns,TOWN_TERRAIN.rows),position=g.getAttribute('position'),heights=townTerrainHeights(),colors=new Float32Array(position.count*3),low=new Color('#afca99'),high=new Color('#86b18c'),meadow=new Color('#b9d59d'),c=new Color();
  for(let i=0;i<position.count;i++){
   position.setZ(i,heights[i]);
   const x=position.getX(i),z=-position.getY(i);
   const seed=.045*Math.sin(x*.11-z*.09)+.026*Math.cos(x*.22+z*.17);
   c.copy(low).lerp(high,Math.max(0,Math.min(.85,heights[i]/5+seed)));
   const willowCenter=Math.max(0,1-Math.hypot(x,z-4)/54);
   c.lerp(meadow,willowCenter*.22);
   c.toArray(colors,i*3);
  }
  g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const texture=useMemo(()=>paintedTexture('grass'),[]);
 return <mesh geometry={geometry} rotation-x={-Math.PI/2} receiveShadow><meshStandardMaterial map={texture} vertexColors roughness={1}/></mesh>;
}
