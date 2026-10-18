'use client';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {CanvasTexture,InstancedMesh,LinearFilter,Object3D,SRGBColorSpace} from 'three';
import {ANIME_VILLAGE_PLACEMENTS,ANIME_VILLAGE_TREE_PLACEMENTS} from './town-anime-meshes';

/**
 * A lightweight contact-shadow layer adapted from Three.js transparent
 * material/instancing techniques. No shadow-camera pass, extra full-screen
 * GTAO pass, depth buffer readback or copied third-party shader source.
 *
 * Hand-authored translucent watercolor ellipses give buildings/trees visible
 * grounding even on devices where costly real-time cast shadows are reduced.
 * These are decorative only: original gameplay collision is untouched.
 */
type Footprint={x:number;z:number;width:number;depth:number;strength:number};
export function townContactFootprints(quality:'low'|'high'):Footprint[]{
 const buildings=ANIME_VILLAGE_PLACEMENTS.map(p=>({
  x:p.x+.18,z:p.z+.25,width:p.width*1.28,depth:p.depth*1.23,strength:.9
 }));
 const trees=ANIME_VILLAGE_TREE_PLACEMENTS
  .filter((_,i)=>quality==='high'||i<4)
  .map(p=>({x:p.x+.65,z:p.z+.55,width:p.width*.96,depth:p.depth*.87,strength:.64}));
 return [...buildings,...trees];
}
function watercolorContactTexture(){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Cannot draw PR32 contact pigment');
 ctx.clearRect(0,0,128,128);
 const wash=ctx.createRadialGradient(64,64,5,64,64,63);
 wash.addColorStop(0,'rgba(255,255,255,.85)');
 wash.addColorStop(.24,'rgba(255,255,255,.61)');
 wash.addColorStop(.55,'rgba(255,255,255,.27)');
 wash.addColorStop(.79,'rgba(255,255,255,.07)');
 wash.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=wash;ctx.fillRect(0,0,128,128);
 const texture=new CanvasTexture(canvas);
 texture.colorSpace=SRGBColorSpace;
 texture.minFilter=LinearFilter;texture.magFilter=LinearFilter;
 return texture;
}
export default function TownAnimeGrounding({quality}:{quality:'low'|'high'}){
 const footprints=useMemo(()=>townContactFootprints(quality),[quality]);
 const map=useMemo(()=>watercolorContactTexture(),[]);
 const instanced=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  if(!instanced.current)return;
  const object=new Object3D();
  for(let i=0;i<footprints.length;i++){
   const f=footprints[i];
   object.position.set(f.x,.088+i*.00008,f.z);
   object.rotation.set(-Math.PI/2,0,0);
   object.scale.set(f.width*f.strength,f.depth*f.strength,1);
   object.updateMatrix();
   instanced.current.setMatrixAt(i,object.matrix);
  }
  instanced.current.instanceMatrix.needsUpdate=true;
  instanced.current.computeBoundingSphere();
 },[footprints]);
 useEffect(()=>()=>map.dispose(),[map]);
 return <instancedMesh ref={instanced} args={[undefined,undefined,footprints.length]}
  name="PR32-Watercolor-Grounding" frustumCulled={false} renderOrder={2}>
  <planeGeometry args={[1,1]}/>
  <meshBasicMaterial map={map} color="#655f63" transparent opacity={.39}
   depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false}/>
 </instancedMesh>;
}
