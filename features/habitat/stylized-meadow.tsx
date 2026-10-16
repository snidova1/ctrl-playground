'use client';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {BufferGeometry,Float32BufferAttribute,Color,DoubleSide,InstancedMesh,MeshStandardMaterial,Object3D,CanvasTexture,SRGBColorSpace} from 'three';
import {pathWeight,scatterGrass} from './stylized-layout';

// Adapted from Cortiz stylized-components/grassField/shaders/grassBlade.ts:
// quadratic root mask and counter-rotation of a common world-space wind.
// Shared path/patch design follows dedekpo/stylized-scene. MIT notices in docs.
function bladeGeometry(){
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute([-.038,0,0,.038,0,0,-.026,.42,0,.026,.42,0,-.013,.76,0,.013,.76,0,0,1,.045],3));
 geometry.setAttribute('normal',new Float32BufferAttribute(Array.from({length:7},()=>[0,1,0]).flat(),3));
 geometry.setIndex([0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]);return geometry;
}
function groundTexture(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
 const context=canvas.getContext('2d')!,image=context.createImageData(512,512);
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const wx=(x+.5)/512*40-20,wz=(y+.5)/512*32-16;
  const patch=(Math.sin(wx*.43+Math.cos(wz*.32))+Math.cos(wz*.61-wx*.17))*.5;
  const grain=(Math.sin(x*12.989+y*78.233)*43758.5453)%1;
  const blend=pathWeight(wx,wz),i=(y*512+x)*4;
  image.data[i]=(112+patch*13+grain*3)*(1-blend)+209*blend;
  image.data[i+1]=(151+patch*12+grain*3)*(1-blend)+190*blend;
  image.data[i+2]=(88+patch*8)*(1-blend)+148*blend;image.data[i+3]=255;
 }
 context.putImageData(image,0,0);const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.anisotropy=4;return texture;
}
export default function StylizedMeadow({quality}:{quality:'low'|'high'}){
 const mesh=useRef<InstancedMesh>(null);
 const placements=useMemo(()=>scatterGrass(quality==='high'?14500:3500),[quality]);
 const geometry=useMemo(bladeGeometry,[]),texture=useMemo(groundTexture,[]);
 const uniforms=useMemo(()=>({uMeadowTime:{value:0},uGrassRoot:{value:new Color('#50774d')},uGrassTip:{value:new Color('#a4c077')}}),[]);
 const material=useMemo(()=>{
  const material=new MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,side:DoubleSide});
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>\nuniform float uMeadowTime;varying float vBladeHeight;varying float vPatch;varying vec3 vGrassNormal;`)
   .replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 base=(instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
    float along=dot(base.xz,vec2(.8,.6));
    float gust=sin(along*.65+uMeadowTime*1.4)+.28*sin(along*1.7+uMeadowTime*2.1);
    mat3 rotationOnly=mat3(normalize(vec3(instanceMatrix[0])),normalize(vec3(instanceMatrix[1])),normalize(vec3(instanceMatrix[2])));
    transformed+=transpose(rotationOnly)*vec3(.8,0.,.6)*gust*.16*position.y*position.y;
    vBladeHeight=position.y;vPatch=.5+.25*sin(base.x*.43+cos(base.z*.32))+.25*cos(base.z*.61-base.x*.17);
    vGrassNormal=normalize(normalMatrix*vec3(0.,1.,0.));`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nuniform vec3 uGrassRoot,uGrassTip;varying float vBladeHeight;varying float vPatch;varying vec3 vGrassNormal;`)
   .replace('#include <color_fragment>',`#include <color_fragment>\ndiffuseColor.rgb*=mix(uGrassRoot,uGrassTip,pow(vBladeHeight,.7))*mix(.9,1.1,vPatch);`)
   .replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>\nnormal=normalize(vGrassNormal);`);
  };
  material.customProgramCacheKey=()=> 'habit-meadow-v1';return material;
 },[uniforms]);
 useLayoutEffect(()=>{if(!mesh.current)return;const dummy=new Object3D();placements.forEach((blade,i)=>{dummy.position.set(blade.x,.01,blade.z);dummy.rotation.set(0,blade.angle,0);dummy.scale.set(1,blade.height,1);dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);});mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();},[placements]);
 useEffect(()=>()=>{geometry.dispose();material.dispose();texture.dispose();},[geometry,material,texture]);
 useFrame(({clock})=>{uniforms.uMeadowTime.value=clock.elapsedTime;});
 return <group>
  <mesh rotation-x={-Math.PI/2} position-y={-.045} receiveShadow><circleGeometry args={[90,64]}/><meshStandardMaterial color='#96ad80' roughness={1}/></mesh>
  <mesh rotation-x={-Math.PI/2} position-y={-.012} receiveShadow><planeGeometry args={[40,32]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>
  <instancedMesh ref={mesh} args={[geometry,material,placements.length]} receiveShadow={quality==='high'} dispose={null} userData={{kind:'wind-grass',instances:placements.length}}/>
 </group>;
}
