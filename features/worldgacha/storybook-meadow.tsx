'use client';
import {useMemo,useLayoutEffect,useRef,useEffect} from 'react';import {useFrame,useThree} from '@react-three/fiber';
import {CanvasTexture,SRGBColorSpace,PlaneGeometry,DoubleSide,MeshBasicMaterial,InstancedMesh,Object3D,Color} from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {grassSamples,mulberry32,range} from './ghibli-layout';
/** Original gouache botanical atlas. Real cutout clumps in 3D, not a full-screen image. */
function botanicalAtlas(flowers=false){
 const c=document.createElement('canvas');c.width=256;c.height=512;const ctx=c.getContext('2d')!;
 const r=mulberry32(flowers?751:413);
 for(let i=0;i<13;i++){
  const bx=112+range(r,-22,22),by=502,tx=128+range(r,-112,112),ty=range(r,38,315),bend=range(r,-38,38),width=range(r,6,15);
  const grad=ctx.createLinearGradient(bx,by,tx,ty);grad.addColorStop(0,'#355c43');grad.addColorStop(.5,i%3?'#7f9c57':'#689151');grad.addColorStop(1,i%3?'#afbb77':'#92b86b');
  ctx.beginPath();ctx.moveTo(bx,by);ctx.quadraticCurveTo((bx+tx)/2+bend,ty+80,tx,ty);ctx.quadraticCurveTo((bx+tx)/2+bend+width,ty+110,bx+width*.7,by);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();ctx.moveTo(bx+3,by-5);ctx.quadraticCurveTo((bx+tx)/2+bend+3,ty+95,tx,ty+8);ctx.strokeStyle='#ccce8a77';ctx.lineWidth=1.2;ctx.stroke();
 }
 if(flowers)for(let i=0;i<7;i++){const x=range(r,35,220),y=range(r,85,310);ctx.beginPath();ctx.moveTo(128,501);ctx.quadraticCurveTo(x-20,y+80,x,y);ctx.strokeStyle='#5e8150';ctx.lineWidth=3;ctx.stroke();for(let k=0;k<5;k++){const a=k*Math.PI*2/5;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*7,y+Math.sin(a)*7,6,4,a,0,Math.PI*2);ctx.fillStyle=i%3?'#f1e6c4':'#dca6b1';ctx.fill();}ctx.beginPath();ctx.arc(x,y,3.6,0,Math.PI*2);ctx.fillStyle='#cda558';ctx.fill();}
 ctx.globalCompositeOperation='source-atop';for(let i=0;i<2600;i++){ctx.globalAlpha=range(r,.035,.13);ctx.fillStyle=i%2?'#e3e5b1':'#274e3b';ctx.fillRect(r()*256,r()*512,range(r,1,4),range(r,1,5));}ctx.globalAlpha=1;
 const texture=new CanvasTexture(c);texture.colorSpace=SRGBColorSpace;texture.anisotropy=2;return texture;
}
export default function StorybookMeadow({quality,still,night=false}:{quality:'low'|'high';still:boolean;night?:boolean}){
 const {gl}=useThree(),grass=useRef<InstancedMesh>(null),flowers=useRef<InstancedMesh>(null),wind=useMemo(()=>({value:0}),[]);
 const data=useMemo(()=>{const all=grassSamples(quality==='high'?4800:2200);return {grass:all.filter((_,i)=>i%8!==0),flowers:all.filter((_,i)=>i%8===0)};},[quality]);
 const assets=useMemo(()=>{const planes=[0,Math.PI/3,Math.PI*2/3].map(a=>{const g=new PlaneGeometry(1,1,1,3);g.translate(0,.5,0);g.rotateY(a);return g;});const geometry=mergeGeometries(planes)!;planes.forEach(p=>p.dispose());
  const maps=[botanicalAtlas(),botanicalAtlas(true)];const materials=maps.map(map=>{const m=new MeshBasicMaterial({map,side:DoubleSide,alphaTest:.38});m.forceSinglePass=true;m.onBeforeCompile=s=>{s.uniforms.uMeadowTime=wind;s.vertexShader='uniform float uMeadowTime;\n'+s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvec2 field=instanceMatrix[3].xz;float gust=sin(uMeadowTime*1.05+field.x*.22+field.y*.17);transformed.x+=gust*.075*pow(max(0.,position.y),1.8);transformed.z+=cos(uMeadowTime*.8+field.y*.23)*.035*position.y*position.y;`);};m.customProgramCacheKey=()=> 'original-gouache-meadow-v1';return m;});return {geometry,maps,materials};},[wind]);
 useLayoutEffect(()=>{const r=mulberry32(85),o=new Object3D(),color=new Color();for(const [ref,items] of [[grass,data.grass],[flowers,data.flowers]] as const){items.forEach((p,i)=>{o.position.set(p.x,.012,p.z);o.rotation.set(0,p.seed,0);const height=range(r,.3,.65);o.scale.set(range(r,.62,1.07),height,range(r,.62,1.07));o.updateMatrix();ref.current?.setMatrixAt(i,o.matrix);ref.current?.setColorAt(i,color.setHSL(.13+range(r,-.014,.014),.15,range(r,.72,.98)));});if(ref.current){ref.current.instanceMatrix.needsUpdate=true;ref.current.instanceColor!.needsUpdate=true;ref.current.computeBoundingSphere();}}},[data]);
 useEffect(()=>{const d=gl.domElement.dataset;d.storybookMeadowClumps=String(data.grass.length+data.flowers.length);d.vegetationRenderer='original-gouache-crosscards';return()=>{delete d.storybookMeadowClumps;delete d.vegetationRenderer;};},[gl,data]);
 useEffect(()=>()=>{assets.geometry.dispose();assets.materials.forEach(m=>m.dispose());assets.maps.forEach(t=>t.dispose());},[assets]);
 useEffect(()=>{assets.materials.forEach(m=>m.color.set(night?'#48596c':'#ffffff'));},[assets,night]);
 useFrame((_,dt)=>{if(!still)wind.value+=Math.min(dt,.05);});
 return <group name='original-painted-meadow'><instancedMesh raycast={()=>{}} ref={grass} args={[assets.geometry,assets.materials[0],data.grass.length]} receiveShadow/><instancedMesh raycast={()=>{}} ref={flowers} args={[assets.geometry,assets.materials[1],data.flowers.length]} receiveShadow/></group>;
}
