'use client';
import {useEffect,useMemo} from 'react';
import {Color,Float32BufferAttribute,PlaneGeometry} from 'three';
import {TOWN_TERRAIN,townTerrainHeights} from '@/domain/town-terrain';
import {paintedTexture} from './town-surfaces';

/** One ~14k-vertex surface replaces overlapping giant flat district planes.
 * Other regional assets remain independently culled and instanced. */
export default function TownGround(){
 const geometry=useMemo(()=>{
  const g=new PlaneGeometry(TOWN_TERRAIN.width,TOWN_TERRAIN.depth,TOWN_TERRAIN.columns,TOWN_TERRAIN.rows),position=g.getAttribute('position'),heights=townTerrainHeights(),colors=new Float32Array(position.count*3),low=new Color('#afc696'),high=new Color('#8fac82'),c=new Color();
  for(let i=0;i<position.count;i++){
   position.setZ(i,heights[i]);
   const seed=.06*Math.sin(position.getX(i)*.13-position.getY(i)*.19);
   c.copy(low).lerp(high,Math.max(0,Math.min(.85,heights[i]/5+seed)));
   c.toArray(colors,i*3);
  }
  g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const texture=useMemo(()=>paintedTexture('grass'),[]);
 return <mesh geometry={geometry} rotation-x={-Math.PI/2} receiveShadow><meshStandardMaterial map={texture} vertexColors roughness={1}/></mesh>;
}
