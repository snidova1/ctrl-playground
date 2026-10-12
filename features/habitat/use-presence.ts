'use client';
import {useCallback, useEffect, useRef, type MutableRefObject} from 'react';
import type {HabitatState, PresenceSession} from '@/domain/habitat';
import type {Pose} from '@/features/plaza/types';
import type {CharacterMotion} from '@/features/plaza/characters/catalog';
import {habitatApi, HabitatApiError} from './api';

interface Options {
  latest: MutableRefObject<HabitatState | null>;
  pose: MutableRefObject<Pose>;
  motion: MutableRefObject<CharacterMotion>;
  flags: MutableRefObject<{sitting: boolean; celebrate: boolean; interactedAt: number;speech?:string;speechAt?:number}>;
  onState: (state: HabitatState | null) => void;
  onOnline: (online: boolean) => void;
}
export function useWorldPresence(options: Options) {
  const handlers = useRef(options);
  useEffect(() => {handlers.current = options;});
  const connection = useRef<PresenceSession | null>(null);
  const generation = useRef(0);
  const syncing = useRef(false);
  const superseded = useRef(false);
  const leave = useCallback(() => {
    const old = connection.current;
    connection.current = null;
    generation.current++;
    if (old) void fetch('/api/habitat/leave', {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({worldId: old.worldId, sessionId: old.id}), keepalive: true}).catch(() => {});
  }, []);
  const connect = useCallback(async (id: string) => {
    leave();
    const epoch = generation.current;
    const state = await habitatApi<HabitatState>('join', {id});
    if (epoch !== generation.current) throw new HabitatApiError('PRESENCE_SESSION_STALE', 409, 'This join was superseded by a newer connection.');
    connection.current = state.presenceSession;
    superseded.current = false;
    Object.assign(handlers.current.pose.current, {x: 0, z: 6, angle: Math.PI, moving: false});
    handlers.current.latest.current = state;
    handlers.current.onState(state);
    handlers.current.onOnline(true);
    return state;
  }, [leave]);
  const sync = useCallback(async () => {
    const {latest, pose, motion, flags, onState, onOnline} = handlers.current;
    const world = latest.current?.world;
    if (!world || !latest.current?.profile || syncing.current || superseded.current) return;
    syncing.current = true;
    let epoch = generation.current;
    try {
      if (!connection.current || connection.current.worldId !== world.id || connection.current.expiresAt <= Date.now()) {
        const joining = connect(world.id);
        // connect synchronously starts a new generation. Its own failed join
        // is not stale; only a later independent leave/join invalidates it.
        epoch = generation.current;
        await joining;
        return;
      }
      const session = connection.current;
      const sent = {...pose.current};
      const sequence = session.sequence + 1;
      const next = await habitatApi<HabitatState & {accepted: {x: number; z: number}}>('presence', {
        worldId: world.id, sessionId: session.id, sequence, x: sent.x, z: sent.z, angle: sent.angle,
        motion: {...motion.current, landedAt: Number.isFinite(motion.current.landedAt) ? motion.current.landedAt : 0,
          ...flags.current, moving: sent.moving},
      });
      if (epoch !== generation.current) return;
      connection.current = next.presenceSession;
      pose.current.x += next.accepted.x - sent.x;
      pose.current.z += next.accepted.z - sent.z;
      latest.current = next;
      onState(next);
      onOnline(true);
    } catch (error) {
      if (epoch !== generation.current) return;
      onOnline(false);
      if (error instanceof HabitatApiError) {
        if (error.code === 'STALE_PRESENCE' || error.code === 'PRESENCE_SESSION_STALE') superseded.current = true;
        else if (error.code === 'WORLD_SESSION_EXPIRED') connection.current = null;
        else if ([401, 403, 404].includes(error.status)) {
          leave(); superseded.current = true;
          // Do not keep a revoked private world/render or expired identity in
          // client memory while the server correctly rejects its heartbeats.
          const old = latest.current;
          const cleared = error.status === 401 || !old ? null : {
            ...old, world: null, players: [], states: {}, canEdit: false,
            permissions: null, presenceSession: null,
            worlds: old.worlds.filter(candidate => candidate.id !== world.id),
          };
          latest.current = cleared;
          onState(cleared);
        }
      }
    } finally {syncing.current = false;}
  }, [connect, leave]);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (document.visibilityState === 'visible') await sync();
      if (active) timer = setTimeout(tick, 700);
    };
    timer = setTimeout(tick, 0);
    const visibility = () => {
      if (document.visibilityState === 'hidden') leave();
      else {
        const id = handlers.current.latest.current?.world?.id;
        if (id) {
          const joining = connect(id);
          const epoch = generation.current;
          void joining.catch(() => {
            if (epoch === generation.current) handlers.current.onOnline(false);
          });
        }
      }
    };
    window.addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', visibility);
    return () => {active = false; clearTimeout(timer); window.removeEventListener('pagehide', leave);
      document.removeEventListener('visibilitychange', visibility); leave();};
  }, [sync, connect, leave]);
  return {connect, sync, leave};
}
