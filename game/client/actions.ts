'use client';
import type {Runtime} from './runtime';
import type {Water} from '@/game/core/items';
import {BIRDS, BUGS, ITEMS} from '@/game/core/items';
import {NPC_BY_ID, HOBBIES} from '@/game/core/npcs';
import type {CreatureSpawn} from '@/game/core/spawns';
import {sfx} from './audio';

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export function hobbyReady(rt: Runtime, hobby: 'fishing' | 'bugs' | 'birds' | 'gardening' | 'cooking') {
  const life = rt.ui.get().life;
  if (!life) return false;
  if (life.hobbies[hobby].unlocked) return true;
  const mentor = Object.values(NPC_BY_ID).find(n => n.hobby === hobby);
  const h = HOBBIES.find(x => x.id === hobby);
  rt.toast(mentor ? `Talk to ${mentor.name} to learn ${h?.name}.` : 'Locked for now.', 'info', '🔒');
  rt.emote('?');
  return false;
}

export async function talk(rt: Runtime, npcId: string) {
  const npc = NPC_BY_ID[npcId];
  if (!npc) return;
  // Face the neighbour and swing the camera over your shoulder so both of you are in the shot.
  const t = rt.targets.get(`npc-${npcId}`);
  if (t) {
    rt.player.angle = Math.atan2(t.x - rt.player.pos.x, t.z - rt.player.pos.z);
    rt.camera.yaw = rt.player.angle + Math.PI + 0.65;
  }
  rt.setAnim('talk', 'none', 1600, 'happy');
  await rt.act({type: 'talk', npc: npcId});
}

export async function forage(rt: Runtime, nodeId: string) {
  rt.player.locked = true;
  rt.setAnim('pick', 'none', 1100);
  await wait(520);
  await rt.act({type: 'forage', nodeId});
  rt.player.locked = false;
}

export async function startFishing(rt: Runtime, where: 'town' | 'home', water: Water, target: {x: number; z: number}) {
  if (!hobbyReady(rt, 'fishing') || rt.ui.get().fishing) return;
  rt.player.locked = true;
  rt.player.angle = Math.atan2(target.x - rt.player.pos.x, target.z - rt.player.pos.z);
  rt.setAnim('fish', 'rod', 0, 'focus');
  rt.ui.set({fishing: {phase: 'cast', biteAt: 0, startedAt: performance.now()}, fishTarget: target});
  sfx.swish();
  const events = await rt.act({type: 'cast', where, water, x: target.x, z: target.z});
  const life = rt.ui.get().life;
  if (!events || !life?.fishing) {
    rt.ui.set({fishing: null}); rt.player.locked = false; rt.setAnim('idle', 'none'); return;
  }
  sfx.splash();
  const localBite = life.fishing.biteAt - rt.ui.get().clockOffset;
  rt.ui.set({fishing: {phase: 'wait', biteAt: localBite, startedAt: performance.now()}});
}

/** Called by the fishing ticker / reel button. */
export async function finishFishing(rt: Runtime, success: boolean) {
  if (!rt.ui.get().fishing) return;
  rt.ui.set({fishing: null});
  await rt.act({type: 'reel', success});
  rt.player.locked = false;
  setTimeout(() => {if (!rt.ui.get().fishing) {rt.player.motion.current.tool = 'none'; rt.ui.set({tool: 'none'}); if (rt.player.motion.current.anim === 'fish') rt.player.motion.current.anim = 'idle';}}, 1800);
}

export async function catchBug(rt: Runtime, spawn: CreatureSpawn, onGone: (id: string) => void) {
  if (!hobbyReady(rt, 'bugs')) return;
  rt.player.locked = true;
  rt.player.angle = Math.atan2(spawn.x - rt.player.pos.x, spawn.z - rt.player.pos.z);
  rt.setAnim('net', 'net', 1100, 'focus');
  sfx.swish();
  await wait(380);
  onGone(spawn.id);
  await rt.act({type: 'catch-bug', spawnId: spawn.id});
  rt.player.locked = false;
}

export async function snapBird(rt: Runtime, spawn: CreatureSpawn, framing: number, onGone: (id: string) => void) {
  if (!hobbyReady(rt, 'birds')) return;
  sfx.shutter();
  rt.ui.set({flash: performance.now()});
  if (framing < 0.3) {rt.toast('Get the bird inside the frame!', 'info', '📷'); return;}
  onGone(spawn.id);
  await rt.act({type: 'photo-bird', spawnId: spawn.id, framing});
}

export function creatureName(spawn: CreatureSpawn) {
  return (spawn.kind === 'bug' ? BUGS : BIRDS).find(c => c.id === spawn.species)?.name ?? 'Critter';
}
export function itemName(id: string) {return ITEMS[id]?.name ?? id;}
