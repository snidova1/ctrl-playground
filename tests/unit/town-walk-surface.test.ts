import {describe,it,expect} from 'vitest';
import {Mesh,PlaneGeometry,MeshBasicMaterial,Raycaster,Vector3,DoubleSide} from 'three';
import {FESTIVAL_DECK,townSurfaceHeight} from '@/domain/town-walk-surface';
import {isPublicWorldWalkable,navigatePublicWorld} from '@/features/habitat/public-world-geography';
describe('physically reachable Festival stage',()=>{
 it('matches the actual inclined ramp and permits a full walk up and back down',()=>{
  const d=FESTIVAL_DECK,g=new PlaneGeometry(5.2,Math.hypot(4,.8)),material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,material);
  mesh.position.set(d.x,.4,d.z+7);mesh.rotation.x=-Math.PI/2+Math.atan(.2);mesh.updateMatrixWorld(true);const ray=new Raycaster();
  for(let z=-89.1;z> -93;z-=.2){ray.set(new Vector3(d.x,2,z),new Vector3(0,-1,0));expect(townSurfaceHeight(d.x,z)).toBeCloseTo(ray.intersectObject(mesh)[0].point.y,6);expect(isPublicWorldWalkable(d.x,z)).toBe(true);}
  expect(navigatePublicWorld({x:77,z:-88},{x:77,z:-99})).toMatchObject({x:77,z:expect.closeTo(-99,6)});
  expect(navigatePublicWorld({x:77,z:-99},{x:77,z:-88})).toMatchObject({x:77,z:expect.closeTo(-88,6)});
  expect(townSurfaceHeight(77,-98)).toBe(.8);g.dispose();material.dispose();
 });
 it('blocks rendered rails, posts and ramp sides rather than walking through a raised box',()=>{
  for(const p of [[69,-98],[85,-98],[77,-103],[71,-102],[83,-102],[70,-93],[79.6,-91]])expect(isPublicWorldWalkable(...p as [number,number])).toBe(false);
  const p=navigatePublicWorld({x:67,z:-98},{x:77,z:-98});expect(p.x).toBeLessThan(69);
 });
});
