'use client';
import dynamic from 'next/dynamic';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';

const GameApp = dynamic(() => import('./game-app').then(m => m.GameApp), {ssr: false, loading: () => <div className="wc-root"><div className="wc-loading"><div className="leaf">🍃</div>Loading Willow Common…</div></div>});
const Landing = dynamic(() => import('./landing').then(m => m.Landing), {ssr: false});

export function CommonGroundPage() {
  return <GameApp variant="common-ground" overlay={<Landing />} />;
}
export function PublicWorldPage() {
  return <GameApp variant="public" startScene="town" />;
}
function HabitatInner() {
  const params = useSearchParams();
  return <GameApp variant="public" startScene="home" visit={params.get('world')} />;
}
export function HabitatPage() {
  return <Suspense fallback={null}><HabitatInner /></Suspense>;
}
const Keys = dynamic(() => import('./keys-page').then(m => m.KeysPage), {ssr: false});
export function KeysMarket() {
  return <Keys />;
}
export function PreviewPage() {
  return <GameApp variant="preview" startScene="town" />;
}
