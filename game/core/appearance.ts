import {z} from 'zod';
import {seeded} from './rng';
import {ACCESSORIES, BOTTOMS, HATS, TOPS} from './wardrobe';

/**
 * Avatar look for the anime VRM bodies. Index 0 of each tint palette is the
 * model's authored "natural" colour; the rest recolour the material.
 */
export const BODIES = ['Sunny', 'Willow', 'Pepper', 'Maple'] as const;
export const BODY_GENDER = ['girl', 'girl', 'boy', 'boy'] as const;
export const SKIN_TONES = ['', '#ffe9dc', '#f6d2bb', '#e5b593', '#c98d68', '#9b6646'];
export const HAIR_COLORS = ['', '#3a2a24', '#7a4b34', '#c98a4f', '#f0d08e', '#f5e9da', '#f29cb7', '#9fc0f0', '#b9a3e8', '#7fc4a4', '#e0604a', '#5e5872'];
export const EYE_COLORS = ['', '#4a3426', '#4f86e0', '#3fa77a', '#c77a32', '#9c5bd1', '#e0506e', '#e3b23c'];
export const CLOTH_COLORS = ['', '#ffffff', '#f7dcb0', '#f6b3c5', '#f38a75', '#f7cf55', '#a9d982', '#7fd0c6', '#86b2ef', '#b39cea', '#6b7896', '#3f3a44', '#c99160'];

const index = (length: number) => z.number().int().min(0).max(length - 1);
export const appearanceSchema = z.object({
  version: z.literal(3),
  body: index(BODIES.length),
  skin: index(SKIN_TONES.length),
  hairColor: index(HAIR_COLORS.length),
  eyeColor: index(EYE_COLORS.length),
  top: index(TOPS.length),
  bottom: index(BOTTOMS.length),
  shoes: index(CLOTH_COLORS.length),
  hat: index(HATS.length),
  hatColor: index(CLOTH_COLORS.length),
  accessory: index(ACCESSORIES.length),
}).strict();
export type Appearance = z.infer<typeof appearanceSchema>;

const starterIndexes = <T extends {starter?: boolean}>(list: T[]) => list.map((item, i) => (item.starter ? i : -1)).filter(i => i >= 0);

/** Random look using only free starter fashion (guests and new players). */
export function randomAppearance(seed: string, anyFashion = false): Appearance {
  const r = seeded('look', seed);
  const pick = (n: number, natural = 0.25) => (r() < natural ? 0 : 1 + Math.floor(r() * (n - 1)));
  const from = (list: number[]) => list[Math.floor(r() * list.length)];
  const range = (n: number) => Array.from({length: n}, (_, i) => i);
  return {
    version: 3, body: Math.floor(r() * BODIES.length), skin: pick(SKIN_TONES.length, 0.5), hairColor: pick(HAIR_COLORS.length),
    eyeColor: pick(EYE_COLORS.length),
    top: from(anyFashion ? range(TOPS.length) : starterIndexes(TOPS)), bottom: from(anyFashion ? range(BOTTOMS.length) : starterIndexes(BOTTOMS)),
    shoes: pick(CLOTH_COLORS.length, 0.5),
    hat: from(anyFashion ? range(HATS.length) : starterIndexes(HATS)), hatColor: 1 + Math.floor(r() * (CLOTH_COLORS.length - 1)),
    accessory: r() < 0.5 ? 0 : from(anyFashion ? range(ACCESSORIES.length) : starterIndexes(ACCESSORIES)),
  };
}

/** Saves from older builds and corrupted JSON fall back to a stable random look. */
export function normalizeAppearance(value: unknown, seed: string): Appearance {
  const parsed = appearanceSchema.safeParse(value);
  return parsed.success ? parsed.data : randomAppearance(seed);
}

export function lookColors(a: Appearance) {
  return {
    skin: SKIN_TONES[a.skin], hair: HAIR_COLORS[a.hairColor], eye: EYE_COLORS[a.eyeColor],
    shoes: CLOTH_COLORS[a.shoes], hat: CLOTH_COLORS[a.hatColor] || '#f6b3c5',
  };
}

export const nameSchema = z.string().trim().min(2).max(18).regex(/^[\p{L}\p{N} _'-]+$/u, 'Use letters, numbers and spaces.');
