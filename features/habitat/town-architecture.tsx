'use client';
import {useMemo,useRef,useCallback} from 'react';
import {RoundedBox} from '@react-three/drei';
import TownSign from './town-sign';
import {BoxGeometry,BufferGeometry,Matrix4,Shape,Object3D} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {useEffect} from 'react';
import {PUBLIC_WORLD_BUILDINGS} from './public-world-geography';
import {TOWN_PALETTE as P} from './town-palette';
import {GroundShadow,paintedTexture} from './town-surfaces';
import {TownAsset} from './town-assets';
import {assignOcclusionTarget} from './town-occlusion';
import TownRoof,{type TownRoofKind} from './town-roof';
import {ShopCanopy,ShopJoinery} from './town-storefront-detail';

const HOUSE_ROOFS:Readonly<Record<string,TownRoofKind>>={
 'WILLOW BAKERY':'gambrel','MAKERS HOUSE':'clerestory','GARDEN HOUSE':'hip',
 'ART STUDIO':'clerestory','LAKE COTTAGE':'hip','HILL COTTAGE':'gambrel',
};

function GableRoof({width,depth,base,rise=1.5,color}:{width:number;depth:number;base:number;rise?:number;color:string}){
 const half=width/2+.35,angle=Math.atan2(rise,half),length=Math.hypot(half,rise);
 const shape=useMemo(()=>new Shape().moveTo(-half,0).lineTo(0,rise).lineTo(half,0).closePath(),[half,rise]);
 const roof=useMemo(()=>paintedTexture('roof'),[]);
 return <group position-y={base}>
  <mesh position={[0,0,-depth/2-.35]}><extrudeGeometry args={[shape,{depth:depth+.7,bevelEnabled:false}]}/><meshStandardMaterial color={P.cream}/></mesh>
  {[-1,1].map(side=><group key={side}>
   <mesh position={[side*half/2,rise/2,0]} rotation-z={-side*angle} receiveShadow castShadow><boxGeometry args={[length,.09,depth+.85]}/><meshStandardMaterial color={color} map={roof} roughness={.96}/></mesh>
   <mesh position={[side*half/2,rise/2,depth/2+.47]} rotation-z={-side*angle}><boxGeometry args={[length+.06,.14,.14]}/><meshStandardMaterial color={P.trim}/></mesh>
  </group>)}
  <mesh position-y={rise+.045} rotation-x={Math.PI/2}><cylinderGeometry args={[.12,.12,depth+.92,8]}/><meshStandardMaterial color={color}/></mesh>
  <group position={[0,rise*.5,depth/2+.36]}>
   <mesh><circleGeometry args={[.27,24]}/><meshStandardMaterial color={P.forest}/></mesh>
   <mesh position-z={.015}><torusGeometry args={[.29,.045,6,24]}/><meshStandardMaterial color={P.trim}/></mesh>
   <mesh position-z={.035}><boxGeometry args={[.48,.04,.04]}/><meshStandardMaterial color={P.trim}/></mesh>
   <mesh position-z={.035}><boxGeometry args={[.04,.48,.04]}/><meshStandardMaterial color={P.trim}/></mesh>
  </group>
 </group>;
}
function ShutterWindow({x,y,z,width=1.25,height=1.4,flowers=false}:{x:number;y:number;z:number;width?:number;height?:number;flowers?:boolean}){
 const geometry=useMemo(()=>{
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,rx=0)=>new BoxGeometry(w,h,d).applyMatrix4(new Matrix4().makeRotationX(rx).setPosition(x,y,z));
  const merge=(parts:BufferGeometry[])=>{const combined=mergeGeometries(parts)!;parts.forEach(part=>part.dispose());return combined;};
  const frame=merge([box(-width/2-.04,0,.09,.08,height+.16,.12),box(width/2+.04,0,.09,.08,height+.16,.12),box(0,-height/2-.04,.09,width+.16,.08,.12),box(0,height/2+.04,.09,width+.16,.08,.12),box(0,0,.13,.055,height,.05),box(0,0,.13,width,.055,.05)]);
  const boards=merge([-1,1].map(side=>box(side*(width/2+.28),0,.07,.34,height+.12,.12)));
  const slats=merge([-1,1].flatMap(side=>Array.from({length:6},(_,i)=>box(side*(width/2+.28),-height*.4+i*height*.16,.15,.3,.055,.07,-.15))));
  return {frame,boards,slats};
 },[width,height]);
 useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
 return <group position={[x,y,z]}>
  <mesh position-z={.09}><boxGeometry args={[width,height,.05]}/><meshStandardMaterial map={paintedTexture('glass')} roughness={.26} metalness={.08} emissive='#cfb586' emissiveIntensity={.045}/></mesh>
  <mesh geometry={geometry.frame} dispose={null}><meshStandardMaterial color={P.trim}/></mesh>
  <mesh geometry={geometry.boards} dispose={null}><meshStandardMaterial color={P.shutter}/></mesh>
  <mesh geometry={geometry.slats} dispose={null}><meshStandardMaterial color={P.sage}/></mesh>
  {flowers&&<group position={[0,-height/2-.17,.15]}>
   <mesh><boxGeometry args={[width+.25,.22,.42]}/><meshStandardMaterial color={P.wood}/></mesh>
   {[-.42,0,.42].map((dx,i)=><TownAsset key={dx} id={i%2?'nature-kit/flower_yellowB':'nature-kit/flower_redA'} size={.35} x={dx} y={.12}/>)}
  </group>}
 </group>;
}
function ArchedDoor({z}:{z:number}){
 const arch=useMemo(()=>new Shape().moveTo(-.61,0).lineTo(.61,0).lineTo(.61,1.73).absarc(0,1.73,.61,0,Math.PI,false).lineTo(-.61,0).closePath(),[]);
 return <group position={[0,.08,z]}>
  <mesh><extrudeGeometry args={[arch,{depth:.1,bevelEnabled:true,bevelSize:.045,bevelThickness:.03,bevelSegments:1}]}/><meshStandardMaterial color={P.sage}/></mesh>
  <mesh position={[.35,1.04,.15]}><sphereGeometry args={[.055,8,6]}/><meshStandardMaterial color={P.wood} metalness={.2} roughness={.45}/></mesh>
  <mesh position={[0,1.79,.12]}><circleGeometry args={[.36,20]}/><meshStandardMaterial color={P.forest}/></mesh>
  {[-.3,0,.3].map(x=><mesh key={x} position={[x,.8,.115]}><boxGeometry args={[.025,1.35,.025]}/><meshStandardMaterial color={P.shutter}/></mesh>)}
 </group>;
}
/** Distant LOD keeps real closed building volume instead of rendering hundreds
 * of window/flower/label draw calls while the player explores another district. */
function TownShell({x,z,width,depth,height=4.12,rise=1.5,wall,roof,kind}:{x:number;z:number;width:number;depth:number;height?:number;rise?:number;wall:string;roof:string;kind?:TownRoofKind}){
 const shape=useMemo(()=>new Shape().moveTo(-width/2-.35,0).lineTo(0,rise).lineTo(width/2+.35,0).closePath(),[width,rise]);
 return <group position={[x,0,z]}><mesh position-y={height/2} castShadow receiveShadow><boxGeometry args={[width,height,depth]}/><meshStandardMaterial color={wall} roughness={.95}/></mesh>{kind?<TownRoof width={width} depth={depth} base={height} rise={rise} kind={kind} color={roof}/>:<mesh position={[0,height,-depth/2-.35]} castShadow receiveShadow><extrudeGeometry args={[shape,{depth:depth+.7,bevelEnabled:false}]}/><meshStandardMaterial color={roof} roughness={.95}/></mesh>}</group>;
}
function RoofDetail({width,depth,kind,color}:{width:number;depth:number;kind:TownRoofKind;color:string}){
 if(kind==='clerestory')return <group position={[-width*.14,5.32,0]}>
  <mesh position-z={depth/2+.37}><boxGeometry args={[width*.38,.43,.07]}/><meshStandardMaterial color={P.forest} roughness={.4}/></mesh>
  {[-.5,0,.5].map(x=><mesh key={x} position={[x*width*.35,0,depth/2+.43]}><boxGeometry args={[.06,.5,.08]}/><meshStandardMaterial color={P.trim}/></mesh>)}
 </group>;
 if(kind==='hip')return null;
 return <group position={[0,4.45,depth*.29]}>
  <mesh position-y={.35}><boxGeometry args={[1.65,.7,1.2]}/><meshStandardMaterial color={P.cream}/></mesh>
  <ShutterWindow x={0} y={.39} z={.64} width={.8} height={.6}/>
  <GableRoof width={1.65} depth={1.2} base={.7} rise={.55} color={color}/>
 </group>;
}
// Keep native CSS sign anchors stable across LOD swaps; only their visibility
// changes. Their DOM ownership is separate from the React DOM reconciler.
export function TownHouse({site,detailed=true}:{site:typeof PUBLIC_WORLD_BUILDINGS[number];detailed?:boolean}){
 const empty=useMemo(()=>new Object3D(),[]),body=useRef(empty);
 const mount=useCallback((object:Object3D|null)=>assignOcclusionTarget(body,object,empty),[empty]);
 const w=site.width,d=site.depth,kind=HOUSE_ROOFS[site.name];
 return <group position={[site.x,0,site.z]}>
  {detailed?<group>
  <GroundShadow width={w+2} depth={d+2}/>
  <RoundedBox ref={mount} args={[w,4.12,d]} position-y={2.06} radius={.06} smoothness={1} receiveShadow><meshStandardMaterial color={site.color} map={paintedTexture('plaster')} roughness={1}/></RoundedBox>
  <mesh position-y={.23}><boxGeometry args={[w+.06,.46,d+.06]}/><meshStandardMaterial color={P.pot}/></mesh>
  <TownRoof width={w} depth={d} base={4.12} kind={kind} color={site.roof}/>
  <RoofDetail width={w} depth={d} kind={kind} color={site.roof}/>
  {site.name==='MAKERS HOUSE'&&[-w*.33,0,w*.33].map(x=><mesh key={x} position={[x,3.25,d/2+.1]}><boxGeometry args={[.13,1.35,.13]}/><meshStandardMaterial color={P.wood}/></mesh>)}
  {site.name==='GARDEN HOUSE'&&<mesh position={[0,3.12,d/2+.28]}><boxGeometry args={[w*.82,.14,.65]}/><meshStandardMaterial color={P.sage}/></mesh>}
  <mesh position={[w*.27,5.3,-d*.22]}><boxGeometry args={[.6,1.15,.6]}/><meshStandardMaterial color={P.terracotta}/></mesh>
  <mesh position={[w*.27,5.87,-d*.22]}><boxGeometry args={[.76,.14,.76]}/><meshStandardMaterial color={P.pot}/></mesh>
  <ArchedDoor z={d/2+.08}/>
  {[-w*.29,w*.29].map(x=><ShutterWindow key={x} x={x} y={2.4} z={d/2+.07} flowers/>)}
  {[-1,1].map(side=><group key={side} position={[side*(w/2+.07),0,0]} rotation-y={side*Math.PI/2}>
   {[-d*.24,d*.24].map(dx=><ShutterWindow key={dx} x={dx} y={2.4} z={0}/>)}
  </group>)}
  <mesh position={[0,.12,d/2+.55]}><boxGeometry args={[2.1,.2,.95]}/><meshStandardMaterial color={P.pot}/></mesh>
  {[-w/2+.12,w/2-.12].map(x=><mesh key={x} position={[x,2.06,d/2+.06]}><boxGeometry args={[.2,4.12,.14]}/><meshStandardMaterial color={P.trim}/></mesh>)}
  <mesh position={[0,3.74,d/2+.12]}><boxGeometry args={[Math.min(w-1,4.9),.42,.16]}/><meshStandardMaterial color={P.trim}/></mesh>
  </group>:<TownShell x={0} z={0} width={w} depth={d} rise={1.6} wall={site.color} roof={site.roof} kind={kind}/>}
  <TownSign visible={detailed} occlude={[body]} position={[0,3.74,d/2+.24]} distanceFactor={8} text={site.name}/>
 </group>;
}
export function MarketFront({x,name,base,roof,detailed=true}:{x:number;name:string;base:string;roof:string;detailed?:boolean}){
 const flowerShop=name==='FLOWER MARKET';
 const empty=useMemo(()=>new Object3D(),[]),body=useRef(empty);
 const mount=useCallback((object:Object3D|null)=>assignOcclusionTarget(body,object,empty),[empty]);
 return <group position={[x,0,-9]}>
  {detailed?<group>
  <GroundShadow width={11} depth={7}/>
  <RoundedBox ref={mount} args={[9,4.6,3.8]} position-y={2.3} radius={.06} smoothness={1} receiveShadow><meshStandardMaterial color={base} map={paintedTexture('plaster')} roughness={1}/></RoundedBox>
  <mesh position-y={.23}><boxGeometry args={[9.06,.46,3.86]}/><meshStandardMaterial color={P.pot}/></mesh>
  {flowerShop?<TownRoof width={9} depth={3.8} base={4.6} rise={1.8} kind='hip' color={roof}/>:<GableRoof width={9} depth={3.8} base={4.6} rise={1.1} color={roof}/>}
  {flowerShop&&<group position={[0,6.62,0]}>
   <mesh><boxGeometry args={[2.4,.85,1.35]}/><meshStandardMaterial color={P.forest} roughness={.35}/></mesh>
   {[-1.2,-.4,.4,1.2].map(v=><mesh key={v} position={[v,0,.72]}><boxGeometry args={[.07,.9,.07]}/><meshStandardMaterial color={P.trim}/></mesh>)}
   <GableRoof width={2.4} depth={1.35} base={.42} rise={.6} color={P.sage}/>
  </group>}
  <ArchedDoor z={1.96}/>
  {[-2.75,2.75].map(dx=><ShutterWindow key={dx} x={dx} y={2.18} z={1.97} width={1.85} height={2.18}/>)}
  {[-4.34,4.34].map(dx=><mesh key={dx} position={[dx,2.3,1.98]}><boxGeometry args={[.2,4.6,.12]}/><meshStandardMaterial color={P.trim}/></mesh>)}
  <ShopCanopy color={roof}/>
  <ShopJoinery/>
  <RoundedBox args={[5,.48,.15]} position={[0,4.08,2.08]} radius={.04} smoothness={1}><meshStandardMaterial color={P.trim}/></RoundedBox>
  </group>:<TownShell x={0} z={0} width={9} depth={3.8} height={4.6} rise={flowerShop?1.8:1.1} wall={base} roof={roof} kind={flowerShop?'hip':undefined}/>}
  <TownSign visible={detailed} occlude={[body]} position={[0,4.08,2.2]} distanceFactor={10} text={name}/>
 </group>;
}
