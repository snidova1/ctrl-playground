export interface WorldNavigation{generator:string;step:number;minX:number;minZ:number;width:number;depth:number;spawn:{x:number;y:number;z:number};walkableCells:number;heights:Array<number|null>;}
export type GroundPoint={x:number;y:number;z:number};
/** Next navigation target for this frame. */
export function nextWorldPathPoint(route:GroundPoint[],from:Pick<GroundPoint,'x'|'z'>):GroundPoint|undefined {while(route.length&&Math.hypot(route[0].x-from.x,route[0].z-from.z)<.12)route.shift();return route[0];}

export function cellAt(nav:WorldNavigation,x:number,z:number){const ix=Math.round((x-nav.minX)/nav.step),iz=Math.round((z-nav.minZ)/nav.step);return ix<0||iz<0||ix>=nav.width||iz>=nav.depth?-1:iz*nav.width+ix;}
export function pointAt(nav:WorldNavigation,index:number):GroundPoint{return {x:nav.minX+index%nav.width*nav.step,y:nav.heights[index]??nav.spawn.y,z:nav.minZ+Math.floor(index/nav.width)*nav.step};}
export function groundAt(nav:WorldNavigation,x:number,z:number):number|null{const i=cellAt(nav,x,z);return i<0?null:nav.heights[i];}
export function moveOnWorld(nav:WorldNavigation,from:GroundPoint,to:{x:number;z:number}):GroundPoint{
 let {x,y,z}=from;const steps=Math.max(1,Math.ceil(Math.hypot(to.x-x,to.z-z)/.15)),dx=(to.x-x)/steps,dz=(to.z-z)/steps;
 for(let i=0;i<steps;i++){let h=groundAt(nav,x+dx,z);if(h!==null&&Math.abs(h-y)<1.15){x+=dx;y=h;}h=groundAt(nav,x,z+dz);if(h!==null&&Math.abs(h-y)<1.15){z+=dz;y=h;}}
 return {x,y,z};
}
/** Four-neighbour graph: never cuts diagonally through building corners. */
export function worldPath(nav:WorldNavigation,from:{x:number;z:number},to:{x:number;z:number}):GroundPoint[]{
 const start=cellAt(nav,from.x,from.z),end=cellAt(nav,to.x,to.z);if(start<0||end<0||nav.heights[start]===null||nav.heights[end]===null)return [];
 const previous=new Int32Array(nav.heights.length).fill(-1),queue=[start];previous[start]=start;
 for(let q=0;q<queue.length;q++){const i=queue[q];if(i===end)break;const x=i%nav.width,z=Math.floor(i/nav.width);for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,nz=z+dz,j=nz*nav.width+nx;if(nx<0||nx>=nav.width||nz<0||nz>=nav.depth||previous[j]!==-1||nav.heights[j]===null||Math.abs(nav.heights[j]!-nav.heights[i]!)>1.1)continue;previous[j]=i;queue.push(j);}}
 if(previous[end]===-1)return [];const path=[];let i=end;while(i!==start){path.push(pointAt(nav,i));i=previous[i];}return path.reverse();
}
