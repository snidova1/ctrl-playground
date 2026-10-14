import type {ControlInput} from '@/features/plaza/scene';

/** Each contact owns only its input. Lifting/cancelling one direction must not
 * erase another held direction or the independent run finger. */
export function createTouchInput(target:ControlInput|{current:ControlInput}){
 const directions=new Map<number,{x:number;z:number}>(),runners=new Set<number>();
 const current=()=> 'current' in target?target.current:target;
 const update=()=>{
  const input=current();
  input.x=0;input.z=0;
  for(const direction of directions.values()){input.x+=direction.x;input.z+=direction.z;}
  input.run=runners.size>0;
 };
 return {
  direction(id:number,x:number,z:number){directions.set(id,{x,z});update();},
  run(id:number){runners.add(id);update();},
  release(id:number){directions.delete(id);runners.delete(id);update();},
  clear(){directions.clear();runners.clear();update();current().jump=false;},
 };
}
