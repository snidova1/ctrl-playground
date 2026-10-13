import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {TOWN_PALETTE} from '../../features/habitat/town-palette';

describe('Public World inherits the approved Common Ground palette',()=>{
 const commonGround=readFileSync(new URL('../../features/plaza/architecture.tsx',import.meta.url),'utf8');
 it('uses the actual terracotta floor tile colors, not a new cream floor',()=>{
  expect(TOWN_PALETTE.pavers).toEqual(['#b9846a','#c99175','#bb8364','#cb977c']);
  for(const color of TOWN_PALETTE.pavers)expect(commonGround).toContain(color);
 });
 it('takes its dominant architectural and foliage colors from Common Ground',()=>{
  for(const key of ['cream','wall','trim','pot','terracotta','forest','sage','shutter','wood'] as const){
   expect(commonGround,`${key} must remain an existing CTRL material`).toContain(TOWN_PALETTE[key]);
  }
  for(const color of TOWN_PALETTE.foliage)expect(commonGround).toContain(color);
 });
});
