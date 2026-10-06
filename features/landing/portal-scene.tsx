'use client';
import {useEffect,useRef} from 'react';
import {AmbientLight,Color,DirectionalLight,OrthographicCamera,Raycaster,Scene,Vector2,Vector3,WebGLRenderer} from 'three';
import {paintSculpture} from '@/three/exhibition/software-renderer';
import {buildWorkshop} from './workshop-model';
import {stations} from './workshop-data';
export type SceneControl={room:number;rotation:number;zoom:number;paused:boolean;progress:number;destination:number};
export default function PortalScene({control,onSelect}:{control:SceneControl;onSelect:(room:number)=>void}){
 const host=useRef<HTMLDivElement>(null),state=useRef(control),select=useRef(onSelect);
 useEffect(()=>{state.current=control;select.current=onSelect;},[control,onSelect]);
 useEffect(()=>{const el=host.current!,canvas=document.createElement('canvas');el.appendChild(canvas);const scene=new Scene();scene.background=new Color('#dedfd3');const camera=new OrthographicCamera(-20,20,15,-15,.1,150);const workshop=buildWorkshop();scene.add(workshop.root);let renderer:WebGLRenderer|null=null,ctx:CanvasRenderingContext2D|null=null;
 try{const gl=canvas.getContext('webgl2',{antialias:true});if(gl){renderer=new WebGLRenderer({canvas,context:gl,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));}}catch{renderer?.dispose();renderer=null;}
 if(!renderer)ctx=canvas.getContext('2d');el.dataset.renderer=renderer?'webgl':'canvas';scene.add(new AmbientLight('#ffffff',2));const sun=new DirectionalLight('#fff7e6',3);sun.position.set(-10,20,12);scene.add(sun);
 let width=1,height=1,raf=0,last=0,time=0,visible=true,angle=.65,dragAngle=0,targetAngle=.65,downX=0,downY=0,dragging=false,moved=0,room=0;const focus=new Vector3(),target=new Vector3(),projected=new Vector3(),pointer=new Vector2(),ray=new Raycaster();let zoom=1;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function layout(){width=el.clientWidth;height=el.clientHeight;const aspect=width/Math.max(1,height),span=width<650?15:11.8;camera.left=-span*aspect;camera.right=span*aspect;camera.top=span;camera.bottom=-span;camera.updateProjectionMatrix();if(renderer)renderer.setSize(width,height,false);else{const dpr=Math.min(devicePixelRatio,1.3);canvas.width=width*dpr;canvas.height=height*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);}}
 const resize=new ResizeObserver(layout);resize.observe(el);layout();
 function down(e:PointerEvent){downX=e.clientX;downY=e.clientY;moved=0;dragging=true;el.setPointerCapture(e.pointerId);}
 function move(e:PointerEvent){if(!dragging)return;const dx=e.clientX-downX;moved=Math.max(moved,Math.abs(dx),Math.abs(e.clientY-downY));dragAngle+=dx*.004;downX=e.clientX;}
 function up(e:PointerEvent){if(!dragging)return;dragging=false;if(moved<6){const rect=el.getBoundingClientRect();pointer.set((e.clientX-rect.left)/width*2-1,-(e.clientY-rect.top)/height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(workshop.root.children,true);if(hits[0]){const point=hits[0].point;let nearest=0,distance=Infinity;stations.forEach((s,i)=>{const d=Math.hypot(point.x-s.position[0],point.z-s.position[2]);if(d<distance){distance=d;nearest=i;}});if(distance<4)select.current(nearest);}}}
 el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);const cancel=()=>{dragging=false;};el.addEventListener('pointercancel',cancel);const visibility=()=>{visible=!document.hidden;};document.addEventListener('visibilitychange',visibility);
 function frame(now:number){raf=requestAnimationFrame(frame);if(!visible||now-last<(renderer?16:45))return;const dt=Math.min((now-last)/1000,.08);last=now;const s=state.current;if(!s.paused&&!reduced)time+=dt;if(room!==s.room){room=s.room;dragAngle=0;}
 target.set(stations[s.room].position[0],stations[s.room].position[1],stations[s.room].position[2]);if(s.room===0){target.x=width<650?0:-1;target.z=0;target.y=0;}else target.y=1;focus.lerp(target,reduced?1:1-Math.exp(-dt*7));targetAngle=.65+s.rotation+dragAngle;angle+=(targetAngle-angle)*(reduced?1:1-Math.exp(-dt*8));const targetZoom=s.zoom*(s.room===0?(width<650?.77:1):width<650?1.45:1.65);zoom+=(targetZoom-zoom)*(reduced?1:1-Math.exp(-dt*7));camera.zoom=zoom;camera.position.set(focus.x+Math.sin(angle)*25,focus.y+22,focus.z+Math.cos(angle)*25);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();workshop.tick(time,s.progress,s.destination);
 if(renderer)renderer.render(scene,camera);else if(ctx)paintSculpture(ctx,workshop.root,camera,width,height,'#dedfd3');
 const parent=el.parentElement;stations.forEach((station,i)=>{projected.set(station.position[0],i===0?1.2:2.4,station.position[2]+(i===0?3.4:0)).project(camera);const pin=parent?.querySelector<HTMLElement>(`[data-station="${i}"]`);if(pin){pin.style.left=`${(projected.x*.5+.5)*width}px`;pin.style.top=`${(-projected.y*.5+.5)*height}px`;pin.style.visibility=projected.x>1||projected.x<-1?'hidden':'visible';}});
 }
 raf=requestAnimationFrame(frame);return()=>{cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener('visibilitychange',visibility);el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',cancel);workshop.dispose();renderer?.dispose();canvas.remove();};
 },[]);
 return <div ref={host} className="workshop-canvas" aria-hidden="true"/>;
}
