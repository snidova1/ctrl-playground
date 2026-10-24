'use client';
import {houseCutawayEnabled,HOUSE_CEILING_Y,HOUSE_CEILING_THICKNESS} from './house-camera';
import {ENTRY_ART,createDoorMotion,stepDoorMotion} from './entry-art';
import {HouseArtMaterials,useHouseSurfaces,type HouseSurface} from './house-art-materials';

import {useEffect,useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {RoundedBox} from '@react-three/drei';
import {BufferGeometry,Color,DoubleSide,Float32BufferAttribute,MathUtils,type Group} from 'three';
import type {Pose} from '@/features/plaza/types';
import type {WorldObject,WorldState} from './types';
import {
 getHouseAnchor,getHouseConfig,getHouseEdges,getHouseOpenings,getHouseWallSegments,
 HOUSE_ORIGIN,HOUSE_CELL_SIZE,HOUSE_WALL_HEIGHT,HOUSE_WALL_THICKNESS,
 HOUSE_DOOR_WIDTH,HOUSE_DOOR_HEIGHT,HOUSE_DOOR_THICKNESS,
 HOUSE_WINDOW_WIDTH,HOUSE_WINDOW_SILL,HOUSE_WINDOW_HEIGHT,
 type HouseConfig,type HouseEdge,
} from './modular-house';

type Point=[number,number,number];
type Finish='plaster'|'timber';
type Quality='low'|'high';
type Props={objects:WorldObject[];states:WorldState['states'];pose:MutableRefObject<Pose>;editing:boolean;previewRoof?:boolean;quality:Quality;onUse:(object:WorldObject)=>void};

const TRIM='#866449',FRAME='#f0dfbf',BRASS='#c8a25d';
const FLOOR_Y=.02;

/** Small bevels catch daylight without a texture download or a high-poly asset. */
function Block({at=[0,0,0],size,color,radius=.025,surface='cedar'}:{at?:Point;size:Point;color:string;radius?:number;surface?:HouseSurface}){
 const maps=useHouseSurfaces();
 return <RoundedBox position={at} args={size} radius={Math.min(radius,...size.map(v=>v/3))} smoothness={2} bevelSegments={1} castShadow receiveShadow>
  <meshStandardMaterial color={color} map={maps[surface]} roughness={surface==='plaster'?ENTRY_ART.plasterRoughness:.88}/>
 </RoundedBox>;
}

function OpeningFrame({width,bottom,height,depth}:{width:number;bottom:number;height:number;depth:number}){
 return <group userData={{kind:'opening-frame'}}>
  {[-1,1].map(side=><Block key={side} at={[side*(width/2+.045),bottom+height/2,0]} size={[.09,height+.1,depth+.1]} color={FRAME}/>)}
  <Block at={[0,bottom+height+.045,0]} size={[width+.22,.09,depth+.1]} color={FRAME}/>
 </group>;
}

function DoorLeaf({object,active,width,height,onUse}:{object:WorldObject;active:boolean;width:number;height:number;onUse:Props['onUse']}){
 const hinge=useRef<Group>(null),frontLever=useRef<Group>(null),backLever=useRef<Group>(null),motion=useRef(createDoorMotion(active));
 useFrame((_,dt)=>{motion.current=stepDoorMotion(motion.current,active,dt);if(hinge.current)hinge.current.rotation.y=motion.current.angle;for(const ref of [frontLever,backLever])if(ref.current)ref.current.rotation.z=motion.current.lever;});
 const click=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();if(event.delta<=4)onUse(object);};
 return <group ref={hinge} position={[-width/2,0,0]} rotation-y={motion.current.angle} onClick={click} userData={{kind:'house-door',objectId:object.id,hinge:'local-left',openAngle:-Math.PI/2}}>
  <Block at={[width/2,height/2,0]} size={[width,height,HOUSE_DOOR_THICKNESS]} color={ENTRY_ART.door} radius={.025} surface='paint'/>
  {[.55,1.55].map(y=><group key={y}>
   {[-1,1].map(side=><group key={side}>
    <Block at={[width/2,y,side*.055]} size={[width-.23,.74,.022]} color={ENTRY_ART.doorInset} radius={.02} surface='paint'/>
    <Block at={[width/2,y,side*.071]} size={[width-.34,.62,.025]} color={ENTRY_ART.doorEdge} radius={.025} surface='paint'/>
    <Block at={[width/2,y,side*.084]} size={[width-.43,.53,.012]} color={ENTRY_ART.door} radius={.014} surface='paint'/>
   </group>)}
  </group>)}
  {[-1,1].map(side=><group key={side} position={[width-.17,1.04,side*.08]}>
   <mesh rotation-x={Math.PI/2}><cylinderGeometry args={[.048,.048,.018,12]}/><meshStandardMaterial color={BRASS} metalness={.55} roughness={.38}/></mesh>
   <group ref={side===1?frontLever:backLever} position-z={side*.03}>
    <Block at={[-.048,0,0]} size={[.16,.035,.032]} color={ENTRY_ART.brass} radius={.012}/>
    <mesh><sphereGeometry args={[.025,10,6]}/><meshStandardMaterial color={BRASS} metalness={.55} roughness={.38}/></mesh>
   </group>
  </group>)}
  {[.38,1.79].map(y=><Block key={y} at={[.035,y,-.055]} size={[.08,.14,.045]} color={BRASS} radius={.012}/>)}
 </group>;
}

function WindowLeaf({object,active,width,bottom,height,onUse}:{object:WorldObject;active:boolean;width:number;bottom:number;height:number;onUse:Props['onUse']}){
 const left=useRef<Group>(null),right=useRef<Group>(null);
 useFrame((_,dt)=>{
  const t=Math.min(dt,.1);
  if(left.current)left.current.rotation.y=MathUtils.damp(left.current.rotation.y,active?-Math.PI*.43:0,10,t);
  if(right.current)right.current.rotation.y=MathUtils.damp(right.current.rotation.y,active?Math.PI*.43:0,10,t);
 });
 const click=(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();if(event.delta<=4)onUse(object);};
 return <group onClick={click} userData={{kind:'house-window',objectId:object.id}}>
  {([-1,1] as const).map(side=><group key={side} ref={side===-1?left:right} position={[side*width/2,bottom,0]} rotation-y={0}>
   <group position={[-side*width/4,height/2,0]}>
    <mesh><boxGeometry args={[width/2-.06,height-.08,.025]}/><meshStandardMaterial color='#a9ced0' transparent opacity={.32} roughness={.16} metalness={.08} depthWrite={false} side={DoubleSide}/></mesh>
    {[-1,1].map(s=><group key={s}>
     <Block at={[s*(width/4-.025),0,0]} size={[.05,height,.07]} color={FRAME} radius={.008}/>
     <Block at={[0,s*(height/2-.025),0]} size={[width/2,.05,.07]} color={FRAME} radius={.008}/>
    </group>)}
    <Block size={[width/2,.035,.055]} color={FRAME} radius={.008}/>
    <Block at={[side*(width/4-.075),-.08,.06]} size={[.035,.1,.045]} color={BRASS} radius={.008}/>
   </group>
  </group>)}
  <Block at={[0,bottom-.055,.065]} size={[width+.34,.11,.42]} color={FRAME} radius={.03}/>
 </group>;
}

function WallPieces({width,height,depth,color,finish,opening}:{width:number;height:number;depth:number;color:string;finish:Finish;opening?:{width:number;bottom:number;height:number}}){
 const maps=useHouseSurfaces();
 const pieces:{at:Point;size:Point}[]=opening?[
  {at:[-(width+opening.width)/4,height/2,0],size:[(width-opening.width)/2,height,depth]},
  {at:[(width+opening.width)/4,height/2,0],size:[(width-opening.width)/2,height,depth]},
  {at:[0,(height+opening.bottom+opening.height)/2,0],size:[opening.width,height-opening.bottom-opening.height,depth]},
  ...(opening.bottom>0?[{at:[0,opening.bottom/2,0] as Point,size:[opening.width,opening.bottom,depth] as Point}]:[]),
 ]:[{at:[0,height/2,0],size:[width,height,depth]}];
 return <group>
  {pieces.filter(p=>p.size.every(v=>v>.001)).map((p,i)=><Block key={i} {...p} color={color} radius={finish==='plaster'?.025:.012} surface={finish==='plaster'?'plaster':'cedar'}/>)}
  {pieces.filter(p=>p.at[1]-p.size[1]/2<.01&&p.size.every(v=>v>.001)).map((p,i)=><group key={`foot-${i}`}>
   <Block at={[p.at[0],.115,0]} size={[p.size[0],.23,depth+.045]} color={ENTRY_ART.limestone} surface='stone' radius={.015}/>
   <mesh position={[p.at[0],.007,0]} rotation-x={-Math.PI/2}>
    <planeGeometry args={[p.size[0]+.05,.55]}/><meshBasicMaterial color='#3e3b2b' map={maps.contact} transparent opacity={.33} depthWrite={false} polygonOffset polygonOffsetFactor={-1}/>
   </mesh>
  </group>)}
  {[-1,1].map(side=><Block key={side} at={[side*(width/2-.055),height/2,0]} size={[.11,height+.02,depth+.07]} color={TRIM} radius={.015}/>)}
  <Block at={[0,height-.055,0]} size={[width,.11,depth+.075]} color={TRIM}/>
  {finish==='timber'&&[-1,1].map(side=><group key={side}>
   {[.47,.94,1.41,1.88,2.35].filter(y=>y<height-.15).map(y=>{
    // Boards are confined to the actual wall pieces, never across the aperture.
    const spans=opening&&y>opening.bottom&&y<opening.bottom+opening.height?[
     {x:-(width+opening.width)/4,w:(width-opening.width)/2},
     {x:(width+opening.width)/4,w:(width-opening.width)/2},
    ]:[{x:0,w:width}];
    return spans.map((span,i)=><Block key={`${y}-${i}`} at={[span.x,y,side*(depth/2+.006)]} size={[span.w,.015,.012]} color={TRIM} radius={.002}/>);
   })}
  </group>)}
 </group>;
}

function FloorCell({x,z,size,color,finish,quality}:{x:number;z:number;size:number;color:string;finish:'wood'|'tile';quality:Quality}){
 const shades=useMemo(()=>[-.045,-.015,.025,.045].map(v=>`#${new Color(color).offsetHSL(0,0,v).getHexString()}`),[color]);
 const count=finish==='wood'?6:4;
 return <group position={[x,0,z]} userData={{kind:'house-floor',surfaceY:FLOOR_Y}}>
  <mesh position-y={FLOOR_Y-.025} receiveShadow><boxGeometry args={[size,.05,size]}/><meshStandardMaterial color={color} roughness={.9}/></mesh>
  {Array.from({length:finish==='wood'?count:count*count},(_,i)=>{
   const a=i%count,b=finish==='wood'?0:Math.floor(i/count),w=size/count,d=finish==='wood'?size:size/count;
   return <mesh key={i} position={[-size/2+w*(a+.5),FLOOR_Y+.001,finish==='wood'?0:-size/2+d*(b+.5)]} rotation-x={-Math.PI/2} receiveShadow>
    <planeGeometry args={[w-.012,d-.012]}/><meshStandardMaterial color={shades[(a+b)%shades.length]} roughness={finish==='wood'?.83:.65}/>
   </mesh>;
  })}
  {quality==='high'&&finish==='wood'&&Array.from({length:6},(_,i)=><mesh key={`joint-${i}`} position={[-size/2+size/count*(i+.5),FLOOR_Y+.002,(i%3-1)*size/3]} rotation-x={-Math.PI/2}>
   <planeGeometry args={[size/count-.014,.009]}/><meshStandardMaterial color={TRIM} roughness={1}/>
  </mesh>)}
 </group>;
}

/** Closed thin prisms: roof underside and edges remain correct from the garden. */
function useRoofGeometry(cells:readonly {x:number;z:number}[],size:number,height:number,gable:boolean){
 const geometry=useMemo(()=>{
  const result=new BufferGeometry(),vertices:number[]=[];
  const minX=Math.min(...cells.map(c=>c.x))*size-size/2,maxX=Math.max(...cells.map(c=>c.x))*size+size/2;
  const ridge=(minX+maxX)/2,pitch=gable?.38:0;
  const roofY=(x:number)=>height+.23+(gable?(maxX-minX)/2*pitch-Math.abs(x-ridge)*pitch:0);
  const has=(x:number,z:number)=>cells.some(c=>c.x===x&&c.z===z);
  const quad=(a:Point,b:Point,c:Point,d:Point)=>vertices.push(...a,...b,...c,...a,...c,...d);
  for(const cell of cells){
   const x0=(cell.x-.5)*size-(has(cell.x-1,cell.z)?0:.19),x1=(cell.x+.5)*size+(has(cell.x+1,cell.z)?0:.19);
   const z0=(cell.z-.5)*size-(has(cell.x,cell.z-1)?0:.19),z1=(cell.z+.5)*size+(has(cell.x,cell.z+1)?0:.19);
   const cuts=x0<ridge&&x1>ridge?[x0,ridge,x1]:[x0,x1];
   for(let i=0;i<cuts.length-1;i++){
    const a=cuts[i],b=cuts[i+1],ya=roofY(a),yb=roofY(b);
    quad([a,ya,z0],[a,ya,z1],[b,yb,z1],[b,yb,z0]);
    quad([a,ya-.1,z1],[a,ya-.1,z0],[b,yb-.1,z0],[b,yb-.1,z1]);
    quad([a,ya,z1],[a,ya,z0],[a,ya-.1,z0],[a,ya-.1,z1]);
    quad([b,yb,z0],[b,yb,z1],[b,yb-.1,z1],[b,yb-.1,z0]);
    quad([a,ya,z0],[b,yb,z0],[b,yb-.1,z0],[a,ya-.1,z0]);
    quad([b,yb,z1],[a,ya,z1],[a,ya-.1,z1],[b,yb-.1,z1]);
   }
  }
  result.setAttribute('position',new Float32BufferAttribute(vertices,3));result.setAttribute('uv',new Float32BufferAttribute(vertices.flatMap((v,i)=>i%3===0?[v/1.4,vertices[i+2]/1.4]:[]),2));result.computeVertexNormals();return result;
 },[cells,size,height,gable]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return geometry;
}

function RoofEdge({edge,config}:{edge:HouseEdge;config:HouseConfig}){
 const maps=useHouseSurfaces();
 const {geometry,spans}=useMemo(()=>{
  const xs=config.cells.map(c=>c.x*HOUSE_CELL_SIZE),lo=Math.min(...xs)-HOUSE_CELL_SIZE/2,hi=Math.max(...xs)+HOUSE_CELL_SIZE/2;
  const ridge=HOUSE_ORIGIN.x+(lo+hi)/2,cos=Math.cos(edge.rotation),half=edge.width/2;
  const roofY=(t:number)=>HOUSE_WALL_HEIGHT+.23+(config.roofStyle==='gable'?(hi-lo)*.19-Math.abs(edge.x+cos*t-ridge)*.38:0);
  const peak=Math.abs(cos)>.5?(ridge-edge.x)/cos:Infinity;
  const cuts=peak>-half&&peak<half?[-half,peak,half]:[-half,half];
  const vertices:number[]=[],spans:{a:number;b:number;ya:number;yb:number}[]=[];
  for(let i=0;i<cuts.length-1;i++){
   const a=cuts[i],b=cuts[i+1],ya=roofY(a)-.1,yb=roofY(b)-.1;
   vertices.push(a,HOUSE_WALL_HEIGHT,0,b,HOUSE_WALL_HEIGHT,0,b,yb,0,a,HOUSE_WALL_HEIGHT,0,b,yb,0,a,ya,0);
   spans.push({a,b,ya:ya+.055,yb:yb+.055});
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new Float32BufferAttribute(vertices.flatMap((v,i)=>i%3===0?[v/1.05,vertices[i+1]/2.8]:[]),2));geometry.computeVertexNormals();
  return {geometry,spans};
 },[edge,config]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group position={[edge.x,0,edge.z]} rotation-y={edge.rotation}>
  <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={config.wallFinish==='plaster'?config.roofColor:config.wallColor} map={maps.cedar} roughness={.94} side={DoubleSide}/></mesh>
  {spans.map(({a,b,ya,yb},i)=><group key={i} position={[(a+b)/2,(ya+yb)/2,.11]} rotation-z={Math.atan2(yb-ya,b-a)}>
   <Block size={[Math.hypot(b-a,yb-ya)+.025,.12,.23]} color={FRAME} radius={.018}/>
  </group>)}
 </group>;
}

/** Fine roof courses follow the same global pitch, including across connected cell seams. */
function RoofCourses({config}:{config:HouseConfig}){
 const lo=Math.min(...config.cells.map(c=>c.x))*HOUSE_CELL_SIZE-HOUSE_CELL_SIZE/2;
 const hi=Math.max(...config.cells.map(c=>c.x))*HOUSE_CELL_SIZE+HOUSE_CELL_SIZE/2,ridge=(lo+hi)/2;
 const color=useMemo(()=>`#${new Color(config.roofColor).offsetHSL(0,-.02,.045).getHexString()}`,[config.roofColor]);
 return <group position={[HOUSE_ORIGIN.x,0,HOUSE_ORIGIN.z]}>
  {config.cells.flatMap(cell=>Array.from({length:6},(_,i)=>{
   const x=cell.x*HOUSE_CELL_SIZE+(i-2.5)*HOUSE_CELL_SIZE/6;
   const y=HOUSE_WALL_HEIGHT+.23+(config.roofStyle==='gable'?(hi-lo)*.19-Math.abs(x-ridge)*.38:0);
   return <mesh key={`${cell.x},${cell.z},${i}`} position={[x,y+.012,cell.z*HOUSE_CELL_SIZE]} receiveShadow>
    <boxGeometry args={[.024,.022,HOUSE_CELL_SIZE]}/><meshStandardMaterial color={color} roughness={.92}/>
   </mesh>;
  }))}
 </group>;
}

/** The model owns transforms and apertures; this component only projects its saved state. */
export default function ModularHouseScene({objects,states,editing,previewRoof=false,quality,onUse}:Props){
 return <HouseArtMaterials><HouseModel objects={objects} states={states} editing={editing} previewRoof={previewRoof} quality={quality} onUse={onUse}/></HouseArtMaterials>;
}
function HouseModel({objects,states,editing,previewRoof=false,quality,onUse}:Omit<Props,'pose'>){
 const maps=useHouseSurfaces();
 const {config,edges,openings,anchor}=useMemo(()=>({
  config:getHouseConfig(objects),edges:getHouseEdges(getHouseConfig(objects)),
  openings:new Map(getHouseOpenings(objects).map(opening=>[opening.edgeId,opening])),anchor:getHouseAnchor(objects),
 }),[objects]);
 const shell=useRef<Group>(null),roof=useRef<Group>(null),lowWalls=useRef<Group>(null),leaves=useRef<Group>(null);
 const roofGeometry=useRoofGeometry(config.cells,HOUSE_CELL_SIZE,HOUSE_WALL_HEIGHT,config.roofStyle==='gable');
 useFrame(()=>{
  const cutaway=houseCutawayEnabled(editing,previewRoof);
  if(shell.current)shell.current.visible=!cutaway;
  if(roof.current)roof.current.visible=!cutaway;
  if(lowWalls.current)lowWalls.current.visible=cutaway;
  if(leaves.current)leaves.current.visible=!editing||previewRoof;
 });
 const handleOpeningClick=(event:ThreeEvent<MouseEvent>,object:WorldObject)=>{event.stopPropagation();if(event.delta<=4)onUse(object);};
 return <group name='modular-house' userData={{kind:'modular-house',version:1,anchorId:anchor?.id??null,fallback:!anchor,floorY:FLOOR_Y,cellSize:HOUSE_CELL_SIZE}}>
  <group position={[HOUSE_ORIGIN.x,0,HOUSE_ORIGIN.z]}>
   {config.cells.map(cell=><FloorCell key={`${cell.x},${cell.z}`} x={cell.x*HOUSE_CELL_SIZE} z={cell.z*HOUSE_CELL_SIZE} size={HOUSE_CELL_SIZE} color={config.floorColor} finish={config.floorFinish} quality={quality}/>)}
  </group>
  <group ref={shell} visible={!houseCutawayEnabled(editing,previewRoof)} userData={{kind:'house-wall-shell'}}>
   {edges.map(edge=>{
    const opening=openings.get(edge.id),isDoor=opening?.kind==='door';
    const aperture=opening?{width:isDoor?HOUSE_DOOR_WIDTH:HOUSE_WINDOW_WIDTH,bottom:isDoor?0:HOUSE_WINDOW_SILL,height:isDoor?HOUSE_DOOR_HEIGHT:HOUSE_WINDOW_HEIGHT}:undefined;
    return <group key={edge.id} position={[edge.x,0,edge.z]} rotation-y={edge.rotation} userData={{kind:'house-wall',edgeId:edge.id,opening:opening?.kind??'wall'}}>
     <WallPieces width={edge.width} height={HOUSE_WALL_HEIGHT} depth={HOUSE_WALL_THICKNESS} color={config.wallColor} finish={config.wallFinish} opening={aperture}/>
     {aperture&&<OpeningFrame {...aperture} depth={HOUSE_WALL_THICKNESS}/>}
    </group>;
   })}
  </group>
  <group ref={lowWalls} visible={houseCutawayEnabled(editing,previewRoof)} userData={{kind:'house-cutaway-walls'}}>
   {edges.flatMap(edge=>getHouseWallSegments(edge,openings.get(edge.id)?.kind).flatMap((box,i)=>{
    const bottom=box.y-box.height/2,h=Math.min(.22,bottom+box.height)-bottom;
    return h>.001?[<group key={`${edge.id}-${i}`} position={[box.x,bottom+h/2,box.z]} rotation-y={box.rotation}>
     <Block size={[box.width,h,box.depth]} color={config.wallColor} radius={.015}/>
    </group>]:[];
   }))}
  </group>
  <group ref={leaves} visible={!editing}>
   {edges.map(edge=>{
    const opening=openings.get(edge.id),object=opening?.object;
    // The fallback arch intentionally has neither a leaf nor an invented object ID.
    if(!opening||!object)return null;
    return <group key={object.id} position={[edge.x,0,edge.z]} rotation-y={edge.rotation} userData={{edgeId:edge.id}}>
     {opening.kind==='door'?<DoorLeaf object={object} active={!!states[object.id]?.active} width={HOUSE_DOOR_WIDTH} height={HOUSE_DOOR_HEIGHT} onUse={onUse}/>
      :<WindowLeaf object={object} active={!!states[object.id]?.active} width={HOUSE_WINDOW_WIDTH} bottom={HOUSE_WINDOW_SILL} height={HOUSE_WINDOW_HEIGHT} onUse={onUse}/>}
    </group>;
   })}
  </group>
  {editing&&edges.map(edge=>{
   const opening=openings.get(edge.id),object=opening?.object;if(!opening||!object)return null;
   return <mesh key={object.id} position={[edge.x,.04,edge.z]} rotation-y={edge.rotation} onClick={event=>handleOpeningClick(event,object)} userData={{kind:'house-opening-plan',objectId:object.id,edgeId:edge.id}}>
    <boxGeometry args={[opening.kind==='door'?HOUSE_DOOR_WIDTH:HOUSE_WINDOW_WIDTH,.035,HOUSE_WALL_THICKNESS+.08]}/><meshStandardMaterial color={opening.kind==='door'?'#caa675':'#8eb9bc'} roughness={.9}/>
   </mesh>;
  })}
  <group ref={roof} visible={!houseCutawayEnabled(editing,previewRoof)} userData={{kind:'house-roof',style:config.roofStyle}}>
   <mesh position={[HOUSE_ORIGIN.x,0,HOUSE_ORIGIN.z]} geometry={roofGeometry} castShadow receiveShadow><meshStandardMaterial color={config.roofColor} map={maps.roof} roughness={.9}/></mesh>
   {config.cells.map(cell=><mesh key={`ceiling-${cell.x},${cell.z}`} position={[HOUSE_ORIGIN.x+cell.x*HOUSE_CELL_SIZE,HOUSE_CEILING_Y,HOUSE_ORIGIN.z+cell.z*HOUSE_CELL_SIZE]} receiveShadow userData={{kind:'house-ceiling'}}><boxGeometry args={[HOUSE_CELL_SIZE,HOUSE_CEILING_THICKNESS,HOUSE_CELL_SIZE]}/><meshStandardMaterial color={config.wallColor} roughness={.95}/></mesh>)}
   {quality==='high'&&<RoofCourses config={config}/>}
   {edges.map(edge=><RoofEdge key={edge.id} edge={edge} config={config}/>)}
  </group>
 </group>;
}
