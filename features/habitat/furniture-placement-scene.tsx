'use client';

import {Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {useGLTF} from '@react-three/drei';
import {Box3, BufferGeometry, Color, Group, Material, Object3D, Raycaster, Vector2, Vector3} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {getBuildAsset, type BuildAsset} from '@/features/plaza/build-assets';
import type {WorldObject, WorldState} from './types';
import {getFurniturePlacementBounds, getFurniturePlacementPreview, type PlacementPreview} from './furniture-placement';

export interface FurniturePlacementSceneProps {
  object: WorldObject;
  objects: readonly WorldObject[];
  states: WorldState['states'];
  onPreview: (preview: PlacementPreview) => void;
}

const GREEN = '#45df85', RED = '#f05b66';
const noRaycast = () => {};
type Renderable = Object3D & {geometry?: BufferGeometry; material?: Material | Material[]};

/** Private GPU resources for a ghost; cached GLTF geometry/materials/textures stay untouched. */
export function createFurnitureGhost(source: Object3D) {
  const scene = clone(source);
  const geometries = new Map<BufferGeometry, BufferGeometry>();
  const materials = new Map<Material, Material>();
  const copyMaterial = (original: Material) => {
    let copy = materials.get(original);
    if (!copy) {
      copy = original.clone();
      copy.transparent = true;
      copy.opacity = .45;
      copy.depthWrite = false;
      materials.set(original, copy);
    }
    return copy;
  };
  scene.traverse(node => {
    node.raycast = noRaycast;
    node.castShadow = false;
    node.receiveShadow = false;
    node.renderOrder = 1000;
    const renderable = node as Renderable;
    if (renderable.geometry) {
      const original = renderable.geometry;
      let copy = geometries.get(original);
      if (!copy) {copy = original.clone(); geometries.set(original, copy);}
      renderable.geometry = copy;
    }
    if (renderable.material) renderable.material = Array.isArray(renderable.material)
      ? renderable.material.map(copyMaterial) : copyMaterial(renderable.material);
  });
  return {
    scene,
    setValid(valid: boolean) {
      materials.forEach(material => {
        const tinted = material as Material & {color?: Color; emissive?: Color};
        tinted.color?.set(valid ? GREEN : RED);
        tinted.emissive?.set('#000000');
      });
    },
    dispose() {
      // Maps deduplicate repeated mesh materials/geometry. Do not dispose shared textures.
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    },
  };
}

function ImportedGhost({asset, valid}: {asset: BuildAsset; valid: boolean}) {
  const {scene} = useGLTF(asset.url);
  const ghost = useMemo(() => createFurnitureGhost(scene), [scene]);
  useLayoutEffect(() => ghost.setValid(valid), [ghost, valid]);
  useEffect(() => () => ghost.dispose(), [ghost]);
  // Identical to Stage.Imported: center in X/Z, move authored bottom to local Y=0.
  return <group position={[-asset.center[0], -(asset.center[1] - asset.bounds[1] / 2), -asset.center[2]]}>
    <primitive object={ghost.scene} dispose={null}/>
  </group>;
}

function BoxGhost({bounds, valid}: {bounds: [number, number, number]; valid: boolean}) {
  return <mesh position-y={bounds[1] / 2} raycast={noRaycast} renderOrder={1000}>
    <boxGeometry args={bounds}/>
    <meshBasicMaterial color={valid ? GREEN : RED} transparent opacity={.45} depthWrite={false}/>
  </mesh>;
}

const invalidPreview = (object: WorldObject): PlacementPreview => ({
  object: {...object}, valid: false, visible: false, reason: 'Arahkan kamera ke lantai untuk memilih posisi furnitur.',
});
const previewKey = (preview: PlacementPreview) => JSON.stringify(preview);

/** Mount INSIDE the Stage Canvas during build placement; never consumes pointer events. */
export default function FurniturePlacementScene(props: FurniturePlacementSceneProps) {
  const latest = useRef(props);
  const root = useRef<Group>(null);
  useEffect(() => () => {if (typeof document !== 'undefined') delete document.documentElement.dataset.ctrlFurnitureGhost;}, []);
  useLayoutEffect(() => {latest.current = props;});
  const selectionKey = JSON.stringify(props.object);
  const [shown, setShown] = useState(() => ({selectionKey, preview: invalidPreview(props.object)}));
  const last = useRef({time: -Infinity, key: ''});
  const caster = useMemo(() => new Raycaster(), []);
  const center = useMemo(() => new Vector2(0, 0), []);

  useLayoutEffect(() => {
    const invalid = invalidPreview(latest.current.object);
    last.current = {time: -Infinity, key: previewKey(invalid)};
    // Synchronous mount/selection invalidation: a previous item's target must not be committed.
    latest.current.onPreview(invalid);
  }, [selectionKey]);

  useFrame(({camera, clock}) => {
    const now = clock.elapsedTime;
    if (now - last.current.time < .1) return;
    last.current.time = now;
    camera.updateWorldMatrix(true, false);
    caster.setFromCamera(center, camera);
    const {object, objects, states, onPreview} = latest.current;
    const preview = getFurniturePlacementPreview(caster.ray, object, objects, states);
    const node=root.current;if(node){node.updateWorldMatrix(true,true);const point=node.getWorldPosition(new Vector3()).project(camera),size=new Box3().setFromObject(node).getSize(new Vector3());let meshes=0;node.traverse(child=>{if((child as Object3D&{isMesh?:boolean}).isMesh)meshes++;});document.documentElement.dataset.ctrlFurnitureGhost=JSON.stringify({visible:node.visible,x:node.position.x,z:node.position.z,screenX:point.x,screenY:point.y,height:size.y,meshes});}
    const key = previewKey(preview);
    if (key === last.current.key) return;
    last.current.key = key;
    setShown({selectionKey: JSON.stringify(object), preview});
    onPreview(preview);
  });

  // Hide the old selection immediately, even before the first sampled frame of the new one.
  const preview = shown.selectionKey === selectionKey ? shown.preview : invalidPreview(props.object);
  const object = preview.object;
  const asset = getBuildAsset(object.assetId);
  const bounds = getFurniturePlacementBounds(object);
  const fallback = <BoxGhost bounds={bounds} valid={preview.valid}/>;
  return <group ref={root} name='furniture-placement-ghost' visible={preview.visible}
    position={[object.x, object.y, object.z]} rotation-y={object.rotation} scale={object.scale}
    raycast={noRaycast}>
    {asset ? <Suspense fallback={fallback}><ImportedGhost asset={asset} valid={preview.valid}/></Suspense> : fallback}
    <mesh position-y={.015} raycast={noRaycast} renderOrder={1001}>
      <boxGeometry args={[bounds[0], .025, bounds[2]]}/>
      <meshBasicMaterial color={preview.valid ? GREEN : RED} wireframe transparent opacity={.9} depthWrite={false}/>
    </mesh>
  </group>;
}
