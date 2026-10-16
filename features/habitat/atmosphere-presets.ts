// Palette/transition design adapted from StarKnightt/summer-cycle
// src/world/timeofday.ts (MIT, Prasenjit). See docs/visual-reference-licenses.md.
export const ATMOSPHERE_PRESETS = ['afternoon', 'golden', 'sunset', 'dusk'] as const;
export type AtmospherePreset = typeof ATMOSPHERE_PRESETS[number];
export const ATMOSPHERE_LABELS: Record<AtmospherePreset, string> = {
  afternoon: 'Daylight', golden: 'Golden hour', sunset: 'Sunset', dusk: 'Nightfall',
};
export const ATMOSPHERE_LOOKS = {
  afternoon: {zenith:'#76b8d2', horizon:'#e9e6c7', fog:'#c6d8bb', sun:'#fff2d5', fill:'#d3e9f2', ground:'#758b65', cloud:'#fff8e7', cloudShade:'#b6ccd6', intensity:2.3, ambient:.32, hemisphere:1.05, elevation:48, azimuth:-52, night:0},
  golden: {zenith:'#4d9cbc', horizon:'#f4d6a8', fog:'#e4d3b2', sun:'#ffc98a', fill:'#c8c8e5', ground:'#8e8c76', cloud:'#fff0d1', cloudShade:'#aaa0ba', intensity:1.9, ambient:.3, hemisphere:1, elevation:25, azimuth:-72, night:0},
  sunset: {zenith:'#6c7fa6', horizon:'#ffb070', fog:'#bca6bd', sun:'#f7ae82', fill:'#b5b9df', ground:'#75738a', cloud:'#ffd1b6', cloudShade:'#9a839f', intensity:1.45, ambient:.28, hemisphere:.85, elevation:18, azimuth:-100, night:.3},
  dusk: {zenith:'#141a46', horizon:'#796f91', fog:'#657492', sun:'#a9b9e6', fill:'#829bd0', ground:'#53697a', cloud:'#b9c4df', cloudShade:'#535f86', intensity:.65, ambient:.24, hemisphere:.72, elevation:32, azimuth:130, night:1},
} as const;
export function nextAtmospherePreset(current: AtmospherePreset): AtmospherePreset {
  return ATMOSPHERE_PRESETS[(ATMOSPHERE_PRESETS.indexOf(current) + 1) % ATMOSPHERE_PRESETS.length];
}
export function transitionWeight(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}
