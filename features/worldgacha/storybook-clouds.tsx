'use client';
import {useMemo,useEffect} from 'react';import {CanvasTexture,SRGBColorSpace} from 'three';import {mulberry32} from './ghibli-layout';
/** Original hand-shaped cumulus paintings as distant 3D-positioned sky cards. */
export default function StorybookClouds({night}:{night:boolean}){
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=256;const x=c.getContext('2d')!,r=mulberry32(802);const oval=(cx:number,cy:number,rx:number,ry:number,color:string)=>{x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);x.fillStyle=color;x.fill();};
 oval(256,148,214,53,'#cad6d5');for(let i=0;i<9;i++){const px=70+i*45,py=155-Math.sin(i/8*Math.PI)*70,rr=34+r()*22;oval(px,py,rr,rr*.85,'#ecebdd');oval(px-9,py-11,rr*.82,rr*.65,'#f6f2df');}
 oval(266,184,165,19,'#d5dfdb');oval(246,174,178,14,'#e3e6d9');
 x.globalCompositeOperation='source-atop';for(let i=0;i<2600;i++){x.globalAlpha=.018+r()*.035;x.fillStyle=i%2?'#fffbe8':'#9fb9c3';x.fillRect(r()*512,r()*256,2+r()*4,1+r()*3);}const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;},[]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group name='painted-cumulus-clouds'>{Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2;return <sprite raycast={()=>{}} key={i} position={[Math.sin(a)*95,18+(i%3)*5,Math.cos(a)*95]} scale={[40+(i%2)*9,20+(i%2)*4,1]}><spriteMaterial map={texture} transparent depthWrite={false} fog={false} color={night?'#647b96':'#ffffff'}/></sprite>;})}</group>;
}
