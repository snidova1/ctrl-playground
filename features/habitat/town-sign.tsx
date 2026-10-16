'use client';
import {useEffect,useLayoutEffect,useRef,type RefObject} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Group,Matrix4,Object3D,PerspectiveCamera,Raycaster,Scene,Vector2,Vector3} from 'three';
import {CSS3DObject,CSS3DRenderer} from 'three/examples/jsm/renderers/CSS3DRenderer.js';

function createSign(interactive:boolean){
 const element=document.createElement(interactive?'button':'span');
 const object=new CSS3DObject(element),scene=new Scene(),renderer=new CSS3DRenderer();
 object.matrixAutoUpdate=false;scene.add(object);
 Object.assign(renderer.domElement.style,{position:'absolute',inset:'0',pointerEvents:'none'});
 element.style.pointerEvents=interactive?'auto':'none';
 return {element,object,scene,renderer,point:new Vector3(),projected:new Vector3(),screen:new Vector2(),eye:new Vector3(),scale:new Matrix4(),ray:new Raycaster()};
}

/** Plain town signs have one DOM owner. Independent React DOM roots inside the
 * Three reconciler can race their own cleanup during cached-page/world changes.
 * Three's CSS renderer preserves perspective, native buttons and narrow mesh
 * occlusion without creating another React root or patching DOM removal. */
export default function TownSign({text,position,distanceFactor,visible=true,occlude,onClick}:{
 text:string;position:[number,number,number];distanceFactor:number;visible?:boolean;
 occlude:readonly RefObject<Object3D>[];onClick?:()=>void;
}){
 const anchor=useRef<Group>(null),{gl,events,size}=useThree();
 const surface=useRef<ReturnType<typeof createSign>|null>(null),interactive=!!onClick;
 const target=events.connected||gl.domElement.parentElement;
 useLayoutEffect(()=>{
  const view=createSign(interactive);surface.current=view;
  target?.appendChild(view.renderer.domElement);
  return()=>{view.renderer.domElement.remove();surface.current=null;};
 },[target,interactive]);
 useLayoutEffect(()=>{surface.current?.renderer.setSize(size.width,size.height);},[target,interactive,size.width,size.height]);
 useEffect(()=>{
  const view=surface.current;if(!view)return;
  view.element.textContent=text;view.element.className=onClick?'hb-directory':'hb-town-label';
  if(view.element instanceof HTMLButtonElement)view.element.type='button';
  view.element.onclick=onClick??null;
  return()=>{view.element.onclick=null;};
 },[target,interactive,text,onClick]);
 useFrame(({camera})=>{
  const view=surface.current;if(!view||!anchor.current)return;
  anchor.current.updateWorldMatrix(true,false);camera.updateMatrixWorld();
  view.point.setFromMatrixPosition(anchor.current.matrixWorld);
  view.projected.copy(view.point).project(camera);
  const distance=view.point.distanceTo(camera.getWorldPosition(view.eye));
  let shown=visible&&view.projected.z>=-1&&view.projected.z<=1;
  if(shown){
   view.ray.setFromCamera(view.screen.set(view.projected.x,view.projected.y),camera);
   const hit=view.ray.intersectObjects(occlude.map(ref=>ref.current),true)[0];
   if(hit)shown=distance<hit.distance;
  }
  view.object.visible=shown;
  view.object.matrix.copy(anchor.current.matrixWorld).multiply(view.scale.makeScale(distanceFactor/400,distanceFactor/400,distanceFactor/400));
  view.renderer.domElement.style.zIndex=String(Math.max(0,Math.round(5-distance/(camera instanceof PerspectiveCamera?camera.far:320)*5)));
  view.renderer.render(view.scene,camera);
 });
 return <group ref={anchor} position={position}/>;
}
