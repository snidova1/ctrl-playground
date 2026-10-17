'use client';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {
 BufferGeometry,CatmullRomCurve3,Color,Float32BufferAttribute,
 InstancedMesh,Object3D,Vector3,CanvasTexture,RepeatWrapping,SRGBColorSpace
} from 'three';
import {PUBLIC_WORLD_BUILDINGS} from './public-world-geography';
import TownAnimeMeshes from './town-anime-meshes';
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
 const roadPaint=useMemo(()=>makeRoadPaint(),[]);
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
  <TownAnimeMeshes quality={quality}/>
  <AnimeWildflowers quality={quality}/>
  <TownFountain/>
  <CanalBoat x={-12} color='#b78c70'/><CanalBoat x={12} color='#82a495'/>
 </group>;
}
