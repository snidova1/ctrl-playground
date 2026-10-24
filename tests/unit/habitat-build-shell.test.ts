import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
describe('Habitat workshop entry integration',()=>{
 it('shares the visual catalog across classic and enabled gizmo modes instead of routing the live flag to the old admin editor',()=>{
  const app=readFileSync(new URL('../../features/habitat/app.tsx',import.meta.url),'utf8');
  expect(app).toMatch(/<BuildCatalog\b[^>]*\bobjects=\{draft\}/);
  expect(app).not.toMatch(/advancedBuilder\s*\?\s*<HabitatBuilderTools/);
  expect(app).toContain("aria-label='Transform tools'");
  expect(app).toContain('onClick={()=>setAdvancedTool(tool)}');
  expect(app).toContain('onChange={e=>setAdvancedSnap(e.target.checked)}');
  expect(app).toContain('onUndo={undo} onRedo={redo}');
  expect(app).toContain('onSave={()=>void save()}');
  const css=readFileSync(new URL('../../features/habitat/build-catalog.css',import.meta.url),'utf8');
  expect(css).toContain('.hb-app:has(.hb-build-dock) .hb-music-player');
  expect(css).toContain('.hb-app:has(.hd-room) .hb-music-player');
 });
});
