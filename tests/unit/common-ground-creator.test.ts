import {describe,expect,it} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
const source=(path:string)=>{const url=new URL('../../'+path,import.meta.url);return existsSync(url)?readFileSync(url,'utf8'):'';};

describe('Common Ground visible avatar creator contract',()=>{
 it('uses the proven Habitat renderer rather than another avatar engine',()=>{
  const preview=source('features/common-ground/creator-preview.tsx');
  expect(preview).toContain("import('@/features/habitat/character-creator-preview')");
  expect(preview).toContain('appearance={appearance}');
  expect(preview).toContain('framing={framing}');
  expect(preview).not.toMatch(/<Canvas|<VrmAvatar|<mesh/);
 });
 it('keeps a large preview beside independently scrolling controls, above them on mobile',()=>{
  const css=source('features/common-ground/lobby.css'),room=source('features/common-ground/creator-dressing-room.css');
  expect(css).toContain('.cg-dialog.cg-avatar-dialog');
  expect(room).toMatch(/\.cg-creator-workspace\s*\{[^}]*grid-template-columns:\s*minmax\([^;]+\)\s+minmax\([^;]+\)/);
  expect(room).toMatch(/\.cg-creator-fields\s*\{[^}]*overflow-y:\s*auto/);
  expect(room).toMatch(/\.cg-creator-preview \.hb-avatar-preview\s*\{[^}]*height:\s*100%/);
  expect(room).toMatch(/@media\s*\(max-width:\s*700px\)[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  expect(room).toMatch(/grid-template-rows:\s*clamp\([^;]+\) minmax\(0,1fr\) auto/);
 });
 it('pauses the mounted lobby with never (not demand), without throwing away guest pose or identity',()=>{
  const lobby=source('features/common-ground/lobby.tsx'),scene=source('features/common-ground/lobby-scene.tsx');
  expect(lobby).toContain("paused={modal==='avatar'}");
  expect(scene).toContain("frameloop={paused?'never':'always'}");
  expect(scene).toContain("data-render-paused={String(paused)}");
  expect(lobby).toContain('loadGuestIdentity(sessionStorage');
  expect(lobby).not.toMatch(/!modal&&<LobbyScene|key=\{modal/);
  expect(lobby).not.toContain("modal==='avatar'?draft");
 });
 it('preserves signed profile saving, guest entry, Reown Escape protection and touch modal guards',()=>{
  const lobby=source('features/common-ground/lobby.tsx'),form=source('features/common-ground/creator-form.tsx');
  expect(lobby).toContain("if(next==='avatar'&&!verified)");
  expect(lobby).toContain("document.querySelector('w3m-modal.open')");
  expect(lobby).toContain("fetch('/api/habitat/public-profile'");
  expect(lobby).toContain('appearance:draft');
  expect(lobby).toContain('!modal&&!!guest&&<nav');
  expect(form).toContain("aria-label='Public World avatar'");
  expect(form).toContain("aria-label='Avatar name'");
  expect(form).toContain("aria-label='Avatar character'");
  expect(form).toContain('Save avatar & enter Public World');
 });
});
