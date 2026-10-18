'use client';
/**
 * Procedural watercolor foliage cards for the PR32 Willow art gate.
 * Method derived from the painted leaf atlas in Summer Cycle:
 * StarKnightt/summer-cycle/src/render/leafAtlas.ts, MIT copyright
 * (c) 2026 Prasenjit. License in docs/CTRL_PR32_SUMMER_CYCLE_LICENSE.md.
 *
 * One atlas and one InstancedMesh draw call per village. Cards reinforce
 * the existing CC0 willow GLB silhouettes; no collision or world state.
 */
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {
 CanvasTexture,DoubleSide,InstancedMesh,LinearMipmapLinearFilter,
 Object3D,SRGBColorSpace,Color
} from 'three';
import {ANIME_VILLAGE_TREE_PLACEMENTS} from './town-anime-meshes';

function hash(i:number){const n=Math.sin(i*173.17+9.11)*43758.5453;return n-Math.floor(n);}
function leaf(g:CanvasRenderingContext2D,len:number,w:number,seed:number){
 const grad=g.createLinearGradient(0,0,0,-len);
 const brightness=.85+hash(seed)*.15;
 const f=(n:number)=>Math.min(255,Math.round(n*brightness));
 grad.addColorStop(0,'rgb('+f(64)+','+f(114)+','+f(67)+')');
 grad.addColorStop(.55,'rgb('+f(119)+','+f(162)+','+f(98)+')');
 grad.addColorStop(1,'rgb('+f(166)+','+f(199)+','+f(119)+')');
 const curl=(hash(seed+2)-.5)*len*.11;
 g.beginPath();g.moveTo(0,0);
 g.bezierCurveTo(-w*.94,-len*.18,-w*.68,-len*.78,curl,-len);
 g.bezierCurveTo(w*.82,-len*.73,w*.98,-len*.24,0,0);
 g.closePath();g.fillStyle=grad;g.fill();
 g.strokeStyle='rgba(55,93,68,.7)';g.lineWidth=Math.max(.8,w*.038);g.stroke();
 g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(curl*.1,-len*.46,curl,-len*.94);
 g.strokeStyle='rgba(207,224,168,.65)';g.lineWidth=1;g.stroke();
}
function paintLeafCluster(){
 const size=256,canvas=document.createElement('canvas');
 canvas.width=size;canvas.height=size;
 const g=canvas.getContext('2d');
 if(!g)throw Error('2D leaf texture unavailable');
 for(let i=0;i<17;i++){
  const angle=(i/17)*Math.PI*2+(hash(i+78)-.5)*.64;
  const len=52+hash(i+3)*53,w=len*(.22+hash(i+5)*.12);
  const x=128+(hash(i+19)-.5)*46,y=135+(hash(i+42)-.5)*46;
  g.save();g.translate(x,y);g.rotate(angle);
  leaf(g,len,w,i+101);g.restore();
 }
 // A little inner shade makes the clump read as layered painted leaves.
 const tex=new CanvasTexture(canvas);
 tex.colorSpace=SRGBColorSpace;
 tex.generateMipmaps=true;tex.minFilter=LinearMipmapLinearFilter;
 tex.anisotropy=2;tex.needsUpdate=true;
 return tex;
}
export type LeafPlacement={x:number;y:number;z:number;size:number;ry:number;rz:number;color:string};
export function paintedCanopyCards(quality:'low'|'high'):LeafPlacement[]{
 const trees=ANIME_VILLAGE_TREE_PLACEMENTS.filter((_,i)=>quality==='high'||i<4);
 const placements:LeafPlacement[]=[];
 for(const [t,p] of trees.entries()){
  const count=quality==='high'?56:26;
  for(let i=0;i<count;i++){
   const n=10000+t*300+i*9;
   const angle=hash(n)*Math.PI*2,radius=Math.sqrt(hash(n+1))*p.width*.30;
   const y=p.width*(.31+hash(n+2)*.37);
   placements.push({
    x:p.x+Math.cos(angle)*radius,
    y,z:p.z+Math.sin(angle)*radius,
    size:1.3+hash(n+3)*1.25,
    ry:angle+hash(n+4)*1.4,rz:(hash(n+5)-.5)*.62,
    color:t%3===0?'#b2c996':t%3===1?'#d1d8a1':'#a4c19a'
   });
  }
 }
 return placements;
}
export default function TownPaintedCanopy({quality}:{quality:'low'|'high'}){
 const cards=useMemo(()=>paintedCanopyCards(quality),[quality]);
 const atlas=useMemo(()=>paintLeafCluster(),[]);
 const roots=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  if(!roots.current)return;
  const dummy=new Object3D(),tint=new Color();
  for(let i=0;i<cards.length;i++){
   const p=cards[i];
   dummy.position.set(p.x,p.y,p.z);
   dummy.rotation.set(.12*Math.sin(i*.32),p.ry,p.rz);
   dummy.scale.setScalar(p.size);
   dummy.updateMatrix();
   roots.current.setMatrixAt(i,dummy.matrix);
   roots.current.setColorAt(i,tint.set(p.color));
  }
  roots.current.instanceMatrix.needsUpdate=true;
  if(roots.current.instanceColor)roots.current.instanceColor.needsUpdate=true;
  roots.current.computeBoundingSphere();
 },[cards]);
 useEffect(()=>()=>atlas.dispose(),[atlas]);
 return <instancedMesh ref={roots} args={[undefined,undefined,cards.length]}
  name="PR32-Painted-Leaf-Atlas-Canopies" castShadow={false} receiveShadow={false}>
  <planeGeometry args={[1,1]}/>
  <meshBasicMaterial map={atlas} transparent alphaTest={.15}
   depthWrite={false} side={DoubleSide} toneMapped={false}/>
 </instancedMesh>;
}
