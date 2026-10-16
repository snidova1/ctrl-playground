'use client';
import {useEffect,useLayoutEffect,useMemo,useRef} from 'react';
import {Color,CylinderGeometry,Float32BufferAttribute,InstancedMesh,Matrix4,Object3D,PlaneGeometry,SphereGeometry,Vector3,type BufferGeometry} from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {attachTownWind,type AssetPlacement} from './town-assets';
import {TOWN_PALETTE as P} from './town-palette';
import {paintedTexture} from './town-surfaces';

const bark=new Color(P.wood),leafLow=new Color('#426651'),leafMid=new Color('#7e9a69'),leafHigh=new Color('#a8b67e');
function merge(parts:BufferGeometry[]){const result=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());return result;}
function branch(a:Vector3,b:Vector3,r:number){
 const g=new CylinderGeometry(r*.6,r,a.distanceTo(b),7,1),o=new Object3D();
 o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new Vector3(0,1,0),b.clone().sub(a).normalize());o.updateMatrix();return g.applyMatrix4(o.matrix);
}
/** Original smooth, irregular broadleaf silhouettes. Units are normalized to
 * the previous tree heights; centers/trunk origins remain authoritative. */
export function makeRoundedTree(variant=0){
 const wood:BufferGeometry[]=[branch(new Vector3(0,0,0),new Vector3(.025,.64,-.02),.036)];
 const leaves:BufferGeometry[]=[];
 for(let i=0;i<4;i++){
  const angle=i*Math.PI*.5+variant*.65;
  wood.push(branch(new Vector3(0,.24+i*.035,0),new Vector3(Math.cos(angle)*.23,.62+(i%2)*.08,Math.sin(angle)*.2),.017));
 }
 {
  // One continuous lobed crown, rather than intersecting primitive balls.
  const g=new SphereGeometry(1,32,20),p=g.getAttribute('position'),colors:number[]=[];
  for(let v=0;v<p.count;v++){
   const x=p.getX(v),y=p.getY(v),z=p.getZ(v);
   const angle=Math.atan2(z,x),equator=1-y*y;
   const wobble=1+(.075*Math.sin(angle*5+variant)+.035*Math.cos(angle*8+y*5+variant))*equator;
   p.setXYZ(v,x*.44*wobble*(1-y*.12)+.02*Math.sin(y*3+variant),y*.325*wobble+.705,z*.4*wobble);
   const patch=Math.sin(x*13+y*9+variant)*Math.sin(z*15-y*11)*.09;
   const light=Math.max(0,Math.min(1,.48+y*.26-x*.18+patch));
   const color=leafLow.clone().lerp(leafMid,Math.min(1,light*1.65)).lerp(leafHigh,Math.max(0,(light-.55)*1.7));
   color.toArray(colors,v*3);
  }
  g.setAttribute('color',new Float32BufferAttribute(colors,3));g.computeVertexNormals();leaves.push(g);
 }
 const sprays:BufferGeometry[]=[];
 for(let i=0;i<180;i++){
  const y=1-2*(i+.5)/180,angle=i*2.399+variant,r=Math.sqrt(1-y*y),direction=new Vector3(Math.cos(angle)*r,y,Math.sin(angle)*r);
  const transform=new Object3D();transform.position.set(direction.x*.45,direction.y*.33+.705,direction.z*.415);
  transform.lookAt(transform.position.clone().add(direction));transform.rotateZ(i*1.7);transform.updateMatrix();
  const geometry=new PlaneGeometry(.18,.16).applyMatrix4(transform.matrix),colors:number[]=[];
  const light=Math.max(0,Math.min(1,.5+y*.24-direction.x*.2));
  const pigment=leafLow.clone().lerp(leafHigh,light*.8);
  const normal=geometry.getAttribute('normal');
  for(let v=0;v<4;v++){pigment.toArray(colors,v*3);normal.setXYZ(v,direction.x,direction.y,direction.z);}
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));sprays.push(geometry);
 }
 const trunk=merge(wood),crown=merge(leaves),foliage=merge(sprays),positions=trunk.getAttribute('position');
 crown.scale(.88,.88,.88);crown.translate(0,.705*.12,0);
 // A leaning cylinder's bottom cap must never protrude below the ground.
 for(let i=0;i<positions.count;i++)positions.setY(i,Math.max(0,positions.getY(i)));
 trunk.computeVertexNormals();trunk.computeBoundingBox();crown.computeBoundingBox();
 foliage.computeBoundingBox();return {trunk,crown,foliage};
}
function TreeBatch({trees,variant}:{trees:readonly AssetPlacement[];variant:number}){
 const geometry=useMemo(()=>makeRoundedTree(variant),[variant]);
 const roots=useRef<(InstancedMesh|null)[]>([]);
 useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
 useLayoutEffect(()=>{
  const matrix=new Matrix4(),rotation=new Matrix4();
  trees.forEach((tree,i)=>{
   matrix.makeScale(tree.size,tree.size,tree.size);rotation.makeRotationY(tree.yaw??0);matrix.premultiply(rotation);matrix.setPosition(tree.x,tree.y??0,tree.z);
   for(const root of roots.current)root?.setMatrixAt(i,matrix);
  });
  for(const root of roots.current)if(root){root.instanceMatrix.needsUpdate=true;root.computeBoundingSphere();}
 },[trees,geometry]);
 return <group>
  <instancedMesh ref={r=>{roots.current[0]=r;}} args={[geometry.trunk,undefined,trees.length]} castShadow receiveShadow dispose={null}><meshStandardMaterial color={bark} roughness={1}/></instancedMesh>
  <instancedMesh ref={r=>{roots.current[1]=r;}} args={[geometry.crown,undefined,trees.length]} castShadow receiveShadow dispose={null}><meshStandardMaterial vertexColors roughness={1} onUpdate={attachTownWind}/></instancedMesh>
  <instancedMesh ref={r=>{roots.current[2]=r;}} args={[geometry.foliage,undefined,trees.length]} castShadow receiveShadow dispose={null}><meshStandardMaterial map={paintedTexture('foliage')} vertexColors alphaTest={.45} side={2} roughness={1} onUpdate={attachTownWind}/></instancedMesh>
 </group>;
}
export default function TownRoundedTrees({trees}:{trees:readonly AssetPlacement[]}){
 const groups=useMemo(()=>[0,1,2].map(v=>trees.filter((_,i)=>i%3===v)),[trees]);
 return <group>{groups.map((group,i)=>group.length>0&&<TreeBatch key={i} trees={group} variant={i}/>)}</group>;
}
