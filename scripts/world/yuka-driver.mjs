// Small reviewed adapter; YUKA itself is bundled from pinned yuka@0.7.8 (MIT).
import {Vehicle,Path,FollowPathBehavior,OnPathBehavior,Vector3} from 'yuka';
export function createDriver(start,speed=1.15){
 const vehicle=new Vehicle();vehicle.position.set(start.x,start.y,start.z);vehicle.maxSpeed=speed;vehicle.maxForce=6;let path=null;
 return {
  setPath(points){path=new Path();for(const p of points)path.add(new Vector3(p.x,p.y,p.z));vehicle.steering.clear();const follow=new FollowPathBehavior(path,.12),stay=new OnPathBehavior(path);stay.radius=.1;stay.predictionFactor=.12;vehicle.steering.add(follow);vehicle.steering.add(stay);},
  step(dt){if(!path)return {...vehicle.position,finished:true,speed:0};vehicle.update(Math.min(dt,.05));const finished=path.finished()&&vehicle.position.distanceTo(path.current())<.3;if(finished)vehicle.velocity.set(0,0,0);return {x:vehicle.position.x,y:vehicle.position.y,z:vehicle.position.z,finished,speed:vehicle.velocity.length()};},
  warp(point){vehicle.position.set(point.x,point.y,point.z);vehicle.velocity.set(0,0,0);}
 };
}
