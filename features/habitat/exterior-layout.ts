// World-space proportions, shared by the house, meadow and pointer picking.
// The avatar retains its existing scale: only the cottage gets enlarged.
export const EXTERIOR_HOME = {
  scale: 1.75,
  position: [0, 0, -4] as [number, number, number],
  foundation: [6.65, .16, 4.55] as [number, number, number],
  door: [0, 1.8, .25] as [number, number, number],
};
export function intersectsExteriorHouse(x:number,z:number,halfX=0,halfZ=0,padding=.18){
  const {position,foundation,scale}=EXTERIOR_HOME;
  const hx=foundation[0]*scale/2+padding,hz=foundation[2]*scale/2+padding;
  const body=Math.abs(x-position[0])<hx+halfX&&Math.abs(z-position[2])<hz+halfZ;
  const porch=Math.abs(x)<1.55+halfX&&z>-.2-halfZ&&z<1.55+halfZ;
  return body||porch;
}
