'use client';
import {api, ApiError} from '@/lib/api-client';
import type {HabitatState} from '@/game/core/api-types';
import type {Layout} from '@/game/core/home';
import {readLocalHome, writeLocalHome, GameError} from './backend';

export interface HomeView {
  worldId: string; name: string; ownerName: string; visibility: 'public' | 'private'; revision: number; layout: Layout;
  canEdit: boolean; isOwner: boolean; garden: HabitatState['garden']; state: HabitatState | null;
}
export interface HomeBackend {
  kind: 'server' | 'local';
  load(worldId?: string): Promise<HomeView>;
  save(view: HomeView, layout: Layout): Promise<HomeView>;
}

function fromState(state: HabitatState): HomeView {
  if (!state.world || !state.permissions) throw new GameError('HOME_UNAVAILABLE', 'This home is unavailable.');
  return {
    worldId: state.world.id, name: state.world.name, ownerName: state.world.ownerName, visibility: state.world.visibility, revision: state.world.revision,
    layout: state.world.layout, canEdit: state.permissions.canEdit, isOwner: state.permissions.role === 'owner', garden: state.garden, state,
  };
}

export const serverHome: HomeBackend = {
  kind: 'server',
  async load(worldId) {
    try {
      let state = await api<HabitatState>(worldId ? `habitat/worlds/${worldId}` : 'habitat/state');
      if (!worldId && !state.homeId) state = await api<HabitatState>('habitat/home', {method: 'POST', body: {}});
      // Older homes from the previous build are refurnished once with the starter set.
      if (!worldId && state.world && state.world.layout.length === 0) state = await api<HabitatState>('habitat/home', {method: 'POST', body: {}});
      return fromState(state);
    } catch (e) {
      if (e instanceof ApiError) throw new GameError(e.code, e.message);
      throw e;
    }
  },
  async save(view, layout) {
    try {
      return fromState(await api<HabitatState>('habitat/save', {method: 'POST', body: {worldId: view.worldId, revision: view.revision, layout}}));
    } catch (e) {
      if (e instanceof ApiError) throw new GameError(e.code, e.message);
      throw e;
    }
  },
};

export const localHome: HomeBackend = {
  kind: 'local',
  async load() {
    return {worldId: 'preview-home', name: 'My Cozy Home', ownerName: 'You', visibility: 'private', revision: 0, layout: readLocalHome(), canEdit: true, isOwner: true, garden: null, state: null};
  },
  async save(view, layout) {
    writeLocalHome(layout);
    return {...view, layout, revision: view.revision + 1};
  },
};
