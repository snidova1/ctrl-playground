'use client';
import {useRef, useState} from 'react';
import {Canvas, useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {BODIES, CLOTH_COLORS, EYE_COLORS, HAIR_COLORS, SKIN_TONES, randomAppearance, type Appearance} from '@/game/core/appearance';
import {ACCESSORIES, BOTTOMS, HATS, TOPS, accessoryItemId, hatItemId, outfitItemId} from '@/game/core/wardrobe';
import {Avatar, type AvatarMotion} from '../three/avatar';
import {sfx} from '../audio';

function Turntable({look}: {look: Appearance}) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<AvatarMotion>({anim: 'wave', speed: 0, tool: 'none', actionAt: performance.now(), mood: 'happy'});
  const t = useRef(0);
  useFrame((state, dt) => {
    t.current += dt;
    if (group.current) group.current.rotation.y = Math.sin(t.current * 0.6) * 0.6;
    motion.current.anim = t.current % 9 < 2.2 ? 'wave' : t.current % 9 < 3.6 ? 'cheer' : 'idle';
    motion.current.mood = motion.current.anim === 'idle' ? null : 'happy';
    state.camera.lookAt(0, 0.95, 0);
  });
  return <group ref={group}><Avatar look={look} motion={motion} /></group>;
}

export function AvatarPreview({look}: {look: Appearance}) {
  // offsetSize: measure without the panel's pop-in transform, so the preview fills its box.
  return <Canvas resize={{offsetSize: true}} shadows camera={{position: [0, 1.25, 3.1], fov: 34}} dpr={[1, 2]} onCreated={({gl}) => {gl.toneMapping = THREE.ACESFilmicToneMapping;}}>
    <hemisphereLight args={['#eef7ff', '#b6d79a', 1.7]} />
    <directionalLight position={[2, 4, 3]} intensity={2.3} castShadow />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[1.4, 32]} /><meshToonMaterial color="#cbe8b0" /></mesh>
    <Turntable look={look} />
  </Canvas>;
}

function Swatches({colors, value, onChange}: {colors: string[]; value: number; onChange: (i: number) => void}) {
  return <div className="wc-swatches">{colors.map((c, i) => <button key={i} className={`wc-swatch ${value === i ? 'on' : ''}`} title={i === 0 ? 'Natural' : c}
    style={{background: c || 'conic-gradient(#f6d2bb,#c98a4f,#9fc0f0,#f29cb7,#f6d2bb)'}} onClick={() => {sfx.tap(); onChange(i);}} />)}</div>;
}
function Chips<T extends {name: string}>({items, value, onChange, owned}: {items: T[]; value: number; onChange: (i: number) => void; owned: (i: number) => boolean}) {
  return <div className="wc-chips">{items.map((it, i) => <button key={i} className={`wc-chip ${value === i ? 'on' : ''} ${owned(i) ? '' : 'locked'}`} onClick={() => {if (!owned(i)) return; sfx.tap(); onChange(i);}}>{owned(i) ? '' : '🔒 '}{it.name}</button>)}</div>;
}

/** Character creator / wardrobe. `inventory` null means only starter fashion is unlocked. */
export function AvatarEditor({initial, inventory, name, onName, onSave, saveLabel = 'Save look', busy}: {
  initial: Appearance; inventory: Record<string, number> | null; name?: string; onName?: (n: string) => void; onSave: (look: Appearance) => void; saveLabel?: string; busy?: boolean;
}) {
  const [look, setLook] = useState(initial);
  const [tab, setTab] = useState<'body' | 'hair' | 'clothes' | 'extras'>('body');
  const set = (patch: Partial<Appearance>) => setLook(l => ({...l, ...patch}));
  const owns = (id: string, starter?: boolean) => !!starter || !!inventory?.[id];
  return <div className="wc-creator">
    <div className="wc-creator-preview"><AvatarPreview look={look} /></div>
    <div>
      {onName && <><div className="wc-label">Name</div><input className="wc-field" value={name} maxLength={18} onChange={e => onName(e.target.value)} placeholder="Your name" style={{margin: '6px 0 12px'}} /></>}
      <div className="wc-tabs" style={{padding: '0 0 8px'}}>
        {(['body', 'hair', 'clothes', 'extras'] as const).map(t => <button key={t} className={`wc-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>{{body: '🧍 Body', hair: '💇 Hair & Eyes', clothes: '👕 Clothes', extras: '🎀 Extras'}[t]}</button>)}
      </div>
      {tab === 'body' && <>
        <div className="wc-label">Style</div>
        <div className="wc-chips">{BODIES.map((b, i) => <button key={b} className={`wc-chip ${look.body === i ? 'on' : ''}`} onClick={() => set({body: i})}>{b}</button>)}</div>
        <div className="wc-label">Skin</div><Swatches colors={SKIN_TONES} value={look.skin} onChange={skin => set({skin})} />
      </>}
      {tab === 'hair' && <>
        <div className="wc-label">Hair colour</div><Swatches colors={HAIR_COLORS} value={look.hairColor} onChange={hairColor => set({hairColor})} />
        <div className="wc-label">Eye colour</div><Swatches colors={EYE_COLORS} value={look.eyeColor} onChange={eyeColor => set({eyeColor})} />
      </>}
      {tab === 'clothes' && <>
        <div className="wc-label">Top</div><Chips items={TOPS} value={look.top} onChange={top => set({top})} owned={i => owns(outfitItemId(TOPS[i]), TOPS[i].starter)} />
        <div className="wc-label">Bottom</div><Chips items={BOTTOMS} value={look.bottom} onChange={bottom => set({bottom})} owned={i => owns(outfitItemId(BOTTOMS[i]), BOTTOMS[i].starter)} />
        <div className="wc-label">Shoes</div><Swatches colors={CLOTH_COLORS} value={look.shoes} onChange={shoes => set({shoes})} />
      </>}
      {tab === 'extras' && <>
        <div className="wc-label">Hat</div><Chips items={HATS} value={look.hat} onChange={hat => set({hat})} owned={i => owns(hatItemId(HATS[i]), HATS[i].starter)} />
        <div className="wc-label">Accessory</div><Chips items={ACCESSORIES} value={look.accessory} onChange={accessory => set({accessory})} owned={i => owns(accessoryItemId(ACCESSORIES[i]), ACCESSORIES[i].starter)} />
        <div className="wc-label">Accent colour</div><Swatches colors={CLOTH_COLORS.slice(1)} value={look.hatColor - 1} onChange={i => set({hatColor: i + 1})} />
      </>}
      <p style={{fontSize: 12, color: '#9b8167', fontWeight: 700}}>🔒 More outfits, hats and accessories are sold at Petal Boutique.</p>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
        <button className="wc-btn" onClick={() => {sfx.tap(); setLook(randomAppearance(crypto.randomUUID(), false));}}>🎲 Random</button>
        <button className="wc-btn primary" disabled={busy || (onName && (name ?? '').trim().length < 2)} onClick={() => onSave(look)}>{busy ? 'Saving…' : saveLabel}</button>
      </div>
    </div>
  </div>;
}
