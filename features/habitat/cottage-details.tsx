'use client';

import {useLayoutEffect,useMemo,useRef} from 'react';
import {CatmullRomCurve3,Color,InstancedMesh,Object3D,Vector3,type Group} from 'three';
import {Box,Sign} from '@/features/plaza/mesh-kit';
import {COTTAGE_BORDER} from './cottage-layout';
import {DecorSway,useDecorMotion} from './room-details';

type Part={p:[number,number,number];s:[number,number,number];r?:[number,number,number];color:string};
const BLOOMS=['#d69baa','#b5a9cf','#f1dfb5','#97b6c3'];

/** Local cottage-space architectural dressing, never serialized as owner furniture. */
function Instances({parts,name}:{parts:Part[];name:string}){
 const ref=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  const mesh=ref.current;if(!mesh)return;const dummy=new Object3D(),color=new Color();
  parts.forEach((part,i)=>{dummy.position.set(...part.p);dummy.scale.set(...part.s);dummy.rotation.set(...(part.r??[0,0,0]));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,color.set(part.color));});
  mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
 },[parts]);
 return <instancedMesh ref={ref} args={[undefined,undefined,parts.length]} name={name} castShadow receiveShadow><sphereGeometry args={[1,9,6]}/><meshStandardMaterial roughness={.95}/></instancedMesh>;
}

function flowers(centers:Part[],petals:Part[],leaves:Part[],stems:Part[],x:number,y:number,z:number,h:number,t:number,index:number){
 const color=BLOOMS[index%BLOOMS.length],r=.075*t,top=y+h;
 stems.push({p:[x,y+h*.5,z],s:[.012*t,h*.5,.012*t],color:'#597852'});
 leaves.push({p:[x-.045*t,y+h*.46,z],s:[.085*t,.025*t,.035*t],r:[0,0,-.4],color:'#71925f'},{p:[x+.045*t,y+h*.67,z+.025],s:[.085*t,.025*t,.035*t],r:[0,.6,.5],color:'#678851'});
 for(let n=0;n<5;n++){const a=n/5*Math.PI*2;petals.push({p:[x+Math.cos(a)*r*.78,top,z+Math.sin(a)*r*.78],s:[r,.032*t,r*.65],r:[0,-a,0],color});}
 centers.push({p:[x,top+.018*t,z],s:[.038*t,.026*t,.038*t],color:'#e8bf65'});
}

function ClimbingStem({side}:{side:number}){
 const curve=useMemo(()=>new CatmullRomCurve3([
  new Vector3(side*3.08,.16,2.31),new Vector3(side*3.17,.7,2.34),new Vector3(side*2.98,1.18,2.33),new Vector3(side*3.08,1.74,2.34),new Vector3(side*2.72,2.09,2.33),new Vector3(side*2.35,2.12,2.32),
 ]),[side]);
 return <mesh><tubeGeometry args={[curve,24,.019,5,false]}/><meshStandardMaterial color='#65774c' roughness={1}/></mesh>;
}

function HangingLantern({x,night,motion}:{x:number;night:boolean;motion:boolean}){
 const lantern=useRef<Group>(null);
 return <group position={[x,1.5,2.47]}>
  <Box size={[.07,.31,.07]} position={[0,.17,-.18]} color='#5d6457'/>
  <Box size={[.07,.06,.28]} position={[0,.29,-.06]} color='#5d6457'/>
  {/* Only the pendant moves; the wall bracket and suspension point stay put. */}
  <group ref={lantern} position-y={.29} name='cottage-lantern-pendant'>
  <group position-y={-.29}>
  <mesh position-y={.04}><cylinderGeometry args={[.11,.13,.27,6]}/><meshStandardMaterial color='#f1d9a4' emissive='#ffc883' emissiveIntensity={night?.9:.12} roughness={.38}/></mesh>
  {[-1,1].flatMap(a=>[-1,1].map(b=><Box key={`${a}-${b}`} size={[.018,.28,.018]} position={[a*.085,.04,b*.085]} color='#626455'/>))}
  {[-.12,.2].map(y=><mesh key={y} position-y={y}><cylinderGeometry args={[.15,.15,.045,6]}/><meshStandardMaterial color='#626455' metalness={.2} roughness={.7}/></mesh>)}
  <mesh position-y={.25}><coneGeometry args={[.17,.12,6]}/><meshStandardMaterial color='#626455'/></mesh>
  </group>
  </group>
  {motion&&<DecorSway target={lantern} phase={x>0?1.2:0} amount={.6}/>}
 </group>;
}

function WindowBox({x}:{x:number}){
 return <group position={[x,.54,2.4]}>
  <Box size={[1.43,.25,.35]} color='#af8061'/>
  <Box size={[1.49,.045,.4]} position-y={.135} color='#c69c75'/>
  <Box size={[1.27,.025,.27]} position-y={.139} color='#6f6651'/>
  {[-.53,-.18,.18,.53].map(s=><Box key={s} size={[.033,.2,.02]} position={[s,0,.185]} color='#e4ce9b'/>)}
  {[-.45,.45].map(s=><Box key={s} size={[.07,.2,.27]} position={[s,-.21,-.03]} color='#67765c'/>)}
 </group>;
}

function DoorWreath(){
 return <group position={[0,1.3,2.255]}>
  <mesh rotation-x={.08}><torusGeometry args={[.17,.043,6,20]}/><meshStandardMaterial color='#7c9164' roughness={1}/></mesh>
  {[0,1,2,3,4,5,6].map(i=>{const a=i/7*Math.PI*2;return <mesh key={i} position={[Math.cos(a)*.17,Math.sin(a)*.17,.025]} scale={[.065,.045,.038]} rotation-z={a}><sphereGeometry args={[1,7,5]}/><meshStandardMaterial color={i%3?'#98a572':'#d8a4a9'} roughness={1}/></mesh>;})}
  <Box size={[.12,.09,.015]} position={[0,-.19,.055]} color='#d1aa84' rotation-z={.2}/>
 </group>;
}

export default function CottageDetails({night=false,quality='high'}:{night?:boolean;quality?:'low'|'high'}){
 const motion=useDecorMotion(quality==='high');
 const parts=useMemo(()=>{
  const petals:Part[]=[],centers:Part[]=[],leaves:Part[]=[],stems:Part[]=[],stones:Part[]=[];
  const count=quality==='low'?10:18;
  [-2.2,2.2].forEach((x,side)=>{
   for(let i=0;i<count;i++){
    const px=x-.57+(i%6)/5*1.14,pz=2.36+(Math.floor(i/6)%3-1)*.08;
    flowers(centers,petals,leaves,stems,px,.68,pz,.21+(i%4)*.045,.9+(i%3)*.08,i+side*3);
   }
  });
  [-1,1].forEach(side=>{
   for(let i=0;i<23;i++){
    const h=.25+i*.081,x=side*(3.06+Math.sin(i*.71)*.09),z=2.35;
    leaves.push({p:[x+side*.055,h,z],s:[.12,.043,.055],r:[0,.4,side*.55],color:i%3?'#799064':'#96a374'});
    if(i%5===0)flowers(centers,petals,leaves,stems,x,h,z+.03,.025,1.12,i+1);
   }
   for(let i=0;i<(quality==='low'?10:22);i++){
    const a=i*2.399,rr=.11+Math.sqrt((i+.4)/(quality==='low'?10:22))*.16;
    flowers(centers,petals,leaves,stems,side*2.5+Math.cos(a)*rr,.43,2.65+Math.sin(a)*rr,.2+(i%5)*.055,1.16,i+2);
   }
   const n=quality==='low'?16:30;
   for(let i=0;i<n;i++){
    const a=i*2.399,spread=Math.sqrt((i+.5)/n);
    flowers(centers,petals,leaves,stems,side*COTTAGE_BORDER.x+Math.cos(a)*.43*spread,.035,COTTAGE_BORDER.z+Math.sin(a)*1.55*spread,.24+(i%5)*.07,1.2,i+side+3);
   }
   for(let i=0;i<22;i++){const a=i/22*Math.PI*2;stones.push({p:[side*COTTAGE_BORDER.x+Math.cos(a)*COTTAGE_BORDER.rx,.045,COTTAGE_BORDER.z+Math.sin(a)*COTTAGE_BORDER.rz],s:[.14,.065,.11],r:[0,a,0],color:i%3?'#c1baa6':'#d4cbb5'});}
  });
  return {petals,centers,leaves,stems,stones};
 },[quality]);
 return <group name='cottage-artisan-details'>
  {[-1,1].map(side=><mesh key={side} position={[side*COTTAGE_BORDER.x,.012,COTTAGE_BORDER.z]} rotation-x={-Math.PI/2} scale={[COTTAGE_BORDER.rx,COTTAGE_BORDER.rz,1]} receiveShadow><circleGeometry args={[1,32]}/><meshStandardMaterial color='#817657' roughness={1}/></mesh>)}
  <Instances parts={parts.petals} name='cottage-blossoms'/><Instances parts={parts.centers} name='cottage-flower-centers'/><Instances parts={parts.leaves} name='cottage-leaves'/><Instances parts={parts.stems} name='cottage-stems'/><Instances parts={parts.stones} name='cottage-garden-edging'/>
  {[-2.2,2.2].map(x=><WindowBox key={x} x={x}/>)}
  {[-1,1].map(side=><ClimbingStem key={side} side={side}/>)}
  {[-1.02,1.02].map(x=><HangingLantern key={x} x={x} night={night} motion={motion}/>)}
  <DoorWreath/>
  <group position={[0,1.94,2.255]}>
   <Box size={[.84,.22,.045]} color='#ae8664'/><Box size={[.78,.16,.049]} color='#e9ddbd'/>
   <Sign text='a little place to grow' position={[0,0,.027]} width={.7} height={.11} size={81} color='#66765e'/>
  </group>
  {[-2.5,2.5].map(x=><group key={x} position={[x,0,2.65]}>
   <mesh position-y={.2} castShadow><cylinderGeometry args={[.29,.21,.4,12]}/><meshStandardMaterial color='#be8b70' roughness={.95}/></mesh>
   <mesh rotation-x={Math.PI/2} position-y={.395}><torusGeometry args={[.275,.035,5,16]}/><meshStandardMaterial color='#d1a082' roughness={1}/></mesh>
   <mesh rotation-x={-Math.PI/2} position-y={.401}><circleGeometry args={[.25,14]}/><meshStandardMaterial color='#6f6553'/></mesh>
  </group>)}
 </group>;
}
