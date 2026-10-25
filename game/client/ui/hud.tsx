'use client';
import {useEffect, useRef, useState} from 'react';
import type {Runtime} from '../runtime';
import {useStore} from '../store';
import {currentEnergy, maxEnergy, townLevel, xpForLevel} from '@/game/core/life';
import {ITEMS} from '@/game/core/items';
import {NPC_BY_ID} from '@/game/core/npcs';
import {formatHour, townHour, weatherAt} from '@/game/core/clock';
import {zoneName} from '@/game/core/map';
import {finishFishing} from '../actions';
import {ItemIcon, Stars} from './icon';
import {sfx} from '../audio';
import {FishIcon} from './fish-icon';

export function Joystick({rt}: {rt: Runtime}) {
  const base = useRef<HTMLDivElement>(null), knob = useRef<HTMLElement>(null);
  const active = useRef<number | null>(null);
  const move = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId || !base.current) return;
    const r = base.current.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) {x /= m; y /= m;}
    rt.input.x = x; rt.input.z = y;
    rt.input.run = m > 0.97;
    if (knob.current) knob.current.style.transform = `translate(${x * 36}px, ${y * 36}px)`;
  };
  const end = (e: React.PointerEvent) => {
    if (active.current !== e.pointerId) return;
    active.current = null; rt.input.x = 0; rt.input.z = 0; rt.input.run = false;
    if (knob.current) knob.current.style.transform = '';
  };
  return <div ref={base} className="wc-stick" aria-label="Move" onPointerDown={e => {e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); active.current = e.pointerId; move(e);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end}><i ref={knob} /></div>;
}

function PlayerCard({rt, name}: {rt: Runtime; name: string}) {
  const life = useStore(rt.ui, s => s.life);
  const [, tick] = useState(0);
  useEffect(() => {const id = setInterval(() => tick(t => t + 1), 5000); return () => clearInterval(id);}, []);
  if (!life) return <div className="wc-card"><div className="wc-level"><small>LV</small>1</div><div className="wc-name">{name}</div></div>;
  const level = townLevel(life), from = xpForLevel(level), to = xpForLevel(level + 1);
  const energy = currentEnergy(life, Date.now() + rt.ui.get().clockOffset), max = maxEnergy(life);
  return <div className="wc-card" onClick={() => rt.openPanel('hobbies')}>
    <div className="wc-level"><small>LV</small>{level}</div>
    <div className="wc-bars">
      <div className="wc-name">{name}</div>
      <div className="wc-bar xp"><i style={{width: `${Math.min(100, ((life.xp - from) / Math.max(1, to - from)) * 100)}%`}} /></div>
      <div className="wc-bar energy"><i style={{width: `${(energy / max) * 100}%`}} /></div>
      <div className="wc-bar-label"><span>⚡ {energy}/{max}</span><span>✨ {life.xp - from}/{to - from}</span></div>
    </div>
  </div>;
}

function Clock({rt}: {rt: Runtime}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {const id = setInterval(() => setNow(Date.now() + rt.ui.get().clockOffset), 2000); return () => clearInterval(id);}, [rt]);
  const weather = weatherAt(now);
  const icon = {sunny: '☀️', breezy: '🍃', cloudy: '☁️', rain: '🌧️'}[weather];
  const hour = townHour(now);
  return <span className="wc-pill">{hour >= 19.5 || hour < 5.5 ? '🌙' : icon} {formatHour(hour)}</span>;
}

function Zone({rt}: {rt: Runtime}) {
  const [zone, setZone] = useState('');
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setInterval(() => {
      const scene = rt.ui.get().scene;
      const z = scene === 'home' ? 'Your Home' : scene === 'room' ? 'Living Room' : scene === 'common-ground' ? 'Common Ground' : zoneName(rt.player.pos.x, rt.player.pos.z);
      setZone(prev => {if (prev !== z) {setShow(true); setTimeout(() => setShow(false), 2600);} return z;});
    }, 600);
    return () => clearInterval(id);
  }, [rt]);
  return <div className="wc-zone" style={{opacity: show ? 1 : 0}}>{zone}</div>;
}

function Toasts({rt}: {rt: Runtime}) {
  const toasts = useStore(rt.ui, s => s.toasts);
  return <div className="wc-toasts">{toasts.map(t => <div key={t.id} className={`wc-toast ${t.tone ?? ''}`}>{t.item ? <ItemIcon id={t.item} size={24} /> : t.icon}<span>{t.text}</span></div>)}</div>;
}

function DialogBox({rt}: {rt: Runtime}) {
  const dialog = useStore(rt.ui, s => s.dialog);
  if (!dialog) return null;
  const npc = NPC_BY_ID[dialog.npc];
  const close = () => {sfx.tap(); rt.ui.set({dialog: null});};
  const hearts = Math.min(10, Math.floor((dialog.hearts ?? 0) / 4));
  return <div className="wc-dialog" onPointerDown={e => e.stopPropagation()}>
    <div className="wc-dialog-name" style={{background: npc?.color ?? '#8fd6c0'}}>{npc?.name ?? 'Neighbour'}</div>
    <div className="wc-hearts">{'♥'.repeat(hearts)}{'♡'.repeat(10 - hearts)}</div>
    <p>{dialog.line}</p>
    <div className="wc-dialog-opts">
      <button className="wc-btn" onClick={() => {rt.ui.set({dialog: null, giftTo: dialog.npc}); rt.openPanel('bag', `gift:${dialog.npc}`);}}>🎁 Give a gift</button>
      {dialog.npc === 'juno' && <button className="wc-btn warm" onClick={() => {rt.ui.set({dialog: null}); rt.openPanel('shop', 'goods');}}>🛍️ Shop</button>}
      {dialog.npc === 'tomo' && <button className="wc-btn warm" onClick={() => {rt.ui.set({dialog: null}); rt.openPanel('cook');}}>🍳 Cook</button>}
      {dialog.npc === 'bea' && <button className="wc-btn warm" onClick={() => {rt.ui.set({dialog: null}); rt.openPanel('shop', 'fashion');}}>🌷 Shop</button>}
      {dialog.npc === 'odette' && <button className="wc-btn warm" onClick={() => {rt.ui.set({dialog: null}); rt.openPanel('quests');}}>📜 Requests</button>}
      <button className="wc-btn primary" onClick={close}>Bye!</button>
    </div>
  </div>;
}

/** The catch, splashing in a little pool on the card (no second WebGL context, so phones stay light). */
function SpinningFish({id}: {id: string; size?: number}) {
  return <div className="wc-catch-pool">
    <span className="ripple" /><span className="ripple r2" />
    <div className="fish"><FishIcon id={id} size={150} silhouette={false} /></div>
  </div>;
}

function CatchCard({rt}: {rt: Runtime}) {
  const card = useStore(rt.ui, s => s.catchCard);
  if (!card) return null;
  const item = ITEMS[card.item];
  return <div className="wc-scrim" onPointerDown={e => {e.stopPropagation(); rt.ui.set({catchCard: null});}}>
    <div className="wc-rays" />
    <div className="wc-catch">
      <div className="big">{item?.kind === 'fish' ? <SpinningFish id={card.item} size={card.size} /> : <ItemIcon id={card.item} size={110} />}</div>
      <div><Stars n={item?.rarity ?? 1} /></div>
      <h2>{card.quality !== undefined ? `Photo: ${item?.name}` : `You got ${item?.name}!`}</h2>
      {card.size !== undefined && <div className="size">{card.size} cm</div>}
      {card.quality !== undefined && <div className="size">Photo quality {Math.round(card.quality * 100)}%</div>}
      <p style={{color: '#8a7560', fontWeight: 700}}>{item?.description}</p>
      {card.first && <span className="first">NEW · Added to your collection</span>}
      <div style={{marginTop: 14}}><button className="wc-btn primary">Nice!</button></div>
    </div>
  </div>;
}

function LevelUp({rt}: {rt: Runtime}) {
  const level = useStore(rt.ui, s => s.levelUp);
  useEffect(() => {if (level) {const id = setTimeout(() => rt.ui.set({levelUp: null}), 2600); return () => clearTimeout(id);}}, [level, rt]);
  if (!level) return null;
  return <div className="wc-levelup"><div style={{fontSize: 34}}>🎉</div><h2>{level.hobby ? `${level.hobby} Lv ${level.level}` : `Town Level ${level.level}!`}</h2><div style={{fontWeight: 800}}>{level.hobby ? 'Better catches and bigger harvests await.' : 'Energy restored · new items in the shop'}</div></div>;
}

/** Bite → reel tension minigame. Hold to reel; keep the marker in the green. */
function Fishing({rt}: {rt: Runtime}) {
  const fishing = useStore(rt.ui, s => s.fishing);
  const [tension, setTension] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const state = useRef({tension: 0.5, progress: 0.15, pull: 0, started: 0, deadline: 0});
  useEffect(() => {
    if (!fishing) return;
    let raf = 0, last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const f = rt.ui.get().fishing;
      if (!f) return;
      if (f.phase === 'wait' && Date.now() >= f.biteAt) {
        rt.ui.set({fishing: {...f, phase: 'bite'}});
        state.current.deadline = t + 1400;
        sfx.bite();
        rt.emote('!');
        rt.player.motion.current.mood = 'surprised';
        if (navigator.vibrate) navigator.vibrate(80);
      } else if (f.phase === 'bite' && t > state.current.deadline) {
        void finishFishing(rt, false);
        return;
      } else if (f.phase === 'reel') {
        const s = state.current;
        s.pull += (Math.random() - 0.5) * dt * 6;
        s.pull = Math.max(-1, Math.min(1, s.pull));
        s.tension += (holding.current ? 0.7 : -0.55) * dt + s.pull * dt * 0.5;
        s.tension = Math.max(0, Math.min(1, s.tension));
        const inZone = s.tension > 0.3 && s.tension < 0.72;
        s.progress += (inZone ? 0.32 : -0.18) * dt;
        setTension(s.tension); setProgress(s.progress);
        if (s.tension >= 0.99) {void finishFishing(rt, false); return;}
        if (s.progress >= 1) {void finishFishing(rt, true); return;}
        if (s.progress <= 0 || t - s.started > 11000) {void finishFishing(rt, false); return;}
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [fishing?.phase, rt, fishing]);
  if (!fishing) return null;
  const startReel = () => {
    const f = rt.ui.get().fishing;
    if (!f) return;
    if (f.phase === 'wait') {void finishFishing(rt, false); return;}
    if (f.phase === 'bite') {
      state.current = {tension: 0.5, progress: 0.15, pull: 0, started: performance.now(), deadline: 0};
      rt.ui.set({fishing: {...f, phase: 'reel'}});
      rt.player.motion.current.mood = 'focus';
    }
    holding.current = true;
  };
  return <>
    {fishing.phase === 'wait' && <div className="wc-wait">🎣 Waiting for a bite… (tap too early and it swims away)</div>}
    {fishing.phase === 'bite' && <div className="wc-bite">!</div>}
    {fishing.phase === 'reel' && <div className="wc-reel" onPointerDown={e => e.stopPropagation()}>
      <b>Hold to reel · keep it in the green!</b>
      <div className="wc-tension"><b style={{left: `${tension * 100}%`}} /></div>
      <div className="wc-reel-progress"><i style={{width: `${Math.max(0, progress) * 100}%`}} /></div>
    </div>}
    <div className="wc-actions" onPointerDown={e => e.stopPropagation()}>
      <button className="wc-action" style={{fontSize: 22, fontWeight: 900}} onPointerDown={startReel} onPointerUp={() => {holding.current = false;}} onPointerLeave={() => {holding.current = false;}}>
        {fishing.phase === 'reel' ? 'HOLD' : fishing.phase === 'bite' ? 'REEL!' : '🎣'}
      </button>
    </div>
  </>;
}

function PhotoMode({rt}: {rt: Runtime}) {
  const photo = useStore(rt.ui, s => s.photo);
  const flash = useStore(rt.ui, s => s.flash);
  const [focus, setFocus] = useState('');
  useEffect(() => {
    if (!photo) return;
    const id = setInterval(() => {
      const t = rt.photoTarget;
      setFocus(t ? `${ITEMS[t.spawn.species]?.name ?? 'Bird'} · framing ${Math.round(t.framing * 100)}%` : 'Look for birds…');
    }, 200);
    return () => clearInterval(id);
  }, [photo, rt]);
  const showFlash = performance.now() - flash < 400;
  if (!photo) return null;
  return <>
    <div className="wc-viewfinder" />
    <div className="wc-focus">📷 {focus}</div>
    {showFlash && <div className="wc-flash" key={flash} />}
    <div className="wc-actions" onPointerDown={e => e.stopPropagation()}>
      <button className="wc-round" onClick={() => {rt.ui.set({photo: false}); rt.setAnim('idle', 'none');}}>✖</button>
      <button className="wc-action" onClick={() => rt.snap?.()}>📸</button>
    </div>
  </>;
}

export function Hud({rt, name, social, keys, variant}: {rt: Runtime; name: string; social: boolean; keys: boolean; variant: 'common-ground' | 'public' | 'preview'}) {
  const prompt = useStore(rt.ui, s => s.prompt);
  const fishing = useStore(rt.ui, s => s.fishing);
  const photo = useStore(rt.ui, s => s.photo);
  const dialog = useStore(rt.ui, s => s.dialog);
  const scene = useStore(rt.ui, s => s.scene);
  const decorating = useStore(rt.ui, s => s.decorating);
  const mail = useStore(rt.ui, s => s.mailCount);
  const quests = useStore(rt.ui, s => s.quests.filter(q => (s.life?.daily.counters[q.counter] ?? 0) >= q.target && !s.life?.daily.claimed.includes(q.id)).length);
  const [touch] = useState(() => typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches);
  const guest = variant === 'common-ground';
  const stop = (e: React.PointerEvent) => e.stopPropagation();
  return <div className="wc-hud">
    <PlayerCard rt={rt} name={name} />
    <Guide rt={rt} />
    <div className="wc-top-right" onPointerDown={stop}>
      {!guest && <span className="wc-pill">💰 <CoinCount rt={rt} /></span>}
      <Clock rt={rt} />
    </div>
    <Zone rt={rt} />
    {!guest && !photo && !fishing && <div className="wc-menu" onPointerDown={stop}>
      <button className="wc-icon-btn" onClick={() => rt.openPanel('bag')}>🎒<span>Bag</span></button>
      <button className="wc-icon-btn" onClick={() => rt.openPanel('quests')}>📜<span>Requests</span>{quests > 0 && <b className="wc-badge">{quests}</b>}</button>
      <button className="wc-icon-btn" onClick={() => rt.openPanel('collection')}>📖<span>Album</span></button>
      <button className="wc-icon-btn" onClick={() => rt.openPanel('hobbies')}>⭐<span>Hobbies</span></button>
      {social && <button className="wc-icon-btn" onClick={() => rt.openPanel('friends')}>💌<span>Friends</span>{mail > 0 && <b className="wc-badge">{mail}</b>}</button>}
      {keys && <button className="wc-icon-btn" onClick={() => rt.openPanel('keys')}>🔑<span>Keys</span></button>}
      {(scene === 'home' || scene === 'room') && <button className={`wc-icon-btn`} onClick={() => rt.ui.set({decorating: !decorating, panel: decorating ? null : 'home'})}>🛋️<span>Decorate</span></button>}
      {(scene === 'home' || scene === 'room') && <button className="wc-icon-btn" onClick={() => rt.openPanel('renovate')}>🏠<span>Renovate</span></button>}
      <button className="wc-icon-btn" onClick={() => rt.openPanel('map')}>🗺️<span>Map</span></button>
      <button className="wc-icon-btn" onClick={() => rt.openPanel('settings')}>⚙️<span>Settings</span></button>
    </div>}
    {guest && <div className="wc-menu" onPointerDown={stop}><button className="wc-icon-btn" onClick={() => rt.openPanel('emotes')}>😊<span>Emote</span></button></div>}
    <Toasts rt={rt} />
    {!fishing && !photo && !dialog && !decorating && <div className="wc-actions" onPointerDown={stop}>
      <div className="wc-small-actions">
        {!guest && <button className="wc-round" title="Camera" onClick={() => {rt.ui.set({photo: true}); rt.setAnim('camera', 'camera'); rt.camera.pitch = 0.2;}}>📷</button>}
        <button className="wc-round" title="Emotes" onClick={() => rt.openPanel('emotes')}>😊</button>
        {touch && <button className="wc-round" onPointerDown={() => {rt.input.run = !rt.input.run;}}>🏃</button>}
      </div>
      <div style={{position: 'relative'}}>
        {prompt && <div className="wc-action-label">{prompt.label}</div>}
        <button className={`wc-action ${prompt ? '' : 'idle'}`} aria-label={prompt?.label ?? 'Interact'} onClick={() => rt.activate()}>{prompt?.icon ?? '✋'}</button>
      </div>
    </div>}
    {touch ? <Joystick rt={rt} /> : !fishing && <div className="wc-keys-hint">WASD move · Shift run · walk slowly near bugs · E interact · drag to look · scroll zoom</div>}
    <DialogBox rt={rt} />
    <Fishing rt={rt} />
    <PhotoMode rt={rt} />
    <CatchCard rt={rt} />
    <LevelUp rt={rt} />
  </div>;
}

/** A gentle "what next" hint for new residents, like a cozy game's guide. */
function Guide({rt}: {rt: Runtime}) {
  const life = useStore(rt.ui, s => s.life);
  const scene = useStore(rt.ui, s => s.scene);
  if (!life || scene === 'common-ground') return null;
  const h = life.hobbies;
  const tip = !h.fishing.unlocked ? '🎣 Find Marlo on the pier (south) to learn fishing'
    : !h.gardening.unlocked ? '🌷 Visit Bea at the Petal Florist to learn gardening'
    : life.stats.fish === 0 ? '🎣 Face the water and press the action button to fish'
    : life.stats.harvests === 0 ? '🚌 Take the bus home and plant seeds in your garden'
    : townLevelOf(life) >= 2 && !h.cooking.unlocked ? '🍳 Chef Tomo at the Café can teach you to cook'
    : townLevelOf(life) >= 3 && !h.bugs.unlocked ? '🦋 Pip in the meadow (west) loves bugs — say hi!'
    : townLevelOf(life) >= 4 && !h.birds.unlocked ? '📷 Wren in the woods (north) can teach birdwatching'
    : null;
  if (!tip) return null;
  return <div className="wc-pill" style={{position: 'absolute', left: 12, top: 104, fontSize: 12, maxWidth: 'min(320px, 60vw)', whiteSpace: 'normal'}} onPointerDown={e => e.stopPropagation()}>{tip}</div>;
}
const townLevelOf = (life: NonNullable<ReturnType<Runtime['ui']['get']>['life']>) => townLevel(life);

function CoinCount({rt}: {rt: Runtime}) {
  const coins = useStore(rt.ui, s => s.life?.coins ?? 0);
  return <>{coins.toLocaleString()}</>;
}
