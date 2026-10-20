'use client';
import {useEffect,useLayoutEffect,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Color,DoubleSide,Group,InstancedMesh,Object3D} from 'three';
import {Box,Sign} from './mesh-kit';
import {seededRandom} from '@/features/habitat/stylized-layout';
import {advanceAmbient,birdPose,butterflyPose,PERGOLA_POSTS,PUBLIC_BEDS,publicLifeBudget,type PublicQuality} from './public-life-layout';

function FlowerBeds({count}:{count:number}){
 const flowers=useRef<InstancedMesh>(null),leaves=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{if(!flowers.current||!leaves.current)return;const random=seededRandom(4187),dummy=new Object3D(),color=new Color(),palette=['#f7cd79','#df91a0','#c4b2e6','#fff0ce'];
  for(let i=0;i<count;i++){const bed=PUBLIC_BEDS[i%4],x=bed.x+(random()-.5)*.8,z=bed.z+(random()-.5)*2.1,y=.65+random()*.34;
   dummy.position.set(x,y,z);dummy.rotation.set(random()*.4,random()*6.28,0);dummy.scale.set(.09,.065,.09);dummy.updateMatrix();flowers.current.setMatrixAt(i,dummy.matrix);flowers.current.setColorAt(i,color.set(palette[i%4]));
   dummy.position.y=y-.15;dummy.scale.set(.12,.16,.1);dummy.updateMatrix();leaves.current.setMatrixAt(i,dummy.matrix);leaves.current.setColorAt(i,color.set(i%2?'#668e57':'#8fa76a'));
  }
  for(const m of [flowers.current,leaves.current]){m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.computeBoundingSphere();}
 },[count]);
 return <group name='public-flower-beds'>{PUBLIC_BEDS.map((p,i)=><group key={i}><Box position={[p.x,.24,p.z]} size={[p.w,.48,p.d]} color='#cab69a'/><Box position={[p.x,.49,p.z]} size={[p.w-.12,.05,p.d-.12]} color='#665b43'/></group>)}<instancedMesh ref={flowers} args={[undefined,undefined,count]}><sphereGeometry args={[1,7,5]}/><meshStandardMaterial roughness={1}/></instancedMesh><instancedMesh ref={leaves} args={[undefined,undefined,count]}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial roughness={1}/></instancedMesh></group>;
}
function Greenery({count,time}:{count:number;time:React.MutableRefObject<number>}){
 const mesh=useRef<InstancedMesh>(null),group=useRef<Group>(null);
 useLayoutEffect(()=>{if(!mesh.current)return;const dummy=new Object3D(),random=seededRandom(9842),color=new Color();for(let i=0;i<count;i++){
  const balcony=i%12,building=Math.floor(balcony/2),x=-14+building*6+(balcony%2?1.25:-1.25);const trail=(i%6)*.15;
  dummy.position.set(x+(random()-.5)*1.3,5.95-trail,-8.72+random()*.2);dummy.rotation.set(random()*2,random()*3,random()*2);dummy.scale.setScalar(.13+random()*.11);dummy.updateMatrix();mesh.current.setMatrixAt(i,dummy.matrix);mesh.current.setColorAt(i,color.set(i%3?'#718e57':'#9daf72'));
 }mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;mesh.current.computeBoundingSphere();},[count]);
 useFrame(()=>{if(group.current)group.current.rotation.z=Math.sin(time.current*.7)*.0012;});
 return <group ref={group} name='balcony-gardens'><instancedMesh ref={mesh} args={[undefined,undefined,count]}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial roughness={1}/></instancedMesh></group>;
}
function Pergola({time,night}:{time:React.MutableRefObject<number>;night:boolean}){const ribbons=useRef<Group>(null);useFrame(()=>{if(ribbons.current)ribbons.current.rotation.x=Math.sin(time.current*.9)*.035;});return <group name='gathering-pergola'>
 {PERGOLA_POSTS.map((p,i)=><Box key={i} position={[p.x,1.85,p.z]} size={[.18,3.7,.18]} color='#9c8968'/>)}
 {[-.1,3.1].map(z=><Box key={z} position={[-7.05,3.7,z]} size={[7.05,.18,.2]} color='#a18d68'/>)}
 {Array.from({length:8},(_,i)=><Box key={i} position={[-10.5+i,3.84,1.5]} size={[.14,.13,3.7]} color='#b5a178'/>)}
 <group ref={ribbons} position={[-7.05,3.48,3.13]}>{Array.from({length:11},(_,i)=><mesh key={i} position={[-3+i*.6,-Math.sin(i/10*Math.PI)*.22,0]} rotation-z={Math.PI}><coneGeometry args={[.16,.28,3]}/><meshStandardMaterial color={['#c77966','#e5c87d','#879c7c'][i%3]} roughness={1}/></mesh>)}</group>
 {Array.from({length:12},(_,i)=><group key={i} position={[-14+i*2.6,4.8-Math.sin(i/11*Math.PI)*.9,-3.7]}><mesh><sphereGeometry args={[.065,7,5]}/><meshStandardMaterial color='#fff3cc' emissive='#ffd187' emissiveIntensity={night?2:.35}/></mesh>{i<11&&<mesh position={[1.3,-.025,0]} rotation-z={Math.PI/2}><cylinderGeometry args={[.012,.012,2.62,5]}/><meshStandardMaterial color='#6a6b55'/></mesh>}</group>)}
 <Sign text='STAY A LITTLE' color='#f6ebd0' background='#61765e' width={2} height={.32} size={95} position={[-7.05,3.5,3.25]}/>
 </group>;}
export default function PublicLife({quality,still,night=false}:{quality:PublicQuality;still:boolean;night?:boolean}){
 const budget=publicLifeBudget(quality),root=useRef<Group>(null),flutter=useRef<InstancedMesh>(null),birds=useRef<Group>(null),time=useRef(0),published=useRef(-1),dummy=useRef(new Object3D());const {gl}=useThree();
 useEffect(()=>{const d=gl.domElement.dataset;d.publicLife='ready';d.publicFlowers=String(budget.flowers);d.publicButterflies=String(budget.butterflies);d.publicBirds=String(budget.birds);d.publicQuality=quality;d.publicStill=String(still);return()=>{delete d.publicLife;};},[gl,quality,still,budget]);
 useFrame(({clock},dt)=>{
  time.current=advanceAmbient(time.current,dt,still);const t=time.current;
  if(root.current){root.current.userData.ambientTime=t;root.current.userData.quality=quality;}
  if(flutter.current){for(let i=0;i<budget.butterflies;i++){const p=butterflyPose(i,t);for(let wing=0;wing<2;wing++){
   const side=wing?1:-1,d=dummy.current;d.position.set(p.x+side*.065,p.y,p.z);d.rotation.set(.4,side*p.wing,p.turn);d.scale.set(.13,.08,.1);d.updateMatrix();flutter.current.setMatrixAt(i*2+wing,d.matrix);
  }}flutter.current.instanceMatrix.needsUpdate=true;}
  birds.current?.children.forEach((b,i)=>{const p=birdPose(i,t);b.position.set(p.x,p.y,p.z);b.rotation.y=p.turn;b.children.forEach((wing,j)=>{wing.rotation.z=(j?1:-1)*p.wing;});});
  if(clock.elapsedTime-published.current>.5){published.current=clock.elapsedTime;const d=gl.domElement.dataset;d.ambientTime=t.toFixed(4);d.renderCalls=String(gl.info.render.calls);d.renderTriangles=String(gl.info.render.triangles);}
 });
 return <group ref={root} name='public-world-life' userData={{kind:'ambient-wildlife',syntheticVisitors:false}}>
  <FlowerBeds count={budget.flowers}/><Greenery count={budget.leaves} time={time}/><Pergola time={time} night={night}/>
  <instancedMesh ref={flutter} args={[undefined,undefined,budget.butterflies*2]} frustumCulled={false} name='garden-butterflies'><circleGeometry args={[1,5]}/><meshStandardMaterial color='#f6d18b' side={DoubleSide} roughness={1}/></instancedMesh>
  <group ref={birds} name='sky-birds'>{Array.from({length:budget.birds},(_,i)=><group key={i}>{[-1,1].map(side=><mesh key={side} position-x={side*.14} scale={[.33,.045,.14]}><sphereGeometry args={[1,7,4]}/><meshStandardMaterial color='#687365' roughness={1}/></mesh>)}</group>)}</group>
 </group>;
}
