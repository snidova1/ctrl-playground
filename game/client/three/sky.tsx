'use client';
import {useMemo, useRef, type MutableRefObject} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {townHour, weatherAt} from '@/game/core/clock';
import {skyAt, type SkyState} from './palette';
import {shared} from './materials';

export interface Environment {sky: SkyState; hour: number; night: number}

const skyVertex = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFragment = `
uniform vec3 top; uniform vec3 horizon; uniform vec3 sunColor; uniform vec3 sunDir; uniform float night; uniform float time;
varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
void main(){
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 col = mix(horizon, top, smoothstep(-0.02, 0.55, h));
  float sun = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
  col += sunColor * (pow(sun, 900.0) * 1.6 + pow(sun, 14.0) * 0.18) * (1.0 - night * 0.7);
  // Stars at night.
  vec3 cell = floor(vDir * 180.0);
  float star = step(0.9975, hash(cell)) * smoothstep(0.05, 0.3, h) * night;
  col += vec3(star) * (0.6 + 0.4 * sin(time * 2.0 + hash(cell) * 30.0));
  gl_FragColor = vec4(col, 1.0);
}`;

/** Sky dome, sun/hemisphere lights and fog, all following the town clock. */
export function SkyAndLights({envRef, focus, shadowSize = 1024, offset = 0}: {envRef: MutableRefObject<Environment>; focus: THREE.Vector3; shadowSize?: number; offset?: number}) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const {scene} = useThree();
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {top: {value: new THREE.Color()}, horizon: {value: new THREE.Color()}, sunColor: {value: new THREE.Color()}, sunDir: {value: new THREE.Vector3(0, 1, 0)}, night: {value: 0}, time: shared.uTime},
  }), []);
  const fog = useMemo(() => new THREE.Fog('#cfe9fb', 38, 125), []);
  scene.fog = fog;
  const target = useMemo(() => new THREE.Object3D(), []);
  const tick = useRef(0);

  useFrame((state, dt) => {
    shared.uTime.value += dt;
    tick.current -= dt;
    if (tick.current <= 0) {
      tick.current = 0.5;
      const now = Date.now() + offset;
      const hour = townHour(now);
      const sky = skyAt(hour, weatherAt(now));
      envRef.current = {sky, hour, night: sky.night};
      material.uniforms.top.value.copy(sky.top);
      material.uniforms.horizon.value.copy(sky.horizon);
      material.uniforms.sunColor.value.copy(sky.sun);
      material.uniforms.sunDir.value.copy(sky.sunDir);
      material.uniforms.night.value = sky.night;
      fog.color.copy(sky.fog);
      shared.uWind.value = weatherAt(now) === 'breezy' ? 1.8 : weatherAt(now) === 'rain' ? 1.4 : 1;
      if (sun.current) {sun.current.color.copy(sky.sun); sun.current.intensity = sky.sunIntensity * 0.78;}
      if (hemi.current) {hemi.current.color.copy(sky.top).lerp(new THREE.Color('#ffffff'), 0.55); hemi.current.groundColor.copy(sky.ground); hemi.current.intensity = sky.ambient * 0.95;}
    }
    // Shadow camera follows the player so shadows stay crisp everywhere.
    if (sun.current) {
      const f = focus;
      sun.current.position.set(f.x + envRef.current.sky.sunDir.x * 30, envRef.current.sky.sunDir.y * 30 + 4, f.z + envRef.current.sky.sunDir.z * 30);
      target.position.copy(f);
      target.updateMatrixWorld();
    }
    state.camera.updateMatrixWorld();
  });

  return <>
    <mesh material={material} scale={400} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[1, 32, 16]} /></mesh>
    <hemisphereLight ref={hemi} args={['#ffffff', '#8fa77a', 1.2]} />
    <primitive object={target} />
    <directionalLight ref={sun} target={target} castShadow intensity={2.2}
      shadow-mapSize={[shadowSize, shadowSize]} shadow-bias={-0.0004} shadow-normalBias={0.04}
      shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-near={1} shadow-camera-far={80} />
  </>;
}
