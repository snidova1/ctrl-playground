import {Camera,Color,Matrix3,Mesh,MeshStandardMaterial,Vector3} from 'three';
import type {Group} from 'three';
type Face={points:[number,number][];depth:number;color:string;image?:HTMLCanvasElement;uv?:[number,number][]};
const normal=new Vector3(),normalMatrix=new Matrix3(),light=new Vector3(-.4,.8,1).normalize();
const srgb=(value:number)=>Math.round(255*Math.min(1,Math.max(0,value<=.0031308?value*12.92:1.055*Math.pow(value,1/2.4)-.055)));
export function paintSculpture(ctx:CanvasRenderingContext2D,root:Group,camera:Camera,width:number,height:number,background:string){
 ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
 const center=width<650?width*.5:width*.59;
 const glow=ctx.createRadialGradient(center,height*.4,20,center,height*.4,width*.85);glow.addColorStop(0,background==='#161816'?'#ffffff00':'#ffffff30');glow.addColorStop(1,'#1b221500');ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
 ctx.save();ctx.translate(center,height*.77);ctx.scale(1,.14);const shadow=ctx.createRadialGradient(0,0,0,0,0,width*.27);shadow.addColorStop(0,'#19221c25');shadow.addColorStop(.5,'#19221c12');shadow.addColorStop(1,'#19221c00');ctx.fillStyle=shadow;ctx.fillRect(-width*.4,-width*.4,width*.8,width*.8);ctx.restore();
 root.updateMatrixWorld(true);camera.updateMatrixWorld(true);const faces:Face[]=[];
 root.traverseVisible(object=>{
  if(!(object instanceof Mesh)||!object.visible)return;
  const material=object.material as MeshStandardMaterial,geometry=object.geometry,position=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),index=geometry.index,uv=geometry.getAttribute('uv');
  if(!position||Array.isArray(object.material))return;
  const vertices:Vector3[]=[],shade:number[]=[];normalMatrix.getNormalMatrix(object.matrixWorld);
  for(let i=0;i<position.count;i++){
   vertices.push(new Vector3().fromBufferAttribute(position,i).applyMatrix4(object.matrixWorld).project(camera));
   normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();shade.push(.35+Math.max(0,normal.dot(light))*.78+Math.pow(Math.max(0,normal.z),18)*.15);
  }
  const n=index?index.count:position.count;
  for(let i=0;i<n;i+=3){const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);const [a,b,c]=ids.map(k=>vertices[k]);if(a.z>1||b.z>1||c.z>1)continue;
   // Back faces do not contribute to these closed, opaque exhibits.
   if((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)<=0)continue;
   const points=ids.map(k=>[(vertices[k].x*.5+.5)*width,(-vertices[k].y*.5+.5)*height] as [number,number]);const amount=ids.reduce((sum,k)=>sum+shade[k],0)/3;
   const color=material.color??new Color('#ddd');const tone=`rgb(${srgb(color.r*amount)},${srgb(color.g*amount)},${srgb(color.b*amount)})`;
   const source=material.map?.source.data;const image=source instanceof HTMLCanvasElement?source:undefined;
   const actualDepth=(a.z+b.z+c.z)/3;const groupDepth=object.parent?.userData.paintAsUnit?object.parent.getWorldPosition(new Vector3()).project(camera).z:null;const depth=groupDepth===null?actualDepth:groupDepth+(actualDepth-groupDepth)*.0001-object.renderOrder*.00002;
   faces.push({points,depth:object.userData.paintBackground?depth+2:depth,color:tone,...(image&&uv?{image,uv:ids.map(k=>[uv.getX(k)*image.width,(1-uv.getY(k))*image.height] as [number,number])}:{})});
  }
 });
 faces.sort((a,b)=>b.depth-a.depth);
 for(const f of faces){const [a,b,c]=f.points;ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.closePath();ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.image?'#172622':f.color;ctx.lineWidth=.55;ctx.stroke();
  if(f.image&&f.uv){const [u,v,w]=f.uv,det=(v[0]-u[0])*(w[1]-u[1])-(w[0]-u[0])*(v[1]-u[1]);if(Math.abs(det)<.01)continue;const aa=((b[0]-a[0])*(w[1]-u[1])-(c[0]-a[0])*(v[1]-u[1]))/det,bb=((b[1]-a[1])*(w[1]-u[1])-(c[1]-a[1])*(v[1]-u[1]))/det,cc=((c[0]-a[0])*(v[0]-u[0])-(b[0]-a[0])*(w[0]-u[0]))/det,dd=((c[1]-a[1])*(v[0]-u[0])-(b[1]-a[1])*(w[0]-u[0]))/det;ctx.save();ctx.clip();ctx.transform(aa,bb,cc,dd,a[0]-aa*u[0]-cc*u[1],a[1]-bb*u[0]-dd*u[1]);ctx.drawImage(f.image,0,0);ctx.restore();}
 }
}
