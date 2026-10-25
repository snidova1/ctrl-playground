'use client';
import {useState} from 'react';
import {BUILD_KIT, FURNITURE, ITEMS} from '@/game/core/items';
import {countPlaced, type Layout} from '@/game/core/home';
import type {LifeState} from '@/game/core/life';
import type {Decor} from '../three/home';
import {ItemIcon} from './icon';
import {sfx} from '../audio';

/** Bottom tray for decorating: pick owned furniture, rotate, store, save. */
export function DecorTray({life, layout, inside, decor, setDecor, onLayout, onSave, onClose, saving, dirty}: {
  life: LifeState | null; layout: Layout; inside: boolean; decor: Decor; setDecor: (d: Decor) => void;
  onLayout: (l: Layout) => void; onSave: () => void; onClose: () => void; saving: boolean; dirty: boolean;
}) {
  const placed = countPlaced(layout);
  const [tab, setTab] = useState<'decor' | 'build'>('decor');
  const owned = FURNITURE.filter(f => (life?.inventory[f.id] ?? 0) > 0 && (inside ? f.zone !== 'yard' : f.zone !== 'room') && (inside || (tab === 'build') === BUILD_KIT.has(f.id)));
  const selected = decor.selected ? layout.find(o => o.id === decor.selected) : null;
  return <div onPointerDown={e => e.stopPropagation()} style={{position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 12px max(12px, env(safe-area-inset-bottom))', background: 'rgba(255,250,240,.97)', borderRadius: '26px 26px 0 0', boxShadow: '0 -6px 30px rgba(80,60,40,.18)', zIndex: 9}}>
    <div style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap'}}>
      <b style={{fontSize: 16}}>🛋️ Decorating {inside ? 'the living room' : 'the yard'}</b>
      <span style={{flex: 1, fontSize: 12, color: '#8a7560', fontWeight: 700}}>{decor.placing ? 'Tap the floor to place it.' : selected ? `${ITEMS[selected.assetId]?.name}: tap a new spot to move it.` : 'Pick furniture, or tap a placed piece to move it.'}</span>
      {(decor.placing || selected) && <button className="wc-btn" onClick={() => {sfx.tap(); setDecor({...decor, rotation: (decor.rotation + 1) % 4});}}>⟳ Rotate</button>}
      {selected && <button className="wc-btn" onClick={() => {sfx.tap(); onLayout(layout.filter(o => o.id !== selected.id)); setDecor({selected: null, placing: null, rotation: 0});}}>📦 Store</button>}
      {(decor.placing || selected) && <button className="wc-btn" onClick={() => setDecor({selected: null, placing: null, rotation: 0})}>Cancel</button>}
      {!inside && <><button className={`wc-tab ${tab === 'decor' ? 'on' : ''}`} onClick={() => setTab('decor')}>🌷 Decor</button><button className={`wc-tab ${tab === 'build' ? 'on' : ''}`} onClick={() => setTab('build')}>🧱 Build</button></>}
      <button className="wc-btn primary" disabled={saving || !dirty} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</button>
      <button className="wc-btn warm" onClick={onClose}>Done</button>
    </div>
    <div style={{display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4}}>
      {owned.length ? owned.map(f => {
        const free = (life?.inventory[f.id] ?? 0) - (placed[f.id] ?? 0);
        return <button key={f.id} className={`wc-slot ${decor.placing === f.id ? 'sel' : ''} ${free <= 0 ? 'locked' : ''}`} style={{width: 84, flex: '0 0 84px'}}
          onClick={() => {if (free <= 0) return; sfx.tap(); setDecor({selected: null, placing: f.id, rotation: decor.rotation});}}>
          <ItemIcon id={f.id} size={40} /><span className="t">{f.name}</span><span className="n">×{free}</span>
        </button>;
      }) : <div className="wc-empty" style={{padding: 10}}>Nothing here yet. Buy pieces at the General Store (Furniture tab) or craft them at your workbench.</div>}
    </div>
  </div>;
}
