'use client';
import {useEffect,useRef} from 'react';
import {weather} from '@/features/worlds/data';
export type WeatherLayer='attention'|'friction'|'curiosity';
export default function WeatherField({hour,layer,paused=false}:{hour:number;layer:WeatherLayer;paused?:boolean}){
 const ref=useRef<HTMLCanvasElement>(null),settings=useRef({hour,layer,paused});useEffect(()=>{settings.current={hour,layer,paused};},[hour,layer,paused]);
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;let width=1,height=1,time=0,last=0,raf=0,visible=true;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let px=0,py=0,targetX=0,targetY=0;
  const resize=()=>{width=canvas.clientWidth;height=canvas.clientHeight;const dpr=Math.min(devicePixelRatio,1.5);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);};const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
  const pointer=(e:PointerEvent)=>{const rect=canvas.getBoundingClientRect();targetX=(e.clientX-rect.left)/width-.5;targetY=(e.clientY-rect.top)/height-.5;};canvas.addEventListener('pointermove',pointer);
  const draw=(now:number)=>{raf=requestAnimationFrame(draw);if(document.hidden||!visible||now-last<32)return;const dt=Math.min((now-last)/1000,.05);last=now;const state=settings.current,sample=weather[state.hour],value=sample[state.layer];if(!state.paused&&!reduced)time+=dt*(sample.velocity/150);px+=(targetX-px)*.035;py+=(targetY-py)*.035;
   ctx.fillStyle=state.layer==='friction'?'#cab6a6':state.layer==='curiosity'?'#c3c7b3':'#c7d3d4';ctx.fillRect(0,0,width,height);
   const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#f9f7ee77');sky.addColorStop(.6,'#f9f7ee00');sky.addColorStop(1,'#6076771a');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
   const scale=Math.min(width*.95,height*1.25),cx=width*(width<650?.48:.59),cy=height*.45,lines=150;
   for(let j=lines-1;j>=0;j--){const v=j/(lines-1);ctx.beginPath();for(let k=0;k<=150;k++){const u=k/150,x=(u-.5)*2,z=(v-.5)*2;const envelope=Math.exp(-(x*x*.65+z*z*.7));const wave=(Math.sin(x*3.5+z*2+time)*.23+Math.cos(z*5.5-x*2+state.hour*.19)*.19)*envelope*(.5+value/60);const bend=Math.sin(u*Math.PI)*.14;const sx=cx+(x*.48+z*.14+px*.08)*scale;const sy=cy+(z*.17-wave*.64+bend+py*.07)*scale;if(k===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);}
    const alpha=.16+Math.sin(v*Math.PI)*.58;ctx.strokeStyle=`rgba(31,61,61,${alpha})`;ctx.lineWidth=j%7===0?1.1:.55;ctx.stroke();
   }
   // The single warm trace encodes the sampled hour's selected signal.
   ctx.beginPath();for(let i=0;i<=200;i++){const u=i/200,x=(u-.5)*2,z=(state.hour/23-.5)*2,envelope=Math.exp(-(x*x*.65+z*z*.7));const wave=(Math.sin(x*3.5+z*2+time)*.23+Math.cos(z*5.5-x*2+state.hour*.19)*.19)*envelope*(.5+value/60);const sx=cx+(x*.48+z*.14+px*.08)*scale,sy=cy+(z*.17-wave*.64+Math.sin(u*Math.PI)*.14+py*.07)*scale;if(i===0)ctx.moveTo(sx,sy);else ctx.lineTo(sx,sy);}ctx.strokeStyle='#b74930';ctx.lineWidth=1.5;ctx.stroke();
  };raf=requestAnimationFrame(draw);const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;});intersection.observe(canvas);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();canvas.removeEventListener('pointermove',pointer);};
 },[]);
 return <canvas ref={ref} className="weather-art" aria-label={`Synthetic internet weather at ${hour}:00 UTC. ${layer}: ${weather[hour][layer]}.`}/>;
}
