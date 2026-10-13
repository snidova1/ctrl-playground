'use client';
import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import type {ShaderMaterial} from 'three';

const vertex=`
 varying vec2 vUv;
 varying vec3 vWorld;
 void main(){
   vUv=uv;vec4 world=modelMatrix*vec4(position,1.0);
   vWorld=world.xyz;
   gl_Position=projectionMatrix*viewMatrix*world;
 }
`;
const fragment=`
 precision highp float;
 uniform float uTime;
 varying vec2 vUv;varying vec3 vWorld;
 float wave(vec2 p){return sin(p.x*1.3+sin(p.y*.91+uTime*.17)*2.2+uTime*.36)
                  *cos(p.y*1.17+uTime*.21);}
 void main(){
   float a=wave(vWorld.xz*.28);
   float b=wave(vWorld.zx*.67+vec2(7.0,12.0));
   float stripe=smoothstep(.49,.61,a*.55+b*.45);
   float sparkle=pow(max(0.0,sin(vWorld.x*4.7+uTime*2.0)
                     *cos(vWorld.z*3.1-uTime*.65)),22.0);
   vec3 deep=vec3(.28,.55,.61),pale=vec3(.52,.75,.75),foam=vec3(.81,.94,.89);
   vec3 color=mix(deep,pale,smoothstep(-.9,.8,a));
   color=mix(color,foam,stripe*.37+sparkle*.26);
   gl_FragColor=vec4(color,1.0);
 }
`;
/** Cheap three-tone animated water shared by central canal and remote harbor. */
export default function TownStylizedWater({x,y=-.05,z,width,depth}:{x:number;y?:number;z:number;width:number;depth:number}){
 const mat=useRef<ShaderMaterial>(null);
 useFrame(({clock})=>{if(mat.current)mat.current.uniforms.uTime.value=clock.elapsedTime;});
 return <mesh rotation-x={-Math.PI/2} position={[x,y,z]} receiveShadow={false}>
  <planeGeometry args={[width,depth,1,1]}/>
  <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={{uTime:{value:0}}}/>
 </mesh>;
}
