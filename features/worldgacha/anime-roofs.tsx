'use client';
import {useEffect,useMemo} from 'react';import {BufferGeometry,BufferAttribute,DoubleSide,Shape,ShapeGeometry,MeshToonMaterial} from 'three';
import {cel} from './vendor/anime-toon';import {kawaraTextures,plasterTextures} from './vendor/anime-textures';
/** Original curved silhouette and authored tiled roof, replacing generator's 18-triangle gable. */
export default function PaintedRoof({width,depth,index,rise=1.65,ridgeOffset=0}:{width:number;depth:number;index:number;rise?:number;ridgeOffset?:number}){
 const assets=useMemo(()=>{const w=width+.8,d=depth+.7,n=32,base=5.85,p:number[]=[],uv:number[]=[],ix:number[]=[];
 const y=(x:number)=>base+rise*Math.pow(Math.max(0,x<ridgeOffset?(x+1)/(ridgeOffset+1):(1-x)/(1-ridgeOffset)),.82)+.18*Math.pow(Math.abs(x),6);
 for(let row=0;row<3;row++)for(let j=0;j<=n;j++){const x=j/n*2-1,z=(row/2-.5)*d;p.push(x*w/2,y(x)+Math.sin(z*1.4+index)*.025,z);uv.push(j/n*1.5,row/2*2.2);}
 for(let row=0;row<2;row++)for(let j=0;j<n;j++){const a=row*(n+1)+j,b=a+n+1;ix.push(a,b,a+1,a+1,b,b+1);}
 const roof=new BufferGeometry();roof.setAttribute('position',new BufferAttribute(new Float32Array(p),3));roof.setAttribute('uv',new BufferAttribute(new Float32Array(uv),2));roof.setIndex(ix);roof.computeVertexNormals();
 const shape=new Shape();shape.moveTo(-w/2,base);for(let j=0;j<=n;j++){const x=j/n*2-1;shape.lineTo(x*w/2,y(x));}shape.lineTo(w/2,base);shape.closePath();const gable=new ShapeGeometry(shape);
 const maps=kawaraTextures([0x995b47,0x6c7c77,0x9e6c51,0x627181][index%4],71+index),wall=plasterTextures(0xe8dec4,43);
 const tile=cel({color:0xffffff,map:maps.map,flat:false,bands:3,tint:0x9daec9,side:DoubleSide,cache:false}) as MeshToonMaterial;tile.normalMap=maps.normalMap;tile.normalScale.set(.45,.45);
 const plaster=cel({color:0xe8dec4,map:wall.map,flat:false,bands:3,tint:0x9daec9,side:DoubleSide,cache:false}) as MeshToonMaterial;
 return {roof,gable,tile,plaster};},[width,depth,index,rise,ridgeOffset]);
 useEffect(()=>()=>{assets.roof.dispose();assets.gable.dispose();assets.tile.dispose();assets.plaster.dispose();},[assets]);
 return <group name='original-curved-painterly-roof'><mesh geometry={assets.roof} material={assets.tile} castShadow receiveShadow/>{[-1,1].map(s=><group key={s}><mesh geometry={assets.gable} material={assets.plaster} position-z={s*(depth/2+.12)} castShadow/><mesh position={[ridgeOffset*width*.5,5.85+rise*.42,s*(depth/2+.14)]} rotation-y={s<0?Math.PI:0}><ringGeometry args={[.29,.39,24]}/><meshToonMaterial color='#72593d'/></mesh><mesh position={[ridgeOffset*width*.5,5.85+rise*.42,s*(depth/2+.145)]} rotation-y={s<0?Math.PI:0}><circleGeometry args={[.285,24]}/><meshToonMaterial color='#779ea4'/></mesh></group>)}</group>;
}
