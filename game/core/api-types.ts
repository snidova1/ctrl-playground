import type {Appearance} from './appearance';
import type {Layout} from './home';
import type {LifeEvent, LifeState, Plot} from './life';
import type {QuestDef} from './quests';

export interface PublicProfile {id: string; name: string; appearance: Appearance}
export type Anim = 'idle' | 'walk' | 'run' | 'sit' | 'fish' | 'net' | 'camera' | 'water' | 'wave' | 'cheer' | 'eat';
export const ANIMS: Anim[] = ['idle', 'walk', 'run', 'sit', 'fish', 'net', 'camera', 'water', 'wave', 'cheer', 'eat'];
export interface PlayerPose {x: number; z: number; angle: number; anim: Anim}
export interface RemotePlayer extends PublicProfile, PlayerPose {emote: string; emoteAt: number; inside?: boolean; friend?: boolean}

export interface HomePermissions {role: 'owner' | 'editor' | 'friend' | 'visitor'; canVisit: boolean; canEdit: boolean; canManage: boolean}
export interface HomeWorld {id: string; ownerId: string; ownerName: string; name: string; visibility: 'public' | 'private'; revision: number; layout: Layout}
export interface HabitatState {
  profile: PublicProfile | null;
  homeId: string | null;
  world: HomeWorld | null;
  permissions: HomePermissions | null;
  players: RemotePlayer[];
  presenceSession: {id: string; worldId: string; sequence: number} | null;
  worlds: {id: string; name: string; owner: string; visibility: 'public' | 'private'}[];
  /** Owner garden as seen by visitors; owners read their own life state instead. */
  garden: Pick<Plot, 'crop' | 'waters' | 'readyAt'>[] | null;
  wallet: string;
}
export interface LifeResponse {state: LifeState; events: LifeEvent[]; serverNow: number; quests: QuestDef[]; profileId: string}
export interface FriendEntry {id: string; name: string; appearance: Appearance; online: boolean; homeId: string | null; since: number}
export interface FriendsResponse {
  friends: FriendEntry[];
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  mail: {id: string; from: string; fromName: string; item: string; quantity: number; note: string; createdAt: number}[];
}
