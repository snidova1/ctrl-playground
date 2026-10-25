/** Small deterministic helpers shared by the browser and the Worker. */
export function hashString(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seeded(...parts: (string | number)[]): () => number {
  return mulberry32(hashString(parts.join('|')));
}

export function pickWeighted<T>(items: readonly T[], weight: (item: T) => number, roll: number): T | null {
  const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
  if (total <= 0) return null;
  let cursor = roll * total;
  for (const item of items) {
    cursor -= Math.max(0, weight(item));
    if (cursor < 0) return item;
  }
  return items[items.length - 1] ?? null;
}

export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
