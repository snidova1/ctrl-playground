import {describe,it,expect} from 'vitest';
import {PlaneGeometry,Raycaster,Mesh,MeshBasicMaterial,Vector3,DoubleSide} from 'three';
import {TOWN_TERRAIN,townTerrainHeights,townGroundHeight,townGroundNormal,TOWN_ROAD_CONNECTIONS} from '@/domain/town-terrain';
import {TOWN_ACTIVITIES,TOWN_DISTRICT_BUILDINGS} from '@/features/habitat/town-districts';
import {TOWN_WORK_SITES} from '@/domain/town-routes';
import {TOWN_VENUES} from '@/domain/town-venues';
import {isPublicWorldWalkable} from '@/features/habitat/public-world-geography';
import {townCameraFraction} from '@/features/habitat/town-camera';
describe('shared walkable landscape',()=>{
 it('matches actual rendered triangles, including their diagonal (not a bilinear approximation)',()=>{
  const g=new PlaneGeometry(TOWN_TERRAIN.width,TOWN_TERRAIN.depth,TOWN_TERRAIN.columns,TOWN_TERRAIN.rows),p=g.getAttribute('position'),data=townTerrainHeights();
  for(let i=0;i<p.count;i++)p.setZ(i,data[i]);
  const material=new MeshBasicMaterial({side:DoubleSide}),mesh=new Mesh(g,material);mesh.rotation.x=-Math.PI/2;mesh.updateMatrixWorld(true);
  const ray=new Raycaster();
  for(let i=0;i<90;i++){
   const x=Math.sin(i*14.31)*119,z=Math.cos(i*17.9)*109;
   ray.set(new Vector3(x,10,z),new Vector3(0,-1,0));
   const hit=ray.intersectObject(mesh)[0];expect(hit).toBeDefined();expect(townGroundHeight(x,z)).toBeCloseTo(hit.point.y,5);
  }
  g.dispose();material.dispose();
 });
 it('keeps real doors, work stations, foundations and connecting roads at the existing elevation',()=>{
  for(const a of [...TOWN_ACTIVITIES,...TOWN_WORK_SITES,...TOWN_VENUES,...TOWN_DISTRICT_BUILDINGS])expect(townGroundHeight(a.x,a.z)).toBe(0);
  for(const [ax,az,bx,bz] of TOWN_ROAD_CONNECTIONS)for(let i=0;i<=20;i++)expect(townGroundHeight(ax+(bx-ax)*i/20,az+(bz-az)*i/20)).toBe(0);
  expect(townGroundHeight(0,6)).toBe(0);expect(townGroundHeight(-1.5,-56)).toBe(0);
 });
 it('has genuine reachable relief and bounded gradients throughout the movement bounds',()=>{
  let elevatedWalkable=0,max=0;
  for(let x=-119;x<=119;x+=2)for(let z=-109;z<=109;z+=2){
   const h=townGroundHeight(x,z),normal=townGroundNormal(x,z);max=Math.max(max,h);
   expect(h).toBeGreaterThanOrEqual(0);expect(Number.isFinite(h)).toBe(true);
   expect(normal.y).toBeGreaterThan(.65);expect(Math.hypot(normal.x,normal.y,normal.z)).toBeCloseTo(1,6);
   if(h>.8&&isPublicWorldWalkable(x,z))elevatedWalkable++;
  }
  expect(max).toBeGreaterThan(2);expect(elevatedWalkable).toBeGreaterThan(150);
 });
 it('protects camera eye against terrain and handles invalid inputs deterministically',()=>{
  expect(townGroundHeight(NaN,Infinity)).toBe(0);
  const x=-109,z=86,h=townGroundHeight(x,z);
  expect(h).toBeGreaterThan(.8);
  expect(townCameraFraction({x,y:h+1.3,z},{x:x+3,y:h-.2,z:z+3})).toBeLessThan(1);
 });
});
