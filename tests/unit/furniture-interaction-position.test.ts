import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {Group,Vector3} from 'three';
import {getBuildAsset} from '@/features/plaza/build-assets';
import {nearestUsableObject,seatPoseFor,interactionLabel,interactionDistanceTo,interactionObjectFor} from '@/features/habitat/furniture-interactions';
import HouseInteractions from '@/features/habitat/house-interactions';
import type {WorldObject} from '@/features/habitat/types';
import type {Pose} from '@/features/plaza/types';

const piece=(patch:Partial<WorldObject>={}):WorldObject=>({id:'chair',assetId:'furniture-kit/chair',behavior:'seat',x:0,y:0,z:0,rotation:0,scale:1,name:'Chair',target:'',...patch});
/** Same nested transforms as Stage Imported -> ObjectView; no WebGL/browser. */
function renderedBounds(object:WorldObject){
 const asset=getBuildAsset(object.assetId)!;
 const world=new Group();world.position.set(object.x,object.y,object.z);world.rotation.y=object.rotation;world.scale.setScalar(object.scale);
 const imported=new Group();imported.position.set(-asset.center[0],-(asset.center[1]-asset.bounds[1]/2),-asset.center[2]);world.add(imported);world.updateMatrixWorld(true);
 return {world,imported,asset};
}

describe('furniture interactions use rendered furniture coordinates',()=>{
 it('confirms actual chair GLB bounds normalize to the world object, not the authored corner',()=>{
  const bytes=readFileSync(new URL('../../public/plaza/build-kit/furniture-kit/chair.glb',import.meta.url));
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const positions=gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION];
  const chair=piece({x:4,z:-3,y:1,rotation:Math.PI/3,scale:2.5}),{imported,asset}=renderedBounds(chair);
  expect(positions.min).toEqual([0,0,-.2]);expect(positions.max).toEqual([.2,.47,0]);
  const center=new Vector3(...asset.center).applyMatrix4(imported.matrixWorld);
  expect(center.x).toBeCloseTo(chair.x);expect(center.z).toBeCloseTo(chair.z);
  expect(center.y).toBeCloseTo(chair.y+asset.bounds[1]*chair.scale/2);
  expect(nearestUsableObject({x:chair.x,z:chair.z},[chair],1.1)?.id).toBe(chair.id);
 });
 it('uses the visible edge of scaled furniture instead of rejecting a nearby long sofa by its distant center',()=>{
  const sofa=piece({id:'sofa',assetId:'furniture-kit/loungeSofa',x:0,z:0,scale:4});
  expect(nearestUsableObject({x:3,z:0},[sofa],1.1)?.id).toBe('sofa');
 });
 it.each([Math.PI/2,Math.PI/4,-Math.PI/3])('matches mesh-local proximity after scale and rotation %s',rotation=>{
  const sofa=piece({assetId:'furniture-kit/loungeSofa',x:5,z:-2,rotation,scale:4});
  const {imported,asset}=renderedBounds(sofa);
  const atEdge=new Vector3(asset.center[0]+asset.bounds[0]/2+.25,asset.center[1]-asset.bounds[1]/2,asset.center[2]).applyMatrix4(imported.matrixWorld);
  expect(nearestUsableObject(atEdge,[sofa],1.01)?.id).toBe(sofa.id);
  const tooFar=new Vector3(asset.center[0]+asset.bounds[0]/2+.3,asset.center[1]-asset.bounds[1]/2,asset.center[2]).applyMatrix4(imported.matrixWorld);
  expect(nearestUsableObject(tooFar,[sofa],1.01)).toBeUndefined();
 });
 it('selects the nearest rendered surface rather than the nearest unrelated object center',()=>{
  const sofa=piece({id:'sofa',assetId:'furniture-kit/loungeSofa',scale:4});
  const lamp=piece({id:'lamp',assetId:'furniture-kit/lampSquareFloor',behavior:'light',x:3,z:1.5});
  expect(nearestUsableObject({x:3,z:0},[lamp,sofa],2.7)?.id).toBe('sofa');
 });
 it('does not offer a chair eight meters overhead or let it steal a reachable lamp action',()=>{
  const raised=piece({y:8});const lamp=piece({id:'lamp',assetId:'ctrl-lamp',behavior:'light',x:1});
  expect(nearestUsableObject({x:0,z:0},[raised])).toBeUndefined();
  expect(nearestUsableObject({x:0,z:0},[raised,lamp])?.id).toBe('lamp');
 });
 it('carries seat elevation and scales its existing local offset through the rendered transform',()=>{
  const seat=piece({x:2,z:-2,y:1.25,scale:3,rotation:Math.PI/2});
  const result=seatPoseFor(seat) as Pose&{y?:number};
  expect(result.x).toBeCloseTo(2.36);expect(result.z).toBeCloseTo(-2);expect(result.y).toBe(1.25);
  expect(result.angle).toBe(seat.rotation);expect(result.moving).toBe(false);
 });
 it('HUD follows the selected seat when it relocates, not the frozen approach pose',()=>{
  const pose={current:{x:0,z:3,angle:0,moving:false}},seat=piece({x:6,z:-4,rotation:Math.PI/2});
  const html=renderToStaticMarkup(React.createElement(HouseInteractions,{pose,objects:[seat],states:{},sitting:true,sittingOn:seat.id,busy:false,onUse:()=>{}}));
  expect(html).toContain('data-player-x="6.120"');expect(html).toContain('data-player-z="-4.000"');
  expect(html).toContain('Stand up');expect(pose.current).toEqual({x:0,z:3,angle:0,moving:false});
 });
 it('does not offer Stand up on an object whose seat behavior was removed',()=>{
  const pose={current:{x:0,z:0,angle:0,moving:false}},former=piece({x:9,behavior:'decoration'}),lamp=piece({id:'lamp',assetId:'ctrl-lamp',behavior:'light',x:1});
  const html=renderToStaticMarkup(React.createElement(HouseInteractions,{pose,objects:[former,lamp],states:{},sitting:true,sittingOn:former.id,busy:false,onUse:()=>{}}));
  expect(html).toContain('data-object-id="lamp"');expect(html).not.toContain('data-object-id="chair"');
 });
 it('measures explicit elevation against the same normalized vertical mesh interval',()=>{
  const chair=piece({y:4,scale:2});
  expect(interactionDistanceTo({x:0,y:4.5,z:0},chair)).toBe(0);
  expect(interactionDistanceTo({x:0,y:3,z:0},chair)).toBe(1);
  expect(interactionDistanceTo({x:0,y:5.94,z:0},chair)).toBeCloseTo(1);
  expect(nearestUsableObject({x:0,y:4,z:0},[chair],.01)).toBe(chair);
 });
 it('keeps the occupied seat by identity and falls back safely if it is deleted',()=>{
  const seat=piece({x:10,z:-4}),other=piece({id:'other',x:0});
  expect(interactionObjectFor({x:0,z:0},[other,seat],seat.id)).toBe(seat);
  expect(interactionObjectFor({x:0,z:0},[other],seat.id)).toBe(other);
  expect(interactionObjectFor({x:0,z:0},[],seat.id)).toBeUndefined();
 });
 it('rechecks touch actions at click time without activating a different newly-near object',()=>{
  const pose={current:{x:0,z:0,angle:0,moving:false}},chair=piece(),lamp=piece({id:'lamp',assetId:'ctrl-lamp',behavior:'light',x:10});
  const used:string[]=[];let tree:React.ReactNode;
  // Execute real hooks in a server render, retain the resulting event handler.
  function Probe(){tree=HouseInteractions({pose,objects:[chair,lamp],states:{},sitting:false,sittingOn:null,busy:false,onUse:o=>used.push(o.id)});return tree;}
  renderToStaticMarkup(React.createElement(Probe));
  function clickFor(node:React.ReactNode):(()=>void)|undefined{
   for(const child of React.Children.toArray(node)){
    if(!React.isValidElement(child))continue;
    const props=child.props as {onClick?:()=>void;children?:React.ReactNode};
    if(child.type==='button')return props.onClick;
    const nested=clickFor(props.children);if(nested)return nested;
   }
  }
  const click=clickFor(tree);expect(click).toBeTypeOf('function');click!();expect(used).toEqual(['chair']);
  pose.current.x=5;click!();expect(used).toEqual(['chair']);
  pose.current.x=10;click!();expect(used).toEqual(['chair']);
 });
 it('keeps builtin door/light/switch ranges, labels, stable ties, and caller object order',()=>{
  for(const behavior of ['door','light','switch'] as const){
   const object=piece({assetId:`ctrl-${behavior}`,behavior,x:2.7,y:0}),objects=[object];
   expect(nearestUsableObject({x:0,z:0},objects)).toBe(object);
   expect(nearestUsableObject({x:0,z:0},objects,2.69)).toBeUndefined();
  }
  const a=piece({id:'a',assetId:'ctrl-seat',x:-1}),b=piece({id:'b',assetId:'ctrl-seat',x:1}),objects=[a,b];
  expect(nearestUsableObject({x:0,z:0},objects)).toBe(a);expect(objects).toEqual([a,b]);
  expect(interactionLabel(piece({assetId:'habitat-house-door',behavior:'door'}),true,false)).toBe('Close door');
  expect(interactionLabel(piece({assetId:'habitat-house-window',behavior:'door'}),false,false)).toBe('Open window');
  expect(interactionLabel(piece({behavior:'light'}),true,false)).toBe('Turn off light');
  expect(interactionLabel(piece({behavior:'switch'}),false,false)).toBe('Use switch');
 });
});
