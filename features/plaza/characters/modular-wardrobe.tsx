'use client';
import {useEffect,useMemo} from 'react';
import {createPortal} from '@react-three/fiber';
import {BufferGeometry,DoubleSide,Float32BufferAttribute,Mesh,QuadraticBezierCurve3,TubeGeometry,Vector3} from 'three';
import {MToonMaterial,type VRM} from '@pixiv/three-vrm';
import {defaultGeometry,hairVariants,outfitVariants,type CharacterAppearance} from './catalog';

const sourceVisibility=new WeakMap<object,boolean>();
function garment(rings:readonly (readonly [number,number,number])[],frontOnly=false){
 const vertices:number[]=[],indices:number[]=[],steps=24;
 for(const [y,width,depth] of rings)for(let i=0;i<=steps;i++){
  const angle=(frontOnly?-Math.PI/2:0)+i/steps*(frontOnly?Math.PI:Math.PI*2);
  vertices.push(Math.sin(angle)*width,y,Math.cos(angle)*depth);
 }
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<steps;i++){
  const a=row*(steps+1)+i,b=a+steps+1;indices.push(a,b,a+1,a+1,b,b+1);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
/** Original wardrobe meshes fitted to the existing approved VRM skeleton. */
export default function ModularWardrobe({vrm,appearance}:{vrm:VRM;appearance:CharacterAppearance}){
 const geometry=appearance.geometry??defaultGeometry;
 const hairColor=hairVariants.find(h=>h.id===appearance.hairId)?.tint??'#4b3931';
 const cloth=outfitVariants.find(h=>h.id===appearance.variantId)?.clothTint??'#b8caaa';
 const hair=hairColor==='#ffffff'?'#ac845b':hairColor,color=cloth==='#ffffff'?'#557c6b':cloth;
 const shapes=useMemo(()=>({
  cape:garment([[.02,.13,.095],[-.12,.2,.12],[-.34,.26,.16],[-.58,.3,.19]]),
  apron:garment([[.04,.19,.125],[-.2,.175,.135],[-.45,.25,.21],[-.75,.36,.26]],true),
  bob:Array.from({length:18},(_,i)=>{const a=i/18*Math.PI*2;const front=Math.cos(a)<-.45;return new TubeGeometry(new QuadraticBezierCurve3(new Vector3(Math.sin(a)*.11,.23,Math.cos(a)*.1),new Vector3(Math.sin(a)*.157,.08,Math.cos(a)*.14),new Vector3(Math.sin(a)*.135,front?.16:-.13,Math.cos(a)*.115)),6,.023,5,false);}),
  tail:new TubeGeometry(new QuadraticBezierCurve3(new Vector3(0,.19,-.12),new Vector3(.04,.05,-.23),new Vector3(.035,-.42,-.22)),12,.042,7,false),
 }),[]);
 useEffect(()=>()=>Object.values(shapes).flat().forEach(g=>g.dispose()),[shapes]);
 useEffect(()=>{
  const affected:object[]=[];
  vrm.scene.traverse(object=>{if(!(object instanceof Mesh)||object.userData.ctrlWardrobe)return;for(const material of [object.material].flat())if(material instanceof MToonMaterial&&/HAIR/i.test(material.name)){
   if(!sourceVisibility.has(material))sourceVisibility.set(material,material.visible);
   affected.push(material);material.visible=geometry.hair==='bob'?false:sourceVisibility.get(material)!;
  }});
  return()=>{for(const object of affected)(object as MToonMaterial).visible=sourceVisibility.get(object)!;};
 },[vrm,geometry.hair]);
 const head=vrm.humanoid.getNormalizedBoneNode('head'),chest=vrm.humanoid.getNormalizedBoneNode('upperChest')??vrm.humanoid.getNormalizedBoneNode('chest'),hips=vrm.humanoid.getNormalizedBoneNode('hips');
 return <>
  {head&&createPortal(<group userData={{ctrlWardrobe:true}}>
   {geometry.hair==='bob'&&<><mesh position-y={.16} scale={[1,1,.86]}><sphereGeometry args={[.143,16,12,0,Math.PI*2,0,Math.PI*.58]}/><meshToonMaterial color={hair} side={DoubleSide}/></mesh>{shapes.bob.map((g,i)=><mesh key={i} geometry={g} dispose={null}><meshToonMaterial color={hair}/></mesh>)}</>}
   {geometry.hair==='ponytail'&&<><mesh geometry={shapes.tail} dispose={null}><meshToonMaterial color={hair}/></mesh><mesh position={[0,.17,-.13]}><torusGeometry args={[.044,.009,5,12]}/><meshToonMaterial color={color}/></mesh></>}
   {geometry.accessory==='beret'&&<group position={[0,.28,0]} rotation-z={.13}><mesh scale={[1,.34,1]}><sphereGeometry args={[.165,16,10]}/><meshToonMaterial color={color}/></mesh><mesh position-y={.06}><cylinderGeometry args={[.012,.012,.04,6]}/><meshToonMaterial color={color}/></mesh></group>}
   {geometry.accessory==='glasses'&&<group position={[0,.083,-.111]} rotation-y={Math.PI}>{[-.048,.048].map(x=><mesh key={x} position-x={x}><torusGeometry args={[.037,.0035,5,18]}/><meshToonMaterial color='#826e47'/></mesh>)}<mesh><boxGeometry args={[.03,.006,.005]}/><meshToonMaterial color='#826e47'/></mesh></group>}
  </group>,head)}
  {chest&&geometry.outfit==='cape'&&createPortal(<group rotation-y={Math.PI} position-z={-.045}><mesh geometry={shapes.cape} dispose={null}><meshToonMaterial color={color} side={DoubleSide}/></mesh><mesh position={[0,0,.12]}><sphereGeometry args={[.017,8,6]}/><meshToonMaterial color='#d9ba75'/></mesh></group>,chest)}
  {chest&&geometry.outfit==='apron'&&createPortal(<group position={[0,-.04,-.035]} rotation-y={Math.PI}><mesh geometry={shapes.apron} dispose={null}><meshToonMaterial color='#e5d5b7' side={DoubleSide}/></mesh><mesh position={[0,-.36,.18]}><boxGeometry args={[.16,.16,.018]}/><meshToonMaterial color={color}/></mesh></group>,chest)}
  {hips&&geometry.accessory==='satchel'&&createPortal(<group position={[.24,-.12,.05]}><mesh><boxGeometry args={[.23,.24,.08]}/><meshToonMaterial color='#99725b'/></mesh><mesh position={[0,.08,.046]}><boxGeometry args={[.24,.085,.015]}/><meshToonMaterial color='#b98d6c'/></mesh><mesh position={[0,.025,.06]}><boxGeometry args={[.035,.025,.01]}/><meshToonMaterial color='#d9ba75'/></mesh></group>,hips)}
  {geometry.footwear==='boots'&&(['leftFoot','rightFoot'] as const).map(name=>{const foot=vrm.humanoid.getNormalizedBoneNode(name);return foot?createPortal(<group><mesh position={[0,-.035,0]}><cylinderGeometry args={[.059,.069,.16,10]}/><meshToonMaterial color={color}/></mesh></group>,foot):null;})}
 </>;
}
