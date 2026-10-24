import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {isHabitatTestHost} from '@/features/habitat/test-access';
import {HABITAT_TEST_STORAGE,createHabitatTestSnapshot,decodeHabitatTestSnapshot,encodeHabitatTestSnapshot} from '@/features/habitat/test-snapshot';
import {getHouseConfig,getHouseOpenings} from '@/features/habitat/modular-house';
describe('no-Key staging Habitat sandbox',()=>{
 it('allows only exact staging and local hosts, including development ports',()=>{
  for(const host of ['ctrl-staging.suhiro211.workers.dev','localhost:3199','127.0.0.1:3234','[::1]:3199'])expect(isHabitatTestHost(host)).toBe(true);
  for(const host of ['ctrl.app','ctrl-staging.suhiro211.workers.dev.evil.test','evil-ctrl-staging.suhiro211.workers.dev','', 'example.com:3000'])expect(isHabitatTestHost(host)).toBe(false);
 });
 it('creates a spacious, interactive local house without a wallet or Key record',()=>{
  const snapshot=createHabitatTestSnapshot();expect(getHouseConfig(snapshot.objects).cells).toHaveLength(6);expect(getHouseOpenings(snapshot.objects).some(o=>o.kind==='door')).toBe(true);
  expect(snapshot.objects.some(o=>o.behavior==='seat')).toBe(true);expect(snapshot.objects.some(o=>o.behavior==='light')).toBe(true);
  expect('wallet' in snapshot).toBe(false);expect('ownerId' in snapshot).toBe(false);expect('key' in snapshot).toBe(false);
 });
 it('round-trips actual layout IDs, customization and interactions in a dedicated browser-storage namespace',()=>{
  const snapshot=createHabitatTestSnapshot(),door=getHouseOpenings(snapshot.objects).find(o=>o.kind==='door')!.object!;snapshot.states[door.id]={active:true,usedAt:123};
  const saved=encodeHabitatTestSnapshot(snapshot.objects,snapshot.states);expect(decodeHabitatTestSnapshot(saved)).toEqual(snapshot);expect(HABITAT_TEST_STORAGE).toBe('ctrl-habitat-test-v1');
 });
 it('rejects malformed or forged storage instead of loading invalid structural data',()=>{
  for(const raw of [null,'{','{}','[]',JSON.stringify({version:2,objects:[],states:{}}),JSON.stringify({version:1,objects:[],states:{},wallet:'pretend-owner'})])expect(decodeHabitatTestSnapshot(raw)).toBeNull();
 });
 it('does not wire the playground to signing, wallet ownership or backend mutation APIs',()=>{
  const source=readFileSync(new URL('../../features/habitat/habitat-test.tsx',import.meta.url),'utf8');
  expect(source).not.toMatch(/habitatApi|WalletConnection|fetch\(|signMessage|sendTransaction|useWorldPresence/);
  expect(source).toContain('localStorage.setItem(HABITAT_TEST_STORAGE');expect(source).toContain('<AnalogStick');expect(source).toContain('<TouchRunButton');expect(source).toContain('<HouseWorkshop');expect(source).toContain('<BuildCatalog');
 });
 it('keeps staging-host restriction server-side on the dedicated route',()=>{
  const source=readFileSync(new URL('../../app/habitat-test/page.tsx',import.meta.url),'utf8');expect(source).toContain('headers()');expect(source).toContain('if(!isHabitatTestHost(host))notFound()');
 });
});
