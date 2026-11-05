'use client';
import {useEffect, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import type {Runtime, Target} from '../runtime';
import {Avatar} from './avatar';
import {sfx} from '../audio';

const WALK = 3.1, RUN = 5.8, SNEAK = 1.35;

/** Local player: camera-relative movement, collisions, follow camera, interaction picking. */
export function Player({rt, name}: {rt: Runtime; name?: string}) {
  const group = useRef<THREE.Group>(null);
  const {camera, gl, scene} = useThree();
  useEffect(() => {if (new URLSearchParams(location.search).has('director')) (window as unknown as {__three?: unknown}).__three = {scene, camera, THREE};}, [scene, camera]);
  const pick = useRef(0);
  const stepT = useRef(0);
  const camPos = useRef(new THREE.Vector3());
  const lastDrag = useRef(0);

  // Drag to orbit, wheel to zoom. Joystick/UI elements stop propagation themselves.
  useEffect(() => {
    const el = gl.domElement;
    let dragging: {id: number; x: number; y: number} | null = null;
    const pinch = new Map<number, {x: number; y: number}>();
    let pinchDist = 0;
    const down = (e: PointerEvent) => {
      pinch.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pinch.size === 2) {const [a, b] = [...pinch.values()]; pinchDist = Math.hypot(a.x - b.x, a.y - b.y); dragging = null; return;}
      dragging = {id: e.pointerId, x: e.clientX, y: e.clientY};
    };
    const move = (e: PointerEvent) => {
      if (pinch.has(e.pointerId)) pinch.set(e.pointerId, {x: e.clientX, y: e.clientY});
      if (pinch.size === 2) {
        const [a, b] = [...pinch.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (rt.ui.get().photo) rt.camera.fov = THREE.MathUtils.clamp((rt.camera.fov ?? 50) * (pinchDist / Math.max(1, d)), 22, 62);
        else rt.camera.distance = THREE.MathUtils.clamp(rt.camera.distance * (pinchDist / Math.max(1, d)), 3, 12);
        pinchDist = d; return;
      }
      if (!dragging || dragging.id !== e.pointerId) return;
      const dx = e.clientX - dragging.x, dy = e.clientY - dragging.y;
      dragging.x = e.clientX; dragging.y = e.clientY;
      rt.camera.yaw -= dx * 0.006; lastDrag.current = performance.now();
      const photo = rt.ui.get().photo;
      const view = rt.ui.get().photoView;
      // Photo mode looks around freely, but never straight up or down.
      rt.camera.pitch = THREE.MathUtils.clamp(rt.camera.pitch + dy * 0.004, photo ? (view === 'selfie' ? -0.25 : -0.75) : 0.05, photo ? (view === 'selfie' ? 0.5 : 0.65) : 1.05);
    };
    const up = (e: PointerEvent) => {pinch.delete(e.pointerId); if (dragging?.id === e.pointerId) dragging = null;};
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      if (rt.ui.get().photo) rt.camera.fov = THREE.MathUtils.clamp((rt.camera.fov ?? 50) + e.deltaY * 0.02, 22, 62); // zoom lens
      else rt.camera.distance = THREE.MathUtils.clamp(rt.camera.distance + e.deltaY * 0.006, 3, 12);
    };
    el.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, {passive: false});
    return () => {
      el.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [gl, rt]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = rt.player, ui = rt.ui.get();
    const k = rt.input.keys;
    let ix = rt.input.x, iz = rt.input.z;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz += 1;
    const mag = Math.min(1, Math.hypot(ix, iz));
    const blocked = p.locked || !!ui.panel || !!ui.dialog || !!ui.fishing || ui.decorating;
    const motion = p.motion.current;
    // Standing up: step out in front of the seat, then walk on as normal.
    if (p.seat && ((!blocked && mag > 0.08) || (motion.anim !== 'sit' && motion.anim !== 'lie'))) {
      p.pos.set(p.seat.standX, rt.height(p.seat.standX, p.seat.standZ), p.seat.standZ);
      p.seat = null;
      if (motion.anim === 'sit') {motion.anim = 'idle'; motion.mood = null;}
    }
    if (!blocked && mag > 0.08) {
      const yaw = rt.camera.yaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const dx = rx * ix - fx * iz, dz = rz * ix - fz * iz;
      const running = (rt.input.run || k.has('ShiftLeft') || k.has('ShiftRight')) && !ui.photo;
      const sneaking = !running && (mag < 0.5 || k.has('ControlLeft') || k.has('KeyC') || motion.tool === 'net');
      const speed = ui.photo ? 1.6 : running ? RUN : sneaking ? SNEAK : WALK;
      const len = Math.hypot(dx, dz) || 1;
      const vx = (dx / len) * speed * mag, vz = (dz / len) * speed * mag;
      const nx = p.pos.x + vx * dt, nz = p.pos.z + vz * dt;
      if (rt.walkable(nx, p.pos.z)) p.pos.x = nx;
      if (rt.walkable(p.pos.x, nz)) p.pos.z = nz;
      const target = Math.atan2(vx, vz);
      let diff = target - p.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (!ui.photo) p.angle += diff * Math.min(1, dt * 12);
      p.speed = speed * mag;
      const anim = running ? 'run' : sneaking ? 'sneak' : 'walk';
      if (['idle', 'walk', 'run', 'sneak', 'sit', 'crouch'].includes(motion.anim)) {motion.anim = anim; motion.mood = null;}
      motion.speed = p.speed;
      stepT.current -= dt * (running ? 1.6 : 1);
      if (stepT.current < 0) {stepT.current = 0.36; sfx.step();}
    } else {
      p.speed = 0;
      if (['walk', 'run', 'sneak'].includes(motion.anim)) motion.anim = motion.tool === 'net' ? 'crouch' : 'idle';
    }
    if (ui.photo) p.angle = rt.camera.yaw + Math.PI;
    p.pos.y += (rt.height(p.pos.x, p.pos.z) + (p.seat?.lift ?? 0) - p.pos.y) * Math.min(1, dt * 18);
    if (group.current) {
      group.current.position.copy(p.pos);
      // Lying in bed: tip back onto the mattress (pitch applied before the heading).
      group.current.rotation.order = 'YXZ';
      group.current.rotation.y = p.angle;
      group.current.rotation.x += ((p.seat?.lie ? -Math.PI / 2 : 0) - group.current.rotation.x) * Math.min(1, dt * 10);
    }

    // Camera.
    const photo = ui.photo;
    const f = rt.camera.focus;
    // Over-the-shoulder follow: the camera eases in behind the character while it walks,
    // unless the player has just dragged the view or is walking back toward the lens.
    if (!photo && p.speed > 0.5 && performance.now() - lastDrag.current > 1600) {
      let diff = (p.angle + Math.PI) - rt.camera.yaw;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      if (Math.abs(diff) < 2.3) rt.camera.yaw += diff * Math.min(1, dt * 1.1);
    }
    const snap = !!rt.camera.snap;
    rt.camera.snap = false;
    const view = ui.photoView;
    if (group.current) group.current.visible = !(photo && view === 'first');
    f.lerp(new THREE.Vector3(p.pos.x, p.pos.y + (photo ? 1.25 : p.seat?.lie ? 0.3 : 1.05), p.pos.z), snap ? 1 : Math.min(1, dt * (photo ? 14 : 8)));
    const cam = camera as THREE.PerspectiveCamera;
    const zoom = (fov: number) => {if (Math.abs(cam.fov - fov) > 0.1) {cam.fov += (fov - cam.fov) * Math.min(1, dt * 8); cam.updateProjectionMatrix();}};
    if (photo) {
      // First person: the lens sits at the eyes. Selfie: arm's length in front, looking back at the face.
      const yaw = rt.camera.yaw, pitch = rt.camera.pitch;
      const dir = new THREE.Vector3(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
      const eye = new THREE.Vector3(p.pos.x, p.pos.y + 1.22, p.pos.z);
      const want = view === 'first' ? eye.clone().addScaledVector(dir, 0.18) : eye.clone().addScaledVector(new THREE.Vector3(dir.x, -dir.y * 0.6 + 0.12, dir.z).normalize(), 2.1);
      const ground = rt.height(want.x, want.z) + 0.3;
      if (want.y < ground) want.y = ground;
      camPos.current.lerp(want, snap ? 1 : Math.min(1, dt * 16));
      camera.position.copy(camPos.current);
      camera.lookAt(view === 'first' ? camPos.current.clone().addScaledVector(dir, 10) : eye.clone().add(new THREE.Vector3(0, -0.2, 0)));
      zoom(view === 'first' ? (rt.camera.fov ?? 50) : Math.min(62, (rt.camera.fov ?? 50) + 6));
    } else {
    let dist = rt.camera.distance;
    {
      // Pull in when a wall or trunk sits between the character and the lens.
      for (let i = 1; i <= 14; i++) {
        const d = (i / 14) * dist;
        const cx = f.x + Math.sin(rt.camera.yaw) * Math.cos(rt.camera.pitch) * d, cz = f.z + Math.cos(rt.camera.yaw) * Math.cos(rt.camera.pitch) * d;
        if (rt.cameraBlocked(cx, cz)) {dist = Math.max(1.4, d - 0.5); break;}
      }
    }
    const pitch = rt.camera.pitch;
    const yaw = rt.camera.yaw;
    const want = new THREE.Vector3(f.x + Math.sin(yaw) * Math.cos(pitch) * dist, f.y + Math.sin(pitch) * dist, f.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    const ground = rt.height(want.x, want.z) + 0.45;
    if (want.y < ground) want.y = ground;
    rt.cameraClamp?.(want);
    camPos.current.lerp(want, Math.min(1, dt * 7));
    if (snap || camPos.current.lengthSq() === 0) camPos.current.copy(want);
    camera.position.copy(camPos.current);
    // Aim a little above the head so the character sits in the lower third and the horizon shows.
    camera.lookAt(new THREE.Vector3(f.x - Math.sin(yaw) * 1.2, f.y + 0.35 + dist * 0.03, f.z - Math.cos(yaw) * 1.2));
    zoom(50);
    }

    // Interaction target, a few times a second.
    pick.current -= dt;
    if (pick.current < 0) {
      pick.current = 0.15;
      let best: Target | null = null, bestScore = Infinity;
      for (const t of rt.targets.values()) {
        if (t.when && !t.when()) continue;
        const dx = Math.max(0, Math.abs(t.x - p.pos.x) - (t.hx ?? 0)), dz = Math.max(0, Math.abs(t.z - p.pos.z) - (t.hz ?? 0));
        const d = Math.hypot(dx, dz);
        if (d > t.radius) continue;
        // Prefer what the player is looking at; among neighbours, the one whose centre is closest.
        const centre = Math.hypot(t.x - p.pos.x, t.z - p.pos.z);
        const facing = Math.cos(Math.atan2(t.x - p.pos.x, t.z - p.pos.z) - p.angle);
        const score = d + centre * 0.3 - facing * 1.0 - (t.priority ?? 0);
        if (score < bestScore) {bestScore = score; best = t;}
      }
      if (best?.id !== ui.prompt?.id || best?.label !== ui.prompt?.label) rt.ui.set({prompt: best});
    }
  });

  return <group ref={group}>
    <Avatar look={rt.player.look} motion={rt.player.motion} />
  </group>;
}
