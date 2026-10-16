import {describe,expect,it} from 'vitest';
import {REQUESTED_CHARACTER_SOURCES,READY_REQUESTED_CHARACTER_SOURCES,summarizeAvatarSourceReadiness} from '@/features/plaza/characters/requested-sources';

describe('mixed-style CTRL character source intake',()=>{
 it('preserves all sixteen user-requested characters without imposing an anime-only filter',()=>{
  expect(REQUESTED_CHARACTER_SOURCES).toHaveLength(16);
  expect(new Set(REQUESTED_CHARACTER_SOURCES.map(item=>item.id)).size).toBe(16);
  expect(REQUESTED_CHARACTER_SOURCES.map(item=>item.name)).toEqual([
   'Rain','Snow','Ellie','Jay','Victoria (Blender)','Rex','Haku','Shikk / Sick','Akane',
   'Satake Nagisa','Summer-Chan','Donut-Chan','Phil','Einar','Vincent','Lunte'
  ]);
  expect(REQUESTED_CHARACTER_SOURCES.filter(item=>item.format==='blender-rig')).toHaveLength(10);
  expect(REQUESTED_CHARACTER_SOURCES.filter(item=>item.format!=='blender-rig')).toHaveLength(6);
 });
 it('keeps all candidates free to CTRL players without inventing a token store',()=>{
  expect(REQUESTED_CHARACTER_SOURCES.every(item=>item.freeForAllPlayers)).toBe(true);
  expect(REQUESTED_CHARACTER_SOURCES.every(item=>item.sourceUrl.startsWith('https://'))).toBe(true);
  expect(REQUESTED_CHARACTER_SOURCES.some(item=>item.presentation==='male')).toBe(true);
  expect(REQUESTED_CHARACTER_SOURCES.some(item=>item.presentation==='female')).toBe(true);
 });
 it('never exposes missing avatar binaries as playable characters',()=>{
  expect(REQUESTED_CHARACTER_SOURCES.every(item=>item.assetPaths===null)).toBe(true);
  expect(READY_REQUESTED_CHARACTER_SOURCES).toHaveLength(0);
  expect(summarizeAvatarSourceReadiness()).toEqual({requested:16,imported:0,pending:16,freeForPlayers:true});
 });
 it('leaves rights-restricted source candidates gated',()=>{
  expect(REQUESTED_CHARACTER_SOURCES.find(item=>item.id==='booth-satake-nagisa')?.gameUseRightsConfirmed).toBe(false);
  expect(REQUESTED_CHARACTER_SOURCES.find(item=>item.id==='booth-summer-chan')?.gameUseRightsConfirmed).toBe(false);
  expect(REQUESTED_CHARACTER_SOURCES.find(item=>item.id==='booth-donut-chan')?.gameUseRightsConfirmed).toBe(false);
 });
});
