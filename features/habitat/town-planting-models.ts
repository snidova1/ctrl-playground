import type {TownDistrictKind} from './town-districts';
/** Curated existing Kenney CC0 geometry. Positions and solid trunk footprints
 * stay in town-region-layout/public-world-geography, shared with the server. */
export const TOWN_PLANTING_MODELS:Readonly<Record<TownDistrictKind,readonly string[]>>={
 center:['nature-kit/tree_detailed','nature-kit/tree_tall','nature-kit/tree_oak'],
 residential:['nature-kit/tree_oak','nature-kit/tree_tall','nature-kit/tree_detailed'],
 garden:['nature-kit/tree_oak','nature-kit/tree_fat','nature-kit/tree_pineRoundC'],
 harbor:['nature-kit/tree_pineRoundB','nature-kit/tree_oak','nature-kit/tree_pineTallB'],
 workshop:['nature-kit/tree_plateau','nature-kit/tree_oak','nature-kit/tree_small'],
 festival:['nature-kit/tree_oak','nature-kit/tree_pineDefaultA','nature-kit/tree_plateau'],
 orchard:['nature-kit/tree_fat','nature-kit/tree_oak','nature-kit/tree_small'],
};
