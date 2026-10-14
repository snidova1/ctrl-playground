import {describe,it,expect} from 'vitest';
import {BoxGeometry,Mesh,MeshBasicMaterial,Object3D,Raycaster,Vector3} from 'three';
import {assignOcclusionTarget} from '@/features/habitat/town-occlusion';
describe('bounded label occlusion',()=>{
 it('has no null raycast target while a building is unmounted',()=>{
  const empty=new Object3D(),target={current:empty},ray=new Raycaster();assignOcclusionTarget(target,null,empty);
  expect(target.current).toBeInstanceOf(Object3D);expect(ray.intersectObjects([target.current],true)).toEqual([]);
 });
 it('follows the committed building and ignores the rest of the terrain scene',()=>{
  const empty=new Object3D(),target={current:empty},wall=new Mesh(new BoxGeometry(2,2,2),new MeshBasicMaterial());wall.updateMatrixWorld();assignOcclusionTarget(target,wall,empty);
  expect(target.current).toBe(wall);const ray=new Raycaster(new Vector3(0,0,4),new Vector3(0,0,-1));expect(ray.intersectObjects([target.current],true).length).toBeGreaterThan(0);
  assignOcclusionTarget(target,null,empty);expect(ray.intersectObjects([target.current],true)).toEqual([]);
 });
});
