'use client';
import {useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {DoubleSide,InstancedMesh,Object3D,ShaderMaterial} from 'three';
import {TOWN_ACTIVITIES,TOWN_DISTRICT_BUILDINGS,type TownDistrict} from './town-districts';

/**
 * One instanced GLSL grass pass per visible region. Inspired by techniques in
 * stylized-components and summer-cycle, but the geometry, noise and code below
 * are original CTRL code. No dependency on WebGPU or expensive post effects.
 */
const vertex=`
 uniform float uTime;
 varying float vHeight;
 varying float vSeed;
 void main(){
   vec3 p=position;
   float h=clamp(uv.y,0.0,1.0);
   vec4 origin=instanceMatrix*vec4(0.0,0.0,0.0,1.0);
   float seed=sin(origin.x*1.7+origin.z*2.13);
   p.x+=(sin(uTime*1.15+origin.x*.31+origin.z*.27)*.21+sin(uTime*.54+seed*8.0)*.12)*h*h;
   p.z+=cos(uTime*.83+origin.z*.33)*.09*h*h;
   vHeight=h;
   vSeed=seed;
   gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.0);
 }
`;
const fragment=`
 precision highp float;
 varying float vHeight;
 varying float vSeed;
 void main(){
   vec3 a=vec3(.21,.42,.23),b=vec3(.57,.71,.40);
   float textureTint=.65+.35*sin(vSeed*11.0);
   vec3 c=mix(a,b,pow(vHeight,.78))*textureTint;
   c+=vec3(.09,.08,.02)*smoothstep(.8,1.0,vHeight);
   gl_FragColor=vec4(c,1.0);
 }
`;
export function TownWindGrass({district,quality}:{district:TownDistrict;quality:'low'|'high'}){
 const n=quality==='high'?1000:370;
 const ref=useRef<InstancedMesh>(null),material=useRef<ShaderMaterial>(null);
 const placements=useMemo(()=>{
  const points:{x:number;z:number;angle:number;scale:number}[]=[];
  for(let i=0;i<n*2&&points.length<n;i++){
   const x=district.x+(Math.sin(i*17.131)*.5+Math.sin(i*.919)*.5)*47;
   const z=district.z+(Math.sin(i*11.83)*.5+Math.sin(i*.61)*.5)*43;
   if(Math.abs(x-district.x)<3.5||Math.abs(z-district.z)<3.8)continue;
   if(TOWN_DISTRICT_BUILDINGS.some(b=>Math.abs(x-b.x)<b.width/2+1.6&&Math.abs(z-b.z)<b.depth/2+1.6))continue;
   if(TOWN_ACTIVITIES.some(a=>Math.hypot(x-a.x,z-a.z)<5))continue;
   points.push({x,z,angle:i*.79,scale:.55+Math.abs(Math.sin(i*9.7))*.65});
  }
  return points;
 },[district,n]);
 useLayoutEffect(()=>{
  if(!ref.current)return;
  const obj=new Object3D();
  placements.forEach((p,i)=>{
    obj.position.set(p.x,.47*p.scale,p.z);
    obj.rotation.set(0,p.angle,0);
    obj.scale.set(p.scale,p.scale,p.scale);
    obj.updateMatrix();ref.current!.setMatrixAt(i,obj.matrix);
  });
  ref.current.count=placements.length;
  ref.current.instanceMatrix.needsUpdate=true;
 },[placements]);
 useFrame(({clock})=>{if(material.current)material.current.uniforms.uTime.value=clock.elapsedTime;});
 return <instancedMesh ref={ref} args={[undefined,undefined,n]} frustumCulled={false} castShadow={false}>
  <planeGeometry args={[.25,.95,1,3]}/>
  <shaderMaterial ref={material} vertexShader={vertex} fragmentShader={fragment} uniforms={{uTime:{value:0}}} side={DoubleSide}/>
 </instancedMesh>;
}
