'use client';
import {Component,Suspense,useMemo,useRef,type ReactNode} from 'react';
import {Canvas,useFrame,type ThreeEvent} from '@react-three/fiber';
import {Grid,OrbitControls,TransformControls,useGLTF} from '@react-three/drei';
import {Group} from 'three';
import type {BuildAsset} from '../build-assets';
import {EDITOR_LIMITS,type EditorObject,type EditorTool,type Vec3} from './model';
import type {PreviewState} from './preview';

interface SceneProps {
  objects:EditorObject[];
  assetIndex:ReadonlyMap<string,BuildAsset>;
  selectedId:string|null;
  placingAsset:BuildAsset|null;
  tool:EditorTool;
  snap:boolean;
  preview:boolean;
  previewState:PreviewState;
  onActivate:(id:string)=>void;
  onSelect:(id:string|null)=>void;
  onPlace:(position:Vec3)=>void;
  onTransform:(id:string,transform:{position:Vec3;rotationY:number;scale:number})=>void;
}
class ModelBoundary extends Component<{children:ReactNode;label:string},{error:boolean}>{
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  render(){
    return this.state.error?
      <mesh position={[0,.4,0]}><boxGeometry args={[.8,.8,.8]}/><meshStandardMaterial color='#bf6655' wireframe/></mesh>:
      this.props.children;
  }
}
function GLBAssetModel({asset}:{asset:BuildAsset}){
  const gltf=useGLTF(asset.url);
  const instance=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
  return <group position={[-asset.center[0],asset.groundOffset,-asset.center[2]]}>
    <primitive object={instance}/>
  </group>;
}
function ProceduralAssetModel({asset}:{asset:BuildAsset}){
  const id=asset.id;
  const color=id==='ctrl-lamp'?'#f8c86b':id==='ctrl-portal'?'#8cbacb':id==='ctrl-marker'?'#ddba56':'#d49f76';
  if(id==='ctrl-portal')return <mesh position={[0,1,0]}><torusGeometry args={[.8,.11,10,40]}/><meshStandardMaterial color={color}/></mesh>;
  if(id==='ctrl-lamp')return <group><mesh position={[0,.7,0]}><cylinderGeometry args={[.08,.18,1.4,14]}/><meshStandardMaterial color='#7b8a74'/></mesh><mesh position={[0,1.45,0]}><sphereGeometry args={[.38,16,16]}/><meshStandardMaterial color={color}/></mesh></group>;
  if(id==='ctrl-seat')return <group><mesh position={[0,.45,0]}><boxGeometry args={[1.1,.15,.7]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0,.75,-.32]}><boxGeometry args={[1.1,.65,.12]}/><meshStandardMaterial color={color}/></mesh></group>;
  if(id==='ctrl-marker')return <mesh position={[0,.55,0]}><coneGeometry args={[.45,1.1,5]}/><meshStandardMaterial color={color}/></mesh>;
  if(id==='ctrl-switch')return <mesh position={[0,.45,0]}><cylinderGeometry args={[.35,.35,.9,12]}/><meshStandardMaterial color={color}/></mesh>;
  return <mesh position={[0,id==='ctrl-door'?1:.5,0]}><boxGeometry args={id==='ctrl-door'?[1,2,.15]:[1,1,1]}/><meshStandardMaterial color={color}/></mesh>;
}
function AssetModel({asset}:{asset:BuildAsset}){
  return asset.url?<GLBAssetModel asset={asset}/>:<ProceduralAssetModel asset={asset}/>;
}
function EditorItem({item,asset,selected,tool,snap,preview,active,reached,onActivate,onSelect,onTransform}:{
  item:EditorObject;asset:BuildAsset;selected:boolean;tool:EditorTool;snap:boolean;
  preview:boolean;active:boolean;reached:boolean;
  onActivate:(id:string)=>void;onSelect:(id:string)=>void;
  onTransform:SceneProps['onTransform'];
}){
  const group=useRef<Group>(null);
  const behaviorGroup=useRef<Group>(null);
  useFrame((_,delta)=>{
    const node=behaviorGroup.current;
    if(!node)return;
    if(preview&&active&&item.behavior==='spin')node.rotation.y+=Math.min(delta,.05)*1.7;
    else node.rotation.y+=((preview&&active&&item.behavior==='open-close'?Math.PI/2:0)-node.rotation.y)*Math.min(1,delta*8);
  });
  const commit=()=>{
    const node=group.current;
    if(!node)return;
    onTransform(item.id,{
      position:[Math.max(EDITOR_LIMITS.minX,Math.min(EDITOR_LIMITS.maxX,node.position.x)),Math.max(0,Math.min(EDITOR_LIMITS.maxHeight,node.position.y)),Math.max(EDITOR_LIMITS.minZ,Math.min(EDITOR_LIMITS.maxZ,node.position.z))],
      rotationY:node.rotation.y,
      scale:Math.max(EDITOR_LIMITS.minScale,Math.min(EDITOR_LIMITS.maxScale,node.scale.x)),
    });
  };
  const object=<group ref={group} position={item.position} rotation={[0,item.rotationY,0]} scale={item.scale}
    onClick={(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();if(preview)onActivate(item.id);else onSelect(item.id);}}>
    <group ref={behaviorGroup}>
    <ModelBoundary label={asset.name}>
      <Suspense fallback={<mesh position={[0,.4,0]}><boxGeometry args={[.8,.8,.8]}/><meshStandardMaterial color='#b0aba2' wireframe/></mesh>}>
        <AssetModel asset={asset}/>
      </Suspense>
    </ModelBoundary>
    {preview&&active&&item.behavior==='toggle-light'&&<pointLight position={[0,1.7,0]} color='#ffd887' intensity={5} distance={6}/>}
    </group>
    {preview&&reached&&item.behavior==='checkpoint'&&<mesh position={[0,.08,0]} rotation-x={-Math.PI/2}><ringGeometry args={[.63,.72,42]}/><meshBasicMaterial color='#4cbf78' depthTest={false}/></mesh>}
    {selected&&<mesh position={[0,.02,0]} rotation-x={-Math.PI/2}>
      <ringGeometry args={[.48,.54,48]}/><meshBasicMaterial color='#ef5f30' depthTest={false}/>
    </mesh>}
  </group>;
  return selected&&!preview?<TransformControls mode={tool==='translate'?'translate':tool}
    translationSnap={snap?.5:undefined}
    rotationSnap={snap?Math.PI/12:undefined}
    scaleSnap={snap?.1:undefined}
    showY={tool!=='rotate'}
    onMouseUp={commit}>{object}</TransformControls>:object;
}
export default function EditorScene(props:SceneProps){
  const {objects,assetIndex,selectedId,placingAsset,tool,snap,preview,previewState,onActivate,onSelect,onPlace,onTransform}=props;
  return <Canvas shadows dpr={[1,1.5]} camera={{position:[9,11,14],fov:47,near:.1,far:160}}
    gl={{antialias:true,alpha:false}} onCreated={({gl})=>{gl.domElement.setAttribute('aria-label','3D editor. Click a model to select; choose an asset and click the ground to place it.');}}>
    <color attach='background' args={['#dee7df']}/>
    <ambientLight intensity={1.4}/>
    <hemisphereLight args={['#fbf5e8','#9eb4a8',1.2]}/>
    <directionalLight position={[8,18,9]} castShadow intensity={2.4} shadow-mapSize={[1024,1024]}/>
    <Grid position={[0,-.01,0]} args={[48,48]} sectionSize={2} cellSize={.5} infiniteGrid={false}
      cellColor='#a2bcb1' sectionColor='#729c8c' fadeDistance={65} fadeStrength={1}/>
    <mesh rotation-x={-Math.PI/2} onClick={e=>{
      e.stopPropagation();
      if(preview)return;
      if(placingAsset){
        const x=snap?Math.round(e.point.x*2)/2:e.point.x;
        const z=snap?Math.round(e.point.z*2)/2:e.point.z;
        onPlace([Math.max(EDITOR_LIMITS.minX,Math.min(EDITOR_LIMITS.maxX,x)),0,Math.max(EDITOR_LIMITS.minZ,Math.min(EDITOR_LIMITS.maxZ,z))]);
      }else onSelect(null);
    }}>
      <planeGeometry args={[48,48]}/>
      <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    {objects.map(item=>{
      const asset=assetIndex.get(item.assetId);
      if(!asset)return null;
      return <EditorItem key={item.id} item={item} asset={asset} selected={selectedId===item.id}
        tool={tool} snap={snap} preview={preview} active={!!previewState.active[item.id]} reached={previewState.checkpoints.includes(item.id)} onActivate={onActivate} onSelect={onSelect} onTransform={onTransform}/>;
    })}
    <OrbitControls makeDefault minDistance={2.5} maxDistance={65} maxPolarAngle={Math.PI/2.02}
      enableDamping dampingFactor={.12} target={[0,1,0]}/>
  </Canvas>;
}