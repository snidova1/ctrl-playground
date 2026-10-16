import {describe,it,expect} from 'vitest';
import {ATMOSPHERE_LOOKS,ATMOSPHERE_PRESETS,nextAtmospherePreset,transitionWeight} from '../../features/habitat/atmosphere-presets';

describe('stylized atmosphere reference port',()=>{
  it('cycles all four usable looks and wraps without an unknown preset',()=>{
    let preset:(typeof ATMOSPHERE_PRESETS)[number]=ATMOSPHERE_PRESETS[0];
    for(const expected of ['golden','sunset','dusk','afternoon']){preset=nextAtmospherePreset(preset);expect(preset).toBe(expected);}
  });
  it('clamps and smoothly eases time transitions',()=>{
    expect(transitionWeight(-10)).toBe(0);expect(transitionWeight(10)).toBe(1);expect(transitionWeight(.5)).toBe(.5);
    let last=0;for(let i=0;i<=100;i++){const weight=transitionWeight(i/100);expect(weight).toBeGreaterThanOrEqual(last);last=weight;}
  });
  it('keeps dusk playable rather than turning off every light',()=>{
    expect(ATMOSPHERE_LOOKS.dusk.intensity).toBeGreaterThan(0);
    expect(ATMOSPHERE_LOOKS.dusk.hemisphere).toBeGreaterThan(.5);
    expect(ATMOSPHERE_LOOKS.dusk.intensity).toBeLessThan(ATMOSPHERE_LOOKS.afternoon.intensity);
  });
  it('uses valid sRGB authored colors and elevated shadow lights',()=>{
    for(const preset of ATMOSPHERE_PRESETS){
      const look=ATMOSPHERE_LOOKS[preset];
      for(const key of ['zenith','horizon','fog','sun','fill','ground','cloud','cloudShade'] as const)expect(look[key]).toMatch(/^#[0-9a-f]{6}$/i);
      expect(look.elevation).toBeGreaterThanOrEqual(15);expect(look.night).toBeGreaterThanOrEqual(0);expect(look.night).toBeLessThanOrEqual(1);
    }
  });
});
