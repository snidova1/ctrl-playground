import type {Vec2} from './map';
import {GAME_DAY_MS} from './clock';
import type {Appearance} from './appearance';

export type Hobby = 'fishing' | 'gardening' | 'cooking' | 'bugs' | 'birds' | 'foraging';
export const HOBBIES: {id: Hobby; name: string; tool: string; level: number; color: string; blurb: string}[] = [
  {id: 'foraging', name: 'Foraging', tool: 'hands', level: 1, color: '#9bc46b', blurb: 'Pick mushrooms, berries, shells, wood and stone around town.'},
  {id: 'fishing', name: 'Fishing', tool: 'rod', level: 1, color: '#5aa9d6', blurb: 'Cast into the pond, river or sea and reel in with steady timing.'},
  {id: 'gardening', name: 'Gardening', tool: 'can', level: 1, color: '#7cbf5a', blurb: 'Plant seeds at home, water them twice and harvest fresh crops.'},
  {id: 'cooking', name: 'Cooking', tool: 'pan', level: 2, color: '#f0a35a', blurb: 'Turn ingredients into dishes that restore energy and sell well.'},
  {id: 'bugs', name: 'Bug Catching', tool: 'net', level: 3, color: '#e4c046', blurb: 'Sneak up slowly and swing your net before they flutter off.'},
  {id: 'birds', name: 'Birdwatching', tool: 'camera', level: 4, color: '#c58fd8', blurb: 'Frame birds in your camera and snap a portrait for your album.'},
];

export interface NpcDef {
  id: string; name: string; title: string; hobby?: Hobby; color: string;
  look: Appearance;
  route: Vec2[];
  likes: string[];
  lines: string[];
}

export const NPCS: NpcDef[] = [
  {id: 'odette', name: 'Mayor Odette', title: 'Mayor', color: '#8e7cc3', look: {version: 3, body: 1, skin: 1, hairColor: 5, eyeColor: 5, top: 17, bottom: 11, shoes: 11, hat: 2, hatColor: 9, accessory: 1},
    route: [{x: 0, z: -18}, {x: 3, z: -9}, {x: -4, z: -8}], likes: ['strawberry-cake', 'wildflower', 'koi'],
    lines: ['Welcome to Willow Common! Every day brings a little something new.', 'Check the notice board for today\'s requests. The town thanks you!', 'Have you visited the pond at sunset? Simply lovely.']},
  {id: 'juno', name: 'Juno', title: 'Shopkeeper', color: '#e8735f', look: {version: 3, body: 0, skin: 2, hairColor: 2, eyeColor: 4, top: 9, bottom: 3, shoes: 12, hat: 6, hatColor: 4, accessory: 0},
    route: [{x: -12, z: -9.6}, {x: -9, z: -9}], likes: ['honey', 'pearl', 'apple-pie'],
    lines: ['Seeds, flour, furniture, fashion — and I\'ll buy anything you bring back!', 'Fresh fish sell for more when they\'re big. Just saying.', 'Stock refreshes every morning.']},
  {id: 'tomo', name: 'Chef Tomo', title: 'Café owner', hobby: 'cooking', color: '#6fb7c9', look: {version: 3, body: 3, skin: 3, hairColor: 1, eyeColor: 1, top: 1, bottom: 1, shoes: 11, hat: 10, hatColor: 1, accessory: 0},
    route: [{x: 12.5, z: -9.6}, {x: 15, z: -8.5}], likes: ['tomato', 'sea-bream', 'mushroom'],
    lines: ['A good dish starts with good ingredients — and a happy cook!', 'Watch the pan closely and tap when it sizzles.', 'Try my Seafood Feast someday. It takes practice!']},
  {id: 'bea', name: 'Bea', title: 'Florist', hobby: 'gardening', color: '#a4cf7a', look: {version: 3, body: 0, skin: 1, hairColor: 6, eyeColor: 3, top: 11, bottom: 9, shoes: 3, hat: 1, hatColor: 3, accessory: 5},
    route: [{x: -12, z: 9}, {x: -9.5, z: 13}, {x: -12.5, z: 5.5}], likes: ['wildflower', 'strawberry', 'honeybee'],
    lines: ['Plants love two things: water and patience.', 'Water once to sprout, water again to bloom!', 'Your garden at home has room to grow as you do.']},
  {id: 'marlo', name: 'Marlo', title: 'Old angler', hobby: 'fishing', color: '#4f86b5', look: {version: 3, body: 2, skin: 4, hairColor: 5, eyeColor: 2, top: 5, bottom: 2, shoes: 11, hat: 4, hatColor: 8, accessory: 3},
    route: [{x: 12, z: 37}, {x: 12, z: 42}, {x: 16, z: 30}], likes: ['bluefin-tuna', 'grilled-fish', 'seashell'],
    lines: ['Patience, kid. The big ones bite when you least expect it.', 'Keep the line in the green and don\'t yank too hard.', 'Rain brings out river treasures, they say.']},
  {id: 'pip', name: 'Pip', title: 'Bug enthusiast', hobby: 'bugs', color: '#e4c046', look: {version: 3, body: 2, skin: 2, hairColor: 3, eyeColor: 3, top: 18, bottom: 13, shoes: 4, hat: 9, hatColor: 6, accessory: 4},
    route: [{x: -36, z: -6}, {x: -40, z: 6}, {x: -24, z: -4}], likes: ['stag-beetle', 'honey', 'berry-jam-toast'],
    lines: ['Shhh! Walk slowly or they\'ll fly away!', 'Fireflies only come out at night near the water.', 'Beetles love tree bark after dark.']},
  {id: 'wren', name: 'Wren', title: 'Birdwatcher', hobby: 'birds', color: '#c58fd8', look: {version: 3, body: 1, skin: 2, hairColor: 11, eyeColor: 5, top: 16, bottom: 6, shoes: 10, hat: 8, hatColor: 9, accessory: 1},
    route: [{x: 14, z: -29}, {x: 4, z: -34}, {x: 22, z: -36}], likes: ['feather', 'wild-berry', 'corn-chowder'],
    lines: ['Hold the camera steady and keep the bird in the frame.', 'Owls only show themselves at night in the woods.', 'The kingfisher is my favourite. Such a blue!']},
];
export const NPC_BY_ID = Object.fromEntries(NPCS.map(n => [n.id, n]));

/** NPCs drift slowly between their waypoints over the in-game day. */
export function npcPosition(npc: NpcDef, now: number): Vec2 & {moving: boolean; angle: number} {
  const cycle = GAME_DAY_MS / 6;
  const segments = npc.route.length;
  const t = ((now % cycle) / cycle) * segments;
  const index = Math.floor(t);
  const local = t - index;
  const from = npc.route[index % segments], to = npc.route[(index + 1) % segments];
  // Walk for the first 30% of each segment, then idle at the waypoint.
  const walk = Math.min(1, local / 0.3);
  const eased = walk * walk * (3 - 2 * walk);
  const x = from.x + (to.x - from.x) * eased, z = from.z + (to.z - from.z) * eased;
  const angle = Math.atan2(to.x - from.x, to.z - from.z);
  return {x, z, moving: walk < 1 && Math.hypot(to.x - from.x, to.z - from.z) > 0.2, angle};
}
