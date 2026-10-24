import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createGuestIdentity,loadGuestIdentity,GUEST_STORAGE_KEY} from '../../features/common-ground/guest';
const source=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
describe('playable Common Ground product boundary',()=>{
 it('routes landing and courtyard to Common Ground, not a private Habitat or old workshop',()=>{
  for(const p of ['app/page.tsx','app/courtyard/page.tsx'])expect(source(p)).toContain('CommonGroundLobby');
  expect(source('app/courtyard/page.tsx')).not.toContain('PlazaApp');
  expect(source('features/habitat/app.tsx')).toContain('<LobbyScene');
 });
 it('assigns anonymous appearance once and restores it without exposing auth authority',()=>{
  const values=new Map<string,string>();let randoms=0;
  const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);}};
  const first=loadGuestIdentity(storage,()=>{randoms++;return 'anonymous-a';});
  expect(loadGuestIdentity(storage,()=>{randoms++;return 'anonymous-b';})).toEqual(first);
  expect(randoms).toBe(1);expect(Object.keys(first).sort()).toEqual(['appearance','id','version']);
 });
 it('replaces invalid stored input and tolerates unavailable browser storage',()=>{
  const storage={getItem:()=>'{broken',setItem:()=>{throw new Error('denied');}};
  expect(loadGuestIdentity(storage,()=> 'anonymous-b')).toEqual(createGuestIdentity('anonymous-b'));
  expect(GUEST_STORAGE_KEY).toContain('guest');
 });
 it('does not render the old closed room and provides playable movement',()=>{
  const scene=source('features/common-ground/lobby-scene.tsx');
  expect(scene).not.toContain('common-ground-small-waiting-room');
  expect(scene).toContain('KeyW');expect(scene).toContain('playable');
 });
});
