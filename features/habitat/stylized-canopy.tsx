'use client';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CanvasTexture,Color,DoubleSide,InstancedMesh,MeshStandardMaterial,Object3D,PlaneGeometry} from 'three';
import {seededRandom} from './stylized-layout';
import {GHIBLI_RAMP_GLSL} from './ghibli-shading';

// Clustered alpha-tested foliage and canopy-normal shaping, inspired by
// stylized-scene's tree/normals/wind pipeline (MIT). The GLSL/atlas are local.
function leafAtlas(){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
 const ctx=canvas.getContext('2d')!;
 const gradient=ctx.createLinearGradient(0,128,0,0);gradient.addColorStop(0,'#bac3ad');gradient.addColorStop(1,'#ffffff');ctx.fillStyle=gradient;
 [[37,42,49,18,-.6],[75,31,44,17,-.9],[88,60,50,19,-.35],[69,88,49,19,.35],[35,85,43,17,.8],[34,65,46,20,-.15],[63,61,50,22,-.6]].forEach(([x,y,length,width,angle])=>{ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-length/2,0);ctx.quadraticCurveTo(0,-width,length/2,0);ctx.quadraticCurveTo(0,width,-length/2,0);ctx.fill();ctx.restore();});
 return new CanvasTexture(canvas);
}
export default function StylizedCanopy({x,z,scale,turn,quality}:{x:number;z:number;scale:number;turn:number;quality:'low'|'high'}){
 const mesh=useRef<InstancedMesh>(null),count=quality==='high'?260:110;
 const texture=useMemo(leafAtlas,[]),geometry=useMemo(()=>new PlaneGeometry(1,1),[]);
 const uniforms=useMemo(()=>({uCanopyTime:{value:0}}),[]);
 const material=useMemo(()=>{
  const m=new MeshStandardMaterial({map:texture,alphaTest:.4,side:DoubleSide,roughness:1,metalness:0,color:'#ffffff',emissive:'#597e43',emissiveIntensity:.08});
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nuniform float uCanopyTime;varying vec3 vCanopyNormal;varying float vCrownY;`)
    .replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 base=vec3(instanceMatrix[3]);
      vec3 worldBase=(modelMatrix*vec4(base,1.)).xyz;
      float gust=sin(dot(worldBase.xz,vec2(.8,.6))*.65+uCanopyTime*1.4);
      mat3 ir=mat3(normalize(vec3(instanceMatrix[0])),normalize(vec3(instanceMatrix[1])),normalize(vec3(instanceMatrix[2])));
      transformed+=transpose(ir)*vec3(.8,0.,.6)*gust*.065;
      vec3 crownNormal=normalize(vec3(base.x*.6,(base.y-3.15)*.75+.6,base.z*.6));
      vCanopyNormal=normalize(normalMatrix*crownNormal);vCrownY=base.y;`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vCanopyNormal;varying float vCrownY;\n${GHIBLI_RAMP_GLSL}`)
    .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>\nnormal=normalize(vCanopyNormal);`)
    .replace('#include <color_fragment>',`#include <color_fragment>
      float toonLight=.65;
      #if NUM_DIR_LIGHTS > 0
        toonLight=clamp(dot(normalize(vCanopyNormal),normalize(directionalLights[0].direction))+.1,0.,1.);
      #endif
      diffuseColor.rgb*=habitGhibliRamp(toonLight)*mix(.95,1.04,smoothstep(2.1,4.4,vCrownY));`);
  };
  m.customProgramCacheKey=()=> 'habit-ghibli-canopy-v2';return m;
 },[texture,uniforms]);
 useLayoutEffect(()=>{
  if(!mesh.current)return;const random=seededRandom(Math.floor((x+30)*173+(z+30)*97)),dummy=new Object3D(),color=new Color();
  const palette=['#719b52','#85ad59','#99bb66','#aec777'];
  for(let i=0;i<count;i++){
   const a=random()*Math.PI*2,y=random()*2-1,r=Math.sqrt(1-y*y)*Math.cbrt(.3+random()*.7);
   dummy.position.set(Math.cos(a)*r*1.65,3.15+y*1.05,Math.sin(a)*r*1.4);
   dummy.rotation.set((random()-.5)*.6,random()*Math.PI*2,(random()-.5)*.5);dummy.scale.setScalar(.43+random()*.46);dummy.updateMatrix();
   mesh.current.setMatrixAt(i,dummy.matrix);mesh.current.setColorAt(i,color.set(palette[i%palette.length]));
  }
  mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;mesh.current.computeBoundingSphere();
 },[count,x,z]);
 useFrame(({clock})=>{uniforms.uCanopyTime.value=clock.elapsedTime;});
 useEffect(()=>()=>{texture.dispose();geometry.dispose();material.dispose();},[texture,geometry,material]);
 return <group position={[x,0,z]} scale={scale} rotation-y={turn}>
  <mesh position-y={1.35} castShadow receiveShadow><cylinderGeometry args={[.17,.32,2.7,12]}/><meshStandardMaterial color='#8a6c47' roughness={1}/></mesh>
  {[-1,1].map(side=><mesh key={side} position={[side*.33,2.25,0]} rotation-z={side*-.65} castShadow><cylinderGeometry args={[.085,.15,1.2,9]}/><meshStandardMaterial color='#90734d' roughness={1}/></mesh>)}
  <instancedMesh ref={mesh} args={[geometry,material,count]} castShadow={quality==='high'} receiveShadow dispose={null} userData={{kind:'painterly-canopy'}}/>
 </group>;
}
