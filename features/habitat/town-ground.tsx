'use client';
import {useEffect,useMemo} from 'react';
import {Color,Float32BufferAttribute,PlaneGeometry} from 'three';
import {TOWN_TERRAIN,townTerrainHeights} from '@/domain/town-terrain';
import {paintedTexture} from './town-surfaces';
import {TOWN_DISTRICTS} from './town-districts';

/** One ~14k-vertex surface replaces overlapping giant flat district planes.
 * Other regional assets remain independently culled and instanced. */
export default function TownGround(){
 const geometry=useMemo(()=>{
  const g=new PlaneGeometry(TOWN_TERRAIN.width,TOWN_TERRAIN.depth,TOWN_TERRAIN.columns,TOWN_TERRAIN.rows),position=g.getAttribute('position'),heights=townTerrainHeights(),colors=new Float32Array(position.count*3),low=new Color('#afc696'),high=new Color('#8fac82'),c=new Color();
  const dryMeadow=new Color('#c8c29d'),coastalGrass=new Color('#afc6b4'),gardenGrass=new Color('#b7cda5');
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),z=-position.getY(i);
   position.setZ(i,heights[i]);
   // Broad, coherent neighborhood ground tones; no random tile-by-tile noise.
   // Road, building and gameplay heights remain exactly the authoritative mesh.
   const seed=.055*Math.sin(x*.09-z*.14)+.025*Math.sin(x*.31+z*.18);
   c.copy(low).lerp(high,Math.max(0,Math.min(.84,heights[i]/5+seed)));
   const near=(id:string,radius:number)=>{
    const d=TOWN_DISTRICTS.find(item=>item.id===id)!;
    return Math.max(0,1-Math.hypot(x-d.x,z-d.z)/radius);
   };
   c.lerp(dryMeadow,Math.max(near('residential',56),near('festival',50),near('workshop',48))*.2);
   c.lerp(coastalGrass,near('harbor',57)*.23);
   c.lerp(gardenGrass,Math.max(near('garden',59),near('orchard',59))*.22);
   c.toArray(colors,i*3);
  }
  g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const texture=useMemo(()=>paintedTexture('grass'),[]);
 return <mesh geometry={geometry} rotation-x={-Math.PI/2} receiveShadow><meshStandardMaterial map={texture} vertexColors roughness={1}/></mesh>;
}
