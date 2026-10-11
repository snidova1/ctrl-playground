import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {HABITAT_BGM} from '@/features/habitat/music-player';
describe('Habitat self-hosted original music',()=>{
 it('does not depend on an external streaming provider',()=>{
  expect(HABITAT_BGM.url).toBe('/audio/ctrl-garden-afternoon.wav');
  expect(HABITAT_BGM.attribution).toContain('Original');
 });
 it('contains an actual non-silent 40s playable WAV asset',()=>{
  const b=readFileSync('public/audio/ctrl-garden-afternoon.wav');
  expect(b.subarray(0,4).toString('ascii')).toBe('RIFF');
  expect(b.subarray(8,12).toString('ascii')).toBe('WAVE');
  expect(b.readUInt16LE(20)).toBe(1);
  expect(b.readUInt16LE(22)).toBe(1);
  expect(b.readUInt32LE(24)).toBe(16000);
  expect(b.readUInt16LE(34)).toBe(16);
  expect(b.subarray(36,40).toString('ascii')).toBe('data');
  expect(b.length).toBe(44+40*16000*2);
  let peak=0,active=0;
  for(let i=44;i<b.length;i+=2){
   const amplitude=Math.abs(b.readInt16LE(i));
   if(amplitude>peak)peak=amplitude;
   if(amplitude>80)active++;
  }
  expect(peak).toBeGreaterThan(2000);
  expect(peak).toBeLessThan(32000);
  expect(active).toBeGreaterThan(100000);
 });
});
