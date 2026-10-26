'use client';
import {useEffect, useState} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {toonify} from '../three/materials';

/**
 * Item icons rendered from the very model the game places, in the same toon look, so every piece
 * of furniture has a matching picture. One shared offscreen renderer draws them one at a time;
 * results are kept in memory and in localStorage, so each icon is drawn once per device.
 */
const SIZE = 160;
const VERSION = 'v2';
const memory = new Map<string, Promise<string | null>>();
let renderer: THREE.WebGLRenderer | null = null;
let queue: Promise<unknown> = Promise.resolve();
const loader = new GLTFLoader();

function stored(model: string) {
  try {return localStorage.getItem(`willow-thumb-${VERSION}:${model}`);} catch {return null;}
}
function store(model: string, url: string) {
  try {localStorage.setItem(`willow-thumb-${VERSION}:${model}`, url);} catch {/* storage full or blocked: memory cache still works */}
}

async function draw(model: string): Promise<string | null> {
  const gltf = await loader.loadAsync(`/kit/${model}.glb`);
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, preserveDrawingBuffer: true});
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#d9c7aa', 1.35));
  const sun = new THREE.DirectionalLight('#fff4e0', 1.7);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const object = toonify(gltf.scene.clone(true), {shadows: false});
  scene.add(object);
  // Fit a three-quarter view around the model's bounds.
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3()), radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const dir = new THREE.Vector3(1, 0.85, 1.25).normalize();
  camera.position.copy(center).addScaledVector(dir, radius / Math.sin(THREE.MathUtils.degToRad(15)) * 1.05);
  camera.lookAt(center);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/webp', 0.92);
  scene.clear();
  return url;
}

export function modelThumb(model: string): Promise<string | null> {
  const hit = memory.get(model);
  if (hit) return hit;
  const saved = stored(model);
  const job = saved ? Promise.resolve(saved) : (queue = queue.then(() => draw(model)).then(url => {if (url) store(model, url); return url;}, () => null)) as Promise<string | null>;
  memory.set(model, job);
  return job;
}

/** Baked icon path (see scripts/qa/bake-icons.mjs); drawn live only when the file is missing. */
export const bakedIcon = (model: string) => `/kit/icons/${model.replace('/', '--')}.webp`;

/** The model's picture: the baked file, or one drawn on the device; `fallback` shows meanwhile. */
export function ModelIcon({model, size, fallback}: {model: string; size: number; fallback: React.ReactNode}) {
  const [url, setUrl] = useState<string | null>(() => stored(model) ?? bakedIcon(model));
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!live) return;
    let alive = true;
    modelThumb(model).then(u => {if (alive && u) setUrl(u);});
    return () => {alive = false;};
  }, [model, live]);
  if (!url || (live && url === bakedIcon(model))) return <>{fallback}</>;
  return <img src={url} alt="" width={size} height={size} style={{objectFit: 'contain'}} draggable={false} onError={() => {if (!live) setLive(true);}} />;
}

// QA hook for baking the icon files (read-only: it only draws pictures).
if (typeof window !== 'undefined') (window as unknown as {__willowThumb?: typeof modelThumb}).__willowThumb = modelThumb;
