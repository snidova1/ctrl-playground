'use client';
import {CanvasTexture,SRGBColorSpace,Mesh,Object3D,type Texture} from 'three';import {MToonMaterial} from '@pixiv/three-vrm';
import {mulberry32} from './ghibli-layout';
/** Original linen/leather swatches replace the modern printed T-shirt, never face/hair/skin. */
function fabric(color:string,seed:number){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!,r=mulberry32(seed);x.fillStyle=color;x.fillRect(0,0,128,128);for(let i=0;i<1400;i++){x.globalAlpha=.025+r()*.045;x.fillStyle=i%2?'#fff5d6':'#4b5544';x.fillRect(r()*128,r()*128,1+r()*2,1+r()*3);}x.globalAlpha=.025;x.strokeStyle='#fff2d5';for(let i=0;i<128;i+=4){x.beginPath();x.moveTo(i,0);x.lineTo(i,128);x.stroke();}const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;return t;}
export function dressVillageClothes(root:Object3D){
 const maps=new Map<string,Texture>();root.traverse(o=>{if(!(o instanceof Mesh))return;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(!(m instanceof MToonMaterial)||!/CLOTH/.test(m.name))continue;const kind=/Tops_/.test(m.name)?'shirt':/Bottoms_/.test(m.name)?'trousers':/Shoes_/.test(m.name)?'shoes':null;if(!kind)continue;
 let t=maps.get(kind);if(!t){t=fabric(kind==='shirt'?'#e6dfc3':kind==='trousers'?'#9d9f8d':'#967452',kind==='shirt'?31:53);maps.set(kind,t);}m.map=t;m.shadeMultiplyTexture=t;m.needsUpdate=true;}});return [...maps.values()];
}
