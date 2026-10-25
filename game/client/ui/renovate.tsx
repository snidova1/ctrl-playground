'use client';
import {useState} from 'react';
import {
  DOOR_COLORS, FLOORS, HOUSE_SIZES, ROOF_COLORS, ROOF_STYLES, SIDINGS, TRIM_COLORS, WALLPAPERS, WALL_COLORS, WINDOWS, type House,
} from '@/game/core/house';
import {sfx} from '../audio';

function Swatches({colors, value, onChange}: {colors: string[]; value: number; onChange: (i: number) => void}) {
  return <div className="wc-swatches">{colors.map((c, i) => <button key={i} className={`wc-swatch ${value === i ? 'on' : ''}`} style={{background: c}} onClick={() => {sfx.tap(); onChange(i);}} aria-label={c} />)}</div>;
}
function Chips({items, value, onChange}: {items: readonly string[]; value: number; onChange: (i: number) => void}) {
  return <div className="wc-chips">{items.map((it, i) => <button key={it} className={`wc-chip ${value === i ? 'on' : ''}`} onClick={() => {sfx.tap(); onChange(i);}}>{it}</button>)}</div>;
}
function Toggle({label, on, onChange}: {label: string; on: boolean; onChange: (v: boolean) => void}) {
  return <button className={`wc-chip ${on ? 'on' : ''}`} onClick={() => {sfx.tap(); onChange(!on);}}>{on ? '✓ ' : ''}{label}</button>;
}

/** Bottom-sheet renovation editor: changes preview live on the cottage, Save commits them. */
export function RenovateTray({house, onPreview, houseLevel, coins, onUpgrade, onSave, onClose, saving, inside}: {
  house: House; onPreview: (h: House) => void; houseLevel: number; coins: number; onUpgrade: (size: number) => void; onSave: () => void; onClose: () => void; saving: boolean; inside: boolean;
}) {
  const [tab, setTab] = useState<'outside' | 'inside' | 'size'>(inside ? 'inside' : 'outside');
  const set = (patch: Partial<House>) => onPreview({...house, ...patch});
  return <div onPointerDown={e => e.stopPropagation()} style={{position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '44vh', overflowY: 'auto', padding: '12px 14px max(14px, env(safe-area-inset-bottom))', background: 'rgba(255,250,240,.97)', borderRadius: '26px 26px 0 0', boxShadow: '0 -6px 30px rgba(80,60,40,.18)', zIndex: 9}}>
    <div style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap'}}>
      <b style={{fontSize: 17, flex: 1}}>🏠 Renovate your home</b>
      <button className="wc-btn primary" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</button>
      <button className="wc-btn warm" onClick={onClose}>Done</button>
    </div>
    <div className="wc-tabs" style={{padding: '0 0 8px'}}>
      <button className={`wc-tab ${tab === 'outside' ? 'on' : ''}`} onClick={() => setTab('outside')}>🏡 Exterior</button>
      <button className={`wc-tab ${tab === 'inside' ? 'on' : ''}`} onClick={() => setTab('inside')}>🛋️ Interior</button>
      <button className={`wc-tab ${tab === 'size' ? 'on' : ''}`} onClick={() => setTab('size')}>📐 Size</button>
    </div>
    {tab === 'outside' && <>
      <div className="wc-label">Walls</div><Swatches colors={WALL_COLORS} value={house.wall} onChange={wall => set({wall})} />
      <Chips items={SIDINGS} value={house.siding} onChange={siding => set({siding})} />
      <div className="wc-label">Roof</div><Swatches colors={ROOF_COLORS} value={house.roof} onChange={roof => set({roof})} />
      <Chips items={ROOF_STYLES} value={house.roofStyle} onChange={roofStyle => set({roofStyle})} />
      <div className="wc-label">Trim & door</div><Swatches colors={TRIM_COLORS} value={house.trim} onChange={trim => set({trim})} />
      <Swatches colors={DOOR_COLORS} value={house.door} onChange={door => set({door})} />
      <div className="wc-label">Windows & details</div><Chips items={WINDOWS} value={house.windows} onChange={windows => set({windows})} />
      <div className="wc-chips"><Toggle label="Porch" on={house.porch} onChange={porch => set({porch})} /><Toggle label="Chimney" on={house.chimney} onChange={chimney => set({chimney})} /><Toggle label="Flower boxes" on={house.flowerBoxes} onChange={flowerBoxes => set({flowerBoxes})} /></div>
    </>}
    {tab === 'inside' && <>
      <div className="wc-label">Wallpaper</div><Chips items={WALLPAPERS} value={house.wallpaper} onChange={wallpaper => set({wallpaper})} />
      <div className="wc-label">Floor</div><Chips items={FLOORS} value={house.floor} onChange={floor => set({floor})} />
      <p style={{fontSize: 12, color: '#9b8167', fontWeight: 700}}>Step inside to see the interior change live.</p>
    </>}
    {tab === 'size' && HOUSE_SIZES.map((s, i) => <div key={s.name} className="wc-row">
      <span style={{fontSize: 26}}>{['🏠', '🏡', '🏰'][i]}</span>
      <div className="grow"><h4>{s.name}</h4><p>{s.w} × {s.d} m{i > 0 ? ` · 💰 ${s.price.toLocaleString()}` : ' · starter'}</p></div>
      {i <= houseLevel ? <button className={`wc-btn ${house.size === i ? 'primary' : ''}`} onClick={() => set({size: i})}>{house.size === i ? 'Current' : 'Use'}</button>
        : <button className="wc-btn warm" disabled={i !== houseLevel + 1 || coins < s.price} onClick={() => onUpgrade(i)}>Build</button>}
    </div>)}
  </div>;
}
