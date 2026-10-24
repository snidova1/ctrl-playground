'use client';
import {createContext,useContext,useEffect,useMemo,type ReactNode} from 'react';
import {CanvasTexture,RepeatWrapping,SRGBColorSpace} from 'three';
export type HouseSurface='plaster'|'cedar'|'paint'|'stone'|'roof'|'contact';
type Maps=Record<HouseSurface,CanvasTexture|null>;
const empty:Maps={plaster:null,cedar:null,paint:null,stone:null,roof:null,contact:null};
const HouseSurfaces=createContext<Maps>(empty);
/** Original small material family: measured repeats and low-contrast marks, not imported random textures. */
function textureFor(kind:HouseSurface){
 if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');if(!c)return null;
 let seed=417;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 if(kind==='contact'){
  const g=c.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.36,'rgba(255,255,255,.13)');g.addColorStop(.5,'rgba(255,255,255,.62)');g.addColorStop(.64,'rgba(255,255,255,.13)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,256,256);
 }else if(kind==='plaster'){
  c.fillStyle='#faf8f2';c.fillRect(0,0,256,256);
  for(let i=0;i<12;i++){const x=rand()*256,y=rand()*256,r=28+rand()*65,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(119,105,86,.012)');g.addColorStop(1,'rgba(119,105,86,0)');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
  for(let i=0;i<400;i++){c.fillStyle=i%2?'rgba(91,83,66,.008)':'rgba(255,255,255,.025)';c.fillRect(rand()*256,rand()*256,1+rand()*2,1);}
 }else if(kind==='stone'){
  c.fillStyle='#d2cdc0';c.fillRect(0,0,256,256);
  for(let row=0;row<2;row++)for(let col=-1;col<4;col++){const x=col*85+(row%2)*42;c.fillStyle=['#f5f1e7','#e9e5d8','#f0ecdf'][(col+row+4)%3];c.fillRect(x+2,row*128+3,81,122);}
 }else if(kind==='roof'){
  c.fillStyle='#c6b6a5';c.fillRect(0,0,256,256);
  for(let row=0;row<4;row++)for(let col=-1;col<4;col++){const x=col*85+(row%2)*42,y=row*64;c.fillStyle=['#f8eddf','#e9dcca','#f1e4d3'][(col+row+4)%3];c.fillRect(x+1,y+1,83,59);c.fillStyle='rgba(86,60,45,.16)';c.fillRect(x+2,y+59,82,4);}
 }else{
  c.fillStyle='#efebdf';c.fillRect(0,0,256,256);
  for(let board=0;board<4;board++){
   const x=board*64;c.fillStyle=['#f7f2e6','#e9e4d8','#f0ebdf','#e6e0d3'][board];c.fillRect(x,0,63,256);c.fillStyle=kind==='paint'?'rgba(40,53,36,.15)':'rgba(69,46,26,.22)';c.fillRect(x,0,1.5,256);
   for(let j=0;j<12;j++){const px=x+4+rand()*54;c.strokeStyle=`rgba(83,65,40,${kind==='paint'?.035:.055})`;c.lineWidth=.5;c.beginPath();c.moveTo(px,0);c.bezierCurveTo(px+rand()*5,70,px-rand()*5,170,px+rand()*3,256);c.stroke();}
  }
 }
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=2;if(kind!=='contact')texture.wrapS=texture.wrapT=RepeatWrapping;return texture;
}
export function HouseArtMaterials({children}:{children:ReactNode}){
 const maps=useMemo(()=>Object.fromEntries((Object.keys(empty) as HouseSurface[]).map(k=>[k,textureFor(k)])) as Maps,[]);
 useEffect(()=>()=>Object.values(maps).forEach(map=>map?.dispose()),[maps]);
 return <HouseSurfaces.Provider value={maps}>{children}</HouseSurfaces.Provider>;
}
export function useHouseSurfaces(){return useContext(HouseSurfaces);}
