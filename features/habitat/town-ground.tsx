'use client';
import {useEffect,useMemo} from 'react';
import {Color,Float32BufferAttribute,PlaneGeometry} from 'three';
import {TOWN_TERRAIN,townTerrainHeights} from '@/domain/town-terrain';
import {paintedTexture} from './town-surfaces';

/** One ~14k-vertex surface replaces overlapping giant flat district planes.
 * Other regional assets remain independently culled and instanced. */
export default function TownGround(){
 const geometry=useMemo(()=>{
  const g=new PlaneGeometry(TOWN_TERRAIN.width,TOWN_TERRAIN.depth,TOWN_TERRAIN.columns,TOWN_TERRAIN.rows),position=g.getAttribute('position'),heights=townTerrainHeights(),colors=new Float32Array(position.count*3),low=new Color('#c7d8a7'),high=new Color('#90b59c'),meadow=new Color('#d6dfa9'),flowerField=new Color('#d4c6a0'),shade=new Color('#759989'),c=new Color();
  for(let i=0;i<position.count;i++){
   position.setZ(i,heights[i]);
   const x=position.getX(i),z=-position.getY(i);
   // Broad pigment patches read like painted meadow, not tiny repeated
   // noise or an even olive lawn. Keep collision/surface heights unchanged.
   const glaze=.13*Math.sin(x*.085+Math.sin(z*.04)*2)
    +.08*Math.cos(z*.125-x*.06)
    +.045*Math.sin(x*.28+z*.21);
   const relief=Math.min(.75,heights[i]/5);
   c.copy(low).lerp(high,Math.max(0,Math.min(.88,.26+relief+glaze)));
   const goldenWash=.5+.5*Math.sin(x*.07-z*.11+Math.sin(z*.055));
   const flowerMeadow=Math.max(0,1-Math.hypot(x,z-8)/63);
   c.lerp(meadow,flowerMeadow*(.12+.16*goldenWash));
   c.lerp(flowerField,flowerMeadow*Math.max(0,Math.sin(x*.25+z*.16))*.048);
   const treeShade=Math.max(0,1-Math.hypot(x+15,z-14)/7)
    +Math.max(0,1-Math.hypot(x-16,z-14)/7);
   c.lerp(shade,Math.min(.14,treeShade*.12));
   c.toArray(colors,i*3);
  }
  g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const texture=useMemo(()=>paintedTexture('grass'),[]);
 return <mesh geometry={geometry} rotation-x={-Math.PI/2} receiveShadow><meshStandardMaterial map={texture} vertexColors roughness={1}/></mesh>;
}
