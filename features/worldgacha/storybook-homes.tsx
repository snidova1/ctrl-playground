'use client';
import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {BoxGeometry,BufferGeometry,Float32BufferAttribute,Color,Matrix4,Vector3,Quaternion,Euler,IcosahedronGeometry,CylinderGeometry,ConeGeometry,MeshToonMaterial,type Texture} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import layout from './neighborhood.json';import manifest from '@/public/worlds/neighborhood/manifest.json';
import {Sign} from '@/features/plaza/mesh-kit';import PaintedRoof from './anime-roofs';
import {cel} from './vendor/anime-toon';import {plasterTextures,woodTextures} from './vendor/anime-textures';

type Slot='plaster'|'wood'|'stone'|'glass'|'trim'|'leaf'|'flower'|'roof';
type V3=[number,number,number];
/** Original batched cottage geometry. No model requests or dependency on GLTF/Suspense.
 * All below-head-height geometry stays in the existing baked collision footprints. */
export default function StorybookHomes({night}:{night:boolean}){
 const {gl}=useThree();
 const assets=useMemo(()=>{
  const plaster=plasterTextures(0xfff7e7,147),wood=woodTextures(0xc49e74,0x614831,223);
  const make=(color:number,extra:Record<string,unknown>={})=>cel({color,flat:false,bands:4,tint:0x9bacc8,cache:false,vertexColors:true,...extra}) as MeshToonMaterial;
  const materials:Record<Slot,MeshToonMaterial>={plaster:make(0xffffff,{map:plaster.map}),wood:make(0xffffff,{map:wood.map}),stone:make(0xffffff),glass:make(0xffffff),trim:make(0xffffff),leaf:make(0xffffff),flower:make(0xffffff),roof:make(0xffffff)};
  materials.plaster.normalMap=plaster.normalMap;materials.plaster.normalScale.set(.16,.16);
  materials.glass.emissive.set(night?'#ffd68d':'#203d4b');materials.glass.emissiveIntensity=night?.75:.12;
  const pools:Record<Slot,BufferGeometry[]>={plaster:[],wood:[],stone:[],glass:[],trim:[],leaf:[],flower:[],roof:[]};
  const add=(g:BufferGeometry,slot:Slot,color:string,position:V3,scale:V3,rotation:V3,house:Matrix4)=>{
   const q=new Quaternion().setFromEuler(new Euler(...rotation)),mat=new Matrix4().compose(new Vector3(...position),q,new Vector3(...scale));g.applyMatrix4(mat);g.applyMatrix4(house);
   const n=g.attributes.position.count,c=new Color(color),colors=new Float32Array(n*3);for(let i=0;i<n;i++){const grain=.96+Math.sin(i*.71)*.04;colors[i*3]=c.r*grain;colors[i*3+1]=c.g*grain;colors[i*3+2]=c.b*grain;}g.setAttribute('color',new Float32BufferAttribute(colors,3));
   // Use geometric metres rather than stretched 0..1 cube UVs: plaster grain and wood stay human-scale.
   const p=g.attributes.position,no=g.attributes.normal,uv=new Float32Array(n*2);for(let i=0;i<n;i++){uv[i*2]=(Math.abs(no.getX(i))>.65?p.getZ(i):p.getX(i))*.42;uv[i*2+1]=(Math.abs(no.getY(i))>.65?p.getZ(i):p.getY(i))*.42;}g.setAttribute('uv',new Float32BufferAttribute(uv,2));pools[slot].push(g);
  };
  layout.buildings.forEach((b,i)=>{
   const a=manifest.buildings.find(x=>x.name===b.asset)!,w=a.width,d=a.depth,front=d/2;
   const house=new Matrix4().makeRotationY(b.rotation).setPosition(b.x,0,b.z),wall=['#e7d6b4','#d8dbc1','#dfc4b8','#cad5bb','#efddb8','#c9d6d5'][i],timber=['#6d5140','#596858','#795745','#596a60','#806046','#58646a'][i],shutters=['#768d7f','#7b8d92','#b4816c','#8b9b76','#a8936f','#7a8fa2'][i];
   const box=(slot:Slot,c:string,pos:V3,size:V3,rot:V3=[0,0,0])=>add(new BoxGeometry(),slot,c,pos,size,rot,house);
   const leafy=(pos:V3,size:V3,c:string)=>{const geo=new IcosahedronGeometry(1,1);add(geo,'leaf',c,pos,size,[0,i*.7,0],house);};
   // Narrower ground storey, slightly overhanging upper floor; still within original footprint.
   box('stone','#a69e86',[0,.37,0],[w,.74,d]);
   box('plaster',wall,[0,1.9,0],[w-.16,2.95,d-.16]);
   box('plaster',wall,[0,4.53,0],[w,2.64,d]);
   box('wood',timber,[0,3.22,0],[w+.05,.24,d+.05]);
   box('trim','#d2bea0',[0,.76,0],[w+.02,.13,d+.02]);
   // Irregular foundation masonry, merged into one draw call for all cottages.
   for(const side of [-1,1])for(let j=0;j<Math.ceil(w/.64);j++){const x=-w/2+.32+j*.64;if(x>w/2-.1)continue;box('stone',j%3?'#b5ad95':'#c4b49b',[x,.21+(j%2)*.26,side*(front+.008)],[.57,.21,.045]);}
   for(const side of [-1,1])for(let j=0;j<Math.ceil(d/.7);j++){const z=-d/2+.35+j*.7;if(z>d/2-.1)continue;box('stone',j%3?'#b5ad95':'#c4b49b',[side*(w/2+.008),.2+(j%2)*.27,z],[.045,.22,.63]);}
   // Posts and real horizontal cornices, including the long side walls visible from the street.
   for(const sx of [-1,1])for(const sz of [-1,1])box('wood',timber,[sx*(w/2-.075),3.3,sz*(front-.06)],[.17,5.05,.18]);
   for(const y of [3.27,5.73]){for(const side of [-1,1]){box('wood',timber,[0,y,side*(front+.055)],[w+.06,.15,.15]);box('wood',timber,[side*(w/2+.055),y,0],[.15,.15,d+.05]);}}
   // Cross-braces, under-eave corbels, and alternating upper-storey bays break the box silhouette.
   for(const side of [-1,1])for(const z of [-d*.28,0,d*.28]){
    box('wood',timber,[side*(w/2+.055),4.5,z],[.15,2.4,.14]);
    box('wood',timber,[side*(w/2+.06),3.69,z+.36],[.15,.13,1.02],[side*.69,0,0]);
    box('wood',timber,[side*(w/2+.12),5.55,z],[.3,.38,.15],[0,0,side*.32]);
   }
   const window=(x:number,y:number,z:number,side=false)=>{
    const ww=.94,hh=1.23;
    const pos=(dx:number,dy:number,dz:number):V3=>side?[x+dz,y+dy,z+dx]:[x+dx,y+dy,z+dz];
    const size=(a:number,b:number,c:number):V3=>side?[c,b,a]:[a,b,c];
    box('wood',timber,pos(0,0,.018),size(ww+.24,hh+.26,.1));
    box('glass',night?'#ffe0a0':'#72939c',pos(0,0,.079),size(ww,hh,.04));
    for(const edge of [-1,1]){
     box('trim','#ded0aa',pos(edge*(ww/2+.035),0,.117),size(.075,hh+.1,.1));
     box('wood',shutters,pos(edge*(ww/2+.24),0,.095),size(.3,hh+.14,.1));
     for(let k=0;k<5;k++)box('wood',timber,pos(edge*(ww/2+.24),-.44+k*.22,.151),size(.25,.037,.03));
    }
    box('trim','#e4d5b3',pos(0,0,.121),size(.055,hh,.08));box('trim','#e4d5b3',pos(0,-.07,.121),size(ww,.055,.08));
    box('stone','#bca681',pos(0,-hh/2-.1,.17),size(ww+.38,.16,.39));
    if(y>3){box('wood',timber,pos(0,-.86,.19),size(ww+.3,.26,.33));for(let k=0;k<5;k++){const dx=(k-2)*.21;leafy(pos(dx,-.68,.24),[.2,.13,.19],k%2?'#6c8d5b':'#8da267');add(new IcosahedronGeometry(1,1),'flower',k%2?'#d99eab':'#e8c383',pos(dx,-.55,.28),[.08,.07,.08],[0,0,0],house);}}
   };
   for(const y of [1.75,4.5])for(const x of [-w*.255,w*.255])window(x,y,front+.025);
   for(const side of [-1,1])for(const y of [1.75,4.5])for(const z of [-d*.29,d*.29]){
    // Positive-side windows use a local rotation to keep their recess facing outwards.
    if(side>0)window(w/2+.025,y,z,true);
    else {box('wood',timber,[-w/2-.055,y,z],[.12,1.5,1.22]);box('glass',night?'#ffdf9a':'#6f9198',[-w/2-.126,y,z],[.04,1.25,.98]);box('trim','#d8c5a1',[-w/2-.16,y,z],[.06,1.28,.055]);}
   }
   // Recessed human-scale front door, fanlight, timber surround, lintel and interior glow.
   box('wood','#453d33',[0,1.18,front+.05],[1.3,2.36,.14]);box('wood',shutters,[0,1.12,front+.145],[1.02,2.18,.07]);
   box('glass',night?'#f6cf85':'#7e9b99',[0,1.8,front+.19],[.71,.48,.035]);
   for(const side of [-1,1])box('trim','#d6bd93',[side*.62,1.23,front+.16],[.14,2.44,.18]);
   box('wood',timber,[0,2.48,front+.15],[1.5,.2,.24]);box('trim','#d9bc7f',[.36,1.02,front+.21],[.075,.075,.05]);
   // Distinct tower silhouettes above the same six baked ground footprints.
   if(i===1||i===4){const tx=w/2-1.2,tz=d/2-1.2,top=i===1?8.9:9.4,base=4.3;
    const cylinder=(slot:Slot,color:string,radius:number,height:number,pos:V3,rot:V3=[0,0,0])=>add(new CylinderGeometry(radius,radius,height,12),slot,color,pos,[1,1,1],rot,house);
    cylinder('plaster',wall,.96,top-base,[tx,(top+base)/2,tz]);cylinder('wood',timber,1.03,.17,[tx,top-.16,tz]);cylinder('stone','#b6aa91',1.01,.22,[tx,5.7,tz]);
    add(new ConeGeometry(1.37,2.8,12),'roof',i===1?'#6f8c89':'#9a7763',[tx,top+1.3,tz],[1,1,1],[0,0,0],house);
    for(let n=0;n<8;n++){const a=n/8*Math.PI*2;cylinder('wood',timber,.045,top-5.8,[tx+Math.sin(a)*.96,(top+5.8)/2,tz+Math.cos(a)*.96]);}
    cylinder('wood',timber,.47,.13,[tx,top-.88,tz+.97],[Math.PI/2,0,0]);cylinder('glass',night?'#ffdda1':'#71959e',.36,.15,[tx,top-.88,tz+1.01],[Math.PI/2,0,0]);
    box('trim','#e4d5b3',[tx,top-.88,tz+1.1],[.038,.64,.024]);box('trim','#e4d5b3',[tx,top-.88,tz+1.1],[.64,.038,.024]);box('wood',timber,[tx,top+2.9,tz],[.07,.65,.07]);
   }
   // Roof-height chimney stack and varied dormers: no added ground collision.
   const chimneyX=(i%2?1:-1)*w*.24,chimneyZ=-d*.22,chimneyTop=8.4+(i%3)*.25;
   box('stone','#b7a08a',[chimneyX,(chimneyTop+6.1)/2,chimneyZ],[.72,chimneyTop-6.1,.8]);box('stone','#d2b996',[chimneyX,chimneyTop,chimneyZ],[.94,.18,1.02]);box('wood','#4a4840',[chimneyX,chimneyTop+.1,chimneyZ],[.51,.04,.6]);
   for(let row=0;row<5;row++)box('stone',row%2?'#9b7b68':'#c4a58a',[chimneyX+(row%2?.17:-.17),6.65+row*.28,chimneyZ+.411],[.32,.16,.025]);
   const dormerZ=(i%2?1:-1)*d*.18,dx=w/2-.32;
   box('plaster',wall,[dx,6.55,dormerZ],[1.1,1.2,1.35]);box('wood',timber,[dx+.57,6.56,dormerZ],[.08,.85,1.15]);box('glass',night?'#ffdda1':'#71959e',[dx+.62,6.56,dormerZ],[.04,.69,.85]);box('trim','#ded0ad',[dx+.65,6.56,dormerZ],[.05,.7,.055]);
   box('roof',i%2?'#78878b':'#a5735a',[dx,7.23,dormerZ-.42],[1.5,.11,1.1],[-.52,0,0]);box('roof',i%2?'#78878b':'#a5735a',[dx,7.23,dormerZ+.42],[1.5,.11,1.1],[.52,0,0]);
   if(i<2){box('roof',i===0?'#ab7662':'#7f9479',[0,2.58,front+.63],[w*.82,.13,1.45],[-.12,0,0]);for(let k=-3;k<=3;k++)box('trim','#eadbb9',[k*.56,2.665,front+.64],[.17,.025,1.42],[-.12,0,0]);for(const side of [-1,1])box('wood',timber,[side*w*.33,2.39,front+.29],[.11,.1,.9],[.52,0,0]);}
   // Small projecting upper bay: suspended above player height, ground footprint stays identical.
   if(i===0||i===4){box('wood',timber,[-w*.24,4.48,front+.25],[1.52,1.76,.5]);box('glass',night?'#ffde99':'#89a3a3',[-w*.24,4.48,front+.52],[1.23,1.45,.035]);box('trim','#dfc9a0',[-w*.24,4.48,front+.56],[.09,1.5,.06]);box('roof','#8e6852',[-w*.24,5.42,front+.29],[1.8,.13,.85],[.16,0,0]);}
   // Lantern and climbing greenery, with rounded layered leaves rather than floating green cubes.
   box('wood',timber,[.93,2.15,front+.19],[.09,.3,.36]);box('glass',night?'#ffda8e':'#d5c193',[.93,1.92,front+.3],[.19,.29,.2]);
   for(let k=0;k<16;k++){const h=.9+k*.25;leafy([-w/2+.2+Math.sin(h*1.8)*.18,h,front+.16],[.21,.16,.13],k%3?'#6d8b5c':'#9bb57a');}
  });
  const meshes=(Object.keys(pools) as Slot[]).map(key=>{const pieces=pools[key],geometry=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());if(!geometry)throw new Error('Storybook cottage batching failed: '+key);geometry.computeBoundingSphere();return {key,geometry,material:materials[key]};});
  return {meshes,materials,textures:[plaster.map,plaster.normalMap,wood.map,wood.normalMap] as Texture[]};
 },[night]);
 useEffect(()=>{gl.domElement.dataset.architecture='original-storybook-cottages-v1';return()=>{delete gl.domElement.dataset.architecture;assets.meshes.forEach(x=>x.geometry.dispose());Object.values(assets.materials).forEach(m=>m.dispose());assets.textures.forEach(t=>t?.dispose());};},[assets,gl]);
 return <group name='worldgacha-curated-six-buildings'>{assets.meshes.map(m=><mesh key={m.key} geometry={m.geometry} material={m.material} castShadow receiveShadow/>)}{layout.buildings.map((b,i)=>{const a=manifest.buildings.find(a=>a.name===b.asset)!;return <group key={b.asset} position={[b.x,0,b.z]} rotation-y={b.rotation}><PaintedRoof width={a.width} depth={a.depth} index={i} rise={2.1+(i%3)*.35} ridgeOffset={i%2?.12:-.1}/><Sign text={b.label} position={[0,2.85,a.depth/2+.29]} width={i<2?3.5:2.7} height={.36} size={75} background={i%2?'#687d72':'#8c6d50'} color='#fff1d8'/></group>;})}</group>;
}
