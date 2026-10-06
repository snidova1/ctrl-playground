import {BoxGeometry,BufferGeometry,CanvasTexture,CylinderGeometry,Group,Mesh,MeshStandardMaterial,PlaneGeometry,SRGBColorSpace,TorusGeometry} from 'three';
import {makeForm} from '@/three/exhibition/geometry';
import {stations} from './workshop-data';
export function buildWorkshop(){
 const root=new Group(),geometries:BufferGeometry[]=[],materials:MeshStandardMaterial[]=[],textures:CanvasTexture[]=[];
 const material=(color:string)=>{const m=new MeshStandardMaterial({color,roughness:.72,metalness:.1});materials.push(m);return m;};
 const ink=material('#273e36'),paper=material('#e9e7db'),metal=material('#afb5a5'),orange=material('#f05a28'),green=material('#bdc89b'),black=material('#17251f'),blue=material('#8ba7ae');
 function box(w:number,h:number,d:number,m:MeshStandardMaterial,x:number,y:number,z:number,parent=root){const g=new BoxGeometry(w,h,d);geometries.push(g);const mesh=new Mesh(g,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cylinder(r:number,h:number,m:MeshStandardMaterial,x:number,y:number,z:number,parent=root){const g=new CylinderGeometry(r,r,h,16);geometries.push(g);const mesh=new Mesh(g,m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
 function label(text:string,x:number,y:number,z:number,w:number,h:number,parent=root){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#273e36';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#e9e7db';ctx.font='bold 130px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,132,970);const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;textures.push(t);const m=material('#ffffff');m.map=t;const g=new PlaneGeometry(w,h);geometries.push(g);const o=new Mesh(g,m);o.position.set(x,y,z);parent.add(o);return o;}
 // A connected physical campus: structural slabs, a central press and output rooms.
 box(24,.4,18,paper,0,-.6,0);box(24,.08,.1,ink,0,-.35,8.85);box(.1,.08,18,ink,-11.85,-.35,0);
 for(let i=0;i<12;i++){box(.06,.03,17,metal,-11+i*2,-.37,0);box(23,.03,.06,metal,0,-.37,-8+i*1.5);}
 root.children.forEach(o=>{o.userData.paintBackground=true;});
 box(5.5,.45,5.6,ink,0,0,0);box(5,.16,5.1,green,0,.3,0);
 const press=new Group();root.add(press);
 box(3.8,1.8,2.4,ink,0,1.2,-.45,press);box(3.9,.25,2.6,metal,0,2.22,-.45,press);
 box(3.5,.7,1.6,paper,0,2.7,-.65,press);box(3.75,.12,1.8,ink,0,3.12,-.65,press);
 for(let i=0;i<9;i++)box(.055,.43,.07,ink,-1.35+i*.33,2.74,.18,press);
 label('CTRL',0,1.55,.78,2.8,.72,press);
 box(2.1,.7,.65,orange,0,.9,1.18,press);box(1.7,.18,.08,black,0,1.04,1.53,press);
 box(1.8,.08,3.3,ink,0,.5,3.05);
 const rollers:Mesh[]=[];for(let i=0;i<12;i++){const roller=cylinder(.075,1.65,metal,0,.58,1.65+i*.24);roller.rotation.z=Math.PI/2;rollers.push(roller);}
 const drum=cylinder(.65,2.5,orange,-2.45,1.4,-.4);drum.rotation.z=Math.PI/2;
 for(let i=0;i<5;i++){const ring=new Mesh(new TorusGeometry(.68,.05,5,20),ink);geometries.push(ring.geometry);ring.rotation.y=Math.PI/2;ring.position.set(-3.5+i*.45,1.4,-.4);root.add(ring);}
 box(.45,4.2,.45,ink,1.4,2.6,-1.3);box(.85,.12,.85,orange,1.4,4.74,-1.3);
 const beacon=cylinder(.19,.36,orange,1.4,4.98,-1.3);
 // Rail lines connect the three output rooms; moving sheets follow these routes during the preview.
 for(const s of stations.slice(1)){const [x,,z]=s.position;box(Math.abs(x),.05,.11,orange,x/2,-.29,2.8).userData.paintBackground=true;box(.11,.05,Math.abs(z-2.8),orange,x,-.29,(z+2.8)/2).userData.paintBackground=true;}
 const forms=stations.slice(1).map((station,i)=>{const zone=new Group();zone.position.set(station.position[0],station.position[1],station.position[2]);root.add(zone);box(5.2,.35,4.5,i===0?green:i===1?blue:orange,0,0,0,zone);const f=makeForm(station.slug||'dead-web',[],'reduced');f.root.scale.setScalar(i===0?.6:i===1?.58:.7);f.root.position.y=i===2?2:1.45;zone.add(f.root);label(['01 / DEAD WEB','02 / WEATHER','03 / ORBIT'][i],0,.45,2.28,4.5,.55,zone);return f;});
 // Archive shelves, switchboard and utility blocks give scale to the workbench.
 for(let j=0;j<3;j++){box(2,.12,1,ink,-7, .6+j*.65,5);for(let k=0;k<5;k++)box(.24,.45,.65,k%2?paper:green,-7.7+k*.35,.9+j*.65,5);}
 box(.13,2.3,1.1,ink,-8.05,1.3,5);box(.13,2.3,1.1,ink,-5.95,1.3,5);
 label('ARCHIVE',-7,2.75,5.1,2.7,.55);
 box(1.3,1.8,1.2,ink,-4.7,.6,-5.5);box(1.08,.65,.08,green,-4.7,1,-4.86);for(let i=0;i<3;i++)cylinder(.1,.04,orange,-5+i*.3,1.55,-5.5);
 for(let i=0;i<4;i++){box(.55,.55,.55,i===0?orange:metal,-1.5+i*.85,0,-5.8);box(.055,.06,.8,ink,-1.5+i*.85,.31,-5.8);}
 const sheet=box(1.1,.035,.7,paper,0,.71,3.4);sheet.visible=false;
 const envelope=box(.65,.08,.48,orange,0,-.15,2.8);envelope.visible=false;
 return {root,tick(time:number,progress:number,destination:number){forms.forEach((f,i)=>f.tick(time,i===destination-1?0:-1));drum.rotation.x=time*(progress>0&&progress<1?2:.12);rollers.forEach(r=>r.rotation.x=time*2);beacon.scale.y=1+(progress>0&&progress<1?Math.sin(time*7)*.25:0);sheet.visible=progress>0;sheet.position.z=progress<.45?3.7-progress*5:1.5+(progress-.45)*4;sheet.position.y=.73+Math.sin(Math.min(1,progress)*Math.PI)*.18;envelope.visible=progress>.6&&progress<1;const s=stations[Math.max(1,destination)];const p=Math.max(0,(progress-.6)/.4);envelope.position.x=p<.6?s.position[0]*p/.6:s.position[0];envelope.position.z=p<.6?2.8:2.8+(s.position[2]-2.8)*(p-.6)/.4;},dispose(){forms.forEach(f=>f.dispose());new Set(geometries).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
