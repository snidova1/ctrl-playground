'use client';
import {useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {Runtime} from '../runtime';
import {useStore} from '../store';
import {
  BIRDS, BUGS, CROP_BY_SEED, DISHES, FASHION, FISH, FURNITURE, ITEMS, SHOP_STOCK, matchesIngredient, type ItemDef,
} from '@/game/core/items';
import {HOBBIES, NPC_BY_ID} from '@/game/core/npcs';
import {hobbyLevel, plotCount, townLevel, xpForLevel, MAX_HOBBY_LEVEL} from '@/game/core/life';
import {BUILDINGS, HOME_STOP, PIER, POND, RIVER, SEA_Z, TOWN_BOUNDS, BEACH_Z} from '@/game/core/map';
import {ItemIcon, Stars} from './icon';
import {sfx, isMuted, setMuted} from '../audio';

export function PanelFrame({title, icon, onClose, tabs, children}: {title: string; icon: string; onClose: () => void; tabs?: ReactNode; children: ReactNode}) {
  return <div className="wc-scrim" onPointerDown={e => {e.stopPropagation(); if (e.target === e.currentTarget) onClose();}}>
    <section className="wc-panel" role="dialog" aria-label={title} onPointerDown={e => e.stopPropagation()}>
      <header className="wc-panel-head"><span style={{fontSize: 28}}>{icon}</span><h2>{title}</h2><button className="wc-close" aria-label="Close" onClick={onClose}>✕</button></header>
      {tabs && <div className="wc-tabs">{tabs}</div>}
      <div className="wc-panel-body">{children}</div>
    </section>
  </div>;
}
const Tab = ({on, onClick, children}: {on: boolean; onClick: () => void; children: ReactNode}) => <button className={`wc-tab ${on ? 'on' : ''}`} onClick={() => {sfx.tap(); onClick();}}>{children}</button>;

// --- Bag ---------------------------------------------------------------------
const BAG_TABS: {id: string; label: string; kinds: ItemDef['kind'][]}[] = [
  {id: 'all', label: 'All', kinds: []}, {id: 'catch', label: 'Fish & Bugs', kinds: ['fish', 'bug']}, {id: 'farm', label: 'Garden', kinds: ['crop', 'seed', 'forage', 'ingredient']},
  {id: 'food', label: 'Dishes', kinds: ['dish']}, {id: 'mat', label: 'Materials', kinds: ['material']}, {id: 'furn', label: 'Furniture', kinds: ['furniture']}, {id: 'fashion', label: 'Fashion', kinds: ['fashion']},
];
export function BagPanel({rt, arg, onClose}: {rt: Runtime; arg: string | null; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  const plant = arg?.startsWith('plant:') ? Number(arg.slice(6)) : null;
  const gift = arg?.startsWith('gift:') ? arg.slice(5) : null;
  const [tab, setTab] = useState(plant !== null ? 'farm' : 'all');
  const [sel, setSel] = useState<string | null>(null);
  if (!life) return null;
  const kinds = BAG_TABS.find(t => t.id === tab)!.kinds;
  const items = Object.entries(life.inventory).filter(([id]) => ITEMS[id] && (!kinds.length || kinds.includes(ITEMS[id].kind)))
    .filter(([id]) => plant === null || CROP_BY_SEED[id]).filter(([id]) => !gift || ITEMS[id].kind !== 'furniture')
    .sort((a, b) => ITEMS[a[0]].kind.localeCompare(ITEMS[b[0]].kind) || ITEMS[b[0]].rarity - ITEMS[a[0]].rarity);
  const item = sel ? ITEMS[sel] : null;
  const title = plant !== null ? 'Choose seeds to plant' : gift ? `Gift for ${NPC_BY_ID[gift]?.name ?? 'a friend'}` : 'Bag';
  return <PanelFrame title={title} icon="🎒" onClose={onClose} tabs={plant === null && BAG_TABS.map(t => <Tab key={t.id} on={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</Tab>)}>
    {items.length ? <div className="wc-grid">{items.map(([id, n]) => <button key={id} className={`wc-slot ${sel === id ? 'sel' : ''}`} onClick={() => {sfx.tap(); setSel(id);}}>
      <ItemIcon id={id} size={52} /><span className="t">{ITEMS[id].name}</span><span className="n">×{n}</span>
    </button>)}</div> : <div className="wc-empty">{plant !== null ? 'No seeds yet — buy some at the General Store or Petal Florist.' : 'Nothing here yet. Go explore!'}</div>}
    {item && sel && <div className="wc-detail">
      <ItemIcon id={sel} size={64} />
      <div className="grow"><h3>{item.name} <Stars n={item.rarity} /></h3><p>{item.description}</p>{life.collection[sel]?.best && <p>Best size: {life.collection[sel].best} cm</p>}</div>
      {plant !== null && <button className="wc-btn primary" onClick={async () => {rt.setAnim('pick', 'none', 900); onClose(); await rt.act({type: 'plant', plot: plant, seed: sel});}}>🌱 Plant</button>}
      {gift && <button className="wc-btn primary" onClick={async () => {onClose(); rt.setAnim('wave', 'none', 1200, 'happy'); await rt.act({type: 'gift', npc: gift, item: sel});}}>🎁 Give</button>}
      {!gift && plant === null && (item.kind === 'dish' || item.kind === 'crop' || item.kind === 'forage') && <button className="wc-btn warm" onClick={() => void rt.act({type: 'eat', item: sel})}>😋 Eat</button>}
      {!gift && plant === null && item.kind === 'fashion' && <button className="wc-btn primary" onClick={() => rt.openPanel('wardrobe')}>👗 Wear</button>}
    </div>}
  </PanelFrame>;
}

// --- Shop --------------------------------------------------------------------
export function ShopPanel({rt, arg, onClose}: {rt: Runtime; arg: string | null; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  const [tab, setTab] = useState<'goods' | 'furniture' | 'fashion' | 'sell'>(arg === 'fashion' ? 'fashion' : 'goods');
  const [sel, setSel] = useState<string | null>(null);
  if (!life) return null;
  const level = townLevel(life);
  const stock: {id: string; price: number; locked?: string; owned?: boolean}[] =
    tab === 'goods' ? SHOP_STOCK.map(s => ({id: s.id, price: s.price, locked: s.level > level ? `Town Lv ${s.level}` : undefined}))
    : tab === 'furniture' ? FURNITURE.filter(f => f.buy).map(f => ({id: f.id, price: f.buy!}))
    : tab === 'fashion' ? FASHION.map(f => ({id: f.id, price: f.buy, owned: !!life.inventory[f.id]}))
    : Object.entries(life.inventory).filter(([id]) => ITEMS[id]?.price > 0).map(([id]) => ({id, price: ITEMS[id].price}));
  const item = sel ? ITEMS[sel] : null;
  const entry = stock.find(s => s.id === sel);
  return <PanelFrame title={tab === 'fashion' ? 'Petal Boutique' : 'General Store'} icon="🛍️" onClose={onClose} tabs={<>
    <Tab on={tab === 'goods'} onClick={() => {setTab('goods'); setSel(null);}}>Seeds & Food</Tab>
    <Tab on={tab === 'furniture'} onClick={() => {setTab('furniture'); setSel(null);}}>Furniture</Tab>
    <Tab on={tab === 'fashion'} onClick={() => {setTab('fashion'); setSel(null);}}>Fashion</Tab>
    <Tab on={tab === 'sell'} onClick={() => {setTab('sell'); setSel(null);}}>Sell</Tab>
    <span style={{marginLeft: 'auto'}} className="wc-pill">💰 {life.coins.toLocaleString()}</span>
  </>}>
    {stock.length ? <div className="wc-grid">{stock.map(s => <button key={s.id} className={`wc-slot ${sel === s.id ? 'sel' : ''} ${s.locked ? 'locked' : ''}`} onClick={() => {sfx.tap(); setSel(s.id);}}>
      <ItemIcon id={s.id} size={50} /><span className="t">{ITEMS[s.id]?.name}</span>
      <span className="n" style={{color: s.owned ? '#4f8a3c' : '#b07a22'}}>{s.owned ? 'Owned' : tab === 'sell' ? `×${life.inventory[s.id]}` : `💰${s.price}`}</span>
    </button>)}</div> : <div className="wc-empty">Nothing to sell yet.</div>}
    {item && entry && sel && <div className="wc-detail">
      <ItemIcon id={sel} size={64} />
      <div className="grow"><h3>{item.name}</h3><p>{item.description}</p>{entry.locked && <p>🔒 Unlocks at {entry.locked}</p>}</div>
      {tab === 'sell' ? <>
        <span className="wc-price">💰 {item.price} each</span>
        <button className="wc-btn" onClick={() => void rt.act({type: 'sell', item: sel, quantity: 1})}>Sell 1</button>
        <button className="wc-btn warm" onClick={() => void rt.act({type: 'sell', item: sel, quantity: Math.min(99, life.inventory[sel] ?? 1)})}>Sell all</button>
      </> : <>
        <span className="wc-price">💰 {entry.price}</span>
        {tab === 'goods' && <button className="wc-btn" disabled={!!entry.locked} onClick={() => void rt.act({type: 'buy', item: sel, quantity: 5})}>Buy 5</button>}
        <button className="wc-btn primary" disabled={!!entry.locked || entry.owned || life.coins < entry.price} onClick={() => void rt.act({type: 'buy', item: sel, quantity: 1})}>{entry.owned ? 'Owned' : 'Buy'}</button>
      </>}
    </div>}
  </PanelFrame>;
}

// --- Cooking -----------------------------------------------------------------
export function CookPanel({rt, onClose}: {rt: Runtime; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  const [cooking, setCooking] = useState<string | null>(null);
  if (!life) return null;
  if (!life.hobbies.cooking.unlocked) return <PanelFrame title="Kitchen" icon="🍳" onClose={onClose}><div className="wc-empty">Chef Tomo at the Café can teach you to cook once you reach town level 2.</div></PanelFrame>;
  const level = hobbyLevel(life, 'cooking');
  const have = (ing: {id?: string; tag?: string; count: number}) => Object.entries(life.inventory).filter(([id]) => matchesIngredient(id, ing as never)).reduce((n, [, c]) => n + c, 0);
  if (cooking) return <PanelFrame title={`Cooking ${ITEMS[cooking].name}`} icon="🍳" onClose={() => setCooking(null)}>
    <CookGame onDone={async quality => {setCooking(null); onClose(); rt.setAnim('eat', 'pan', 1200, 'happy'); await rt.act({type: 'cook', recipe: cooking, quality});}} />
  </PanelFrame>;
  return <PanelFrame title="Recipes" icon="🍳" onClose={onClose}>
    {DISHES.map(d => {
      const ready = d.ingredients.every(ing => have(ing) >= ing.count);
      const locked = d.cookingLevel > level;
      return <div key={d.id} className="wc-row" style={{opacity: locked ? 0.5 : 1}}>
        <ItemIcon id={d.id} size={48} />
        <div className="grow"><h4>{d.name} <Stars n={d.rarity} /></h4>
          <p>{d.ingredients.map(ing => `${ing.id ? ITEMS[ing.id].name : `any ${ing.tag}`} ${have(ing)}/${ing.count}`).join(' · ')}</p>
          <p>⚡ +{d.energy} energy · sells 💰{d.price}</p>
        </div>
        <button className="wc-btn primary" disabled={!ready || locked} onClick={() => {sfx.open(); setCooking(d.id);}}>{locked ? `Lv ${d.cookingLevel}` : 'Cook'}</button>
      </div>;
    })}
  </PanelFrame>;
}

/** Three timing taps on a swinging needle; each hit in the sweet spot is a star. */
function CookGame({onDone}: {onDone: (quality: number) => void}) {
  const [pos, setPos] = useState(0);
  const [hits, setHits] = useState<boolean[]>([]);
  const t0 = useRef(performance.now());
  useEffect(() => {
    let raf = 0;
    const loop = () => {setPos((Math.sin((performance.now() - t0.current) / 1000 * (2.2 + hits.length * 0.6)) + 1) / 2); raf = requestAnimationFrame(loop);};
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hits.length]);
  const tap = () => {
    const good = pos > 0.4 && pos < 0.6;
    if (good) sfx.coin(); else sfx.tap();
    const next = [...hits, good];
    setHits(next);
    if (next.length === 3) setTimeout(() => onDone(Math.max(1, next.filter(Boolean).length)), 450);
  };
  return <div style={{textAlign: 'center', padding: 10}}>
    <div style={{fontSize: 64}}>{hits.length < 3 ? '🍳' : '🍽️'}</div>
    <p style={{fontWeight: 800}}>Tap when the needle is in the golden zone! ({hits.length}/3)</p>
    <div style={{position: 'relative', height: 30, borderRadius: 16, background: 'linear-gradient(90deg,#ffd9c4 0 40%,#ffe27a 40% 60%,#ffd9c4 60%)', margin: '14px 0'}}>
      <b style={{position: 'absolute', left: `${pos * 100}%`, top: -4, width: 8, height: 38, marginLeft: -4, borderRadius: 4, background: '#5b4636'}} />
    </div>
    <div style={{fontSize: 26, marginBottom: 10}}>{[0, 1, 2].map(i => <span key={i}>{hits[i] === undefined ? '☆' : hits[i] ? '★' : '✖'}</span>)}</div>
    <button className="wc-btn warm" style={{fontSize: 20, padding: '14px 40px'}} disabled={hits.length >= 3} onClick={tap}>Stir!</button>
  </div>;
}

// --- Crafting ----------------------------------------------------------------
export function CraftPanel({rt, onClose}: {rt: Runtime; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  if (!life) return null;
  return <PanelFrame title="Workbench" icon="🔨" onClose={onClose}>
    {FURNITURE.filter(f => f.craft).map(f => {
      const ok = f.craft!.every(p => (life.inventory[p.id] ?? 0) >= p.count);
      return <div key={f.id} className="wc-row">
        <ItemIcon id={f.id} size={48} />
        <div className="grow"><h4>{f.name}</h4><p>{f.craft!.map(p => `${ITEMS[p.id].name} ${life.inventory[p.id] ?? 0}/${p.count}`).join(' · ')}</p></div>
        <button className="wc-btn primary" disabled={!ok} onClick={async () => {rt.setAnim('pick', 'none', 1200, 'focus'); await rt.act({type: 'craft', furniture: f.id});}}>Craft</button>
      </div>;
    })}
  </PanelFrame>;
}

// --- Collection ----------------------------------------------------------------
export function CollectionPanel({rt, onClose}: {rt: Runtime; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  const [tab, setTab] = useState<'fish' | 'bug' | 'bird'>('fish');
  const [sel, setSel] = useState<string | null>(null);
  if (!life) return null;
  const list = tab === 'fish' ? FISH : tab === 'bug' ? BUGS : BIRDS;
  const found = list.filter(c => life.collection[c.id]).length;
  const item = sel ? list.find(c => c.id === sel) : null;
  return <PanelFrame title="Album" icon="📖" onClose={onClose} tabs={<>
    <Tab on={tab === 'fish'} onClick={() => setTab('fish')}>🐟 Fish</Tab><Tab on={tab === 'bug'} onClick={() => setTab('bug')}>🦋 Bugs</Tab><Tab on={tab === 'bird'} onClick={() => setTab('bird')}>🐦 Birds</Tab>
    <span style={{marginLeft: 'auto', fontWeight: 900}}>{found}/{list.length}</span>
  </>}>
    <div className="wc-grid">{list.map(c => {
      const got = !!life.collection[c.id];
      return <button key={c.id} className={`wc-slot ${sel === c.id ? 'sel' : ''}`} onClick={() => setSel(c.id)}>
        <ItemIcon id={c.id} size={52} silhouette={!got} /><span className="t">{got ? c.name : '???'}</span>
      </button>;
    })}</div>
    {item && <div className="wc-detail">
      <ItemIcon id={item.id} size={64} silhouette={!life.collection[item.id]} />
      <div className="grow">
        <h3>{life.collection[item.id] ? item.name : 'Not found yet'} <Stars n={item.rarity} /></h3>
        <p>{'water' in item ? `Waters: ${item.water.join(', ')}` : `Found in: ${item.habitat}`} · {item.time === 'any' ? 'any time' : item.time === 'day' ? 'daytime' : 'night'}{'weather' in item && item.weather ? ' · rainy days' : ''}</p>
        {life.collection[item.id] && <p>Caught {life.collection[item.id].count}×{life.collection[item.id].best ? ` · best ${life.collection[item.id].best} cm` : ''}</p>}
      </div>
    </div>}
  </PanelFrame>;
}

// --- Quests ------------------------------------------------------------------
export function QuestsPanel({rt, onClose}: {rt: Runtime; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  const quests = useStore(rt.ui, s => s.quests);
  if (!life) return null;
  return <PanelFrame title="Today's Requests" icon="📜" onClose={onClose}>
    <p style={{marginTop: 0, color: '#8a7560', fontWeight: 700}}>New requests arrive every day from the Town Hall.</p>
    {quests.map(q => {
      const n = Math.min(q.target, life.daily.counters[q.counter] ?? 0), done = n >= q.target, claimed = life.daily.claimed.includes(q.id);
      return <div key={q.id} className="wc-row">
        <span style={{fontSize: 28}}>{claimed ? '✅' : done ? '🎁' : '📝'}</span>
        <div className="grow"><h4>{q.text}</h4><p>Reward: 💰{q.coins} · ✨{q.xp} XP</p><div className="wc-progress"><i style={{width: `${(n / q.target) * 100}%`}} /></div></div>
        <button className="wc-btn primary" disabled={!done || claimed} onClick={() => void rt.act({type: 'claim-quest', quest: q.id})}>{claimed ? 'Done' : done ? 'Claim' : `${n}/${q.target}`}</button>
      </div>;
    })}
  </PanelFrame>;
}

// --- Hobbies -----------------------------------------------------------------
export function HobbiesPanel({rt, onClose}: {rt: Runtime; onClose: () => void}) {
  const life = useStore(rt.ui, s => s.life);
  if (!life) return null;
  const level = townLevel(life);
  return <PanelFrame title="Hobbies" icon="⭐" onClose={onClose}>
    <div className="wc-row"><span style={{fontSize: 30}}>🏡</span><div className="grow"><h4>Town Level {level}</h4><p>Total XP {life.xp.toLocaleString()} · next level at {xpForLevel(level + 1).toLocaleString()}</p><p>Garden plots: {plotCount(life)} · Coins earned: {life.stats.coinsEarned.toLocaleString()}</p></div></div>
    {HOBBIES.map(h => {
      const lv = hobbyLevel(life, h.id), unlocked = life.hobbies[h.id].unlocked;
      const mentor = Object.values(NPC_BY_ID).find(n => n.hobby === h.id);
      const xp = life.hobbies[h.id].xp, from = xpForLevel(lv, 90), to = xpForLevel(lv + 1, 90);
      return <div key={h.id} className="wc-row" style={{opacity: unlocked ? 1 : 0.6}}>
        <span style={{fontSize: 28, width: 44, height: 44, display: 'grid', placeContent: 'center', borderRadius: 14, background: h.color}}>{({fishing: '🎣', gardening: '🌱', cooking: '🍳', bugs: '🦋', birds: '📷', foraging: '🍄'} as Record<string, string>)[h.id]}</span>
        <div className="grow"><h4>{h.name} {unlocked ? `· Lv ${lv}${lv >= MAX_HOBBY_LEVEL ? ' (max)' : ''}` : '· locked'}</h4>
          <p>{unlocked ? h.blurb : `Talk to ${mentor?.name ?? 'a neighbour'} (town level ${h.level}+) to learn this hobby.`}</p>
          {unlocked && <div className="wc-progress"><i style={{width: `${lv >= MAX_HOBBY_LEVEL ? 100 : ((xp - from) / Math.max(1, to - from)) * 100}%`}} /></div>}
        </div>
      </div>;
    })}
  </PanelFrame>;
}

// --- Map ---------------------------------------------------------------------
export function MapPanel({rt, onClose}: {rt: Runtime; onClose: () => void}) {
  const scene = useStore(rt.ui, s => s.scene);
  const [, tick] = useState(0);
  useEffect(() => {const id = setInterval(() => tick(t => t + 1), 300); return () => clearInterval(id);}, []);
  const b = TOWN_BOUNDS, W = b.maxX - b.minX, D = b.maxZ - b.minZ;
  const X = (x: number) => ((x - b.minX) / W) * 100, Z = (z: number) => ((z - b.minZ) / D) * 100;
  const river = useMemo(() => RIVER.map(p => `${X(p.x)},${Z(p.z)}`).join(' '), []); // eslint-disable-line react-hooks/exhaustive-deps
  return <PanelFrame title="Willow Common" icon="🗺️" onClose={onClose}>
    {scene === 'town' || scene === 'common-ground' ? <div className="wc-map"><svg viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="0" y={Z(-27)} width="100" height={Z(BEACH_Z) - Z(-27)} fill="#8fc96a" />
      <rect x="0" y="0" width="100" height={Z(-27)} fill="#5f9e55" />
      <rect x="0" y={Z(BEACH_Z)} width="100" height={Z(SEA_Z) - Z(BEACH_Z)} fill="#f4e2b0" />
      <rect x="0" y={Z(SEA_Z)} width="100" height="100" fill="#6cc7e6" />
      <polyline points={river} fill="none" stroke="#6cc7e6" strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx={X(POND.x)} cy={Z(POND.z)} rx={(POND.rx / W) * 100} ry={(POND.rz / D) * 100} fill="#6cc7e6" />
      <rect x={X(PIER.x - PIER.w / 2)} y={Z(PIER.z0)} width={(PIER.w / W) * 100} height={Z(PIER.z1) - Z(PIER.z0)} fill="#c79764" />
      <circle cx={X(0)} cy={Z(0)} r="9" fill="#eadfca" />
      {BUILDINGS.map(bd => <rect key={bd.id} x={X(bd.x - bd.w / 2)} y={Z(bd.z - bd.d / 2)} width={(bd.w / W) * 100} height={(bd.d / D) * 100} rx="1" fill={bd.roof} />)}
      <circle cx={X(HOME_STOP.x)} cy={Z(HOME_STOP.z)} r="1.5" fill="#f2c14e" />
      <circle cx={X(rt.player.pos.x)} cy={Z(rt.player.pos.z)} r="2" fill="#ff5f8a" stroke="white" strokeWidth=".8" />
    </svg></div> : <div className="wc-empty">You are at home. Take the bus to visit town.</div>}
    <p style={{fontWeight: 700, color: '#8a7560'}}>🟡 Bus stop · 🏪 shops by the plaza · 🎣 pond (east), river (west), pier (south) · 🌲 woods (north) · 🌼 meadow (west)</p>
  </PanelFrame>;
}

// --- Emotes / settings ---------------------------------------------------------
export const EMOTES: {id: string; icon: string; anim: string}[] = [
  {id: 'wave', icon: '👋', anim: 'wave'}, {id: 'heart', icon: '💗', anim: 'cheer'}, {id: 'laugh', icon: '😆', anim: 'cheer'}, {id: 'wow', icon: '✨', anim: 'idle'},
  {id: 'music', icon: '🎵', anim: 'wave'}, {id: 'star', icon: '⭐', anim: 'cheer'}, {id: 'zzz', icon: '💤', anim: 'sit'},
];
export function EmotesPanel({rt, onClose, onEmote}: {rt: Runtime; onClose: () => void; onEmote?: (id: string) => void}) {
  return <PanelFrame title="Emotes" icon="😊" onClose={onClose}>
    <div className="wc-grid">{EMOTES.map(e => <button key={e.id} className="wc-slot" onClick={() => {
      rt.emote(e.id, e.anim, 2200);
      rt.player.motion.current.mood = e.id === 'zzz' ? 'sleepy' : e.id === 'wow' ? 'surprised' : 'happy';
      onEmote?.(e.id); onClose();
    }}><span style={{fontSize: 40}}>{e.icon}</span><span className="t">{e.id}</span></button>)}</div>
  </PanelFrame>;
}

export function SettingsPanel({rt, onClose, quality, setQuality, extra}: {rt: Runtime; onClose: () => void; quality: 'high' | 'low'; setQuality: (q: 'high' | 'low') => void; extra?: ReactNode}) {
  const [muted, setM] = useState(isMuted());
  return <PanelFrame title="Settings" icon="⚙️" onClose={onClose}>
    <div className="wc-row"><div className="grow"><h4>Sound effects</h4></div><button className="wc-btn" onClick={() => {setMuted(!muted); setM(!muted);}}>{muted ? '🔇 Off' : '🔊 On'}</button></div>
    <div className="wc-row"><div className="grow"><h4>Graphics</h4><p>Low quality helps older phones.</p></div>
      <button className={`wc-btn ${quality === 'high' ? 'primary' : ''}`} onClick={() => setQuality('high')}>High</button>
      <button className={`wc-btn ${quality === 'low' ? 'primary' : ''}`} onClick={() => setQuality('low')}>Low</button></div>
    <div className="wc-row"><div className="grow"><h4>Camera</h4><p>Drag to look around, pinch or scroll to zoom.</p></div><button className="wc-btn" onClick={() => {rt.camera.yaw = 0; rt.camera.pitch = 0.62; rt.camera.distance = 11;}}>Reset</button></div>
    {extra}
    <p style={{fontSize: 12, color: '#9b8167'}}>Coins, items and levels are in-game only. They are never tokens and are not tradable for CTRL.</p>
  </PanelFrame>;
}
