'use client';
import {useEffect, useRef, useState} from 'react';
import {ASSET_MANIFEST} from '../asset-manifest';

/**
 * Start screen that downloads every model, motion and icon before the game opens, so play never
 * stutters while things stream in. The browser keeps the files (see public/_headers), and a small
 * note in localStorage lets a returning player skip straight in.
 */
const SIGNATURE = `assets-${ASSET_MANIFEST.length}-${ASSET_MANIFEST.reduce((s, f) => s + f.bytes, 0)}`;
const KEY = 'willow-assets-ready';
const TIPS = [
  'Tip: walk slowly near bugs so they don\'t fly away.',
  'Tip: the big fish bite at dawn and dusk.',
  'Tip: chat with neighbours every day to grow your friendship.',
  'Tip: tap 🏡 Habitat to head home any time.',
  'Tip: sit on a chair or bed to rest for a moment.',
  'Tip: renovate your cottage inside and out from the 🏠 menu.',
];

export function assetsAlreadyReady() {
  try {return localStorage.getItem(KEY) === SIGNATURE;} catch {return false;}
}

async function download(url: string, onBytes: (n: number) => void) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let got = 0;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      if (!res.body) {const buf = await res.arrayBuffer(); onBytes(buf.byteLength); return;}
      const reader = res.body.getReader();
      for (;;) {
        const {done, value} = await reader.read();
        if (done) return;
        got += value.byteLength; onBytes(value.byteLength);
      }
    } catch {
      onBytes(-got); // roll back a partial attempt, then retry
      await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
    }
  }
}

export function Preloader({onReady}: {onReady: () => void}) {
  const total = useRef(ASSET_MANIFEST.reduce((s, f) => s + f.bytes, 0));
  const loaded = useRef(0);
  const [pct, setPct] = useState(0);
  const [tip, setTip] = useState(0);
  useEffect(() => {
    let alive = true;
    const queue = [...ASSET_MANIFEST].sort((a, b) => b.bytes - a.bytes); // big files first, so the bar moves evenly at the end
    const tick = setInterval(() => setPct(Math.min(99, Math.floor((loaded.current / total.current) * 100))), 120);
    const tips = setInterval(() => setTip(t => (t + 1) % TIPS.length), 3600);
    const worker = async () => {
      for (let f = queue.shift(); f && alive; f = queue.shift()) {
        let got = 0;
        await download(f.url, n => {got += n; loaded.current += n;});
        loaded.current += f.bytes - got; // count the file exactly once, even if it arrived compressed or failed
      }
    };
    Promise.all(Array.from({length: 4}, worker)).then(() => {
      if (!alive) return;
      try {localStorage.setItem(KEY, SIGNATURE);} catch {/* private mode: just download again next time */}
      setPct(100);
      setTimeout(() => alive && onReady(), 250);
    });
    return () => {alive = false; clearInterval(tick); clearInterval(tips);};
  }, [onReady]);
  return <div className="wc-root"><div className="wc-loading wc-preload">
    <div className="leaf">🌷</div>
    <div style={{fontSize: 22}}>Willow Common</div>
    <div style={{fontSize: 14, color: '#8a7560'}}>Getting the town ready for you…</div>
    <div className="wc-preload-bar"><i style={{width: `${pct}%`}} /></div>
    <div style={{fontSize: 18}}>{pct}%</div>
    <div className="wc-preload-tip" key={tip}>{TIPS[tip]}</div>
  </div></div>;
}
