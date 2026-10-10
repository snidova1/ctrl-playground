'use client';
import {Component,Suspense,useMemo,useRef,type ReactNode} from 'react';
import {Canvas,type ThreeEvent} from '@react-three/fiber';
import {Grid,OrbitControls,TransformControls,useGLTF} from '@react-three/drei';
import {Group} from 'three';
import type {BuildAsset} from '../build-assets';
import type {EditorObject,EditorTool,Vec3} from './model';

interface SceneProps {
  objects:EditorObject[];
  assetIndex:ReadonlyMap<string,BuildAsset>;
  selectedId:string|null;
  placingAsset:BuildAsset|null;
  tool:EditorTool;
  snap:boolean;
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
function AssetModel({asset}:{asset:BuildAsset}){
  const gltf=useGLTF(asset.url);
  const instance=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
  return <group position={[-asset.center[0],asset.groundOffset,-asset.center[2]]}>
    <primitive object={instance}/>
  </group>;
}
function EditorItem({item,asset,selected,tool,snap,onSelect,onTransform}:{
  item:EditorObject;asset:BuildAsset;selected:boolean;tool:EditorTool;snap:boolean;
  onSelect:(id:string)=>void;
  onTransform:SceneProps['onTransform'];
}){
  const group=useRef<Group>(null);
  const commit=()=>{
    const node=group.current;
    if(!node)return;
    onTransform(item.id,{
      position:[node.position.x,node.position.y,node.position.z],
      rotationY:node.rotation.y,
      scale:node.scale.x,
    });
  };
  const object=<group ref={group} position={item.position} rotation={[0,item.rotationY,0]} scale={item.scale}
    onClick={(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();onSelect(item.id);}}>
    <ModelBoundary label={asset.name}>
      <Suspense fallback={<mesh position={[0,.4,0]}><boxGeometry args={[.8,.8,.8]}/><meshStandardMaterial color='#b0aba2' wireframe/></mesh>}>
        <AssetModel asset={asset}/>
      </Suspense>
    </ModelBoundary>
    {selected&&<mesh position={[0,.02,0]} rotation-x={-Math.PI/2}>
      <ringGeometry args={[.48,.54,48]}/><meshBasicMaterial color='#ef5f30' depthTest={false}/>
    </mesh>}
  </group>;
  return selected?<TransformControls mode={tool==='translate'?'translate':tool}
    translationSnap={snap?.5:undefined}
    rotationSnap={snap?Math.PI/12:undefined}
    scaleSnap={snap?.1:undefined}
    showY={tool!=='rotate'}
    onMouseUp={commit}>{object}</TransformControls>:object;
}
export default function EditorScene(props:SceneProps){
  const {objects,assetIndex,selectedId,placingAsset,tool,snap,onSelect,onPlace,onTransform}=props;
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
      if(placingAsset){
        const x=snap?Math.round(e.point.x*2)/2:e.point.x;
        const z=snap?Math.round(e.point.z*2)/2:e.point.z;
        onPlace([x,0,z]);
      }else onSelect(null);
    }}>
      <planeGeometry args={[48,48]}/>
      <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    {objects.map(item=>{
      const asset=assetIndex.get(item.assetId);
      if(!asset)return null;
      return <EditorItem key={item.id} item={item} asset={asset} selected={selectedId===item.id}
        tool={tool} snap={snap} onSelect={onSelect} onTransform={onTransform}/>;
    })}
    <OrbitControls makeDefault minDistance={2.5} maxDistance={65} maxPolarAngle={Math.PI/2.02}
      enableDamping dampingFactor={.12} target={[0,1,0]}/>
  </Canvas>;
}