import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=(file:string)=>readFileSync(new URL('../../features/habitat/'+file,import.meta.url),'utf8');
describe('camera aimed furniture workflow wiring',()=>{
 it('sandbox queues a ghost instead of immediately mutating layout when choosing furniture',()=>{const s=source('habitat-test.tsx');const add=s.slice(s.indexOf('function add('),s.indexOf('function patchObject'));expect(add).toContain('setPlacement(');expect(add).not.toContain('change([...objects,object])');expect(s).toContain('FurniturePlacementControls');expect(s).toContain('onPlacementPreview=');});
 it('normal Habitat shares the same explicit placement workflow without bypassing save permissions',()=>{const s=source('app.tsx');expect(s).toContain('FurniturePlacementControls');expect(s).toContain('onPlacementPreview=');expect(s).toContain("api<WorldState>('save'");expect(s).toContain('state.canEdit');});
 it('stage uses a controllable walking camera while aiming, and hides the original moving object',()=>{const s=source('stage.tsx');expect(s).toContain('FurniturePlacementScene');expect(s).toContain('!props.placement');expect(s).toContain("editing&&!props.placement?'place':'explore'");expect(s).toContain('camera={STAGE_CAMERA}');});
 it('existing furniture has a camera relocation action, not just XYZ sliders',()=>{expect(source('build-inspector.tsx')).toContain('onMove');expect(source('build-inspector.tsx')).toContain('Posisikan lewat kamera');expect(source('build-catalog.tsx')).toContain('onMove={onMove}');});
});
