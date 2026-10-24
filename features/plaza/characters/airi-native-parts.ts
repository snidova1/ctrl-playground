import {Mesh,Uint32BufferAttribute,Matrix3,Vector3,type BufferGeometry,type BufferAttribute}from'three';
import type{VRM}from'@pixiv/three-vrm';
import masks from'./airi-part-masks.json';
import{airiHairStyles,airiWardrobeStyles,isCompleteAiri}from'./airi-style-catalog';
type Mask={material:string;expectedTriangles:number;ranges:number[][]};
/** Removes reviewed disconnected native components, never a donor, bone or skin
 * surface. Ordinal gates fail closed if source topology changes. Both MToon base
 * and outline groups get identical edits; face primitives are never touched. */
function omit(vrm:VRM,selection:readonly Mask[]){
 let removed=0,matched=0;const seen=new Set<BufferGeometry>();
 vrm.scene.traverse(o=>{if(!(o instanceof Mesh)||seen.has(o.geometry))return;seen.add(o.geometry);const geo=o.geometry,index=geo.index;if(!index)return;const materials=Array.isArray(o.material)?o.material:[o.material],groups=geo.groups.length?geo.groups:[{start:0,count:index.count,materialIndex:0}],next:number[]=[],newGroups:Array<{start:number;count:number;materialIndex:number}>=[];let changed=false;
 for(const group of groups){const name=materials[group.materialIndex??0]?.name??'',mask=selection.find(m=>name===m.material||name.startsWith(m.material+' (Outline)')||name.replace(/_Outline$/,'')===m.material);const start=next.length;if(mask){if(group.count!==mask.expectedTriangles*3)throw new Error('Complete style topology mismatch: '+name);matched++;changed=true;}for(let offset=0;offset<group.count;offset+=3){const ordinal=offset/3;if(mask?.ranges.some(([a,b])=>ordinal>=a&&ordinal<=b)){removed++;continue;}const at=group.start+offset;next.push(index.getX(at),index.getX(at+1),index.getX(at+2));}newGroups.push({start,count:next.length-start,materialIndex:group.materialIndex??0});}
 if(changed){geo.setIndex(new Uint32BufferAttribute(next,1));geo.clearGroups();for(const g of newGroups)geo.addGroup(g.start,g.count,g.materialIndex);}});
 if(!matched||!removed)throw new Error('Complete style did not match its reviewed source primitives.');return removed;
}
function shapeBob(vrm:VRM,id:string){
 const seen=new Set<BufferGeometry>();let count=0;
 vrm.scene.traverse(o=>{if(!(o instanceof Mesh)||seen.has(o.geometry))return;const materials=Array.isArray(o.material)?o.material:[o.material];if(!materials.some(m=>/HAIR/.test(m.name)))return;seen.add(o.geometry);const g=o.geometry,p=g.getAttribute('position');if(!p)return;g.computeBoundingBox();const box=g.boundingBox!,anchor=box.max.y-(box.max.y-box.min.y)*.42,factor=id==='airi-a-short-bob'?.66:1.38;const deform=(v:Vector3)=>{if(v.y>=anchor)return v;const depth=anchor-v.y;v.y=anchor-depth*factor;if(factor>1){const expand=1+Math.min(.09,depth*.6);v.x*=expand;v.z*=expand;}return v;};const next=p.clone(),n=g.getAttribute('normal'),nextN=n?.clone(),v=new Vector3(),normal=new Vector3(),eps=.0001;
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const d=deform(v.clone());next.setXYZ(i,d.x,d.y,d.z);if(n&&nextN&&v.y<anchor){const axes=[new Vector3(eps,0,0),new Vector3(0,eps,0),new Vector3(0,0,eps)].map(a=>deform(v.clone().add(a)).sub(d).divideScalar(eps));const jac=new Matrix3().set(axes[0].x,axes[1].x,axes[2].x,axes[0].y,axes[1].y,axes[2].y,axes[0].z,axes[1].z,axes[2].z).invert().transpose();normal.fromBufferAttribute(n,i).applyMatrix3(jac).normalize();nextN.setXYZ(i,normal.x,normal.y,normal.z);}}
 g.setAttribute('position',next);if(nextN)g.setAttribute('normal',nextN);for(const kind of ['position']as const)if(g.morphAttributes[kind])g.morphAttributes[kind]=g.morphAttributes[kind].map((a:BufferAttribute)=>{const out=a.clone();for(let i=0;i<a.count;i++){const base=new Vector3().fromBufferAttribute(p,i),target=new Vector3().fromBufferAttribute(a,i);if(g.morphTargetsRelative)target.add(base);deform(target);if(g.morphTargetsRelative)target.sub(deform(base));out.setXYZ(i,target.x,target.y,target.z);}return out;});g.computeBoundingBox();g.computeBoundingSphere();count+=p.count;});
 if(!count)throw new Error('Complete bob has no native hair geometry.');return count;
}
export function applyAiriNativeStyles(vrm:VRM,characterId:string,hair='source',outfit='source'){
 if(!isCompleteAiri(characterId))return false;
 if(hair!=='source'&&!airiHairStyles.some(s=>s.id===hair&&s.characterId===characterId))throw new Error('Hair is not compatible with complete character.');
 if(outfit!=='source'&&!airiWardrobeStyles.some(s=>s.id===outfit&&s.characterId===characterId))throw new Error('Outfit is not compatible with complete character.');
 const variant=characterId.endsWith('-a')?'a':'b';let removed=0,shaped=0;
 if(outfit!=='source')removed+=omit(vrm,masks[variant][outfit.endsWith('-inner')?'no-outer':'sleeveless-candidate']);
 if(hair.startsWith('airi-a-'))shaped=shapeBob(vrm,hair);
 else if(hair!=='source'){const key=hair==='airi-b-loose'?'no-ribbon':hair==='airi-b-straight'?'no-side-locks':'no-long-back-candidate';removed+=omit(vrm,masks.b[key]);}
 Object.assign(vrm.scene.userData,{ctrlHairStyleId:hair,ctrlWardrobeId:outfit,ctrlNativeStyleRemovedTriangles:removed,ctrlNativeStyleShapedVertices:shaped,ctrlNativeStyleRig:characterId});return true;
}
