'use client';
import {api, ApiError} from '@/lib/api-client';
import {applyLifeAction, createLifeState, normalizeLife, townLevel, LifeError, type LifeAction} from '@/game/core/life';
import {dailyQuests} from '@/game/core/quests';
import {realDay} from '@/game/core/clock';
import {countPlaced, readStoredLayout, starterLayout, type Layout} from '@/game/core/home';
import type {LifeResponse} from '@/game/core/api-types';

export class GameError extends Error {constructor(public code: string, message: string) {super(message);}}

export interface LifeBackend {
  kind: 'server' | 'local';
  load(): Promise<LifeResponse>;
  act(revision: number, action: LifeAction): Promise<LifeResponse>;
}

export const serverLife: LifeBackend = {
  kind: 'server',
  load: () => api<LifeResponse>('life'),
  async act(revision, action) {
    try {return await api<LifeResponse>('life', {method: 'POST', body: {revision, action}});}
    catch (e) {
      if (e instanceof ApiError) throw new GameError(e.code, e.message);
      throw e;
    }
  },
};

const LIFE_KEY = 'willow-preview-life-v1';
const HOME_KEY = 'willow-preview-home-v1';
const LOCAL_ID = 'preview-player';
function readLocal(): ReturnType<typeof createLifeState> {
  try {
    const raw = localStorage.getItem(LIFE_KEY);
    if (raw) return normalizeLife(JSON.parse(raw));
  } catch {/* storage unavailable */}
  return createLifeState(Date.now());
}

/** Wallet-free preview. Same reducer as the Worker, saved only in this browser. */
export const localLife: LifeBackend = {
  kind: 'local',
  async load() {
    const state = readLocal();
    return {state, events: [], serverNow: Date.now(), quests: dailyQuests(LOCAL_ID, realDay(Date.now()), townLevel(state)), profileId: LOCAL_ID};
  },
  async act(_revision, action) {
    const previous = readLocal();
    const placed = countPlaced(readLocalHome());
    try {
      const {state, events} = applyLifeAction(previous, action, Date.now(), Math.random, {profileId: LOCAL_ID, placed});
      try {localStorage.setItem(LIFE_KEY, JSON.stringify(state));} catch {/* storage full */}
      return {state, events, serverNow: Date.now(), quests: dailyQuests(LOCAL_ID, realDay(Date.now()), townLevel(state)), profileId: LOCAL_ID};
    } catch (e) {
      if (e instanceof LifeError) throw new GameError(e.code, e.detail);
      throw e;
    }
  },
};

export function readLocalHome(): Layout {
  try {
    const raw = localStorage.getItem(HOME_KEY);
    if (raw) return readStoredLayout(raw);
  } catch {/* storage unavailable */}
  const layout = starterLayout(() => crypto.randomUUID());
  try {localStorage.setItem(HOME_KEY, JSON.stringify(layout));} catch {/* ignore */}
  return layout;
}
export function writeLocalHome(layout: Layout) {
  try {localStorage.setItem(HOME_KEY, JSON.stringify(layout));} catch {/* ignore */}
}
export function resetPreview() {
  try {localStorage.removeItem(LIFE_KEY); localStorage.removeItem(HOME_KEY); localStorage.removeItem('willow-preview-look-v1');} catch {/* ignore */}
}
