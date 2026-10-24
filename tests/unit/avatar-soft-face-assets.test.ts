import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {modularPart,type ModularFamily} from '@/features/plaza/characters/modular-catalog';
function glb(path:string){const file=readFileSync(`public${path}`),length=file.readUInt32LE(12),json=JSON.parse(file.subarray(20,20+length).toString()),bin=file.subarray(28+length);return{json,bin};}
function accessor(g:ReturnType<typeof glb>,id:number):number[]{
 const a=g.json.accessors[id],dims:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16},size:Record<number,number>={5121:1,5123:2,5125:4,5126:4},d=dims[a.type],bytes=size[a.componentType],out=new Array(a.count*d).fill(0);
 const read=(offset:number,type:number)=>type===5126?g.bin.readFloatLE(offset):type===5125?g.bin.readUInt32LE(offset):type===5123?g.bin.readUInt16LE(offset):g.bin.readUInt8(offset);
 if(a.bufferView!==undefined){const v=g.json.bufferViews[a.bufferView],start=(v.byteOffset??0)+(a.byteOffset??0),stride=v.byteStride??d*bytes;for(let i=0;i<a.count;i++)for(let j=0;j<d;j++)out[i*d+j]=read(start+i*stride+j*bytes,a.componentType);}
 if(a.sparse){const s=a.sparse,iv=g.json.bufferViews[s.indices.bufferView],vv=g.json.bufferViews[s.values.bufferView];for(let i=0;i<s.count;i++){const index=read((iv.byteOffset??0)+(s.indices.byteOffset??0)+i*size[s.indices.componentType],s.indices.componentType);for(let j=0;j<d;j++)out[index*d+j]=read((vv.byteOffset??0)+(s.values.byteOffset??0)+(i*d+j)*bytes,a.componentType);}}
 return out;
}
describe('authored soft-anime native face derivatives',()=>{
 for(const family of ['drophunter','neurohacker']as ModularFamily[])for(const slot of ['body','eyes']as const)for(const quality of ['high','low']as const){
  it(`${family} ${slot} ${quality}: preserves rig, weights, wardrobe, topology and expression wiring`,()=>{
   const id=slot==='body'?family:'regulareyes',url=modularPart(family,slot,id,quality);
   expect(url).toContain('-soft-anime');const newer=glb(url),original=glb(url.replace('-soft-anime','').replace('-mobile',''));
   expect(newer.json.skins).toEqual(original.json.skins);expect(newer.json.nodes).toEqual(original.json.nodes);expect(newer.json.extensions).toEqual(original.json.extensions);
   expect(newer.json.extras.ctrlFaceDesign.style).toBe('soft-anime');let changed=0;
   for(let mi=0;mi<original.json.meshes.length;mi++){
    const old=original.json.meshes[mi],fresh=newer.json.meshes[mi];expect(fresh.extras).toEqual(old.extras);expect(fresh.primitives.length).toBe(old.primitives.length);
    for(let pi=0;pi<old.primitives.length;pi++){
     const p=old.primitives[pi],n=fresh.primitives[pi];expect(accessor(newer,n.indices)).toEqual(accessor(original,p.indices));
     for(const attr of ['JOINTS_0','WEIGHTS_0'])if(p.attributes[attr]!==undefined)expect(accessor(newer,n.attributes[attr])).toEqual(accessor(original,p.attributes[attr]));
     const before=accessor(original,p.attributes.POSITION),after=accessor(newer,n.attributes.POSITION);expect(after.length).toBe(before.length);expect(after.every(Number.isFinite)).toBe(true);
     if(slot==='body'&&!/head/i.test(old.name))expect(after).toEqual(before);else if(after.some((v,i)=>v!==before[i]))changed++;
     expect(n.targets?.length).toBe(p.targets?.length);
     for(const target of n.targets??[])for(const key of ['POSITION','NORMAL'])if(target[key]!==undefined)expect(accessor(newer,target[key]).every(Number.isFinite)).toBe(true);
    }
   }
   expect(changed).toBeGreaterThan(0);
  });
 }
});
