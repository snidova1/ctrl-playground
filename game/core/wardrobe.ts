/**
 * Fashion catalog. Outfits are painted onto the VRM garment meshes as fabric
 * patterns; hats and accessories are small meshes attached to the head/body.
 * Each is a nonfinancial game item that can be bought, gifted and worn.
 */
export type Pattern = 'plain' | 'stripes' | 'wide-stripes' | 'polka' | 'plaid' | 'gingham' | 'floral' | 'stars' | 'hearts' | 'checker' | 'sailor' | 'denim' | 'knit' | 'camo' | 'rainbow' | 'cherry';
export interface OutfitDef {id: string; name: string; part: 'top' | 'bottom'; pattern: Pattern; base: string; accent: string; price: number; starter?: boolean}

const top = (id: string, name: string, pattern: Pattern, base: string, accent: string, price: number, starter = false): OutfitDef => ({id, name, part: 'top', pattern, base, accent, price, starter});
const bottom = (id: string, name: string, pattern: Pattern, base: string, accent: string, price: number, starter = false): OutfitDef => ({id, name, part: 'bottom', pattern, base, accent, price, starter});

export const OUTFITS: OutfitDef[] = [
  top('top-original', 'Everyday Top', 'plain', '', '', 0, true),
  top('top-cream', 'Cream Tee', 'plain', '#fff4e2', '#fff4e2', 0, true),
  top('top-sky', 'Sky Tee', 'plain', '#9cc8f2', '#9cc8f2', 0, true),
  top('top-peach', 'Peach Tee', 'plain', '#f8b9a4', '#f8b9a4', 0, true),
  top('top-sailor', 'Sailor Top', 'sailor', '#ffffff', '#3d5fa8', 900),
  top('top-breton', 'Breton Stripes', 'stripes', '#fdf8ef', '#2f4a7a', 650),
  top('top-candy', 'Candy Stripes', 'wide-stripes', '#ffd9e6', '#ff8fb1', 650),
  top('top-polka-red', 'Red Polka', 'polka', '#e8554e', '#fff4e8', 720),
  top('top-polka-mint', 'Mint Polka', 'polka', '#9fe0c8', '#ffffff', 720),
  top('top-plaid', 'Picnic Plaid', 'plaid', '#d8453e', '#2b2b38', 880),
  top('top-gingham', 'Gingham Blouse', 'gingham', '#ffffff', '#7fb0e8', 820),
  top('top-floral', 'Blossom Print', 'floral', '#fff1f4', '#f48fb1', 980),
  top('top-sunflower', 'Sunflower Print', 'floral', '#6f9fd8', '#ffd84a', 980),
  top('top-stars', 'Starry Night', 'stars', '#2d3366', '#ffe27a', 1200),
  top('top-hearts', 'Sweetheart', 'hearts', '#ffe0ea', '#ff5f8a', 1100),
  top('top-checker', 'Checkerboard', 'checker', '#ffffff', '#3a3a44', 760),
  top('top-knit-oat', 'Oat Knit', 'knit', '#e9d6b5', '#c8ad84', 1050),
  top('top-knit-berry', 'Berry Knit', 'knit', '#b24a6e', '#7c2d4b', 1050),
  top('top-camo', 'Forest Camo', 'camo', '#7d9a63', '#4e6440', 940),
  top('top-rainbow', 'Rainbow Pop', 'rainbow', '#ffffff', '#ffffff', 1600),
  top('top-cherry', 'Cherry Picnic', 'cherry', '#fff7ec', '#d6304a', 1150),
  top('top-denim', 'Denim Jacket', 'denim', '#5d82b8', '#3e5c8c', 1300),
  top('top-lavender', 'Lavender Tee', 'plain', '#c9b4ef', '#c9b4ef', 300),
  top('top-matcha', 'Matcha Tee', 'plain', '#b6d79a', '#b6d79a', 300),
  bottom('bottom-original', 'Everyday Bottoms', 'plain', '', '', 0, true),
  bottom('bottom-navy', 'Navy Bottoms', 'plain', '#3f4f7a', '#3f4f7a', 0, true),
  bottom('bottom-khaki', 'Khaki Bottoms', 'plain', '#cdb48a', '#cdb48a', 0, true),
  bottom('bottom-denim', 'Denim', 'denim', '#5d82b8', '#3e5c8c', 650),
  bottom('bottom-plaid', 'Plaid Bottoms', 'plaid', '#6c5aa8', '#f3d27a', 720),
  bottom('bottom-gingham', 'Gingham Bottoms', 'gingham', '#ffffff', '#f07a8a', 680),
  bottom('bottom-stripes', 'Stripe Bottoms', 'stripes', '#ffffff', '#4f9b74', 600),
  bottom('bottom-polka', 'Dotty Bottoms', 'polka', '#2f3550', '#ffffff', 640),
  bottom('bottom-checker', 'Checker Bottoms', 'checker', '#fff6e6', '#e08a3c', 660),
  bottom('bottom-floral', 'Meadow Print', 'floral', '#a7d68a', '#ffffff', 820),
  bottom('bottom-rose', 'Rose Bottoms', 'plain', '#f2a0b4', '#f2a0b4', 320),
  bottom('bottom-black', 'Black Bottoms', 'plain', '#34303a', '#34303a', 320),
  bottom('bottom-stars', 'Stardust', 'stars', '#3b3f78', '#ffffff', 900),
  bottom('bottom-camo', 'Camo Bottoms', 'camo', '#8a7a56', '#5c5038', 700),
];

export interface HatDef {id: string; name: string; price: number; starter?: boolean}
export const HATS: HatDef[] = [
  {id: 'none', name: 'No hat', price: 0, starter: true},
  {id: 'flower-crown', name: 'Flower Crown', price: 540},
  {id: 'beret', name: 'Beret', price: 420, starter: true},
  {id: 'bunny', name: 'Bunny Ears', price: 880},
  {id: 'straw', name: 'Straw Hat', price: 460},
  {id: 'bear', name: 'Bear Ears', price: 820},
  {id: 'ribbon', name: 'Big Ribbon', price: 380},
  {id: 'cat', name: 'Cat Ears', price: 820},
  {id: 'beanie', name: 'Pom Beanie', price: 500},
  {id: 'cap', name: 'Sporty Cap', price: 400},
  {id: 'chef', name: 'Chef Hat', price: 650},
  {id: 'frog', name: 'Froggy Hat', price: 1200},
];

export interface AccessoryDef {id: string; name: string; price: number; starter?: boolean}
export const ACCESSORIES: AccessoryDef[] = [
  {id: 'none', name: 'No accessory', price: 0, starter: true},
  {id: 'round-glasses', name: 'Round Glasses', price: 380},
  {id: 'sunglasses', name: 'Sunglasses', price: 520},
  {id: 'scarf', name: 'Cozy Scarf', price: 460},
  {id: 'backpack', name: 'Little Backpack', price: 760},
  {id: 'flower-clip', name: 'Flower Hair Clip', price: 240, starter: true},
  {id: 'star-clip', name: 'Star Hair Clip', price: 260},
  {id: 'headphones', name: 'Headphones', price: 900},
  {id: 'fairy-wings', name: 'Fairy Wings', price: 2400},
  {id: 'blush-stickers', name: 'Heart Cheek Stickers', price: 180},
];

export const outfitItemId = (o: {id: string}) => `fashion-${o.id}`;
export const hatItemId = (h: {id: string}) => `fashion-hat-${h.id}`;
export const accessoryItemId = (a: {id: string}) => `fashion-acc-${a.id}`;
export const TOPS = OUTFITS.filter(o => o.part === 'top');
export const BOTTOMS = OUTFITS.filter(o => o.part === 'bottom');

/** Every non-starter fashion piece the appearance uses, as bag item IDs. */
export function fashionNeeded(a: {top: number; bottom: number; hat: number; accessory: number}) {
  const needed: string[] = [];
  const t = TOPS[a.top], b = BOTTOMS[a.bottom], h = HATS[a.hat], x = ACCESSORIES[a.accessory];
  if (t && !t.starter) needed.push(outfitItemId(t));
  if (b && !b.starter) needed.push(outfitItemId(b));
  if (h && !h.starter) needed.push(hatItemId(h));
  if (x && !x.starter) needed.push(accessoryItemId(x));
  return needed;
}
