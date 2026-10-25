import {z} from 'zod';

/** Renovation options for the Habitat cottage. Purely cosmetic except size, which is bought. */
export const WALL_COLORS = ['#b9473d', '#fff3dc', '#f6c9d4', '#cfe3ef', '#f3d58a', '#c8e2b4', '#d9c9f0', '#8a6a52', '#ffffff', '#4f6b8a'];
export const TRIM_COLORS = ['#ffffff', '#f4e6cf', '#3e3a3f', '#8a5f40', '#6fa8a0'];
export const ROOF_COLORS = ['#3e5d4e', '#c4613f', '#4f7f9e', '#8e7cc3', '#e8735f', '#5a4a42', '#f2a3b5', '#6b8f4e'];
export const DOOR_COLORS = ['#a8774c', '#e8473d', '#3f6fa8', '#5a9a6a', '#f2c14e', '#ffffff'];
export const SIDINGS = ['Clapboard', 'Brick', 'Stucco', 'Log cabin'] as const;
export const ROOF_STYLES = ['Gable', 'Steep', 'Barn'] as const;
export const WINDOWS = ['Square', 'Round', 'Arched'] as const;
export const WALLPAPERS = ['Peach dots', 'Mint stripes', 'Lavender', 'Wood panel', 'Sky check', 'Rose garden'] as const;
export const FLOORS = ['Honey oak', 'Walnut', 'Checker tile', 'Cream tile', 'Soft carpet'] as const;

/** Cottage footprints. Every size fits the walk-in living room; Grand matches the reserved HOUSE area in map.ts. */
export const HOUSE_SIZES = [
  {name: 'Cozy cottage', w: 8.6, d: 6.6, price: 0},
  {name: 'Family house', w: 9.8, d: 7.4, price: 6000},
  {name: 'Grand home', w: 11, d: 8.2, price: 18000},
] as const;

const index = (n: number) => z.number().int().min(0).max(n - 1);
export const houseSchema = z.object({
  version: z.literal(1),
  size: index(HOUSE_SIZES.length),
  wall: index(WALL_COLORS.length), trim: index(TRIM_COLORS.length), roof: index(ROOF_COLORS.length), door: index(DOOR_COLORS.length),
  siding: index(SIDINGS.length), roofStyle: index(ROOF_STYLES.length), windows: index(WINDOWS.length),
  wallpaper: index(WALLPAPERS.length), floor: index(FLOORS.length),
  porch: z.boolean(), chimney: z.boolean(), flowerBoxes: z.boolean(),
}).strict();
export type House = z.infer<typeof houseSchema>;

export const DEFAULT_HOUSE: House = {version: 1, size: 0, wall: 1, trim: 0, roof: 1, door: 0, siding: 0, roofStyle: 0, windows: 0, wallpaper: 0, floor: 0, porch: true, chimney: true, flowerBoxes: true};

export function readHouse(json: string | null | undefined): House {
  try {
    const parsed = houseSchema.safeParse(JSON.parse(json ?? '{}'));
    return parsed.success ? parsed.data : DEFAULT_HOUSE;
  } catch {return DEFAULT_HOUSE;}
}
