'use client';
import {useCallback, useEffect, useState} from 'react';
import {api, ApiError} from '@/lib/api-client';
import type {FriendsResponse, FriendEntry, HabitatState, LifeResponse, PublicProfile, RemotePlayer} from '@/game/core/api-types';
import type {Runtime} from '../runtime';
import {useStore} from '../store';
import {ITEMS} from '@/game/core/items';
import {PanelFrame} from './panels';
import {ItemIcon} from './icon';
import {sfx} from '../audio';

function useFriends(rt: Runtime) {
  const [data, setData] = useState<FriendsResponse | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => api<FriendsResponse>('friends').then(d => {setData(d); rt.ui.set({mailCount: d.mail.length});}).catch(e => setError(e instanceof ApiError ? e.message : 'Friends are unavailable.')), [rt]);
  useEffect(() => {void load();}, [load]);
  return {data, setData, error, load};
}

async function post<T>(path: string, body: unknown, rt: Runtime): Promise<T | null> {
  try {return await api<T>(path, {method: 'POST', body});} catch (e) {rt.toast(e instanceof ApiError ? e.message : 'Try again.', 'bad'); sfx.fail(); return null;}
}

function Person({p, children}: {p: Pick<FriendEntry, 'name'> & {online?: boolean}; children?: React.ReactNode}) {
  return <div className="wc-row"><span style={{fontSize: 28}}>{p.online ? '🟢' : '🙂'}</span><div className="grow"><h4>{p.name}</h4><p>{p.online ? 'In town now' : 'Away'}</p></div>{children}</div>;
}

export function FriendsPanel({rt, onClose, onVisit}: {rt: Runtime; onClose: () => void; onVisit: (worldId: string) => void}) {
  const {data, setData, error, load} = useFriends(rt);
  const players = useStore(rt.ui, s => s.players);
  const life = useStore(rt.ui, s => s.life);
  const [tab, setTab] = useState<'friends' | 'nearby' | 'requests' | 'mail' | 'find'>('friends');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [gift, setGift] = useState<FriendEntry | null>(null);
  const act = async (path: string, id: string) => {const d = await post<FriendsResponse>(`friends/${path}`, {id}, rt); if (d) {setData(d); sfx.coin();}};
  if (error) return <PanelFrame title="Friends" icon="💌" onClose={onClose}><div className="wc-empty">{error}</div></PanelFrame>;
  const ids = new Set(data?.friends.map(f => f.id));
  const pending = new Set(data?.outgoing.map(f => f.id));
  return <PanelFrame title="Friends" icon="💌" onClose={onClose} tabs={<>
    {(['friends', 'nearby', 'requests', 'mail', 'find'] as const).map(t => <button key={t} className={`wc-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
      {{friends: `Friends ${data?.friends.length ?? ''}`, nearby: `In town ${players.length}`, requests: `Requests ${data?.incoming.length ?? ''}`, mail: `Mail ${data?.mail.length ?? ''}`, find: 'Find'}[t]}
    </button>)}
  </>}>
    {!data && <div className="wc-empty">Loading…</div>}
    {data && tab === 'friends' && (data.friends.length ? data.friends.map(f => <Person key={f.id} p={f}>
      {f.homeId && <button className="wc-btn primary" onClick={() => {onClose(); onVisit(f.homeId!);}}>🏡 Visit</button>}
      <button className="wc-btn warm" onClick={() => setGift(f)}>🎁</button>
      <button className="wc-btn" onClick={() => void act('remove', f.id)}>✕</button>
    </Person>) : <div className="wc-empty">No friends yet. Say hi to players in town or search by name!</div>)}
    {data && tab === 'nearby' && (players.length ? players.map((p: RemotePlayer) => <Person key={p.id} p={{name: p.name, online: true}}>
      {ids.has(p.id) ? <span className="wc-chip on">Friend</span> : pending.has(p.id) ? <span className="wc-chip">Requested</span> : <button className="wc-btn primary" onClick={() => void act('request', p.id)}>➕ Add</button>}
    </Person>) : <div className="wc-empty">Nobody else is in town right now. NPC neighbours never count as players.</div>)}
    {data && tab === 'requests' && <>
      {data.incoming.map(f => <Person key={f.id} p={f}><button className="wc-btn primary" onClick={() => void act('accept', f.id)}>Accept</button><button className="wc-btn" onClick={() => void act('remove', f.id)}>Decline</button></Person>)}
      {data.outgoing.map(f => <Person key={f.id} p={f}><span className="wc-chip">Waiting…</span></Person>)}
      {!data.incoming.length && !data.outgoing.length && <div className="wc-empty">No requests.</div>}
    </>}
    {data && tab === 'mail' && (data.mail.length ? data.mail.map(m => <div key={m.id} className="wc-row">
      <ItemIcon id={m.item} size={44} /><div className="grow"><h4>{m.quantity}× {ITEMS[m.item]?.name ?? m.item}</h4><p>From {m.fromName}{m.note ? ` · “${m.note}”` : ''}</p></div>
      <button className="wc-btn primary" onClick={async () => {
        const d = await post<FriendsResponse & {state: LifeResponse['state']}>('friends/mail/claim', {id: m.id}, rt);
        if (d) {setData(d); rt.ui.set({life: d.state, mailCount: d.mail.length}); rt.toast(`Received ${ITEMS[m.item]?.name}`, 'good', undefined, m.item); sfx.success();}
      }}>Open</button>
    </div>) : <div className="wc-empty">Your mailbox is empty.</div>)}
    {data && tab === 'find' && <>
      <div style={{display: 'flex', gap: 8, marginBottom: 10}}>
        <input className="wc-field" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name" />
        <button className="wc-btn primary" disabled={q.trim().length < 2} onClick={() => api<{results: PublicProfile[]}>(`friends/search?q=${encodeURIComponent(q.trim())}`).then(r => setResults(r.results)).catch(() => setResults([]))}>Search</button>
      </div>
      {results.map(r => <Person key={r.id} p={{name: r.name}}>
        {ids.has(r.id) ? <span className="wc-chip on">Friend</span> : <button className="wc-btn primary" onClick={() => void act('request', r.id)}>➕ Add</button>}
      </Person>)}
    </>}
    {gift && life && <div className="wc-detail">
      <div className="grow"><h3>Send a gift to {gift.name}</h3><p>Pick something from your bag. It arrives in their mailbox.</p></div>
      <div className="wc-grid" style={{width: '100%'}}>{Object.entries(life.inventory).filter(([id]) => ITEMS[id]).slice(0, 40).map(([id, n]) => <button key={id} className="wc-slot" onClick={async () => {
        const d = await post<{state: LifeResponse['state']}>('friends/gift', {id: gift.id, item: id, quantity: 1}, rt);
        if (d) {rt.ui.set({life: d.state}); rt.toast(`Sent ${ITEMS[id].name} to ${gift.name}!`, 'good', '💌'); rt.emote('heart'); setGift(null); void load();}
      }}><ItemIcon id={id} size={40} /><span className="t">{ITEMS[id].name}</span><span className="n">×{n}</span></button>)}</div>
      <button className="wc-btn" onClick={() => setGift(null)}>Cancel</button>
    </div>}
  </PanelFrame>;
}

/** friend.tech-style World Keys: one owner key per wallet world; member Keys trade on a curve in CTRL. */
interface KeysRead {status: 'not-deployed' | 'ready'; isOwner: boolean; exists?: boolean; supply?: string; balance?: string; memberBalance?: string; reserve?: string; contractAddress?: string; tokenAddress?: string; keyWorldId?: string; chainId?: number}
export function KeysPanel({rt, onClose, homeId}: {rt: Runtime; onClose: () => void; homeId: string | null}) {
  const [worlds, setWorlds] = useState<HabitatState['worlds']>([]);
  const [selected, setSelected] = useState<string | null>(homeId);
  const [read, setRead] = useState<KeysRead | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {api<HabitatState>('habitat/state').then(s => {setWorlds(s.worlds); setSelected(x => x ?? s.homeId);}).catch(() => setError('Sign in to see World Keys.'));}, []);
  useEffect(() => {
    if (!selected) return;
    setRead(null); setError('');
    api<KeysRead>(`habitat/worlds/${selected}/keys`).then(setRead).catch(e => setError(e instanceof ApiError ? e.message : 'Keys are unavailable.'));
  }, [selected]);
  const supply = Number(read?.supply ?? 1);
  const curve = (n: number) => n * n; // price units for the next key: sum of squares curve
  return <PanelFrame title="World Keys" icon="🔑" onClose={onClose}>
    <p style={{marginTop: 0, fontWeight: 700, color: '#8a7560'}}>Every Habitat has Keys. Anyone can buy or sell another creator&apos;s member Keys in CTRL on a bonding curve (3% fee each way). Holding Keys never grants build rights — the owner key stays with the home owner.</p>
    <div className="wc-chips">{worlds.map(w => <button key={w.id} className={`wc-chip ${selected === w.id ? 'on' : ''}`} onClick={() => setSelected(w.id)}>{w.id === homeId ? '🏡 ' : ''}{w.owner}</button>)}</div>
    {error && <div className="wc-empty">{error}</div>}
    {!error && !read && selected && <div className="wc-empty">Reading the chain…</div>}
    {read && read.status === 'not-deployed' && <div className="wc-detail"><span style={{fontSize: 40}}>🔑</span><div className="grow">
      <h3>Keys open soon</h3>
      <p>The World Keys contract is not deployed on this network yet. When it launches, owners claim their 0-CTRL owner key (gas only) and friends can trade member Keys here.</p>
      <p style={{marginTop: 6}}>Curve preview: key #2 = {curve(1)}u · key #10 = {curve(9)}u · key #50 = {curve(49)}u (u = curve unit in CTRL)</p>
    </div></div>}
    {read && read.status === 'ready' && <div className="wc-detail"><span style={{fontSize: 40}}>🔑</span><div className="grow">
      <h3>{read.exists ? `${supply} Keys in circulation` : 'World not claimed yet'}</h3>
      <p>You hold {read.memberBalance ?? '0'} member Key(s){read.isOwner ? ' + the owner key' : ''} · reserve {read.reserve ?? '0'}</p>
      <p>Next key costs {curve(supply)}u + 3% fee. Trades are signed in your wallet; the game never holds your tokens.</p>
    </div>
      <a className="wc-btn primary" href={`/keys?world=${selected}`}>Trade in wallet →</a>
    </div>}
  </PanelFrame>;
}
