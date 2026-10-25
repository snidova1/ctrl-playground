'use client';
import {fishLook} from '@/game/core/fish-looks';

/** Species-specific fish portrait: body shape, fins and pattern match the 3D model. */
export function FishIcon({id, size, silhouette}: {id: string; size: number; silhouette: boolean}) {
  const look = fishLook(id);
  const body = silhouette ? '#cdbfa8' : look.body, belly = silhouette ? '#d8cbb5' : look.belly, accent = silhouette ? '#b9ab94' : look.accent, fin = silhouette ? '#c2b49d' : look.fin;
  const stroke = silhouette ? '#b5a68e' : '#5b4636';
  const pid = `fp-${id}-${silhouette ? 's' : 'c'}`;
  const p = look.pattern;
  const shapes: Record<string, string> = {
    carp: 'M8 32 C 14 16, 40 12, 50 26 L 60 16 L 58 32 L 60 48 L 50 38 C 40 52, 14 48, 8 32 Z',
    slim: 'M6 32 C 14 22, 40 20, 50 28 L 60 20 L 57 32 L 60 44 L 50 36 C 40 44, 14 42, 6 32 Z',
    round: 'M14 32 C 14 14, 46 14, 48 32 C 46 50, 14 50, 14 32 Z M48 32 L 58 24 L 58 40 Z',
    flat: 'M8 32 C 10 18, 44 16, 50 30 L 60 22 L 58 32 L 60 42 L 50 34 C 44 48, 10 46, 8 32 Z',
    whisker: 'M6 33 C 12 20, 42 20, 50 29 L 60 20 L 57 33 L 60 46 L 50 37 C 42 46, 12 46, 6 33 Z',
    tuna: 'M4 32 C 12 18, 38 16, 48 28 L 60 12 L 54 32 L 60 52 L 48 36 C 38 48, 12 46, 4 32 Z',
    fancy: 'M10 32 C 14 18, 34 16, 40 28 L 60 10 L 52 32 L 60 54 L 40 36 C 34 48, 14 46, 10 32 Z',
  };
  return <svg viewBox="0 0 64 64" style={{width: size, height: size}}>
    <defs>
      <clipPath id={`${pid}-clip`}><path d={shapes[look.shape]} /></clipPath>
      <linearGradient id={`${pid}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0.2" stopColor={body} /><stop offset="0.85" stopColor={belly} /></linearGradient>
    </defs>
    <path d={shapes[look.shape]} fill={`url(#${pid}-g)`} />
    <g clipPath={`url(#${pid}-clip)`} opacity={silhouette ? 0 : 0.9}>
      {p === 'stripes' && [12, 20, 28, 36, 44].map(x => <path key={x} d={`M${x} 14 q 4 10 0 18`} stroke={accent} strokeWidth="3" fill="none" />)}
      {p === 'bands' && <rect x="0" y="10" width="64" height="16" fill={accent} />}
      {p === 'spots' && [[18, 24], [28, 22], [36, 28], [24, 32], [42, 24], [32, 36]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill={accent} />)}
      {p === 'speckle' && [[14, 26], [20, 22], [26, 27], [32, 22], [38, 27], [44, 24], [22, 32], [34, 31]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" fill={accent} />)}
      {p === 'koi' && <><ellipse cx="22" cy="24" rx="9" ry="7" fill={accent} /><ellipse cx="40" cy="30" rx="7" ry="6" fill={accent} /><circle cx="31" cy="22" r="2.5" fill="#2b2b30" /></>}
      {p === 'gold' && <rect x="0" y="30" width="64" height="4" fill={accent} opacity="0.7" />}
    </g>
    <path d={shapes[look.shape]} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
    {look.shape !== 'flat' && look.shape !== 'round' && <path d="M24 18 Q 30 8 38 18" fill={fin} stroke={stroke} strokeWidth="1.6" />}
    {look.shape === 'round' && [[16, 18], [24, 14], [34, 14], [42, 18], [16, 46], [26, 50], [36, 50], [44, 46]].map(([x, y]) => <path key={`${x}${y}`} d={`M${x} ${y} l ${x < 30 ? -3 : 3} ${y < 30 ? -4 : 4}`} stroke={stroke} strokeWidth="1.6" />)}
    {look.shape === 'whisker' && <><path d="M10 34 q -6 4 -8 10" stroke={stroke} strokeWidth="1.4" fill="none" /><path d="M10 31 q -6 -3 -8 -8" stroke={stroke} strokeWidth="1.4" fill="none" /></>}
    {look.shape === 'tuna' && [32, 37, 42].map(x => <path key={x} d={`M${x} 20 l 2 -3 l 2 3 M${x} 44 l 2 3 l 2 -3`} fill={silhouette ? fin : '#f2c84a'} stroke={stroke} strokeWidth="0.8" />)}
    <circle cx={look.shape === 'round' ? 22 : 16} cy={look.shape === 'flat' ? 26 : 29} r={look.shape === 'round' ? 3.4 : 2.8} fill="#fff" stroke={stroke} strokeWidth="1" />
    <circle cx={look.shape === 'round' ? 21 : 15.4} cy={look.shape === 'flat' ? 26 : 29} r="1.5" fill="#1d1d22" />
  </svg>;
}
