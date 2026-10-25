/**
 * Game item catalog. Everything here is a nonfinancial game item: coins are a
 * soft in-game currency and are never convertible to CTRL, Keys or any token.
 */
import {ACCESSORIES, HATS, OUTFITS, accessoryItemId, hatItemId, outfitItemId} from './wardrobe';

export type ItemKind = 'fish' | 'bug' | 'bird' | 'crop' | 'seed' | 'forage' | 'material' | 'dish' | 'furniture' | 'ingredient' | 'fashion';
export type Water = 'pond' | 'river' | 'sea';
export type Habitat = 'meadow' | 'flowers' | 'trees' | 'water' | 'beach' | 'forest' | 'plaza' | 'lamps';
export type TimeWindow = 'any' | 'day' | 'night';

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  /** Coins received when sold at the General Store. */
  price: number;
  rarity: 1 | 2 | 3 | 4 | 5;
  color: string;
  /** Kenney thumbnail under /kit, or a procedural icon glyph. */
  thumb?: string;
  glyph?: 'fish' | 'bug' | 'butterfly' | 'beetle' | 'bird' | 'seed' | 'leaf' | 'shell' | 'gem' | 'wood' | 'stone' | 'feather';
  description: string;
  energy?: number;
}

export interface FishDef extends ItemDef { kind: 'fish'; water: Water[]; time: TimeWindow; size: [number, number]; weather?: 'rain' }
export interface BugDef extends ItemDef { kind: 'bug'; habitat: Habitat; time: TimeWindow; flying: boolean }
export interface BirdDef extends ItemDef { kind: 'bird'; habitat: Habitat; time: TimeWindow }

const food = (name: string) => `/kit/food-kit/thumbs/${name}.webp`;
const nature = (name: string) => `/kit/nature-kit/thumbs/${name}.webp`;

export const FISH: FishDef[] = [
  {id: 'crucian-carp', name: 'Crucian Carp', kind: 'fish', water: ['pond'], time: 'any', size: [12, 30], price: 40, rarity: 1, color: '#c9a25b', glyph: 'fish', description: 'A round, friendly pond regular.'},
  {id: 'pond-loach', name: 'Pond Loach', kind: 'fish', water: ['pond', 'river'], time: 'any', size: [8, 18], price: 55, rarity: 1, color: '#9b8d6c', glyph: 'fish', description: 'Wiggles happily in the mud.'},
  {id: 'goldfish', name: 'Goldfish', kind: 'fish', water: ['pond'], time: 'day', size: [6, 14], price: 120, rarity: 2, color: '#f39a3d', glyph: 'fish', description: 'Somebody must have let it go here long ago.'},
  {id: 'koi', name: 'Koi', kind: 'fish', water: ['pond'], time: 'any', size: [40, 80], price: 680, rarity: 4, color: '#f06b4f', glyph: 'fish', description: 'Patterned like a painting. Lucky!'},
  {id: 'river-trout', name: 'River Trout', kind: 'fish', water: ['river'], time: 'any', size: [20, 45], price: 90, rarity: 1, color: '#86a6a0', glyph: 'fish', description: 'Speckled and quick in the current.'},
  {id: 'sweetfish', name: 'Sweetfish', kind: 'fish', water: ['river'], time: 'day', size: [15, 28], price: 140, rarity: 2, color: '#b8d1bf', glyph: 'fish', description: 'Smells faintly of melon.'},
  {id: 'catfish', name: 'Whisker Catfish', kind: 'fish', water: ['river', 'pond'], time: 'night', size: [35, 90], price: 260, rarity: 3, color: '#6f6a5c', glyph: 'fish', description: 'Comes out after sunset to grumble.'},
  {id: 'golden-trout', name: 'Golden Trout', kind: 'fish', water: ['river'], time: 'any', size: [30, 55], price: 1500, rarity: 5, color: '#f5c542', glyph: 'fish', description: 'A shimmer few anglers ever see.', weather: 'rain'},
  {id: 'sardine', name: 'Sardine', kind: 'fish', water: ['sea'], time: 'any', size: [10, 20], price: 35, rarity: 1, color: '#9fb6c9', glyph: 'fish', description: 'Travels in sparkling schools.'},
  {id: 'mackerel', name: 'Mackerel', kind: 'fish', water: ['sea'], time: 'any', size: [25, 45], price: 85, rarity: 1, color: '#5f8fa8', glyph: 'fish', description: 'Striped like the summer sea.'},
  {id: 'sea-bream', name: 'Sea Bream', kind: 'fish', water: ['sea'], time: 'day', size: [30, 60], price: 220, rarity: 2, color: '#f09aa0', glyph: 'fish', description: 'A rosy fish for celebrations.'},
  {id: 'flounder', name: 'Flounder', kind: 'fish', water: ['sea'], time: 'any', size: [25, 50], price: 180, rarity: 2, color: '#b5a07a', glyph: 'fish', description: 'Both eyes on one side. Rude.'},
  {id: 'pufferfish', name: 'Pufferfish', kind: 'fish', water: ['sea'], time: 'night', size: [15, 35], price: 320, rarity: 3, color: '#e7d58a', glyph: 'fish', description: 'Puffs up when surprised.'},
  {id: 'bluefin-tuna', name: 'Bluefin Tuna', kind: 'fish', water: ['sea'], time: 'any', size: [120, 250], price: 2200, rarity: 5, color: '#3c5d86', glyph: 'fish', description: 'The king of the pier. Hold on tight!'},
];

export const BUGS: BugDef[] = [
  {id: 'cabbage-white', name: 'Cabbage White', kind: 'bug', habitat: 'meadow', time: 'day', flying: true, price: 30, rarity: 1, color: '#f4f1e6', glyph: 'butterfly', description: 'Dances over every garden.'},
  {id: 'swallowtail', name: 'Swallowtail', kind: 'bug', habitat: 'flowers', time: 'day', flying: true, price: 160, rarity: 2, color: '#f2cf4b', glyph: 'butterfly', description: 'Elegant tails, bold stripes.'},
  {id: 'morpho', name: 'Blue Morpho', kind: 'bug', habitat: 'forest', time: 'day', flying: true, price: 900, rarity: 4, color: '#4aa3f0', glyph: 'butterfly', description: 'A piece of sky with wings.'},
  {id: 'ladybug', name: 'Ladybug', kind: 'bug', habitat: 'flowers', time: 'day', flying: false, price: 45, rarity: 1, color: '#e2493b', glyph: 'beetle', description: 'Seven lucky spots.'},
  {id: 'honeybee', name: 'Honeybee', kind: 'bug', habitat: 'flowers', time: 'day', flying: true, price: 70, rarity: 1, color: '#f2b538', glyph: 'bug', description: 'Busy, buzzy, brilliant.'},
  {id: 'grasshopper', name: 'Grasshopper', kind: 'bug', habitat: 'meadow', time: 'any', flying: false, price: 50, rarity: 1, color: '#86b84a', glyph: 'bug', description: 'Hops away when you get close.'},
  {id: 'dragonfly', name: 'Red Dragonfly', kind: 'bug', habitat: 'water', time: 'day', flying: true, price: 110, rarity: 2, color: '#d9583c', glyph: 'bug', description: 'Hovers over still water.'},
  {id: 'firefly', name: 'Firefly', kind: 'bug', habitat: 'water', time: 'night', flying: true, price: 240, rarity: 3, color: '#e9f27a', glyph: 'bug', description: 'Tiny lanterns of the pond.'},
  {id: 'cicada', name: 'Cicada', kind: 'bug', habitat: 'trees', time: 'day', flying: false, price: 90, rarity: 1, color: '#7c8a55', glyph: 'beetle', description: 'The sound of summer.'},
  {id: 'stag-beetle', name: 'Stag Beetle', kind: 'bug', habitat: 'trees', time: 'night', flying: false, price: 520, rarity: 4, color: '#6a3f2a', glyph: 'beetle', description: 'Mighty jaws, gentle heart.'},
  {id: 'luna-moth', name: 'Luna Moth', kind: 'bug', habitat: 'lamps', time: 'night', flying: true, price: 300, rarity: 3, color: '#b8eab0', glyph: 'butterfly', description: 'Drawn to the plaza lanterns.'},
  {id: 'hermit-crab', name: 'Hermit Crab', kind: 'bug', habitat: 'beach', time: 'any', flying: false, price: 120, rarity: 2, color: '#e88a5c', glyph: 'beetle', description: 'Borrowed a shell. Nice one.'},
];

export const BIRDS: BirdDef[] = [
  {id: 'sparrow', name: 'Tree Sparrow', kind: 'bird', habitat: 'plaza', time: 'day', price: 0, rarity: 1, color: '#a57d55', glyph: 'bird', description: 'Chirps for crumbs by the fountain.'},
  {id: 'pigeon', name: 'Rock Pigeon', kind: 'bird', habitat: 'plaza', time: 'any', price: 0, rarity: 1, color: '#9aa0ab', glyph: 'bird', description: 'Coos at every passerby.'},
  {id: 'robin', name: 'Robin', kind: 'bird', habitat: 'meadow', time: 'day', price: 0, rarity: 1, color: '#d9733f', glyph: 'bird', description: 'Wears a cozy orange scarf.'},
  {id: 'blue-tit', name: 'Blue Tit', kind: 'bird', habitat: 'trees', time: 'day', price: 0, rarity: 2, color: '#6fa8dc', glyph: 'bird', description: 'Acrobat of the branches.'},
  {id: 'woodpecker', name: 'Woodpecker', kind: 'bird', habitat: 'forest', time: 'day', price: 0, rarity: 2, color: '#c24b3a', glyph: 'bird', description: 'Tap-tap-tapping a tune.'},
  {id: 'owl', name: 'Tawny Owl', kind: 'bird', habitat: 'forest', time: 'night', price: 0, rarity: 3, color: '#8b6a48', glyph: 'bird', description: 'Wise eyes in the moonlight.'},
  {id: 'seagull', name: 'Seagull', kind: 'bird', habitat: 'beach', time: 'any', price: 0, rarity: 1, color: '#e9eef2', glyph: 'bird', description: 'Will absolutely steal your lunch.'},
  {id: 'heron', name: 'Grey Heron', kind: 'bird', habitat: 'water', time: 'any', price: 0, rarity: 2, color: '#a4b0b8', glyph: 'bird', description: 'Stands perfectly still. Patient.'},
  {id: 'kingfisher', name: 'Kingfisher', kind: 'bird', habitat: 'water', time: 'day', price: 0, rarity: 4, color: '#2f9bc9', glyph: 'bird', description: 'A jewel-blue flash over the water.'},
  {id: 'swan', name: 'Mute Swan', kind: 'bird', habitat: 'water', time: 'any', price: 0, rarity: 3, color: '#fbfbf5', glyph: 'bird', description: 'Glides like a cloud on the pond.'},
];

export interface CropDef { id: string; seed: string; name: string; growMinutes: number; yield: [number, number]; model: string; color: string }
export const CROPS: CropDef[] = [
  {id: 'turnip', seed: 'turnip-seed', name: 'Turnip', growMinutes: 4, yield: [2, 3], model: 'crop_turnip', color: '#f1e9f2'},
  {id: 'carrot', seed: 'carrot-seed', name: 'Carrot', growMinutes: 6, yield: [2, 4], model: 'crop_carrot', color: '#f08a3c'},
  {id: 'potato', seed: 'potato-seed', name: 'Potato', growMinutes: 8, yield: [2, 4], model: 'crops_leafsStageB', color: '#c9a36b'},
  {id: 'wheat', seed: 'wheat-seed', name: 'Wheat', growMinutes: 10, yield: [3, 5], model: 'crops_wheatStageB', color: '#e8c867'},
  {id: 'tomato', seed: 'tomato-seed', name: 'Tomato', growMinutes: 12, yield: [3, 5], model: 'crops_leafsStageB', color: '#e8503f'},
  {id: 'strawberry', seed: 'strawberry-seed', name: 'Strawberry', growMinutes: 16, yield: [3, 6], model: 'crops_leafsStageA', color: '#ec4b6a'},
  {id: 'corn', seed: 'corn-seed', name: 'Corn', growMinutes: 20, yield: [2, 4], model: 'crops_cornStageD', color: '#f3d35b'},
  {id: 'pumpkin', seed: 'pumpkin-seed', name: 'Pumpkin', growMinutes: 30, yield: [1, 2], model: 'crop_pumpkin', color: '#f0913a'},
];

const crop = (id: string, name: string, price: number, rarity: ItemDef['rarity'], thumb: string, color: string): ItemDef => ({id, name, kind: 'crop', price, rarity, thumb, color, description: `Freshly harvested ${name.toLowerCase()}.`});
const seed = (id: string, name: string, color: string): ItemDef => ({id, name: `${name} Seeds`, kind: 'seed', price: 5, rarity: 1, glyph: 'seed', color, description: `Plant in a garden plot and keep it watered.`});

export const PRODUCE: ItemDef[] = [
  crop('turnip', 'Turnip', 28, 1, food('radish'), '#f1e9f2'),
  crop('carrot', 'Carrot', 36, 1, food('carrot'), '#f08a3c'),
  crop('potato', 'Potato', 42, 1, food('onion'), '#c9a36b'),
  crop('wheat', 'Wheat', 30, 1, food('loaf'), '#e8c867'),
  crop('tomato', 'Tomato', 55, 2, food('tomato'), '#e8503f'),
  crop('strawberry', 'Strawberry', 70, 2, food('strawberry'), '#ec4b6a'),
  crop('corn', 'Corn', 90, 2, food('corn'), '#f3d35b'),
  crop('pumpkin', 'Pumpkin', 240, 3, food('pumpkin'), '#f0913a'),
  ...CROPS.map(c => seed(c.seed, c.name, c.color)),
];

export const FORAGE: ItemDef[] = [
  {id: 'mushroom', name: 'Forest Mushroom', kind: 'forage', price: 22, rarity: 1, thumb: food('mushroom'), color: '#c98b5a', description: 'Pops up under old trees.'},
  {id: 'wild-berry', name: 'Wild Berry', kind: 'forage', price: 15, rarity: 1, thumb: food('cherries'), color: '#b03552', description: 'Tart and sweet.'},
  {id: 'apple', name: 'Apple', kind: 'forage', price: 25, rarity: 1, thumb: food('apple'), color: '#e04a3a', description: 'Shake a tree and catch one!'},
  {id: 'wildflower', name: 'Wildflower', kind: 'forage', price: 12, rarity: 1, thumb: nature('flower_purpleA'), color: '#b48be0', description: 'Pretty in a vase.'},
  {id: 'seashell', name: 'Seashell', kind: 'forage', price: 30, rarity: 1, glyph: 'shell', color: '#f3d6c4', description: 'Listen — the sea is inside.'},
  {id: 'pearl', name: 'Pearl', kind: 'forage', price: 600, rarity: 4, glyph: 'gem', color: '#f6f1ff', description: 'A rare treasure on the shore.'},
  {id: 'feather', name: 'Soft Feather', kind: 'forage', price: 40, rarity: 2, glyph: 'feather', color: '#e9e3d6', description: 'Left behind by a passing bird.'},
  {id: 'wood', name: 'Wood', kind: 'material', price: 8, rarity: 1, glyph: 'wood', color: '#a8774c', description: 'Fallen branches for crafting.'},
  {id: 'stone', name: 'Stone', kind: 'material', price: 6, rarity: 1, glyph: 'stone', color: '#a3a3a3', description: 'Smooth river stone for crafting.'},
  {id: 'flour', name: 'Flour', kind: 'ingredient', price: 18, rarity: 1, thumb: food('bag-flat'), color: '#efe7d5', description: 'For pies and cakes.'},
  {id: 'egg', name: 'Egg', kind: 'ingredient', price: 14, rarity: 1, thumb: food('egg'), color: '#f6ecd8', description: 'From the farm up the road.'},
  {id: 'milk', name: 'Milk', kind: 'ingredient', price: 16, rarity: 1, thumb: food('carton'), color: '#f4f6f8', description: 'Fresh and creamy.'},
  {id: 'honey', name: 'Honey', kind: 'ingredient', price: 45, rarity: 2, thumb: food('honey'), color: '#f2b538', description: 'Golden and sticky.'},
];

export interface RecipeIngredient { id?: string; tag?: 'fish' | 'fruit' | 'veg'; count: number }
export interface DishDef extends ItemDef { kind: 'dish'; ingredients: RecipeIngredient[]; energy: number; cookingLevel: number }
export const DISHES: DishDef[] = [
  {id: 'grilled-fish', name: 'Grilled Fish', kind: 'dish', ingredients: [{tag: 'fish', count: 1}], energy: 18, price: 120, rarity: 1, thumb: food('fish'), color: '#d79a5d', cookingLevel: 1, description: 'Simple, salty, perfect.'},
  {id: 'garden-salad', name: 'Garden Salad', kind: 'dish', ingredients: [{id: 'tomato', count: 1}, {id: 'carrot', count: 1}, {id: 'turnip', count: 1}], energy: 22, price: 210, rarity: 1, thumb: food('salad'), color: '#7fbf5a', cookingLevel: 1, description: 'Crunchy and bright.'},
  {id: 'mushroom-soup', name: 'Mushroom Soup', kind: 'dish', ingredients: [{id: 'mushroom', count: 2}, {id: 'potato', count: 1}, {id: 'milk', count: 1}], energy: 30, price: 230, rarity: 2, thumb: food('bowl-soup'), color: '#c7a27a', cookingLevel: 1, description: 'Warms you from the toes up.'},
  {id: 'berry-jam-toast', name: 'Berry Jam Toast', kind: 'dish', ingredients: [{id: 'wild-berry', count: 3}, {id: 'wheat', count: 1}], energy: 20, price: 150, rarity: 1, thumb: food('bread'), color: '#b03552', cookingLevel: 1, description: 'Breakfast of champions.'},
  {id: 'fish-and-chips', name: 'Fish & Chips', kind: 'dish', ingredients: [{tag: 'fish', count: 1}, {id: 'potato', count: 2}], energy: 34, price: 320, rarity: 2, thumb: food('fries'), color: '#e8c060', cookingLevel: 2, description: 'A seaside classic.'},
  {id: 'corn-chowder', name: 'Corn Chowder', kind: 'dish', ingredients: [{id: 'corn', count: 2}, {id: 'potato', count: 1}, {id: 'milk', count: 1}], energy: 40, price: 420, rarity: 2, thumb: food('bowl-broth'), color: '#f3d35b', cookingLevel: 2, description: 'Thick, sweet and golden.'},
  {id: 'apple-pie', name: 'Apple Pie', kind: 'dish', ingredients: [{id: 'apple', count: 3}, {id: 'flour', count: 1}, {id: 'egg', count: 1}], energy: 45, price: 480, rarity: 3, thumb: food('pie'), color: '#d4934f', cookingLevel: 3, description: 'Smells like a hug.'},
  {id: 'strawberry-cake', name: 'Strawberry Cake', kind: 'dish', ingredients: [{id: 'strawberry', count: 3}, {id: 'flour', count: 1}, {id: 'egg', count: 1}, {id: 'milk', count: 1}], energy: 55, price: 760, rarity: 3, thumb: food('cake'), color: '#f1a0b5', cookingLevel: 4, description: 'For birthdays, or Tuesdays.'},
  {id: 'pumpkin-stew', name: 'Pumpkin Stew', kind: 'dish', ingredients: [{id: 'pumpkin', count: 1}, {id: 'carrot', count: 1}, {id: 'potato', count: 1}], energy: 60, price: 820, rarity: 3, thumb: food('pot-stew'), color: '#f0913a', cookingLevel: 4, description: 'Hearty autumn comfort.'},
  {id: 'honey-pancakes', name: 'Honey Pancakes', kind: 'dish', ingredients: [{id: 'honey', count: 1}, {id: 'flour', count: 1}, {id: 'egg', count: 1}, {id: 'milk', count: 1}], energy: 50, price: 560, rarity: 3, thumb: food('pancakes'), color: '#e9b45a', cookingLevel: 3, description: 'Fluffy stacks, drizzled gold.'},
  {id: 'seafood-feast', name: 'Seafood Feast', kind: 'dish', ingredients: [{tag: 'fish', count: 3}, {id: 'tomato', count: 1}, {id: 'seashell', count: 1}], energy: 80, price: 1500, rarity: 4, thumb: food('sushi-salmon'), color: '#f09a80', cookingLevel: 5, description: 'A celebration on a platter.'},
];

export const FRUIT = new Set(['apple', 'wild-berry', 'strawberry']);
export const VEG = new Set(['turnip', 'carrot', 'potato', 'tomato', 'corn', 'pumpkin']);

export type FurnitureZone = 'room' | 'yard' | 'both';
export interface FurnitureDef extends ItemDef {
  kind: 'furniture';
  model: string;
  zone: FurnitureZone;
  footprint: [number, number];
  /** Coin price in the furniture catalog; null means craft-only. */
  buy: number | null;
  craft?: {id: string; count: number}[];
  seat?: boolean;
  light?: boolean;
  stove?: boolean;
  scale?: number;
}
const furn = (id: string, name: string, model: string, zone: FurnitureZone, footprint: [number, number], buy: number | null, extras: Partial<FurnitureDef> = {}): FurnitureDef => ({
  id, name, kind: 'furniture', model, zone, footprint, buy, price: Math.round((buy ?? 200) * 0.4), rarity: buy && buy > 1500 ? 3 : 2,
  thumb: model.startsWith('furniture-kit/') || model.startsWith('nature-kit/') || model.startsWith('food-kit/') ? `/kit/${model.replace('/', '/thumbs/')}.webp` : undefined,
  color: '#d7b98a', glyph: 'wood', description: `${name} for your home.`, ...extras,
});

export const FURNITURE: FurnitureDef[] = [
  furn('chair', 'Wooden Chair', 'furniture-kit/chair', 'room', [1, 1], 180, {seat: true, craft: [{id: 'wood', count: 4}]}),
  furn('chair-cushion', 'Cushion Chair', 'furniture-kit/chairCushion', 'room', [1, 1], 320, {seat: true}),
  furn('chair-rounded', 'Round Chair', 'furniture-kit/chairRounded', 'room', [1, 1], 360, {seat: true}),
  furn('table', 'Dining Table', 'furniture-kit/table', 'room', [2, 1], 420, {craft: [{id: 'wood', count: 8}]}),
  furn('table-round', 'Round Table', 'furniture-kit/tableRound', 'room', [1, 1], 380),
  furn('table-coffee', 'Coffee Table', 'furniture-kit/tableCoffee', 'room', [2, 1], 340),
  furn('side-table', 'Side Table', 'furniture-kit/sideTableDrawers', 'room', [1, 1], 260, {craft: [{id: 'wood', count: 5}, {id: 'stone', count: 1}]}),
  furn('bed-single', 'Cozy Bed', 'furniture-kit/bedSingle', 'room', [1, 2], 600, {seat: true}),
  furn('bed-double', 'Big Comfy Bed', 'furniture-kit/bedDouble', 'room', [2, 2], 1400, {seat: true}),
  furn('sofa', 'Lounge Sofa', 'furniture-kit/loungeSofa', 'room', [2, 1], 900, {seat: true}),
  furn('lounge-chair', 'Lounge Chair', 'furniture-kit/loungeChair', 'room', [1, 1], 520, {seat: true}),
  furn('bookcase', 'Bookcase', 'furniture-kit/bookcaseOpen', 'room', [1, 1], 480, {craft: [{id: 'wood', count: 10}]}),
  furn('bookcase-low', 'Low Bookshelf', 'furniture-kit/bookcaseOpenLow', 'room', [2, 1], 420),
  furn('lamp-floor', 'Floor Lamp', 'furniture-kit/lampRoundFloor', 'both', [1, 1], 300, {light: true}),
  furn('lamp-table', 'Table Lamp', 'furniture-kit/lampRoundTable', 'room', [1, 1], 220, {light: true}),
  furn('potted-plant', 'Potted Plant', 'furniture-kit/pottedPlant', 'both', [1, 1], 150, {craft: [{id: 'wildflower', count: 2}, {id: 'stone', count: 2}]}),
  furn('plant-small', 'Little Succulent', 'furniture-kit/plantSmall2', 'room', [1, 1], 90),
  furn('rug-round', 'Round Rug', 'furniture-kit/rugRound', 'room', [2, 2], 260),
  furn('rug-rect', 'Woven Rug', 'furniture-kit/rugRectangle', 'room', [3, 2], 340),
  furn('stove', 'Kitchen Stove', 'furniture-kit/kitchenStove', 'room', [1, 1], 800, {stove: true}),
  furn('fridge', 'Fridge', 'furniture-kit/kitchenFridgeSmall', 'room', [1, 1], 650),
  furn('kitchen-cabinet', 'Kitchen Counter', 'furniture-kit/kitchenCabinet', 'room', [1, 1], 380),
  furn('radio', 'Retro Radio', 'furniture-kit/radio', 'room', [1, 1], 280),
  furn('tv', 'Vintage TV', 'furniture-kit/televisionVintage', 'room', [1, 1], 700),
  furn('teddy', 'Teddy Bear', 'furniture-kit/bear', 'room', [1, 1], 240),
  furn('desk', 'Writing Desk', 'furniture-kit/desk', 'room', [2, 1], 460),
  furn('coat-rack', 'Coat Rack', 'furniture-kit/coatRackStanding', 'room', [1, 1], 160),
  furn('box', 'Storage Box', 'furniture-kit/cardboardBoxClosed', 'both', [1, 1], 40, {craft: [{id: 'wood', count: 2}]}),
  furn('fence', 'Garden Fence', 'nature-kit/fence_simple', 'yard', [1, 1], 60, {craft: [{id: 'wood', count: 2}]}),
  furn('fence-gate', 'Fence Gate', 'nature-kit/fence_gate', 'yard', [1, 1], 90),
  furn('flower-bush', 'Flower Bush', 'nature-kit/plant_bushDetailed', 'yard', [1, 1], 120, {craft: [{id: 'wildflower', count: 3}]}),
  furn('flowers-yellow', 'Yellow Flowers', 'nature-kit/flower_yellowA', 'yard', [1, 1], 40, {craft: [{id: 'wildflower', count: 1}]}),
  furn('flowers-red', 'Red Flowers', 'nature-kit/flower_redA', 'yard', [1, 1], 40, {craft: [{id: 'wildflower', count: 1}]}),
  furn('mushroom-decor', 'Giant Mushroom', 'nature-kit/mushroom_redTall', 'yard', [1, 1], 180, {craft: [{id: 'mushroom', count: 4}]}),
  furn('log-seat', 'Log Seat', 'nature-kit/log', 'yard', [2, 1], 80, {seat: true, craft: [{id: 'wood', count: 4}]}),
  furn('campfire', 'Campfire', 'nature-kit/campfire_stones', 'yard', [1, 1], 260, {light: true, craft: [{id: 'wood', count: 6}, {id: 'stone', count: 4}]}),
  furn('stone-path', 'Stone Path', 'nature-kit/path_stone', 'yard', [1, 1], 20, {craft: [{id: 'stone', count: 2}]}),
  furn('lantern', 'Garden Lantern', 'fantasy-town/lantern', 'yard', [1, 1], 340, {light: true, craft: [{id: 'stone', count: 3}, {id: 'wood', count: 2}]}),
  furn('market-stall', 'Market Stall', 'fantasy-town/stall-green', 'yard', [2, 2], 1800),
  furn('fountain', 'Garden Fountain', 'fantasy-town/fountain-round', 'yard', [2, 2], 4200),
  furn('tent', 'Camping Tent', 'nature-kit/tent_detailedOpen', 'yard', [2, 2], 1100),
  furn('big-pot', 'Clay Planter', 'nature-kit/pot_large', 'yard', [1, 1], 110, {craft: [{id: 'stone', count: 3}]}),
  furn('statue', 'Stone Statue', 'nature-kit/statue_head', 'yard', [1, 1], 2600),
];

export interface FashionDef extends ItemDef {kind: 'fashion'; buy: number; slot: 'top' | 'bottom' | 'hat' | 'accessory'; index: number}
export const FASHION: FashionDef[] = [
  ...OUTFITS.filter(o => !o.starter).map(o => ({o, list: OUTFITS.filter(x => x.part === o.part)})).map(({o, list}) => ({
    id: outfitItemId(o), name: o.name, kind: 'fashion' as const, slot: o.part, index: list.indexOf(o), buy: o.price, price: Math.round(o.price * 0.3), rarity: (o.price > 1100 ? 3 : 2) as ItemDef['rarity'],
    color: o.base || '#f3d9c4', description: `A ${o.part === 'top' ? 'top' : 'bottom'} to wear. Change outfits from your wardrobe.`,
  })),
  ...HATS.filter(h => !h.starter).map(h => ({id: hatItemId(h), name: h.name, kind: 'fashion' as const, slot: 'hat' as const, index: HATS.indexOf(h), buy: h.price, price: Math.round(h.price * 0.3), rarity: 2 as const, color: '#f6b3c5', description: 'Headwear for any occasion.'})),
  ...ACCESSORIES.filter(a => !a.starter).map(a => ({id: accessoryItemId(a), name: a.name, kind: 'fashion' as const, slot: 'accessory' as const, index: ACCESSORIES.indexOf(a), buy: a.price, price: Math.round(a.price * 0.3), rarity: (a.price > 1500 ? 4 : 2) as ItemDef['rarity'], color: '#b9a3e8', description: 'A finishing touch.'})),
];
export const FASHION_BY_ID: Record<string, FashionDef> = Object.fromEntries(FASHION.map(f => [f.id, f]));

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(
  ([...FISH, ...BUGS, ...BIRDS, ...PRODUCE, ...FORAGE, ...DISHES, ...FURNITURE, ...FASHION] as ItemDef[]).map(item => [item.id, item]),
);
export const FURNITURE_BY_ID: Record<string, FurnitureDef> = Object.fromEntries(FURNITURE.map(f => [f.id, f]));
export const DISH_BY_ID: Record<string, DishDef> = Object.fromEntries(DISHES.map(d => [d.id, d]));
export const CROP_BY_ID: Record<string, CropDef> = Object.fromEntries(CROPS.map(c => [c.id, c]));
export const CROP_BY_SEED: Record<string, CropDef> = Object.fromEntries(CROPS.map(c => [c.seed, c]));

export function isItem(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(ITEMS, id);
}

export function matchesIngredient(itemId: string, ingredient: RecipeIngredient) {
  if (ingredient.id) return itemId === ingredient.id;
  if (ingredient.tag === 'fish') return ITEMS[itemId]?.kind === 'fish';
  if (ingredient.tag === 'fruit') return FRUIT.has(itemId);
  if (ingredient.tag === 'veg') return VEG.has(itemId);
  return false;
}

/** General Store stock: seeds, cooking basics and the furniture catalog. */
export const SHOP_STOCK: {id: string; price: number; level: number}[] = [
  {id: 'turnip-seed', price: 10, level: 1}, {id: 'carrot-seed', price: 15, level: 1}, {id: 'potato-seed', price: 18, level: 1},
  {id: 'wheat-seed', price: 14, level: 2}, {id: 'tomato-seed', price: 24, level: 2}, {id: 'strawberry-seed', price: 32, level: 3},
  {id: 'corn-seed', price: 40, level: 3}, {id: 'pumpkin-seed', price: 90, level: 4},
  {id: 'flour', price: 35, level: 1}, {id: 'egg', price: 28, level: 1}, {id: 'milk', price: 30, level: 1}, {id: 'honey', price: 90, level: 3},
];
