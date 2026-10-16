'use client';

import {Suspense,useEffect,useLayoutEffect,useMemo,useRef,useState,type MutableRefObject} from 'react';
import {Canvas,useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import {Html,OrbitControls,useGLTF,useProgress} from '@react-three/drei';
import {NeutralToneMapping,Color,Material,Mesh,Plane,Vector3} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import CozyEnvironment from './cozy-environment';
import CozyRoom from './cozy-room';
import CozyFurniture, {supportsCozyFurniture} from './cozy-furniture';
import StylizedAtmosphere from './stylized-atmosphere';
import type {AtmospherePreset} from './atmosphere-presets';
import type {HabitHouseSettings} from './habit-home';
import type {WorldObject} from './types';
import {getBuildAsset} from '@/features/plaza/build-assets';
import VrmAvatar from '@/features/plaza/characters/vrm-avatar';
import {createCharacterMotion,defaultAppearance,previewCharacter} from '@/features/plaza/characters/catalog';
import type {Pose} from '@/features/plaza/types';
import {enableLilToon} from '@mochiya/three-liltoon';
import {EXTERIOR_HOME,intersectsExteriorHouse} from './exterior-layout';
import Icon from './habit-icons';

const ROOM = {minX: -5, maxX: 5, minZ: -4, maxZ: 4} as const;
const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0);
const TMP_POINT = new Vector3();

declare global {
  interface Window {
    __habitProject?: (x: number, y: number, z: number) => {x: number; y: number; visible: boolean};
  }
}

interface Props {
  inside: boolean;
  objects: WorldObject[];
  selected: string | null;
  placing: boolean;
  colors: Record<string, string>;
  houseSettings: HabitHouseSettings;
  onSelect: (id: string | null) => void;
  onPlace: (x: number, z: number) => void;
  onMove: (id: string, x: number, z: number) => void;
  onDoor: () => void;
  quality?: 'low' | 'high';
  atmosphere?: AtmospherePreset;
}

type DragState = {id: string; offsetX: number; offsetZ: number};

function clamp(value: number, min: number, max: number) {
  if (min > max) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function objectHalfExtents(object: WorldObject) {
  const asset = getBuildAsset(object.assetId);
  const width = (asset?.bounds[0] ?? 1) * object.scale;
  const depth = (asset?.bounds[2] ?? 1) * object.scale;
  const c = Math.cos(object.rotation), s = Math.sin(object.rotation);
  return {
    x: Math.abs(c) * width / 2 + Math.abs(s) * depth / 2,
    z: Math.abs(s) * width / 2 + Math.abs(c) * depth / 2,
  };
}

function clampObjectToRoom(object: WorldObject, x: number, z: number) {
  const half = objectHalfExtents(object);
  return {
    x: clamp(x, ROOM.minX + half.x, ROOM.maxX - half.x),
    z: clamp(z, ROOM.minZ + half.z, ROOM.maxZ - half.z),
  };
}

function materialWithTint(source: Material, color: string, owned: Set<Material>) {
  const next = source.clone();
  owned.add(next);
  const maybe = next as Material & {color?: Color; emissive?: Color; needsUpdate: boolean};
  if (maybe.color instanceof Color) maybe.color.set(color);
  if (maybe.emissive instanceof Color) maybe.emissive.lerp(new Color(color), .18);
  maybe.needsUpdate = true;
  return next;
}

function ImportedObject({assetId, tint}: {assetId: string; tint?: string}) {
  if (supportsCozyFurniture(assetId)) return <CozyFurniture assetId={assetId} tint={tint}/>;
  const asset = getBuildAsset(assetId);
  if (!asset) return <mesh castShadow receiveShadow position-y={.35}><boxGeometry args={[.8, .7, .8]}/><meshStandardMaterial color={tint ?? '#d8d4c6'}/></mesh>;
  return <ImportedAsset assetId={assetId} tint={tint}/>;
}

function ImportedAsset({assetId, tint}: {assetId: string; tint?: string}) {
  const asset = getBuildAsset(assetId)!;
  const {scene} = useGLTF(asset.url);
  const owned = useMemo(() => new Set<Material>(), [scene, tint]);
  const copy = useMemo(() => {
    const instance = clone(scene);
    instance.traverse(node => {
      if (!(node as Mesh).isMesh) return;
      const mesh = node as Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (tint) {
        const material = mesh.material as Material | Material[];
        mesh.material = Array.isArray(material)
          ? material.map(source => materialWithTint(source, tint, owned))
          : materialWithTint(material, tint, owned);
      }
    });
    return instance;
  }, [scene, tint, owned]);
  useEffect(() => () => {owned.forEach(material => material.dispose()); owned.clear();}, [owned]);
  return <group position={[-asset.center[0], -(asset.center[1] - asset.bounds[1] / 2), -asset.center[2]]}>
    <primitive object={copy} dispose={null}/>
  </group>;
}

function SelectRing({active, invalid}: {active: boolean; invalid?: boolean}) {
  if (!active) return null;
  return <mesh rotation-x={-Math.PI / 2} position-y={.035}>
    <ringGeometry args={[.64, .72, 40]}/>
    <meshBasicMaterial color={invalid ? '#dc4f45' : '#789b82'} transparent opacity={.88}/>
  </mesh>;
}

function FurnitureObject({
  object, selected, tint, drag, setDrag, onSelect, onMove, inside,
}: {
  object: WorldObject;
  inside: boolean;
  selected: boolean;
  tint?: string;
  drag: DragState | null;
  setDrag: (state: DragState | null) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, z: number) => void;
}) {
  const dragging = drag?.id === object.id;
  const bounds = objectHalfExtents(object);
  const invalid = inside && (object.x - bounds.x < ROOM.minX || object.x + bounds.x > ROOM.maxX || object.z - bounds.z < ROOM.minZ || object.z + bounds.z > ROOM.maxZ);
  const floorHit = (e: ThreeEvent<PointerEvent>) => e.ray.intersectPlane(FLOOR_PLANE, TMP_POINT)?.clone();
  const capture = (target: EventTarget | null, pointerId: number) => (target as (EventTarget & {setPointerCapture?: (id: number) => void}) | null)?.setPointerCapture?.(pointerId);
  const release = (target: EventTarget | null, pointerId: number) => (target as (EventTarget & {releasePointerCapture?: (id: number) => void}) | null)?.releasePointerCapture?.(pointerId);
  return <group
    position={[object.x, object.y, object.z]}
    rotation-y={object.rotation}
    scale={object.scale}
    onPointerDown={e => {
      e.stopPropagation();
      capture(e.target, e.pointerId);
      onSelect(object.id);
      const hit = floorHit(e);
      setDrag(hit ? {id: object.id, offsetX: object.x - hit.x, offsetZ: object.z - hit.z} : {id: object.id, offsetX: 0, offsetZ: 0});
    }}
    onPointerMove={e => {
      if (drag?.id !== object.id) return;
      e.stopPropagation();
      const hit = floorHit(e);
      if (!hit) return;
      const next = inside ? clampObjectToRoom(object, hit.x + drag.offsetX, hit.z + drag.offsetZ) : {x:clamp(hit.x+drag.offsetX,-13,13),z:clamp(hit.z+drag.offsetZ,-7,11)};
      onMove(object.id, next.x, next.z);
    }}
    onPointerUp={e => {
      if (drag?.id !== object.id) return;
      e.stopPropagation();
      release(e.target, e.pointerId);
      setDrag(null);
    }}
    onPointerCancel={e => {
      if (drag?.id === object.id) {
        release(e.target, e.pointerId);
        setDrag(null);
      }
    }}
    onClick={e => {e.stopPropagation(); onSelect(object.id);}}
  >
    <Suspense fallback={<mesh castShadow receiveShadow position-y={.45}><boxGeometry args={[.7, .9, .7]}/><meshStandardMaterial color={tint ?? '#d8d4c6'} wireframe/></mesh>}>
      <ImportedObject assetId={object.assetId} tint={tint}/>
    </Suspense>
    <group scale={1/object.scale}><SelectRing active={selected || dragging} invalid={invalid}/></group>
  </group>;
}

function DoorButton({inside, htmlPortal, onDoor}: {inside: boolean; htmlPortal: MutableRefObject<HTMLDivElement | null>; onDoor: () => void}) {
  const position: [number, number, number] = inside ? [0, 1.25, 3.72] : EXTERIOR_HOME.door;
  return <Html portal={htmlPortal.current ? {current: htmlPortal.current} : undefined} position={position} center zIndexRange={[80, 0]} style={{pointerEvents: 'auto'}}>
    <button
      type='button'
      aria-label={inside ? 'Exit home' : 'Enter home'}
      title={inside ? 'Back to the garden' : 'Enter your cottage'}
      onClick={event => {event.stopPropagation(); onDoor();}}
      style={{
        border:0,borderRadius:14,padding:0,minWidth:58,minHeight:46,fontSize:10,whiteSpace:'nowrap',background:'transparent',color:'#354c3b',boxShadow:'none',fontWeight:600,touchAction:'manipulation',
      }}
    ><span style={{display:'inline-flex',alignItems:'center',gap:5,height:27,padding:'0 10px',borderRadius:20,background:'#fffbeded',border:'1px solid #fffef1e0',boxShadow:'0 3px 12px #293e3026',backdropFilter:'blur(8px)'}}><Icon name={inside?'arrow':'home'} size={12}/>{inside?'Exit':'Enter'}</span></button>
  </Html>;
}

function MobileAvatar({quality, htmlPortal,onReady}: {quality: 'low' | 'high'; htmlPortal: MutableRefObject<HTMLDivElement | null>;onReady:(ready:boolean)=>void}) {
  const pose = useRef<Pose>({x: 0, z: 2.25, angle: Math.PI, moving: false});
  const target = useRef({x: 0, z: 2.25});
  const motion = useRef(createCharacterMotion());
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('habit-mobile-avatar-target', {detail: target.current}));
  }, []);
  useEffect(() => {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<{x: number; z: number}>).detail;
      if (detail) target.current = {x: detail.x, z: detail.z};
    };
    window.addEventListener('habit-mobile-avatar-target', listener);
    return () => window.removeEventListener('habit-mobile-avatar-target', listener);
  }, []);
  useFrame((_, delta) => {
    const p = pose.current, t = target.current;
    const dx = t.x - p.x, dz = t.z - p.z, dist = Math.hypot(dx, dz);
    const step = Math.min(dist, delta * 2.4);
    if (dist > .035) {
      p.x += dx / dist * step;
      p.z += dz / dist * step;
      p.angle = Math.atan2(dx, dz);
      p.moving = true;
    } else p.moving = false;
  });
  return <VrmAvatar
    materialStyle='liltoon' showName={false} onReady={onReady}
    htmlPortal={htmlPortal}
    definition={previewCharacter}
    appearance={defaultAppearance}
    name='You'
    pose={pose.current}
    motion={motion}
    quality={quality}
    sitting={false}
    celebrate={false}
    seatLift={0}
    interactedAt={0}
  />;
}

function FloorTouch({placing, onPlace, onClear, onWalk, inside}: {inside:boolean; placing: boolean; onPlace: (x: number, z: number) => void; onClear: () => void; onWalk: (x: number, z: number) => void}) {
  return <mesh
    rotation-x={-Math.PI / 2}
    position-y={.025}
    onClick={(e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 7) return;
      const x = clamp(e.point.x, inside ? ROOM.minX + .12 : -13, inside ? ROOM.maxX - .12 : 13);
      const z = clamp(e.point.z, inside ? ROOM.minZ + .12 : -7, inside ? ROOM.maxZ - .12 : 11);
      if (!inside && intersectsExteriorHouse(x,z)) return;
      if (placing) onPlace(x, z);
      else {onClear(); onWalk(x, z);}
    }}
  >
    <planeGeometry args={inside ? [10, 8] : [28, 24]}/>
    <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>;
}

function CameraAndProjection({inside, orbitEnabled}: {inside: boolean; orbitEnabled: boolean}) {
  const {camera, gl, size} = useThree();
  const controls = useRef<{target: Vector3; update: () => void} | null>(null);
  useEffect(() => {
    const reset=()=>{
    const portrait = size.width/size.height < .85;
    const position = inside ? (portrait ? [9, 12, 21] : [8, 8, 13]) : (portrait ? [9, 12, 32] : [11.2, 8.3, 19.5]);
    camera.position.set(position[0], position[1], position[2]);
    camera.near = .08;
    camera.far = 100;
    camera.lookAt(0, inside ? .8 : 1.5, inside ? 0 : -2);
    camera.updateProjectionMatrix();
    const maybe = controls.current as {target?: Vector3; update?: () => void} | null;
    maybe?.target?.set(0, inside ? .8 : 1.5, inside ? 0 : -2);
    maybe?.update?.();
    };
    reset();window.addEventListener('habit-reset-camera',reset);return()=>window.removeEventListener('habit-reset-camera',reset);
  }, [inside, camera, size.width, size.height]);
  useEffect(() => {
    const project = (x: number, y: number, z: number) => {
      const vector = new Vector3(x, y, z).project(camera);
      const rect = gl.domElement.getBoundingClientRect();
      return {
        x: rect.left + (vector.x + 1) * rect.width / 2,
        y: rect.top + (-vector.y + 1) * rect.height / 2,
        visible: vector.z >= -1 && vector.z <= 1,
      };
    };
    window.__habitProject = project;
    return () => {if (window.__habitProject === project) delete window.__habitProject;};
  }, [camera, gl]);
  return <OrbitControls
    ref={(node: unknown) => {controls.current = node as {target: Vector3; update: () => void} | null;}}
    enabled={orbitEnabled}
    enablePan
    enableZoom
    enableRotate
    enableDamping
    dampingFactor={.08}
    minDistance={inside ? 7.5 : 9}
    maxDistance={inside ? 32 : 64}
    minPolarAngle={inside ? Math.PI / 5 : Math.PI / 6}
    maxPolarAngle={inside ? Math.PI / 2.28 : Math.PI / 2.18}
  />;
}

function SceneReadySignal({signature, onReady}: {signature: string; onReady: (signature: string) => void}) {
  const active = useProgress(state => state.active);
  useEffect(() => {
    if (active) return;
    let a = 0, b = 0;
    a = requestAnimationFrame(() => {b = requestAnimationFrame(() => onReady(signature));});
    return () => {cancelAnimationFrame(a); cancelAnimationFrame(b);};
  }, [active, signature, onReady]);
  return null;
}

function ToonRendererBridge(){const gl=useThree(state=>state.gl);useLayoutEffect(()=>enableLilToon(gl),[gl]);return null;}

function SceneContents(props: Props & {onAvatarReady:(ready:boolean)=>void;htmlPortal: MutableRefObject<HTMLDivElement | null>; orbitEnabled: boolean; setDrag: (state: DragState | null) => void; drag: DragState | null}) {
  const quality = props.quality ?? 'high';
  const walkAvatar = (x: number, z: number) => window.dispatchEvent(new CustomEvent('habit-mobile-avatar-target', {detail: {x, z}}));
  return <>
    <ToonRendererBridge/>
    <color attach='background' args={[props.inside ? '#e7e2d5' : '#c6e3e4']}/>
    {props.inside ? <>
      <ambientLight intensity={.65}/>
      <hemisphereLight args={['#fff3de', '#b2a28e', 1.1]}/>
      <directionalLight position={[-3,9,5]} intensity={1.6} color='#fff1da' castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-far={35} shadow-bias={-.0003} shadow-normalBias={.025}/>
      <directionalLight position={[5,4,-2]} intensity={.3} color='#c9dfe9'/>
    </> : <StylizedAtmosphere preset={props.atmosphere ?? 'afternoon'} quality={quality}/>}
    <CameraAndProjection inside={props.inside} orbitEnabled={props.orbitEnabled}/>
    {props.inside ? <CozyRoom wallColor={props.houseSettings.wallColor || '#eadfc9'}/> : <>
      <CozyEnvironment editing={false} quality={quality} houseSettings={props.houseSettings} atmosphere={props.atmosphere}/>
    </>}
    <FloorTouch inside={props.inside} placing={props.placing} onPlace={props.onPlace} onClear={() => props.onSelect(null)} onWalk={walkAvatar}/>
    {props.objects.map(object => <FurnitureObject key={object.id} object={object} inside={props.inside} selected={props.selected === object.id} tint={props.colors[object.id]} drag={props.drag} setDrag={props.setDrag} onSelect={props.onSelect} onMove={props.onMove}/>)}
    <MobileAvatar key={props.inside ? 'inside' : 'yard'} quality={quality} htmlPortal={props.htmlPortal} onReady={props.onAvatarReady}/>
    <DoorButton inside={props.inside} htmlPortal={props.htmlPortal} onDoor={props.onDoor}/>
  </>;
}

function signatureFor(props: Props) {
  const assetKey = props.objects.map(o => `${o.id}:${o.assetId}`).join('|');
  return `${props.inside ? 'inside' : 'yard'}|${props.quality ?? 'high'}|${props.houseSettings.timber ? 1 : 0}|${props.houseSettings.tall ? 1 : 0}|${assetKey}`;
}

export default function MobileHabitScene(props: Props) {
  const htmlPortal = useRef<HTMLDivElement | null>(null);
  const [readySignature, setReadySignature] = useState('');
  const [avatarReady,setAvatarReady]=useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const signature = signatureFor(props);
  const ready = readySignature === signature&&avatarReady;
  const quality = props.quality ?? 'high';
  return <div
    data-habit-view={props.inside ? 'inside' : 'yard'}
    data-atmosphere={props.atmosphere ?? 'afternoon'}
    data-visual-style='stylized-references'
    data-scene-ready={ready ? 'true' : undefined}
    style={{position: 'relative', width: '100%', height: '100%', minHeight: 360, overflow: 'hidden', touchAction: 'none'}}
  >
    <Canvas
      shadows={quality === 'high'}
      dpr={quality === 'high' ? [1, 1.6] : 1}
      camera={{position: props.inside ? [9, 11, 13] : [10, 12, 16], fov: props.inside ? 46 : 48, near: .08, far: 100}}
      gl={{toneMapping: NeutralToneMapping, antialias: quality === 'high'}}
      style={{width: '100%', height: '100%', touchAction: 'none'}}
      onCreated={({gl}) => {gl.domElement.style.touchAction = 'none';}}
    >
      <Suspense fallback={null}>
        <SceneContents {...props} onAvatarReady={setAvatarReady} quality={quality} htmlPortal={htmlPortal} orbitEnabled={!drag} drag={drag} setDrag={setDrag}/>
        <SceneReadySignal signature={signature} onReady={setReadySignature}/>
      </Suspense>
    </Canvas>
    <div ref={htmlPortal} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}/>
    {!ready&&<div className='habit-loading habit-scene-loader' role='status'><span className='habit-spinner'/><span>Preparing your home</span></div>}
  </div>;
}
