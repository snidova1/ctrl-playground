import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const read=(p:string)=>readFileSync(resolve(process.cwd(),p),'utf8');
describe('Approved VRoid-only active avatar deployment',()=>{
 const scene=read('features/plaza/scene.tsx'),vrm=read('features/plaza/characters/vrm-avatar.tsx'),catalog=read('features/plaza/characters/catalog.ts');
 it('renders VRoid in the default and multiplayer plaza, not just optional preview',()=>{
  expect(scene).not.toContain("import {Avatar} from './avatar'");
  expect(scene).not.toContain('<Avatar ');
  expect(scene).toContain('function RemoteVrmVisitor');
  expect(scene).toContain('<RemoteVrmVisitor');
  expect(scene).toContain('motion={props.characterMotion}');
  expect(scene).toContain('createCharacterMotion()');
  expect(scene).toContain('<VrmAvatar key={quality}');
 });
 it('never silently replaces a failed VRoid load with legacy Mio',()=>{
  expect(vrm).not.toContain("import {Avatar} from '../avatar'");
  expect(vrm).not.toContain('<Avatar ');
  expect(vrm).toContain('VRoid character unavailable');
  expect(vrm).toContain('Retry VRoid character');
 });
 it('continues shipping the approved original VRM binaries on desktop and mobile',()=>{
  for(const asset of ['victoria-desktop.vrm','victoria-mobile.vrm','fumiriya-desktop.vrm','fumiriya-mobile.vrm'])expect(catalog).toContain(asset);
 });
 it('does not ship retired non-VRoid player assets or renderers',()=>{
  for(const asset of ['features/plaza/avatar.tsx','public/plaza/models/mio.glb','public/plaza/models/maker.glb','public/plaza/models/worker.glb'])expect(existsSync(resolve(process.cwd(),asset)),asset).toBe(false);
 });
});
