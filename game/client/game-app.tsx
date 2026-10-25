'use client';
import {Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import * as THREE from 'three';
import {api, ApiError} from '@/lib/api-client';
import {COMMON_GATE, HOME_STOP, SPAWN_POINT, TOWN_BOUNDS, HOME_BOUNDS, heightAt, townWalkable, blockedByCollider, BUILDINGS, TREES} from '@/game/core/map';

const CAMERA_COLLIDERS = [...BUILDINGS.map(b => ({x: b.x, z: b.z, w: b.w, d: b.d})), ...TREES.map(t => ({x: t.x, z: t.z, r: 0.35 * t.s}))];
import {normalizeAppearance, randomAppearance, type Appearance} from '@/game/core/appearance';
import {plotCount, type LifeState} from '@/game/core/life';
import {GAME_DAY_MS, townHour} from '@/game/core/clock';
import type {Layout} from '@/game/core/home';
import type {PublicProfile, RemotePlayer, HabitatState} from '@/game/core/api-types';
import {createRuntime, type Runtime, type Scene} from './runtime';
import {useStore} from './store';
import {localLife, serverLife, resetPreview} from './backend';
import {localHome, serverHome, type HomeView} from './home-backend';
import {SkyAndLights, type Environment} from './three/sky';
import {Effects} from './three/effects';
import {skyAt} from './three/palette';
import {TownWorld} from './three/town';
import {HomeWorld, homeWalkable, type Decor} from './three/home';
import {avatarLoads, preloadAvatars} from './three/vrm';
import {Hud} from './ui/hud';
import {BagPanel, CollectionPanel, CookPanel, CraftPanel, EmotesPanel, HobbiesPanel, MapPanel, QuestsPanel, SettingsPanel, ShopPanel, PanelFrame} from './ui/panels';
import {FriendsPanel, KeysPanel} from './ui/social';
import {AvatarEditor} from './ui/creator';
import {DecorTray} from './ui/decor';
import {RenovateTray} from './ui/renovate';
import {DEFAULT_HOUSE, type House} from '@/game/core/house';
import {homeHeight} from '@/game/core/cottage';
import './ui/game.css';

export type Variant = 'common-ground' | 'public' | 'preview';
const LOOK_KEY = 'willow-preview-look-v1';
const GUEST_KEY = 'willow-guest-seed-v1';
const QUALITY_KEY = 'willow-quality-v1';

function safeGet(key: string) {try {return localStorage.getItem(key);} catch {return null;}}
function safeSet(key: string, value: string) {try {localStorage.setItem(key, value);} catch {/* private mode */}}

interface Props {variant: Variant; startScene?: 'town' | 'home'; visit?: string | null; overlay?: React.ReactNode}

export function GameApp({variant, startScene = 'town', visit = null, overlay}: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [needsCreator, setNeedsCreator] = useState(false);
  const [error, setError] = useState('');
  const [quality, setQualityState] = useState<'high' | 'low'>('high');
  useEffect(() => {
    const saved = safeGet(QUALITY_KEY);
    setQualityState(saved === 'low' || saved === 'high' ? saved : matchMedia('(pointer: coarse)').matches ? 'low' : 'high');
    preloadAvatars();
  }, []);
  const setQuality = (q: 'high' | 'low') => {setQualityState(q); safeSet(QUALITY_KEY, q);};

  // Identity: guests get a random fixed look; preview keeps a local look; public uses the signed-wallet profile.
  useEffect(() => {
    if (variant === 'common-ground') {
      let seed = safeGet(GUEST_KEY);
      if (!seed) {seed = crypto.randomUUID(); safeSet(GUEST_KEY, seed);}
      setProfile({id: 'guest', name: 'Guest', appearance: randomAppearance(seed)});
      return;
    }
    if (variant === 'preview') {
      const saved = safeGet(LOOK_KEY);
      if (saved) {
        try {const p = JSON.parse(saved) as PublicProfile; setProfile({...p, appearance: normalizeAppearance(p.appearance, p.id)}); return;} catch {/* fall through */}
      }
      setNeedsCreator(true);
      return;
    }
    api<{profile: PublicProfile | null}>('habitat/profile').then(r => {if (r.profile) setProfile(r.profile); else setNeedsCreator(true);})
      .catch(e => {
        if (e instanceof ApiError && e.status === 401) window.location.href = '/?connect=1';
        else setError('We could not load your avatar. Please refresh.');
      });
  }, [variant]);

  if (error) return <div className="wc-root"><div className="wc-loading"><div className="leaf">🍂</div>{error}</div></div>;
  if (needsCreator) return <Creator variant={variant} onDone={p => {setProfile(p); setNeedsCreator(false);}} />;
  if (!profile) return <div className="wc-root"><div className="wc-loading"><div className="leaf">🍃</div>Getting ready…</div></div>;
  return <Game variant={variant} profile={profile} setProfile={setProfile} startScene={startScene} visit={visit} quality={quality} setQuality={setQuality} overlay={overlay} />;
}

function Creator({variant, onDone}: {variant: Variant; onDone: (p: PublicProfile) => void}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const initial = useMemo(() => randomAppearance(crypto.randomUUID()), []);
  const save = async (look: Appearance) => {
    setBusy(true); setErr('');
    try {
      if (variant === 'preview') {
        const p = {id: 'preview-player', name: name.trim(), appearance: look};
        safeSet(LOOK_KEY, JSON.stringify(p)); onDone(p);
      } else {
        const r = await api<{profile: PublicProfile}>('habitat/public-profile', {method: 'POST', body: {name: name.trim(), appearance: look}});
        onDone(r.profile);
      }
    } catch (e) {setErr(e instanceof Error ? e.message : 'Could not save.');} finally {setBusy(false);}
  };
  return <div className="wc-root" style={{display: 'grid', placeItems: 'center', background: 'linear-gradient(#bfe3f7,#e9f6ff 60%,#c8e8a8)'}}>
    <section className="wc-panel" style={{maxHeight: '96vh'}}>
      <header className="wc-panel-head"><span style={{fontSize: 28}}>✨</span><h2>Create your resident</h2></header>
      <div className="wc-panel-body">
        <AvatarEditor initial={initial} inventory={null} name={name} onName={setName} onSave={save} saveLabel="Move in!" busy={busy} />
        {err && <p className="form-error" style={{color: '#b5523f', fontWeight: 800}}>{err}</p>}
      </div>
    </section>
  </div>;
}

function useKeyboard(rt: Runtime) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      rt.input.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Space') {e.preventDefault(); if (rt.ui.get().photo) rt.snap?.(); else rt.activate();}
      if (e.code === 'Escape') rt.ui.set({panel: null, dialog: null, photo: false, catchCard: null});
      if (e.code === 'KeyB') rt.openPanel(rt.ui.get().panel === 'bag' ? null : 'bag');
      if (e.code === 'KeyM') rt.openPanel(rt.ui.get().panel === 'map' ? null : 'map');
    };
    const up = (e: KeyboardEvent) => rt.input.keys.delete(e.code);
    const blur = () => rt.input.keys.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => {window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur);};
  }, [rt]);
}

/** Cozy loading screen until the town's models and the first avatars are ready (25 s cap). */
function LoadingVeil({rt}: {rt: Runtime}) {
  const [state, setState] = useState({ready: false, done: 0, pending: 0});
  useEffect(() => {
    const started = performance.now();
    const check = () => {
      const ready = avatarLoads.done > 0 && avatarLoads.pending === 0 && rt.targets.size > 0;
      setState(s => (s.ready ? s : {ready: ready || performance.now() - started > 25000, done: avatarLoads.done, pending: avatarLoads.pending}));
    };
    avatarLoads.listeners.add(check);
    const id = setInterval(check, 400);
    return () => {avatarLoads.listeners.delete(check); clearInterval(id);};
  }, [rt]);
  if (state.ready) return null;
  const total = state.done + state.pending;
  const pct = total ? Math.round((state.done / total) * 100) : 10;
  return <div className="wc-loading" style={{zIndex: 25}}>
    <div className="leaf">🌷</div>
    <div style={{fontSize: 20}}>Waking up the town…</div>
    <div style={{width: 220, height: 10, borderRadius: 6, background: '#efe2cc', overflow: 'hidden'}}><div style={{width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#8fd6c0,#ffd36b)', transition: 'width .4s'}} /></div>
    <div style={{fontSize: 12, color: '#8a7560'}}>Neighbours are getting dressed ({state.done}/{total || '…'})</div>
  </div>;
}

function spawnFor(scene: Scene, from: Scene | null) {
  if (scene === 'home' || scene === 'room') return {x: 0, z: 11.5, angle: Math.PI};
  if (scene === 'common-ground') return {x: 0, z: 12, angle: Math.PI};
  return from === 'home' ? {x: HOME_STOP.x, z: HOME_STOP.z + 1.2, angle: Math.PI} : from === 'common-ground' ? {x: COMMON_GATE.x, z: COMMON_GATE.z + 1.4, angle: Math.PI} : {...SPAWN_POINT, angle: Math.PI};
}

function Game({variant, profile, setProfile, startScene, visit, quality, setQuality, overlay}: Props & {profile: PublicProfile; setProfile: (p: PublicProfile) => void; quality: 'high' | 'low'; setQuality: (q: 'high' | 'low') => void}) {
  const server = variant === 'public';
  const initialScene: Scene = variant === 'common-ground' ? 'common-ground' : startScene === 'home' ? 'home' : 'town';
  const env = useRef<Environment>({sky: skyAt(12, 'sunny'), hour: 12, night: 0});
  const [scene, setScene] = useState<Scene>(initialScene);
  const [fade, setFade] = useState(false);
  const [home, setHome] = useState<HomeView | null>(null);
  const [layout, setLayout] = useState<Layout>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [decor, setDecor] = useState<Decor>({selected: null, placing: null, rotation: 0});
  const [players, setPlayers] = useState<RemotePlayer[]>([]);
  const [housePreview, setHousePreview] = useState<House | null>(null);
  const gotoRef = useRef<(s: Scene) => void>(() => undefined);
  const rt = useMemo(() => createRuntime({
    scene: initialScene, backend: server ? serverLife : localLife, look: profile.appearance, spawn: spawnFor(initialScene, null),
    walkable: initialScene === 'common-ground' ? (x, z) => Math.hypot(x, z) < 16.8 && townWalkable(x, z) : townWalkable,
    height: initialScene === 'home' ? () => 0 : heightAt, bounds: TOWN_BOUNDS, env, onGoto: s => gotoRef.current(s),
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  useKeyboard(rt);
  useEffect(() => {if (initialScene !== 'home') rt.cameraBlocked = (x, z) => blockedByCollider(x, z, CAMERA_COLLIDERS, 0.25);}, [rt, initialScene]);
  // Read-only QA handle for automated browser checks (no privileged actions).
  useEffect(() => {(window as unknown as {__willow?: Runtime}).__willow = rt;}, [rt]);
  const ui = rt.ui;
  const panel = useStore(ui, s => s.panel);
  const panelArg = useStore(ui, s => s.panelArg);
  const decorating = useStore(ui, s => s.decorating);
  const life = useStore(ui, s => s.life);
  const indoors = useStore(ui, s => s.indoors);
  useEffect(() => {rt.player.look = profile.appearance;}, [rt, profile]);

  // Life state.
  useEffect(() => {
    if (variant === 'common-ground') {ui.set({loaded: true}); return;}
    rt.backend.load().then(r => ui.set({life: r.state, quests: r.quests, profileId: r.profileId, clockOffset: r.serverNow - Date.now(), loaded: true}))
      .catch(() => ui.set({error: 'Your town life could not be loaded.'}));
  }, [rt, ui, variant]);

  const homeBackend = server ? serverHome : localHome;
  const loadHome = useCallback(async (worldId?: string) => {
    const view = await homeBackend.load(worldId);
    setHome(view); setLayout(view.layout); setDirty(false);
    return view;
  }, [homeBackend]);

  // Scene switching with a soft fade, repositioning the player and swapping collision.
  const goto = useCallback(async (target: Scene, worldId?: string) => {
    // The living room is inside the yard scene now; old 'room' requests just go home.
    const next: Scene = target === 'room' ? 'home' : target;
    if (next === 'home' && scene === 'home' && !worldId && home) return;
    if (next === 'common-ground' && variant !== 'common-ground') {window.location.href = '/'; return;}
    if (next === 'town' && variant === 'common-ground') {window.dispatchEvent(new Event('willow:join')); return;}
    setFade(true);
    await new Promise(r => setTimeout(r, 280));
    let view = home;
    if (next === 'home') {
      if (!view || worldId || scene === 'town') {
        try {view = await loadHome(worldId ?? (visit && !view ? visit : undefined));} catch (e) {rt.toast(e instanceof Error ? e.message : 'Home unavailable.', 'bad'); setFade(false); return;}
      }
    }
    const spawn = spawnFor(next, scene);
    rt.player.pos.set(spawn.x, 0, spawn.z); rt.player.angle = spawn.angle;
    if (next === 'town') {rt.cameraBlocked = (x, z) => blockedByCollider(x, z, CAMERA_COLLIDERS, 0.25); rt.walkable = townWalkable; rt.height = heightAt; rt.bounds = TOWN_BOUNDS; rt.camera.distance = 5.8;}
    else {const h = view?.house ?? DEFAULT_HOUSE; rt.walkable = homeWalkable(view?.layout ?? [], h.size); rt.height = (x, z) => homeHeight(x, z, h.size, h.porch); rt.bounds = HOME_BOUNDS; rt.camera.distance = 10.5; rt.camera.pitch = 0.3;}
    rt.player.pos.y = rt.height(spawn.x, spawn.z);
    rt.camera.focus.set(spawn.x, 1, spawn.z); rt.camera.yaw = 0;
    rt.targets.clear();
    rt.scene = next;
    ui.set({scene: next, decorating: false, prompt: null, panel: null});
    setPlayers([]);
    setScene(next);
    setTimeout(() => setFade(false), 200);
  }, [home, loadHome, rt, scene, ui, variant, visit]);
  gotoRef.current = s => void goto(s);

  useEffect(() => {if (initialScene === 'home') void goto('home', visit ?? undefined);}, []); // eslint-disable-line react-hooks/exhaustive-deps
  const liveHouse = housePreview ?? home?.house ?? DEFAULT_HOUSE;
  useEffect(() => {if (scene === 'home') {rt.walkable = homeWalkable(layout, liveHouse.size); rt.height = (x, z) => homeHeight(x, z, liveHouse.size, liveHouse.porch);}}, [layout, scene, rt, liveHouse.size, liveHouse.porch]);

  // Presence (real players only).
  useEffect(() => {
    if (!server) return;
    let alive = true, timer: ReturnType<typeof setTimeout>;
    const anim = () => rt.player.motion.current.anim;
    if (scene === 'town') {
      const beat = async () => {
        try {
          const r = await api<{players: RemotePlayer[]}>('town/presence', {method: 'POST', body: {x: rt.player.pos.x, z: rt.player.pos.z, angle: rt.player.angle, anim: ['idle', 'walk', 'run', 'sit', 'fish', 'net', 'camera', 'water', 'wave', 'cheer', 'eat'].includes(anim()) ? anim() : 'idle', ...(rt.player.motion.current.emote && performance.now() - (rt.player.motion.current.emoteAt ?? 0) < 1200 ? {emote: rt.player.motion.current.emote} : {})}});
          if (alive) {setPlayers(r.players); ui.set({players: r.players});}
        } catch {/* offline moment */}
        if (alive) timer = setTimeout(beat, 1000);
      };
      void beat();
      return () => {alive = false; clearTimeout(timer); void api('town/leave', {method: 'POST', body: {}}).catch(() => undefined);};
    }
    if ((scene === 'home' || scene === 'room') && home) {
      let session: {id: string; sequence: number} | null = null;
      const join = async () => {
        const s = await api<HabitatState>('habitat/join', {method: 'POST', body: {id: home.worldId}});
        session = s.presenceSession ? {id: s.presenceSession.id, sequence: s.presenceSession.sequence} : null;
      };
      const beat = async () => {
        try {
          if (!session) await join();
          if (session) {
            session.sequence++;
            const r = await api<{players: RemotePlayer[]}>('habitat/presence', {method: 'POST', body: {worldId: home.worldId, sessionId: session.id, sequence: session.sequence, x: rt.player.pos.x, z: rt.player.pos.z, angle: rt.player.angle, anim: ['idle', 'walk', 'run', 'sit', 'fish', 'water', 'wave', 'cheer', 'eat'].includes(anim()) ? anim() : 'idle', inside: false}});
            if (alive) setPlayers(r.players);
          }
        } catch {session = null;}
        if (alive) timer = setTimeout(beat, 1200);
      };
      void beat();
      return () => {alive = false; clearTimeout(timer); if (session) void api('habitat/leave', {method: 'POST', body: {worldId: home.worldId, sessionId: session.id}}).catch(() => undefined);};
    }
  }, [server, scene, home, rt, ui]);

  // Mail badge.
  useEffect(() => {
    if (!server) return;
    api<{mail: unknown[]}>('friends').then(r => ui.set({mailCount: r.mail.length})).catch(() => undefined);
  }, [server, ui]);

  const saveLayout = async () => {
    if (!home) return;
    setSaving(true);
    try {const view = await homeBackend.save(home, layout); setHome(view); setLayout(view.layout); setDirty(false); rt.toast('Home saved!', 'good', '🏡');}
    catch (e) {rt.toast(e instanceof Error ? e.message : 'Could not save.', 'bad');} finally {setSaving(false);}
  };
  const changeLayout = (next: Layout) => {setLayout(next); setDirty(true);};

  // Pull the camera back so the whole cottage is in view while renovating.
  useEffect(() => {if (panel === 'renovate' && scene === 'home') {rt.camera.distance = 14; rt.camera.pitch = 0.34; rt.camera.yaw = 0; rt.player.pos.set(0, 0, 6); rt.player.angle = Math.PI;}}, [panel, scene, rt]);
  // Visual-only QA override: ?hour=13 shows the sky at that town hour. Gameplay time is untouched.
  const skyOffset = useMemo(() => {
    const h = Number(new URLSearchParams(window.location.search).get('hour'));
    if (!Number.isFinite(h) || !new URLSearchParams(window.location.search).has('hour')) return 0;
    return ((((h - townHour(Date.now())) % 24) + 24) % 24) / 24 * GAME_DAY_MS;
  }, []);
  const close = () => rt.openPanel(null);
  const isOwnHome = !!home?.isOwner;
  const garden = (isOwnHome ? (life?.plots ?? []).slice(0, life ? plotCount(life as LifeState) : 0) : home?.garden ?? []) as LifeState['plots'];
  const night = env.current.night;
  const saveLook = async (look: Appearance) => {
    if (variant === 'preview') {const p = {...profile, appearance: look}; safeSet(LOOK_KEY, JSON.stringify(p)); setProfile(p); rt.player.look = look; close(); return;}
    try {
      const r = await api<{profile: PublicProfile}>('habitat/public-profile', {method: 'POST', body: {name: profile.name, appearance: look}});
      setProfile(r.profile); close(); rt.toast('New look saved!', 'good', '👗'); rt.emote('star', 'cheer', 1400);
    } catch (e) {rt.toast(e instanceof Error ? e.message : 'Could not save.', 'bad');}
  };

  return <div className="wc-root" data-scene={scene} data-variant={variant}>
    <Canvas shadows={quality === 'high' ? 'soft' : true} dpr={quality === 'high' ? [1, 1.75] : [0.8, 1.25]} camera={{fov: 45, near: 0.1, far: 900, position: [0, 9, 20]}}
      gl={{antialias: quality === 'high', powerPreference: 'high-performance'}}
      onCreated={({gl}) => {gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.98; gl.outputColorSpace = THREE.SRGBColorSpace; document.documentElement.dataset.sceneReady = 'true';}}>
      <SkyAndLights envRef={env} focus={rt.camera.focus} shadowSize={quality === 'high' ? 2048 : 1024} offset={skyOffset} />
      <Suspense fallback={null}>
        {(scene === 'town' || scene === 'common-ground') && <TownWorld rt={rt} variant={variant} players={players} quality={quality} playerName={profile.name} />}
        {(scene === 'home' || scene === 'room') && home && <HomeWorld rt={rt} layout={layout} garden={garden} ownGarden={isOwnHome} canEdit={home.canEdit}
          decorating={decorating} decor={decor} setDecor={setDecor} onLayout={changeLayout} players={players} quality={quality} playerName={profile.name} night={night} house={housePreview ?? home.house} />}
      </Suspense>
      <Effects quality={quality} />
    </Canvas>
    <Hud rt={rt} name={profile.name} social={server} keys={server} variant={variant} />
    {decorating && home && <DecorTray life={life} layout={layout} inside={indoors} decor={decor} setDecor={setDecor} onLayout={changeLayout}
      onSave={() => void saveLayout()} saving={saving} dirty={dirty} onClose={() => {if (dirty) void saveLayout(); ui.set({decorating: false, panel: null}); setDecor({selected: null, placing: null, rotation: 0});}} />}
    {home && !isOwnHome && (scene === 'home' || scene === 'room') && <div className="wc-zone" style={{top: 110, opacity: 1}}>Visiting {home.ownerName}&apos;s home</div>}
    {panel === 'renovate' && home && (home.isOwner ? <RenovateTray house={housePreview ?? home.house} onPreview={setHousePreview} houseLevel={life?.houseLevel ?? 0} coins={life?.coins ?? 0} inside={indoors} saving={saving}
      onUpgrade={async size => {const ev = await rt.act({type: 'upgrade-house', size}); if (ev) {setHousePreview({...(housePreview ?? home.house), size}); rt.toast('Your home grew bigger!', 'rare', '🏡'); rt.emote('star', 'cheer', 1500);}}}
      onSave={async () => {if (!housePreview) {close(); return;} setSaving(true); try {const view = await homeBackend.saveHouse(home, housePreview); setHome(view); setHousePreview(null); rt.toast('Renovation saved!', 'good', '🏠');} catch (e) {rt.toast(e instanceof Error ? e.message : 'Could not save.', 'bad');} finally {setSaving(false);}}}
      onClose={() => {setHousePreview(null); close();}} />
      : <PanelFrame title="Renovate" icon="🏠" onClose={close}><div className="wc-empty">Only the owner can renovate this home.</div></PanelFrame>)}
    {panel === 'bag' && <BagPanel rt={rt} arg={panelArg} onClose={close} />}
    {panel === 'shop' && <ShopPanel rt={rt} arg={panelArg} onClose={close} />}
    {panel === 'cook' && <CookPanel rt={rt} onClose={close} />}
    {panel === 'craft' && <CraftPanel rt={rt} onClose={close} />}
    {panel === 'collection' && <CollectionPanel rt={rt} onClose={close} />}
    {panel === 'quests' && <QuestsPanel rt={rt} onClose={close} />}
    {panel === 'hobbies' && <HobbiesPanel rt={rt} onClose={close} />}
    {panel === 'map' && <MapPanel rt={rt} onClose={close} />}
    {panel === 'emotes' && <EmotesPanel rt={rt} onClose={close} />}
    {(panel === 'friends' || panel === 'mail') && server && <FriendsPanel rt={rt} onClose={close} onVisit={id => void goto('home', id)} />}
    {panel === 'mail' && !server && <PanelFrame title="Mailbox" icon="📮" onClose={close}><div className="wc-empty">Sign in with your wallet to receive gifts from friends.</div></PanelFrame>}
    {panel === 'keys' && server && <KeysPanel rt={rt} onClose={close} homeId={home?.isOwner ? home.worldId : null} />}
    {panel === 'wardrobe' && <PanelFrame title="Wardrobe" icon="👗" onClose={close}><AvatarEditor initial={profile.appearance} inventory={life?.inventory ?? {}} onSave={look => void saveLook(look)} /></PanelFrame>}
    {panel === 'settings' && <SettingsPanel rt={rt} onClose={close} quality={quality} setQuality={setQuality} extra={<>
      {variant !== 'common-ground' && <div className="wc-row"><div className="grow"><h4>Outfit</h4><p>Change clothes anytime.</p></div><button className="wc-btn primary" onClick={() => rt.openPanel('wardrobe')}>👗 Wardrobe</button></div>}
      {variant === 'preview' && <div className="wc-row"><div className="grow"><h4>Offline preview</h4><p>Progress here is saved only in this browser.</p></div><button className="wc-btn" onClick={() => {resetPreview(); window.location.reload();}}>Reset</button></div>}
      {server && <div className="wc-row"><div className="grow"><h4>Wallet</h4><p>Sign out of this browser.</p></div><button className="wc-btn" onClick={() => void api('auth/logout', {method: 'POST', body: {}}).then(() => {window.location.href = '/';})}>Sign out</button></div>}
    </>} />}
    {overlay}
    <LoadingVeil rt={rt} />
    {fade &&<div style={{position: 'absolute', inset: 0, background: '#fffaf0', zIndex: 30, transition: 'opacity .3s'}} />}
  </div>;
}
