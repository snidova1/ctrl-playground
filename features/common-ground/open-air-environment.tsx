'use client';

import {useEffect, useLayoutEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {CanvasTexture, Color, InstancedMesh, Object3D, SRGBColorSpace} from 'three';
import {Box, Sign} from '@/features/plaza/mesh-kit';
import StorybookClouds from '@/features/worldgacha/storybook-clouds';
import StorybookMeadow from '@/features/worldgacha/storybook-meadow';
import {mulberry32} from '@/features/worldgacha/ghibli-layout';
import GardenDecor from './garden-decor';

// Authored local layout, not the village layout or its simulation. Gaps between
// the planting beds keep the edge visibly natural instead of making a room.
export const CLEARING_TREES = [
  {x:-11.8,z:-8.7,s:1.12}, {x:-5.6,z:-10.5,s:1.02},
  {x:3.4,z:-10.4,s:1.1}, {x:11.5,z:-8.8,s:1.16},
  {x:-12.3,z:-1.6,s:.92}, {x:12.2,z:2.2,s:.96},
  {x:-11.8,z:7.9,s:1.04}, {x:10.8,z:9,s:.95},
];
export const CLEARING_BENCHES = [
  {x:-5.1,z:-2.4,rotation:.34}, {x:5.2,z:-3.8,rotation:-.45},
];
export const CLEARING_SIGN = {x:7.6,z:-7.6};

function paintedTexture(foliage: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = foliage ? 128 : 1024;
  const ctx = canvas.getContext('2d')!;
  const r = mulberry32(foliage ? 612 : 1208), size = canvas.width;
  ctx.fillStyle = foliage ? '#8fa86b' : '#93aa74';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < (foliage ? 800 : 5600); i++) {
    const x=r()*size, y=r()*size, w=foliage ? 3+r()*16 : 4+r()*38;
    ctx.globalAlpha = .045+r()*.12;
    ctx.fillStyle = (foliage ? ['#e2dc9b','#c8d18a','#436e53','#6c935e'] : ['#d1d49a','#b7c78b','#587f59','#7c995e'])[i%4];
    ctx.beginPath();ctx.ellipse(x,y,w,w*.45,r()*3,0,Math.PI*2);ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!foliage) {
    // Coordinates match the actual 28 × 24 ground, including the spawn at z=7.
    const px=(x:number)=>(x+14)/28*size, py=(z:number)=>(z+12)/24*size;
    ctx.strokeStyle='#d5c49c';ctx.lineCap='round';ctx.lineJoin='round';
    ctx.lineWidth=size*.078;
    ctx.beginPath();ctx.moveTo(px(0),py(12));ctx.bezierCurveTo(px(-1),py(8),px(1.4),py(4.5),px(0),py(0));ctx.stroke();
    ctx.lineWidth=size*.054;
    ctx.beginPath();ctx.moveTo(px(-5),py(-2));ctx.quadraticCurveTo(px(-2.6),py(1),px(0),py(0));ctx.quadraticCurveTo(px(4),py(-1),px(7.6),py(-8));ctx.stroke();
    ctx.fillStyle='#d5c49c';ctx.beginPath();ctx.ellipse(px(0),py(0),size*2.8/28,size*2.8/24,0,0,Math.PI*2);ctx.fill();
    for(let i=0;i<7000;i++) {
      ctx.globalAlpha=.055;ctx.fillStyle=i%2?'#fff0cb':'#6e7951';
      ctx.fillRect(r()*size,r()*size,1+r()*4,1+r()*2);
    }
    ctx.globalAlpha=1;
    // Fade the painted sheet into the larger grassy horizon, never a square slab.
    ctx.globalCompositeOperation='destination-in';
    const fade=ctx.createRadialGradient(size/2,size/2,size*.34,size/2,size/2,size*.67);
    fade.addColorStop(0,'#ffffff');fade.addColorStop(1,'#ffffff00');ctx.fillStyle=fade;ctx.fillRect(0,0,size,size);
  }
  const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;
  return texture;
}

function Grove({texture}:{texture:CanvasTexture}) {
  const leaves=useRef<InstancedMesh>(null);
  const clusters=useMemo(()=>{
    const r=mulberry32(241);
    return CLEARING_TREES.flatMap(tree=>Array.from({length:11},(_,i)=>{
      const a=i*2.399, spread=i===0?0:1.05+r()*.6;
      return {x:tree.x+Math.cos(a)*spread*tree.s,y:(3.8+r()*1.1)*tree.s,z:tree.z+Math.sin(a)*spread*tree.s,s:tree.s*(1.15+r()*.48),color:['#779764','#8aa66e','#a7b77c','#64895e'][i%4]};
    }));
  },[]);
  useLayoutEffect(()=>{
    const mesh=leaves.current;if(!mesh)return;
    const object=new Object3D(),color=new Color();
    clusters.forEach((p,i)=>{
      object.position.set(p.x,p.y,p.z);object.scale.set(p.s,p.s*.78,p.s*.9);object.rotation.set(i*.14,i*.73,0);object.updateMatrix();
      mesh.setMatrixAt(i,object.matrix);mesh.setColorAt(i,color.set(p.color));
    });
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
  },[clusters]);
  return <group name='rounded-painted-grove'>
    {CLEARING_TREES.map((t,i)=><group key={i} position={[t.x,0,t.z]} scale={t.s}>
      <mesh position-y={1.65} castShadow><cylinderGeometry args={[.2,.39,3.3,10]}/><meshStandardMaterial color='#81745b' roughness={1}/></mesh>
      <mesh position={[.36,2.6,0]} rotation-z={-.55}><cylinderGeometry args={[.1,.16,1.5,8]}/><meshStandardMaterial color='#81745b' roughness={1}/></mesh>
    </group>)}
    <instancedMesh ref={leaves} args={[undefined,undefined,clusters.length]} castShadow>
      <sphereGeometry args={[1,16,12]}/><meshStandardMaterial map={texture} roughness={1}/>
    </instancedMesh>
  </group>;
}

function FlowerBeds() {
  const flowers=useRef<InstancedMesh>(null),green=useRef<InstancedMesh>(null);
  const beds=useMemo(()=>{
    const r=mulberry32(450);
    return [[-8,-6],[8,-9],[-10,4],[10,6],[-5,10],[5.8,10.4]].flatMap(([x,z])=>Array.from({length:28},()=>{
      const a=r()*Math.PI*2,d=Math.sqrt(r());return {x:x+Math.cos(a)*d*1.8,z:z+Math.sin(a)*d*.9,y:.2+r()*.25,c:['#eedeb1','#d49caa','#a9a6cc','#f3e9ce'][Math.floor(r()*4)]};
    }));
  },[]);
  useLayoutEffect(()=>{
    const leaf=green.current,flower=flowers.current;if(!leaf||!flower)return;
    const o=new Object3D(),c=new Color();
    beds.forEach((p,i)=>{
      o.position.set(p.x,p.y*.48,p.z);o.scale.set(.17,p.y*.65,.18);o.updateMatrix();leaf.setMatrixAt(i,o.matrix);
      o.position.y=p.y;o.scale.set(.1,.055,.1);o.updateMatrix();flower.setMatrixAt(i,o.matrix);flower.setColorAt(i,c.set(p.c));
    });
    for(const mesh of [leaf,flower]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
  },[beds]);
  return <group name='perennial-flower-borders'>
    <instancedMesh ref={green} args={[undefined,undefined,beds.length]}><sphereGeometry args={[1,7,5]}/><meshStandardMaterial color='#668953' roughness={1}/></instancedMesh>
    <instancedMesh ref={flowers} args={[undefined,undefined,beds.length]}><sphereGeometry args={[1,8,5]}/><meshStandardMaterial roughness={1}/></instancedMesh>
  </group>;
}

function Fountain() {
  const drops=useRef<InstancedMesh>(null),dummy=useMemo(()=>new Object3D(),[]);
  useFrame(({clock})=>{
    if(!drops.current)return;
    for(let i=0;i<18;i++) {
      const u=(clock.elapsedTime*.55+i/18)%1,a=i*2.399;
      dummy.position.set(Math.cos(a)*u*.83,.7+1.25*4*u*(1-u),Math.sin(a)*u*.83);
      dummy.scale.set(.026,.05,.026);dummy.updateMatrix();drops.current.setMatrixAt(i,dummy.matrix);
    }
    drops.current.instanceMatrix.needsUpdate=true;
  });
  return <group name='little-meeting-fountain'>
    <mesh position-y={.12} receiveShadow><cylinderGeometry args={[1.56,1.64,.24,40]}/><meshStandardMaterial color='#a7aa91' roughness={1}/></mesh>
    <mesh position-y={.43} rotation-x={-Math.PI/2}><torusGeometry args={[1.3,.2,8,40]}/><meshStandardMaterial color='#d6cfb1' roughness={1}/></mesh>
    <mesh position-y={.32} rotation-x={-Math.PI/2}><circleGeometry args={[1.28,40]}/><meshStandardMaterial color='#8fbfbc' metalness={.12} roughness={.27}/></mesh>
    <mesh position-y={.65}><cylinderGeometry args={[.16,.29,.76,16]}/><meshStandardMaterial color='#b2b59d' roughness={1}/></mesh>
    <mesh position-y={1.05}><sphereGeometry args={[.22,16,10]}/><meshStandardMaterial color='#d6cfb1' roughness={1}/></mesh>
    <instancedMesh ref={drops} args={[undefined,undefined,18]} frustumCulled={false}><sphereGeometry args={[1,6,5]}/><meshBasicMaterial color='#d9eddf'/></instancedMesh>
  </group>;
}

export default function OpenAirEnvironment({night}:{night:boolean}) {
  const textures=useMemo(()=>({ground:paintedTexture(false),leaf:paintedTexture(true)}),[]);
  useEffect(()=>()=>{textures.ground.dispose();textures.leaf.dispose();},[textures]);
  return <group name='common-ground-open-air-clearing'>
    <StorybookClouds night={night}/>
    <mesh rotation-x={-Math.PI/2} position-y={-.018} receiveShadow><circleGeometry args={[80,80]}/><meshStandardMaterial color='#93aa74' roughness={1}/></mesh>
    <mesh rotation-x={-Math.PI/2} receiveShadow><planeGeometry args={[28,24]}/><meshStandardMaterial map={textures.ground} transparent depthWrite={false} roughness={1}/></mesh>
    {/* The same hand-painted botanical cards as Willow, not its houses or world. */}
    {[-7,7].map(x=><group key={x} position={[x,-.01,1]} scale={[.105,.64,.29]}><StorybookMeadow quality='low' still={false} night={night}/></group>)}
    <Grove texture={textures.leaf}/><FlowerBeds/><Fountain/><GardenDecor night={night}/>
    {CLEARING_BENCHES.map((b,i)=><group key={i} position={[b.x,0,b.z]} rotation-y={b.rotation}>
      {[-.85,.85].map(x=><Box key={x} position={[x,.25,0]} size={[.14,.5,.7]} color='#5f7263'/>)}
      {[-.24,0,.24].map(z=><Box key={z} position={[0,.55,z]} size={[2.4,.12,.2]} color='#aa805c'/>)}
      <Box position={[0,1,-.34]} size={[2.4,.48,.12]} color='#c1946d'/>
      <Box position={[-.7,.67,0]} size={[.45,.08,.43]} color='#ae9ebd'/>
      <Box position={[.7,.67,0]} size={[.45,.08,.43]} color='#cd9c91'/>
    </group>)}
    <group position={[CLEARING_SIGN.x,0,CLEARING_SIGN.z]} rotation-y={-.2}>
      <Box position={[0,1.1,0]} size={[.16,2.2,.16]} color='#897657'/>
      <Box position={[.2,1.9,0]} size={[2.65,.53,.14]} color='#dbccaa'/>
      <Sign text='PUBLIC WORLD  →' position={[.2,1.92,.078]} width={2.4} height={.3} size={72} color='#526a53'/>
      <Box position={[.05,1.3,0]} size={[2.35,.36,.14]} color='#b9bea0'/>
      <Sign text='Connect wallet to travel' position={[.05,1.3,.078]} width={2.2} height={.24} size={65} color='#4e654e'/>
    </group>
    {/* Broken arcs of stones indicate the 28 × 24 clearing without a fence. */}
    {Array.from({length:23},(_,i)=>{
      const a=i/23*Math.PI*2,x=Math.cos(a)*13.6,z=Math.sin(a)*11.7;
      if(z>10.4&&Math.abs(x)<4)return null;
      return <mesh key={i} position={[x,.12,z]} rotation={[i*.17,i*1.9,0]} scale={[.36+(i%3)*.1,.2,.29]}><sphereGeometry args={[1,9,6]}/><meshStandardMaterial color={i%2?'#adb39b':'#b9bba3'} roughness={1}/></mesh>;
    })}
  </group>;
}
