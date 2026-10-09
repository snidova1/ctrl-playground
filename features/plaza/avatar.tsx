/* eslint-disable react-hooks/immutability -- Three.js animation state is updated in the render loop. */
'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import {Html, useAnimations, useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {Box3, Group, LoopOnce, LoopRepeat, Mesh, Skeleton, SkinnedMesh, Vector3} from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';
import type {Pose} from './types';

const AVATAR_HEIGHT = 1.88;
const FADE_SECONDS = .18;
const MODEL_URL = '/plaza/models/mio.glb';
type Motion = 'Idle' | 'Walk' | 'SitDown' | 'Seated' | 'Interact' | 'Victory';

interface AvatarProps {
  name: string;
  pose: Pose;
  local?: boolean;
  sitting?: boolean;
  celebrate?: boolean;
  interactedAt?: number;
  seatLift?: number;
}

export function Avatar({name, pose, local = false, sitting = false, celebrate = false, interactedAt = 0, seatLift = 0}: AvatarProps) {
  const {scene, animations} = useGLTF(MODEL_URL);
  const group = useRef<Group>(null);
  const [initial] = useState<[number, number, number]>([pose.x, 0, pose.z]);
  const active = useRef<Motion | null>(null);
  const wasSitting = useRef(false);
  const seatSettled = useRef(false);

  const {model, scale, skeletons} = useMemo(() => {
    const model = clone(scene);
    const skeletons = new Map<string, Skeleton>();
    model.updateMatrixWorld(true);
    model.traverse(object => {
      if (object instanceof Mesh) {
        object.castShadow = true;
        object.frustumCulled = false;
      }
      // The nine wardrobe materials use the same bones. Share one palette
      // within this visitor's clone, while keeping visitors independent.
      if (object instanceof SkinnedMesh) {
        const key = object.skeleton.bones.map(bone => bone.uuid).join(',');
        const shared = skeletons.get(key);
        if (shared) object.skeleton = shared;
        else skeletons.set(key, object.skeleton);
      }
    });
    const height = new Box3().setFromObject(model).getSize(new Vector3()).y;
    return {model, scale: AVATAR_HEIGHT / height, skeletons};
  }, [scene]);
  const {actions} = useAnimations(animations, model);

  useEffect(() => () => {
    // Geometry, materials and textures belong to the cached GLB. Only each
    // visitor's own GPU bone palette is released on departure.
    for (const skeleton of skeletons.values()) skeleton.dispose();
  }, [skeletons]);

  useFrame((_, elapsed) => {
    const dt = Math.min(elapsed, .1);
    if (sitting && !wasSitting.current) seatSettled.current = false;
    if (sitting && active.current === 'SitDown' && actions.SitDown) {
      seatSettled.current = actions.SitDown.time >= actions.SitDown.getClip().duration - .02;
    }
    wasSitting.current = sitting;
    const motion: Motion = sitting ? (seatSettled.current ? 'Seated' : 'SitDown')
      : pose.moving ? 'Walk'
      : celebrate ? 'Victory'
      : Date.now() - interactedAt < 1100 ? 'Interact' : 'Idle';

    if (active.current !== motion) {
      if (active.current) actions[active.current]?.fadeOut(FADE_SECONDS);
      const action = actions[motion];
      if (action) {
        const once = motion === 'SitDown' || motion === 'Interact';
        action.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity);
        action.clampWhenFinished = once;
        action.reset().setEffectiveTimeScale(motion === 'Walk' ? 1.25 : 1).fadeIn(FADE_SECONDS).play();
        active.current = motion;
      }
    }

    const actor = group.current;
    if (!actor) return;
    const follow = 1 - Math.exp(-dt * (local ? 30 : 7));
    actor.position.y += ((sitting ? seatLift : 0) - actor.position.y) * follow;
    actor.position.x += (pose.x - actor.position.x) * follow;
    actor.position.z += (pose.z - actor.position.z) * follow;
    const angle = Math.atan2(Math.sin(pose.angle - actor.rotation.y), Math.cos(pose.angle - actor.rotation.y));
    actor.rotation.y += angle * (1 - Math.exp(-dt * 15));
  });

  return <group ref={group} position={initial}>
    <primitive object={model} scale={scale} dispose={null}/>
    <Html position={[0, 2.1, 0]} center distanceFactor={9} zIndexRange={[10, 0]} style={{pointerEvents: 'none'}}>
      <span className='pl-name'>{local ? 'You' : name}</span>
    </Html>
  </group>;
}
