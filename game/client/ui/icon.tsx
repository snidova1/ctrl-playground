'use client';
import {FASHION_BY_ID, ITEMS, type ItemDef} from '@/game/core/items';
import {OUTFITS, outfitItemId} from '@/game/core/wardrobe';
import {FishIcon} from './fish-icon';

/** Item artwork: Kenney thumbnails where they exist, otherwise a soft vector glyph in the item colour. */
export function ItemIcon({id, size = 48, silhouette = false}: {id: string; size?: number; silhouette?: boolean}) {
  const item = ITEMS[id];
  if (!item) return <span style={{fontSize: size * 0.6}}>❔</span>;
  if (item.kind === 'fashion') return <FashionIcon id={id} size={size} />;
  if (item.kind === 'fish') return <FishIcon id={id} size={size} silhouette={silhouette} />;
  if (item.thumb && !silhouette) return <img src={item.thumb} alt="" width={size} height={size} style={{objectFit: 'contain', imageRendering: 'auto'}} draggable={false} />;
  return <Glyph item={item} size={size} silhouette={silhouette} />;
}

function Glyph({item, size, silhouette}: {item: ItemDef; size: number; silhouette: boolean}) {
  const c = silhouette ? '#cdbfa8' : item.color;
  const dark = silhouette ? '#b5a68e' : '#5b4636';
  const glyph = item.glyph ?? (item.kind === 'fashion' ? 'feather' : 'leaf');
  const s = {width: size, height: size};
  switch (glyph) {
    case 'fish': return <svg viewBox="0 0 64 64" style={s}><path d="M6 32c8-14 26-18 40-8l12-8v32l-12-8C32 50 14 46 6 32z" fill={c} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" /><circle cx="18" cy="29" r="3" fill={dark} /><path d="M30 24c3 5 3 11 0 16" stroke="white" strokeWidth="2.5" fill="none" opacity=".6" /></svg>;
    case 'butterfly': return <svg viewBox="0 0 64 64" style={s}><ellipse cx="20" cy="24" rx="14" ry="12" fill={c} stroke={dark} strokeWidth="2" /><ellipse cx="44" cy="24" rx="14" ry="12" fill={c} stroke={dark} strokeWidth="2" /><ellipse cx="22" cy="44" rx="10" ry="9" fill={c} stroke={dark} strokeWidth="2" /><ellipse cx="42" cy="44" rx="10" ry="9" fill={c} stroke={dark} strokeWidth="2" /><rect x="30" y="16" width="4" height="36" rx="2" fill={dark} /><path d="M31 16l-5-8M33 16l5-8" stroke={dark} strokeWidth="2" /></svg>;
    case 'beetle': return <svg viewBox="0 0 64 64" style={s}><ellipse cx="32" cy="36" rx="18" ry="20" fill={c} stroke={dark} strokeWidth="2.5" /><circle cx="32" cy="14" r="8" fill={dark} /><path d="M32 18v36" stroke={dark} strokeWidth="2" /><path d="M14 30l-8-4M14 40l-8 2M50 30l8-4M50 40l8 2" stroke={dark} strokeWidth="2.5" /></svg>;
    case 'bug': return <svg viewBox="0 0 64 64" style={s}><ellipse cx="32" cy="36" rx="12" ry="18" fill={c} stroke={dark} strokeWidth="2.5" /><ellipse cx="18" cy="26" rx="12" ry="6" fill="white" opacity=".8" stroke={dark} strokeWidth="1.5" /><ellipse cx="46" cy="26" rx="12" ry="6" fill="white" opacity=".8" stroke={dark} strokeWidth="1.5" /><circle cx="32" cy="16" r="6" fill={dark} /></svg>;
    case 'bird': return <svg viewBox="0 0 64 64" style={s}><ellipse cx="30" cy="38" rx="20" ry="15" fill={c} stroke={dark} strokeWidth="2.5" /><circle cx="44" cy="24" r="10" fill={c} stroke={dark} strokeWidth="2.5" /><path d="M53 24l8 3-8 3z" fill="#f2a33a" /><circle cx="46" cy="22" r="2.5" fill={dark} /><path d="M14 36c6-6 14-6 18 2" stroke={dark} strokeWidth="2" fill="none" /></svg>;
    case 'seed': return <svg viewBox="0 0 64 64" style={s}><path d="M14 18h36l-4 36H18z" fill="#e8d3ad" stroke={dark} strokeWidth="2.5" strokeLinejoin="round" /><circle cx="32" cy="36" r="9" fill={c} /><path d="M32 27c-2-6 2-10 6-10" stroke="#6fb04f" strokeWidth="3" fill="none" /></svg>;
    case 'shell': return <svg viewBox="0 0 64 64" style={s}><path d="M32 8L8 46c8 8 40 8 48 0z" fill={c} stroke={dark} strokeWidth="2.5" strokeLinejoin="round" /><path d="M32 8L20 50M32 8v44M32 8l12 42" stroke={dark} strokeWidth="1.8" opacity=".6" /></svg>;
    case 'gem': return <svg viewBox="0 0 64 64" style={s}><circle cx="32" cy="34" r="18" fill={c} stroke={dark} strokeWidth="2.5" /><circle cx="25" cy="27" r="6" fill="white" opacity=".9" /></svg>;
    case 'wood': return <svg viewBox="0 0 64 64" style={s}><rect x="8" y="22" width="48" height="20" rx="10" fill={c} stroke={dark} strokeWidth="2.5" /><circle cx="48" cy="32" r="7" fill="#d9b48a" stroke={dark} strokeWidth="2" /><circle cx="48" cy="32" r="3" fill="none" stroke={dark} strokeWidth="1.5" /></svg>;
    case 'stone': return <svg viewBox="0 0 64 64" style={s}><path d="M10 44c0-16 12-28 26-26s20 12 18 24c-2 8-40 10-44 2z" fill={c} stroke={dark} strokeWidth="2.5" /><path d="M24 28c4-3 9-4 13-2" stroke="white" strokeWidth="2.5" opacity=".6" fill="none" /></svg>;
    case 'feather': return <svg viewBox="0 0 64 64" style={s}><path d="M48 8C24 14 14 34 16 52c18-2 34-18 32-44z" fill={c} stroke={dark} strokeWidth="2.5" /><path d="M16 56L44 14" stroke={dark} strokeWidth="2" /></svg>;
    default: return <svg viewBox="0 0 64 64" style={s}><path d="M12 50C12 24 30 10 54 10c0 24-14 42-42 40z" fill={c} stroke={dark} strokeWidth="2.5" /><path d="M12 50L40 22" stroke={dark} strokeWidth="2" /></svg>;
  }
}

/** Clothing silhouettes painted with the outfit's own fabric pattern. */
function FashionIcon({id, size}: {id: string; size: number}) {
  const def = FASHION_BY_ID[id];
  const outfit = OUTFITS.find(o => outfitItemId(o) === id);
  const base = outfit?.base || def?.color || '#f6b3c5', accent = outfit?.accent || '#ffffff';
  const pid = `p-${id}`;
  const p = outfit?.pattern ?? 'plain';
  const pattern = <pattern id={pid} width="8" height="8" patternUnits="userSpaceOnUse">
    <rect width="8" height="8" fill={base} />
    {p === 'stripes' || p === 'sailor' ? <rect width="8" height="2.5" fill={accent} /> : null}
    {p === 'wide-stripes' ? <rect width="8" height="4" fill={accent} /> : null}
    {p === 'polka' || p === 'cherry' ? <circle cx="4" cy="4" r="1.6" fill={accent} /> : null}
    {p === 'plaid' || p === 'gingham' ? <><rect width="3" height="8" fill={accent} opacity=".5" /><rect width="8" height="3" fill={accent} opacity=".5" /></> : null}
    {p === 'checker' ? <><rect width="4" height="4" fill={accent} /><rect x="4" y="4" width="4" height="4" fill={accent} /></> : null}
    {p === 'floral' ? <circle cx="4" cy="4" r="2" fill={accent} /> : null}
    {p === 'stars' ? <path d="M4 1l.9 2.1 2.1.2-1.6 1.4.5 2.2L4 5.8 2.1 6.9l.5-2.2L1 3.3l2.1-.2z" fill={accent} /> : null}
    {p === 'hearts' ? <path d="M4 6.5C1 4.5 1.5 2 3 2c.6 0 .9.4 1 .7.1-.3.4-.7 1-.7 1.5 0 2 2.5-1 4.5z" fill={accent} /> : null}
    {p === 'denim' || p === 'knit' ? <path d="M0 8L8 0" stroke={accent} strokeWidth="1" /> : null}
    {p === 'camo' ? <ellipse cx="3" cy="4" rx="2.5" ry="1.6" fill={accent} /> : null}
    {p === 'rainbow' ? <><rect width="8" height="2" fill="#ff8a8a" /><rect y="2" width="8" height="2" fill="#ffe07a" /><rect y="4" width="8" height="2" fill="#9be58a" /><rect y="6" width="8" height="2" fill="#8ad0ff" /></> : null}
  </pattern>;
  const fill = `url(#${pid})`, stroke = '#6b5442';
  const shape = def?.slot === 'top' ? <path d="M22 10l-14 8 5 12 6-3v27h26V27l6 3 5-12-14-8c-2 5-6 7-10 7s-8-2-10-7z" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
    : def?.slot === 'bottom' ? <path d="M14 10h36l4 44H38l-6-28-6 28H10z" fill={fill} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
    : def?.slot === 'hat' ? <><path d="M14 40c0-14 8-24 18-24s18 10 18 24z" fill={base} stroke={stroke} strokeWidth="2.5" /><ellipse cx="32" cy="42" rx="26" ry="7" fill={base} stroke={stroke} strokeWidth="2.5" /></>
    : <><circle cx="22" cy="34" r="11" fill="none" stroke={stroke} strokeWidth="4" /><circle cx="44" cy="34" r="11" fill="none" stroke={stroke} strokeWidth="4" /><path d="M33 33h0" stroke={stroke} strokeWidth="4" /><circle cx="32" cy="16" r="6" fill={base} /></>;
  return <svg viewBox="0 0 64 64" style={{width: size, height: size}}><defs>{pattern}</defs>{shape}</svg>;
}

export function Stars({n}: {n: number}) {
  return <span className="wc-stars">{'★'.repeat(n)}{'☆'.repeat(Math.max(0, 5 - n))}</span>;
}
