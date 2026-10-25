'use client';
import dynamic from 'next/dynamic';
import {useEffect, useState} from 'react';
import {api} from '@/lib/api-client';

const WalletConnection = dynamic(() => import('@/features/wallet/wallet-connect'), {ssr: false, loading: () => <p className="dialog-desc">Preparing wallet…</p>});

/**
 * Common Ground welcome card. Guests can walk the open-air plaza right away;
 * a signed wallet unlocks the full town, a saved avatar and a Habitat with World Keys.
 */
export function Landing() {
  const [open, setOpen] = useState(true);
  const [session, setSession] = useState<{signedIn: boolean} | null>(null);
  const [connect, setConnect] = useState(false);
  useEffect(() => {
    api<{signedIn: boolean}>('session').then(setSession).catch(() => setSession({signedIn: false}));
    if (new URLSearchParams(location.search).get('connect') === '1') setConnect(true);
    const onJoin = () => setOpen(true);
    window.addEventListener('willow:join', onJoin);
    return () => window.removeEventListener('willow:join', onJoin);
  }, []);
  const enter = () => {window.location.href = '/public-world';};
  if (!open) return <div className="wc-mini" onPointerDown={e => e.stopPropagation()}>
    <button className="wc-btn primary" onClick={() => setOpen(true)}>✨ Join Willow Common</button>
  </div>;
  return <div className="wc-landing" onPointerDown={e => e.stopPropagation()}>
    <div style={{fontSize: 46}}>🌷🏡🎣</div>
    <h1>Willow Common</h1>
    <p className="sub">A cozy life town on CTRL. Fish, garden, cook, catch bugs, snap birds, decorate your home — and own your world with Keys.</p>
    {session?.signedIn ? <button className="wc-btn primary" style={{width: '100%', fontSize: 17}} onClick={enter}>Enter town →</button>
      : connect ? <WalletConnection purpose="public-world" onVerified={enter} />
      : <button className="wc-btn primary" style={{width: '100%', fontSize: 17}} onClick={() => setConnect(true)}>🔐 Sign in with wallet</button>}
    <div style={{display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap'}}>
      <button className="wc-btn" onClick={() => setOpen(false)}>👀 Look around first</button>
      <a className="wc-btn warm" href="/preview" style={{textDecoration: 'none'}}>🎮 Play offline demo</a>
    </div>
    <p style={{fontSize: 11, color: '#9b8167', marginTop: 12}}>Signing proves wallet ownership only: no gas, no payment. In-game coins are not tokens.</p>
  </div>;
}
