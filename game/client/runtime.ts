'use client';
import * as THREE from 'three';
import type {MutableRefObject} from 'react';
import {createStore} from './store';
import type {AvatarMotion, Tool} from './three/avatar';
import type {Environment} from './three/sky';
import type {LifeBackend} from './backend';
import type {LifeEvent, LifeState, LifeAction} from '@/game/core/life';
import type {QuestDef} from '@/game/core/quests';
import type {PublicProfile, RemotePlayer} from '@/game/core/api-types';
import type {Appearance} from '@/game/core/appearance';
import {GameError} from './backend';
import {sfx} from './audio';
import {ITEMS} from '@/game/core/items';
import {HOBBIES} from '@/game/core/npcs';
import type {CreatureSpawn} from '@/game/core/spawns';

/** 'room' is kept only so old links resolve; the living room is part of the 'home' scene now. */
export type Scene = 'common-ground' | 'town' | 'home' | 'room';
export type Panel = null | 'bag' | 'shop' | 'cook' | 'craft' | 'collection' | 'quests' | 'hobbies' | 'friends' | 'keys' | 'settings' | 'map' | 'wardrobe' | 'mail' | 'home' | 'emotes' | 'renovate';

export interface Target {
  id: string; label: string; icon: string; x: number; z: number; radius: number; priority?: number;
  /** Optional requirement shown when the action is not possible yet. */
  hint?: string;
  run: () => void;
}
export interface Toast {id: number; text: string; icon?: string; tone?: 'good' | 'info' | 'bad' | 'rare'; item?: string}
export interface Dialog {npc: string; line: string; hearts?: number; options?: {label: string; run: () => void}[]}
export interface Catch {item: string; size?: number; first: boolean; quality?: number}

export interface UiState {
  life: LifeState | null; quests: QuestDef[]; profileId: string;
  panel: Panel; panelArg: string | null;
  toasts: Toast[]; dialog: Dialog | null; prompt: Target | null; busy: boolean;
  fishing: null | {phase: 'cast' | 'wait' | 'bite' | 'reel'; biteAt: number; startedAt: number};
  photo: boolean; catchCard: Catch | null; levelUp: {level: number; hobby?: string} | null;
  scene: Scene; zone: string; tool: Tool; profile: PublicProfile | null; players: RemotePlayer[];
  decorating: boolean; loaded: boolean; error: string | null; clockOffset: number;
  fishTarget: {x: number; z: number} | null; flash: number; giftTo: string | null; mailCount: number;
  /** Standing inside the walk-in cottage (same scene as the yard). */
  indoors: boolean;
}

export interface Runtime {
  scene: Scene;
  backend: LifeBackend;
  ui: ReturnType<typeof createStore<UiState>>;
  player: {pos: THREE.Vector3; angle: number; speed: number; motion: MutableRefObject<AvatarMotion>; locked: boolean; look: Appearance};
  input: {x: number; z: number; run: boolean; keys: Set<string>};
  camera: {yaw: number; pitch: number; distance: number; focus: THREE.Vector3};
  env: MutableRefObject<Environment>;
  targets: Map<string, Target>;
  walkable: (x: number, z: number) => boolean;
  /** Solid things the camera must not pass through (walls, trunks). */
  cameraBlocked: (x: number, z: number) => boolean;
  /** Optional box the camera must stay inside (the living room while indoors). */
  cameraClamp?: ((v: THREE.Vector3) => void) | null;
  height: (x: number, z: number) => number;
  bounds: {minX: number; maxX: number; minZ: number; maxZ: number};
  act: (action: LifeAction) => Promise<LifeEvent[] | null>;
  toast: (text: string, tone?: Toast['tone'], icon?: string, item?: string) => void;
  emote: (emote: string, anim?: string, ms?: number) => void;
  setAnim: (anim: string, tool?: Tool, ms?: number, mood?: AvatarMotion['mood']) => void;
  goto: (scene: Scene) => void;
  openPanel: (panel: Panel, arg?: string | null) => void;
  activate: () => void;
  photoTarget?: {spawn: CreatureSpawn; framing: number} | null;
  snap?: () => void;
}

let toastId = 0;
export function createRuntime(opts: {scene: Scene; backend: LifeBackend; look: Appearance; spawn: {x: number; z: number; angle?: number}; walkable: Runtime['walkable']; height: Runtime['height']; bounds: Runtime['bounds']; env: MutableRefObject<Environment>; onGoto: (scene: Scene) => void}): Runtime {
  const motion = {current: {anim: 'idle', speed: 0, tool: 'none' as Tool, actionAt: 0, mood: null}} as MutableRefObject<AvatarMotion>;
  const ui = createStore<UiState>({
    life: null, quests: [], profileId: '', panel: null, panelArg: null, toasts: [], dialog: null, prompt: null, busy: false,
    fishing: null, photo: false, catchCard: null, levelUp: null, scene: opts.scene, zone: '', tool: 'none', profile: null, players: [],
    decorating: false, loaded: false, error: null, clockOffset: 0, fishTarget: null, flash: 0, giftTo: null, mailCount: 0, indoors: false,
  });
  let animTimer: ReturnType<typeof setTimeout> | null = null;
  const rt: Runtime = {
    scene: opts.scene, backend: opts.backend, ui,
    player: {pos: new THREE.Vector3(opts.spawn.x, opts.height(opts.spawn.x, opts.spawn.z), opts.spawn.z), angle: opts.spawn.angle ?? Math.PI, speed: 0, motion, locked: false, look: opts.look},
    input: {x: 0, z: 0, run: false, keys: new Set()},
    camera: {yaw: 0, pitch: 0.3, distance: 5.8, focus: new THREE.Vector3(opts.spawn.x, 1, opts.spawn.z)},
    env: opts.env, targets: new Map(), walkable: opts.walkable, cameraBlocked: () => false, height: opts.height, bounds: opts.bounds,
    toast(text, tone = 'info', icon, item) {
      const t = {id: ++toastId, text, tone, icon, item};
      ui.set(s => ({toasts: [...s.toasts.slice(-3), t]}));
      setTimeout(() => ui.set(s => ({toasts: s.toasts.filter(x => x.id !== t.id)})), tone === 'rare' ? 4200 : 2800);
    },
    emote(emote, anim, ms = 1800) {
      motion.current.emote = emote; motion.current.emoteAt = performance.now();
      if (anim) rt.setAnim(anim, motion.current.tool, ms);
    },
    setAnim(anim, tool, ms, mood) {
      motion.current.anim = anim; motion.current.actionAt = performance.now();
      if (tool !== undefined) {motion.current.tool = tool; ui.set({tool});}
      motion.current.mood = mood ?? null;
      if (animTimer) clearTimeout(animTimer);
      if (ms) animTimer = setTimeout(() => {
        motion.current.anim = 'idle'; motion.current.mood = null; rt.player.locked = false;
        if (!ui.get().fishing && !ui.get().photo) {motion.current.tool = 'none'; ui.set({tool: 'none'});}
      }, ms);
    },
    async act(action) {
      const life = ui.get().life;
      if (!life || ui.get().busy) return null;
      ui.set({busy: true});
      try {
        const res = await opts.backend.act(life.revision, action);
        ui.set({life: res.state, quests: res.quests, clockOffset: res.serverNow - Date.now()});
        celebrate(rt, res.events);
        return res.events;
      } catch (e) {
        if (e instanceof GameError && e.code === 'LIFE_EDIT_CONFLICT') {
          const fresh = await opts.backend.load().catch(() => null);
          if (fresh) ui.set({life: fresh.state, quests: fresh.quests});
        }
        rt.toast(e instanceof Error ? e.message : 'Something went wrong.', 'bad');
        sfx.fail();
        return null;
      } finally {ui.set({busy: false});}
    },
    goto(scene) {opts.onGoto(scene);},
    openPanel(panel, arg = null) {
      if (panel) sfx.open(); else sfx.tap();
      ui.set({panel, panelArg: arg});
    },
    activate() {
      const target = ui.get().prompt;
      if (!target || ui.get().busy || rt.player.locked) return;
      sfx.tap();
      target.run();
    },
  };
  return rt;
}

/** Turn server events into feedback: toasts, catch cards, faces and gestures. */
function celebrate(rt: Runtime, events: LifeEvent[]) {
  for (const e of events) {
    switch (e.type) {
      case 'caught': {
        const item = ITEMS[e.item];
        const rare = (item?.rarity ?? 1) >= 3 || e.first;
        rt.ui.set({catchCard: {item: e.item, size: e.size, first: e.first}});
        // Hold the catch up high, like a proud angler.
        if (item?.kind === 'fish') rt.player.motion.current.hold = {item: e.item, size: e.size ?? 30, until: performance.now() + 2600};
        rt.setAnim('cheer', rt.player.motion.current.tool, 1700, 'happy');
        rt.emote(rare ? 'wow' : 'star');
        if (rare) sfx.success(); else sfx.coin();
        break;
      }
      case 'photo': {
        rt.ui.set({catchCard: {item: e.item, first: e.first, quality: e.quality}});
        rt.emote('star');
        sfx.success();
        break;
      }
      case 'escaped': {
        const text = e.reason === 'early' ? 'Too early! It got scared away.' : e.reason === 'late' ? 'Too slow… it swam off.' : e.reason === 'flew' ? 'Missed! It fluttered away.' : 'The line snapped free!';
        rt.toast(text, 'bad', '💧');
        rt.setAnim('idle', 'none', 1500, 'sad');
        sfx.fail();
        break;
      }
      case 'gained': {
        const kind = ITEMS[e.item]?.kind;
        if (kind !== 'fish' && kind !== 'bug') rt.toast(`+${e.count} ${ITEMS[e.item]?.name ?? e.item}`, 'good', undefined, e.item);
        break;
      }
      case 'coins': if (e.amount > 0) {rt.toast(`+${e.amount} coins`, 'good', '💰'); sfx.coin();} break;
      case 'level': rt.ui.set({levelUp: {level: e.level}}); rt.setAnim('cheer', undefined, 1800, 'happy'); rt.emote('star'); sfx.levelUp(); break;
      case 'hobby-level': rt.ui.set({levelUp: {level: e.level, hobby: HOBBIES.find(h => h.id === e.hobby)?.name}}); sfx.levelUp(); break;
      case 'unlock': rt.toast(`New hobby: ${HOBBIES.find(h => h.id === e.hobby)?.name}!`, 'rare', '🎉'); rt.emote('wow', 'cheer', 1600); sfx.success(); break;
      case 'energy': rt.toast(`+${e.amount} energy`, 'good', '⚡'); rt.setAnim('eat', 'none', 1200, 'happy'); break;
      case 'quest': rt.toast('Request complete!', 'rare', '📜'); rt.emote('heart', 'cheer', 1500); break;
      case 'dialog': {
        rt.ui.set({dialog: {npc: e.npc, line: e.line, hearts: e.hearts}});
        rt.setAnim('wave', 'none', 1600, 'happy');
        break;
      }
    }
  }
}
