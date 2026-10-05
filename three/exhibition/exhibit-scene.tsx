'use client';
import {useEffect,useRef} from 'react';
import {ACESFilmicToneMapping,Color,DirectionalLight,Group,HemisphereLight,Mesh,MeshStandardMaterial,PerspectiveCamera,PlaneGeometry,PMREMGenerator,Raycaster,Scene,Vector2,WebGLRenderer} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {makeForm,type Exhibit} from './geometry';
import {paintSculpture} from './software-renderer';
const palettes:Record<Exhibit,string>={machine:'#e6e5df','dead-web':'#bac5ba','internet-weather':'#bdccd1','agent-orbit':'#171d1e'};
export default function ExhibitScene({kind='machine',weights=[],selected=0,onSelect,paused=false,activeIndices}:{kind?:Exhibit;weights?:number[];selected?:number;onSelect?:(index:number)=>void;paused?:boolean;activeIndices?:number[]}){
 const host=useRef<HTMLDivElement>(null),selection=useRef(selected),onPick=useRef(onSelect),pause=useRef(paused),active=useRef(activeIndices);const weightKey=weights.join(',');
 useEffect(()=>{active.current=activeIndices;selection.current=selected;onPick.current=onSelect;pause.current=paused;},[activeIndices,selected,onSelect,paused]);
 useEffect(()=>{
  if(!host.current)return;const element=host.current;const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');element.appendChild(canvas);
  const scene=new Scene(),camera=new PerspectiveCamera(38,1,.1,100),root=new Group(),form=makeForm(kind,weightKey?weightKey.split(',').map(Number):[]);scene.background=new Color(palettes[kind]);scene.add(root);root.add(form.root);camera.position.set(0,.3,10.7);camera.lookAt(0,0,0);
  let gl:WebGLRenderer|null=null,ctx:CanvasRenderingContext2D|null=null,pmrem:PMREMGenerator|null=null,environment:ReturnType<PMREMGenerator['fromScene']>|null=null;const room=new RoomEnvironment();
  try{const context=canvas.getContext('webgl2',{alpha:false,antialias:true});if(context){gl=new WebGLRenderer({canvas,context,antialias:true});gl.setPixelRatio(Math.min(devicePixelRatio,1.5));gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=1.25;gl.shadowMap.enabled=true;pmrem=new PMREMGenerator(gl);environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;}}
  catch{gl?.dispose();gl=null;}
  if(!gl){ctx=canvas.getContext('2d');element.dataset.renderer='canvas';}else element.dataset.renderer='webgl';
  const hemi=new HemisphereLight('#ffffff','#858d7e',2.5);scene.add(hemi);const sun=new DirectionalLight('#fff9ec',4);sun.position.set(-3,7,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  const floorGeometry=new PlaneGeometry(200,200),floorMaterial=new MeshStandardMaterial({color:palettes[kind],roughness:.9});const floor=new Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-3.6;floor.receiveShadow=true;scene.add(floor);
  let width=1,height=1,raf=0,last=0,time=0,angle=0,target=0,tilt=0,targetTilt=0,dragX:number|null=null,dragY=0,moved=0,visible=true,drawnState='';const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const raycaster=new Raycaster(),pointer=new Vector2();
  function resize(){width=element.clientWidth;height=element.clientHeight;camera.aspect=width/height;camera.updateProjectionMatrix();root.position.x=width<650?0:.68;root.position.y=width<650?1.05:.12;root.scale.setScalar(width<650?Math.min(.72,width/height*1.25):1);if(gl)gl.setSize(width,height,false);else{const dpr=Math.min(devicePixelRatio,1.4);canvas.width=width*dpr;canvas.height=height*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);}}
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  function down(e:PointerEvent){dragX=e.clientX;dragY=e.clientY;moved=0;element.setPointerCapture(e.pointerId);element.classList.add('dragging');}
  function move(e:PointerEvent){if(dragX!==null){const dx=e.clientX-dragX,dy=e.clientY-dragY;moved+=Math.abs(dx)+Math.abs(dy);target+=dx*.006;targetTilt=Math.max(-.45,Math.min(.45,targetTilt+dy*.003));dragX=e.clientX;dragY=e.clientY;}}
  function up(e:PointerEvent){if(e.type==='pointerup'&&dragX!==null&&moved<8){const rect=element.getBoundingClientRect();pointer.set((e.clientX-rect.left)/width*2-1,-(e.clientY-rect.top)/height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(form.pickable,false)[0];if(hit)onPick.current?.(Number(hit.object.userData.index));}dragX=null;element.classList.remove('dragging');}
  function key(e:KeyboardEvent){if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();target+=e.key==='ArrowLeft'?-.3:.3;}if(e.key==='Home'){target=0;targetTilt=0;}}
  const visibility=()=>{visible=!document.hidden;};document.addEventListener('visibilitychange',visibility);element.addEventListener('pointerdown',down);element.addEventListener('pointermove',move);element.addEventListener('pointerup',up);element.addEventListener('pointercancel',up);element.addEventListener('keydown',key);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&!document.hidden;});intersection.observe(element);
  function render(now:number){raf=requestAnimationFrame(render);if(!visible||now-last<(gl?16:33))return;const currentState=[width,height,selection.current,active.current?.join(',')].join('|');if((pause.current||reduced)&&Math.abs(target-angle)<.001&&Math.abs(targetTilt-tilt)<.001&&drawnState===currentState)return;drawnState=currentState;const dt=Math.min((now-last)/1000,.05);last=now;if(!pause.current&&!reduced)time+=dt;angle+=(target-angle)*.1;tilt+=(targetTilt-tilt)*.1;root.rotation.y=angle;root.rotation.x=tilt;form.tick(time,selection.current,active.current);if(gl)gl.render(scene,camera);else if(ctx)paintSculpture(ctx,root,camera,width,height,palettes[kind]);}
  raf=requestAnimationFrame(render);
  return()=>{cancelAnimationFrame(raf);observer.disconnect();intersection.disconnect();document.removeEventListener('visibilitychange',visibility);element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',up);element.removeEventListener('keydown',key);form.dispose();floorGeometry.dispose();floorMaterial.dispose();environment?.dispose();room.dispose();pmrem?.dispose();gl?.dispose();canvas.remove();};
 },[kind,weightKey]);
 return <div ref={host} className="exhibit-stage" tabIndex={0} role="group" aria-label="Interactive installation. Drag to turn; left and right arrow keys rotate; Home resets the view."/>;
}
