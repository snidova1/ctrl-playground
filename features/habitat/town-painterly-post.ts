'use client';
/**
 * CTRL Willow Painterly Post, inspired by Summer Cycle's local-variance
 * Kuwahara, editorial ink, split-tone and stationary paper grain.
 * Upstream: StarKnightt/summer-cycle src/render/post.ts
 * Copyright (c) 2026 Prasenjit, MIT License.
 * The license is reproduced in docs/CTRL_PR32_SUMMER_CYCLE_LICENSE.md.
 *
 * One lightweight screen pass, integrated into the existing R3F budget loop.
 * No depth/normal MRT, second render loop, GTAO, bloom or SMAA on mobile.
 */
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {Vector2,type WebGLRenderer,type Scene,type Camera} from 'three';

const vertexShader=/* glsl */ `
 varying vec2 vUv;
 void main(){
  vUv=uv;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
 }
`;
export const willowPainterlyFragment=/* glsl */ `
 uniform sampler2D tDiffuse;
 uniform vec2 uResolution;
 uniform float uPaint;
 uniform float uInk;
 uniform float uGrain;
 varying vec2 vUv;

 float luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
 float hash12(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
 }
 float smoothNoise(vec2 p){
  vec2 cell=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash12(cell),hash12(cell+vec2(1.,0.)),f.x),
    mix(hash12(cell+vec2(0.,1.)),hash12(cell+1.),f.x),f.y);
 }
 // Adapted from Summer Cycle's local-variance sector painting technique.
 // Four sectors with four taps each reduce processing relative to 4 x 9.
 vec3 inkWash(vec2 uv,vec3 original,out float detail){
  vec2 px=1.0/uResolution;
  vec3 selected=original;
  float lowest=10000.0;
  for(int sector=0;sector<4;sector++){
   vec2 dir=vec2(sector==1||sector==2?-1.:1.,sector>=2?-1.:1.);
   vec3 sum=vec3(0.);
   float squares=0.;
   for(int yi=0;yi<2;yi++){
    for(int xi=0;xi<2;xi++){
     vec2 offset=vec2(float(xi),float(yi))*dir*px*1.4;
     vec3 c=texture2D(tDiffuse,clamp(uv+offset,vec2(0.),vec2(1.))).rgb;
     sum+=c;
     float l=luminance(c);
     squares+=l*l;
    }
   }
   vec3 mean=sum*.25;
   float variance=max(0.,squares*.25-pow(luminance(mean),2.));
   if(variance<lowest){lowest=variance;selected=mean;}
  }
  detail=lowest;
  return selected;
 }
 void main(){
  vec2 texel=1.0/uResolution;
  vec3 color=texture2D(tDiffuse,vUv).rgb;
  vec3 north=texture2D(tDiffuse,vUv+vec2(0.,texel.y*1.3)).rgb;
  vec3 south=texture2D(tDiffuse,vUv-vec2(0.,texel.y*1.3)).rgb;
  vec3 east=texture2D(tDiffuse,vUv+vec2(texel.x*1.3,0.)).rgb;
  vec3 west=texture2D(tDiffuse,vUv-vec2(texel.x*1.3,0.)).rgb;
  float edge=max(abs(luminance(north)-luminance(south)),
                 abs(luminance(east)-luminance(west)));
  float maxColor=max(length(north-south),length(east-west));
  float ink=smoothstep(.060,.23,edge+maxColor*.27);
  // Keep patterned paving and far leaf cards from becoming harsh black edges.
  ink*=smoothstep(.09,.19,luminance(color))*.75;
  if(uPaint>.01){
   float variance;
   vec3 paint=inkWash(vUv,color,variance);
   float calm=1.0-smoothstep(.0005,.012,variance);
   color=mix(color,paint,uPaint*.60*calm*(1.0-ink));
  }
  // Warm golden-paper highlights with cool, airy shadow tint.
  float l=luminance(color);
  color*=mix(vec3(.965,1.,1.035),vec3(1.06,1.015,.95),smoothstep(.13,.85,l));
  color=mix(vec3(l),color,1.10);
  color=mix(color,color*vec3(.21,.15,.13),clamp(ink*uInk,0.,.55));
  vec2 fc=gl_FragCoord.xy;
  float paper=smoothNoise(fc*.16)*.6+smoothNoise(fc*.45+9.)*.4;
  color*=1.0+(paper-.5)*uGrain*.085;
  vec2 q=vUv-.5;
  color*=1.0-smoothstep(.37,.85,length(q))*.075;
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
 }
`;

export type PainterlyProfile='desktop'|'mobile';
export const WILLOW_PAINTERLY_SETTINGS={
 desktop:{paint:.83,ink:.48,grain:.8,pixelRatio:1},
 mobile:{paint:0,ink:.31,grain:.45,pixelRatio:.85}
} as const;

/** Owned by StageRenderBudget; no second RAF or independent render loop. */
export class WillowPainterlyPost{
 readonly composer:EffectComposer;
 private readonly pass:ShaderPass;
 private readonly renderer:WebGLRenderer;
 private readonly currentProfile:PainterlyProfile;
 constructor(renderer:WebGLRenderer,scene:Scene,camera:Camera,width:number,height:number,profile:PainterlyProfile){
  this.renderer=renderer;
  this.currentProfile=profile;
  this.composer=new EffectComposer(renderer);
  this.composer.setPixelRatio(Math.min(renderer.getPixelRatio(),WILLOW_PAINTERLY_SETTINGS[profile].pixelRatio));
  this.composer.addPass(new RenderPass(scene,camera));
  this.pass=new ShaderPass({
   uniforms:{
    tDiffuse:{value:null},uResolution:{value:new Vector2(1,1)},
    uPaint:{value:WILLOW_PAINTERLY_SETTINGS[profile].paint},
    uInk:{value:WILLOW_PAINTERLY_SETTINGS[profile].ink},
    uGrain:{value:WILLOW_PAINTERLY_SETTINGS[profile].grain}
   },
   vertexShader,fragmentShader:willowPainterlyFragment
  });
  this.composer.addPass(this.pass);
  this.setSize(width,height);
 }
 setSize(w:number,h:number){
  this.composer.setSize(w,h);
  const ratio=Math.min(this.renderer.getPixelRatio(),WILLOW_PAINTERLY_SETTINGS[this.currentProfile].pixelRatio);
  this.pass.uniforms.uResolution.value.set(Math.max(1,Math.floor(w*ratio)),Math.max(1,Math.floor(h*ratio)));
 }
 render(dt:number){this.composer.render(dt);}
 dispose(){this.composer.dispose();this.pass.material.dispose();}
}
