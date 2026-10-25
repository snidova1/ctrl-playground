'use client';
import {useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {toonify} from './materials';

/** Kenney CC0 model from /kit, converted to the shared toon look and cloned per use. */
export function useKit(model: string) {
  const {scene} = useGLTF(`/kit/${model}.glb`);
  return useMemo(() => {
    const clone = scene.clone(true);
    toonify(clone);
    return clone;
  }, [scene]);
}

export function Kit({model, position, rotation = 0, scale = 1, shadows = true}: {model: string; position: [number, number, number]; rotation?: number; scale?: number; shadows?: boolean}) {
  const object = useKit(model);
  object.traverse(o => {if ((o as THREE.Mesh).isMesh) o.castShadow = shadows;});
  return <primitive object={object} position={position} rotation={[0, rotation, 0]} scale={scale} />;
}

export function preloadKit(models: string[]) {
  for (const m of models) useGLTF.preload(`/kit/${m}.glb`);
}
