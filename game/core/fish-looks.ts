/** Per-species fish styling shared by the 3D model and the 2D album icons. */
export type FishPattern = 'plain' | 'stripes' | 'spots' | 'koi' | 'speckle' | 'bands' | 'gold';
export type FishShape = 'carp' | 'slim' | 'round' | 'flat' | 'whisker' | 'tuna' | 'fancy';
export interface FishLook {body: string; belly: string; fin: string; accent: string; pattern: FishPattern; shape: FishShape}

export const FISH_LOOKS: Record<string, FishLook> = {
  'crucian-carp': {body: '#c9a25b', belly: '#f1e3b8', fin: '#b0803f', accent: '#8a6a32', pattern: 'plain', shape: 'carp'},
  'pond-loach': {body: '#9b8d6c', belly: '#e2d7b8', fin: '#7d6f52', accent: '#5f523b', pattern: 'speckle', shape: 'slim'},
  goldfish: {body: '#f39a3d', belly: '#ffd8a0', fin: '#ffb562', accent: '#e06a24', pattern: 'plain', shape: 'fancy'},
  koi: {body: '#fbf6ee', belly: '#ffffff', fin: '#ffe6dc', accent: '#ef5a3a', pattern: 'koi', shape: 'carp'},
  'river-trout': {body: '#86a6a0', belly: '#e9e2d0', fin: '#6f8f88', accent: '#3f5752', pattern: 'speckle', shape: 'slim'},
  sweetfish: {body: '#b8d1bf', belly: '#f3f2e6', fin: '#9fc0a8', accent: '#e2c24a', pattern: 'plain', shape: 'slim'},
  catfish: {body: '#6f6a5c', belly: '#c9c1a8', fin: '#5a5548', accent: '#45413a', pattern: 'speckle', shape: 'whisker'},
  'golden-trout': {body: '#f5c542', belly: '#fff0b8', fin: '#ffd76a', accent: '#e8493a', pattern: 'gold', shape: 'slim'},
  sardine: {body: '#9fb6c9', belly: '#f2f5f8', fin: '#86a0b5', accent: '#3d5770', pattern: 'spots', shape: 'slim'},
  mackerel: {body: '#5f8fa8', belly: '#eef2f2', fin: '#4f7a90', accent: '#1f3a4a', pattern: 'stripes', shape: 'slim'},
  'sea-bream': {body: '#f09aa0', belly: '#fde4e2', fin: '#e57f88', accent: '#7fc0e0', pattern: 'speckle', shape: 'carp'},
  flounder: {body: '#b5a07a', belly: '#f5efe2', fin: '#9d8964', accent: '#7a6648', pattern: 'spots', shape: 'flat'},
  pufferfish: {body: '#e7d58a', belly: '#fbf6df', fin: '#d8c06a', accent: '#5a4a2a', pattern: 'spots', shape: 'round'},
  'bluefin-tuna': {body: '#3c5d86', belly: '#e6ecf2', fin: '#f2c84a', accent: '#24395a', pattern: 'bands', shape: 'tuna'},
};
export const DEFAULT_FISH_LOOK: FishLook = {body: '#9fb6c9', belly: '#f2f5f8', fin: '#86a0b5', accent: '#3d5770', pattern: 'plain', shape: 'carp'};
export const fishLook = (id: string) => FISH_LOOKS[id] ?? DEFAULT_FISH_LOOK;
