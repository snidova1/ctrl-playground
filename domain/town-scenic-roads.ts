/** Visual-only clipping of inherited straight road strips around the
 * authored Willow Square. Physical navigation and server road graph remain
 * untouched. Outside sections reconnect to authored center paths.
 */
export type TownRoadSegment=readonly [number,number,number,number];

export function scenicRoadOutsideSquare(
 segment:TownRoadSegment,radius=34
):TownRoadSegment[]{
 const [ax,az,bx,bz]=segment;
 const dx=bx-ax,dz=bz-az;
 const aa=dx*dx+dz*dz;
 if(aa<1e-8)return[];
 const bb=2*(ax*dx+az*dz);
 const cc=ax*ax+az*az-radius*radius;
 const d=bb*bb-4*aa*cc;
 const stops=[0,1];
 if(d>0){
  const root=Math.sqrt(d),t0=(-bb-root)/(2*aa),t1=(-bb+root)/(2*aa);
  if(t0>0&&t0<1)stops.push(t0);
  if(t1>0&&t1<1)stops.push(t1);
 }
 stops.sort((x,y)=>x-y);
 const result:TownRoadSegment[]=[];
 for(let i=1;i<stops.length;i++){
  const a=stops[i-1],b=stops[i],mid=(a+b)/2;
  if((ax+dx*mid)**2+(az+dz*mid)**2<radius**2||b-a<1e-5)continue;
  result.push([ax+dx*a,az+dz*a,ax+dx*b,az+dz*b]);
 }
 return result;
}