import {Color} from 'three';
import type {CharacterAppearance} from './catalog';

/** Authored colors, not multiplicative VRM tints: `source` must never be white. */
export function storybookPalette(appearance: CharacterAppearance) {
  const hair = {source: '#704735', espresso: '#432d29', ink: '#303644', auburn: '#96523b', silver: '#b8bac8'}[appearance.hairId];
  const skin = {source: '#f1c9ad', warm: '#e6b08d', rose: '#efbfba', deep: '#a87259'}[appearance.skinId];
  const iris = {source: '#80613e', hazel: '#9a7448', ocean: '#5f8fbd', jade: '#63a07e', violet: '#8c76b8'}[appearance.eyeId];
  const cloth = {original: '#879c77', sage: '#799c88', clay: '#b97e70', slate: '#7e90ac'}[appearance.variantId];
  const mix = (a: string, b: string, amount: number) => `#${new Color(a).lerp(new Color(b), amount).getHexString()}`;
  return {
    skin, hair, iris, cloth,
    hairLight: mix(hair, '#e3b880', .19),
    hairDark: mix(hair, '#251e25', .2),
    blush: mix(skin, '#cf7772', .44),
    ear: mix(skin, '#bc7367', .28),
    eyeRim: mix(hair, '#33252a', .6),
    irisDark: mix(iris, '#221c29', .62),
    irisLight: mix(iris, '#e5cf89', .34),
    cream: '#f1e6cf',
    knit: '#ddcfb3',
    seam: mix(cloth, '#3d5141', .24),
    trousers: appearance.variantId === 'slate' ? '#51576a' : '#665e50',
    boot: '#795243',
    sole: '#493b34',
    button: '#cfaf75',
    white: '#fff9ed',
    pupil: '#28232b',
    mouth: mix(skin, '#8d4546', .74),
  };
}

export type StorybookPalette = ReturnType<typeof storybookPalette>;
