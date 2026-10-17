'use client';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {Html,RoundedBox} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {
 BufferGeometry,CatmullRomCurve3,Color,Float32BufferAttribute,Group,
 IcosahedronGeometry,InstancedMesh,Object3D,Shape,Vector3,CanvasTexture,RepeatWrapping,SRGBColorSpace
} from 'three';
import {PUBLIC_WORLD_BUILDINGS,PUBLIC_WORLD_SHOPS} from './public-world-geography';
import TownSign from './town-sign';
import TownStylizedWater from './town-stylized-water';
import {TownFountain,CanalBoat} from './town-waterfront';
import {paintedTexture} from './town-surfaces';

/**
 * PR32: a NEW authored village scene, not an extension of the procedural
 * town-house renderer. Server collision, positions and interaction IDs live
 * in public-world-geography.ts and are left untouched.
 *
 * Buildings, footpaths and foliage use one coherent illustration palette;
 * scenic geometry is intentionally disconnected from movement collision.
 */
export const ANIME_WORLD_PALETTE={
 sky:'#cce6e5',grass:'#a8c18c',deepGrass:'#759c78',
 ivory:'#f3e6c8',cream:'#eee4cd',stone:'#d9c19b',
 moss:'#82967b',teal:'#577f7b',wood:'#8b6853',
 ink:'#435c50',sun:'#ffe4a7',clay:'#b86955',
 rose:'#c98b7f',yellow:'#ddb785',blue:'#739b9b',
} as const;

type Point=readonly [number,number];
const clamp=(x:number)=>Math.min(1,Math.max(0,x));
const foliageShapes=[0,1,2].map(seed=>{
 const g=new IcosahedronGeometry(1,1),p=g.getAttribute('position');
 const col=new Float32Array(p.count*3),low=new Color('#597e65'),high=new Color('#b6c995'),gold=new Color('#d3d3a0');
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  const angle=Math.atan2(z,x),w=1+.09*Math.sin(angle*5+seed*2)+.045*Math.sin(y*12+seed);
  p.setXYZ(i,x*w,y*(.92+.05*Math.sin(x*3)),z*w);
  const color=low.clone().lerp(high,clamp(.45+y*.34-x*.12));
  color.lerp(gold,clamp(y-.4)*.26);
  color.toArray(col,i*3);
 }
 g.setAttribute('color',new Float32BufferAttribute(col,3));
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
});
/** Pale irregular paths keep the green landscape visible instead of covering
 * the whole foreground in repetitive brick tiles. No path collision change.
 */
export function makeAnimePath(points:readonly Point[],width:number,seed=0){
 const curve=new CatmullRomCurve3(points.map(([x,z])=>new Vector3(x,.065,z)),false,'centripetal');
 const steps=Math.max(24,points.length*16),xyz:number[]=[],rgb:number[]=[],uv:number[]=[];
 const neutral=new Color('#e8d3ac'),edge=new Color('#b3af84'),highlight=new Color('#f4e5bf');
 const push=(v:Vector3,color:Color)=>{
  xyz.push(v.x,v.y,v.z);uv.push(v.x/4.5,v.z/4.5);color.toArray(rgb,rgb.length);
 };
 for(let i=0;i<steps;i++){
  const band=(t:number,side:number)=>{
   const p=curve.getPoint(t),tangent=curve.getTangent(t),r=width*(.5+.045*Math.sin(t*13+seed));
   return new Vector3(p.x-tangent.z*side*r,p.y,p.z+tangent.x*side*r);
  };
  const t=i/steps,u=(i+1)/steps,shade=(i%7)/7;
  const left=neutral.clone().lerp(edge,.15+shade*.12);
  const right=neutral.clone().lerp(highlight,.25+shade*.15);
  const a=band(t,-1),b=band(t,1),c=band(u,1),d=band(u,-1);
  // Keep the winding strips facing upward for front-side rendering.
  push(a,left);push(b,right);push(c,right);
  push(a,left);push(c,right);push(d,left);
 }
 const geometry=new BufferGeometry();
 geometry.setAttribute('position',new Float32BufferAttribute(xyz,3));
 geometry.setAttribute('color',new Float32BufferAttribute(rgb,3));
 geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
const VILLAGE_PATHS:{points:readonly Point[];width:number}[]=[
 {points:[[-38,9],[-23,8],[-8,8],[7,8],[23,9],[38,10]],width:4.35},
 {points:[[0,39],[-.7,27],[1,15],[.6,5],[-.4,-8],[0,-16]],width:4.6},
 {points:[[-26,37],[-23,26],[-21,17],[-24,9]],width:2.4},
 {points:[[27,36],[23,26],[21,17],[23,9]],width:2.5},
 {points:[[-28,-11],[-13,-12],[-5,-12]],width:2.7},
 {points:[[28,-11],[14,-12],[5,-12]],width:2.7},
 {points:[[20,-25],[20,-18],[20,-13]],width:3.7},
 {points:[[0,-27],[0,-23],[0,-16]],width:4.1},
];
function makeRoadPaint(){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#fffdf3';ctx.fillRect(0,0,256,256);
 // Broad watercolor grain, not a repeating square-brick albedo.
 for(let i=0;i<140;i++){
  const hash=(k:number)=>{const n=Math.sin(i*127.13+k*311.71)*43758.5453;return n-Math.floor(n);};
  const x=hash(1)*256,y=hash(2)*256,r=3+hash(3)*14;
  const wash=ctx.createRadialGradient(x,y,0,x,y,r);
  wash.addColorStop(0,i%2?'#8b876014':'#ffffff50');wash.addColorStop(1,'#ffffff00');
  ctx.fillStyle=wash;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 ctx.lineWidth=.9;
 for(let i=0;i<410;i++){
  const x=(i*41.371)%256,y=(i*67.829)%256;
  ctx.strokeStyle=i%3===0?'#96836124':'#b1a57d24';
  ctx.beginPath();ctx.moveTo(x,y);
  ctx.quadraticCurveTo(x+1.3,y-1.1,x+2.5+(i%3),y-.4);ctx.stroke();
 }
 const tex=new CanvasTexture(canvas);tex.colorSpace=SRGBColorSpace;
 tex.wrapS=tex.wrapT=RepeatWrapping;tex.anisotropy=4;return tex;
}
function AnimeFootpaths(){
 const paths=useMemo(()=>VILLAGE_PATHS.map((road,i)=>makeAnimePath(road.points,road.width,i)),[]);
 const roadPaint=useMemo(makeRoadPaint,[]);
 useEffect(()=>()=>{paths.forEach(g=>g.dispose());roadPaint.dispose();},[paths,roadPaint]);
 return <group>{paths.map((geometry,i)=><mesh key={i} geometry={geometry} receiveShadow dispose={null}>
  <meshStandardMaterial map={roadPaint} vertexColors roughness={1} polygonOffset polygonOffsetFactor={-1}/>
 </mesh>)}</group>;
}
/** One curving roof mesh, not a triangle on top of a cube.
 * The front-facing gable + broad overhang reads at mobile gameplay distance.
 */
export function makeAnimeRoof(w:number,d:number,rise:number,seed=0){
 const positions:number[]=[],colors:number[]=[],uv:number[]=[];
 const dark=new Color('#c0b8ae'),clay=new Color('#eee6d8'),gold=new Color('#fff7e6');
 const xp=[-1,-.82,-.63,-.32,0,.32,.63,.82,1];
 const yp=[0,.22,.60,.91,1,.91,.60,.22,0];
 const z0=-d/2-.65,z1=d/2+.65;
 const vertex=(x:number,y:number,z:number,light:number)=>{
  positions.push(x,y,z);uv.push(x/4.5,(z+y*.6)/4.5);
  clay.clone().lerp(dark,clamp(.13+(.5-light)*.35)).lerp(gold,clamp(light*.42))
   .toArray(colors,colors.length);
 };
 for(let i=0;i<xp.length-1;i++){
  const a=new Vector3(xp[i]*(w/2+.84),yp[i]*rise,z0),
   b=new Vector3(xp[i+1]*(w/2+.84),yp[i+1]*rise,z0),
   c=new Vector3(b.x,b.y,z1),d0=new Vector3(a.x,a.y,z1);
  const tint=.38+.2*Math.sin(i*1.9+seed);
  for(const [p,v] of [[a,tint],[c,tint+.07],[b,tint+.1],[a,tint],[d0,tint+.07],[c,tint+.07]] as const)
   vertex(p.x,p.y,p.z,v);
 }
 const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(positions,3));
 g.setAttribute('color',new Float32BufferAttribute(colors,3));
 g.setAttribute('uv',new Float32BufferAttribute(uv,2));
 g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
function PainterlyRoof({w,d,rise=2,variant=0,base=3.92,color}:{
 w:number;d:number;rise?:number;variant?:number;base?:number;color:string
}){
 const roof=useMemo(()=>makeAnimeRoof(w,d,rise,variant),[w,d,rise,variant]);
 const gable=useMemo(()=>new Shape().moveTo(-w/2,0)
  .lineTo(0,rise*.92).lineTo(w/2,0).closePath(),[w,rise]);
 useEffect(()=>()=>roof.dispose(),[roof]);
 return <group position-y={base}>
  <mesh geometry={roof} dispose={null} castShadow receiveShadow>
   <meshStandardMaterial vertexColors map={paintedTexture('roof')} roughness={1} color={color} side={2}/>
  </mesh>
  {[-1,1].map(side=><mesh key={side} position={[0,0,side*(d/2+.53)]}
   rotation-y={side>0?0:Math.PI}>
   <shapeGeometry args={[gable]}/>
   <meshStandardMaterial color={ANIME_WORLD_PALETTE.cream} roughness={1} side={2}/>
  </mesh>)}
  <mesh position={[0,rise+.015,0]} castShadow>
   <cylinderGeometry args={[.12,.12,d+1.42,9]}/>
   <meshStandardMaterial color={color} roughness={1}/>
  </mesh>
 </group>;
}
function HandPaintedWindow({x,y,z,w=.95,h=1.24,flower=false}:{
 x:number;y:number;z:number;w?:number;h?:number;flower?:boolean
}){
 return <group position={[x,y,z]}>
  <RoundedBox args={[w+.18,h+.22,.19]} radius={.09} smoothness={2}>
   <meshStandardMaterial color='#f6eccd' roughness={1}/>
  </RoundedBox>
  <mesh position-z={.13}><planeGeometry args={[w,h]}/>
   <meshStandardMaterial color='#7ba39a' roughness={.4} metalness={0}
    emissive='#a8c7aa' emissiveIntensity={.035}/></mesh>
  <mesh position={[0,0,.16]}><boxGeometry args={[.065,h,.05]}/>
   <meshStandardMaterial color='#f5e4bd'/></mesh>
  <mesh position={[0,0,.16]}><boxGeometry args={[w,.065,.05]}/>
   <meshStandardMaterial color='#f5e4bd'/></mesh>
  {[-1,1].map(side=><group key={side} position={[side*(w/2+.24),0,.08]}
   rotation-y={side*.38}>
   <mesh><boxGeometry args={[.32,h+.12,.09]}/>
    <meshStandardMaterial color={ANIME_WORLD_PALETTE.teal} roughness={1}/></mesh>
   {[...Array(4)].map((_,i)=><mesh key={i} position={[0,-h*.33+i*h*.21,.067]}>
    <boxGeometry args={[.28,.038,.045]}/><meshStandardMaterial color='#9cb5a0'/></mesh>)}
  </group>)}
  {flower&&<group position={[0,-h/2-.24,.30]}>
   <mesh><boxGeometry args={[w+.35,.25,.38]}/>
    <meshStandardMaterial color={ANIME_WORLD_PALETTE.wood}/></mesh>
   {[-.28,0,.28].map((v,i)=><group key={i} position={[v,.18,.02]}>
    <mesh><cylinderGeometry args={[.024,.025,.32,5]}/><meshStandardMaterial color='#678568'/></mesh>
    <mesh position-y={.18}><dodecahedronGeometry args={[.11,0]}/>
     <meshStandardMaterial color={i===1?'#f1d19d':'#d6a4a0'}/></mesh>
   </group>)}
  </group>}
 </group>;
}
function AnimeCottage({site,index}:{site:typeof PUBLIC_WORLD_BUILDINGS[number];index:number}){
 const roofTints=['#f1bead','#e8c9a5','#c3dfc5','#eed5ae','#d5cec1','#cbddd1'];
 const wall=['#f1dec0','#e9d6bf','#f1e4c9','#e7e4cf','#ead4bc','#dce5d8'][index];
 const w=site.width,d=site.depth,roof=roofTints[index];
 return <group position={[site.x,0,site.z]}>
  {/* Collidable footprint remains the exact old w x d solid. */}
  <RoundedBox args={[w,3.88,d]} radius={.2} smoothness={3}
   position-y={1.94} castShadow receiveShadow>
   <meshStandardMaterial color={wall} map={paintedTexture('plaster')} roughness={1}/>
  </RoundedBox>
  <mesh position={[0,.22,0]} receiveShadow>
   <boxGeometry args={[w+.1,.44,d+.08]}/><meshStandardMaterial color='#bba98c'/></mesh>
  <PainterlyRoof w={w} d={d} base={3.88} rise={index%2?2.4:2.0}
   variant={index} color={roof}/>
  {/* Porch gives each house a distinct readable middle-distance silhouette. */}
  <group position={[index%2?-.64:.4,0,d/2+.1]}>
   <mesh position={[0,2.96,.53]} castShadow>
    <boxGeometry args={[w*.76,.19,1.25]}/>
    <meshStandardMaterial color={roof} roughness={1}/></mesh>
   {[-1,1].map(side=><mesh key={side} position={[side*w*.32,1.46,.98]} castShadow>
    <cylinderGeometry args={[.085,.1,2.92,8]}/>
    <meshStandardMaterial color='#ab8669'/></mesh>)}
  </group>
  <group position={[0,0,d/2+.10]}>
   <RoundedBox position={[0,1.22,.03]} args={[1.35,2.35,.17]} radius={.28}
    smoothness={3}>
    <meshStandardMaterial color={ANIME_WORLD_PALETTE.wood} roughness={1}/>
   </RoundedBox>
   <mesh position={[.43,1.16,.19]}><sphereGeometry args={[.055,7,6]}/>
    <meshStandardMaterial color='#ebc57d'/></mesh>
   {[-w*.29,w*.29].map(x=><HandPaintedWindow key={x} x={x} y={2.26}
    z={.08} flower={index%2===0}/>)}
  </group>
  <mesh position={[w*.22,4.52,-d*.18]} castShadow>
   <boxGeometry args={[.67,1.35,.75]}/>
   <meshStandardMaterial color={wall} roughness={1}/></mesh>
  <mesh position={[w*.22,5.21,-d*.18]}>
   <boxGeometry args={[.87,.12,.91]}/><meshStandardMaterial color={roof}/></mesh>
  <HandPaintedWindow x={0} y={4.7} z={d/2+.6} w={.71} h={.53}/>
  <TownSign text={site.name} position={[0,6.52,d/2]} distanceFactor={5} occlude={[]}/>
 </group>;
}
function AnimeShop({x,index}:{x:number;index:number}){
 const isCafe=index===0,roof=isCafe?'#9bae8c':'#c98978';
 return <group position={[x,0,-9]}>
  <RoundedBox args={[8.8,3.55,3.8]} radius={.14} smoothness={2}
   position-y={1.78} castShadow receiveShadow>
   <meshStandardMaterial color={isCafe?'#f6e3c7':'#ece5d5'}
    map={paintedTexture('plaster')} roughness={1}/>
  </RoundedBox>
  <PainterlyRoof w={8.8} d={3.8} base={3.52} rise={2.15} variant={index+3}
   color={roof}/>
  <mesh position={[0,2.43,2.25]} castShadow>
   <boxGeometry args={[8.1,.13,1.44]}/><meshStandardMaterial color={roof}/></mesh>
  {[-3.2,-1.6,0,1.6,3.2].map((v,i)=><mesh key={i} position={[v,2.25,2.78]}
   rotation-z={i%2?.07:-.07}>
   <cylinderGeometry args={[.24,.25,.35,9]}/>
   <meshStandardMaterial color={i%2?'#eedfbb':roof} roughness={1}/>
  </mesh>)}
  {[-3.42,3.42].map(v=><mesh key={v} position={[v,1.21,2.65]}>
   <cylinderGeometry args={[.11,.13,2.42,8]}/>
   <meshStandardMaterial color={ANIME_WORLD_PALETTE.wood}/></mesh>)}
  {[-2.45,2.45].map(v=><HandPaintedWindow key={v} x={v} y={1.55} z={2.02}
    w={1.75} h={1.55}/>)}
  <RoundedBox args={[1.55,2.45,.20]} position={[0,1.30,2.04]} radius={.18}>
   <meshStandardMaterial color='#6c8d7e'/></RoundedBox>
  <mesh position={[0,3.25,2.20]}><boxGeometry args={[3.8,.57,.16]}/>
   <meshStandardMaterial color='#efe0bd'/></mesh>
  <TownSign text={isCafe?'WILLOW CAFÉ':'FLOWER MARKET'} position={[0,5.95,2.35]} distanceFactor={5} occlude={[]}/>
  <Html center position={[0,3.28,2.31]} distanceFactor={15}
   style={{font:'700 16px Georgia,serif',letterSpacing:'1px',color:'#52695c',
    textShadow:'0 1px #fff7e4',whiteSpace:'nowrap',pointerEvents:'none'}}>
   {isCafe?'WILLOW CAFÉ':'FLOWER MARKET'}
  </Html>
 </group>;
}
/** Broader foliage layers and slender branched trunks, no flat sphere hedges. */
function AnimeTree({x,z,size=1,variant=0}:{
 x:number;z:number;size?:number;variant?:number
}){
 const root=useRef<Group>(null),phase=(x*.21+z*.17);
 useFrame(({clock})=>{
  if(root.current)root.current.rotation.z=Math.sin(clock.elapsedTime*.52+phase)*.012;
 });
 return <group position={[x,0,z]} scale={size}>
  <group ref={root}>
   <mesh position={[0,2.48,0]} castShadow>
    <cylinderGeometry args={[.14,.24,4.96,8]}/>
    <meshStandardMaterial color='#896f55' roughness={1}/>
   </mesh>
   {[-1,1].map(side=><mesh key={side}
    position={[side*.47,4.06,0]} rotation-z={-side*.62} castShadow>
    <cylinderGeometry args={[.095,.13,2,7]}/>
    <meshStandardMaterial color='#92745b'/></mesh>)}
   {[
    {p:[-.78,5.04,-.14],s:[2.1,1.6,1.55]},
    {p:[.91,5.45,.30],s:[2.15,1.78,1.58]},
    {p:[0,6.06,0],s:[2.25,1.79,1.68]},
   ].map((c,i)=><mesh key={i} geometry={foliageShapes[(variant+i)%3]}
    position={c.p as [number,number,number]} scale={c.s as [number,number,number]}
    castShadow={i===2} receiveShadow dispose={null}>
    <meshStandardMaterial vertexColors roughness={1} side={2}/>
   </mesh>)}
  </group>
 </group>;
}
const TREE_SITES:readonly [number,number,number,number][]=[
 [-40,-6,1.23,0],[-40,12,1.3,1],[-39,31,1.45,2],
 [40,-5,1.18,1],[40,13,1.33,2],[39,32,1.4,0],
 [-34,37,1.18,2],[-14,39,1.16,0],[15,39,1.13,1],[34,39,1.24,2],
 [-34,-37,1.35,1],[-16,-36,1.15,0],[18,-36,1.26,1],[35,-36,1.34,2],
 [-13,17,.78,2],[13,17,.85,1],[-15,3,1.03,2],[15,3,1.05,0],
 [-23,15,1.01,1],[23,15,1.07,2],
 [-35,-13,.93,0],[35,-13,.98,1],[-31,19,.87,0],[31,20,.9,1]
];
function AnimeGrove({quality}:{quality:'low'|'high'}){
 return <group>{TREE_SITES.filter((_,i)=>quality==='high'||i%2===0).map(([x,z,size,variant],i)=>
  <AnimeTree key={i} x={x} z={z} size={size} variant={variant}/>)}</group>;
}
/** Batched grass and floral dots make greenery feel planted and not scattered
 * huge individual flower meshes; keep sidewalks unobstructed.
 */
function AnimeWildflowers({quality}:{quality:'low'|'high'}){
 const sites=useMemo(()=>{
  const list:{x:number;z:number;s:number}[]=[];
  for(let i=0;i<380;i++){
   const x=-45+(i*11.437)%90,z=-43+(i*19.73)%86;
   const byStreet=Math.abs(x)<5||Math.abs(z-9)<4;
   const byShop=z>-13&&z<-5&&Math.abs(x)<17;
   const byHouse=PUBLIC_WORLD_BUILDINGS.some(h=>Math.abs(x-h.x)<h.width/2+4&&Math.abs(z-h.z)<h.depth/2+4);
   const fountain=Math.hypot(x,z+3)<6;
   if(!byStreet&&!byShop&&!byHouse&&!fountain)list.push({x,z,s:.22+(i%5)*.075});
  }
  return quality==='high'?list:list.filter((_,i)=>i%2===0);
 },[quality]);
 const grass=useRef<InstancedMesh>(null),petals=useRef<InstancedMesh>(null);
 useLayoutEffect(()=>{
  const object=new Object3D();
  sites.forEach((p,i)=>{
   object.position.set(p.x,p.s*.3,p.z);
   object.scale.set(p.s*.6,p.s*2.3,p.s*.6);
   object.rotation.set(0,i*1.618,0);object.updateMatrix();
   grass.current?.setMatrixAt(i,object.matrix);
   object.position.y=p.s*2.25;
   object.scale.setScalar(p.s*.44);
   object.rotation.set(0,i*.64,0);object.updateMatrix();
   petals.current?.setMatrixAt(i,object.matrix);
  });
  for(const r of [grass,petals])if(r.current){
   r.current.instanceMatrix.needsUpdate=true;r.current.computeBoundingSphere();
  }
 },[sites]);
 return <group>
  <instancedMesh ref={grass} args={[undefined,undefined,sites.length]} frustumCulled={false}>
   <coneGeometry args={[.36,1,4]}/><meshStandardMaterial color='#83a582' roughness={1} flatShading/>
  </instancedMesh>
  <instancedMesh ref={petals} args={[undefined,undefined,sites.length]} frustumCulled={false}>
   <dodecahedronGeometry args={[.38,0]}/><meshStandardMaterial color='#dfbc9e' roughness={1}/>
  </instancedMesh>
 </group>;
}
function PaintedHorizon(){
 const shapes=useMemo(()=>[0,1,2].map(k=>{
  const pts:number[]=[];
  const face=(a:number[],b:number[],c:number[])=>pts.push(...a,...b,...c);
  for(let i=0;i<55;i++){
   const x=-165+i*6,x2=x+6,high=(a:number)=>11+3.7*Math.sin(a*.03+k)
    +2*Math.sin(a*.095+k*1.6),z=-168+k*18;
   face([x,-25,z],[x2,-25,z],[x2,high(x2),z]);
   face([x,-25,z],[x2,high(x2),z],[x,high(x),z]);
  }
  const g=new BufferGeometry();g.setAttribute('position',new Float32BufferAttribute(pts,3));
  g.computeVertexNormals();return g;
 }),[]);
 useEffect(()=>()=>shapes.forEach(g=>g.dispose()),[shapes]);
 return <group>{shapes.map((g,i)=><mesh key={i} geometry={g} dispose={null}>
  <meshBasicMaterial color={['#c5d5ba','#aec3aa','#92b19f'][i]} side={2} fog/>
 </mesh>)}</group>;
}
function AnimeCanal(){
 return <group>
  <TownStylizedWater x={0} y={-.075} z={-19.5} width={78} depth={5}/>
  {[-16.75,-22.25].map(z=><group key={z}>
   {[-35,-25,-15,-5,5,15,25,35].map(x=><mesh key={x}
    position={[x,-.105,z]}><boxGeometry args={[9.95,.26,.32]}/>
    <meshStandardMaterial color='#c4b298' roughness={1}/></mesh>)}
  </group>)}
 </group>;
}
export default function AnimeVillageCenter({quality}:{quality:'low'|'high'}){
 return <group name="PR32-Painted-Anime-Village">
  <PaintedHorizon/>
  <AnimeCanal/>
  <AnimeFootpaths/>
  <AnimeGrove quality={quality}/>
  <AnimeWildflowers quality={quality}/>
  {PUBLIC_WORLD_BUILDINGS.map((site,i)=><AnimeCottage key={site.name} site={site} index={i}/>)}
  {PUBLIC_WORLD_SHOPS.map((shop,i)=><AnimeShop key={shop.x} x={shop.x} index={i}/>)}
  <TownFountain/>
  <CanalBoat x={-12} color='#b78c70'/><CanalBoat x={12} color='#82a495'/>
 </group>;
}
