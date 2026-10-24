import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Group,Object3D,Vector3} from 'three';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {seatSurfaceYFor} from '@/features/habitat/furniture-interactions';
import {seatedRootTargetY} from '@/features/plaza/characters/seat-alignment';
import type {WorldObject} from '@/features/habitat/types';

const chair=(patch:Partial<WorldObject>={}):WorldObject=>({id:'chair',assetId:'furniture-kit/chair',behavior:'seat',x:2,y:0,z:-3,rotation:0,scale:3,name:'Chair',target:'',...patch});
/** Read actual GLB triangles, not catalog max-Y (the backrest). Largest upward
 * horizontal area is the chair/bench sitting surface in these shipped meshes. */
function glbSeatTop(assetId:string){
 const bytes=readFileSync(new URL(`../../public/plaza/build-kit/${assetId}.glb`,import.meta.url));
 const jsonLength=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binaryStart=28+jsonLength;
 const primitive=gltf.meshes[0].primitives[0],positions=gltf.accessors[primitive.attributes.POSITION],indices=gltf.accessors[primitive.indices];
 expect(positions.componentType).toBe(5126);expect(indices.componentType).toBe(5125);
 const posOffset=binaryStart+gltf.bufferViews[positions.bufferView].byteOffset+(positions.byteOffset??0);
 const indexOffset=binaryStart+gltf.bufferViews[indices.bufferView].byteOffset+(indices.byteOffset??0);
 const vertex=(index:number)=>new Vector3(bytes.readFloatLE(posOffset+12*index),bytes.readFloatLE(posOffset+12*index+4),bytes.readFloatLE(posOffset+12*index+8));
 const areas=new Map<number,number>();
 for(let i=0;i<indices.count;i+=3){
  const a=vertex(bytes.readUInt32LE(indexOffset+4*i)),b=vertex(bytes.readUInt32LE(indexOffset+4*(i+1))),c=vertex(bytes.readUInt32LE(indexOffset+4*(i+2)));
  if(Math.abs(a.y-b.y)>1e-6||Math.abs(a.y-c.y)>1e-6)continue;
  const upArea=((b.z-a.z)*(c.x-a.x)-(b.x-a.x)*(c.z-a.z))/2;
  if(upArea>0)areas.set(a.y,(areas.get(a.y)??0)+upArea);
 }
 return [...areas].sort((a,b)=>b[1]-a[1])[0][0];
}
function rig(scale=1,floor=0,hipY=.54){
 const root=new Group(),model=new Group(),hips=new Object3D(),scratch=new Vector3();
 root.position.set(2,1.08,-3);root.rotation.y=Math.PI/3;
 model.scale.setScalar(scale);model.position.y=floor;hips.position.y=hipY;model.add(hips);root.add(model);
 return {root,model,hips,scratch};
}

describe('Habitat seating surface height',()=>{
 it.each(['furniture-kit/chair','furniture-kit/bench'])('uses %s actual seat triangles, not its backrest bounds',assetId=>{
  const top=glbSeatTop(assetId);
  expect(top).toBeCloseTo(.24,6);expect(top).toBeLessThan(getBuildAsset(assetId)!.bounds[1]);
  for(const scale of [.25,1,3,4])for(const y of [0,1.25,8]){
   const seat=chair({assetId,scale,y,rotation:Math.PI/2});
   expect(seatSurfaceYFor(seat)).toBeCloseTo(y+top*scale,6);
  }
 });
 it('uses bounded metadata fallbacks for backless, other imported, and builtin seats',()=>{
  const stool=chair({assetId:'furniture-kit/stoolBar',scale:2,y:1});
  expect(seatSurfaceYFor(stool)).toBeCloseTo(1+getBuildAsset(stool.assetId)!.bounds[1]*2);
  const sofa=chair({assetId:'furniture-kit/loungeSofa',scale:2,y:1});
  expect(seatSurfaceYFor(sofa)).toBeGreaterThan(1);expect(seatSurfaceYFor(sofa)).toBeLessThan(1+getBuildAsset(sofa.assetId)!.bounds[1]*2);
  // Stage's builtin seat is a .55-high box centered at .3.
  expect(seatSurfaceYFor(chair({assetId:'ctrl-seat',y:2,scale:2}))).toBeCloseTo(3.15);
 });
});

describe('settled seated raw hips calibrate root height',()=>{
 it.each([[1,0,.54],[.65,-.12,1.1],[1.8,.23,.44]])('accounts for model scale %s, floor %s and rig hip %s', (scale,floor,hipY)=>{
  const {root,hips,scratch}=rig(scale,floor,hipY),surface=seatSurfaceYFor(chair());
  const target=seatedRootTargetY(root,hips,surface,scratch);
  expect(target).toBeCloseTo(surface-(floor+scale*hipY));
  root.position.y=target!;expect(hips.getWorldPosition(scratch).y).toBeCloseTo(surface);
  expect(root.position.x).toBe(2);expect(root.position.z).toBe(-3);expect(root.rotation.y).toBeCloseTo(Math.PI/3);
 });
 it('converges to the real surface with smoothing and follows a resized/elevated seat without drift',()=>{
  const {root,hips,scratch}=rig(1.4,-.2,.9);
  for(const surface of [seatSurfaceYFor(chair()),seatSurfaceYFor(chair({y:1.25,scale:4})),seatSurfaceYFor(chair({scale:.25}))]){
   for(let frame=0;frame<90;frame++)root.position.y+=(seatedRootTargetY(root,hips,surface,scratch)!-root.position.y)*(1-Math.exp(-35/60));
   expect(Math.abs(hips.getWorldPosition(scratch).y-surface)).toBeLessThan(.04);
  }
 });
 it('samples the freshly animated raw bone, not a stale matrix or normalized/rest hips',()=>{
  const {root,hips,scratch}=rig(1.5,.1,1.1);
  root.updateMatrixWorld(true);hips.position.y=.35;
  const target=seatedRootTargetY(root,hips,.72,scratch)!;
  root.position.y=target;
  expect(hips.getWorldPosition(scratch).y).toBeCloseTo(.72);
 });
 it('safely declines missing bones, absent surface opt-in and nonfinite inputs',()=>{
  const {root,hips,scratch}=rig();
  for(const surface of [undefined,NaN,Infinity,-Infinity])expect(seatedRootTargetY(root,hips,surface,scratch)).toBeUndefined();
  expect(seatedRootTargetY(root,null,.72,scratch)).toBeUndefined();
  for(const y of [NaN,Infinity,-Infinity]){hips.position.y=y;expect(seatedRootTargetY(root,hips,.72,scratch)).toBeUndefined();}
  expect(root.position.y).toBe(1.08);
 });
 it('wires opt-in only after animation settles and keeps legacy seatLift fallback + local telemetry',()=>{
  const source=readFileSync(new URL('../../features/plaza/characters/vrm-avatar.tsx',import.meta.url),'utf8');
  const frame=source.slice(source.indexOf('useFrame('));
  expect(source).toContain('seatSurfaceY?:number');
  expect(frame.indexOf('animator.current.update(')).toBeLessThan(frame.indexOf('seatedRootTargetY('));
  expect(frame).toContain("props.sitting&&animator.current.state==='Seated'");
  expect(frame).toContain("getRawBoneNode('hips')");
  expect(frame).toContain('props.sitting?props.seatLift:props.motion.current.height');
  expect(frame.match(/r.position.y\+=/g)).toHaveLength(1); // No competing legacy pull every frame.
  expect(frame).toContain('data.ctrlAvatarHipY');expect(frame).toContain('data.ctrlAvatarSeatSurfaceY');
  expect(frame.indexOf('if(props.local!==false)')).toBeLessThan(frame.indexOf('data.ctrlAvatarHipY'));
  const stage=readFileSync(new URL('../../features/habitat/stage.tsx',import.meta.url),'utf8');
  expect(stage).not.toContain('.54*(seat.scale-1)');
  expect(stage.match(/seatSurfaceY=\{/g)).toHaveLength(2); // Local and OtherPlayer.
 });
});
