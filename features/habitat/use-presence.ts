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
  const pendingSync = useRef<Promise<void>|null>(null);
  const mutating = useRef(false);
  const travelling = useRef(false);
  const joining = useRef<number | null>(null);
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
    joining.current = epoch;
    let state: HabitatState;
    try {state = await habitatApi<HabitatState>('join', {id});}
    catch(error){
      // A timed-out join may already have committed on the server. Never let
      // the next heartbeat silently join the previously displayed world and
      // replace that destination. An explicit retry establishes a fresh session.
      if(epoch===generation.current){superseded.current=true;handlers.current.onOnline(false);}
      throw error;
    }
    finally {if (joining.current === epoch) joining.current = null;}
    if (epoch !== generation.current) throw new HabitatApiError('PRESENCE_SESSION_STALE', 409, 'This join was superseded by a newer connection.');
    connection.current = state.presenceSession;
    superseded.current = false;
    Object.assign(handlers.current.pose.current, {x: 0, z: 6, angle: Math.PI, moving: false});
    handlers.current.latest.current = state;
    handlers.current.onState(state);
    handlers.current.onOnline(true);
    return state;
  }, [leave]);
  const performSync = useCallback(async (foreground=false) => {
    const {latest, pose, motion, flags, onState, onOnline} = handlers.current;
    const world = latest.current?.world;
    if (!world || !latest.current?.profile || syncing.current || joining.current !== null || travelling.current || mutating.current&&!foreground || superseded.current) return;
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
  const sync=useCallback(()=>{
    if(pendingSync.current)return pendingSync.current;
    const promise=performSync();pendingSync.current=promise;
    void promise.finally(()=>{if(pendingSync.current===promise)pendingSync.current=null;});
    return promise;
  },[performSync]);
  const mutate=useCallback(async <T,>(path:string,data:Record<string,unknown>):Promise<T>=>{
    if(mutating.current||travelling.current)throw new Error('Another world action is still in progress.');
    mutating.current=true;
    try{
      if(pendingSync.current)await pendingSync.current;
      await performSync(true);
      const session=connection.current,epoch=generation.current;
      if(!session||superseded.current)throw new HabitatApiError('WORLD_SESSION_EXPIRED',409,'Rejoin before interacting.');
      const result=await habitatApi<T>(path,{...data,...('sessionId' in data?{sessionId:session.id}:{})});
      if(epoch!==generation.current)throw new HabitatApiError('PRESENCE_SESSION_STALE',409,'World changed during this interaction.');
      const response=result as {state?:HabitatState;town?:HabitatState['town']};
      const next=response.state??(response.town&&handlers.current.latest.current?{...handlers.current.latest.current,town:response.town}:null);
      if(next){
        if(response.state){
          connection.current=next.presenceSession;
          const self=next.players.find(p=>p.id===next.profile?.id);
          if(self)Object.assign(handlers.current.pose.current,{x:self.x,z:self.z,angle:self.angle,moving:false});
        }
        handlers.current.latest.current=next;handlers.current.onState(next);
      }
      return result;
    }finally{mutating.current=false;}
  },[performSync]);
  const travel = useCallback(async (id:string,kind:'district'|'venue'|'exit'='district') => {
    const current=connection.current;
    if(!current || superseded.current)throw new HabitatApiError('WORLD_SESSION_EXPIRED',409,'Rejoin the world before travelling.');
    // Serialize against presence heartbeats so a slow reply never restores the old position.
    travelling.current=true;
    const generationAtStart=generation.current;
    try{
      for(let tries=0;syncing.current&&tries<30;tries++)await new Promise<void>(resolve=>setTimeout(resolve,60));
      if(syncing.current)throw new Error('Please wait for your connection to catch up.');
      const next=await habitatApi<HabitatState&{accepted:{x:number;z:number}}>(kind==='district'?'town-travel':kind==='venue'?'town-venue/enter':'town-venue/exit',{id,sessionId:current.id});
      if(generation.current!==generationAtStart)return;
      Object.assign(handlers.current.pose.current,{x:next.accepted.x,z:next.accepted.z,moving:false});
      handlers.current.latest.current=next;
      connection.current=next.presenceSession;
      handlers.current.onState(next);
      handlers.current.onOnline(true);
    }finally{travelling.current=false;}
  },[]);
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
  return {connect, sync, leave, travel,mutate};
}
