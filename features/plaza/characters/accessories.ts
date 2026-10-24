import {BoxGeometry,BufferGeometry,CatmullRomCurve3,ConeGeometry,DoubleSide,ExtrudeGeometry,Group,Mesh,MeshStandardMaterial,Quaternion,Shape,SphereGeometry,TorusGeometry,TubeGeometry,Vector3,type Material} from 'three';
import type {VRM,VRMHumanBoneName} from '@pixiv/three-vrm';
import {accessoryColors,decorationDefaults,normalizeAppearance,type CharacterAppearance} from './catalog';

/** Original CTRL accessory geometry (project license); never a replacement avatar/body. */
const applied=new WeakMap<VRM,{key:string;roots:Group[]}>();
const restCorrections=new WeakMap<VRM,Partial<Record<VRMHumanBoneName,Quaternion>>>();
function dispose(roots:Group[]){
 const geometries=new Set<BufferGeometry>(),materials=new Set<Material>();
 for(const root of roots){root.removeFromParent();root.traverse(o=>{if(o instanceof Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);}});}
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
export function clearCharacterAccessories(vrm:VRM){const old=applied.get(vrm);if(old)dispose(old.roots);applied.delete(vrm);vrm.scene.userData.ctrlAccessoryCount=0;}
export function applyCharacterAccessories(vrm:VRM,appearance:CharacterAppearance){
 if(!restCorrections.has(vrm)){
  vrm.scene.updateMatrixWorld(true);
  const corrections:Partial<Record<VRMHumanBoneName,Quaternion>>={};
  for(const bone of ['head','neck','chest'] as const){const node=vrm.humanoid.getNormalizedBoneNode(bone);if(node)corrections[bone]=node.getWorldQuaternion(new Quaternion()).invert();}
  restCorrections.set(vrm,corrections);
 }
 const a={...decorationDefaults,...normalizeAppearance(appearance,appearance.gender,appearance.variantId)};
 // Fit the reviewed authored exports, not a generic head/body replacement. The dress
 // and hoodie have thicker outer layers; the long signature hair covers the ear plane.
 const studio=a.gender==='female'&&a.lookId==='alternate';
 // Offsets checked against the shipped skinned vertex surfaces in the CPU fitting
 // regression (not only empty bone fixtures). Keep a small clearance, not a float.
 const fit={earX:studio?.142:a.gender==='male'?.135:.140,earZ:studio?.075:a.gender==='male'?.075:.107,
  wrapFront:studio?.120:a.gender==='male'?.123:.117,
  neckFront:studio?.167:a.gender==='male'?.154:.171,bagFront:studio?.199:a.gender==='male'?.188:.151};
 // Palettes / expression edits do not reallocate accessory meshes.
 const key=JSON.stringify([a.gender,a.lookId,a.headwearId,a.eyewearId,a.earringId,a.neckwearId,a.backwearId,a.accessoryColorId]);
 if(applied.get(vrm)?.key===key)return;
 clearCharacterAccessories(vrm);
 const roots:Group[]=[];
 const color=accessoryColors.find(c=>c.id===a.accessoryColorId)?.tint??accessoryColors[0].tint;
 const fabric=new MeshStandardMaterial({color,roughness:.86});
 const gold=new MeshStandardMaterial({color:'#d7b779',metalness:.65,roughness:.3});
 const dark=new MeshStandardMaterial({color:'#303747',roughness:.6});
 const pink=new MeshStandardMaterial({color:'#e8a5b6',roughness:.85});
 // Normalized bones have consistent axes across VRM0, VRM1 and the female twist sample.
 // Correct the rest world rotation once; animation still carries each attached object.
 const anchor=(bone:VRMHumanBoneName)=>{
  const node=vrm.humanoid.getNormalizedBoneNode(bone);if(!node)return null;
  vrm.scene.updateMatrixWorld(true);
  const root=new Group();root.name=`CTRL accessory · ${bone}`;root.userData.ctrlAccessory=true;
  root.quaternion.copy(restCorrections.get(vrm)?.[bone]??new Quaternion());
  root.scale.setScalar(a.gender==='male'?1.08:1);
  node.add(root);roots.push(root);return root;
 };
 const mesh=(parent:Group,g:BufferGeometry,m:Material,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const o=new Mesh(g,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.frustumCulled=false;parent.add(o);return o;};
 const box=(p:Group,x:number,y:number,z:number,w:number,h:number,d:number,m:Material=fabric)=>mesh(p,new BoxGeometry(w,h,d),m,x,y,z);
 const ball=(p:Group,x:number,y:number,z:number,r:number,m:Material=fabric,sx=1,sy=1,sz=1)=>mesh(p,new SphereGeometry(r,16,10),m,x,y,z,sx,sy,sz);
 const ring=(p:Group,x:number,y:number,z:number,r:number,t=.006,m:Material=gold)=>mesh(p,new TorusGeometry(r,t,6,24),m,x,y,z);
 const cord=(p:Group,points:[number,number,number][],radius:number,m:Material,closed=false)=>mesh(p,new TubeGeometry(new CatmullRomCurve3(points.map(v=>new Vector3(...v)),closed),points.length===2?1:40,radius,6,closed),m);
 const head=(a.headwearId!=='none'||a.eyewearId!=='none'||a.earringId!=='none')?anchor('head'):null;
 if(head){
  const top=.205,front=.105;
  switch(a.headwearId){
   case 'beret':ball(head,.015,top+.025,0,.137,fabric,1,.40,.88);box(head,0,top+.083,0,.016,.025,.016);break;
   case 'beanie':ball(head,0,top-.015,0,.128,fabric,1,.75,.91);{const r=ring(head,0,top-.04,0,.115,.016,fabric);r.rotation.x=Math.PI/2;}ball(head,0,top+.095,0,.033);break;
   case 'cat':case 'bunny':{
    const band=ring(head,0,.10,0,.124,.009,fabric);band.scale.y=.88;
    for(const side of [-1,1]){
     if(a.headwearId==='cat'){const ear=mesh(head,new ConeGeometry(.048,.10,3),fabric,side*.088,top+.025,0);ear.rotation.z=-side*.2;const inner=mesh(head,new ConeGeometry(.029,.065,3),pink,side*.088,top+.027,.024);inner.rotation.z=-side*.2;}
     else{const ear=ball(head,side*.072,top+.10,0,.065,fabric,.48,1.9,.42);ear.rotation.z=-side*.16;const inner=ball(head,side*.072,top+.10,.022,.047,pink,.40,2,.15);inner.rotation.z=-side*.16;}
    }break;
   }
   case 'halo':{const r=ring(head,0,top+.10,0,.15,.009,gold);r.rotation.x=Math.PI/2;break;}
   case 'crown':{const r=ring(head,0,top,0,.10,.014,gold);r.rotation.x=Math.PI/2;for(let i=0;i<5;i++){const t=i/5*Math.PI*2;mesh(head,new ConeGeometry(.032,.075,4),gold,Math.sin(t)*.095,top+.04,Math.cos(t)*.095);ball(head,Math.sin(t)*.095,top+.08,Math.cos(t)*.095,.012,pink);}break;}
   case 'bow':{const r=ring(head,0,.11,0,.125,.008,fabric);r.scale.y=.85;for(const s of [-1,1]){const b=ball(head,s*.045,top+.018,.025,.045,fabric,1.2,.65,.35);b.rotation.z=s*.25;}ball(head,0,top+.018,.029,.018,gold);break;}
   case 'headphones':{const r=ring(head,0,.10,-.005,.142,.015,dark);for(const s of [-1,1]){ball(head,s*.135,.065,0,.050,dark,.42,1,.75);ball(head,s*.152,.065,0,.038,fabric,.25,1,.8);}r.scale.y=.95;break;}
  }
  if(a.eyewearId!=='none'){
   const y=.065,z=front+.015;
   for(const s of a.eyewearId==='monocle'?[1]:[-1,1]){
    if(a.eyewearId==='square'){box(head,s*.048,y+.028,z,.079,.006,.009,dark);box(head,s*.048,y-.028,z,.079,.006,.009,dark);for(const edge of [-1,1])box(head,s*.048+edge*.039,y,z,.006,.058,.009,dark);}
    else{ring(head,s*.048,y,z,.036,.004,a.eyewearId==='sun'?dark:gold);if(a.eyewearId==='sun')ball(head,s*.048,y,z,.034,dark,1,1,.12);}
    box(head,s*.095,y,.052,.007,.007,.14,dark);
   }
   if(a.eyewearId!=='monocle')box(head,0,y+.004,z,.028,.006,.008,gold);
   else{const chain=ring(head,.092,-.025,front,.040,.002,gold);chain.scale.x=.3;}
  }
  for(const s of [-1,1]){
   // Short visible post keeps jewelry connected to the ear while the ornament sits
   // just ahead of the hair curtain. Keep normal depth testing (no through-hair hack).
   if(a.earringId!=='none')cord(head,[[s*.112,-.012,.075],[s*fit.earX,-.017,fit.earZ]],.0025,gold);
   if(a.earringId==='hoops')ring(head,s*fit.earX,-.039,fit.earZ,.022,.0035,gold);
   if(a.earringId==='drops'){ball(head,s*fit.earX,-.018,fit.earZ,.006,gold);box(head,s*fit.earX,-.041,fit.earZ,.003,.042,.003,gold);mesh(head,new ConeGeometry(.014,.032,5),pink,s*fit.earX,-.075,fit.earZ);}
   if(a.earringId==='stars'){for(let i=0;i<3;i++){const star=box(head,s*fit.earX,-.026,fit.earZ,.030,.006,.008,gold);star.rotation.z=i*Math.PI/3;}}
  }
 }
 if(a.neckwearId!=='none'){
  const neck=anchor('neck');if(neck){
   if(a.neckwearId==='scarf'){
    const wrap=ring(neck,0,-.018,.025,.075,.029,fabric);wrap.rotation.x=Math.PI/2;wrap.scale.set(1.15,(fit.wrapFront-.025)/.104,1);
    // Fabric folds, a soft knot and two shaped tails, rather than a metallic collar
    // and rigid rectangular strip. Every part follows the selected fabric color.
    for(const y of [-.033,-.003]){const fold=ring(neck,0,y,.025,.078,.006,fabric);fold.rotation.x=Math.PI/2;fold.scale.set(1.15,1.28,1);}
    ball(neck,-.035,-.047,fit.wrapFront+.015,.037,fabric,1.15,.85,1);
    for(const [x,length,lean] of [[-.045,.20,-.018],[.005,.145,.022]]){
     const shape=new Shape();shape.moveTo(-.025,0);shape.quadraticCurveTo(-.035,-length*.55,lean-.025,-length);shape.lineTo(lean+.025,-length+.006);shape.quadraticCurveTo(.018,-length*.5,.025,0);shape.closePath();
     mesh(neck,new ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:2,steps:1,curveSegments:10}),fabric,x,-.05,fit.neckFront);
     for(let i=0;i<5;i++)box(neck,x+lean-.020+i*.010,-.05-length-.010,fit.neckFront+.005,.004,.025,.008);
    }
   }
   if(a.neckwearId==='bowtie'){for(const s of [-1,1])ball(neck,s*.029,-.025,.082,.03,fabric,1.3,.7,.4);ball(neck,0,-.025,.089,.013,gold);}
  }
 }
 if(a.backwearId!=='none'){
  const chest=anchor('chest');if(chest){
   if(a.backwearId==='backpack'){box(chest,0,.01,-.17,.23,.27,.12);box(chest,0,-.055,-.241,.16,.105,.04,dark);for(const s of [-1,1])box(chest,s*.095,.04,.09,.022,.28,.015,dark);box(chest,0,.12,-.24,.16,.016,.015,gold);}
   if(a.backwearId==='satchel'){
    const x=a.gender==='male'?.02:.105,y=-.30,z=fit.bagFront;
    // Front hip placement clears the relaxed/walking hand corridor at the side.
    // Strap runs from the opposite shoulder to this bag (the old diagonal missed it).
    box(chest,x,y,z,.155,.15,.065);
    box(chest,x,y+.037,z+.038,.163,.070,.018);
    box(chest,x,y+.011,z+.052,.022,.025,.009,gold);
    cord(chest,[[-.12,.17,.065],[-.10,.075,fit.neckFront],[-.015,-.10,z-.015],[x,-.23,z+.013]],.010,dark);
    cord(chest,[[x-.073,y+.065,z],[x-.089,y+.10,z-.01],[x-.10,y+.16,z-.025]],.007,dark);
   }
   if(a.backwearId==='wings'){const wingMaterial=new MeshStandardMaterial({color,roughness:.55,metalness:.15,side:DoubleSide});for(const s of [-1,1])for(const [y,size] of [[.18,.23],[-.06,.15]]){const wing=ball(chest,s*(size*.75),y,-.17,size,wingMaterial,.70,1,.10);wing.rotation.z=-s*.55;}}
  }
 }
 // Dispose materials unused by the selected loadout (they are not in the scene traversal).
 const used=new Set<Material>();roots.forEach(r=>r.traverse(o=>{if(o instanceof Mesh)used.add(o.material as Material);}));
 for(const m of [fabric,gold,dark,pink])if(!used.has(m))m.dispose();
 applied.set(vrm,{key,roots});
 vrm.scene.userData.ctrlAccessoryCount=roots.reduce((n,r)=>{r.traverse(o=>{if(o instanceof Mesh)n++;});return n;},0);
}

/** Existing VRM0 joy/fun/sorrow are mapped by three-vrm to VRM1 presets. */
export function applyCharacterExpression(vrm:VRM,appearance:CharacterAppearance){
 const manager=vrm.expressionManager;if(!manager)return;
 for(const id of ['neutral','happy','relaxed','angry','sad'])manager.setValue(id,0);
 const id=appearance.expressionId??'neutral';
 if(id!=='neutral'&&manager.getExpression(id))manager.setValue(id,id==='happy'?.55:id==='angry'?.45:.65);
 vrm.scene.userData.ctrlExpression=id;
}
