import {BoxGeometry,BufferGeometry,CanvasTexture,Color,DoubleSide,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,SRGBColorSpace,SphereGeometry,TorusGeometry} from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {deadWeb,agents} from '@/features/worlds/data';
export type Exhibit='machine'|'dead-web'|'internet-weather'|'agent-orbit';
export type Form={root:Group;pickable:Mesh[];tick:(time:number,selection:number,active?:number[])=>void;dispose:()=>void};
const tau=Math.PI*2;
export function makeForm(kind:Exhibit,weights:number[]):Form{
 const root=new Group(),pickable:Mesh[]=[],materials:MeshStandardMaterial[]=[],geometries:BufferGeometry[]=[],textures:CanvasTexture[]=[];
 const mat=(color:string,metal=.1,rough=.38)=>{const m=new MeshStandardMaterial({color,metalness:metal,roughness:rough,side:DoubleSide});materials.push(m);return m;};
 const mesh=(g:BufferGeometry,m:MeshStandardMaterial,parent:Group=root)=>{geometries.push(g);const o=new Mesh(g,m);o.castShadow=true;o.receiveShadow=true;o.renderOrder=parent.children.length;parent.add(o);return o;};
 const steel=mat('#b5b8b3',.75,.29),white=mat('#e8e6df',.1,.42),dark=mat('#202b27',.45,.28),accent=mat('#eb4826',.3,.3);
 let tick:Form['tick']=()=>{};
 if(kind==='machine'){
  // Each radial sector belongs to a real command; width follows its relative support.
  const normalized=weights.length?weights.map(v=>Math.sqrt(v+16)):[1,1,1,1,1];const total=normalized.reduce((a,b)=>a+b,0);
  const blades:Mesh[]=[];const geometry=new BoxGeometry(.028,1.7,.66);geometries.push(geometry);
  for(let i=0;i<164;i++){
   const t=i/164*tau;let sum=0,sector=0;for(let j=0;j<normalized.length;j++){sum+=normalized[j]/total;if(i/164<sum){sector=j;break;}}
   const blade=new Mesh(geometry,sector===0?accent:steel);blade.position.set(Math.cos(t)*2.04,Math.sin(t)*2.04,0);blade.rotation.set(Math.sin(t)*.2,t*.5,t+Math.PI*.5);blade.userData.index=sector;blade.castShadow=true;root.add(blade);blades.push(blade);pickable.push(blade);
  }
  root.rotation.set(.38,-.46,-.3);
  tick=(time,selection)=>{blades.forEach((o,i)=>{const t=i/164*tau;o.rotation.y=t*.5+Math.sin(time*.24+t*2)*.13;o.material=o.userData.index===selection?accent:steel;});};
 }else if(kind==='dead-web'){
  const screens:Group[]=[];
  deadWeb.forEach((record,i)=>{
   const group=new Group();group.userData.paintAsUnit=true;root.add(group);const a=i/6*tau;group.position.set(Math.sin(a)*2.6,Math.sin(a*2)*.38,Math.cos(a)*1.3);group.rotation.y=-Math.sin(a)*.32;group.scale.setScalar(i===0?1.17:.82);screens.push(group);
   const body=mesh(new RoundedBoxGeometry(1.9,1.55,1.13,2,.11),white,group);body.userData.index=i;pickable.push(body);
   mesh(new RoundedBoxGeometry(1.76,1.35,.13,1,.04),mat('#97998f',.28,.6),group).position.z=.58;
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d')!;
   c.fillStyle='#172622';c.fillRect(0,0,512,384);c.fillStyle=record.color;c.font='14px monospace';c.fillText(`HTTP / RECORD ${record.id}`,24,35);c.fillRect(24,48,464,1);
   c.font='bold 44px monospace';const words=record.name.split(' ');let row='',line=0;for(const word of words){if((row+word).length>16){c.fillText(row,24,130+line*48);row='';line++;}row+=word+' ';}c.fillText(row,24,130+line*48);c.font='17px monospace';c.fillText(String(record.year)+' / STILL HERE',24,338);c.fillStyle='#00000028';for(let y=0;y<384;y+=4)c.fillRect(0,y,512,1);
   const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;textures.push(texture);const screenMaterial=mat(record.color,0,.85);screenMaterial.map=texture;screenMaterial.color.set('white');screenMaterial.emissive=new Color('#afc9b0');screenMaterial.emissiveMap=texture;screenMaterial.emissiveIntensity=.3;
   const screen=mesh(new BoxGeometry(1.59,1.12,.02),screenMaterial,group);screen.position.set(0,.05,.66);screen.userData.index=i;pickable.push(screen);
   const foot=mesh(new BoxGeometry(.86,.18,.65),white,group);foot.position.set(0,-.91,0);foot.renderOrder=-1;
   for(let k=0;k<7;k++){const slit=mesh(new BoxGeometry(.055,.012,.02),dark,group);slit.position.set(-.64+k*.105,-.655,.668);}
   const light=mesh(new SphereGeometry(.035,8,6),accent,group);light.position.set(.65,-.62,.69);
  });
  root.rotation.set(.1,-.2,.035);
  tick=(time,selection)=>{screens.forEach((g,i)=>{const a=i/6*tau;g.position.y=Math.sin(a*2)*.38+Math.sin(time*.28+i)*.05;g.scale.setScalar(i===selection?1.17:.82);});};
 }else if(kind==='agent-orbit'){
  const orbital:Group[]=[];const objects:Mesh[]=[];
  agents.forEach((agent,i)=>{
   const plane=new Group();root.add(plane);plane.rotation.set(.5+i*.29, i*.35, i*.24);orbital.push(plane);
   const radius=1.35+agent.age/56;const track=mesh(new TorusGeometry(radius,.014,4,112),steel,plane);track.userData.index=i;
   const marker=mesh(new SphereGeometry(.08+agent.budget*.15,14,10),i===0?accent:white,plane);marker.userData.index=i;pickable.push(marker);objects.push(marker);
  });
  mesh(new SphereGeometry(.4,28,20),dark);root.rotation.set(.3,.1,-.2);
  tick=(time,selection,active)=>{orbital.forEach((g,i)=>{g.visible=!active||active.includes(i);});objects.forEach((o,i)=>{const agent=agents[i],t=time*(.03+agent.activity*.045)+i*1.82,r=1.35+agent.age/56;o.position.set(Math.cos(t)*r,Math.sin(t)*r,0);o.material=i===selection?accent:white;});};
 }else{
  const vertices:number[]=[],indices:number[]=[];const rows=58,cols=54;
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const u=x/(cols-1),v=y/(rows-1);vertices.push((u-.5)*7.4,Math.sin(u*5+v*2)*.7+Math.cos(v*8-u*3)*.48,(v-.5)*5);}
  for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const a=y*cols+x;indices.push(a,a+1,a+cols,a+1,a+cols+1,a+cols);}
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh(geometry,steel);root.rotation.set(.35,0,-.1);
 }
 return {root,pickable,tick,dispose(){new Set(geometries).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}};
}
