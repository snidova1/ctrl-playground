/** Curated from the user's Kenney reference. Existing local CC0, no paid/new binary downloads. */
export const TOWN_POLISH_ASSETS=[
 'nature-kit/tree_detailed','nature-kit/plant_bushDetailed','nature-kit/grass_leafsLarge',
 'nature-kit/flower_redA','nature-kit/flower_yellowB','nature-kit/flower_purpleC','nature-kit/pot_small',
 'furniture-kit/chairRounded','furniture-kit/benchCushion','furniture-kit/tableRound','furniture-kit/trashcan',
 'food-kit/plate','food-kit/croissant','food-kit/cup-tea','food-kit/cup-saucer',
 'food-kit/plate-rectangle','food-kit/apple','food-kit/tomato','platformer-kit/crate',
] as const;
export const TOWN_RENDER_ALIASES:Readonly<Record<string,string>>={
 'furniture-kit/chair':'furniture-kit/chairRounded',
 'furniture-kit/bench':'furniture-kit/benchCushion',
};
