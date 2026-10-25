'use client';
import * as THREE from 'three';
import {GLTFLoader, type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {VRMLoaderPlugin, VRMUtils, MToonMaterial, type VRM, type VRMHumanBoneName} from '@pixiv/three-vrm';
import {lookColors, type Appearance} from '@/game/core/appearance';
import {BOTTOMS, TOPS} from '@/game/core/wardrobe';
import {paintFabric} from './fabric';

const fabrics = new Map<string, THREE.Texture>();

/** Anime VRM bodies, shown with chibi proportions (big head, small body). */
export const BODY_FILES = ['/characters/female.vrm', '/characters/female-b.vrm', '/characters/male.vrm', '/characters/male-b.vrm'];
const MOTION_FILES = ['/characters/humanoid-motions.glb', '/characters/humanoid-extra-motions.glb'];
export const AVATAR_HEIGHT = 1.42;
export const HEAD_SCALE = 1.72;

// --- byte + template caches ---------------------------------------------------
const bytes = new Map<string, Promise<ArrayBuffer>>();
function fetchBytes(url: string) {
  let hit = bytes.get(url);
  if (!hit) {
    hit = fetch(url, {cache: 'force-cache'}).then(r => {if (!r.ok) throw new Error(`Avatar asset failed: ${url}`); return r.arrayBuffer();});
    hit.catch(() => bytes.delete(url));
    bytes.set(url, hit);
  }
  return hit;
}

/** Reject external references before GLTFLoader can make secondary requests. */
function validateVrm(data: ArrayBuffer) {
  const view = new DataView(data);
  if (data.byteLength < 28 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(16, true) !== 0x4e4f534a) throw new Error('Invalid avatar file.');
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, view.getUint32(12, true)))) as {buffers?: {uri?: string}[]; images?: {uri?: string}[]};
  if ([...(json.buffers ?? []), ...(json.images ?? [])].some(item => item.uri !== undefined)) throw new Error('Avatar must be self-contained.');
}

const PLACEHOLDER = new THREE.Texture();
async function parseVrm(data: ArrayBuffer, reuseTextures = false): Promise<VRM> {
  const loader = new GLTFLoader();
  // Instances borrow the template's decoded textures, so skip image decoding entirely.
  if (reuseTextures) loader.register(() => ({name: 'ctrl_reuse_textures', loadTexture: () => Promise.resolve(PLACEHOLDER)}) as never);
  loader.register(parser => new VRMLoaderPlugin(parser));
  const gltf = await loader.parseAsync(data.slice(0), '');
  const vrm = gltf.userData.vrm as VRM | undefined;
  if (!vrm) throw new Error('Avatar has no humanoid.');
  VRMUtils.removeUnnecessaryVertices(vrm.scene);
  VRMUtils.combineSkeletons(vrm.scene);
  VRMUtils.rotateVRM0(vrm);
  if (vrm.lookAt) vrm.lookAt.autoUpdate = false;
  return vrm;
}

// --- retargeting (pixiv rest-space method, Quaternius skeleton) ---------------
const boneMap: Record<string, VRMHumanBoneName> = {
  pelvis: 'hips', spine_01: 'spine', spine_02: 'chest', spine_03: 'upperChest', neck_01: 'neck', Head: 'head',
  clavicle_l: 'leftShoulder', upperarm_l: 'leftUpperArm', lowerarm_l: 'leftLowerArm', hand_l: 'leftHand',
  clavicle_r: 'rightShoulder', upperarm_r: 'rightUpperArm', lowerarm_r: 'rightLowerArm', hand_r: 'rightHand',
  thigh_l: 'leftUpperLeg', calf_l: 'leftLowerLeg', foot_l: 'leftFoot', ball_l: 'leftToes',
  thigh_r: 'rightUpperLeg', calf_r: 'rightLowerLeg', foot_r: 'rightFoot', ball_r: 'rightToes',
};
function retarget(source: GLTF, vrm: VRM): THREE.AnimationClip[] {
  source.scene.updateMatrixWorld(true);
  const hip = source.scene.getObjectByName('pelvis');
  if (!hip) return [];
  const restHip = hip.getWorldPosition(new THREE.Vector3());
  const targetHip = vrm.humanoid.normalizedRestPose.hips?.position?.[1] ?? 1;
  const ratio = targetHip / restHip.y, legacy = vrm.meta?.metaVersion === '0';
  return source.animations.map(clip => {
    const tracks: THREE.KeyframeTrack[] = [];
    for (const track of clip.tracks) {
      const dot = track.name.lastIndexOf('.'), name = track.name.slice(0, dot), property = track.name.slice(dot + 1);
      const human = boneMap[name];
      if (!human) continue;
      const target = vrm.humanoid.getNormalizedBoneNode(human), bone = source.scene.getObjectByName(name);
      if (!target || !bone) continue;
      if (property === 'quaternion') {
        const inverse = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
        const parent = bone.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
        const values = new Float32Array(track.values.length), q = new THREE.Quaternion(), previous = new THREE.Quaternion();
        for (let i = 0; i < values.length; i += 4) {
          q.fromArray(track.values, i).premultiply(parent).multiply(inverse).normalize();
          if (legacy) {q.x = -q.x; q.z = -q.z;}
          if (i > 0 && q.dot(previous) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
          q.toArray(values, i); previous.copy(q);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(`${target.name}.quaternion`, track.times.slice(), values));
      } else if (property === 'position' && human === 'hips') {
        const values = new Float32Array(track.values.length), v = new THREE.Vector3();
        const seated = /Sit|Seated/.test(clip.name);
        for (let i = 0; i < values.length; i += 3) {
          v.fromArray(track.values, i);
          if (bone.parent) v.applyMatrix4(bone.parent.matrixWorld);
          values[i] = seated ? (v.x - restHip.x) * ratio * (legacy ? -1 : 1) : 0;
          values[i + 1] = /Jump/.test(clip.name) ? targetHip : targetHip + (v.y - restHip.y) * ratio;
          values[i + 2] = seated ? (v.z - restHip.z) * ratio * (legacy ? -1 : 1) : 0;
        }
        tracks.push(new THREE.VectorKeyframeTrack(`${target.name}.position`, track.times.slice(), values));
      }
    }
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  });
}

// --- recolouring --------------------------------------------------------------
type Slot = 'hair' | 'top' | 'bottom' | 'shoes' | 'eye' | 'skin' | null;
function slotFor(name: string): Slot {
  if (/HAIR/i.test(name)) return 'hair';
  if (/EyeIris/i.test(name)) return 'eye';
  if (/Tops|Accessory/i.test(name)) return 'top';
  if (/Bottoms/i.test(name)) return 'bottom';
  if (/Shoes/i.test(name)) return 'shoes';
  if (/SKIN/i.test(name)) return 'skin';
  return null;
}
/** Luminance copy so any tint reads as that colour, not a darkened brown. */
function grayscale(texture: THREE.Texture): THREE.Texture {
  const image = texture.image as CanvasImageSource & {width: number; height: number};
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  const ctx = canvas.getContext('2d', {willReadFrequently: true})!;
  ctx.drawImage(image, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height), d = img.data;
  let sum = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 10) {sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++;}
  const gain = n ? Math.min(3, 215 / (sum / n)) : 1;
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.min(255, (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) * gain);
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  ctx.putImageData(img, 0, 0);
  const out = new THREE.CanvasTexture(canvas);
  out.colorSpace = THREE.SRGBColorSpace; out.flipY = texture.flipY; out.wrapS = texture.wrapS; out.wrapT = texture.wrapT;
  return out;
}

interface Template {vrm: VRM; clips: THREE.AnimationClip[]; textures: Map<string, Record<string, THREE.Texture | null>>; gray: Map<string, THREE.Texture>}
const templates = new Map<number, Promise<Template>>();
const TEXTURE_SLOTS = ['map', 'shadeMultiplyTexture', 'normalMap', 'emissiveMap', 'matcapTexture', 'rimMultiplyTexture', 'outlineWidthMultiplyTexture', 'uvAnimationMaskTexture', 'shadingShiftTexture'] as const;

function materials(root: THREE.Object3D) {
  const list: MToonMaterial[] = [];
  root.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if (m instanceof MToonMaterial) list.push(m);
  });
  return list;
}

function template(body: number): Promise<Template> {
  let hit = templates.get(body);
  if (!hit) {
    hit = (async () => {
      const [data, ...motions] = await Promise.all([fetchBytes(BODY_FILES[body]), ...MOTION_FILES.map(fetchBytes)]);
      validateVrm(data);
      const vrm = await parseVrm(data);
      const clips: THREE.AnimationClip[] = [];
      for (const m of motions) clips.push(...retarget(await new GLTFLoader().parseAsync(m.slice(0), ''), vrm));
      const textures = new Map<string, Record<string, THREE.Texture | null>>();
      const gray = new Map<string, THREE.Texture>();
      for (const material of materials(vrm.scene)) {
        const record: Record<string, THREE.Texture | null> = {};
        for (const slot of TEXTURE_SLOTS) record[slot] = (material as unknown as Record<string, THREE.Texture | null>)[slot] ?? null;
        textures.set(material.name, record);
        if (slotFor(material.name) && slotFor(material.name) !== 'skin' && material.map) gray.set(material.name, grayscale(material.map));
      }
      return {vrm, clips, textures, gray};
    })();
    hit.catch(() => templates.delete(body));
    templates.set(body, hit);
  }
  return hit;
}
export function preloadAvatars() {
  for (let i = 0; i < BODY_FILES.length; i++) void template(i).catch(() => undefined);
}

/** How many avatars are still loading (drives the loading screen). */
export const avatarLoads = {pending: 0, done: 0, listeners: new Set<() => void>()};
function notifyLoads() {avatarLoads.listeners.forEach(l => l());}

export interface AvatarInstance {vrm: VRM; clips: THREE.AnimationClip[]; scale: number; floor: number; dispose: () => void}

/** Fresh VRM (own skeleton, springs, expressions) sharing the template's GPU textures. */
export async function createAvatar(look: Appearance): Promise<AvatarInstance> {
  avatarLoads.pending++; notifyLoads();
  try {return await buildAvatar(look);} finally {avatarLoads.pending--; avatarLoads.done++; notifyLoads();}
}
async function buildAvatar(look: Appearance): Promise<AvatarInstance> {
  const t = await template(look.body);
  const vrm = await parseVrm(await fetchBytes(BODY_FILES[look.body]), true);
  const colors = lookColors(look);
  const owned = new Set<THREE.Texture>();
  for (const material of materials(vrm.scene)) {
    const shared = t.textures.get(material.name);
    const record = material as unknown as Record<string, THREE.Texture | null>;
    if (shared) for (const slot of TEXTURE_SLOTS) {
      const mine = record[slot];
      if (mine && mine !== shared[slot] && mine !== PLACEHOLDER) mine.dispose();
      record[slot] = shared[slot];
    }
    const slot = slotFor(material.name);
    const outfit = slot === 'top' ? TOPS[look.top] : slot === 'bottom' ? BOTTOMS[look.bottom] : null;
    if (outfit?.base) {
      const gray = t.gray.get(material.name);
      if (gray) {
        const key = `${look.body}|${material.name}|${outfit.id}`;
        let fabric = fabrics.get(key);
        if (!fabric) {fabric = paintFabric(gray, outfit); fabrics.set(key, fabric);}
        material.map = fabric; material.shadeMultiplyTexture = fabric;
        material.color.set('#ffffff');
        material.shadeColorFactor.set('#d9c6dc');
      }
      material.needsUpdate = true;
      continue;
    }
    const tint = slot === 'hair' ? colors.hair : slot === 'eye' ? colors.eye : slot === 'shoes' ? colors.shoes : slot === 'skin' ? colors.skin : '';
    if (slot && tint) {
      if (slot === 'skin') {
        const soft = new THREE.Color(tint).lerp(new THREE.Color('#ffffff'), 0.35);
        material.color.multiply(soft);
        material.shadeColorFactor.multiply(soft);
      } else {
        const gray = t.gray.get(material.name);
        if (gray) {material.map = gray; material.shadeMultiplyTexture = gray;}
        material.color.set(tint);
        material.shadeColorFactor.set(tint).multiplyScalar(slot === 'eye' ? 0.75 : 0.82).lerp(new THREE.Color('#b48fb4'), 0.18);
      }
    }
    material.needsUpdate = true;
  }
  vrm.scene.traverse(o => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {mesh.castShadow = true; mesh.frustumCulled = false;}
  });
  // Chibi proportions: enlarge the head (hair and face follow), soften the springs.
  const head = vrm.humanoid.getRawBoneNode('head');
  if (head) head.scale.setScalar(HEAD_SCALE);
  if (vrm.springBoneManager) {
    for (const joint of [...vrm.springBoneManager.joints]) {
      if (/Bust|Sleeve|Skirt/i.test(joint.bone.name)) vrm.springBoneManager.deleteJoint(joint);
      else {joint.settings.dragForce = Math.max(0.6, joint.settings.dragForce); joint.settings.stiffness = Math.max(1.4, joint.settings.stiffness);}
    }
    vrm.springBoneManager.setInitState();
  }
  vrm.update(0);
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene);
  const height = box.max.y - box.min.y;
  const scale = AVATAR_HEIGHT / Math.max(0.3, height);
  return {
    vrm, clips: t.clips, scale, floor: -box.min.y * scale,
    dispose() {
      // Shared template textures stay alive; only this instance's geometry/skeleton go.
      vrm.scene.traverse(o => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const skinned = o as THREE.SkinnedMesh;
        if (skinned.isSkinnedMesh) skinned.skeleton.boneTexture?.dispose();
      });
      owned.forEach(tx => tx.dispose());
    },
  };
}
